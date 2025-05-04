import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Artwork } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface ArtworkCardProps {
  artwork: Artwork;
}

const formatPrice = (priceString: string): string => {
  const price = parseFloat(priceString);
  if (isNaN(price)) return 'N/A';
  return `Ksh ${price.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ArtworkCard({ artwork }: ArtworkCardProps) {
  const { addToCart, isLoading } = useCart();
  const placeholderImage = "/placeholder-image.svg";

  const handleAddToCart = async () => {
    try {
      await addToCart(artwork.id, 1);
    } catch (error) {
      console.error("Add to cart failed (handled in context):", error)
    }
  };

  return (
    <Card className="overflow-hidden flex flex-col h-full group">
       <CardHeader className="p-0">
         <Link href={`/artworks/${artwork.id}`}>
           <AspectRatio ratio={1 / 1} className="bg-muted overflow-hidden">
             <Image
               src={artwork.image_url || placeholderImage}
               alt={artwork.name}
               fill
               className="object-cover transition-transform duration-300 group-hover:scale-105"
               sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
               priority={false}
               onError={(e) => {
                  (e.target as HTMLImageElement).srcset = placeholderImage;
                  (e.target as HTMLImageElement).src = placeholderImage;
               }}
             />
           </AspectRatio>
         </Link>
       </CardHeader>
       <CardContent className="p-4 flex-grow">
         <Link href={`/artworks/${artwork.id}`}>
           <CardTitle className="text-lg font-medium hover:text-primary transition-colors line-clamp-2">
             {artwork.name}
           </CardTitle>
         </Link>
         <Link href={`/artists/${artwork.artist.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
             {artwork.artist.name}
         </Link>
         <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{artwork.description}</p>
       </CardContent>
       <CardFooter className="p-4 pt-0 flex justify-between items-center">
         <span className="text-lg font-semibold text-primary">
           {formatPrice(artwork.price)}
         </span>
         <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={isLoading || artwork.stock_quantity === 0}
         >
            {artwork.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
         </Button>
       </CardFooter>
    </Card>
  );
}

export function ArtworkCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <AspectRatio ratio={1 / 1} className="bg-muted animate-pulse" />
      <CardContent className="p-4">
        <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-1"></div>
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse mb-2"></div>
        <div className="h-4 w-full bg-muted rounded animate-pulse mb-1"></div>
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse"></div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="h-6 w-1/3 bg-muted rounded animate-pulse"></div>
        <div className="h-9 w-1/4 bg-muted rounded animate-pulse"></div>
      </CardFooter>
    </Card>
  )
}