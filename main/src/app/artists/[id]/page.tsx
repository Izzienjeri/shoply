// === app/artists/[id]/page.tsx ===
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Artist as ArtistType, Artwork as ArtworkTypeFull } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette, Terminal, UserCircle2, Edit, InfoIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';


// Skeleton remains the same
function ArtistDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <Skeleton className="h-32 w-32 rounded-full bg-muted" />
        <div className="space-y-3 flex-grow">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>
      <Separator />
      <div>
        <Skeleton className="h-8 w-1/3 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <ArtworkCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ArtistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.id as string;

  const [artist, setArtist] = useState<ArtistType | null>(null);
  const [isLoading, setIsLoading] = useState(true); // General page loading
  const [error, setError] = useState<string | null>(null);
  const { isAdmin, isLoading: authIsLoading } = useAuth(); // Auth-specific loading

  useEffect(() => {
    if (artistId) {
      const fetchArtist = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedArtist = await apiClient.get<ArtistType>(`/artists/${artistId}`, { needsAuth: true });
          setArtist(fetchedArtist);
        } catch (err: any) {
          console.error("Failed to fetch artist details:", err);
          setError(err.message || "An unknown error occurred");
        } finally {
          setIsLoading(false);
        }
      };
      fetchArtist();
    }
  }, [artistId]);

  // Combined loading state check
  if (isLoading || authIsLoading) {
    return <ArtistDetailSkeleton />;
  }

  if (error) {
     return (
      <div className="text-center py-10">
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Artist</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  if (!artist) {
    return (
        <div className="text-center py-10">
            <p className="text-xl text-muted-foreground">Artist not found.</p>
            <Button variant="outline" onClick={() => router.push('/artists')} className="mt-6">
                View Other Artists
            </Button>
        </div>
    );
  }
  
  if (!artist.is_active && !isAdmin) {
     return (
        <div className="text-center py-10">
            <p className="text-xl text-muted-foreground">Artist not found.</p>
            <Button variant="outline" onClick={() => router.push('/artists')} className="mt-6">
                View Other Artists
            </Button>
        </div>
    );
  }
  
  const artworksByArtist = isAdmin 
    ? (artist.artworks || [])
    : (artist.artworks || []).filter(aw => aw.is_active);


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Artists
        </Button>
        {isAdmin && (
          <Link href={`/admin/artists?edit=${artist.id}`} passHref>
            <Button variant="default" size="sm">
              <Edit className="mr-2 h-4 w-4" /> Edit Artist in Admin
            </Button>
          </Link>
        )}
      </div>

      {isAdmin && !artist.is_active && (
        <Alert variant="warning" className="mb-6">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Admin View: Inactive Artist</AlertTitle>
            <AlertDescription>This artist is currently marked as inactive and is hidden from public users. Their active artworks (if any) will also be hidden from the public.</AlertDescription>
        </Alert>
      )}
       {isAdmin && artist.is_active && (
        <Alert 
            variant="default" // Use default and style for info
            className="mb-6 bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-blue-700 dark:[&>svg]:text-blue-400"
        >
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Admin View: Active Artist</AlertTitle>
            <AlertDescription>This artist is currently active and visible to public users.</AlertDescription>
        </Alert>
      )}

      <header className="mb-10">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
            <div className="flex-shrink-0">
                <UserCircle2 className="h-32 w-32 text-muted-foreground" />
            </div>
            <div>
                <h1 className="text-4xl lg:text-5xl font-bold font-serif text-primary tracking-tight mb-2">
                    {artist.name}
                </h1>
                <p className="text-muted-foreground leading-relaxed max-w-2xl">
                    {artist.bio || "This artist has not provided a biography yet."}
                </p>
            </div>
        </div>
      </header>
      
      <Separator className="my-10"/>

      <div>
        <h2 className="text-3xl font-semibold font-serif mb-8 flex items-center">
            <Palette className="mr-3 h-7 w-7 text-primary" />
            Artworks by {artist.name}
            {isAdmin && <Badge variant="outline" className="ml-3">Admin View: Showing {artist.artworks?.length !== artworksByArtist.length ? 'all artist attributed' : 'only active'} artworks</Badge>}
        </h2>
        {artworksByArtist.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
            {artworksByArtist.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork as ArtworkTypeFull} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground col-span-full">
             <Palette className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl">
                {isAdmin && (artist.artworks || []).length > 0 
                    ? `This artist has artworks, but ${artworksByArtist.length === 0 ? 'none are currently publicly active.' : 'all attributed artworks are shown below.'}` 
                    : "No artworks found for this artist at the moment."}
            </p>
             {!isAdmin && <p className="mt-2">Check back later for creations from this artist.</p>}
          </div>
        )}
      </div>
    </div>
  );
}