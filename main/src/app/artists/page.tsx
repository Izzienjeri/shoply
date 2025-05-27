'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Artist } from '@/lib/types';
import { apiClient } from '@/lib/api';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, UserIcon, Users, Brush } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FloatingBlob } from '@/components/ui/effects';

interface ArtistCardProps {
  artist: Artist;
}

function ArtistCard({ artist }: ArtistCardProps) {
  const cardVariants = {
    initial: { opacity: 0, y: 30, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
    hover: { 
      y: -5,
      boxShadow: "0 12px 28px -8px oklch(var(--primary-raw) / 0.15), 0 8px 12px -8px oklch(var(--primary-raw) / 0.12)",
      transition: { type: "spring", stiffness: 280, damping: 18, duration: 0.25 }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      className="h-full"
    >
      <Link href={`/artists/${artist.id}`} className="block group h-full">
        <Card className="h-full overflow-hidden 
                       bg-card/90 dark:bg-neutral-800/85 backdrop-blur-sm 
                       shadow-lg hover:shadow-xl 
                       rounded-xl transition-all duration-300 ease-out 
                       border border-purple-500/10 dark:border-purple-400/10 
                       hover:border-purple-500/30 dark:hover:border-purple-400/30
                       flex flex-col relative z-0">
          <CardHeader className="flex flex-row items-center space-x-4 pb-3 pt-5 px-5">
            <div className="p-3 rounded-full bg-muted dark:bg-neutral-700/50 
                            group-hover:bg-gradient-to-br group-hover:from-rose-400/20 group-hover:to-fuchsia-500/20 
                            dark:group-hover:from-rose-500/30 dark:group-hover:to-fuchsia-600/30
                            transition-colors duration-300">
                <UserIcon className="h-7 w-7 text-muted-foreground dark:text-neutral-300 
                                   group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r 
                                   group-hover:from-rose-500 group-hover:to-fuchsia-500
                                   dark:group-hover:from-rose-400 dark:group-hover:to-fuchsia-400
                                   transition-colors duration-300" />
            </div>
            <CardTitle className="text-xl md:text-2xl font-semibold font-serif tracking-tight
                                  text-transparent bg-clip-text bg-gradient-to-r 
                                  from-purple-600 via-fuchsia-500 to-rose-500
                                  dark:from-purple-400 dark:via-fuchsia-400 dark:to-rose-400
                                  group-hover:bg-gradient-to-r group-hover:from-purple-500 group-hover:via-fuchsia-400 group-hover:to-indigo-500
                                  transition-all duration-300">
              {artist.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1 px-5 pb-5 flex-grow">
            <p className="text-sm md:text-base text-foreground/80 dark:text-neutral-300/90 line-clamp-3 h-[calc(1.4rem*3)] md:h-[calc(1.5rem*3)] leading-relaxed">
              {artist.bio || "Discover the unique vision of this talented artist."}
            </p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function ArtistCardSkeleton() {
  return (
    <Card className="rounded-xl bg-card/85 dark:bg-neutral-800/80 shadow-lg border-border/30">
      <CardHeader className="flex flex-row items-center space-x-4 pb-3 pt-5 px-5">
        <Skeleton className="h-12 w-12 rounded-full bg-muted/70 dark:bg-neutral-700/70" />
        <Skeleton className="h-7 w-3/5 bg-muted/70 dark:bg-neutral-700/70" />
      </CardHeader>
      <CardContent className="pt-1 px-5 pb-5 space-y-2">
        <Skeleton className="h-5 w-full bg-muted/60 dark:bg-neutral-700/60" />
        <Skeleton className="h-5 w-4/5 bg-muted/60 dark:bg-neutral-700/60" />
        <Skeleton className="h-5 w-full bg-muted/60 dark:bg-neutral-700/60" />
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

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeInOut" } },
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  return (
    <motion.div 
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="py-8 md:py-12 relative isolate space-y-10"
    >
      <FloatingBlob
        className="w-[500px] h-[500px] md:w-[700px] md:h-[700px] top-[-15%] left-[-25%] opacity-20 md:opacity-25 -z-10"
        gradientClass="bg-gradient-to-br from-sky-400/70 via-cyan-500/70 to-emerald-400/70 dark:from-sky-600/50 dark:via-cyan-700/50 dark:to-emerald-600/50"
        animateProps={{ x: [0, -60, 40, 0], y: [0, 50, -70, 0], scale: [1, 1.1, 0.9, 1], rotate: [0, -20, 15, 0] }}
      />
      <FloatingBlob
        className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] bottom-[0%] right-[-20%] opacity-20 md:opacity-25 -z-10"
        gradientClass="bg-gradient-to-tr from-rose-400/70 via-fuchsia-500/70 to-purple-500/70 dark:from-rose-600/50 dark:via-fuchsia-700/50 dark:to-purple-700/50"
        animateProps={{ x: [0, 70, -50, 0], y: [0, -60, 80, 0], scale: [1, 0.9, 1.1, 1], rotate: [0, 25, -10, 0] }}
        transitionProps={{ duration: 35 }}
      />

      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness:100 }}
        className="text-4xl sm:text-5xl font-bold tracking-tight font-serif text-center relative"
      >
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-fuchsia-500 to-rose-600
                         dark:from-purple-400 dark:via-fuchsia-400 dark:to-rose-500">
          Discover Our Artists
        </span>
        <Users className="inline-block ml-3 h-9 w-9 text-fuchsia-500 dark:text-fuchsia-400 transform -translate-y-1" />
      </motion.h1>

      {error && (
        <Alert variant="destructive" className="mb-6 shadow-lg rounded-lg max-w-2xl mx-auto bg-red-500/10 dark:bg-red-700/20 border-red-500/30 dark:border-red-600/40">
          <Terminal className="h-5 w-5 text-red-600 dark:text-red-400" />
          <AlertTitle className="font-serif text-red-700 dark:text-red-300">Error Fetching Artists</AlertTitle>
          <AlertDescription className="text-red-600/90 dark:text-red-400/90">{error}</AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton-grid-artists"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 px-4 md:px-0"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <ArtistCardSkeleton key={index} />
            ))}
          </motion.div>
        ) : artists.length > 0 ? (
          <motion.div
            key="artists-grid-actual"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 px-4 md:px-0"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
          >
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </motion.div>
        ) : (
          !error && (
            <motion.div
              key="no-artists"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="col-span-full text-center py-16 flex flex-col items-center justify-center space-y-6"
            >
              <Brush className="h-24 w-24 text-purple-500/30 dark:text-purple-400/30" strokeWidth={1.5} />
              <p className="text-2xl font-serif 
                            text-transparent bg-clip-text bg-gradient-to-r from-slate-600 via-slate-500 to-slate-400
                            dark:from-neutral-400 dark:via-neutral-300 dark:to-neutral-200">
                No Artists Found
              </p>
              <p className="text-md text-muted-foreground dark:text-neutral-400 max-w-md">
                Our gallery of talented creators is currently empty. Please check back soon!
              </p>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </motion.div>
  );
}