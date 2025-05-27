'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  Row,
} from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Order as OrderType, OrderItem as OrderItemType, ApiErrorResponse, AdminOrderUpdatePayload, OrderStatus } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Edit3, Eye, Search, ArrowUpDown, Loader2, ShoppingBag, ImageOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const orderUpdateFormSchema = z.object({
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'picked_up']),
  picked_up_by_name: z.string().optional().nullable(),
  picked_up_by_id_no: z.string().optional().nullable(),
});
type OrderUpdateFormValues = z.infer<typeof orderUpdateFormSchema>;

const placeholderImage = "/images/placeholder-artwork.png";

function OrderItemDetailsCard({ item }: { item: OrderItemType }) {
  return (
    <div className="flex items-center space-x-3 py-2 border-b last:border-b-0 border-border/70 dark:border-border/50">
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
        <Image
          src={item.artwork.image_url || placeholderImage}
          alt={item.artwork.name}
          fill
          sizes="48px"
          className="object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
        />
         {!item.artwork.image_url && <ImageOff className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{item.artwork.name}</p>
        <p className="text-xs text-muted-foreground">Qty: {item.quantity} @ {formatPrice(item.price_at_purchase)}</p>
      </div>
      <div className="text-sm font-medium text-foreground">{formatPrice(parseFloat(item.price_at_purchase) * item.quantity)}</div>
    </div>
  );
}

function OrderTableSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold tracking-tight font-serif text-purple-600 dark:text-purple-400 flex items-center"><ShoppingBag className="mr-3 h-7 w-7"/>Manage Orders</h1>
            </div>
            <Skeleton className="h-10 w-full max-w-sm rounded-md bg-muted" />
            <div className="rounded-lg border bg-card shadow-md">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            {Array.from({length: 7}).map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-20 bg-muted" /></TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}>
                                {Array.from({length: 7}).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full bg-muted" /></TableCell>)}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}


const fetchAdminOrders = async (): Promise<OrderType[]> => {
  const data = await apiClient.get<OrderType[]>('/api/admin/dashboard/orders', { needsAuth: true });
  return data || [];
};

const deliveryStatuses: OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
const pickupStatuses: OrderStatus[] = ['pending', 'paid', 'picked_up', 'cancelled'];

const getAvailableStatuses = (orderIsPickup?: boolean): OrderStatus[] => {
    return orderIsPickup ? pickupStatuses : deliveryStatuses;
};


export default function AdminOrdersPage() {
  const [editingOrder, setEditingOrder] = useState<OrderType | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewingOrderDetails, setViewingOrderDetails] = useState<OrderType | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, error, refetch } = useQuery<OrderType[], Error>({
    queryKey: ['adminOrders'],
    queryFn: fetchAdminOrders,
  });

  const form = useForm<OrderUpdateFormValues>({
    resolver: zodResolver(orderUpdateFormSchema),
  });

  const updateOrderMutation = useMutation<
    OrderType, 
    Error, 
    { orderId: string; payload: AdminOrderUpdatePayload }
  >({
    mutationFn: async ({ orderId, payload }) => {
        const updatedOrder = await apiClient.patch<OrderType>(
            `/api/admin/dashboard/orders/${orderId}`, 
            payload, 
            { needsAuth: true }
        );
        if (updatedOrder === null) { 
            throw new Error("Order update returned no data, but an Order object was expected.");
        }
        return updatedOrder;
    },
    onSuccess: (updatedOrder) => {
        toast.success("Order status updated successfully!");
        setShowEditDialog(false);
        setEditingOrder(null);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
        queryClient.invalidateQueries({ queryKey: ['adminOrderDetails', updatedOrder.id] });
        queryClient.invalidateQueries({ queryKey: ['adminDashboardStats']});
    },
    onError: (error: any) => {
        const apiError = error as ApiErrorResponse;
        toast.error(apiError.message || "An error occurred while updating the order.");
    }
  });

  const handleUpdateSubmit: SubmitHandler<OrderUpdateFormValues> = async (values) => {
    if (!editingOrder) return;

    const payload: AdminOrderUpdatePayload = { status: values.status };
    if (values.status === 'picked_up') {
      if (!values.picked_up_by_name || !values.picked_up_by_id_no) {
        toast.error("Picker name and ID number are required for 'Picked Up' status.");
        form.setError("picked_up_by_name", { type: "manual", message: "Name is required for picked up status."});
        form.setError("picked_up_by_id_no", { type: "manual", message: "ID is required for picked up status."});
        return;
      }
      payload.picked_up_by_name = values.picked_up_by_name;
      payload.picked_up_by_id_no = values.picked_up_by_id_no;
    } else {
        payload.picked_up_by_name = null; 
        payload.picked_up_by_id_no = null;
    }
    updateOrderMutation.mutate({ orderId: editingOrder.id, payload });
  };

  const openEditDialog = useCallback((order: OrderType) => {
    setEditingOrder(order);
    form.reset({
      status: order.status,
      picked_up_by_name: order.picked_up_by_name || "",
      picked_up_by_id_no: order.picked_up_by_id_no || "",
    });
    setShowEditDialog(true);
  }, [form]);

  const openDetailsDialog = useCallback((order: OrderType) => {
    setViewingOrderDetails(order);
    setShowDetailsDialog(true);
  }, []);

  const currentStatusInForm = form.watch('status');
  const availableStatusesForEdit = useMemo(() => {
    if (!editingOrder) return [];
    return getAvailableStatuses(editingOrder.is_pickup_order ?? editingOrder.delivery_option_details?.is_pickup);
  }, [editingOrder]);


  const columns: ColumnDef<OrderType>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-2 text-xs sm:text-sm">
          Order ID <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.id.substring(0,8)}...</span>,
    },
    {
      id: 'customerInfo',
      header: "Customer",
      accessorFn: (row) => row.user?.name || row.user?.email || row.user_id.substring(0,8)+'...',
      cell: ({ getValue }) => <span className="text-xs text-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-2 text-xs sm:text-sm">
            Date <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="text-xs">{new Date(row.original.created_at).toLocaleDateString()}</span>,
    },
    {
      accessorKey: "total_price",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-2 text-xs sm:text-sm">
            Total <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="text-xs font-medium">{formatPrice(row.original.total_price)}</span>,
    },
    {
        id: 'deliveryMethod',
        header: "Delivery",
        accessorFn: (row) => row.delivery_option_details?.name || 'N/A',
        cell: ({ row }) => (
            <div className="text-xs">
                <p className="text-foreground">{row.original.delivery_option_details?.name || 'N/A'}</p>
                { (row.original.is_pickup_order ?? row.original.delivery_option_details?.is_pickup) && 
                  <Badge variant="outline" className="mt-1 text-xs border-purple-500 text-purple-600 dark:border-purple-400 dark:text-purple-400">Pickup</Badge>
                }
            </div>
        ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-2 text-xs sm:text-sm">
            Status <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge
          className={cn("capitalize text-xs px-2 py-0.5 shadow-sm",
            (row.original.status === 'paid' || row.original.status === 'delivered' || row.original.status === 'picked_up') && "bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700",
            row.original.status === 'shipped' && "border-blue-500/80 text-blue-600 dark:text-blue-400 dark:border-blue-400/80 bg-blue-500/10",
            row.original.status === 'pending' && "bg-yellow-500/80 hover:bg-yellow-600 text-yellow-900 dark:text-yellow-100 dark:bg-yellow-600 dark:hover:bg-yellow-700",
            row.original.status === 'cancelled' && "bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700"
          )}
        >
          {row.original.status.replace('_', ' ')}
        </Badge>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      id: "actions",
      header: () => <div className="text-right text-xs sm:text-sm">Actions</div>,
      cell: ({ row }) => (
        <div className="flex space-x-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => openDetailsDialog(row.original)} title="View Details" className="h-8 w-8 hover:bg-accent group">
            <Eye className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEditDialog(row.original)} title="Edit Status" className="h-8 w-8 hover:bg-accent group">
            <Edit3 className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400" />
          </Button>
        </div>
      ),
    },
  ], [openDetailsDialog, openEditDialog]);

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
        const orderId = row.original.id.toLowerCase();
        const customerName = row.original.user?.name?.toLowerCase() || '';
        const customerEmail = row.original.user?.email?.toLowerCase() || '';
        const searchTerm = filterValue.toLowerCase();

        return orderId.includes(searchTerm) ||
               customerName.includes(searchTerm) ||
               customerEmail.includes(searchTerm);
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  if (isLoading) {
    return <OrderTableSkeleton />;
  }
  
  if (error) {
    return <div className="text-red-500 p-4">Error loading orders: {error.message} <Button onClick={() => refetch()} className="ml-2 rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground">Retry</Button></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-serif text-purple-600 dark:text-purple-400 flex items-center"><ShoppingBag className="mr-3 h-7 w-7"/>Manage Orders</h1>

      <div className="flex items-center py-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by Order ID or Customer..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10 rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-md">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="px-3 py-3 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2.5 align-middle text-xs">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded-md">Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded-md">Next</Button>
      </div>

      <Dialog open={showEditDialog} onOpenChange={(isOpen) => {
          setShowEditDialog(isOpen);
          if (!isOpen) { form.reset(); setEditingOrder(null); }
      }}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-purple-600 dark:text-purple-400">Update Order Status</DialogTitle>
            <DialogDescription>Order ID: <span className="font-mono">{editingOrder?.id.substring(0,8)}...</span> ({ (editingOrder?.is_pickup_order ?? editingOrder?.delivery_option_details?.is_pickup) ? "Pickup Order" : "Delivery Order"})</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600"><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-md">
                        {availableStatusesForEdit.map(s => (
                          <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {currentStatusInForm === 'picked_up' && (
                <>
                  <FormField
                    control={form.control}
                    name="picked_up_by_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Picked Up By (Name)</FormLabel>
                        <FormControl><Input placeholder="Full name of collector" {...field} value={field.value || ''} className="rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="picked_up_by_id_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Picker's ID Number</FormLabel>
                        <FormControl><Input placeholder="ID or Passport No." {...field} value={field.value || ''} className="rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline" className="rounded-md border-purple-500/70 text-purple-600 hover:bg-purple-500/10 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-400/10">Cancel</Button></DialogClose>
                <Button 
                    type="submit" 
                    disabled={updateOrderMutation.isPending} 
                    className="rounded-md bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-700 hover:via-fuchsia-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-95"
                >
                  {updateOrderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg p-0">
            <DialogHeader className="p-6 pb-4 border-b border-border/70 dark:border-border/50">
                <DialogTitle className="font-serif text-purple-600 dark:text-purple-400 text-xl">Order Details: <span className="font-mono text-muted-foreground">{viewingOrderDetails?.id.substring(0,8)}...</span></DialogTitle>
            </DialogHeader>
            {viewingOrderDetails && (
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div className="space-y-0.5"><strong className="text-muted-foreground">Order ID:</strong> <span className="font-mono text-foreground">{viewingOrderDetails.id}</span></div>
                        <div className="space-y-0.5"><strong className="text-muted-foreground">Date:</strong> <span className="text-foreground">{new Date(viewingOrderDetails.created_at).toLocaleString()}</span></div>
                        <div className="space-y-0.5"><strong className="text-muted-foreground">Customer:</strong> <span className="text-foreground">{viewingOrderDetails.user?.name || viewingOrderDetails.user?.email || 'N/A'}</span></div>
                        <div className="space-y-0.5"><strong className="text-muted-foreground">Status:</strong> <Badge className={cn("capitalize text-xs px-2 py-0.5 shadow-sm", (viewingOrderDetails.status === 'paid' || viewingOrderDetails.status === 'delivered' || viewingOrderDetails.status === 'picked_up') && "bg-green-500 text-white", viewingOrderDetails.status === 'shipped' && "border-blue-500/80 text-blue-600 bg-blue-500/10", viewingOrderDetails.status === 'pending' && "bg-yellow-500/80 text-yellow-900", viewingOrderDetails.status === 'cancelled' && "bg-red-500 text-white" )}>{viewingOrderDetails.status.replace('_',' ')}</Badge></div>
                        <div className="space-y-0.5"><strong className="text-muted-foreground">Total Amount:</strong> <span className="font-semibold text-foreground">{formatPrice(viewingOrderDetails.total_price)}</span></div>
                        <div className="space-y-0.5"><strong className="text-muted-foreground">M-Pesa Ref:</strong> <span className="text-foreground">{viewingOrderDetails.payment_gateway_ref || 'N/A'}</span></div>
                    </div>
                    <Separator className="my-3 dark:bg-border/40" />
                    <div>
                        <h4 className="font-semibold mb-1.5 text-foreground">Delivery Details:</h4>
                        <p className="text-sm text-muted-foreground"><strong>Method:</strong> {viewingOrderDetails.delivery_option_details?.name || 'N/A'} {(viewingOrderDetails.is_pickup_order || viewingOrderDetails.delivery_option_details?.is_pickup) && <Badge variant="outline" className="ml-1 text-xs border-purple-500 text-purple-600 dark:border-purple-400 dark:text-purple-400">Pickup</Badge>}</p>
                        <p className="text-sm text-muted-foreground"><strong>Fee:</strong> {formatPrice(viewingOrderDetails.delivery_fee || '0')}</p>
                        <p className="text-sm text-muted-foreground"><strong>Address:</strong> {viewingOrderDetails.shipping_address || 'N/A'}</p>
                         { (viewingOrderDetails.is_pickup_order ?? viewingOrderDetails.delivery_option_details?.is_pickup) && viewingOrderDetails.status === 'picked_up' && (
                            <>
                                <p className="text-sm mt-1 text-muted-foreground"><strong>Picked Up By:</strong> {viewingOrderDetails.picked_up_by_name || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground"><strong>Picker's ID:</strong> {viewingOrderDetails.picked_up_by_id_no || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground"><strong>Picked Up At:</strong> {viewingOrderDetails.picked_up_at ? new Date(viewingOrderDetails.picked_up_at).toLocaleString() : 'N/A'}</p>
                            </>
                         )}
                    </div>
                     <Separator className="my-3 dark:bg-border/40" />
                    <div>
                        <h4 className="font-semibold mb-2 text-foreground">Items:</h4>
                        <div className="space-y-1">
                            {viewingOrderDetails.items.map(item => <OrderItemDetailsCard key={item.id} item={item} />)}
                        </div>
                    </div>
                </div>
            )}
            <DialogFooter className="p-4 border-t border-border/70 dark:border-border/50 bg-muted/30 dark:bg-muted/20">
                <DialogClose asChild><Button type="button" variant="outline" className="rounded-md border-purple-500/70 text-purple-600 hover:bg-purple-500/10 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-400/10">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}