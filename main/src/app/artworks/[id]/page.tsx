// === app/artworks/[id]/page.tsx ===
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Artwork as ArtworkType } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge"; // Correct import for Badge component
import { ArrowLeft, ImageOff, Loader2, ShoppingCart, CheckCircle, Terminal, Edit } from 'lucide-react';

function ArtworkDetailSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
      <Skeleton className="w-full">
        <AspectRatio ratio={1 / 1} className="bg-muted" />
      </Skeleton>
      <div className="space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-5 w-1/4" />
      </div>
    </div>
  );
}


export default function ArtworkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const artworkId = params.id as string;

  const [artwork, setArtwork] = useState<ArtworkType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const { addToCart, cart } = useCart();
  const { isAdmin, isLoading: authIsLoading } = useAuth();
  const placeholderImage = "/placeholder-image.svg";

  useEffect(() => {
    if (artworkId) {
      const fetchArtwork = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedArtwork = await apiClient.get<ArtworkType>(`/artworks/${artworkId}`, { needsAuth: true });
          setArtwork(fetchedArtwork);
        } catch (err: any) {
          console.error("Failed to fetch artwork:", err);
          setError(err.message || "An unknown error occurred");
        } finally {
          setIsLoading(false);
        }
      };
      fetchArtwork();
    }
  }, [artworkId]);

  const handleAddToCart = async () => {
    if (!artwork || isAdmin) return;
    setIsAddingToCart(true);
    try {
      await addToCart(artwork.id, 1);
    } catch (err) {
      console.error("Add to cart failed from ArtworkDetail page (already handled in context):", err);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const isInCart = !isAdmin && cart?.items.some(item => item.artwork_id === artwork?.id);

  if (isLoading || authIsLoading) {
    return <ArtworkDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Artwork</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Artwork not found.</p>
        <Button variant="outline" onClick={() => router.push('/artworks')} className="mt-6">
           Explore Other Artworks
        </Button>
      </div>
    );
  }
  
  if (!artwork.is_active && !isAdmin) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Artwork not found.</p>
         <Button variant="outline" onClick={() => router.push('/artworks')} className="mt-6">
           Explore Other Artworks
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {isAdmin && (
          <Link href={`/admin/artworks?edit=${artwork.id}`} passHref>
            <Button variant="default" size="sm">
              <Edit className="mr-2 h-4 w-4" /> Edit in Admin
            </Button>
          </Link>
        )}
      </div>
      
      {!artwork.is_active && isAdmin && (
        <Alert variant="warning" className="mb-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Admin View: Inactive Artwork</AlertTitle>
            <AlertDescription>This artwork is currently not active and is hidden from public users.</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="w-full bg-muted rounded-lg overflow-hidden border">
          <AspectRatio ratio={1 / 1}>
            <Image
              src={artwork.image_url || placeholderImage}
              alt={artwork.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.srcset = placeholderImage;
                target.src = placeholderImage;
              }}
            />
             {!artwork.image_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <ImageOff className="h-24 w-24 text-gray-400" />
                </div>
            )}
          </AspectRatio>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold font-serif text-primary tracking-tight">
              {artwork.name}
            </h1>
            <Link href={`/artists/${artwork.artist.id}`} className="text-lg text-muted-foreground hover:text-primary transition-colors">
              By {artwork.artist.name}
            </Link>
          </div>

          <p className="text-2xl font-semibold text-primary">
            {formatPrice(artwork.price)}
          </p>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="text-muted-foreground leading-relaxed">
              {artwork.description || "No description provided."}
            </p>
          </div>

          <Separator />
          
          {!isAdmin && (
            <div className="space-y-4">
              {artwork.stock_quantity > 0 ? (
                <Button
                  size="lg"
                  className="w-full md:w-auto"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || !!isInCart}
                >
                  {isAddingToCart ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : isInCart ? (
                    <CheckCircle className="mr-2 h-5 w-5" />
                  ) : (
                    <ShoppingCart className="mr-2 h-5 w-5" />
                  )}
                  {isAddingToCart ? 'Adding...' : isInCart ? 'Added to Cart' : 'Add to Cart'}
                </Button>
              ) : (
                <Button size="lg" className="w-full md:w-auto" disabled>
                  Out of Stock
                </Button>
              )}
              {artwork.stock_quantity > 0 && artwork.stock_quantity < 5 && (
                <p className="text-sm text-orange-600">
                  Only {artwork.stock_quantity} left in stock!
                </p>
              )}
              {artwork.stock_quantity === 0 && (
                <p className="text-sm text-red-600">
                  This item is currently out of stock.
                </p>
              )}
            </div>
          )}
           {isAdmin && artwork.stock_quantity === 0 && (
             <Badge variant="destructive">Out of Stock</Badge>
           )}
           {isAdmin && artwork.stock_quantity > 0 && (
             <p className="text-sm text-muted-foreground">Stock: {artwork.stock_quantity}</p>
           )}

        </div>
      </div>
    </div>
  );
}