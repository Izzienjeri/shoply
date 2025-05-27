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
  RowSelectionState,
  Row,
} from '@tanstack/react-table';

import { Artwork as ArtworkType, Artist as ArtistType, ApiErrorResponse, ArtworkBulkActionPayload, ArtworkBulkDeletePayload } from '@/lib/types';
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
import { PlusCircle, Edit3, Trash2, ImageOff, Search, ArrowUpDown, Loader2, ExternalLink, UploadCloud, Filter, CheckSquare, XSquare, Trash, Palette } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

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

const placeholderImage = "/images/placeholder-artwork.png";

export default function AdminArtworksPage() {
  const [artworks, setArtworks] = useState<ArtworkType[]>([]);
  const [artists, setArtists] = useState<ArtistType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<ArtworkType | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [artworkToDelete, setArtworkToDelete] = useState<ArtworkType | null>(null);
  const [artworksToBulkDelete, setArtworksToBulkDelete] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showArtworkDeactivationConfirmDialog, setShowArtworkDeactivationConfirmDialog] = useState(false);
  const [pendingArtworkData, setPendingArtworkData] = useState<ArtworkFormValues | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

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
      const queryParams = new URLSearchParams();
      columnFilters.forEach(filter => {
        if (filter.value && typeof filter.value === 'string' && filter.value.trim() !== '') {
          if (filter.id === 'artist_id_filter') {
             queryParams.append('artist_id_filter', filter.value);
          } else {
             queryParams.append(filter.id, filter.value);
          }
        }
      });
      if (globalFilter) queryParams.append('q', globalFilter);

      const [fetchedArtworks, fetchedArtists] = await Promise.all([
        apiClient.get<ArtworkType[]>(`/api/artworks/?${queryParams.toString()}`, { needsAuth: true }),
        apiClient.get<ArtistType[]>('/api/artists/', { needsAuth: true }),
      ]);
      setArtworks(fetchedArtworks || []);
      setArtists(fetchedArtists || []);

      if (fetchedArtists && fetchedArtists.length > 0 && !editingArtwork && !form.getValues('artist_id')) {
        const firstActiveArtist = fetchedArtists.find(a => a.is_active !== false);
        setValue('artist_id', firstActiveArtist ? firstActiveArtist.id : fetchedArtists[0].id, { shouldValidate: true });
      }
    } catch (error) {
      console.error("Failed to fetch artworks or artists:", error);
      toast.error("Could not load data. Ensure you are logged in as admin.");
    } finally {
      setIsLoading(false);
    }
  }, [editingArtwork, setValue, columnFilters, globalFilter, form]);

  useEffect(() => {
    fetchArtworksAndArtists();
  }, [fetchArtworksAndArtists]);


  const proceedWithArtworkUpdate = async (values: ArtworkFormValues) => {
    setIsSubmitting(true);
    clearErrors();

    let effectiveIsActive = values.is_active;
    let effectiveStockQuantity = Number(values.stock_quantity);

    if (effectiveIsActive === false) {
        effectiveStockQuantity = 0;
    } else if (effectiveStockQuantity > 0) {
        effectiveIsActive = true;
    }
    
    const selectedArtist = artists.find(a => a.id === values.artist_id);
    if (!values.artist_id) {
        setFormError("artist_id", {type: "manual", message: "Artist is required."});
        toast.error("Artist is required.");
        setIsSubmitting(false); return;
    }
    if (selectedArtist && selectedArtist.is_active === false && effectiveIsActive) {
        toast.error(`Artist "${selectedArtist.name}" is inactive. Cannot assign an active artwork to an inactive artist. Activate the artist first or make the artwork inactive.`);
        setFormError("artist_id", {type: "manual", message: "Selected artist is inactive, cannot assign active artwork."});
        setIsSubmitting(false); return;
    }
    if (!editingArtwork && !values.image_file) {
      setFormError("image_file", { type: "manual", message: "Artwork image is required for new artworks." });
      setIsSubmitting(false); return;
    }
    if (editingArtwork && !values.image_file && !values.current_image_url) {
        setFormError("image_file", { type: "manual", message: "An image is required. Please upload a new image or ensure current image URL is present." });
        setIsSubmitting(false); return;
    }

    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('artist_id', values.artist_id);
    formData.append('price', values.price.toString());
    formData.append('stock_quantity', String(effectiveStockQuantity));
    formData.append('is_active', String(effectiveIsActive));
    if (values.description) {
      formData.append('description', values.description);
    }

    if (values.image_file) {
      formData.append('image_file', values.image_file);
    } else if (editingArtwork && values.current_image_url) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        toast.error("API URL not configured."); setIsSubmitting(false); return;
      }
      const mediaBase = `${apiUrl.replace('/api', '')}/media/`;
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
          `/api/artworks/${editingArtwork.id}`,
          formData,
          { needsAuth: true, isFormData: true }
        );
        toast.success("Artwork updated successfully!");
      } else {
        responseArtwork = await apiClient.post<ArtworkType>(
          '/api/artworks/',
          formData,
          { needsAuth: true, isFormData: true }
        );
        toast.success("Artwork created successfully!");
      }

      if (responseArtwork) {
          if (responseArtwork.is_active && !values.is_active && Number(responseArtwork.stock_quantity) > 0) {
              toast.info("Artwork was set to active by the server because stock is greater than 0.", { duration: 5000 });
          }
          if (responseArtwork.is_active === false && Number(responseArtwork.stock_quantity) !== 0) {
              toast.info("Artwork was deactivated and stock set to 0 by the server.", {duration: 5000});
          }
      }
      
      setShowArtworkDeactivationConfirmDialog(false);
      setPendingArtworkData(null);
      setShowFormDialog(false);
      setEditingArtwork(null);
      reset({
        name: "", artist_id: artists.length > 0 ? (artists.find(a=>a.is_active !==false)?.id || artists[0].id) : "", price: 0,
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

  const handleFormSubmit: SubmitHandler<ArtworkFormValues> = async (values) => {
    const intendedIsActive = values.is_active;
    let showDeactivationDialog = false;

    if (intendedIsActive === false) {
        if (editingArtwork && (editingArtwork.is_active === true || editingArtwork.is_active === undefined)) {
            showDeactivationDialog = true;
        } else if (!editingArtwork) {
            showDeactivationDialog = true;
        }
    }

    if (showDeactivationDialog) {
        setPendingArtworkData(values);
        setShowArtworkDeactivationConfirmDialog(true);
        return; 
    }
    
    await proceedWithArtworkUpdate(values);
  };

  const openEditDialog = useCallback((artwork: ArtworkType) => {
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
  }, [reset]);

  const openNewDialog = useCallback(() => {
    setEditingArtwork(null);
    setPreviewImage(null);
    const firstActiveArtist = artists.find(a => a.is_active !== false);
    reset({
        name: "",
        artist_id: artists.length > 0 ? (firstActiveArtist?.id || artists[0].id) : "",
        price: 0,
        stock_quantity: 0,
        description: null,
        is_active: true,
        image_file: null,
        current_image_url: null,
    });
    setShowFormDialog(true);
  }, [reset, artists]);

  const handleDeleteArtwork = async () => {
    if (!artworkToDelete) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/api/artworks/${artworkToDelete.id}`, { needsAuth: true });
      toast.success("Artwork deleted successfully!");
      setArtworkToDelete(null);
      fetchArtworksAndArtists();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete artwork.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    const selectedArtworkIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    if (selectedArtworkIds.length === 0) {
      toast.info("No artworks selected.");
      return;
    }

    if (action === 'delete') {
        setArtworksToBulkDelete(selectedArtworkIds);
        return;
    }
    
    setIsBulkSubmitting(true);
    try {
        const payload: ArtworkBulkActionPayload = { ids: selectedArtworkIds, action };
        await apiClient.patch<any>('/api/artworks/bulk-actions', payload, { needsAuth: true });
        toast.success(`Successfully ${action}d ${selectedArtworkIds.length} artworks.`);
        fetchArtworksAndArtists();
        setRowSelection({});
    } catch (error: any) {
        toast.error(error.message || `Failed to ${action} artworks.`);
    } finally {
        setIsBulkSubmitting(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (artworksToBulkDelete.length === 0) return;
    setIsBulkSubmitting(true);
    try {
        const payload: ArtworkBulkDeletePayload = { ids: artworksToBulkDelete };
        await apiClient.post<any>('/api/artworks/bulk-actions/bulk-delete', payload, { needsAuth: true });
        toast.success(`Successfully deleted ${artworksToBulkDelete.length} artworks.`);
        fetchArtworksAndArtists();
        setRowSelection({});
    } catch (error: any) {
        toast.error(error.message || "Failed to delete artworks.");
    } finally {
        setIsBulkSubmitting(false);
        setArtworksToBulkDelete([]);
    }
  };

  const columns: ColumnDef<ArtworkType>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px] data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 focus-visible:ring-purple-500 dark:data-[state=checked]:bg-purple-500 dark:data-[state=checked]:border-purple-500 dark:focus-visible:ring-purple-600"
          />
        </div>
      ),
      cell: ({ row }) => (
         <div className="flex items-center justify-center">
            <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px] data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 focus-visible:ring-purple-500 dark:data-[state=checked]:bg-purple-500 dark:data-[state=checked]:border-purple-500 dark:focus-visible:ring-purple-600"
            />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "image_url",
      header: () => <div className="text-center">Image</div>,
      cell: ({ row }) => {
        const artwork = row.original;
        return (
          <div className="relative h-16 w-16 mx-auto flex-shrink-0 overflow-hidden rounded-md border bg-muted shadow-inner">
            <Image
              src={artwork.image_url || placeholderImage}
              alt={artwork.name}
              fill
              sizes="64px"
              className="object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
            />
            {!artwork.image_url && <ImageOff className="absolute inset-0 m-auto h-7 w-7 text-muted-foreground/70" />}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-2 text-xs sm:text-sm">
          Name <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link href={`/artworks/${row.original.id}`} target="_blank" className="font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:underline transition-colors text-sm group">
          {row.original.name} <ExternalLink className="inline h-3.5 w-3.5 ml-1 opacity-70 group-hover:opacity-100" />
        </Link>
      ),
    },
    {
      id: "artist_id_filter",
      accessorFn: (row) => row.artist?.name,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-2 text-xs sm:text-sm">
          Artist <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const artistIsActive = row.original.artist?.is_active;
        return (
            <span className="text-sm text-foreground">
              {row.original.artist?.name || <span className="text-muted-foreground italic">N/A</span>}
              {artistIsActive === false && <Badge variant="outline" className="ml-1.5 text-xs py-0.5 px-1.5 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10">Artist Inactive</Badge>}
            </span>
        );
      },
      filterFn: (row, id, value) => {
        if (!row.original.artist) return false;
        return value === row.original.artist.id;
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-2 text-xs sm:text-sm">
          Price <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="text-sm">{formatPrice(row.original.price)}</span>,
    },
    {
      accessorKey: "stock_quantity",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-2 text-xs sm:text-sm">
         Stock <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        if (row.original.stock_quantity === 0 && row.original.is_active) {
            return <Badge variant="outline" className="text-xs border-orange-500/70 text-orange-600 dark:text-orange-400 py-0.5 px-1.5 bg-orange-500/10">Out of Stock</Badge>;
        }
        return <span className="text-sm">{row.original.stock_quantity}</span>;
      }
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-2 text-xs sm:text-sm">
          Status <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge 
            className={cn("py-0.5 px-2 text-xs capitalize shadow-sm",
             row.original.is_active ? "bg-green-500 dark:bg-green-600 text-white dark:text-green-50" : "bg-muted text-muted-foreground"
            )}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
      filterFn: (row, id, value) => value === String(row.getValue(id)),
    },
    {
      id: "actions",
      header: () => <div className="text-right pr-2 text-xs sm:text-sm">Actions</div>,
      cell: ({ row }) => {
        const artwork = row.original;
        return (
          <div className="flex space-x-1 justify-end">
            <Button variant="ghost" size="icon" onClick={() => openEditDialog(artwork)} title="Edit" className="h-8 w-8 hover:bg-accent group">
              <Edit3 className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setArtworkToDelete(artwork)} title="Delete" className="h-8 w-8 hover:bg-destructive/10 group">
              <Trash2 className="h-4 w-4 text-destructive/70 group-hover:text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ], [openEditDialog, setArtworkToDelete]);

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
    onRowSelectionChange: setRowSelection,
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
      rowSelection,
    },
  });
  
  const selectedRowCount = Object.keys(rowSelection).length;

  const dialogContentVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: "circOut" } },
    exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2, ease: "circIn" } }
  };

   if (isLoading && artworks.length === 0) {
    return (
        <div className="space-y-6 p-1">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight font-serif text-purple-600 dark:text-purple-400 flex items-center"><Palette size={28} className="mr-3" /> Manage Artworks</h1>
                <Skeleton className="h-10 w-40 rounded-md bg-muted" />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-4 border rounded-lg bg-card shadow-sm">
                <Skeleton className="h-10 w-full sm:max-w-xs rounded-md bg-muted" />
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Skeleton className="h-10 w-full sm:w-[180px] rounded-md bg-muted" />
                    <Skeleton className="h-10 w-full sm:w-[160px] rounded-md bg-muted" />
                </div>
            </div>
            <Skeleton className="h-96 w-full rounded-md bg-muted" />
        </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-serif text-purple-600 dark:text-purple-400 flex items-center">
          <Palette size={28} className="mr-3" /> Manage Artworks
        </h1>
        <Button 
            onClick={openNewDialog} 
            className="rounded-md bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-700 hover:via-fuchsia-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-95"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Artwork
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-4 border rounded-lg bg-card shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by artwork or artist name..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10 rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Select
                value={table.getColumn('artist_id_filter')?.getFilterValue() as string ?? ''}
                onValueChange={(value) => table.getColumn('artist_id_filter')?.setFilterValue(value === 'all' ? '' : value)}
            >
                <SelectTrigger className="w-full sm:w-[200px] rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600">
                    <SelectValue placeholder="Filter by Artist" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                    <SelectItem value="all">All Artists</SelectItem>
                    {artists.map(artist => (
                        <SelectItem key={artist.id} value={artist.id}>{artist.name} {artist.is_active === false && "(Inactive)"}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select
                value={table.getColumn('is_active')?.getFilterValue() as string ?? 'all'}
                onValueChange={(value) => table.getColumn('is_active')?.setFilterValue(value === 'all' ? '' : value)}
            >
                <SelectTrigger className="w-full sm:w-[180px] rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <AnimatePresence>
        {selectedRowCount > 0 && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4 flex items-center space-x-3 p-3 bg-purple-500/10 dark:bg-purple-400/10 rounded-md border border-purple-500/30 dark:border-purple-400/30"
            >
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{selectedRowCount} row(s) selected.</span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isBulkSubmitting} className="bg-card hover:bg-accent shadow-sm border-purple-500/50 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:border-purple-500/70 focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600">
                            Bulk Actions {isBulkSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="shadow-lg rounded-md">
                        <DropdownMenuLabel>Apply to selected</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleBulkAction('activate')} disabled={isBulkSubmitting} className="hover:!bg-green-500/10 hover:!text-green-700 dark:hover:!text-green-400">
                            <CheckSquare className="mr-2 h-4 w-4 text-green-600" /> Activate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkAction('deactivate')} disabled={isBulkSubmitting} className="hover:!bg-yellow-500/10 hover:!text-yellow-700 dark:hover:!text-yellow-500">
                            <XSquare className="mr-2 h-4 w-4 text-yellow-600" /> Deactivate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => handleBulkAction('delete')}
                            className="text-destructive focus:!text-destructive focus:!bg-destructive/10"
                            disabled={isBulkSubmitting}
                        >
                            <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-lg border bg-card shadow-md overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-muted-foreground">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                    key={row.id} 
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors data-[state=selected]:bg-purple-500/5 dark:data-[state=selected]:bg-purple-400/10"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2.5 align-middle text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No artworks found {globalFilter && `for query "${globalFilter}"`}.
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

      <AnimatePresence>
        {showFormDialog && (
          <Dialog open={showFormDialog} onOpenChange={(isOpen) => { 
              setShowFormDialog(isOpen);
              if (!isOpen) {
                  reset({ name: "", artist_id: artists.length > 0 ? (artists.find(a => a.is_active !== false)?.id || artists[0].id) : "", price: 0, stock_quantity: 0, description: null, is_active: true, image_file: null, current_image_url: null, });
                  setEditingArtwork(null); setPreviewImage(null);
              }
          }}>
            <motion.div
              key="artworkFormDialog"
              variants={dialogContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <DialogContent className="sm:max-w-lg rounded-xl shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-serif text-purple-600 dark:text-purple-400">{editingArtwork ? 'Edit Artwork' : 'Add New Artwork'}</DialogTitle>
                  <DialogDescription>
                    {editingArtwork ? 'Update the details of the artwork.' : 'Fill in the details for the new artwork.'}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 py-4 max-h-[70vh] overflow-y-auto pr-3 pl-1">
                    <FormField control={control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium">Name</FormLabel>
                            <FormControl><Input placeholder="Artwork Title" {...field} className="rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <Controller
                        control={control}
                        name="artist_id"
                        render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium">Artist</FormLabel>
                            <Select onValueChange={onChange} value={value || ""}>
                            <FormControl>
                                <SelectTrigger ref={ref} className={cn("rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600", error && "border-destructive")}>
                                <SelectValue placeholder="Select an artist" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-md">
                                {artists.length === 0 && !isLoading && <SelectItem value="no-artists" disabled>No artists loaded</SelectItem>}
                                {isLoading && artists.length === 0 && <SelectItem value="loading" disabled>Loading artists...</SelectItem>}
                                {artists.map((artist) => (
                                <SelectItem key={artist.id} value={artist.id}>
                                    {artist.name} {artist.is_active === false && "(Inactive)"}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">Only active artists can be assigned to active artworks.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={control} name="price" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-medium">Price (Ksh)</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="e.g., 1500.00" {...field} className="rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={control} name="stock_quantity" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-medium">Stock</FormLabel>
                                <FormControl><Input type="number" placeholder="e.g., 10" {...field} className="rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600" /></FormControl>
                                <FormDescription className="text-xs">{'Stock > 0 will auto-activate.'}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                    <FormField control={control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium">Description</FormLabel>
                            <FormControl><Textarea placeholder="Describe the artwork..." {...field} value={field.value || ""} className="min-h-[100px] rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField
                        control={control} name="image_file"
                        render={({ field: { onChange: onFileChange, value: fileValue, ...restFieldProps } }) => {
                        const currentImageDisplay = editingArtwork && form.getValues('current_image_url') && !fileValue;
                        return (
                            <FormItem>
                            <FormLabel className="text-sm font-medium">Artwork Image</FormLabel>
                            <FormControl>
                                <label htmlFor="image-upload" className={cn( "flex items-center w-full cursor-pointer rounded-md border border-input bg-background px-3.5 py-2.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground", errors.image_file && "border-destructive" )}>
                                <UploadCloud className="mr-2.5 h-4 w-4" />
                                <span>{fileValue ? fileValue.name : (currentImageDisplay ? 'Change image' : 'Upload image')}</span>
                                <Input id="image-upload" type="file" className="sr-only" accept={ACCEPTED_IMAGE_TYPES.join(",")}
                                    onChange={(e) => { 
                                        const file = e.target.files?.[0] || null;
                                        onFileChange(file);
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => { setPreviewImage(reader.result as string); };
                                          reader.readAsDataURL(file);
                                        } else {
                                          setPreviewImage(form.getValues('current_image_url') || null);
                                        }
                                    }}
                                    {...restFieldProps} />
                                </label>
                            </FormControl>
                            <FormDescription className="text-xs">
                                {editingArtwork && currentImageDisplay ? "Upload new to replace." : !editingArtwork ? "Required. " : ""}
                                Max 5MB. JPG, PNG, GIF.
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        );}}
                    />
                    {previewImage && (
                        <div className="mt-2 space-y-1.5">
                            <p className="text-xs text-muted-foreground">
                            {form.watch('image_file') ? "New image preview:" : (editingArtwork ? "Current image:" : "Image preview:")}
                            </p>
                            <Image src={previewImage || placeholderImage} alt="Preview" width={128} height={128} className="rounded-md border object-cover h-32 w-32 shadow-sm" onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }} />
                        </div>
                    )}
                    <FormField control={control} name="is_active" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3.5 shadow-sm bg-muted/30 dark:bg-muted/20">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id={`is_active_artwork_${editingArtwork?.id || 'new'}`}/></FormControl>
                            <div className="space-y-0.5 leading-none">
                            <FormLabel htmlFor={`is_active_artwork_${editingArtwork?.id || 'new'}`} className="text-sm font-medium cursor-pointer">Active</FormLabel>
                            <FormDescription className="text-xs">{'Artwork with stock > 0 will be active.'}</FormDescription>
                            <FormMessage />
                            </div>
                        </FormItem>
                    )}/>
                    <DialogFooter className="pt-5">
                        <DialogClose asChild><Button type="button" variant="outline" className="rounded-md border-purple-500/70 text-purple-600 hover:bg-purple-500/10 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-400/10">Cancel</Button></DialogClose>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="rounded-md bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-700 hover:via-fuchsia-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-95"
                        >
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {editingArtwork ? 'Save Changes' : 'Create Artwork'}
                        </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </motion.div>
          </Dialog>
        )}
      </AnimatePresence>

      <AlertDialog open={!!artworkToDelete} onOpenChange={(isOpen) => !isOpen && setArtworkToDelete(null)}>
        <AlertDialogContent className="rounded-xl shadow-xl">
          <AlertDialogHeader><AlertDialogTitle className="font-serif text-destructive">Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the artwork "{artworkToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteArtwork} disabled={isSubmitting} className={cn("rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground", isSubmitting && "opacity-50 cursor-not-allowed")}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={artworksToBulkDelete.length > 0} onOpenChange={(isOpen) => !isOpen && setArtworksToBulkDelete([])}>
         <AlertDialogContent className="rounded-xl shadow-xl">
          <AlertDialogHeader><AlertDialogTitle className="font-serif text-destructive">Confirm Bulk Delete</AlertDialogTitle><AlertDialogDescription>Are you sure you want to permanently delete {artworksToBulkDelete.length} selected artwork(s)? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-md" onClick={() => setArtworksToBulkDelete([])} disabled={isBulkSubmitting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmBulkDelete} disabled={isBulkSubmitting} className={cn("rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground",isBulkSubmitting && "opacity-50 cursor-not-allowed")}>{isBulkSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Selected</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showArtworkDeactivationConfirmDialog} onOpenChange={(isOpen) => {if (!isOpen) {setShowArtworkDeactivationConfirmDialog(false);setPendingArtworkData(null);}}}>
         <AlertDialogContent className="rounded-xl shadow-xl">
          <AlertDialogHeader><AlertDialogTitle className="font-serif text-amber-600 dark:text-yellow-400">Confirm Artwork Deactivation</AlertDialogTitle><AlertDialogDescription>You are about to mark the artwork "{pendingArtworkData?.name || 'this artwork'}" as inactive. If it currently has stock, its stock quantity will be set to 0. Are you sure you want to proceed?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-md" onClick={() => {setShowArtworkDeactivationConfirmDialog(false); setPendingArtworkData(null);}}>Cancel</AlertDialogCancel><AlertDialogAction 
              onClick={async () => {
                if (pendingArtworkData) {
                  await proceedWithArtworkUpdate(pendingArtworkData);
                }
              }} 
              disabled={isSubmitting} 
              className="rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Yes, Deactivate Artwork
            </AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </motion.div>
  );
}