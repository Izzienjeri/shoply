// === app/artists/[id]/page.tsx ===
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Artist as ArtistType, Artwork as ArtworkType } from '@/lib/types'; // ArtistType includes optional artworks
import { apiClient } from '@/lib/api';

import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette, Terminal, UserCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

function ArtistDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <Skeleton className="h-32 w-32 rounded-full bg-muted" />
        <div className="space-y-3 flex-grow">
          <Skeleton className="h-10 w-3/4" /> {/* Name */}
          <Skeleton className="h-5 w-full" /> {/* Bio line 1 */}
          <Skeleton className="h-5 w-full" /> {/* Bio line 2 */}
          <Skeleton className="h-5 w-2/3" /> {/* Bio line 3 */}
        </div>
      </div>
      <Separator />
      <div>
        <Skeleton className="h-8 w-1/3 mb-6" /> {/* Artworks Title */}
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (artistId) {
      const fetchArtist = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // This assumes the Artist type might include an 'artworks' array
          const fetchedArtist = await apiClient.get<ArtistType>(`/artists/${artistId}`);
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

  if (isLoading) {
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

  const artworksByArtist = artist.artworks || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Artists
      </Button>

      <header className="mb-10">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
            <div className="flex-shrink-0">
                <UserCircle2 className="h-32 w-32 text-muted-foreground" /> {/* Placeholder Icon */}
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
        </h2>
        {artworksByArtist.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
            {artworksByArtist.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork as ArtworkType} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground col-span-full">
             <Palette className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl">No artworks found for this artist at the moment.</p>
          </div>
        )}
         {!artist.artworks && !isLoading && ( // Explicit check if artworks array is missing from response
            <Alert variant="default" className="mt-6">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Artwork Information</AlertTitle>
                <AlertDescription>
                    Detailed artwork listings for this artist are not available in the current view.
                    This might be due to the API response structure.
                </AlertDescription>
            </Alert>
        )}
      </div>
    </div>
  );
}