'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Artwork } from "@/lib/types";
import { Palette, Sparkles, ChevronLeft, ChevronRight, ArrowRight, LayoutGrid, CreditCard } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ArtworkCard, ArtworkCardSkeleton } from "@/components/artwork/ArtworkCard";

const fetchFeaturedArtworks = async (): Promise<Artwork[]> => {
  const artworks = await apiClient.get<Artwork[]>('/api/artworks/', {
    params: { limit: 7, sort_by: 'created_at', sort_order: 'desc', is_active: true }
  });
  return artworks || [];
};

export default function Home() {
  const { data: featuredArtworks, isLoading: isLoadingArtworks, error: artworksError } = useQuery<Artwork[], Error>({
    queryKey: ['featuredArtworks'],
    queryFn: fetchFeaturedArtworks,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const heroContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        duration: 0.5,
      },
    },
  };
  
  const headingText = "Discover. Collect. Inspire.";
  const headingWords = headingText.split(" ");

  const headingWordContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.18,
      },
    },
  };
  
  const headingWordVariants = {
    hidden: { opacity: 0, y: 35, filter: "blur(5px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 15, stiffness: 100, duration: 0.7 } },
  };

  const contentItemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut", delay: headingWords.length * 0.18 } },
  };

  const scrollFeatured = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const cardWidth = scrollContainerRef.current.firstChild ? (scrollContainerRef.current.firstChild as HTMLElement).offsetWidth : 300;
      const scrollAmount = direction === 'left' ? -cardWidth * 2 : cardWidth * 2;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  const heroBgImage = "/images/backgroundimage.jpg";
  
  return (
    <>
      <motion.div
        className="relative flex flex-col items-center justify-center text-center min-h-[85vh] lg:min-h-screen py-20 md:py-24 
                   bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 
                   dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 
                   text-neutral-100 overflow-hidden"
        variants={heroContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <Image
          src={heroBgImage}
          alt="Expansive art gallery display"
          fill
          className="object-cover -z-10 opacity-30 dark:opacity-25 brightness-60 contrast-125 mix-blend-screen dark:mix-blend-luminosity"
          quality={90}
          priority
          onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
        />

        <motion.h1
          variants={headingWordContainerVariants}
          className="text-5xl sm:text-7xl lg:text-8xl font-bold font-serif tracking-[-0.01em] lg:tracking-[-0.02em] leading-tight mb-8 drop-shadow-xl"
        >
           {headingWords.map((word, index) => (
            <motion.span
              key={word + "-" + index}
              variants={headingWordVariants}
              className="inline-block"
              style={{ marginRight: index < headingWords.length -1 ? "0.2em" : "0" }} 
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>
        <motion.p
          variants={contentItemVariants}
          className="max-w-lg sm:max-w-xl text-lg sm:text-xl text-neutral-300 dark:text-neutral-300 leading-relaxed px-4 sm:px-0 mb-12 drop-shadow-lg"
        >
          Your portal to a world of unique and captivating artwork. Find the piece that speaks to your soul.
        </motion.p>
        <motion.div variants={contentItemVariants}>
          <Link href="/artworks">
            <Button
              size="lg"
              className="px-10 py-4 sm:px-12 sm:py-5 text-xl sm:text-2xl rounded-full shadow-2xl 
                         bg-primary hover:bg-primary-hover text-primary-foreground
                         transition-all duration-300 ease-out transform hover:scale-105 active:scale-95
                         hover:shadow-primary/40 dark:hover:shadow-primary/30
                         focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 dark:focus-visible:ring-offset-neutral-950 focus-visible:ring-primary-hover"
            >
              <Sparkles className="mr-2.5 h-6 w-6" /> Explore Collection
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {(isLoadingArtworks || (featuredArtworks && featuredArtworks.length > 0)) && (
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5 dark:from-primary/10 dark:via-background dark:to-accent/10">
          <div className="container mx-auto px-4">
            <motion.div 
              className="mb-10 md:mb-16 text-center sm:text-left"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold font-serif text-primary tracking-tight flex items-center justify-center sm:justify-start">
                    <Palette className="mr-3 h-9 w-9 text-primary-hover"/>
                    Fresh on the Canvas
                  </h2>
                  <p className="text-muted-foreground max-w-xl text-base mt-3">
                    Our latest artistic arrivals, curated to inspire and transform your space.
                  </p>
                </div>
                {featuredArtworks && featuredArtworks.length > 3 && (
                  <div className="flex space-x-3 mt-6 sm:mt-0 self-center">
                    <Button variant="outline" size="icon" onClick={() => scrollFeatured('left')} aria-label="Scroll left" className="rounded-full hover:bg-primary/10 border-border/70 w-10 h-10">
                      <ChevronLeft className="h-5 w-5"/>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => scrollFeatured('right')} aria-label="Scroll right" className="rounded-full hover:bg-primary/10 border-border/70 w-10 h-10">
                      <ChevronRight className="h-5 w-5"/>
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>

            {(() => {
              if (isLoadingArtworks) {
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
                    {Array.from({ length: 4 }).map((_, i) => <ArtworkCardSkeleton key={`skel-${i}`} />)}
                  </div>
                );
              }
              if (artworksError) {
                return <p className="text-center text-destructive py-8 text-lg">Could not load featured artworks. Please try again later.</p>;
              }
              if (featuredArtworks && featuredArtworks.length > 0) {
                return (
                  <div className="relative -mx-4 px-4">
                    <div 
                      ref={scrollContainerRef}
                      className="flex overflow-x-auto space-x-6 pb-8 scrollbar-thin scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent scrollbar-thumb-rounded-full"
                    >
                      {featuredArtworks.map((artwork, index) => (
                        <motion.div 
                          key={artwork.id}
                          className="w-[280px] sm:w-[300px] lg:w-[320px] flex-shrink-0 snap-start"
                          initial={{ opacity: 0, x: 50 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true, amount: 0.1 }}
                          transition={{ duration: 0.5, delay: index * 0.07, ease: "easeOut" }}
                        >
                          <ArtworkCard artwork={artwork} isPriority={index < 3} />
                        </motion.div>
                      ))}
                       <div className="w-1 flex-shrink-0"></div>
                    </div>
                  </div>
                );
              }
              return <p className="text-center text-muted-foreground py-12 text-lg">No featured artworks available at the moment. Explore our gallery!</p>;
            })()}
            <div className="text-center mt-16 md:mt-20">
                <Link href="/artworks">
                    <Button variant="outline" size="lg" className="group rounded-full border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground transition-colors duration-300 shadow-lg hover:shadow-primary/30 px-10 py-3.5 text-lg">
                        View Entire Gallery <ArrowRight className="ml-2.5 h-5 w-5 group-hover:translate-x-1.5 transition-transform duration-200"/>
                    </Button>
                </Link>
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-24 bg-gradient-to-tr from-accent/5 via-background to-secondary/5 dark:from-accent/10 dark:via-background dark:to-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <motion.h2 
            className="text-3xl sm:text-4xl font-bold font-serif text-primary mb-12 md:mb-16 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, ease:"easeOut" }}
          >
            The Artistry Haven Experience
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { title: "Curated Collections", description: "Explore art handpicked for quality and originality by our expert curators.", IconComponent: LayoutGrid },
              { title: "Seamless Acquisition", description: "Purchase with confidence through our secure, intuitive, and streamlined process.", IconComponent: CreditCard },
              { title: "Elevate Your World", description: "Find unique pieces that transform your home, office, or collection.", IconComponent: Sparkles },
            ].map((item, index) => (
              <motion.div 
                key={item.title} 
                className="p-8 bg-card rounded-2xl shadow-xl hover:shadow-primary/15 transition-all duration-300 border border-transparent hover:border-primary/20 transform hover:-translate-y-1"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
              >
                <item.IconComponent className="h-14 w-14 text-primary mb-6 mx-auto" strokeWidth={1.5}/>
                <h3 className="text-xl lg:text-2xl font-semibold font-serif text-primary-hover mb-4">{item.title}</h3>
                <p className="text-muted-foreground text-base leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}