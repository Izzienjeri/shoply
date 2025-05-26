'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Artwork, Artist, SearchResults } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { UserIcon, Palette, Search as SearchIconLucide, Terminal, Info, Frown } from "lucide-react"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton'; 
import { Button } from '@/components/ui/button';


function ArtistSearchResultCard({ artist }: { artist: Artist }) {
  return (
    <Link href={`/artists/${artist.id}`} className="block group">
      <Card className="h-full hover:shadow-xl transition-all duration-300 ease-out rounded-xl border-border/60 hover:border-primary/30 hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center space-x-3 pb-2 pt-4">
          <div className="p-2 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
            <UserIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1 font-serif">{artist.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <p className="text-sm text-muted-foreground line-clamp-2 h-[2.5em]">
            {artist.bio || "No biography available."}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ArtistSearchResultCardSkeleton() {
    return (
        <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center space-x-3 pb-2 pt-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-6 w-3/5" />
            </CardHeader>
            <CardContent className="pt-0 pb-4">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-4/5" />
            </CardContent>
        </Card>
    );
}


function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const searchContext = searchParams.get('context');

  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query && query.trim().length >= 2) {
      setIsLoading(true);
      setError(null);
      let apiUrl = `/api/search/?q=${encodeURIComponent(query.trim())}`;
      if (searchContext) {
        apiUrl += `&context=${searchContext}`;
      }
      apiClient.get<SearchResults>(apiUrl)
        .then(data => {
          setResults(data);
        })
        .catch(err => {
          console.error("Search failed:", err);
          setError(err.message || "An unknown error occurred during search.");
          setResults(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (query && query.trim().length > 0 && query.trim().length < 2) {
        setError("Search query must be at least 2 characters long.");
        setResults(null);
        setIsLoading(false);
    } else if (!query) {
        setResults(null);
        setIsLoading(false);
        setError(null); 
    }
  }, [query, searchContext, router]);

  if (!query && !isLoading && !error) {
    return (
        <div className="text-center py-10 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
            <SearchIconLucide className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-semibold mb-2 font-serif">Search Artistry Haven</h1>
            <p className="text-muted-foreground max-w-md">
                Enter a term in the search bar above to find artwork by title, description, or artist name, as well as artist profiles.
            </p>
        </div>
    )
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-6 font-serif text-primary">
          Searching for "{query}"...
        </h1>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center font-serif"><Palette className="mr-2 h-6 w-6"/> Artworks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => <ArtworkCardSkeleton key={`art-skel-${index}`} />)}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center font-serif"><UserIcon className="mr-2 h-6 w-6"/> Artists</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {Array.from({ length: 2 }).map((_, index) => (
                <ArtistSearchResultCardSkeleton key={`artist-skel-${index}`} />
             ))}
           </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10">
         <h1 className="text-3xl font-bold tracking-tight mb-6 font-serif text-primary">
          Search Error for "{query}"
        </h1>
        <Alert variant="destructive" className="rounded-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="font-serif">Search Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
         <Button variant="outline" onClick={() => router.back()} className="mt-6 rounded-md">
            Go Back
        </Button>
      </div>
    );
  }
  
  const noResultsFound = !results || (results.artworks.length === 0 && results.artists.length === 0);

  const ArtworksSection = () => (
    results && results.artworks.length > 0 && (
        <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 flex items-center font-serif text-primary/90">
            <Palette className="mr-3 h-6 w-6 text-primary" />
            Artworks ({results.artworks.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {results.artworks.map((artwork) => (
            <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
        </div>
        </section>
    )
  );

  const ArtistsSection = () => (
    results && results.artists.length > 0 && (
        <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 flex items-center font-serif text-primary/90">
            <UserIcon className="mr-3 h-6 w-6 text-primary" />
            Artists ({results.artists.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.artists.map((artist) => (
            <ArtistSearchResultCard key={artist.id} artist={artist} />
            ))}
        </div>
        </section>
    )
  );

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-8 font-serif text-primary">
        {noResultsFound ? `No Results Found for "${query}"` : `Search Results for "${results?.query || query}"`}
      </h1>

      {noResultsFound ? (
         <div className="text-center py-10 flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
            <Frown className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground font-serif">We couldn't find anything matching your search.</p>
            <p className="text-sm text-muted-foreground">Try a different search term or explore our collections.</p>
            <div className="mt-6 space-x-4">
                <Button asChild variant="default" className="rounded-md shadow hover:shadow-md">
                    <Link href="/artworks">Explore Artwork</Link>
                </Button>
                 <Button asChild variant="outline" className="rounded-md">
                    <Link href="/artists">Discover Artists</Link>
                </Button>
            </div>
        </div>
      ) : (
        <>
            {searchContext === 'artists' ? (
                <>
                    <ArtistsSection />
                    <ArtworksSection />
                </>
            ) : ( // Default or context=artworks or no context
                <>
                    <ArtworksSection />
                    <ArtistsSection />
                </>
            )}
        
            {(results && (results.artworks.length > 0 || results.artists.length > 0)) && (
            <Alert className="mt-12 bg-muted/50 rounded-lg">
                <Info className="h-4 w-4" />
                <AlertTitle className="font-serif">Search Tip</AlertTitle>
                <AlertDescription>
                    Didn't find exactly what you were looking for? Try refining your search terms or browse our <Link href="/artworks" className="font-medium underline hover:text-primary">full artwork collection</Link>.
                </AlertDescription>
            </Alert>
            )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div>
                <Skeleton className="h-10 w-1/2 mb-8" />
                <div className="mb-8">
                    <Skeleton className="h-8 w-1/4 mb-4" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, index) => <ArtworkCardSkeleton key={`art-suspense-skel-${index}`} />)}
                    </div>
                </div>
            </div>
        }>
            <SearchResultsContent />
        </Suspense>
    );
}