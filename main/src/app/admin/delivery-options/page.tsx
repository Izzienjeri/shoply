'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

import { DeliveryOption as DeliveryOptionType, ApiErrorResponse } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit3, Trash2, Search, ArrowUpDown, Loader2 } from 'lucide-react';

const deliveryOptionFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  description: z.string().optional().nullable(),
  is_pickup: z.boolean().default(false),
  active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

type DeliveryOptionFormValues = z.infer<typeof deliveryOptionFormSchema>;
type DeliveryOptionFormInput = z.input<typeof deliveryOptionFormSchema>;


interface DeliveryOptionApiPayload {
    name: string;
    price: string;
    description?: string | null;
    is_pickup: boolean;
    active: boolean;
    sort_order: number;
}


export default function AdminDeliveryOptionsPage() {
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOptionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOption, setEditingOption] = useState<DeliveryOptionType | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState<DeliveryOptionType | null>(null);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'sort_order', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const form = useForm<DeliveryOptionFormInput, any, DeliveryOptionFormValues>({
    resolver: zodResolver(deliveryOptionFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      description: null,
      is_pickup: false,
      active: true,
      sort_order: 0,
    },
  });

  const fetchDeliveryOptions = async () => {
    setIsLoading(true);
    try {
      const fetchedOptions = await apiClient.get<DeliveryOptionType[]>('/delivery/options', { needsAuth: true });
      setDeliveryOptions(fetchedOptions || []);
    } catch (error) {
      console.error("Failed to fetch delivery options:", error);
      toast.error("Could not load delivery options.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryOptions();
  }, []);

  const handleFormSubmit: SubmitHandler<DeliveryOptionFormValues> = async (values) => {
    setIsSubmitting(true);
    const payload: DeliveryOptionApiPayload = {
        ...values,
        price: values.price.toString(),
        description: values.description || null,
    };

    try {
      if (editingOption) {
        await apiClient.patch<DeliveryOptionType>(`/delivery/options/${editingOption.id}`, payload, { needsAuth: true });
        toast.success("Delivery option updated successfully!");
      } else {
        await apiClient.post<DeliveryOptionType>('/delivery/options', payload, { needsAuth: true });
        toast.success("Delivery option created successfully!");
      }
      setShowFormDialog(false);
      setEditingOption(null);
      form.reset({ name: "", price: 0, description: null, is_pickup: false, active: true, sort_order: 0 });
      fetchDeliveryOptions();
    } catch (error: any) {
      const apiError = error as ApiErrorResponse;
      toast.error(apiError.message || "An error occurred.");
      if (apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          form.setError(field as keyof DeliveryOptionFormInput, { type: "server", message: messages.join(", ") });
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (option: DeliveryOptionType) => {
    setEditingOption(option);
    form.reset({
      name: option.name,
      price: parseFloat(option.price),
      description: option.description || null,
      is_pickup: option.is_pickup,
      active: option.active,
      sort_order: option.sort_order,
    });
    setShowFormDialog(true);
  };

  const openNewDialog = () => {
    setEditingOption(null);
    form.reset({
        name: "",
        price: 0,
        description: null,
        is_pickup: false,
        active: true,
        sort_order: 0,
    });
    setShowFormDialog(true);
  };

  const handleDeleteOption = async () => {
    if (!optionToDelete) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/delivery/options/${optionToDelete.id}`, { needsAuth: true });
      toast.success("Delivery option deleted successfully!");
      fetchDeliveryOptions();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete delivery option.");
    } finally {
      setIsSubmitting(false);
      setOptionToDelete(null);
    }
  };

  const columns: ColumnDef<DeliveryOptionType>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }: { column: Column<DeliveryOptionType, unknown> }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }: { row: Row<DeliveryOptionType> }) => formatPrice(row.original.price),
    },
    {
      accessorKey: "is_pickup",
      header: "Type",
      cell: ({ row }: { row: Row<DeliveryOptionType> }) => (
        <Badge variant={row.original.is_pickup ? "outline" : "default"}>
          {row.original.is_pickup ? "Pickup" : "Delivery"}
        </Badge>
      ),
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }: { row: Row<DeliveryOptionType> }) => (
        <Badge variant={row.original.active ? "default" : "secondary"}>
          {row.original.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "sort_order",
      header: "Sort Order",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: Row<DeliveryOptionType> }) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={() => openEditDialog(row.original)} title="Edit">
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setOptionToDelete(row.original)} title="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: deliveryOptions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

   if (isLoading && deliveryOptions.length === 0) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-semibold">Manage Delivery Options</h1>
                <Skeleton className="h-10 w-36" />
            </div>
            <Skeleton className="h-10 w-full" />
            {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Manage Delivery Options</h1>
        <Button onClick={openNewDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Option
        </Button>
      </div>

      <div className="flex items-center py-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by name..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<DeliveryOptionType>) => (
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
              table.getRowModel().rows.map((row: Row<DeliveryOptionType>) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell: Cell<DeliveryOptionType, unknown>) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No delivery options found.
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

      <Dialog open={showFormDialog} onOpenChange={(isOpen) => {
          setShowFormDialog(isOpen);
          if (!isOpen) { form.reset({ name: "", price: 0, description: null, is_pickup: false, active: true, sort_order: 0 }); setEditingOption(null); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOption ? 'Edit Delivery Option' : 'Add New Delivery Option'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Nairobi CBD Delivery" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (Ksh)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 200.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Details about this option..." {...field} value={field.value || ""} className="min-h-[80px]" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                    <FormDescription>Lower numbers appear first.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4 pt-2">
                 <FormField
                    control={form.control}
                    name="is_pickup"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                        <FormLabel className="font-normal">Is Pickup Location?</FormLabel>
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                        <FormLabel className="font-normal">Active</FormLabel>
                    </FormItem>
                    )}
                />
              </div>
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingOption ? 'Save Changes' : 'Create Option'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!optionToDelete} onOpenChange={(isOpen) => !isOpen && setOptionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the delivery option "{optionToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOptionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOption}
              disabled={isSubmitting}
              className={cn(isSubmitting && "opacity-50 cursor-not-allowed", "bg-destructive hover:bg-destructive/90")}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}