'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Artist as ArtistType, Artwork as ArtworkTypeFull, ApiErrorResponse } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette, Terminal, UserCircle2, Edit, InfoIcon, EyeOff, Brush, Sparkles, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FloatingBlob } from '@/components/ui/effects';

function ArtistDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-10">
      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-24 rounded-full bg-muted/70 dark:bg-neutral-700/60" />
        <Skeleton className="h-9 w-36 rounded-full bg-muted/70 dark:bg-neutral-700/60" />
      </div>
      <div className="bg-card/90 dark:bg-neutral-800/85 p-6 md:p-8 rounded-xl shadow-lg border border-border/30">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-x-8 gap-y-6">
          <Skeleton className="h-36 w-36 md:h-40 md:w-40 rounded-full bg-muted/70 dark:bg-neutral-700/70 flex-shrink-0" />
          <div className="space-y-4 flex-grow">
            <Skeleton className="h-12 w-4/5 bg-muted/60 dark:bg-neutral-700/60 rounded-md" />
            <Skeleton className="h-5 w-full bg-muted/50 dark:bg-neutral-700/50 rounded" />
            <Skeleton className="h-5 w-full bg-muted/50 dark:bg-neutral-700/50 rounded" />
            <Skeleton className="h-5 w-5/6 bg-muted/50 dark:bg-neutral-700/50 rounded" />
          </div>
        </div>
      </div>
      <Separator className="bg-border/50" />
      <div className="bg-card/90 dark:bg-neutral-800/85 p-6 md:p-8 rounded-xl shadow-lg border border-border/30">
        <Skeleton className="h-10 w-1/3 mb-8 bg-muted/60 dark:bg-neutral-700/60" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
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
  const { isAdmin, isLoading: authIsLoading, isAuthenticated } = useAuth(); 

  useEffect(() => {
    if (artistId) {
      const fetchArtist = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedArtist = await apiClient.get<ArtistType>(`/api/artists/${artistId}`, { needsAuth: isAuthenticated });
          setArtist(fetchedArtist);
        } catch (err: any) {
          console.error("Failed to fetch artist details:", err);
          if (err.message && (err.message.includes('404') || err.message.toLowerCase().includes('not found'))) {
             setError("Artist not found or is not currently active.");
          } else {
             setError( (err as ApiErrorResponse).message || "An unknown error occurred");
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchArtist();
    }
  }, [artistId, isAuthenticated]);

  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeInOut" } },
  };
  
  const contentVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.2, ease: "easeOut" } },
  };
  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1, ease: "easeOut" } },
  };

  if (isLoading || authIsLoading) {
    return <ArtistDetailSkeleton />;
  }

  if (error || !artist) {
     return (
      <motion.div 
        variants={pageVariants} initial="hidden" animate="visible"
        className="text-center py-16 min-h-[60vh] flex flex-col items-center justify-center"
      >
        <Alert variant="destructive" className="max-w-lg mx-auto rounded-xl shadow-lg bg-red-500/10 dark:bg-red-700/20 border-red-500/30 dark:border-red-600/40">
          <Terminal className="h-5 w-5 text-red-600 dark:text-red-400" />
          <AlertTitle className="font-serif text-xl text-red-700 dark:text-red-300">{error ? "Error Fetching Artist" : "Artist Not Found"}</AlertTitle>
          <AlertDescription className="text-red-600/90 dark:text-red-400/90">{error || "The artist you are looking for does not exist or is not active."}</AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={() => router.push('/artists')} 
          className="mt-8 rounded-full px-8 py-3 text-purple-600 border-purple-500/80 hover:bg-purple-500/10
                     dark:text-purple-400 dark:border-purple-400/80 dark:hover:bg-purple-400/10
                     transition-all duration-200 ease-out shadow hover:shadow-md"
        >
          <ArrowLeft className="mr-2.5 h-4.5 w-4.5" /> View Other Artists
        </Button>
      </motion.div>
    );
  }
  
  if (!isAdmin && artist.is_active === false) {
     return (
        <motion.div 
          variants={pageVariants} initial="hidden" animate="visible"
          className="text-center py-16 min-h-[60vh] flex flex-col items-center justify-center space-y-6"
        >
            <UserCircle2 className="h-24 w-24 text-purple-500/30 dark:text-purple-400/30" strokeWidth={1.5} />
            <p className="text-2xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-slate-600 via-slate-500 to-slate-400
                            dark:from-neutral-400 dark:via-neutral-300 dark:to-neutral-200">Artist Not Available</p>
            <p className="text-md text-muted-foreground dark:text-neutral-400 max-w-md">This artist's profile is currently not active.</p>
            <Button 
              variant="outline" 
              onClick={() => router.push('/artists')} 
              className="rounded-full px-8 py-3 text-purple-600 border-purple-500/80 hover:bg-purple-500/10
                        dark:text-purple-400 dark:border-purple-400/80 dark:hover:bg-purple-400/10
                        transition-all duration-200 ease-out shadow hover:shadow-md"
            >
                <Users className="mr-2.5 h-4.5 w-4.5" /> View Other Artists
            </Button>
        </motion.div>
    );
  }
  
  const artworksToDisplay = isAdmin 
    ? (artist.artworks || [])
    : (artist.artworks || []).filter(aw => aw.is_active === true);

  return (
    <motion.div 
      variants={pageVariants} initial="hidden" animate="visible"
      className="container mx-auto px-4 py-8 md:py-12 relative isolate"
    >
      <FloatingBlob
        className="w-[700px] h-[700px] md:w-[900px] md:h-[900px] -top-1/4 -left-1/3 opacity-20 md:opacity-25 -z-10"
        gradientClass="bg-gradient-to-br from-purple-400/60 via-fuchsia-500/60 to-rose-500/60 dark:from-purple-600/40 dark:via-fuchsia-700/40 dark:to-rose-800/40"
        animateProps={{ x: [0, 80, -60, 0], y: [0, -70, 90, 0], scale: [1, 1.15, 0.9, 1], rotate: [0, -25, 20, 0] }}
      />
      <FloatingBlob
        className="w-[600px] h-[600px] md:w-[800px] md:h-[800px] -bottom-1/3 -right-1/4 opacity-20 md:opacity-25 -z-10"
        gradientClass="bg-gradient-to-tr from-teal-400/60 to-sky-300/60 dark:from-teal-600/40 dark:to-sky-500/40"
        animateProps={{ x: [0, -90, 70, 0], y: [0, 80, -60, 0], scale: [1, 0.9, 1.15, 1], rotate: [0, 30, -15, 0] }}
        transitionProps={{ duration: 40 }}
      />

      <div className="flex justify-between items-center mb-8 md:mb-10">
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.back()} 
            className="rounded-full shadow-sm hover:shadow-md transition-all duration-200 ease-out
                       border-purple-500/70 text-purple-600 hover:bg-purple-500/10
                       dark:border-purple-400/70 dark:text-purple-400 dark:hover:bg-purple-400/10 px-5"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {isAdmin && (
          <Link href={`/admin/artists/`}>
            <Button 
                variant="default" 
                size="sm" 
                className="rounded-full shadow-md hover:shadow-lg transition-all duration-200 ease-out
                           bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white px-5"
            >
              <Edit className="mr-2 h-4 w-4" /> Manage Artists
            </Button>
          </Link>
        )}
      </div>

      {isAdmin && artist.is_active === false && (
        <Alert variant="warning" className="mb-6 rounded-lg shadow-md bg-amber-400/10 dark:bg-yellow-600/20 border-amber-500/30 dark:border-yellow-500/40">
            <EyeOff className="h-5 w-5 text-amber-600 dark:text-yellow-400" />
            <AlertTitle className="font-serif text-amber-700 dark:text-yellow-300">Admin View: Inactive Artist</AlertTitle>
            <AlertDescription className="text-amber-600/90 dark:text-yellow-400/90">This artist is currently marked as inactive and is hidden from public view. Their artworks will also be hidden from public view, regardless of individual artwork status.</AlertDescription>
        </Alert>
      )}
       {isAdmin && artist.is_active === true && (
        <Alert 
            variant="default" 
            className="mb-6 bg-sky-500/10 border-sky-500/30 text-sky-700 
                                           dark:bg-sky-800/20 dark:border-sky-700/40 dark:text-sky-300 
                                           rounded-lg shadow-md [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 
                                           [&>svg]:top-4 [&>svg]:text-sky-600 dark:[&>svg]:text-sky-400"
        >
            <InfoIcon className="h-5 w-5" />
            <AlertTitle className="font-serif">Admin View: Active Artist</AlertTitle>
            <AlertDescription>This artist is currently active and visible to public users.</AlertDescription>
        </Alert>
      )}

      <motion.header 
        variants={headerVariants}
        className="mb-10 md:mb-12 p-6 md:p-8 rounded-xl 
                   bg-card/90 dark:bg-neutral-800/85 backdrop-blur-md 
                   shadow-xl shadow-purple-500/15 dark:shadow-purple-600/15
                   border border-purple-500/20 dark:border-purple-400/20 relative z-0"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-x-8 gap-y-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0}} 
              animate={{ scale: 1, opacity: 1}} 
              transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
              className="flex-shrink-0 p-2 bg-gradient-to-br from-rose-400/30 via-fuchsia-500/30 to-purple-600/30 rounded-full shadow-lg"
            >
                <UserCircle2 className="h-32 w-32 md:h-36 md:w-36 text-white/80" strokeWidth={1.2}/>
            </motion.div>
            <motion.div variants={contentVariants} className="flex-grow">
                <h1 className="text-4xl lg:text-5xl font-bold font-serif tracking-tight mb-2
                               text-transparent bg-clip-text bg-gradient-to-br 
                               from-rose-500 via-fuchsia-500 to-purple-600
                               dark:from-rose-400 dark:via-fuchsia-400 dark:to-purple-500">
                    {artist.name}
                    {artist.is_active === false && <Badge variant="destructive" className="ml-3 text-sm align-middle py-1 px-2.5 shadow">Inactive</Badge>}
                </h1>
                <p className="text-foreground/90 dark:text-neutral-200/90 leading-relaxed max-w-3xl text-base md:text-lg">
                    {artist.bio || "This artist has not provided a biography yet. Stay tuned for insights into their creative journey!"}
                </p>
            </motion.div>
        </div>
      </motion.header>
      
      <Separator className="my-10 md:my-12 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/30 dark:via-purple-400/30 to-transparent" />

      <motion.section 
        variants={contentVariants} 
        className="bg-card/90 dark:bg-neutral-800/85 backdrop-blur-md p-6 md:p-8 rounded-xl shadow-xl shadow-sky-500/10 dark:shadow-sky-600/10 border border-sky-500/20 dark:border-sky-400/20 relative z-0"
      >
        <h2 className="text-3xl lg:text-4xl font-semibold font-serif mb-8 md:mb-10 flex items-center 
                       text-transparent bg-clip-text bg-gradient-to-r 
                       from-fuchsia-600 to-sky-500 dark:from-fuchsia-400 dark:to-sky-400">
            <Palette className="mr-3.5 h-8 w-8 text-fuchsia-500 dark:text-fuchsia-400" />
            Artworks by {artist.name}
            {isAdmin && <Badge variant="outline" className="ml-4 text-xs py-1 px-2 border-sky-500/70 text-sky-600 dark:border-sky-400/70 dark:text-sky-400 bg-sky-500/5 dark:bg-sky-400/5">Admin View: {artworksToDisplay.length} shown ({artist.artworks?.filter(aw => aw.is_active).length} public)</Badge>}
        </h2>
        {artworksToDisplay.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
            {artworksToDisplay.map((artwork, index) => (
              <ArtworkCard key={artwork.id} artwork={artwork as ArtworkTypeFull} isPriority={index < 4} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 md:py-16 text-muted-foreground col-span-full 
                          bg-card/50 dark:bg-neutral-800/40 backdrop-blur-sm 
                          rounded-xl shadow-lg border border-border/30 p-8 flex flex-col items-center space-y-5">
             <Brush className="h-20 w-20 text-fuchsia-500/30 dark:text-fuchsia-400/30" strokeWidth={1.5}/>
            <p className="text-xl font-serif text-foreground/80 dark:text-neutral-300">
                {isAdmin && (artist.artworks || []).length > 0 
                    ? `This artist has creations, but none are currently active for public display.`
                    : "No artworks found for this artist at the moment."}
                {!isAdmin && "No active artworks found for this artist right now."}
            </p>
             {!isAdmin && <p className="mt-1 text-sm text-muted-foreground/80 dark:text-neutral-400">Please check back later to see their stunning pieces!</p>}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}