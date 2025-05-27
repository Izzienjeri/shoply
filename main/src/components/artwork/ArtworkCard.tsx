import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Artwork } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ImageOff, ShoppingCartIcon, DollarSign, EyeOff, Package as PackageIcon, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from "@/components/ui/skeleton";

interface ArtworkCardProps {
  artwork: Artwork;
  isPriority?: boolean;
}

export function ArtworkCard({ artwork, isPriority }: ArtworkCardProps) {
  const { addToCart, isLoading: isCartLoading, cart } = useCart();
  const { isAdmin, isLoading: authIsLoading } = useAuth();
  const placeholderImage = "/placeholder-image.svg";

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isAdmin || !artwork.is_active || (artwork.artist && !artwork.artist.is_active)) return;
    try {
      await addToCart(artwork.id, 1);
    } catch (error) {
    }
  };

  const isInCart = !isAdmin && cart?.items.some(item => item.artwork_id === artwork.id);
  const isPubliclyAvailableForPurchase = artwork.is_active === true && artwork.artist?.is_active === true;
  const isOutOfStock = artwork.stock_quantity === 0;

  const cardVariants = {
    initial: { opacity: 0, y: 30, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
    hover: { 
      y: -5,
      boxShadow: "0 12px 28px -8px oklch(var(--primary-raw) / 0.15), 0 8px 12px -8px oklch(var(--primary-raw) / 0.12)",
      transition: { type: "spring", stiffness: 280, damping: 18, duration: 0.25 }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={isPubliclyAvailableForPurchase || isAdmin ? "hover" : undefined}
      className="h-full flex flex-col group" 
    >
      <Card className="overflow-hidden flex flex-col h-full border-transparent 
                     bg-card/80 dark:bg-neutral-800/70 backdrop-blur-sm
                     shadow-lg hover:shadow-xl 
                     rounded-xl transition-all duration-300 ease-out 
                     hover:border-pink-500/30 dark:hover:border-pink-400/30
                     relative group/card">
        
        <CardHeader className="p-0 border-b border-border/60 relative">
          <Link 
            href={`/artworks/${artwork.id}`}
            className={cn(
              "block cursor-pointer transition-opacity duration-200",
              !isPubliclyAvailableForPurchase && !isAdmin && "opacity-60 pointer-events-none"
            )}
          >
            <AspectRatio ratio={1 / 1} className="bg-muted/50 dark:bg-neutral-700/50 overflow-hidden rounded-t-xl">
              <Image
                src={artwork.image_url || placeholderImage}
                alt={artwork.name}
                fill
                className="object-cover transition-transform duration-350 ease-in-out group-hover/card:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={isPriority || false}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.srcset = placeholderImage;
                  target.src = placeholderImage;
                }}
              />
              {!artwork.image_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/60 dark:bg-neutral-800/60">
                  <ImageOff className="h-16 w-16 text-foreground/20 dark:text-neutral-500/80" />
                </div>
              )}
              {!isAdmin && !isPubliclyAvailableForPurchase && (
                <div className="absolute inset-0 bg-black/50 dark:bg-black/60 flex items-center justify-center rounded-t-xl backdrop-blur-sm">
                  <Badge variant="destructive" className="opacity-90 text-xs py-1 px-2.5">Unavailable</Badge>
                </div>
              )}
              <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 
                              bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </AspectRatio>
          </Link>
          {isAdmin && (
            <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end space-y-1.5">
              {artwork.is_active === false && <Badge variant={'destructive'} className="text-xs shadow-md">Artwork Inactive</Badge>}
              {artwork.artist?.is_active === false && <Badge variant={'destructive'} className="text-xs opacity-90 shadow-md">Artist Inactive</Badge>}
              {isOutOfStock && artwork.is_active === true && <Badge variant={'outline'} className="text-xs border-orange-500 text-orange-600 bg-card/80 shadow-md">Out of Stock</Badge>}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 flex-grow space-y-2">
          <Link 
            href={`/artworks/${artwork.id}`}
            className={cn("block", !isPubliclyAvailableForPurchase && !isAdmin && "pointer-events-none")}
          >
            <CardTitle className={cn(
              "text-lg font-semibold font-serif line-clamp-2 mb-1 tracking-tight",
              "text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 via-pink-500 to-rose-500 dark:from-fuchsia-400 dark:via-pink-400 dark:to-rose-400",
              "group-hover/card:bg-gradient-to-r group-hover/card:from-fuchsia-500 group-hover/card:via-pink-400 group-hover/card:to-purple-500",
              !isPubliclyAvailableForPurchase && !isAdmin && "text-muted-foreground opacity-70 !bg-none"
            )}>
              {artwork.name}
            </CardTitle>
          </Link>
          <Link 
            href={`/artists/${artwork.artist.id}`}
            className={cn(
                "text-sm text-muted-foreground/90 dark:text-neutral-400/90 hover:text-pink-600 dark:hover:text-pink-400 transition-colors block",
                !isPubliclyAvailableForPurchase && !isAdmin && "pointer-events-none"
            )}
          >
            By {artwork.artist.name}
          </Link>
          
          {isAdmin ? (
            <div className="mt-2.5 text-xs space-y-1 text-muted-foreground dark:text-neutral-400">
              <div className="flex items-center">
                <DollarSign className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" /> Price: {formatPrice(artwork.price)}
              </div>
              <div className="flex items-center">
                <PackageIcon className="h-3.5 w-3.5 mr-1.5 text-sky-600 dark:text-sky-400" /> Stock: {artwork.stock_quantity}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/80 dark:text-neutral-400/80 mt-1.5 line-clamp-2 h-[calc(1.25rem*2)] leading-relaxed">
              {artwork.description ? (artwork.description.length > 80 ? artwork.description.substring(0, 77) + "..." : artwork.description) : "A captivating piece by the artist."}
            </p>
          )}
        </CardContent>

        {!isAdmin && (
          <CardFooter className="p-4 pt-2 flex justify-between items-center mt-auto">
            <span className="text-xl font-bold font-serif
                             text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500
                             dark:from-emerald-400 dark:to-teal-300">
              {formatPrice(artwork.price)}
            </span>
            <Button
              size="sm"
              variant={
                (!isPubliclyAvailableForPurchase) ? "outline" : 
                (isOutOfStock) ? "secondary" : 
                "default" 
              }
              onClick={handleAddToCart}
              disabled={authIsLoading || isCartLoading || !isPubliclyAvailableForPurchase || isOutOfStock || !!isInCart}
              aria-label={!isPubliclyAvailableForPurchase ? 'Unavailable' : isOutOfStock ? 'Out of Stock' : isInCart ? 'In Cart' : 'Add to Cart'}
              className={cn(
                "transition-all duration-200 ease-out transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg rounded-md text-xs py-2 px-3.5",
                (isPubliclyAvailableForPurchase && !isOutOfStock && !isInCart) && 
                "bg-fuchsia-600 hover:bg-fuchsia-700 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600 text-white", 
                isInCart && "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700",
                !isPubliclyAvailableForPurchase && "border-muted-foreground/30 text-muted-foreground/70 cursor-not-allowed",
                isOutOfStock && "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
              )}
            >
              {!isPubliclyAvailableForPurchase ? (
                <> <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Unavailable</>
              ) : isOutOfStock ? (
                'Out of Stock'
              ) : isInCart ? (
                'In Cart'
              ) : (
                <>
                  <ShoppingCartIcon className="mr-1.5 h-3.5 w-3.5" /> Add to Cart
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}

export function ArtworkCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col h-full rounded-xl border-border/30 bg-card/50 dark:bg-neutral-800/50 shadow-lg">
      <AspectRatio ratio={1 / 1} className="bg-muted/70 dark:bg-neutral-700/70 animate-pulse rounded-t-xl" />
      <CardContent className="p-4 flex-grow space-y-2.5">
        <Skeleton className="h-5 w-4/5 bg-muted/70 dark:bg-neutral-700/70 rounded" />
        <Skeleton className="h-4 w-1/2 bg-muted/70 dark:bg-neutral-700/70 rounded" />
        <Skeleton className="h-4 w-full bg-muted/60 dark:bg-neutral-700/60 rounded mt-2" />
        <Skeleton className="h-4 w-full bg-muted/60 dark:bg-neutral-700/60 rounded" />
        <Skeleton className="h-4 w-3/4 bg-muted/60 dark:bg-neutral-700/60 rounded" />
      </CardContent>
      <CardFooter className="p-4 pt-2 flex justify-between items-center mt-auto">
        <Skeleton className="h-7 w-1/3 bg-muted/70 dark:bg-neutral-700/70 rounded" />
        <Skeleton className="h-9 w-28 bg-muted/70 dark:bg-neutral-700/70 rounded-md" />
      </CardFooter>
    </Card>
  );
}