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
import { ArrowLeft, ImageOff, Loader2, ShoppingCart, CheckCircle, Terminal, Edit, InfoIcon, DollarSign, PackageCheck, PackageX, EyeOff, Palette, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const FloatingBlob = ({ className, animateProps, transitionProps, gradientClass }: {
  className?: string;
  animateProps: any;
  transitionProps?: any;
  gradientClass: string;
}) => (
  <motion.div
    className={cn(
      "absolute rounded-full opacity-20 md:opacity-25 mix-blend-multiply dark:mix-blend-screen filter blur-3xl -z-10",
      gradientClass,
      className
    )}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ ...animateProps, opacity: [0.05, 0.25, 0.1, 0.25, 0.05] }}
    transition={{
      duration: 30 + Math.random() * 20,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
      ...transitionProps,
    }}
  />
);

function ArtworkDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        <Skeleton className="w-full rounded-xl shadow-lg">
          <AspectRatio ratio={1 / 1} className="bg-muted/70 dark:bg-neutral-700/70" />
        </Skeleton>
        <div className="space-y-6 py-4">
          <Skeleton className="h-12 w-4/5 bg-muted/60 dark:bg-neutral-700/60 rounded-md" />
          <Skeleton className="h-7 w-1/2 bg-muted/50 dark:bg-neutral-700/50 rounded-md" />
          <Skeleton className="h-10 w-1/3 bg-muted/60 dark:bg-neutral-700/60 rounded-md" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-5 w-full bg-muted/50 dark:bg-neutral-700/50 rounded" />
            <Skeleton className="h-5 w-full bg-muted/50 dark:bg-neutral-700/50 rounded" />
            <Skeleton className="h-5 w-5/6 bg-muted/50 dark:bg-neutral-700/50 rounded" />
          </div>
          <Skeleton className="h-12 w-48 rounded-full bg-muted/70 dark:bg-neutral-700/70 mt-6" />
        </div>
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
  const placeholderImage = "/images/placeholder-artwork.png";

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

  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeInOut" } },
  };
  
  const contentVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.2, ease: "easeOut" } },
  };
  const imageVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] } },
  };


  if (isLoading || authIsLoading) {
    return <ArtworkDetailSkeleton />;
  }

  if (error || !artwork) {
    return (
      <motion.div 
        variants={pageVariants} initial="hidden" animate="visible"
        className="text-center py-16 min-h-[60vh] flex flex-col items-center justify-center"
      >
        <Alert variant="destructive" className="max-w-lg mx-auto rounded-xl shadow-lg bg-red-500/10 dark:bg-red-700/20 border-red-500/30 dark:border-red-600/40">
          <Terminal className="h-5 w-5 text-red-600 dark:text-red-400" />
          <AlertTitle className="font-serif text-xl text-red-700 dark:text-red-300">{error ? "Error Fetching Artwork" : "Artwork Not Found"}</AlertTitle>
          <AlertDescription className="text-red-600/90 dark:text-red-400/90">{error || "The artwork you are looking for does not exist or is not active."}</AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={() => router.push('/artworks')} 
          className="mt-8 rounded-full px-8 py-3 text-pink-600 border-pink-500/80 hover:bg-pink-500/10
                     dark:text-pink-400 dark:border-pink-400/80 dark:hover:bg-pink-400/10
                     transition-all duration-200 ease-out shadow hover:shadow-md"
        >
          <ArrowLeft className="mr-2.5 h-4.5 w-4.5" /> Explore Other Artworks
        </Button>
      </motion.div>
    );
  }
  
  const isPubliclyVisibleAndPurchaseable = artwork.is_active === true && artwork.artist?.is_active === true;
  const isOutOfStock = artwork.stock_quantity === 0;

  if (!isPubliclyVisibleAndPurchaseable && !isAdmin) {
    return (
      <motion.div 
        variants={pageVariants} initial="hidden" animate="visible"
        className="text-center py-16 min-h-[60vh] flex flex-col items-center justify-center space-y-6"
      >
        <ImageOff className="h-24 w-24 text-pink-500/30 dark:text-pink-400/30" strokeWidth={1.5}/>
        <p className="text-2xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-slate-600 via-slate-500 to-slate-400
                            dark:from-neutral-400 dark:via-neutral-300 dark:to-neutral-200">Artwork Not Available</p>
        <p className="text-md text-muted-foreground dark:text-neutral-400 max-w-md">This artwork is currently not available for viewing or purchase.</p>
         <Button 
           variant="outline" 
           onClick={() => router.push('/artworks')} 
           className="rounded-full px-8 py-3 text-pink-600 border-pink-500/80 hover:bg-pink-500/10
                     dark:text-pink-400 dark:border-pink-400/80 dark:hover:bg-pink-400/10
                     transition-all duration-200 ease-out shadow hover:shadow-md"
        >
           <Palette className="mr-2.5 h-4.5 w-4.5" /> Explore Other Artworks
        </Button>
      </motion.div>
    );
  }


  return (
    <motion.div 
      variants={pageVariants} initial="hidden" animate="visible"
      className="container mx-auto px-4 py-8 md:py-12 relative isolate"
    >
      <FloatingBlob
        className="w-[600px] h-[600px] md:w-[800px] md:h-[800px] -top-1/4 -left-1/3 opacity-25 md:opacity-30"
        gradientClass="bg-gradient-to-br from-rose-400/60 via-fuchsia-500/60 to-indigo-500/60 dark:from-rose-600/40 dark:via-fuchsia-700/40 dark:to-indigo-800/40"
        animateProps={{ x: [0, 70, -50, 0], y: [0, -60, 80, 0], scale: [1, 1.15, 0.9, 1], rotate: [0, 25, -20, 0] }}
      />
      <FloatingBlob
        className="w-[500px] h-[500px] md:w-[700px] md:h-[700px] -bottom-1/4 -right-1/4 opacity-25 md:opacity-30"
        gradientClass="bg-gradient-to-tr from-cyan-400/60 to-lime-300/60 dark:from-cyan-600/40 dark:to-lime-500/40"
        animateProps={{ x: [0, -80, 60, 0], y: [0, 70, -50, 0], scale: [1, 0.9, 1.15, 1], rotate: [0, -30, 15, 0] }}
        transitionProps={{ duration: 40 }}
      />

      <div className="flex justify-between items-center mb-6 md:mb-8">
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.back()} 
            className="rounded-full shadow-sm hover:shadow-md transition-all duration-200 ease-out
                       border-pink-500/70 text-pink-600 hover:bg-pink-500/10
                       dark:border-pink-400/70 dark:text-pink-400 dark:hover:bg-pink-400/10 px-5"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {isAdmin && (
          <Link href={`/admin/artworks?edit=${artwork.id}`}>
            <Button 
                variant="default" 
                size="sm" 
                className="rounded-full shadow-md hover:shadow-lg transition-all duration-200 ease-out
                           bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white px-5"
            >
              <Edit className="mr-2 h-4 w-4" /> Edit in Admin
            </Button>
          </Link>
        )}
      </div>
      
      {isAdmin && (artwork.is_active === false || artwork.artist?.is_active === false || isOutOfStock) && (
        <Alert variant="warning" className="mb-6 rounded-lg shadow-md bg-amber-400/10 dark:bg-yellow-600/20 border-amber-500/30 dark:border-yellow-500/40">
            <EyeOff className="h-5 w-5 text-amber-600 dark:text-yellow-400" />
            <AlertTitle className="font-serif text-amber-700 dark:text-yellow-300">Admin View: Artwork Status Notes</AlertTitle>
            <AlertDescription className="text-amber-600/90 dark:text-yellow-400/90">
              {artwork.is_active === false && <>Artwork status: <Badge variant="destructive" className="text-xs">INACTIVE</Badge>. </>}
              {artwork.artist?.is_active === false && <>Artist status: <Badge variant="destructive" className="text-xs">INACTIVE</Badge>. </>}
              {isOutOfStock && artwork.is_active && <Badge variant="outline" className="border-orange-500 text-orange-600 text-xs">OUT OF STOCK</Badge>}
              <br/>
              If artwork or artist is inactive, it's hidden from public. Inactive artworks must have 0 stock.
            </AlertDescription>
        </Alert>
      )}
       {isAdmin && artwork.is_active === true && artwork.artist?.is_active === true && !isOutOfStock && (
        <Alert variant="default" className="mb-6 bg-sky-500/10 border-sky-500/30 text-sky-700 
                                           dark:bg-sky-800/20 dark:border-sky-700/40 dark:text-sky-300 
                                           rounded-lg shadow-md [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 
                                           [&>svg]:top-4 [&>svg]:text-sky-600 dark:[&>svg]:text-sky-400">
            <InfoIcon className="h-5 w-5" />
            <AlertTitle className="font-serif">Admin View: Active & Visible Artwork</AlertTitle>
            <AlertDescription>This artwork and its artist are active, and it is in stock. It is visible and purchaseable by public users.</AlertDescription>
        </Alert>
      )}


      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        <motion.div 
            variants={imageVariants}
            className="w-full bg-card/70 dark:bg-neutral-800/60 backdrop-blur-sm 
                       rounded-xl overflow-hidden border border-pink-500/10 dark:border-pink-400/10 
                       shadow-2xl shadow-fuchsia-500/20 dark:shadow-fuchsia-400/15
                       hover:shadow-fuchsia-500/30 dark:hover:shadow-fuchsia-400/25 transition-shadow duration-300"
        >
          <AspectRatio ratio={1 / 1}>
            <Image
              src={artwork.image_url || placeholderImage}
              alt={artwork.name}
              fill
              className="object-cover transition-transform duration-500 ease-in-out hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.srcset = placeholderImage;
                target.src = placeholderImage;
              }}
            />
             {!artwork.image_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 dark:bg-neutral-700/50">
                    <ImageOff className="h-24 w-24 text-foreground/20 dark:text-neutral-500/70" />
                </div>
            )}
          </AspectRatio>
        </motion.div>

        <motion.div variants={contentVariants} className="space-y-6 md:space-y-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold font-serif tracking-tight mb-2
                           text-transparent bg-clip-text bg-gradient-to-br 
                           from-rose-500 via-fuchsia-600 to-indigo-600
                           dark:from-rose-400 dark:via-fuchsia-400 dark:to-indigo-500">
              {artwork.name}
            </h1>
            <Link 
                href={`/artists/${artwork.artist.id}`} 
                className="text-lg text-muted-foreground hover:text-pink-500 dark:text-neutral-400 dark:hover:text-pink-400 transition-colors duration-200 font-medium"
            >
              By {artwork.artist.name}
            </Link>
          </div>
          
          <div className="flex items-center space-x-3">
            <DollarSign className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
            <p className="text-3xl font-bold font-serif text-emerald-600 dark:text-emerald-400">
                {formatPrice(artwork.price)}
            </p>
          </div>
          
          <div className="flex items-center space-x-2.5">
              {isOutOfStock ? 
                <PackageX className="h-5 w-5 text-red-500 dark:text-red-400" /> : 
                <PackageCheck className="h-5 w-5 text-green-500 dark:text-green-400" />
              }
              <p className={cn("text-sm font-medium", 
                  isOutOfStock ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                  {isOutOfStock ? "Out of Stock" : 
                   (artwork.stock_quantity < 5 ? `Only ${artwork.stock_quantity} left in stock!` : `In Stock (${artwork.stock_quantity} available)`)
                  }
              </p>
          </div>
          
          {!isAdmin && !artwork.is_active && (
              <Badge variant="destructive" className="text-xs py-1 px-2.5">Currently Unavailable</Badge>
          )}
          {!isAdmin && artwork.artist && !artwork.artist.is_active && (
              <Badge variant="destructive" className="text-xs py-1 px-2.5">Artist Currently Unavailable</Badge>
          )}

          <Separator className="my-6 h-[1.5px] bg-gradient-to-r from-transparent via-pink-500/30 dark:via-pink-400/30 to-transparent" />

          <div>
            <h2 className="text-2xl font-semibold mb-3 font-serif
                           text-transparent bg-clip-text bg-gradient-to-r 
                           from-fuchsia-600 to-purple-600 dark:from-fuchsia-400 dark:to-purple-400">
                <Palette className="inline-block mr-2.5 h-6 w-6 -mt-1 text-fuchsia-500 dark:text-fuchsia-400"/>
                Artwork Description
            </h2>
            <p className="text-muted-foreground dark:text-neutral-300/90 leading-relaxed text-base">
              {artwork.description || "No description provided for this exquisite piece."}
            </p>
          </div>

          <Separator className="my-6 h-[1.5px] bg-gradient-to-r from-transparent via-sky-500/30 dark:via-sky-400/30 to-transparent" />
          
          {!isAdmin && isPubliclyVisibleAndPurchaseable && ( 
            <div className="space-y-4 pt-2">
              {!isOutOfStock ? (
                <Button
                  size="lg"
                  className={cn(
                    "w-full md:w-auto rounded-full shadow-xl hover:shadow-pink-500/40 dark:hover:shadow-pink-400/30",
                    "text-lg font-semibold px-10 py-6 transition-all duration-300 ease-out transform hover:scale-105 active:scale-95",
                    "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-pink-300/50 dark:focus-visible:ring-offset-pink-800/50 focus-visible:ring-pink-500",
                    isAddingToCart || isInCart ? 
                      (isInCart ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700" 
                                : "bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 text-white opacity-80") :
                      "bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 hover:from-purple-700 hover:via-pink-600 hover:to-rose-600 text-white"
                  )}
                  onClick={handleAddToCart}
                  disabled={authIsLoading || cartIsLoading || isAddingToCart || !!isInCart}
                >
                  {isAddingToCart ? (
                    <Loader2 className="mr-2.5 h-6 w-6 animate-spin" />
                  ) : isInCart ? (
                    <CheckCircle className="mr-2.5 h-6 w-6" />
                  ) : (
                    <ShoppingCart className="mr-2.5 h-6 w-6" />
                  )}
                  {isAddingToCart ? 'Adding...' : isInCart ? 'Added to Cart!' : 'Add to Collection'}
                </Button>
              ) : (
                <Button size="lg" className="w-full md:w-auto rounded-full text-lg font-semibold px-10 py-6
                                           bg-neutral-300 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed" disabled>
                   Out of Stock
                </Button>
              )}
            </div>
          )}
           {!isAdmin && !isPubliclyVisibleAndPurchaseable && ( 
             <p className="text-md text-amber-600 dark:text-yellow-500 font-semibold font-serif pt-2">
                 <InfoIcon className="inline-block mr-2 h-5 w-5 -mt-0.5"/>
                 This artwork is currently not available for purchase.
             </p>
           )}
        </motion.div>
      </div>
    </motion.div>
  );
  
}