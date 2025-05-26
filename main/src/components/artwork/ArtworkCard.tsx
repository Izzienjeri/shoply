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
import { ImageOff, ShoppingCartIcon, DollarSign, PackageCheck, PackageX, EyeOff, Package as PackageIcon } from 'lucide-react';

interface ArtworkCardProps {
  artwork: Artwork;
  isPriority?: boolean;
}

export function ArtworkCard({ artwork, isPriority }: ArtworkCardProps) {
  const { addToCart, isLoading: isCartLoading, cart } = useCart();
  const { isAdmin, isLoading: authIsLoading } = useAuth();
  const placeholderImage = "/placeholder-image.svg";

  const handleAddToCart = async () => {
    if (isAdmin || !artwork.is_active || (artwork.artist && !artwork.artist.is_active)) return;
    try {
      await addToCart(artwork.id, 1);
    } catch (error) {
    }
  };

  const isInCart = !isAdmin && cart?.items.some(item => item.artwork_id === artwork.id);
  const isPubliclyAvailableForPurchase = artwork.is_active === true && artwork.artist?.is_active === true;
  const isOutOfStock = artwork.stock_quantity === 0;

  return (
    <Card className="overflow-hidden flex flex-col h-full group border shadow-sm hover:shadow-lg transition-shadow duration-300">
       <CardHeader className="p-0 border-b relative">
         <Link href={`/artworks/${artwork.id}`}>
           <div className={cn("cursor-pointer",!isPubliclyAvailableForPurchase && "opacity-60 group-hover:opacity-80 transition-opacity")}>
           <AspectRatio ratio={1 / 1} className="bg-muted overflow-hidden">
             <Image
               src={artwork.image_url || placeholderImage}
               alt={artwork.name}
               fill
               className="object-cover transition-transform duration-300 group-hover:scale-105"
               sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
               priority={isPriority || false}
               onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.srcset = placeholderImage;
                  target.src = placeholderImage;
               }}
             />
             {!artwork.image_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <ImageOff className="h-12 w-12 text-gray-400" />
                </div>
              )}
              {!isAdmin && !isPubliclyAvailableForPurchase && (
                 <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                     <Badge variant="destructive">Unavailable</Badge>
                 </div>
              )}
           </AspectRatio>
           </div>
         </Link>
         {isAdmin && (
            <div className="absolute top-2 right-2 z-10 flex flex-col items-end space-y-1">
             {artwork.is_active === false && <Badge variant={'destructive'} className="text-xs">Artwork Inactive</Badge>}
             {artwork.artist?.is_active === false && <Badge variant={'destructive'} className="text-xs opacity-80">Artist Inactive</Badge>}
             {isOutOfStock && artwork.is_active === true && <Badge variant={'outline'} className="text-xs border-orange-500 text-orange-600">Out of Stock</Badge>}
            </div>
         )}
       </CardHeader>
       <CardContent className="p-4 flex-grow">
         <Link href={`/artworks/${artwork.id}`}>
           <div className={cn("cursor-pointer block", !isPubliclyAvailableForPurchase && "pointer-events-none")}>
           <CardTitle className={cn("text-lg font-medium hover:text-primary transition-colors line-clamp-2 mb-1", !isPubliclyAvailableForPurchase && "text-muted-foreground")}>
             {artwork.name}
           </CardTitle>
           </div>
         </Link>
         <Link href={`/artists/${artwork.artist.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
           By {artwork.artist.name}
         </Link>
         
         {isAdmin ? (
            <div className="mt-3 text-xs space-y-1.5 text-muted-foreground">
                <div className="flex items-center">
                    <DollarSign className="h-3.5 w-3.5 mr-1.5 text-primary/80" /> Price: {formatPrice(artwork.price)}
                </div>
                <div className="flex items-center">
                    <PackageIcon className="h-3.5 w-3.5 mr-1.5 text-primary/80" /> Stock: {artwork.stock_quantity}
                </div>
            </div>
         ) : (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3 h-[3.75rem]">
                {artwork.description || "No description available."}
            </p>
         )}
       </CardContent>
       {!isAdmin && (
         <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto">
           <span className="text-lg font-semibold text-primary">
             {formatPrice(artwork.price)}
           </span>
           <Button
              size="sm"
              variant={
                (!isPubliclyAvailableForPurchase) ? "outline" : 
                (isOutOfStock) ? "destructive" : 
                "default"
              }
              onClick={handleAddToCart}
              disabled={authIsLoading || isCartLoading || !isPubliclyAvailableForPurchase || isOutOfStock || !!isInCart}
              aria-label={!isPubliclyAvailableForPurchase ? 'Unavailable' : isOutOfStock ? 'Out of Stock' : isInCart ? 'Already in Cart' : 'Add to Cart'}
           >
              {!isPubliclyAvailableForPurchase ? (
                 <> <EyeOff className="mr-2 h-4 w-4" /> Unavailable</>
              ) : isOutOfStock ? (
                  'Out of Stock'
              ) : isInCart ? (
                  'In Cart'
              ) : (
                  <>
                      <ShoppingCartIcon className="mr-2 h-4 w-4" /> Add to Cart
                  </>
              )}
           </Button>
         </CardFooter>
       )}
    </Card>
  );
}

export function ArtworkCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <AspectRatio ratio={1 / 1} className="bg-muted animate-pulse" />
      <CardContent className="p-4 flex-grow">
        <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2"></div>
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse mb-3"></div>
        <div className="h-4 w-full bg-muted rounded animate-pulse mb-1"></div>
        <div className="h-4 w-full bg-muted rounded animate-pulse mb-1"></div>
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse"></div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto">
        <div className="h-6 w-1/3 bg-muted rounded animate-pulse"></div>
        <div className="h-9 w-28 bg-muted rounded animate-pulse"></div>
      </CardFooter>
    </Card>
  );
}