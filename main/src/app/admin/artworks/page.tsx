// === app/admin/artworks/page.tsx ===
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm, SubmitHandler, FieldValues } from 'react-hook-form';
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

import { Artwork as ArtworkType, Artist as ArtistType, ApiErrorResponse } from '@/lib/types';
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
  DialogTrigger,
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
  AlertDialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit3, Trash2, ImageOff, Search, ArrowUpDown, Loader2, ExternalLink } from 'lucide-react';

const artworkFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    artist_id: z.string().min(1, "Artist is required"),
    price: z.coerce.number().min(0, "Price must be non-negative"),
    stock_quantity: z.coerce.number().int().min(0, "Stock must be a non-negative integer"),
    description: z.string().optional().nullable(), // Made explicit
    is_active: z.boolean().default(true),
    image_file: z.instanceof(File).optional().nullable(),
  });
  
  // This is the output type, typically used for validated data
  type ArtworkFormValues = z.infer<typeof artworkFormSchema>;
  
  // Add this line: This is the input type for the form, before Zod processing
  type ArtworkFormInput = z.input<typeof artworkFormSchema>;
  
  
  interface ArtworkApiPayload {
    name: string;
    artist_id: string;
    price: string;
    stock_quantity: number;
    description?: string | null; // Match schema for consistency
    is_active: boolean;
  }
  
  const placeholderImage = "/placeholder-image.svg";
  
  export default function AdminArtworksPage() {
    // ... rest of your component state
    const [artworks, setArtworks] = useState<ArtworkType[]>([]);
    const [artists, setArtists] = useState<ArtistType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingArtwork, setEditingArtwork] = useState<ArtworkType | null>(null);
    const [showFormDialog, setShowFormDialog] = useState(false);
    const [artworkToDelete, setArtworkToDelete] = useState<ArtworkType | null>(null);
  
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
    const form = useForm<ArtworkFormInput, any, ArtworkFormValues>({ // Now ArtworkFormInput is defined
      resolver: zodResolver(artworkFormSchema),
      defaultValues: {
        name: "",
        artist_id: "",
        price: 0,
        stock_quantity: 0,
        description: null,
        is_active: true,
        image_file: null,
      },
    });
  
    // ... rest of your component code
    // ... (fetchArtworksAndArtists, useEffect, handleFormSubmit, etc.) ...
    // ... (openEditDialog, openNewDialog, handleDeleteArtwork, columns, table definition) ...
    // ... (JSX for loading state, page layout, table, dialogs) ...
  // Ensure the rest of your file remains the same as you provided.
  // The key change is adding the `type ArtworkFormInput = z.input<typeof artworkFormSchema>;` line.
  
    const fetchArtworksAndArtists = async () => {
      setIsLoading(true);
      try {
        const [fetchedArtworks, fetchedArtists] = await Promise.all([
          apiClient.get<ArtworkType[]>('/artworks/', { needsAuth: true }),
          apiClient.get<ArtistType[]>('/artists/', { needsAuth: true }),
        ]);
        setArtworks(fetchedArtworks || []);
        setArtists(fetchedArtists || []);
      } catch (error) {
        console.error("Failed to fetch artworks or artists:", error);
        toast.error("Could not load data.");
      } finally {
        setIsLoading(false);
      }
    };
  
    useEffect(() => {
      fetchArtworksAndArtists();
    }, []);
  
    const handleFormSubmit: SubmitHandler<ArtworkFormValues> = async (values) => {
      setIsSubmitting(true);
  
      try {
        if (editingArtwork) { // --- EDITING ---
          if (values.image_file) {
              const formData = new FormData();
              (Object.keys(values) as Array<keyof ArtworkFormValues>).forEach(key => {
                  const value = values[key];
                  if (key === 'image_file' && value instanceof File) {
                      formData.append(key, value);
                  } else if (key === 'price' && typeof value === 'number') {
                      formData.append(key, value.toString());
                  } else if (value !== undefined && value !== null) { // Check for null explicitly for optional fields
                      formData.append(key, String(value));
                  }
              });
              await apiClient.patch<ArtworkType>(
                  `/artworks/${editingArtwork.id}`,
                  formData,
                  { needsAuth: true, isFormData: true }
              );
          } else { // No new image file, send JSON
              const { image_file, ...jsonPayloadData } = values;
              const apiPayload: ArtworkApiPayload = {
                  ...jsonPayloadData,
                  description: jsonPayloadData.description ?? undefined, // Ensure undefined if null for JSON
                  price: values.price.toString(),
              };
              await apiClient.patch<ArtworkType>(
                  `/artworks/${editingArtwork.id}`,
                  apiPayload,
                  { needsAuth: true, isFormData: false }
              );
          }
          toast.success("Artwork updated successfully!");
  
        } else { // --- CREATING NEW ---
          if (values.image_file) {
              const formData = new FormData();
              (Object.keys(values) as Array<keyof ArtworkFormValues>).forEach(key => {
                  const value = values[key];
                   if (key === 'image_file' && value instanceof File) {
                      formData.append(key, value);
                  } else if (key === 'price' && typeof value === 'number') {
                      formData.append(key, value.toString());
                  } else if (value !== undefined && value !== null) {
                      formData.append(key, String(value));
                  }
              });
              await apiClient.post<ArtworkType>(
                  '/artworks/',
                  formData,
                  { needsAuth: true, isFormData: true }
              );
          } else {
              const { image_file, ...jsonPayloadData } = values;
               const apiPayload: ArtworkApiPayload = {
                  ...jsonPayloadData,
                  description: jsonPayloadData.description ?? undefined,
                  price: values.price.toString(),
              };
              await apiClient.post<ArtworkType>(
                  '/artworks/',
                  apiPayload,
                  { needsAuth: true, isFormData: false }
              );
          }
          toast.success("Artwork created successfully!");
        }
  
        setShowFormDialog(false);
        setEditingArtwork(null);
        form.reset({ // form.reset takes ArtworkFormInput (or Partial<ArtworkFormInput>)
          name: "",
          artist_id: artists.length > 0 ? artists[0].id : "",
          price: 0,
          stock_quantity: 0,
          description: null,
          is_active: true,
          image_file: null,
        });
        fetchArtworksAndArtists();
      } catch (error: any) {
        const apiError = error as ApiErrorResponse;
        toast.error(apiError.message || "An error occurred.");
        if (apiError.errors) {
          Object.entries(apiError.errors).forEach(([field, messages]) => {
            form.setError(field as keyof ArtworkFormInput, { type: "server", message: messages.join(", ") });
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    };
  
    const openEditDialog = (artwork: ArtworkType) => {
      setEditingArtwork(artwork);
      form.reset({ // form.reset takes ArtworkFormInput (or Partial<ArtworkFormInput>)
        name: artwork.name,
        artist_id: artwork.artist_id,
        price: parseFloat(artwork.price),
        stock_quantity: artwork.stock_quantity,
        description: artwork.description || null,
        is_active: artwork.is_active === undefined ? true : artwork.is_active,
        image_file: null,
      });
      setShowFormDialog(true);
    };
  
    const openNewDialog = () => {
      setEditingArtwork(null);
      form.reset({ // form.reset takes ArtworkFormInput (or Partial<ArtworkFormInput>)
          name: "",
          artist_id: artists.length > 0 ? artists[0].id : "",
          price: 0,
          stock_quantity: 0,
          description: null,
          is_active: true,
          image_file: null,
      });
      setShowFormDialog(true);
    };
  
    const handleDeleteArtwork = async () => {
      if (!artworkToDelete) return;
      setIsSubmitting(true);
      try {
        await apiClient.delete(`/artworks/${artworkToDelete.id}`, { needsAuth: true });
        toast.success("Artwork deleted successfully!");
        setArtworkToDelete(null);
        fetchArtworksAndArtists();
      } catch (error: any) {
        toast.error(error.message || "Failed to delete artwork.");
      } finally {
        setIsSubmitting(false);
      }
    };
  
    const columns: ColumnDef<ArtworkType>[] = useMemo(() => [
      {
        accessorKey: "image_url",
        header: "Image",
        cell: ({ row }: { row: Row<ArtworkType> }) => {
          const artwork = row.original;
          return (
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
              <Image
                src={artwork.image_url || placeholderImage}
                alt={artwork.name}
                fill
                sizes="64px"
                className="object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
              />
              {!artwork.image_url && <ImageOff className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" />}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }: { column: Column<ArtworkType, unknown> }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Name <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }: { row: Row<ArtworkType> }) => <Link href={`/artworks/${row.original.id}`} target="_blank" className="hover:underline font-medium">{row.original.name} <ExternalLink className="inline h-3 w-3 ml-1" /></Link>,
      },
      {
        accessorKey: "artist.name",
        header: "Artist",
        cell: ({ row }: { row: Row<ArtworkType> }) => row.original.artist?.name || 'N/A',
      },
      {
        accessorKey: "price",
        header: ({ column }: { column: Column<ArtworkType, unknown> }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Price <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }: { row: Row<ArtworkType> }) => formatPrice(row.original.price),
      },
      {
        accessorKey: "stock_quantity",
        header: "Stock",
        cell: ({ row }: { row: Row<ArtworkType> }) => row.original.stock_quantity,
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }: { row: Row<ArtworkType> }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"}>
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
        filterFn: (row: Row<ArtworkType>, id: string, value: any) => value.includes(row.getValue(id))
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: { row: Row<ArtworkType> }) => {
          const artwork = row.original;
          return (
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon" onClick={() => openEditDialog(artwork)} title="Edit">
                <Edit3 className="h-4 w-4" />
              </Button>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setArtworkToDelete(artwork)} title="Delete">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
            </div>
          );
        },
      },
    ], [artists, form]); // form is a dependency because openEditDialog and openNewDialog use form.reset
  
    const table = useReactTable({
      data: artworks,
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
  
  
    if (isLoading && artworks.length === 0) {
      return (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-semibold">Manage Artworks</h1>
                  <Skeleton className="h-10 w-32" />
              </div>
              <Skeleton className="h-10 w-full" />
              {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
      );
    }
  
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Manage Artworks</h1>
          <Button onClick={openNewDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Artwork
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
              {table.getHeaderGroups().map((headerGroup: HeaderGroup<ArtworkType>) => (
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
                table.getRowModel().rows.map((row: Row<ArtworkType>) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell: Cell<ArtworkType, unknown>) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No artworks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
  
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
  
        <Dialog open={showFormDialog} onOpenChange={(isOpen) => {
            setShowFormDialog(isOpen);
            if (!isOpen) {
                form.reset(); // Default reset uses defaultValues from useForm
                setEditingArtwork(null);
            }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingArtwork ? 'Edit Artwork' : 'Add New Artwork'}</DialogTitle>
              <DialogDescription>
                {editingArtwork ? 'Update the details of the artwork.' : 'Fill in the details for the new artwork.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="Artwork Title" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="artist_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artist</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an artist" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {artists.map((artist) => (
                            <SelectItem key={artist.id} value={artist.id} disabled={!artist.is_active && artist.id !== editingArtwork?.artist_id}>
                              {artist.name} {!artist.is_active && "(Inactive)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Price (Ksh)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 1500.00" {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="stock_quantity"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Stock Quantity</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Describe the artwork..." {...field} value={field.value || ""} className="min-h-[100px]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image_file"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                      <FormLabel>Artwork Image</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                          {...rest}
                        />
                      </FormControl>
                      <FormDescription>
                          {editingArtwork && editingArtwork.image_url && !value && (
                              <span>Current image: <a href={editingArtwork.image_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">View</a>. Upload a new file to replace it.</span>
                          )}
                           {!editingArtwork?.image_url && !value && "No image uploaded."}
                           {value && value instanceof File && `New image selected: ${value.name}`}
                           {value && typeof value === 'string' && `Image: ${value}`}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Uncheck to hide this artwork from the public store.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="outline" onClick={() => {
                          form.reset(); // Resets to defaultValues
                          setEditingArtwork(null);
                      }}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingArtwork ? 'Save Changes' : 'Create Artwork'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
  
        <AlertDialog open={!!artworkToDelete} onOpenChange={(isOpen) => !isOpen && setArtworkToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the artwork
                "{artworkToDelete?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setArtworkToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteArtwork}
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