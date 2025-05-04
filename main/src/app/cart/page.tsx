'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/utils';
import { ApiErrorResponse, CartItem as CartItemType, StkPushInitiationResponse } from '@/lib/types';
import { apiClient } from '@/lib/api';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { ShoppingCart, Trash2, Minus, Plus, Loader2, ImageOff } from 'lucide-react';

const checkoutSchema = z.object({
  phoneNumber: z.string()
    .min(1, "Phone number is required")
    .length(12, "Phone number must be 12 digits")
    .startsWith("254", "Phone number must start with 254")
    .regex(/^[0-9]+$/, "Phone number must contain only digits"),
});
type CheckoutFormValues = z.infer<typeof checkoutSchema>;

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  isUpdating: boolean;
}

function CartItem({ item, onUpdateQuantity, onRemoveItem, isUpdating }: CartItemProps) {
  const [isQuantityUpdating, setIsQuantityUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || isQuantityUpdating || isUpdating) return;
    if (newQuantity > item.artwork.stock_quantity) {
        toast.error(`Only ${item.artwork.stock_quantity} items available for "${item.artwork.name}".`);
        return;
    }
    setIsQuantityUpdating(true);
    try {
      await onUpdateQuantity(item.id, newQuantity);
    } finally {
      setIsQuantityUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (isRemoving || isUpdating) return;
    setIsRemoving(true);
    try {
      await onRemoveItem(item.id);
    } finally {
      setIsRemoving(false);
    }
  };

  const placeholderImage = "/placeholder-image.svg";

  return (
    <div className="flex items-center space-x-4 py-4 border-b last:border-b-0">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
        <Image
          src={item.artwork.image_url || placeholderImage}
          alt={item.artwork.name}
          fill
          sizes="(max-width: 768px) 10vw, 80px"
          className="object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).srcset = placeholderImage;
            (e.target as HTMLImageElement).src = placeholderImage;
          }}
        />
         {!item.artwork.image_url && <ImageOff className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground" />}
      </div>

      <div className="flex-1 space-y-1">
        <Link href={`/artworks/${item.artwork.id}`} className="font-medium hover:underline">
          {item.artwork.name}
        </Link>
        <p className="text-sm text-muted-foreground">{item.artwork.artist.name}</p>
        <p className="text-sm font-medium">{formatPrice(item.artwork.price)}</p>
      </div>

      <div className="flex flex-col items-center space-y-1">
         <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={item.quantity <= 1 || isQuantityUpdating || isUpdating}
            >
              <Minus className="h-4 w-4" />
              <span className="sr-only">Decrease quantity</span>
            </Button>
            <span className="w-8 text-center text-sm font-medium">
                {isQuantityUpdating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isQuantityUpdating || isUpdating || item.quantity >= item.artwork.stock_quantity}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Increase quantity</span>
            </Button>
         </div>
        <p className="text-xs text-muted-foreground">
            {item.artwork.stock_quantity < 5 && item.artwork.stock_quantity > 0 ? `Only ${item.artwork.stock_quantity} left` : ''}
            {item.artwork.stock_quantity === 0 ? 'Out of stock' : ''}
        </p>
      </div>

      <div className="font-medium">{formatPrice(parseFloat(item.artwork.price) * item.quantity)}</div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
        disabled={isRemoving || isUpdating}
      >
        {isRemoving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
        <span className="sr-only">Remove item</span>
      </Button>
    </div>
  );
}

export default function CartPage() {
  const {
    cart,
    isLoading: cartIsLoading,
    itemCount,
    totalPrice,
    updateCartItem,
    removeFromCart,
    clearCart,
  } = useCart();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const checkoutForm = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const handleCheckout = async (data: CheckoutFormValues) => {
    setIsCheckoutLoading(true);
    try {
      const response = await apiClient.post<StkPushInitiationResponse>(
          '/orders/',
          { phone_number: data.phoneNumber },
          { needsAuth: true }
      );

      if (response) {
        toast.success(response.message || "STK Push initiated. Check your phone to complete payment.");
      } else {
        toast.success("Checkout process initiated (received null response).");
      }
      checkoutForm.reset();

    } catch (error: unknown) {
        console.error("Checkout initiation failed:", error);
        let errorMessage = "Failed to initiate checkout.";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
             errorMessage = (error as ApiErrorResponse).message;
        }
        toast.error(errorMessage);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  if (authIsLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-10">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Your Cart is Empty</h2>
        <p className="mt-2 text-muted-foreground">Looks like you need to log in to view your cart.</p>
        <Button asChild className="mt-4">
          <Link href="/login">Log In</Link>
        </Button>
      </div>
    );
  }

  if (cartIsLoading && !cart) {
    return (
        <div>
             <h1 className="text-3xl font-bold tracking-tight mb-6 font-serif">Your Cart</h1>
             <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
             </div>
              <div className="mt-6">
                  <Skeleton className="h-10 w-1/3 ml-auto" />
                  <Skeleton className="h-10 w-full mt-4" />
              </div>
        </div>
    );
  }

  if (!cart || itemCount === 0) {
    return (
      <div className="text-center py-10">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Your Cart is Empty</h2>
        <p className="mt-2 text-muted-foreground">Add some amazing artwork to get started.</p>
        <Button asChild className="mt-4">
          <Link href="/artworks">Explore Artwork</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6 font-serif">Your Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})</h1>
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                 {cart.items.map((item) => (
                   <div key={item.id} className="px-6">
                       <CartItem
                         item={item}
                         onUpdateQuantity={updateCartItem}
                         onRemoveItem={removeFromCart}
                         isUpdating={cartIsLoading}
                       />
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 mt-8 lg:mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch space-y-4">
                <h3 className="text-lg font-semibold">Checkout with M-Pesa</h3>
                 <Form {...checkoutForm}>
                    <form onSubmit={checkoutForm.handleSubmit(handleCheckout)} className="space-y-4">
                         <FormField
                            control={checkoutForm.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>M-Pesa Phone Number</FormLabel>
                                <FormControl>
                                  <Input type="tel" placeholder="2547XXXXXXXX" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                         <Button type="submit" className="w-full" disabled={isCheckoutLoading || itemCount === 0 || cartIsLoading}>
                            {isCheckoutLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                "Place Order & Pay"
                            )}
                         </Button>
                    </form>
                 </Form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}