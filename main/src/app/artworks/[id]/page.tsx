'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Artwork as ArtworkType, ApiErrorResponse } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ImageOff, Loader2, ShoppingCart, CheckCircle, Terminal, Edit, InfoIcon, DollarSign, Package, PackageCheck, PackageX, EyeOff } from 'lucide-react';


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

  const { addToCart, cart, isLoading: cartIsLoading } = useCart();
  const { isAdmin, isLoading: authIsLoading, isAuthenticated } = useAuth(); 
  const placeholderImage = "/placeholder-image.svg";

  useEffect(() => {
    if (artworkId) {
      const fetchArtwork = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedArtwork = await apiClient.get<ArtworkType>(`/artworks/${artworkId}`, { needsAuth: isAuthenticated });
          setArtwork(fetchedArtwork);
        } catch (err: any) {
          console.error("Failed to fetch artwork:", err);
          if (err.message && (err.message.includes('404') || err.message.toLowerCase().includes('not found'))) {
             setError("Artwork not found or is not currently active.");
          } else {
             setError((err as ApiErrorResponse).message || "An unknown error occurred");
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchArtwork();
    }
  }, [artworkId, isAuthenticated]);

  const handleAddToCart = async () => {
    if (!artwork || isAdmin || !artwork.is_active || (artwork.artist && !artwork.artist.is_active)) return;
    setIsAddingToCart(true);
    try {
      await addToCart(artwork.id, 1);
    } catch (err) {
      console.error("Add to cart failed from ArtworkDetail page:", err);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const isInCart = !isAdmin && cart?.items.some(item => item.artwork_id === artwork?.id);

  if (isLoading || authIsLoading) {
    return <ArtworkDetailSkeleton />;
  }

  if (error || !artwork) {
    return (
      <div className="text-center py-10">
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{error ? "Error Fetching Artwork" : "Artwork Not Found"}</AlertTitle>
          <AlertDescription>{error || "The artwork you are looking for does not exist or is not active."}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push('/artworks')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Explore Other Artworks
        </Button>
      </div>
    );
  }
  
  if (!artwork.is_active && !isAdmin) {
    return (
      <div className="text-center py-10">
        <ImageOff className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-xl text-muted-foreground">Artwork Not Available</p>
        <p className="text-sm text-muted-foreground">This artwork is not currently active.</p>
         <Button variant="outline" onClick={() => router.push('/artworks')} className="mt-6">
           Explore Other Artworks
        </Button>
      </div>
    );
  }
  if (artwork.artist && !artwork.artist.is_active && !isAdmin) {
     return (
      <div className="text-center py-10">
        <ImageOff className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-xl text-muted-foreground">Artwork Not Available</p>
        <p className="text-sm text-muted-foreground">The artist of this artwork is not currently active.</p>
         <Button variant="outline" onClick={() => router.push('/artworks')} className="mt-6">
           Explore Other Artworks
        </Button>
      </div>
    );
  }

  const canBePurchased = artwork.is_active && artwork.artist?.is_active && artwork.stock_quantity > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {isAdmin && (
          <Link href={`/admin/artworks?edit=${artwork.id}`} passHref legacyBehavior>
            <Button variant="default" size="sm">
              <Edit className="mr-2 h-4 w-4" /> Edit in Admin Panel
            </Button>
          </Link>
        )}
      </div>
      
      {isAdmin && (!artwork.is_active || (artwork.artist && !artwork.artist.is_active)) && (
        <Alert variant="warning" className="mb-6">
            <EyeOff className="h-4 w-4" />
            <AlertTitle>Admin View: Potentially Hidden Artwork</AlertTitle>
            <AlertDescription>
              This artwork is currently {!artwork.is_active ? 'marked as INACTIVE' : 'marked as ACTIVE'}.
              Its artist is currently {artwork.artist && !artwork.artist.is_active ? 'marked as INACTIVE' : 'marked as ACTIVE'}.
              If either the artwork or its artist is inactive, it will be hidden from public users.
            </AlertDescription>
        </Alert>
      )}
       {isAdmin && artwork.is_active && artwork.artist?.is_active && (
        <Alert variant="default" className="mb-6 bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-blue-700 dark:[&>svg]:text-blue-400">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Admin View: Active & Visible Artwork</AlertTitle>
            <AlertDescription>This artwork and its artist are active. It is visible to public users.</AlertDescription>
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
              {!artwork.is_active && <Badge variant="outline" className="ml-2 text-base align-middle">Inactive Artwork</Badge>}
            </h1>
            <Link href={`/artists/${artwork.artist.id}`} className="text-lg text-muted-foreground hover:text-primary transition-colors">
              By {artwork.artist.name}
              {artwork.artist && !artwork.artist.is_active && <Badge variant="outline" className="ml-2 text-sm align-middle">Inactive Artist</Badge>}
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <p className="text-2xl font-semibold text-primary">
                {formatPrice(artwork.price)}
            </p>
          </div>
          
          {(isAdmin || artwork.stock_quantity > 0) && (
            <div className="flex items-center space-x-2">
                 {artwork.stock_quantity > 0 ? <PackageCheck className="h-5 w-5 text-green-600" /> : <PackageX className="h-5 w-5 text-red-600" />}
                <p className={cn("text-sm", artwork.stock_quantity > 0 ? "text-muted-foreground" : "text-red-600 font-semibold")}>
                    Stock: {artwork.stock_quantity} {artwork.stock_quantity === 0 && "(Out of Stock)"}
                </p>
            </div>
          )}

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
              {canBePurchased ? (
                <Button
                  size="lg"
                  className="w-full md:w-auto"
                  onClick={handleAddToCart}
                  disabled={authIsLoading || cartIsLoading || isAddingToCart || !!isInCart}
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
                  {artwork.stock_quantity === 0 ? 'Out of Stock' : 'Unavailable'}
                </Button>
              )}
              {canBePurchased && artwork.stock_quantity < 5 && artwork.stock_quantity > 0 && (
                <p className="text-sm text-orange-600">
                  Only {artwork.stock_quantity} left in stock!
                </p>
              )}
               {artwork.stock_quantity === 0 && (
                <p className="text-sm text-red-600 font-semibold">
                  This item is currently out of stock.
                </p>
              )}
               {!artwork.is_active && (
                 <p className="text-sm text-yellow-600 font-semibold">
                     This artwork is not currently active.
                 </p>
               )}
               {artwork.artist && !artwork.artist.is_active && (
                 <p className="text-sm text-yellow-600 font-semibold">
                     The artist of this artwork is not currently active.
                 </p>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}