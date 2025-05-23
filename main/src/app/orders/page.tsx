// === app/orders/page.tsx ===
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Order as OrderType, OrderItem as OrderItemType } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/utils';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ListOrdered, Package, ShoppingBag, Loader2, ArrowLeft, ImageOff, Terminal } from 'lucide-react';
import { useRouter } from 'next/navigation';

function OrderItemCard({ item }: { item: OrderItemType }) {
  const placeholderImage = "/placeholder-image.svg";
  return (
    <div className="flex items-center space-x-4 py-3">
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
        <Image
          src={item.artwork.image_url || placeholderImage}
          alt={item.artwork.name}
          fill
          sizes="64px"
          className="object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).srcset = placeholderImage;
            (e.target as HTMLImageElement).src = placeholderImage;
          }}
        />
        {!item.artwork.image_url && <ImageOff className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" />}
      </div>
      <div className="flex-1 space-y-1">
        <h4 className="font-medium hover:underline text-sm">{item.artwork.name}</h4>
        <p className="text-xs text-muted-foreground">By {item.artwork.artist.name}</p>
        <p className="text-xs text-muted-foreground">
          Qty: {item.quantity} @ {formatPrice(item.price_at_purchase)}
        </p>
      </div>
      <div className="font-medium text-sm">{formatPrice(parseFloat(item.price_at_purchase) * item.quantity)}</div>
    </div>
  );
}

function OrderCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-8 w-1/4" />
      </CardFooter>
    </Card>
  );
}


export default function OrdersPage() {
  const { isAuthenticated, isLoading: authIsLoading, user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authIsLoading) return;

    if (!isAuthenticated) {
      router.replace('/login?redirect=/orders');
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedOrders = await apiClient.get<OrderType[]>('/orders/', { needsAuth: true });
        setOrders(fetchedOrders || []);
      } catch (err: any) {
        console.error("Failed to fetch orders:", err);
        setError(err.message || "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, authIsLoading, router]);

  if (authIsLoading || (isLoading && orders.length === 0 && !error)) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-8 font-serif">My Orders</h1>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <OrderCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated && !authIsLoading) {
      // This case should ideally be handled by the redirect, but as a fallback:
      return (
        <div className="text-center py-10">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">Please log in to view your orders.</p>
          <Button asChild className="mt-4">
            <Link href="/login?redirect=/orders">Log In</Link>
          </Button>
        </div>
      );
  }


  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-serif flex items-center">
            <ListOrdered className="mr-3 h-8 w-8 text-primary" /> My Orders
        </h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Orders</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && orders.length === 0 && !error && ( // Show skeletons if loading and no orders yet
         <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (<OrderCardSkeleton key={index} />))}
         </div>
      )}


      {!isLoading && !error && orders.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
          <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Orders Yet</h2>
          <p className="text-muted-foreground mb-6">
            You haven't placed any orders. Start exploring our artwork!
          </p>
          <Button asChild>
            <Link href="/artworks">Explore Artwork</Link>
          </Button>
        </div>
      )}

      {orders.length > 0 && (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {orders.map((order) => (
            <AccordionItem value={order.id} key={order.id} className="bg-card border rounded-lg shadow-sm">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex flex-col md:flex-row justify-between md:items-center w-full">
                    <div className="text-left">
                        <span className="font-medium text-primary">Order ID: {order.id.substring(0,8)}...</span>
                        <p className="text-xs text-muted-foreground mt-1">
                            Placed on: {new Date(order.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mt-2 md:mt-0">
                         <Badge variant={
                            order.status === 'paid' || order.status === 'delivered' ? 'default' :
                            order.status === 'pending' ? 'secondary' :
                            order.status === 'shipped' ? 'outline' : // Needs custom color or use default
                            'destructive'
                         } className="capitalize mb-1 md:mb-0 w-fit md:w-auto">
                            {order.status}
                         </Badge>
                        <span className="font-semibold text-sm md:text-base">{formatPrice(order.total_price)}</span>
                    </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 pt-0">
                <Separator className="mb-4" />
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Items in this order:</h3>
                <div className="space-y-2 divide-y">
                  {order.items.map((item) => (
                    <OrderItemCard key={item.id} item={item} />
                  ))}
                </div>
                {order.shipping_address && (
                    <>
                        <Separator className="my-4" />
                        <div className="text-xs text-muted-foreground">
                            <p><strong>Shipping Address:</strong> {order.shipping_address}</p>
                            {order.payment_gateway_ref && <p><strong>M-Pesa Ref:</strong> {order.payment_gateway_ref}</p>}
                        </div>
                    </>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}