// === components/artworks/page.tsx ===
// RENAMED FILE (Recommended: rename the file to page.tsx inside an `app/artworks` directory)
'use client';

import React, { useState, useEffect } from 'react';
import { Artwork } from '@/lib/types'; // Use Artwork type
import { apiClient } from '@/lib/api';
// UPDATED: Import renamed card component
import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

// UPDATED: Component name (optional, but good practice)
export default function ArtworksPage() {
  // UPDATED: State type
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtworks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // UPDATED: API endpoint
        const fetchedArtworks = await apiClient.get<Artwork[]>('/artworks/');
        setArtworks(fetchedArtworks);
      } catch (err) {
        console.error("Failed to fetch artworks:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
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
          {/* UPDATED: Alert title */}
          <AlertTitle>Error Fetching Artwork</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            // UPDATED: Use renamed skeleton
            <ArtworkCardSkeleton key={index} />
          ))
        // UPDATED: Map over artworks state
        ) : artworks.length > 0 ? (
          artworks.map((artwork) => (
            // UPDATED: Use renamed card and pass artwork prop
            <ArtworkCard key={artwork.id} artwork={artwork} />
          ))
        ) : (
          !error && ( // Only show "No artwork" if there wasn't an error
            <div className="col-span-full text-center text-muted-foreground">
              No artwork found.
            </div>
          )
        )}
      </div>
    </div>
  );
}