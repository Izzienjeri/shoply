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
import { ImageOff, ShoppingCartIcon, Edit, DollarSign, PackageCheck, PackageX, EyeOff } from 'lucide-react';

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
  const isActuallyAvailable = artwork.is_active && artwork.artist?.is_active;

  return (
    <Card className="overflow-hidden flex flex-col h-full group border shadow-sm hover:shadow-lg transition-shadow duration-300">
       <CardHeader className="p-0 border-b relative">
         <Link href={`/artworks/${artwork.id}`} className="block" legacyBehavior>
           <a className={cn(!isActuallyAvailable && "opacity-60 group-hover:opacity-80 transition-opacity")}>
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
              {!isAdmin && !isActuallyAvailable && (
                 <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                     <Badge variant="destructive">Unavailable</Badge>
                 </div>
              )}
           </AspectRatio>
           </a>
         </Link>
         {isAdmin && (
            <div className="absolute top-2 right-2 z-10 space-y-1">
             {!artwork.is_active && <Badge variant={'destructive'} className="block">Artwork Inactive</Badge>}
             {artwork.artist && !artwork.artist.is_active && <Badge variant={'destructive'} className="block opacity-80">Artist Inactive</Badge>}
            </div>
         )}
       </CardHeader>
       <CardContent className="p-4 flex-grow">
         <Link href={`/artworks/${artwork.id}`} className="block" legacyBehavior>
           <a className={cn("block", !isActuallyAvailable && "pointer-events-none")}>
           <CardTitle className={cn("text-lg font-medium hover:text-primary transition-colors line-clamp-2 mb-1", !isActuallyAvailable && "text-muted-foreground")}>
             {artwork.name}
           </CardTitle>
           </a>
         </Link>
         <Link href={`/artists/${artwork.artist.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
           {artwork.artist.name}
         </Link>
         {isAdmin ? (
            <div className="mt-2 text-xs space-y-1">
                <div className="flex items-center text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Price: {formatPrice(artwork.price)}
                </div>
                <div className="flex items-center text-muted-foreground">
                    {artwork.stock_quantity > 0 ? <PackageCheck className="h-3.5 w-3.5 mr-1.5 text-green-600" /> : <PackageX className="h-3.5 w-3.5 mr-1.5 text-red-600" />}
                     Stock: {artwork.stock_quantity}
                </div>
            </div>
         ) : (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3 h-[3.75rem]">
                {artwork.description || "No description available."}
            </p>
         )}
       </CardContent>
       <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto">
        {!isAdmin && (
            <span className="text-lg font-semibold text-primary">
             {formatPrice(artwork.price)}
            </span>
        )}
         {isAdmin ? (
           <Link href={`/admin/artworks?edit=${artwork.id}`} className="w-full" legacyBehavior>
             <Button size="sm" variant="outline" className="w-full">
               <Edit className="mr-2 h-4 w-4" /> Edit Artwork
             </Button>
           </Link>
         ) : (
           <Button
              size="sm"
              variant={(artwork.stock_quantity === 0 || !isActuallyAvailable) ? "outline" : "default"}
              onClick={handleAddToCart}
              disabled={authIsLoading || isCartLoading || artwork.stock_quantity === 0 || isInCart || !isActuallyAvailable}
              aria-label={!isActuallyAvailable ? 'Unavailable' : artwork.stock_quantity === 0 ? 'Out of Stock' : isInCart ? 'Already in Cart' : 'Add to Cart'}
           >
              {!isActuallyAvailable ? (
                 <> <EyeOff className="mr-2 h-4 w-4" /> Unavailable</>
              ) : artwork.stock_quantity === 0 ? (
                  'Out of Stock'
              ) : isInCart ? (
                  'In Cart'
              ) : (
                  <>
                      <ShoppingCartIcon className="mr-2 h-4 w-4" /> Add to Cart
                  </>
              )}
           </Button>
         )}
       </CardFooter>
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