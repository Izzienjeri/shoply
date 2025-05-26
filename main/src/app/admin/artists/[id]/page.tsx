'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
  HeaderGroup,
  Cell,
} from '@tanstack/react-table';

import { Artist as ArtistType, Artwork as ArtworkTypeFull, ApiErrorResponse } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice, cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Palette, Terminal, UserCircle2, Edit, InfoIcon, EyeOff, ImageOff, ExternalLink, DollarSign, Package as PackageIcon } from 'lucide-react';

const placeholderImage = "/placeholder-image.svg";

function AdminArtistDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Button variant="outline" size="sm" disabled className="rounded-md"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-muted" />
        <div className="space-y-3 flex-grow">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>
      <Separator />
      <div>
        <Skeleton className="h-8 w-1/3 mb-6" />
        <div className="rounded-lg border">
            <Skeleton className="h-12 w-full" />
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border-b border-border/70">
                    <Skeleton className="h-16 w-16 rounded-md" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" />
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}


export default function AdminArtistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.id as string;

  const [artist, setArtist] = useState<ArtistType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin, isLoading: authIsLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (artistId) {
      if (!authIsLoading && !isAdmin) {
        router.replace('/');
        return;
      }
      if (isAuthenticated || authIsLoading) {
        const fetchArtistDetails = async () => {
          setIsLoading(true);
          setError(null);
          try {
            const fetchedArtist = await apiClient.get<ArtistType>(`/api/artists/${artistId}`, { needsAuth: true });
            setArtist(fetchedArtist);
          } catch (err: any) {
            console.error("Failed to fetch artist details for admin:", err);
            if (err.message && (err.message.includes('404') || err.message.toLowerCase().includes('not found'))) {
               setError("Artist not found.");
            } else {
               setError((err as ApiErrorResponse).message || "An unknown error occurred");
            }
          } finally {
            setIsLoading(false);
          }
        };
        fetchArtistDetails();
      }
    }
  }, [artistId, isAuthenticated, isAdmin, authIsLoading, router]);

  const artworkColumns: ColumnDef<ArtworkTypeFull>[] = useMemo(() => [
    {
      accessorKey: "image_url",
      header: "Image",
      cell: ({ row }) => (
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
          <Image
            src={row.original.image_url || placeholderImage}
            alt={row.original.name}
            fill sizes="48px" className="object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
          />
          {!row.original.image_url && <ImageOff className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "Artwork Name",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => formatPrice(row.original.price),
    },
    {
      accessorKey: "stock_quantity",
      header: "Stock",
      cell: ({ row }) => row.original.stock_quantity,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"} className="text-xs">
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Edit",
      cell: ({ row }) => (
        <Link href={`/admin/artworks?edit=${row.original.id}`}>
          <Button variant="outline" size="sm" className="rounded-md">
            <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
        </Link>
      ),
    },
  ], []);

  const artworksData = useMemo(() => artist?.artworks || [], [artist]);
  const table = useReactTable({
    data: artworksData as ArtworkTypeFull[],
    columns: artworkColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading || authIsLoading) {
    return <AdminArtistDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/artists')} className="mb-6 rounded-md">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Artists List
        </Button>
        <Alert variant="destructive" className="max-w-lg mx-auto rounded-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="font-serif">Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/artists')} className="mb-6 rounded-md">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Artists List
        </Button>
        <Alert className="rounded-lg">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle className="font-serif">Artist Not Found</AlertTitle>
          <AlertDescription>The requested artist could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/artists')} className="rounded-md">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Artists List
        </Button>
        <Link href={`/admin/artists`}>
            <Button variant="default" size="sm" className="rounded-md shadow hover:shadow-md">
              <Edit className="mr-2 h-4 w-4" /> Manage Artists List
            </Button>
        </Link>
      </div>

      {artist.is_active === false && (
        <Alert variant="warning" className="rounded-lg">
            <EyeOff className="h-4 w-4" />
            <AlertTitle className="font-serif">This Artist is INACTIVE</AlertTitle>
            <AlertDescription>Inactive artists and their artworks are hidden from public view. You can reactivate this artist from the main "Manage Artists" page.</AlertDescription>
        </Alert>
      )}

      <Card className="rounded-lg shadow-md">
        <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                 <UserCircle2 className="h-20 w-20 md:h-28 md:w-28 text-muted-foreground flex-shrink-0" />
                <div className="flex-grow">
                    <CardTitle className="text-3xl lg:text-4xl font-bold font-serif text-primary tracking-tight mb-1">
                        {artist.name}
                    </CardTitle>
                    <Badge variant={artist.is_active ? "default" : "destructive"} className="text-xs">
                        {artist.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                        Joined: {new Date(artist.created_at).toLocaleDateString()}
                        {artist.updated_at !== artist.created_at && ` (Updated: ${new Date(artist.updated_at).toLocaleDateString()})`}
                    </p>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {artist.bio && (
                <>
                    <Separator className="my-4" />
                    <h3 className="text-lg font-semibold mb-1 font-serif">Biography</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {artist.bio}
                    </p>
                </>
            )}
        </CardContent>
      </Card>
      
      <Separator />

      <div>
        <h2 className="text-2xl font-semibold font-serif mb-6 flex items-center">
            <Palette className="mr-3 h-6 w-6 text-primary" />
            Artworks by {artist.name} ({artist.artworks?.length || 0} total)
        </h2>
        {artworksData.length > 0 ? (
          <div className="rounded-lg border bg-card shadow">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup: HeaderGroup<ArtworkTypeFull>) => (
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
                {table.getRowModel().rows.map((row: Row<ArtworkTypeFull>) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                    {row.getVisibleCells().map((cell: Cell<ArtworkTypeFull, unknown>) => (
                      <TableCell key={cell.id} className="px-3 py-2.5 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Alert className="rounded-lg">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle className="font-serif">No Artworks Found</AlertTitle>
            <AlertDescription>This artist does not have any artworks listed currently.</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}