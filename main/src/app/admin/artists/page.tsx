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
} from '@tanstack/react-table';

import Link from 'next/link';
import { Artist as ArtistType, ApiErrorResponse } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

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
import { PlusCircle, Edit3, Trash2, Search, ArrowUpDown, Loader2, Users, PackageIcon, ExternalLink } from 'lucide-react';

const artistFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bio: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type ArtistFormValues = z.infer<typeof artistFormSchema>;
type ArtistFormInput = z.input<typeof artistFormSchema>;

interface ArtistApiPayload {
    name: string;
    bio?: string | null;
    is_active: boolean;
    reactivate_artworks?: boolean;
}

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<ArtistType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingArtist, setEditingArtist] = useState<ArtistType | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState<ArtistType | null>(null);
  const [showReactivationConfirmDialog, setShowReactivationConfirmDialog] = useState(false);
  const [showArtistDeactivationConfirmDialog, setShowArtistDeactivationConfirmDialog] = useState(false);
  const [pendingArtistData, setPendingArtistData] = useState<ArtistFormValues | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');


  const form = useForm<ArtistFormInput, any, ArtistFormValues>({
    resolver: zodResolver(artistFormSchema),
    defaultValues: {
      name: "",
      bio: null,
      is_active: true,
    },
  });

  const fetchArtists = async () => {
    setIsLoading(true);
    try {
      const fetchedArtists = await apiClient.get<ArtistType[]>('/api/artists/', { needsAuth: true });
      setArtists(fetchedArtists || []);
    } catch (error) {
      console.error("Failed to fetch artists:", error);
      toast.error("Could not load artists.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, []);

  const proceedWithArtistUpdate = async (values: ArtistFormValues, reactivateArtworksFlag: boolean) => {
    setIsSubmitting(true);
    const payload: ArtistApiPayload = {
        name: values.name,
        bio: values.bio || null,
        is_active: values.is_active,
        reactivate_artworks: reactivateArtworksFlag,
    };

    try {
      if (editingArtist) {
        await apiClient.patch<ArtistType>(`/api/artists/${editingArtist.id}`, payload, { needsAuth: true });
        toast.success("Artist updated successfully!");
        if (values.is_active === false) {
             toast.info("Artist deactivated. Associated artworks were also deactivated and stock set to 0.");
        } else if (reactivateArtworksFlag) {
             toast.info("Attempted to reactivate associated artworks. Please check their status.");
        }
      } else {
        await apiClient.post<ArtistType>('/api/artists/', payload, { needsAuth: true });
        toast.success("Artist created successfully!");
      }
      setShowReactivationConfirmDialog(false);
      setShowArtistDeactivationConfirmDialog(false);
      setPendingArtistData(null);
      setShowFormDialog(false);
      setEditingArtist(null);
      form.reset({ name: "", bio: null, is_active: true });
      fetchArtists();
    } catch (error: any) {
      const apiError = error as ApiErrorResponse;
      toast.error(apiError.message || "An error occurred.");
      if (apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          form.setError(field as keyof ArtistFormInput, { type: "server", message: messages.join(", ") });
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit: SubmitHandler<ArtistFormValues> = async (values) => {
    if (editingArtist && editingArtist.is_active === true && values.is_active === false) {
      setPendingArtistData(values);
      setShowArtistDeactivationConfirmDialog(true); 
    } else if (editingArtist && editingArtist.is_active === false && values.is_active === true) {
      setPendingArtistData(values);
      setShowReactivationConfirmDialog(true); 
    } else {
      proceedWithArtistUpdate(values, false);
    }
  };

  const openEditDialog = (artist: ArtistType) => {
    setEditingArtist(artist);
    form.reset({
      name: artist.name,
      bio: artist.bio || null,
      is_active: artist.is_active === undefined ? true : artist.is_active,
    });
    setShowFormDialog(true);
  };

  const openNewDialog = () => {
    setEditingArtist(null);
    form.reset({ name: "", bio: null, is_active: true });
    setShowFormDialog(true);
  };

  const handleDeleteArtist = async () => {
    if (!artistToDelete) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/api/artists/${artistToDelete.id}`, { needsAuth: true });
      toast.success("Artist deleted successfully! Associated artworks were also deleted.");
      setArtistToDelete(null);
      fetchArtists();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete artist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<ArtistType>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-2 text-xs sm:text-sm">
          Name <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const artist = row.original;
        return (
          <Link href={`/admin/artists/${artist.id}`} className="font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:underline transition-colors text-sm group">
            {artist.name} <ExternalLink className="inline h-3.5 w-3.5 ml-1 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400" />
          </Link>
        )
      },
      enableGlobalFilter: true,
    },
    {
      accessorKey: "bio",
      header: "Bio",
      cell: ({ row }) => (
        <p className="truncate max-w-xs text-sm text-muted-foreground">{row.original.bio || "N/A"}</p>
      ),
      enableGlobalFilter: true,
    },
    {
      accessorKey: "artworks_count",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-2 text-xs sm:text-sm">
          Artworks <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center text-sm text-muted-foreground">
            <PackageIcon className="h-4 w-4 mr-1.5"/>
            {row.original.artworks_count !== undefined ? row.original.artworks_count : (row.original.artworks?.length || 0)}
        </div>
      ),
      sortingFn: 'alphanumeric',
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={cn("text-xs capitalize shadow-sm",
                row.original.is_active ? "bg-green-500 dark:bg-green-600 text-white dark:text-green-50" : "bg-muted text-muted-foreground"
               )}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
       filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      id: "actions",
      header: () => <div className="text-right text-xs sm:text-sm">Actions</div>,
      cell: ({ row }) => (
        <div className="flex space-x-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => openEditDialog(row.original)} title="Edit" className="h-8 w-8 hover:bg-accent group">
            <Edit3 className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setArtistToDelete(row.original)} title="Delete" className="h-8 w-8 hover:bg-destructive/10 group">
            <Trash2 className="h-4 w-4 text-destructive/70 group-hover:text-destructive" />
          </Button>
        </div>
      ),
    },
  ], []); 

  const table = useReactTable({
    data: artists,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
        const artistName = row.original.name.toLowerCase();
        const artistBio = row.original.bio?.toLowerCase() || '';
        const searchTerm = filterValue.toLowerCase();

        return artistName.includes(searchTerm) ||
               artistBio.includes(searchTerm);
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

   if (isLoading && artists.length === 0) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold tracking-tight font-serif text-purple-600 dark:text-purple-400 flex items-center"><Users className="mr-3 h-7 w-7"/>Manage Artists</h1>
                <Skeleton className="h-10 w-40 rounded-md bg-muted" />
            </div>
            <Skeleton className="h-10 w-full max-w-sm rounded-md bg-muted" />
             <div className="rounded-lg border bg-card">
                 {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-16 w-full border-b border-border/70 bg-card" />)}
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-serif text-purple-600 dark:text-purple-400 flex items-center"><Users className="mr-3 h-7 w-7"/>Manage Artists</h1>
        <Button 
            onClick={openNewDialog}
            className="rounded-md bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-700 hover:via-fuchsia-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-95"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Artist
        </Button>
      </div>

      <div className="flex items-center py-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search artists by name or bio..."
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
                <TableRow key={row.id} className="hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2.5 align-middle text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No artists found.
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

      <Dialog open={showFormDialog} onOpenChange={(isOpen) => {
          setShowFormDialog(isOpen);
          if (!isOpen) { form.reset({ name: "", bio: null, is_active: true }); setEditingArtist(null); }
      }}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-purple-600 dark:text-purple-400">{editingArtist ? 'Edit Artist' : 'Add New Artist'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artist Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Leonardo da Vinci" {...field} className="rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biography (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Brief bio of the artist..." {...field} value={field.value || ""} className="min-h-[100px] rounded-md focus-visible:ring-purple-500 dark:focus-visible:ring-purple-600" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-muted/30 dark:bg-muted/20">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id={`is_active_artist_${editingArtist?.id || 'new'}`} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel htmlFor={`is_active_artist_${editingArtist?.id || 'new'}`} className="font-normal cursor-pointer">Active</FormLabel>
                            <FormDescription className="text-xs">Uncheck to hide this artist and their artworks from public view.</FormDescription>
                        </div>
                    </FormItem>
                  )}
                />
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline" className="rounded-md border-purple-500/70 text-purple-600 hover:bg-purple-500/10 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-400/10">Cancel</Button></DialogClose>
                <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="rounded-md bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-700 hover:via-fuchsia-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-95"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingArtist ? 'Save Changes' : 'Create Artist'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!artistToDelete} onOpenChange={(isOpen) => !isOpen && setArtistToDelete(null)}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-destructive">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the artist "{artistToDelete?.name}".
              Associated artworks will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArtistToDelete(null)} className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArtist}
              disabled={isSubmitting}
              className={cn("rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground", isSubmitting && "opacity-50 cursor-not-allowed")}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReactivationConfirmDialog} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setShowReactivationConfirmDialog(false);
              setPendingArtistData(null);
          }
      }}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-purple-600 dark:text-purple-400">Confirm Artwork Reactivation</AlertDialogTitle>
            <AlertDialogDescription>
              You are reactivating the artist "{pendingArtistData?.name}".
              Do you also want to reactivate all their currently inactive artworks?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setShowReactivationConfirmDialog(false); setPendingArtistData(null);}} className="rounded-md">Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => pendingArtistData && proceedWithArtistUpdate(pendingArtistData, false)} disabled={isSubmitting} className="rounded-md">
                No, Just Artist
            </Button>
            <AlertDialogAction 
                onClick={() => pendingArtistData && proceedWithArtistUpdate(pendingArtistData, true)} 
                disabled={isSubmitting}
                className="rounded-md bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Reactivate Artworks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showArtistDeactivationConfirmDialog} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setShowArtistDeactivationConfirmDialog(false);
              setPendingArtistData(null);
          }
      }}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-amber-600 dark:text-yellow-400">Confirm Artist Deactivation</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to deactivate the artist "{pendingArtistData?.name}".
              This will also deactivate all their artworks and set their stock quantities to 0.
              Artworks will not be automatically reactivated if you reactivate the artist later (you'll be prompted for that separately).
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setShowArtistDeactivationConfirmDialog(false); setPendingArtistData(null);}} className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => pendingArtistData && proceedWithArtistUpdate(pendingArtistData, false)} 
              disabled={isSubmitting}
              className="rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Deactivate Artist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}