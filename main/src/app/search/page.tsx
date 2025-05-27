'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Artwork, Artist, SearchResults } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { UserIcon,Users, Palette, Search as SearchIconLucide, Terminal, Info, Frown, Wind, Aperture } from "lucide-react"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton'; 
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingBlob } from '@/components/ui/effects';
import { cn } from '@/lib/utils';


function ArtistSearchResultCard({ artist }: { artist: Artist }) {
  const cardVariants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
    hover: { 
      y: -4,
      boxShadow: "0 10px 20px -5px oklch(var(--primary-raw) / 0.12), 0 6px 10px -6px oklch(var(--primary-raw) / 0.1)",
      transition: { type: "spring", stiffness: 300, damping: 20, duration: 0.2 }
    }
  };
  return (
    <motion.div variants={cardVariants} initial="initial" animate="animate" whileHover="hover" className="h-full">
        <Link href={`/artists/${artist.id}`} className="block group h-full">
        <Card className="h-full overflow-hidden 
                       bg-card/80 dark:bg-neutral-800/70 backdrop-blur-sm
                       shadow-lg hover:shadow-xl 
                       rounded-xl transition-all duration-300 ease-out 
                       border border-purple-500/10 dark:border-purple-400/10 
                       hover:border-purple-500/30 dark:hover:border-purple-400/30
                       flex flex-col">
            <CardHeader className="flex flex-row items-center space-x-3 pb-2 pt-4 px-4">
            <div className="p-2.5 rounded-full bg-muted dark:bg-neutral-700/50 
                            group-hover:bg-gradient-to-br group-hover:from-rose-400/15 group-hover:to-fuchsia-500/15 
                            transition-colors duration-300">
                <UserIcon className="h-5 w-5 text-muted-foreground dark:text-neutral-300 
                                   group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r 
                                   group-hover:from-rose-500 group-hover:to-fuchsia-500
                                   dark:group-hover:from-rose-400 dark:group-hover:to-fuchsia-400
                                   transition-colors" />
            </div>
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1 font-serif
                                  text-transparent bg-clip-text bg-gradient-to-r 
                                  from-purple-600 via-fuchsia-500 to-rose-500
                                  dark:from-purple-400 dark:via-fuchsia-400 dark:to-rose-400">
                {artist.name}
            </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4 px-4">
            <p className="text-sm text-foreground/70 dark:text-neutral-400/80 line-clamp-2 h-[calc(1.25rem*2)] leading-relaxed">
                {artist.bio || "Explore this artist's unique creations."}
            </p>
            </CardContent>
        </Card>
        </Link>
    </motion.div>
  );
}

function ArtistSearchResultCardSkeleton() {
    return (
        <Card className="rounded-xl bg-card/50 dark:bg-neutral-800/50 shadow-lg border-border/30">
            <CardHeader className="flex flex-row items-center space-x-3 pb-2 pt-4 px-4">
                <Skeleton className="h-10 w-10 rounded-full bg-muted/70 dark:bg-neutral-700/70" />
                <Skeleton className="h-6 w-3/5 bg-muted/70 dark:bg-neutral-700/70" />
            </CardHeader>
            <CardContent className="pt-0 pb-4 px-4 space-y-1.5">
                <Skeleton className="h-4 w-full bg-muted/60 dark:bg-neutral-700/60" />
                <Skeleton className="h-4 w-4/5 bg-muted/60 dark:bg-neutral-700/60" />
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
    if (query && query.trim().length >= 1) {
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
    } else if (query && query.trim().length > 0 && query.trim().length < 1) {
        setError("Search query must be at least 1 character long.");
        setResults(null);
        setIsLoading(false);
    } else if (!query) {
        setResults(null);
        setIsLoading(false);
        setError(null); 
    }
  }, [query, searchContext]);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeInOut" } },
  };
  
  const sectionVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.1, ease: "easeOut" } },
  };

  const ContentWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="py-6 px-4 md:p-8 rounded-xl 
                    bg-card/80 dark:bg-neutral-800/70 backdrop-blur-md 
                    shadow-2xl shadow-purple-500/10 dark:shadow-purple-400/10
                    border border-purple-500/15 dark:border-purple-400/15">
      {children}
    </div>
  );

  if (!query && !isLoading && !error) {
    return (
        <motion.div 
            variants={pageVariants} initial="initial" animate="animate"
            className="text-center py-16 flex flex-col items-center justify-center min-h-[calc(100vh-250px)] space-y-6"
        >
            <SearchIconLucide className="mx-auto h-20 w-20 text-pink-500/30 dark:text-pink-400/30" strokeWidth={1.5} />
            <h1 className="text-3xl font-semibold font-serif 
                           text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600
                           dark:from-rose-400 dark:via-fuchsia-400 dark:to-purple-500">
                Search Artistry Haven
            </h1>
            <p className="text-muted-foreground dark:text-neutral-400 max-w-lg text-base">
                Enter a term in the search bar above to find artwork by title or artist, as well as artist profiles.
            </p>
            <div className="flex gap-4 pt-4">
                <Button asChild variant="default" className="rounded-full shadow-lg hover:shadow-pink-500/30 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white px-8 py-3 text-base">
                    <Link href="/artworks"><Palette className="mr-2 h-5 w-5" />Explore Artwork</Link>
                </Button>
                 <Button asChild variant="outline" className="rounded-full border-pink-500/80 text-pink-600 hover:bg-pink-500/10 dark:border-pink-400/80 dark:text-pink-400 dark:hover:bg-pink-400/10 px-8 py-3 text-base shadow hover:shadow-md">
                    <Link href="/artists"><Users className="mr-2 h-5 w-5"/>Discover Artists</Link>
                </Button>
            </div>
        </motion.div>
    )
  }

  if (isLoading) {
    return (
      <ContentWrapper>
        <motion.div variants={pageVariants} initial="initial" animate="animate">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 font-serif 
                        text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600
                        dark:from-rose-400 dark:via-fuchsia-400 dark:to-purple-500 text-center md:text-left">
            <Aperture className="inline-block mr-3 h-8 w-8 animate-spin-slow text-fuchsia-500 dark:text-fuchsia-400" />
            Searching for "{query}"...
          </h1>
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center font-serif text-primary/80 dark:text-primary/70"><Palette className="mr-3 h-6 w-6"/> Artworks</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
              {Array.from({ length: 4 }).map((_, index) => <ArtworkCardSkeleton key={`art-skel-${index}`} />)}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-6 flex items-center font-serif text-primary/80 dark:text-primary/70"><UserIcon className="mr-3 h-6 w-6"/> Artists</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
              {Array.from({ length: 3 }).map((_, index) => (
                  <ArtistSearchResultCardSkeleton key={`artist-skel-${index}`} />
              ))}
            </div>
          </div>
        </motion.div>
      </ContentWrapper>
    );
  }

  if (error) {
    return (
      <ContentWrapper>
        <motion.div 
          variants={pageVariants} initial="initial" animate="animate"
          className="py-10 text-center md:text-left"
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 font-serif 
                        text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-pink-600
                        dark:from-red-400 dark:via-rose-400 dark:to-pink-500">
            Search Error
          </h1>
          <Alert variant="destructive" className="rounded-lg shadow-md bg-red-500/10 dark:bg-red-700/20 border-red-500/30 dark:border-red-600/40 text-left">
            <Terminal className="h-5 w-5 text-red-600 dark:text-red-400" />
            <AlertTitle className="font-serif text-red-700 dark:text-red-300">Something Went Wrong</AlertTitle>
            <AlertDescription className="text-red-600/90 dark:text-red-400/90">{error}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => router.back()} className="mt-8 rounded-full border-red-500/80 text-red-600 hover:bg-red-500/10 dark:border-red-400/80 dark:text-red-400 dark:hover:bg-red-400/10 px-6 py-2.5 shadow hover:shadow-md">
              <Wind className="mr-2 h-4 w-4"/> Go Back & Try Again
          </Button>
        </motion.div>
      </ContentWrapper>
    );
  }
  
  const noResultsFound = !results || (results.artworks.length === 0 && results.artists.length === 0);

  const ArtworksSection = () => (
    results && results.artworks.length > 0 && (
        <motion.section variants={sectionVariants} className="mb-12">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 flex items-center font-serif 
                       text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-500
                       dark:from-pink-400 dark:to-rose-400">
            <Palette className="mr-3 h-7 w-7 text-pink-500 dark:text-pink-400" />
            Artworks <span className="text-lg text-muted-foreground dark:text-neutral-400 ml-2">({results.artworks.length})</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
            {results.artworks.map((artwork, idx) => (
            <ArtworkCard key={artwork.id} artwork={artwork} isPriority={idx < 4} />
            ))}
        </div>
        </motion.section>
    )
  );

  const ArtistsSection = () => (
    results && results.artists.length > 0 && (
        <motion.section variants={sectionVariants} className="mb-12">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 flex items-center font-serif 
                       text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-fuchsia-500
                       dark:from-purple-400 dark:to-fuchsia-400">
            <UserIcon className="mr-3 h-7 w-7 text-purple-500 dark:text-purple-400" />
            Artists <span className="text-lg text-muted-foreground dark:text-neutral-400 ml-2">({results.artists.length})</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
            {results.artists.map((artist) => (
            <ArtistSearchResultCard key={artist.id} artist={artist} />
            ))}
        </div>
        </motion.section>
    )
  );

  return (
    <ContentWrapper>
        <motion.div variants={pageVariants} initial="initial" animate="animate" className="py-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 font-serif 
                        text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600
                        dark:from-rose-400 dark:via-fuchsia-400 dark:to-purple-500 text-center md:text-left">
            {noResultsFound ? `No Results Found for "${query}"` : `Search Results for "${results?.query || query}"`}
        </h1>

        {noResultsFound ? (
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-center py-12 flex flex-col items-center justify-center min-h-[calc(100vh-450px)] space-y-6"
            >
                <Frown className="mx-auto h-20 w-20 text-fuchsia-500/30 dark:text-fuchsia-400/30" strokeWidth={1.5}/>
                <p className="text-2xl font-serif text-foreground/80 dark:text-neutral-300">We couldn't find anything for that.</p>
                <p className="text-base text-muted-foreground dark:text-neutral-400 max-w-md">
                    Perhaps try a different search term, or explore our curated collections below.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <Button asChild variant="default" className="rounded-full shadow-lg hover:shadow-pink-500/30 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white px-8 py-3 text-base">
                        <Link href="/artworks"><Palette className="mr-2 h-5 w-5" />Explore All Artwork</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-pink-500/80 text-pink-600 hover:bg-pink-500/10 dark:border-pink-400/80 dark:text-pink-400 dark:hover:bg-pink-400/10 px-8 py-3 text-base shadow hover:shadow-md">
                        <Link href="/artists"><Users className="mr-2 h-5 w-5"/>Discover All Artists</Link>
                    </Button>
                </div>
            </motion.div>
        ) : (
            <AnimatePresence mode="wait">
                {searchContext === 'artists' ? (
                    <motion.div key="artists-first" initial="hidden" animate="visible" exit="hidden">
                        <ArtistsSection />
                        <ArtworksSection />
                    </motion.div>
                ) : ( 
                    <motion.div key="artworks-first" initial="hidden" animate="visible" exit="hidden">
                        <ArtworksSection />
                        <ArtistsSection />
                    </motion.div>
                )}
            
                {(results && (results.artworks.length > 0 || results.artists.length > 0)) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    <Alert className="mt-12 bg-card/70 dark:bg-neutral-800/60 backdrop-blur-sm rounded-xl shadow-lg border border-sky-500/20 dark:border-sky-400/20 p-5">
                        <Info className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                        <AlertTitle className="font-serif text-sky-600 dark:text-sky-300 text-lg">Search Tip</AlertTitle>
                        <AlertDescription className="text-muted-foreground dark:text-neutral-300">
                            Didn't find exactly what you were looking for? Try refining your search terms or browse our <Link href="/artworks" className="font-semibold text-sky-500 hover:text-sky-400 dark:text-sky-300 dark:hover:text-sky-200 underline transition-colors">full artwork collection</Link>.
                        </AlertDescription>
                    </Alert>
                </motion.div>
                )}
            </AnimatePresence>
        )}
        </motion.div>
    </ContentWrapper>
  );
}

export default function SearchPage() {
    return (
        <div className="relative isolate py-8 md:py-6">
            <FloatingBlob
                className="w-[700px] h-[700px] -top-1/3 -left-1/4 opacity-15 md:opacity-20 -z-10"
                gradientClass="bg-gradient-to-br from-pink-400/50 via-purple-500/50 to-indigo-500/50"
                animateProps={{ x: [0, 70, -50, 0], y: [0, -60, 80, 0], scale: [1, 1.15, 0.9, 1] }}
            />
            <FloatingBlob
                className="w-[650px] h-[650px] -bottom-1/3 -right-1/3 opacity-15 md:opacity-20 -z-10"
                gradientClass="bg-gradient-to-tr from-sky-400/50 to-lime-300/50"
                animateProps={{ x: [0, -80, 60, 0], y: [0, 70, -50, 0], scale: [1, 0.9, 1.15, 1] }}
                transitionProps={{ duration: 35 }}
            />
            <Suspense fallback={
                <div className="py-8">
                    <Skeleton className="h-12 w-3/5 mb-10 rounded-md bg-muted/70 mx-auto md:mx-0" />
                    <div className="mb-12">
                        <Skeleton className="h-10 w-2/5 mb-6 rounded-md bg-muted/70" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
                            {Array.from({ length: 4 }).map((_, index) => <ArtworkCardSkeleton key={`art-suspense-skel-${index}`} />)}
                        </div>
                    </div>
                     <div>
                        <Skeleton className="h-10 w-2/5 mb-6 rounded-md bg-muted/70" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                            {Array.from({ length: 3 }).map((_, index) => <ArtistSearchResultCardSkeleton key={`artist-suspense-skel-${index}`} />)}
                        </div>
                    </div>
                </div>
            }>
                <SearchResultsContent />
            </Suspense>
        </div>
    );
}