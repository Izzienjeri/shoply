// === app/artists/page.tsx ===
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Artist } from '@/lib/types';
import { apiClient } from '@/lib/api';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, UserIcon } from "lucide-react"; // UserIcon for artist placeholder

interface ArtistCardProps {
  artist: Artist;
}

function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link href={`/artists/${artist.id}`} legacyBehavior>
      <a className="block group">
        <Card className="h-full hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center space-x-4 pb-2">
            <div className="p-3 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                <UserIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <CardTitle className="text-xl group-hover:text-primary transition-colors">{artist.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {artist.bio || "No biography available."}
            </p>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}

function ArtistCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-x-4 pb-2">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-6 w-3/5" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
    </Card>
  );
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtists = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedArtists = await apiClient.get<Artist[]>('/artists/');
        setArtists(fetchedArtists || []);
      } catch (err: any) {
        console.error("Failed to fetch artists:", err);
        setError(err.message || "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtists();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-8 font-serif">
        Discover Our Artists
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Artists</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <ArtistCardSkeleton key={index} />
          ))
        ) : artists.length > 0 ? (
          artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))
        ) : (
          !error && (
            <div className="col-span-full text-center py-10 text-muted-foreground">
              <UserIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl">No artists found at the moment.</p>
              <p>Check back later to discover talented creators.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}