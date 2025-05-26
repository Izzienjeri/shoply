'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Column,
  HeaderGroup,
  Cell,
} from '@tanstack/react-table';

import { Order as OrderType, OrderItem as OrderItemType, ApiErrorResponse, AdminOrderUpdatePayload, User as UserType, DeliveryOption as DeliveryOptionType } from '@/lib/types';
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
import { Edit3, Eye, Search, ArrowUpDown, Loader2, Truck, PackageCheck, XOctagon, History, ShieldCheck, Info } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';


const orderUpdateFormSchema = z.object({
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'picked_up']),
  picked_up_by_name: z.string().optional().nullable(),
  picked_up_by_id_no: z.string().optional().nullable(),
});
type OrderUpdateFormValues = z.infer<typeof orderUpdateFormSchema>;

const placeholderImage = "/placeholder-image.svg";

function OrderItemDetailsCard({ item }: { item: OrderItemType }) {
  return (
    <div className="flex items-center space-x-3 py-2 border-b last:border-b-0">
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
        <Image
          src={item.artwork.image_url || placeholderImage}
          alt={item.artwork.name}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium">{item.artwork.name}</p>
        <p className="text-xs text-muted-foreground">Qty: {item.quantity} @ {formatPrice(item.price_at_purchase)}</p>
      </div>
      <div className="text-sm font-medium">{formatPrice(parseFloat(item.price_at_purchase) * item.quantity)}</div>
    </div>
  );
}


export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderType | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewingOrderDetails, setViewingOrderDetails] = useState<OrderType | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);


  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const form = useForm<OrderUpdateFormValues>({
    resolver: zodResolver(orderUpdateFormSchema),
  });

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const fetchedOrders = await apiClient.get<OrderType[]>('/admin/dashboard/orders', { needsAuth: true });
      setOrders(fetchedOrders || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Could not load orders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateSubmit: SubmitHandler<OrderUpdateFormValues> = async (values) => {
    if (!editingOrder) return;
    setIsSubmitting(true);

    const payload: AdminOrderUpdatePayload = { status: values.status };
    if (values.status === 'picked_up') {
      if (!values.picked_up_by_name || !values.picked_up_by_id_no) {
        toast.error("Picker name and ID number are required for 'Picked Up' status.");
        setIsSubmitting(false);
        return;
      }
      payload.picked_up_by_name = values.picked_up_by_name;
      payload.picked_up_by_id_no = values.picked_up_by_id_no;
    } else {
        payload.picked_up_by_name = '';
        payload.picked_up_by_id_no = '';
    }


    try {
      await apiClient.patch<OrderType>(`/admin/dashboard/orders/${editingOrder.id}`, payload, { needsAuth: true });
      toast.success("Order status updated successfully!");
      setShowEditDialog(false);
      setEditingOrder(null);
      form.reset();
      fetchOrders();
    } catch (error: any) {
      const apiError = error as ApiErrorResponse;
      toast.error(apiError.message || "An error occurred while updating the order.");
    } finally {
      setIsSubmitting(false);
    }
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

  const currentStatus = form.watch('status');

  const columns: ColumnDef<OrderType>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: ({ column }: { column: Column<OrderType, unknown> }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Order ID <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: { row: Row<OrderType> }) => <span className="font-mono text-xs">{row.original.id.substring(0,8)}...</span>,
    },
    {
      id: 'customerInfo',
      header: "Customer",
      accessorFn: (row: OrderType) => row.user?.name || row.user?.email || row.user_id.substring(0,8)+'...',
      cell: ({ getValue }) => getValue() as string,
    },
    {
      accessorKey: "created_at",
      header: "Date Placed",
      cell: ({ row }: { row: Row<OrderType> }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      accessorKey: "total_price",
      header: "Total",
      cell: ({ row }: { row: Row<OrderType> }) => formatPrice(row.original.total_price),
    },
    {
        id: 'deliveryMethod',
        header: "Delivery",
        accessorFn: (row: OrderType) => row.delivery_option_details?.name || 'N/A',
        cell: ({ row }: { row: Row<OrderType> }) => (
            <div className="text-xs">
                <p>{row.original.delivery_option_details?.name || 'N/A'}</p>
                {row.original.delivery_option_details?.is_pickup && <Badge variant="outline" className="mt-1">Pickup</Badge>}
            </div>
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: Row<OrderType> }) => (
        <Badge
          variant={
            row.original.status === 'paid' || row.original.status === 'delivered' || row.original.status === 'picked_up' ? 'default' :
            row.original.status === 'pending' ? 'secondary' :
            row.original.status === 'shipped' ? 'outline' :
            'destructive'
          }
          className="capitalize"
        >
          {row.original.status.replace('_', ' ')}
        </Badge>
      ),
      filterFn: (row: Row<OrderType>, id: string, value: any) => value.includes(row.getValue(id)),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: Row<OrderType> }) => (
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" onClick={() => openDetailsDialog(row.original)} title="View Details">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEditDialog(row.original)} title="Edit Status">
            <Edit3 className="h-4 w-4" />
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
    globalFilterFn: (row: Row<OrderType>, columnId: string, filterValue: string) => {
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

  if (isLoading && orders.length === 0) {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Manage Orders</h1>
            <Skeleton className="h-10 w-full" />
            {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Manage Orders</h1>

      <div className="flex items-center py-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by Order ID or Customer..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<OrderType>) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: Row<OrderType>) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell: Cell<OrderType, unknown>) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
      </div>

      <Dialog open={showEditDialog} onOpenChange={(isOpen) => {
          setShowEditDialog(isOpen);
          if (!isOpen) { form.reset(); setEditingOrder(null); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>Order ID: {editingOrder?.id.substring(0,8)}...</DialogDescription>
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
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'picked_up'] as const).map(s => (
                          <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {currentStatus === 'picked_up' && (
                <>
                  <FormField
                    control={form.control}
                    name="picked_up_by_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Picked Up By (Name)</FormLabel>
                        <FormControl><Input placeholder="Full name of collector" {...field} value={field.value || ''} /></FormControl>
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
                        <FormControl><Input placeholder="ID or Passport No." {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Order Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Order Details: {viewingOrderDetails?.id.substring(0,8)}...</DialogTitle>
            </DialogHeader>
            {viewingOrderDetails && (
                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><strong>Order ID:</strong> {viewingOrderDetails.id}</div>
                        <div><strong>Date:</strong> {new Date(viewingOrderDetails.created_at).toLocaleString()}</div>
                        <div><strong>Customer:</strong> {viewingOrderDetails.user?.name || viewingOrderDetails.user?.email || 'N/A'}</div>
                        <div><strong>Status:</strong> <Badge className="capitalize">{viewingOrderDetails.status.replace('_',' ')}</Badge></div>
                        <div><strong>Total Amount:</strong> {formatPrice(viewingOrderDetails.total_price)}</div>
                        <div><strong>M-Pesa Ref:</strong> {viewingOrderDetails.payment_gateway_ref || 'N/A'}</div>
                    </div>
                    <Separator />
                    <div>
                        <h4 className="font-semibold mb-1">Delivery Details:</h4>
                        <p className="text-sm"><strong>Method:</strong> {viewingOrderDetails.delivery_option_details?.name || 'N/A'}</p>
                        <p className="text-sm"><strong>Fee:</strong> {formatPrice(viewingOrderDetails.delivery_fee || '0')}</p>
                        <p className="text-sm"><strong>Address:</strong> {viewingOrderDetails.shipping_address || 'N/A'}</p>
                         {viewingOrderDetails.delivery_option_details?.is_pickup && viewingOrderDetails.status === 'picked_up' && (
                            <>
                                <p className="text-sm mt-1"><strong>Picked Up By:</strong> {viewingOrderDetails.picked_up_by_name || 'N/A'}</p>
                                <p className="text-sm"><strong>Picker's ID:</strong> {viewingOrderDetails.picked_up_by_id_no || 'N/A'}</p>
                                <p className="text-sm"><strong>Picked Up At:</strong> {viewingOrderDetails.picked_up_at ? new Date(viewingOrderDetails.picked_up_at).toLocaleString() : 'N/A'}</p>
                            </>
                         )}
                    </div>
                     <Separator />
                    <div>
                        <h4 className="font-semibold mb-2">Items:</h4>
                        <div className="space-y-2">
                            {viewingOrderDetails.items.map(item => <OrderItemDetailsCard key={item.id} item={item} />)}
                        </div>
                    </div>
                </div>
            )}
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}