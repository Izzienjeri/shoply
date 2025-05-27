'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Artwork } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Palette, Terminal, ListFilter, SearchX, Wind } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FloatingBlob } from '@/components/ui/effects';

interface FiltersState {
  min_price: string;
  max_price: string;
  sort_by: 'created_at' | 'price' | 'name';
  sort_order: 'asc' | 'desc';
}

const initialFilters: FiltersState = {
  min_price: '',
  max_price: '',
  sort_by: 'created_at',
  sort_order: 'desc',
};

export default function ArtworksPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(initialFilters);

  const fetchArtworks = useCallback(async (currentFilters: FiltersState) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('sort_by', currentFilters.sort_by);
      params.append('sort_order', currentFilters.sort_order);
      
      if (currentFilters.min_price && !isNaN(parseFloat(currentFilters.min_price))) {
        params.append('min_price', parseFloat(currentFilters.min_price).toString());
      }
      if (currentFilters.max_price && !isNaN(parseFloat(currentFilters.max_price))) {
         const maxPrice = parseFloat(currentFilters.max_price);
         const minPrice = currentFilters.min_price ? parseFloat(currentFilters.min_price) : -1;
         if (maxPrice >= 0 && (minPrice === -1 || maxPrice >= minPrice)) {
            params.append('max_price', maxPrice.toString());
         } else if (minPrice !== -1 && maxPrice < minPrice) {
            setError("Max price cannot be less than min price.");
            setArtworks([]);
            setIsLoading(false);
            return; 
         }
      }
      
      const fetchedArtworks = await apiClient.get<Artwork[]>(`/api/artworks/?${params.toString()}`);
      setArtworks(fetchedArtworks || []);

    } catch (err: any) {
      console.error("Failed to fetch artworks:", err);
      setError(err.message || "An unknown error occurred");
      setArtworks([]);
    } finally {
      setIsLoading(false);
    }
  }, []); 

  useEffect(() => {
    if (!(error && error.includes("price"))) {
        fetchArtworks(appliedFilters);
    }
  }, [appliedFilters, fetchArtworks, error]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-');
    setFilters(prev => ({
      ...prev,
      sort_by: sortBy as FiltersState['sort_by'],
      sort_order: sortOrder as FiltersState['sort_order'],
    }));
  };
  
  const handleApplyFilters = () => {
    const min = parseFloat(filters.min_price);
    const max = parseFloat(filters.max_price);
    if (filters.min_price && filters.max_price && !isNaN(min) && !isNaN(max) && min > max) {
        setError("Min price cannot be greater than max price. Filters not applied.");
        return; 
    }
    setError(null);
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setError(null);
  };

  const sortOptions = useMemo(() => [
    { value: "created_at-desc", label: "Date: Newest First" },
    { value: "created_at-asc", label: "Date: Oldest First" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "name-asc", label: "Name: A to Z" },
    { value: "name-desc", label: "Name: Z to A" },
  ], []);

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
      className="space-y-10 py-8 md:py-12 relative isolate"
    >
      <FloatingBlob
        className="w-[500px] h-[500px] md:w-[700px] md:h-[700px] top-[-10%] left-[-20%] opacity-20 md:opacity-25 -z-10"
        gradientClass="bg-gradient-to-br from-pink-400/70 to-purple-500/70 dark:from-pink-600/50 dark:to-purple-700/50"
        animateProps={{ x: [0, 60, -40, 0], y: [0, -50, 70, 0], scale: [1, 1.1, 0.9, 1], rotate: [0, 20, -15, 0] }}
      />
      <FloatingBlob
        className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] bottom-[-5%] right-[-15%] opacity-20 md:opacity-25 -z-10"
        gradientClass="bg-gradient-to-tr from-sky-400/70 to-lime-300/70 dark:from-sky-600/50 dark:to-lime-500/50"
        animateProps={{ x: [0, -70, 50, 0], y: [0, 60, -40, 0], scale: [1, 0.9, 1.1, 1], rotate: [0, -25, 10, 0] }}
        transitionProps={{ duration: 35 }}
      />
       <FloatingBlob
        className="hidden lg:block w-[350px] h-[350px] top-[20%] right-[10%] opacity-15 md:opacity-20 -z-10"
        gradientClass="bg-gradient-to-tl from-yellow-300/60 to-red-400/60 dark:from-yellow-500/40 dark:to-red-600/40"
        animateProps={{ x: [0, 40, -30, 0], y: [0, -30, 50, 0], scale: [1, 1.1, 0.95, 1] }}
        transitionProps={{ duration: 40 }}
      />

      <div className="p-6 md:p-8 rounded-xl 
                      bg-card/80 dark:bg-neutral-800/70 backdrop-blur-md 
                      shadow-2xl shadow-fuchsia-500/10 dark:shadow-fuchsia-400/10
                      border border-pink-500/20 dark:border-pink-400/20
                      mx-auto max-w-5xl relative z-0 space-y-8">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness:100 }}
          className="text-4xl sm:text-5xl font-bold tracking-tight font-serif text-center relative"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-600
                          dark:from-rose-400 dark:via-fuchsia-400 dark:to-indigo-500">
            Explore Our Artwork
          </span>
          <Palette className="inline-block ml-3 h-9 w-9 text-pink-500 dark:text-pink-400 transform -translate-y-1" />
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="p-4 sm:p-6 bg-card/50 dark:bg-neutral-800/40 rounded-lg border border-border/50 dark:border-neutral-700/50"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-5 items-end">
            <div className="lg:col-span-1">
              <Label htmlFor="sort_by_order" className="text-sm font-medium text-muted-foreground dark:text-neutral-300">Sort By</Label>
              <Select
                value={`${filters.sort_by}-${filters.sort_order}`}
                onValueChange={handleSortChange}
              >
                <SelectTrigger 
                  id="sort_by_order" 
                  aria-label="Sort artworks by" 
                  className="mt-1.5 rounded-md bg-background/70 dark:bg-neutral-700/50 
                            focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 border-border/70 dark:border-neutral-600/80"
                >
                  <SelectValue placeholder="Select sort order" />
                </SelectTrigger>
                <SelectContent className="rounded-md bg-popover/90 dark:bg-neutral-800/90 backdrop-blur-sm border-border/80 dark:border-neutral-700">
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="focus:bg-pink-500/10 dark:focus:bg-pink-400/10">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-1">
              <Label htmlFor="min_price" className="text-sm font-medium text-muted-foreground dark:text-neutral-300">Min Price (Ksh)</Label>
              <Input
                type="number" id="min_price" name="min_price" placeholder="e.g., 500"
                value={filters.min_price} onChange={handleInputChange} min="0" step="100"
                className="mt-1.5 rounded-md bg-background/70 dark:bg-neutral-700/50 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 border-border/70 dark:border-neutral-600/80"
              />
            </div>

            <div className="lg:col-span-1">
              <Label htmlFor="max_price" className="text-sm font-medium text-muted-foreground dark:text-neutral-300">Max Price (Ksh)</Label>
              <Input
                type="number" id="max_price" name="max_price" placeholder="e.g., 10000"
                value={filters.max_price} onChange={handleInputChange} min="0" step="100"
                className="mt-1.5 rounded-md bg-background/70 dark:bg-neutral-700/50 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 border-border/70 dark:border-neutral-600/80"
              />
            </div>
            
            <div className="flex space-x-2.5 w-full md:col-span-3 lg:col-span-1 md:pt-4 lg:pt-0 items-end">
              <Button 
                  onClick={handleApplyFilters} 
                  className="flex-1 transition-all duration-200 ease-out hover:scale-105 active:scale-95 rounded-md shadow-lg hover:shadow-pink-500/30
                            bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600
                            text-white font-semibold"
              >
                <ListFilter className="mr-2 h-4 w-4" /> Apply
              </Button>
              <Button 
                  onClick={handleClearFilters} 
                  variant="outline" 
                  className="flex-1 transition-all duration-200 ease-out hover:scale-105 active:scale-95 rounded-md shadow-sm hover:shadow-md
                            border-pink-500/80 text-pink-600 hover:bg-pink-500/10 dark:border-pink-400/80 dark:text-pink-400 dark:hover:bg-pink-400/10"
              >
                Clear
              </Button>
            </div>
          </div>
          {error && error.includes("price") && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-3 pl-1">{error}</p>
          )}
        </motion.div>
      </div>
      
      {error && !error.includes("price") && (
        <Alert variant="destructive" className="mb-6 shadow-lg rounded-lg max-w-2xl mx-auto bg-red-500/10 dark:bg-red-700/20 border-red-500/30 dark:border-red-600/40">
          <Terminal className="h-5 w-5 text-red-600 dark:text-red-400" />
          <AlertTitle className="font-serif text-red-700 dark:text-red-300">Error Fetching Artwork</AlertTitle>
          <AlertDescription className="text-red-600/90 dark:text-red-400/90">{error}</AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton-grid"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8 px-4 md:px-0"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <ArtworkCardSkeleton key={index} />
            ))}
          </motion.div>
        ) : artworks.length > 0 ? (
          <motion.div
            key="artworks-grid"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8 px-4 md:px-0"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
          >
            {artworks.map((artwork, index) => (
              <ArtworkCard key={artwork.id} artwork={artwork} isPriority={index < 4} />
            ))}
          </motion.div>
        ) : (
          !error && (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="col-span-full text-center py-16 flex flex-col items-center justify-center space-y-6"
            >
              <SearchX className="h-24 w-24 text-pink-500/30 dark:text-pink-400/30" strokeWidth={1.5} />
              <p className="text-2xl font-serif 
                            text-transparent bg-clip-text bg-gradient-to-r from-slate-600 via-slate-500 to-slate-400
                            dark:from-neutral-400 dark:via-neutral-300 dark:to-neutral-200">
                No Artworks Found
              </p>
              <p className="text-md text-muted-foreground dark:text-neutral-400 max-w-md">
                We couldn't find any artwork matching your current filters. Try adjusting them or explore our full collection!
              </p>
              <Button 
                onClick={handleClearFilters} 
                variant="outline" 
                className="transition-all duration-200 ease-out hover:scale-105 active:scale-95 rounded-full shadow-sm hover:shadow-md
                           border-pink-500/80 text-pink-600 hover:bg-pink-500/10 dark:border-pink-400/80 dark:text-pink-400 dark:hover:bg-pink-400/10
                           px-6 py-2.5 text-sm"
              >
                <Wind className="mr-2 h-4 w-4" /> Clear Filters & Retry
              </Button>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </motion.div>
  );
}