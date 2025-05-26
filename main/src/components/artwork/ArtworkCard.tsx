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
import { ImageOff, ShoppingCartIcon, DollarSign, EyeOff, Package as PackageIcon } from 'lucide-react';
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
    initial: { opacity: 0, y: 30, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
    hover: { 
      y: -4,
      boxShadow: "0 10px 20px -5px oklch(var(--primary-raw) / 0.12), 0 6px 10px -6px oklch(var(--primary-raw) / 0.1)",
      transition: { type: "spring", stiffness: 300, damping: 20, duration: 0.2 }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={isPubliclyAvailableForPurchase || isAdmin ? "hover" : undefined}
      className="h-full flex flex-col"
    >
      <Card className="overflow-hidden flex flex-col h-full group border-border/60 shadow-lg rounded-xl transition-all duration-300 ease-out hover:border-primary/30">
        <CardHeader className="p-0 border-b border-border/60 relative">
          <Link 
            href={`/artworks/${artwork.id}`}
            className={cn(
              "block cursor-pointer group-hover:opacity-90 transition-opacity duration-200",
              !isPubliclyAvailableForPurchase && !isAdmin && "opacity-50 pointer-events-none"
            )}
          >
            <AspectRatio ratio={1 / 1} className="bg-muted overflow-hidden rounded-t-xl">
              <Image
                src={artwork.image_url || placeholderImage}
                alt={artwork.name}
                fill
                className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={isPriority || false}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.srcset = placeholderImage;
                  target.src = placeholderImage;
                }}
              />
              {!artwork.image_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
                  <ImageOff className="h-16 w-16 text-foreground/30" />
                </div>
              )}
              {!isAdmin && !isPubliclyAvailableForPurchase && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-t-xl">
                  <Badge variant="destructive" className="opacity-90 text-xs">Unavailable</Badge>
                </div>
              )}
            </AspectRatio>
          </Link>
          {isAdmin && (
            <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end space-y-1.5">
              {artwork.is_active === false && <Badge variant={'destructive'} className="text-xs shadow">Artwork Inactive</Badge>}
              {artwork.artist?.is_active === false && <Badge variant={'destructive'} className="text-xs opacity-80 shadow">Artist Inactive</Badge>}
              {isOutOfStock && artwork.is_active === true && <Badge variant={'outline'} className="text-xs border-orange-500 text-orange-600 bg-card shadow">Out of Stock</Badge>}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 flex-grow space-y-1.5">
          <Link 
            href={`/artworks/${artwork.id}`}
            className={cn("block", !isPubliclyAvailableForPurchase && !isAdmin && "pointer-events-none")}
          >
            <CardTitle className={cn(
              "text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-0.5 font-serif",
              !isPubliclyAvailableForPurchase && !isAdmin && "text-muted-foreground"
            )}>
              {artwork.name}
            </CardTitle>
          </Link>
          <Link 
            href={`/artists/${artwork.artist.id}`}
            className="text-sm text-muted-foreground hover:text-primary transition-colors block"
          >
            By {artwork.artist.name}
          </Link>
          
          {isAdmin ? (
            <div className="mt-2.5 text-xs space-y-1 text-muted-foreground">
              <div className="flex items-center">
                <DollarSign className="h-3.5 w-3.5 mr-1.5 text-primary/80" /> Price: {formatPrice(artwork.price)}
              </div>
              <div className="flex items-center">
                <PackageIcon className="h-3.5 w-3.5 mr-1.5 text-primary/80" /> Stock: {artwork.stock_quantity}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/90 mt-2 line-clamp-3 h-[calc(1.25rem*3)] leading-relaxed">
              {artwork.description || "A captivating piece by the artist."}
            </p>
          )}
        </CardContent>
        {!isAdmin && (
          <CardFooter className="p-4 pt-2 flex justify-between items-center mt-auto">
            <span className="text-xl font-bold text-primary">
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
              className="transition-all duration-150 ease-out hover:scale-105 active:scale-95 shadow-sm hover:shadow-md rounded-md"
            >
              {!isPubliclyAvailableForPurchase ? (
                <> <EyeOff className="mr-1.5 h-4 w-4" /> Unavailable</>
              ) : isOutOfStock ? (
                'Out of Stock'
              ) : isInCart ? (
                'In Cart'
              ) : (
                <>
                  <ShoppingCartIcon className="mr-1.5 h-4 w-4" /> Add to Cart
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
    <Card className="overflow-hidden flex flex-col h-full rounded-xl border-border/60 shadow-lg">
      <AspectRatio ratio={1 / 1} className="bg-muted/70 animate-pulse rounded-t-xl" />
      <CardContent className="p-4 flex-grow space-y-2">
        <Skeleton className="h-5 w-4/5 bg-muted/70 rounded" />
        <Skeleton className="h-4 w-1/2 bg-muted/70 rounded" />
        <Skeleton className="h-4 w-full bg-muted/60 rounded mt-2" />
        <Skeleton className="h-4 w-full bg-muted/60 rounded" />
        <Skeleton className="h-4 w-3/4 bg-muted/60 rounded" />
      </CardContent>
      <CardFooter className="p-4 pt-2 flex justify-between items-center mt-auto">
        <Skeleton className="h-7 w-1/3 bg-muted/70 rounded" />
        <Skeleton className="h-9 w-28 bg-muted/70 rounded-md" />
      </CardFooter>
    </Card>
  );
}