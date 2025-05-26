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
      <Skeleton className="w-full rounded-lg">
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
        <Skeleton className="h-12 w-40 rounded-md" />
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
          const fetchedArtwork = await apiClient.get<ArtworkType>(`/api/artworks/${artworkId}`, { needsAuth: isAuthenticated });
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
    if (!artwork || isAdmin) return; 
    setIsAddingToCart(true);
    try {
      await addToCart(artwork.id, 1);
    } catch (err) {
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
        <Alert variant="destructive" className="max-w-lg mx-auto rounded-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="font-serif">{error ? "Error Fetching Artwork" : "Artwork Not Found"}</AlertTitle>
          <AlertDescription>{error || "The artwork you are looking for does not exist or is not active."}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push('/artworks')} className="mt-6 rounded-md">
          <ArrowLeft className="mr-2 h-4 w-4" /> Explore Other Artworks
        </Button>
      </div>
    );
  }
  
  const isPubliclyVisibleAndPurchaseable = artwork.is_active === true && artwork.artist?.is_active === true;
  const isOutOfStock = artwork.stock_quantity === 0;

  if (!isPubliclyVisibleAndPurchaseable && !isAdmin) {
    return (
      <div className="text-center py-10">
        <ImageOff className="h-16 w-16 mx-auto mb-4 text-muted-foreground/70" />
        <p className="text-xl text-muted-foreground font-serif">Artwork Not Available</p>
        <p className="text-sm text-muted-foreground">This artwork is currently not available for viewing or purchase.</p>
         <Button variant="outline" onClick={() => router.push('/artworks')} className="mt-6 rounded-md">
           Explore Other Artworks
        </Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="rounded-md">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {isAdmin && (
          <Link href={`/admin/artworks?edit=${artwork.id}`}>
            <Button variant="default" size="sm" className="rounded-md shadow hover:shadow-md">
              <Edit className="mr-2 h-4 w-4" /> Edit in Admin Panel
            </Button>
          </Link>
        )}
      </div>
      
      {isAdmin && (artwork.is_active === false || artwork.artist?.is_active === false || isOutOfStock) && (
        <Alert variant="warning" className="mb-6 rounded-lg">
            <EyeOff className="h-4 w-4" />
            <AlertTitle className="font-serif">Admin View: Artwork Status Notes</AlertTitle>
            <AlertDescription>
              {artwork.is_active === false && <>Artwork status: <Badge variant="destructive" className="text-xs">INACTIVE</Badge>. </>}
              {artwork.artist?.is_active === false && <>Artist status: <Badge variant="destructive" className="text-xs">INACTIVE</Badge>. </>}
              {isOutOfStock && artwork.is_active && <Badge variant="outline" className="border-orange-500 text-orange-600 text-xs">OUT OF STOCK</Badge>}
              <br/>
              If artwork or artist is inactive, it's hidden from public. Inactive artworks must have 0 stock.
            </AlertDescription>
        </Alert>
      )}
       {isAdmin && artwork.is_active === true && artwork.artist?.is_active === true && !isOutOfStock && (
        <Alert variant="default" className="mb-6 bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-blue-700 dark:[&>svg]:text-blue-400 rounded-lg">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle className="font-serif">Admin View: Active & Visible Artwork</AlertTitle>
            <AlertDescription>This artwork and its artist are active, and it is in stock. It is visible and purchaseable by public users.</AlertDescription>
        </Alert>
      )}


      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="w-full bg-muted rounded-xl overflow-hidden border shadow-lg">
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
                    <ImageOff className="h-24 w-24 text-foreground/30" />
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

          <div className="flex items-center space-x-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <p className="text-2xl font-semibold text-primary">
                {formatPrice(artwork.price)}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
              {isOutOfStock ? <PackageX className="h-5 w-5 text-red-600" /> : <PackageCheck className="h-5 w-5 text-green-600" />}
              <p className={cn("text-sm font-medium", isOutOfStock ? "text-red-600" : "text-green-700")}>
                  {isOutOfStock ? "Out of Stock" : 
                   (artwork.stock_quantity < 5 ? `Only ${artwork.stock_quantity} left in stock!` : `In Stock (${artwork.stock_quantity} available)`)
                  }
              </p>
          </div>
          
          {/* Public facing status badges (if not admin) */}
          {!isAdmin && !artwork.is_active && (
              <Badge variant="destructive" className="text-xs">Currently Unavailable</Badge>
          )}
          {!isAdmin && artwork.artist && !artwork.artist.is_active && (
              <Badge variant="destructive" className="text-xs">Artist Unavailable</Badge>
          )}


          <Separator />

          <div>
            <h2 className="text-xl font-semibold mb-2 font-serif">Description</h2>
            <p className="text-muted-foreground leading-relaxed">
              {artwork.description || "No description provided."}
            </p>
          </div>

          <Separator />
          
          {/* Add to cart section for non-admins and if item is purchasable */}
          {!isAdmin && isPubliclyVisibleAndPurchaseable && ( 
            <div className="space-y-4">
              {!isOutOfStock ? (
                <Button
                  size="lg"
                  className="w-full md:w-auto rounded-md shadow hover:shadow-md"
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
                <Button size="lg" className="w-full md:w-auto rounded-md" disabled>
                   Out of Stock
                </Button>
              )}
            </div>
          )}
          {/* Message for non-admins if item is not purchasable but visible due to admin override (should not happen based on previous logic) */}
           {!isAdmin && !isPubliclyVisibleAndPurchaseable && ( 
             <p className="text-sm text-yellow-600 font-semibold">
                 This artwork is currently not available for purchase.
             </p>
           )}
        </div>
      </div>
    </div>
  );
  
}