'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Artwork } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Palette, Terminal, ListFilter, SearchX } from "lucide-react";
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
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5, ease: "easeInOut" } },
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.2,
      },
    },
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="space-y-10"
    >
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-4xl font-bold tracking-tight font-serif text-center md:text-left text-primary flex items-center"
      >
        <Palette className="mr-3 h-9 w-9"/> Explore Our Artwork
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="p-6 border border-border/70 rounded-xl bg-card shadow-lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 items-end">
          <div>
            <Label htmlFor="sort_by_order" className="text-sm font-medium text-muted-foreground">Sort By</Label>
            <Select
              value={`${filters.sort_by}-${filters.sort_order}`}
              onValueChange={handleSortChange}
            >
              <SelectTrigger id="sort_by_order" aria-label="Sort artworks by" className="mt-1.5 rounded-md">
                <SelectValue placeholder="Select sort order" />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="min_price" className="text-sm font-medium text-muted-foreground">Min Price (Ksh)</Label>
            <Input
              type="number"
              id="min_price"
              name="min_price"
              placeholder="e.g., 500"
              value={filters.min_price}
              onChange={handleInputChange}
              min="0"
              step="100"
              className="mt-1.5 rounded-md"
            />
          </div>
          <div>
            <Label htmlFor="max_price" className="text-sm font-medium text-muted-foreground">Max Price (Ksh)</Label>
            <Input
              type="number"
              id="max_price"
              name="max_price"
              placeholder="e.g., 10000"
              value={filters.max_price}
              onChange={handleInputChange}
              min="0"
              step="100"
              className="mt-1.5 rounded-md"
            />
          </div>
          <div className="flex space-x-2.5 md:col-start-4 self-end pt-2 md:pt-0">
            <Button onClick={handleApplyFilters} className="w-full transition-all duration-150 ease-out hover:scale-105 active:scale-95 rounded-md shadow hover:shadow-md">
              <ListFilter className="mr-2 h-4 w-4" /> Apply
            </Button>
            <Button onClick={handleClearFilters} variant="outline" className="w-full transition-all duration-150 ease-out hover:scale-105 active:scale-95 rounded-md shadow-sm hover:shadow">
              Clear
            </Button>
          </div>
        </div>
         {error && error.includes("price") && (
            <p className="text-sm text-destructive mt-3 pl-1">{error}</p>
         )}
      </motion.div>
      
      {error && !error.includes("price") && (
        <Alert variant="destructive" className="mb-6 shadow-md rounded-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="font-serif">Error Fetching Artwork</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton-grid"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <ArtworkCardSkeleton key={index} />
            ))}
          </motion.div>
        ) : artworks.length > 0 ? (
          <motion.div
            key="artworks-grid"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {artworks.map((artwork, index) => (
              <ArtworkCard key={artwork.id} artwork={artwork} isPriority={index < 4} />
            ))}
          </motion.div>
        ) : (
          !error && (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="col-span-full text-center py-16 text-muted-foreground flex flex-col items-center justify-center space-y-4"
            >
              <SearchX className="h-20 w-20 text-primary/30" />
              <p className="text-xl font-medium text-foreground/80 font-serif">No artwork found matching your criteria.</p>
              <p className="text-md text-muted-foreground">Try adjusting your filters or explore our full collection!</p>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </motion.div>
  );
}