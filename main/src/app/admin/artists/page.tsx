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
      header: ({ column }: { column: Column<ArtistType, unknown> }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: { row: Row<ArtistType> }) => {
        const artist = row.original;
        return (
          <Link href={`/admin/artists/${artist.id}`} className="font-medium hover:text-primary hover:underline">
            {artist.name} <ExternalLink className="inline h-3 w-3 ml-1 text-muted-foreground group-hover:text-primary" />
          </Link>
        )
      },
      enableGlobalFilter: true,
    },
    {
      accessorKey: "bio",
      header: "Bio",
      cell: ({ row }: { row: Row<ArtistType> }) => (
        <p className="truncate max-w-xs text-sm text-muted-foreground">{row.original.bio || "N/A"}</p>
      ),
      enableGlobalFilter: true,
    },
    {
      accessorKey: "artworks_count",
      header: ({ column }: { column: Column<ArtistType, unknown> }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Artworks <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: { row: Row<ArtistType> }) => (
        <div className="flex items-center justify-center">
            <PackageIcon className="h-4 w-4 mr-1.5 text-muted-foreground"/>
            {row.original.artworks_count !== undefined ? row.original.artworks_count : (row.original.artworks?.length || 0)}
        </div>
      ),
      sortingFn: 'alphanumeric',
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }: { row: Row<ArtistType> }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
       filterFn: (row: Row<ArtistType>, id: string, value: any) => value.includes(row.getValue(id)),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }: { row: Row<ArtistType> }) => (
        <div className="flex space-x-2 justify-end">
          <Button variant="ghost" size="icon" onClick={() => openEditDialog(row.original)} title="Edit">
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setArtistToDelete(row.original)} title="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
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
    globalFilterFn: (row: Row<ArtistType>, columnId: string, filterValue: string) => {
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
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-semibold">Manage Artists</h1>
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
        <h1 className="text-2xl font-bold tracking-tight flex items-center"><Users className="mr-3 h-6 w-6"/>Manage Artists</h1>
        <Button onClick={openNewDialog}>
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
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<ArtistType>) => (
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
              table.getRowModel().rows.map((row: Row<ArtistType>) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell: Cell<ArtistType, unknown>) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No artists found.
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
          if (!isOpen) { form.reset({ name: "", bio: null, is_active: true }); setEditingArtist(null); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingArtist ? 'Edit Artist' : 'Add New Artist'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artist Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Leonardo da Vinci" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="Brief bio of the artist..." {...field} value={field.value || ""} className="min-h-[100px]" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal">Active</FormLabel>
                            <FormDescription>Uncheck to hide this artist and their artworks from public view.</FormDescription>
                        </div>
                    </FormItem>
                  )}
                />
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingArtist ? 'Save Changes' : 'Create Artist'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!artistToDelete} onOpenChange={(isOpen) => !isOpen && setArtistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the artist "{artistToDelete?.name}".
              Associated artworks will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArtistToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArtist}
              disabled={isSubmitting}
              className={cn(isSubmitting && "opacity-50 cursor-not-allowed", "bg-destructive hover:bg-destructive/90")}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Artwork Reactivation</AlertDialogTitle>
            <AlertDialogDescription>
              You are reactivating the artist "{pendingArtistData?.name}".
              Do you also want to reactivate all their currently inactive artworks?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setShowReactivationConfirmDialog(false); setPendingArtistData(null);}}>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => pendingArtistData && proceedWithArtistUpdate(pendingArtistData, false)} disabled={isSubmitting}>
                No, Just Artist
            </Button>
            <AlertDialogAction onClick={() => pendingArtistData && proceedWithArtistUpdate(pendingArtistData, true)} disabled={isSubmitting}>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Artist Deactivation</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to deactivate the artist "{pendingArtistData?.name}".
              This will also deactivate all their artworks and set their stock quantities to 0.
              Artworks will not be automatically reactivated if you reactivate the artist later (you'll be prompted for that separately).
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setShowArtistDeactivationConfirmDialog(false); setPendingArtistData(null);}}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => pendingArtistData && proceedWithArtistUpdate(pendingArtistData, false)} 
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
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
