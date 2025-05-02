import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface ProductCardProps {
  product: Product;
}

const formatPrice = (priceString: string): string => {
  const price = parseFloat(priceString);
  if (isNaN(price)) return 'N/A';
  return `Ksh ${price.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProductCard({ product }: ProductCardProps) {
  const placeholderImage = "/placeholder-image.svg";

  return (
    <Card className="overflow-hidden flex flex-col h-full">
       <CardHeader className="p-0">
         <AspectRatio ratio={1 / 1} className="bg-muted">
           <Link href={`/products/${product.id}`}>
             <Image

               src={product.image_url || placeholderImage}
               alt={product.name}
               fill
               className="object-cover transition-transform duration-300 hover:scale-105"
               sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
               priority={false}
               onError={(e) => {
                  (e.target as HTMLImageElement).srcset = placeholderImage;
                  (e.target as HTMLImageElement).src = placeholderImage;
               }}
             />
           </Link>
         </AspectRatio>
       </CardHeader>
       <CardContent className="p-4 flex-grow">
         <Link href={`/products/${product.id}`}>
           <CardTitle className="text-lg font-medium hover:text-primary transition-colors line-clamp-2">
             {product.name}
           </CardTitle>
         </Link>
         <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{product.description}</p>
       </CardContent>
       <CardFooter className="p-4 pt-0 flex justify-between items-center">
         <span className="text-lg font-semibold text-primary">
           {formatPrice(product.price)}
         </span>
         <Link href={`/products/${product.id}`}>
           <Button size="sm" variant="outline">View</Button>
         </Link>

         <Button size="sm">Add to Cart</Button>
       </CardFooter>
    </Card>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <AspectRatio ratio={1 / 1} className="bg-muted animate-pulse" />
      <CardContent className="p-4">
        <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2"></div>
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="h-6 w-1/3 bg-muted rounded animate-pulse"></div>
        <div className="h-9 w-1/4 bg-muted rounded animate-pulse"></div>
      </CardFooter>
    </Card>
  )
}