'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Artist } from '@/lib/types';
import { apiClient } from '@/lib/api';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, UserIcon, Users } from "lucide-react";

interface ArtistCardProps {
  artist: Artist;
}

function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link href={`/artists/${artist.id}`} className="block group">
      <Card className="h-full hover:shadow-xl transition-all duration-300 ease-out rounded-xl border-border/60 hover:border-primary/30 hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center space-x-4 pb-3 pt-5">
          <div className="p-3 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
              <UserIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors font-serif">{artist.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-3 h-[calc(1.25rem*3)] leading-relaxed">
            {artist.bio || "No biography available."}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ArtistCardSkeleton() {
  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center space-x-4 pb-3 pt-5">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-6 w-3/5" />
      </CardHeader>
      <CardContent className="pt-0">
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
        const fetchedArtists = await apiClient.get<Artist[]>('/api/artists/');
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
      <h1 className="text-4xl font-bold tracking-tight mb-10 font-serif text-primary flex items-center">
        <Users className="mr-3 h-9 w-9" /> Discover Our Artists
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-6 rounded-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="font-serif">Error Fetching Artists</AlertTitle>
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
              <p className="text-xl font-serif">No artists found at the moment.</p>
              <p>Check back later to discover talented creators.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}