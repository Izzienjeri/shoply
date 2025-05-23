'use client';

import React, { useState, useEffect } from 'react';
import { Artwork } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Palette, Terminal } from "lucide-react";

export default function ArtworksPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtworks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedArtworks = await apiClient.get<Artwork[]>('/artworks/');
        setArtworks(fetchedArtworks || []);
      } catch (err: any) {
        console.error("Failed to fetch artworks:", err);
        setError(err.message || "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtworks();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6 font-serif">
        Explore Our Artwork
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Artwork</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <ArtworkCardSkeleton key={index} />
          ))
        ) : artworks.length > 0 ? (
          artworks.map((artwork, index) => (
            <ArtworkCard key={artwork.id} artwork={artwork} isPriority={index < 4} />
          ))
        ) : (
          !error && (
            <div className="col-span-full text-center py-10 text-muted-foreground">
                <Palette className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-xl">No artwork found.</p>
                <p>Our gallery is currently empty. Please check back soon!</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}