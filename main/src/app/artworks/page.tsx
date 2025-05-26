'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Artwork } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Palette, Terminal, ListFilter } from "lucide-react";
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
    fetchArtworks(appliedFilters);
  }, [appliedFilters, fetchArtworks]);

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


  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6 font-serif">
        Explore Our Artwork
      </h1>

      <div className="mb-8 p-4 border rounded-lg bg-card shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <Label htmlFor="sort_by_order" className="text-sm font-medium">Sort By</Label>
            <Select
              value={`${filters.sort_by}-${filters.sort_order}`}
              onValueChange={handleSortChange}
            >
              <SelectTrigger id="sort_by_order" aria-label="Sort artworks by">
                <SelectValue placeholder="Select sort order" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="min_price" className="text-sm font-medium">Min Price (Ksh)</Label>
            <Input
              type="number"
              id="min_price"
              name="min_price"
              placeholder="e.g., 500"
              value={filters.min_price}
              onChange={handleInputChange}
              min="0"
              step="100"
            />
          </div>
          <div>
            <Label htmlFor="max_price" className="text-sm font-medium">Max Price (Ksh)</Label>
            <Input
              type="number"
              id="max_price"
              name="max_price"
              placeholder="e.g., 10000"
              value={filters.max_price}
              onChange={handleInputChange}
              min="0"
              step="100"
            />
          </div>
          <div className="flex space-x-2 md:col-start-4">
            <Button onClick={handleApplyFilters} className="w-full">
              <ListFilter className="mr-2 h-4 w-4" /> Apply
            </Button>
            <Button onClick={handleClearFilters} variant="outline" className="w-full">
              Clear
            </Button>
          </div>
        </div>
         {error && error.includes("price") && (
            <p className="text-sm text-destructive mt-2">{error}</p>
         )}
      </div>
      

      {error && !error.includes("price") && (
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
                <p className="text-xl">No artwork found matching your criteria.</p>
                <p>Try adjusting your filters or check back soon!</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}