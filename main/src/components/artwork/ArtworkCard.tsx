// === components/artwork/ArtworkCard.tsx ===
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Artwork } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils'; // Use the global formatPrice
import { ImageOff, ShoppingCartIcon } from 'lucide-react'; // For Add to cart icon

interface ArtworkCardProps {
  artwork: Artwork;
}

export function ArtworkCard({ artwork }: ArtworkCardProps) {
  const { addToCart, isLoading: isCartLoading, cart } = useCart();
  const placeholderImage = "/placeholder-image.svg";

  const handleAddToCart = async () => {
    try {
      await addToCart(artwork.id, 1);
      // Toast is handled in CartContext or could be here too
    } catch (error) {
      // Error already handled and toasted by CartContext
      console.error("Add to cart failed from ArtworkCard (already handled in context):", error);
    }
  };

  const isInCart = cart?.items.some(item => item.artwork_id === artwork.id);

  return (
    <Card className="overflow-hidden flex flex-col h-full group border shadow-sm hover:shadow-lg transition-shadow duration-300">
       <CardHeader className="p-0 border-b">
         <Link href={`/artworks/${artwork.id}`} legacyBehavior>
           <a className="block">
             <AspectRatio ratio={1 / 1} className="bg-muted overflow-hidden">
               <Image
                 src={artwork.image_url || placeholderImage}
                 alt={artwork.name}
                 fill
                 className="object-cover transition-transform duration-300 group-hover:scale-105"
                 sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                 priority={false} // Set to true for LCP images if applicable
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
             </AspectRatio>
           </a>
         </Link>
       </CardHeader>
       <CardContent className="p-4 flex-grow">
         <Link href={`/artworks/${artwork.id}`} legacyBehavior>
           <a className="block">
             <CardTitle className="text-lg font-medium hover:text-primary transition-colors line-clamp-2 mb-1">
               {artwork.name}
             </CardTitle>
           </a>
         </Link>
         <Link href={`/artists/${artwork.artist.id}`} legacyBehavior>
           <a className="text-sm text-muted-foreground hover:text-primary transition-colors">
             {artwork.artist.name}
           </a>
         </Link>
         <p className="text-sm text-muted-foreground mt-2 line-clamp-3 h-[3.75rem]"> {/* Fixed height for 3 lines */}
            {artwork.description || "No description available."}
         </p>
       </CardContent>
       <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto"> {/* mt-auto to push footer down */}
         <span className="text-lg font-semibold text-primary">
           {formatPrice(artwork.price)}
         </span>
         <Button
            size="sm"
            variant={artwork.stock_quantity === 0 ? "outline" : "default"}
            onClick={handleAddToCart}
            disabled={isCartLoading || artwork.stock_quantity === 0 || isInCart}
            aria-label={artwork.stock_quantity === 0 ? 'Out of Stock' : isInCart ? 'Already in Cart' : 'Add to Cart'}
         >
            {artwork.stock_quantity === 0 ? (
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
    </Card>
  );
}

export function ArtworkCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <AspectRatio ratio={1 / 1} className="bg-muted animate-pulse" />
      <CardContent className="p-4 flex-grow">
        <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2"></div> {/* Title */}
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse mb-3"></div> {/* Artist */}
        <div className="h-4 w-full bg-muted rounded animate-pulse mb-1"></div> {/* Desc line 1 */}
        <div className="h-4 w-full bg-muted rounded animate-pulse mb-1"></div> {/* Desc line 2 */}
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse"></div>      {/* Desc line 3 */}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto">
        <div className="h-6 w-1/3 bg-muted rounded animate-pulse"></div> {/* Price */}
        <div className="h-9 w-28 bg-muted rounded animate-pulse"></div> {/* Button */}
      </CardFooter>
    </Card>
  );
}