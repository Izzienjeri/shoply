'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Order as OrderType, OrderItem as OrderItemType, ApiErrorResponse } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice, cn } from '@/lib/utils';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, ShoppingBag, Loader2, ImageOff, Terminal, Truck, Info, CheckCircle, CircleAlert, Clock } from 'lucide-react';

function OrderItemDetailRow({ item }: { item: OrderItemType }) {
  const placeholderImage = "/placeholder-image.svg";
  return (
    <div className="flex items-start space-x-4 py-4 border-b last:border-b-0 border-border/70">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
        <Image
          src={item.artwork.image_url || placeholderImage}
          alt={item.artwork.name}
          fill
          sizes="80px"
          className="object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).srcset = placeholderImage;
            (e.target as HTMLImageElement).src = placeholderImage;
          }}
        />
        {!item.artwork.image_url && <ImageOff className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground" />}
      </div>
      <div className="flex-1 space-y-1">
        <Link href={`/artworks/${item.artwork.id}`} className="font-semibold hover:underline text-base hover:text-primary">
          {item.artwork.name}
        </Link>
        <p className="text-sm text-muted-foreground">By {item.artwork.artist.name}</p>
        <p className="text-sm text-muted-foreground">
          Quantity: {item.quantity}
        </p>
         <p className="text-sm text-muted-foreground">
          Price per item: {formatPrice(item.price_at_purchase)}
        </p>
      </div>
      <div className="font-semibold text-base">{formatPrice(parseFloat(item.price_at_purchase) * item.quantity)}</div>
    </div>
  );
}

function OrderDetailPageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      <Skeleton className="h-8 w-40 mb-6 rounded-md" />
      <Card className="rounded-xl">
        <CardHeader>
          <Skeleton className="h-7 w-1/2 mb-2" />
          <Skeleton className="h-5 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-5 w-3/4" /> <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-3/4" /> <Skeleton className="h-5 w-1/2" />
          </div>
          <Separator />
          <div>
            <Skeleton className="h-6 w-1/4 mb-3" />
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="flex items-start space-x-4 py-3 border-b border-border/70">
                  <Skeleton className="h-20 w-20 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </div>
          <Separator />
           <div>
            <Skeleton className="h-6 w-1/3 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-8 w-1/3" />
        </CardFooter>
      </Card>
    </div>
  );
}


export default function UserOrderDetailPage() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authIsLoading) return;

    if (!isAuthenticated) {
      router.replace(`/login?redirect=/orders/${orderId}`);
      return;
    }

    if (orderId) {
      const fetchOrderDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedOrder = await apiClient.get<OrderType>(`/api/orders/${orderId}`, { needsAuth: true });
          if (fetchedOrder) {
            setOrder(fetchedOrder);
          } else {
            setError("Order not found.");
          }
        } catch (err: any) {
          console.error("Failed to fetch order details:", err);
          if (err.message && (err.message.includes('404') || err.message.toLowerCase().includes('not found'))) {
            setError("Order not found or you do not have permission to view it.");
          } else {
            setError((err as ApiErrorResponse).message || "An unknown error occurred");
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchOrderDetails();
    } else {
        setError("No order ID provided.");
        setIsLoading(false);
    }
  }, [isAuthenticated, authIsLoading, router, orderId]);

  const getStatusIcon = (status: OrderType['status']) => {
    switch(status) {
        case 'paid': return <CheckCircle className="h-5 w-5 text-green-600" />;
        case 'shipped': return <Truck className="h-5 w-5 text-blue-600" />;
        case 'delivered': return <Package className="h-5 w-5 text-green-700" />;
        case 'picked_up': return <Package className="h-5 w-5 text-green-700" />;
        case 'cancelled': return <CircleAlert className="h-5 w-5 text-red-600" />;
        case 'pending':
        default: return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  }


  if (authIsLoading || isLoading) {
    return <OrderDetailPageSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <Button variant="outline" size="sm" onClick={() => router.push('/orders')} className="mb-6 rounded-md">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Orders
        </Button>
        <Alert variant="destructive" className="rounded-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="font-serif">Error Loading Order</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!order) {
    return (
       <div className="max-w-3xl mx-auto py-8">
        <Button variant="outline" size="sm" onClick={() => router.push('/orders')} className="mb-6 rounded-md">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Orders
        </Button>
        <Alert className="rounded-lg">
          <Info className="h-4 w-4" />
          <AlertTitle className="font-serif">Order Not Found</AlertTitle>
          <AlertDescription>The requested order could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => router.push('/orders')} className="mb-6 rounded-md">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Orders
      </Button>

      <Card className="shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-2xl font-serif text-primary">Order Details</CardTitle>
          <CardDescription>Order ID: {order.id}</CardDescription>
          <p className="text-xs text-muted-foreground pt-1">Placed on: {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at {new Date(order.created_at).toLocaleTimeString()}</p>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center space-x-2">
            {getStatusIcon(order.status)}
            <span className="font-medium text-lg capitalize">{order.status.replace('_', ' ')}</span>
          </div>

          {order.payment_gateway_ref && (
            <p className="text-sm"><strong>M-Pesa Confirmation:</strong> {order.payment_gateway_ref}</p>
          )}

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3 font-serif">Items Ordered ({order.items.length})</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <OrderItemDetailRow key={item.id} item={item} />
              ))}
            </div>
          </div>

          <Separator />
          
          <div>
            <h3 className="font-semibold text-lg mb-3 font-serif">Delivery Information</h3>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p><strong>Method:</strong> {order.delivery_option_details?.name || 'N/A'}</p>
              {order.delivery_option_details?.description && <p>{order.delivery_option_details.description}</p>}
              {order.delivery_fee && parseFloat(order.delivery_fee) > 0 && (
                <p><strong>Fee:</strong> {formatPrice(order.delivery_fee)}</p>
              )}
              <p><strong>Shipping Address:</strong> {order.shipping_address || 'N/A'}</p>
              {order.is_pickup_order && order.status === 'picked_up' && (
                <>
                  <p className="mt-2"><strong>Picked Up By:</strong> {order.picked_up_by_name || 'N/A'}</p>
                  <p><strong>Picker's ID:</strong> {order.picked_up_by_id_no || 'N/A'}</p>
                  <p><strong>Picked Up At:</strong> {order.picked_up_at ? new Date(order.picked_up_at).toLocaleString() : 'N/A'}</p>
                </>
              )}
            </div>
          </div>
          
          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal (Items)</span>
              <span>{formatPrice( (parseFloat(order.total_price) - parseFloat(order.delivery_fee || '0')).toFixed(2) )}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{formatPrice(order.delivery_fee || '0')}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t mt-2 border-border/70">
              <span>Grand Total</span>
              <span>{formatPrice(order.total_price)}</span>
            </div>
          </div>

        </CardContent>
        <CardFooter className="bg-muted/50 py-4">
           <p className="text-xs text-muted-foreground">Thank you for your order! If you have any questions, please contact support.</p>
        </CardFooter>
      </Card>
    </div>
  );
}