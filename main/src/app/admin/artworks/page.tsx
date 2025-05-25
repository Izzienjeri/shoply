'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit3, Trash2, ImageOff, Search, ArrowUpDown, Loader2, ExternalLink, UploadCloud } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

const artworkFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  artist_id: z.string().min(1, "Artist selection is required."),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  stock_quantity: z.coerce.number().int().min(0, "Stock must be a non-negative integer"),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  image_file: z.instanceof(File)
    .optional()
    .nullable()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE,
      `Max file size is 5MB.`
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png and .gif formats are supported."
    ),
  current_image_url: z.string().optional().nullable(),
});

type ArtworkFormValues = z.infer<typeof artworkFormSchema>;
type ArtworkFormInput = z.input<typeof artworkFormSchema>;


const placeholderImage = "/placeholder-image.svg";

export default function AdminArtworksPage() {
  const [artworks, setArtworks] = useState<ArtworkType[]>([]);
  const [artists, setArtists] = useState<ArtistType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<ArtworkType | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [artworkToDelete, setArtworkToDelete] = useState<ArtworkType | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);


  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');


  const form = useForm<ArtworkFormInput, any, ArtworkFormValues>({
    resolver: zodResolver(artworkFormSchema),
    defaultValues: {
      name: "",
      artist_id: "",
      price: 0,
      stock_quantity: 0,
      description: null,
      is_active: true, 
      image_file: null,
      current_image_url: null,
    },
  });
  const { control, handleSubmit, watch, setValue, reset, setError: setFormError, clearErrors, formState: { errors } } = form;

  const stockQuantityValue = watch('stock_quantity');
  const isActiveValue = watch('is_active');

  useEffect(() => {
    const stock = Number(stockQuantityValue);
    if (stock > 0 && !isActiveValue) {
      setValue('is_active', true, { shouldValidate: true, shouldDirty: true });
      toast.info("Artwork automatically set to active due to positive stock quantity.", { duration: 4000 });
      clearErrors(["is_active", "stock_quantity"]); 
    }
  }, [stockQuantityValue, isActiveValue, setValue, clearErrors]);


  const fetchArtworksAndArtists = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedArtworks, fetchedArtists] = await Promise.all([
        apiClient.get<ArtworkType[]>('/artworks/', { needsAuth: true }),
        apiClient.get<ArtistType[]>('/artists/', { needsAuth: true }),
      ]);
      setArtworks(fetchedArtworks || []);
      
      setArtists(fetchedArtists || []); 

      if (fetchedArtists && fetchedArtists.length > 0 && !editingArtwork && !form.getValues('artist_id')) {
        const firstActiveArtist = fetchedArtists.find(a => a.is_active);
        setValue('artist_id', firstActiveArtist ? firstActiveArtist.id : fetchedArtists[0].id, { shouldValidate: true });
      }
    } catch (error) {
      console.error("Failed to fetch artworks or artists:", error);
      toast.error("Could not load data. Ensure you are logged in as admin.");
    } finally {
      setIsLoading(false);
    }
  }, [form, editingArtwork, setValue]); 

  useEffect(() => {
    fetchArtworksAndArtists();
  }, [fetchArtworksAndArtists]);


  const handleFormSubmit: SubmitHandler<ArtworkFormValues> = async (values) => {
    setIsSubmitting(true);
    clearErrors();

    const currentStock = Number(values.stock_quantity);
    const payload_is_active_val = values.is_active; 
    
    let finalIsActive = payload_is_active_val; 

    if (currentStock > 0) {
        finalIsActive = true;
    }

    if (payload_is_active_val === false && currentStock > 0) {
       toast.error("Cannot set artwork as inactive if stock is greater than 0. Artwork will be saved as active.");
    }
    
    if (finalIsActive === false && currentStock > 0) {
        toast.error("Internal validation error: An inactive artwork cannot have stock. Please correct and try again.");
        setFormError("is_active", { type: "manual", message: "Inactive artwork must have 0 stock." });
        setFormError("stock_quantity", { type: "manual", message: "Must be 0 if inactive." });
        setIsSubmitting(false);
        return;
    }

    if (!editingArtwork && !values.image_file) {
      setFormError("image_file", { type: "manual", message: "Artwork image is required for new artworks." });
      setIsSubmitting(false);
      return;
    }
    if (editingArtwork && !values.image_file && !values.current_image_url) {
        setFormError("image_file", { type: "manual", message: "An image is required. Please upload a new image." });
        setIsSubmitting(false);
        return;
    }
    if (!values.artist_id) {
        setFormError("artist_id", {type: "manual", message: "Artist is required."});
        setIsSubmitting(false);
        return;
    }
    
    const selectedArtist = artists.find(a => a.id === values.artist_id);
    if (selectedArtist && !selectedArtist.is_active && finalIsActive) { 
        toast.error(`Artist "${selectedArtist.name}" is inactive. Cannot assign an active artwork to an inactive artist. Activate the artist first or make the artwork inactive (with 0 stock).`);
        setFormError("artist_id", {type: "manual", message: "Selected artist is inactive, cannot assign active artwork."});
        setIsSubmitting(false);
        return;
    }

    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('artist_id', values.artist_id); 
    formData.append('price', values.price.toString());
    formData.append('stock_quantity', String(currentStock)); 
    formData.append('is_active', String(finalIsActive));
    if (values.description) {
      formData.append('description', values.description);
    }

    if (values.image_file) {
      formData.append('image_file', values.image_file);
    } else if (editingArtwork && values.current_image_url) {
      const mediaBase = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/media/`;
      let relativePath = values.current_image_url;
      if (values.current_image_url?.startsWith(mediaBase)) {
        relativePath = values.current_image_url.substring(mediaBase.length);
      }
      formData.append('image_url', relativePath || '');
    }

    try {
      let responseArtwork: ArtworkType | null;
      if (editingArtwork) {
        responseArtwork = await apiClient.patch<ArtworkType>(
          `/artworks/${editingArtwork.id}`,
          formData,
          { needsAuth: true, isFormData: true }
        );
        toast.success("Artwork updated successfully!");
      } else {
        responseArtwork = await apiClient.post<ArtworkType>(
          '/artworks/',
          formData,
          { needsAuth: true, isFormData: true }
        );
        toast.success("Artwork created successfully!");
      }

      if (responseArtwork && responseArtwork.is_active && !payload_is_active_val && Number(responseArtwork.stock_quantity) > 0) {
          toast.info("Artwork was set to active by the server because stock is greater than 0.", { duration: 5000 });
      }

      setShowFormDialog(false);
      setEditingArtwork(null);
      reset({ 
        name: "", artist_id: artists.length > 0 ? artists[0].id : "", price: 0,
        stock_quantity: 0, description: null, is_active: true,
        image_file: null, current_image_url: null,
      });
      setPreviewImage(null);
      fetchArtworksAndArtists(); 
    } catch (error: any) {
      const apiError = error as ApiErrorResponse;
      toast.error(apiError.message || "An error occurred.");
      if (apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
           if (Object.keys(form.getValues()).includes(field)) {
             setFormError(field as keyof ArtworkFormInput, { type: "server", message: messages.join(", ") });
           }
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (artwork: ArtworkType) => {
    setEditingArtwork(artwork);
    setPreviewImage(artwork.image_url || null);
    reset({ 
      name: artwork.name,
      artist_id: artwork.artist?.id || "", 
      price: parseFloat(artwork.price),
      stock_quantity: artwork.stock_quantity,
      description: artwork.description || null,
      is_active: artwork.is_active === undefined ? true : artwork.is_active, 
      image_file: null,
      current_image_url: artwork.image_url || null,
    });
    setShowFormDialog(true);
  };

  const openNewDialog = () => {
    setEditingArtwork(null);
    setPreviewImage(null);
    reset({ 
        name: "",
        artist_id: artists.length > 0 ? (artists.find(a => a.is_active)?.id || artists[0].id) : "",
        price: 0,
        stock_quantity: 0,
        description: null,
        is_active: true, 
        image_file: null,
        current_image_url: null,
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
      cell: ({ row }: { row: Row<ArtworkType> }) => (
        <Link href={`/artworks/${row.original.id}`} target="_blank" className="hover:underline font-medium">
          {row.original.name} <ExternalLink className="inline h-3 w-3 ml-1" />
        </Link>
      ),
    },
    {
      accessorKey: "artist.name",
      header: ({ column }: { column: Column<ArtworkType, unknown> }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Artist <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: { row: Row<ArtworkType> }) => {
        const artistIsActive = row.original.artist?.is_active;
        return (
            <>
              {row.original.artist?.name || 'N/A'}
              {artistIsActive === false && <Badge variant="outline" className="ml-1 text-xs">Artist Inactive</Badge>}
            </>
        );
      }
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
      header: ({ column }: { column: Column<ArtworkType, unknown> }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
         Stock <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: { row: Row<ArtworkType> }) => {
        if (row.original.stock_quantity === 0 && row.original.is_active) {
            return <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Out of Stock</Badge>;
        }
        return row.original.stock_quantity;
      }
    },
    {
      accessorKey: "is_active",
      header: ({ column }: { column: Column<ArtworkType, unknown> }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Status <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: { row: Row<ArtworkType> }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
      filterFn: (row: Row<ArtworkType>, id: string, value: any) => value.includes(row.getValue(id))
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }: { row: Row<ArtworkType> }) => {
        const artwork = row.original;
        return (
          <div className="flex space-x-2 justify-end">
            <Button variant="ghost" size="icon" onClick={() => openEditDialog(artwork)} title="Edit">
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setArtworkToDelete(artwork)} title="Delete">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ], [artists]); 

  const table = useReactTable({
    data: artworks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => { 
      const artworkName = row.getValue('name') as string;
      const artistName = row.original.artist?.name || ''; 
      return artworkName.toLowerCase().includes(filterValue.toLowerCase()) ||
             artistName.toLowerCase().includes(filterValue.toLowerCase());
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
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
            placeholder="Search by artwork or artist name..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
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
                  <TableHead key={header.id} className="whitespace-nowrap">
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
                  No artworks found {globalFilter && `for query "${globalFilter}"`}.
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
          if (!isOpen) {
              reset({
                name: "", artist_id: artists.length > 0 ? (artists.find(a => a.is_active)?.id || artists[0].id) : "", price: 0,
                stock_quantity: 0, description: null, is_active: true,
                image_file: null, current_image_url: null,
              });
              setEditingArtwork(null);
              setPreviewImage(null);
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
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="Artwork Title" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Controller
                control={control}
                name="artist_id"
                render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
                  <FormItem>
                    <FormLabel>Artist</FormLabel>
                    <Select
                      onValueChange={onChange}
                      value={value || ""} 
                    >
                      <FormControl>
                        <SelectTrigger ref={ref} className={cn(error && "border-destructive")}>
                          <SelectValue placeholder="Select an artist" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {artists.length === 0 && !isLoading && <SelectItem value="no-artists" disabled>No artists loaded</SelectItem>}
                        {isLoading && artists.length === 0 && <SelectItem value="loading" disabled>Loading artists...</SelectItem>}
                        {artists.map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            {artist.name} {artist.is_active === false && "(Inactive)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Only active artists can be assigned to active artworks.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
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
                    control={control}
                    name="stock_quantity"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
                        <FormDescription>{'Setting stock > 0 will auto-activate artwork.'}</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <FormField
                control={control}
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
                control={control}
                name="image_file"
                render={({ field: { onChange: onFileChange, value: fileValue, ...restFieldProps } }) => {
                  const currentImageDisplay = editingArtwork && form.getValues('current_image_url') && !fileValue;
                  return (
                    <FormItem>
                      <FormLabel>Artwork Image</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-3">
                          <label htmlFor="image-upload" className={cn(
                              "flex-grow cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                              "file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              "disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground",
                              errors.image_file && "border-destructive"
                          )}>
                            <div className="flex items-center">
                              <UploadCloud className="mr-2 h-4 w-4" />
                              <span>{fileValue ? fileValue.name : (currentImageDisplay ? 'Change image' : 'Upload image')}</span>
                            </div>
                            <Input
                              id="image-upload"
                              type="file"
                              className="sr-only"
                              accept={ACCEPTED_IMAGE_TYPES.join(",")}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                onFileChange(file);
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setPreviewImage(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                } else {
                                  setPreviewImage(form.getValues('current_image_url') || null);
                                }
                              }}
                              {...restFieldProps}
                            />
                          </label>
                        </div>
                      </FormControl>
                     <FormDescription>
                        {editingArtwork && currentImageDisplay ? "Upload a new file to replace the current image." : 
                         !editingArtwork ? "Image is required for new artworks. " : ""}
                        Max 5MB. JPG, PNG, GIF.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                  );
                }}
              />

            {(previewImage) && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {form.watch('image_file') ? "New image preview:" : (editingArtwork ? "Current image:" : "Image preview:")}
                </p>
                <Image
                  src={previewImage || placeholderImage}
                  alt="Artwork image preview"
                  width={128}
                  height={128}
                  className="rounded border object-cover h-32 w-32"
                  onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
                />
              </div>
            )}


               <FormField
                control={control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                       {'Artwork with stock > 0 will be active. To make inactive, stock must be 0.'}
                      </FormDescription>
                       <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
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