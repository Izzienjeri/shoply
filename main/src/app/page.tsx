'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Artwork } from "@/lib/types";
import { ArrowLeft, ArrowRight, Palette } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";


const fetchFeaturedArtworks = async (): Promise<Artwork[]> => {
  const artworks = await apiClient.get<Artwork[]>('/api/artworks/', {
    params: { limit: 5, sort_by: 'created_at', sort_order: 'desc', is_active: true }
  });
  return artworks || [];
};


export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: featuredArtworks, isLoading: isLoadingArtworks, error: artworksError } = useQuery<Artwork[], Error>({
    queryKey: ['featuredArtworks'],
    queryFn: fetchFeaturedArtworks,
    staleTime: 1000 * 60 * 15,
  });

  const heroVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.2,
        duration: 0.5,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };
  
  const carouselItemVariants = {
    hidden: { opacity: 0, scale: 0.95, x: 50 },
    visible: { opacity: 1, scale: 1, x: 0, transition: { duration: 0.5, ease: "circOut" } },
    exit: { opacity: 0, scale: 0.95, x: -50, transition: { duration: 0.3, ease: "circIn" } }
  };


  const handlePrev = () => {
    if (!featuredArtworks) return;
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? featuredArtworks.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    if (!featuredArtworks) return;
    setCurrentIndex((prevIndex) => (prevIndex === featuredArtworks.length - 1 ? 0 : prevIndex + 1));
  };
  
  const placeholderImage = "/placeholder-image.svg";

  return (
    <div className="space-y-20 md:space-y-24">
      <motion.div
        className="flex flex-col items-center justify-center text-center space-y-8 py-12 md:py-16 min-h-[calc(80vh-theme(spacing.16)-theme(spacing.16)-theme(spacing.12))]"
        variants={heroVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold font-serif tracking-tight text-primary"
        >
          Welcome to Artistry Haven
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className="max-w-xl text-lg text-muted-foreground leading-relaxed"
        >
          Discover unique and captivating artwork from talented artists around the world. Find the perfect piece to inspire your space.
        </motion.p>
        <motion.div variants={itemVariants}>
          <Link href="/artworks">
            <Button
              size="lg"
              className="px-10 py-4 text-xl rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-out transform hover:scale-105 active:scale-95"
            >
              Explore Artwork
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {(isLoadingArtworks || (featuredArtworks && featuredArtworks.length > 0)) && (
        <motion.section 
          className="py-12 md:py-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="container mx-auto px-4">
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-center mb-10 md:mb-12 text-primary flex items-center justify-center">
              <Palette className="mr-3 h-8 w-8"/> Featured Artworks
            </h2>
            {isLoadingArtworks ? (
              <div className="flex justify-center items-center h-96">
                <Skeleton className="w-full max-w-2xl h-[28rem] rounded-xl shadow-xl" />
              </div>
            ) : artworksError ? (
              <p className="text-center text-destructive">Could not load featured artworks at this time.</p>
            ) : featuredArtworks && featuredArtworks.length > 0 ? (
              <div className="relative max-w-3xl mx-auto">
                <div className="overflow-hidden rounded-xl shadow-2xl border-2 border-border/70">
                  <motion.div
                    key={currentIndex}
                    custom={currentIndex}
                    variants={carouselItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="aspect-[16/10] bg-muted"
                  >
                    <Link href={`/artworks/${featuredArtworks[currentIndex].id}`} className="block h-full w-full relative group">
                      <Image
                        src={featuredArtworks[currentIndex].image_url || placeholderImage}
                        alt={featuredArtworks[currentIndex].name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 800px"
                        priority={currentIndex === 0}
                        onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 flex flex-col justify-end transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                        <h3 className="text-2xl font-semibold text-white mb-1 line-clamp-2">{featuredArtworks[currentIndex].name}</h3>
                        <p className="text-sm text-gray-200 mb-2">By {featuredArtworks[currentIndex].artist.name}</p>
                        <p className="text-lg font-bold text-primary-foreground bg-primary/90 px-3 py-1 rounded-md w-fit shadow-sm">{formatPrice(featuredArtworks[currentIndex].price)}</p>
                      </div>
                    </Link>
                  </motion.div>
                </div>
                {featuredArtworks.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePrev}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 sm:-translate-x-3/4 z-10 rounded-full shadow-lg bg-card hover:bg-accent h-10 w-10 sm:h-12 sm:w-12 border-border/80"
                      aria-label="Previous artwork"
                    >
                      <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNext}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 sm:translate-x-3/4 z-10 rounded-full shadow-lg bg-card hover:bg-accent h-10 w-10 sm:h-12 sm:w-12 border-border/80"
                      aria-label="Next artwork"
                    >
                      <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                  </>
                )}
                 <div className="flex justify-center mt-6 space-x-2.5">
                    {featuredArtworks.map((_, index) => (
                        <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={cn(
                            'w-3 h-3 rounded-full transition-all duration-300 ease-out',
                            currentIndex === index ? 'bg-primary scale-125 ring-2 ring-primary/50 ring-offset-2 ring-offset-[var(--background)]' : 'bg-muted hover:bg-muted-foreground/40'
                        )}
                        aria-label={`Go to artwork ${index + 1}`}
                        />
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No featured artworks available at the moment. Explore our full collection!</p>
            )}
          </div>
        </motion.section>
      )}
    </div>
  );
}