// === app/cart/page.tsx ===
'use client';

import React, { useState, useEffect } from 'react'; // Added useEffect
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

import { ShoppingCart, Trash2, Minus, Plus, Loader2, ImageOff, Info } from 'lucide-react'; // Added Info

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
  isUpdating: boolean; // Global cart loading state
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
    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 py-4 border-b last:border-b-0 flex-col sm:flex-row">
      <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-md border bg-muted mb-2 sm:mb-0">
        <Image
          src={item.artwork.image_url || placeholderImage}
          alt={item.artwork.name}
          fill
          sizes="(max-width: 640px) 20vw, 96px"
          className="object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).srcset = placeholderImage;
            (e.target as HTMLImageElement).src = placeholderImage;
          }}
        />
         {!item.artwork.image_url && <ImageOff className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground" />}
      </div>

      <div className="flex-1 space-y-1 min-w-0">
        <Link href={`/artworks/${item.artwork.id}`} className="font-medium hover:underline text-base sm:text-lg line-clamp-2">
          {item.artwork.name}
        </Link>
        <p className="text-xs sm:text-sm text-muted-foreground">By: {item.artwork.artist.name}</p>
        <p className="text-xs sm:text-sm font-medium">{formatPrice(item.artwork.price)}</p>
      </div>

      <div className="flex flex-row sm:flex-col items-center sm:items-end space-x-2 sm:space-x-0 sm:space-y-1 mt-2 sm:mt-0">
         <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={item.quantity <= 1 || isQuantityUpdating || isUpdating}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <span className="w-7 text-center text-xs sm:text-sm font-medium">
                {isQuantityUpdating ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mx-auto" /> : item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isQuantityUpdating || isUpdating || item.quantity >= item.artwork.stock_quantity}
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
         </div>
        {item.artwork.stock_quantity > 0 && item.artwork.stock_quantity < 5 && (
            <p className="text-xs text-orange-600 mt-1">Only {item.artwork.stock_quantity} left</p>
        )}
        {item.artwork.stock_quantity === 0 && !isQuantityUpdating && (
             <p className="text-xs text-red-600 mt-1">Out of stock</p>
        )}
      </div>

      <div className="font-medium text-sm sm:text-base w-full sm:w-auto text-right sm:text-left mt-2 sm:mt-0">
        {formatPrice(parseFloat(item.artwork.price) * item.quantity)}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive ml-auto sm:ml-0"
        onClick={handleRemove}
        disabled={isRemoving || isUpdating}
        aria-label="Remove item"
      >
        {isRemoving ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin"/> : <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />}
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
    fetchCart, // Add fetchCart to dependencies if needed for refresh
  } = useCart();
  const { isAuthenticated, isLoading: authIsLoading, user } = useAuth();
  const router = useRouter();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isAwaitingPaymentConfirmation, setIsAwaitingPaymentConfirmation] = useState(false);
  const [lastCheckoutId, setLastCheckoutId] = useState<string | null>(null);

  const checkoutForm = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      phoneNumber: user?.address?.startsWith('254') ? user.address : "", // Pre-fill if user has Kenyan phone in address (example)
    },
  });

   // Effect to pre-fill phone number from user profile if available
   useEffect(() => {
    if (user?.address) { // Or a dedicated phone field on user model
        // Basic check, adapt if user.address isn't the phone number
        const potentialPhone = user.address.replace(/\D/g, '');
        if (potentialPhone.startsWith("254") && potentialPhone.length === 12) {
             checkoutForm.setValue("phoneNumber", potentialPhone);
        }
    }
   }, [user, checkoutForm]);


  const handleCheckout = async (data: CheckoutFormValues) => {
    setIsCheckoutLoading(true);
    setIsAwaitingPaymentConfirmation(false);
    setLastCheckoutId(null);

    try {
      const response = await apiClient.post<StkPushInitiationResponse>(
          '/orders/',
          { phone_number: data.phoneNumber },
          { needsAuth: true }
      );

      if (response && response.CheckoutRequestID) {
        toast.info("STK Push sent! Please check your phone to authorize M-Pesa payment.", { duration: 10000 });
        setIsAwaitingPaymentConfirmation(true);
        setLastCheckoutId(response.CheckoutRequestID); // Store for potential future status check
        // Do NOT reset checkoutForm here, user might need to retry with same number
        // Cart will be cleared by backend callback if successful
      } else {
        toast.error(response?.message || "Failed to initiate payment. No Checkout ID received. Please try again.");
      }

    } catch (error: unknown) {
        console.error("Checkout initiation failed:", error);
        let errorMessage = "Failed to initiate M-Pesa payment.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        toast.error(errorMessage);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  // This is a simple way to refresh data when user comes back to this page after "paying"
  useEffect(() => {
    if (isAwaitingPaymentConfirmation) {
        // Optional: Add a timer to automatically navigate or refresh orders after some time
        // For now, user navigates manually.
    }
  }, [isAwaitingPaymentConfirmation]);


  if (authIsLoading) {
    return <div className="flex justify-center items-center p-10 min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-10 min-h-[300px] flex flex-col justify-center items-center">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Your Cart is Empty</h2>
        <p className="mt-2 text-muted-foreground">Please log in to view or add items to your cart.</p>
        <Button asChild className="mt-4">
          <Link href="/login?redirect=/cart">Log In</Link>
        </Button>
      </div>
    );
  }

  if (isAwaitingPaymentConfirmation) {
    return (
        <div className="text-center py-10 flex flex-col items-center space-y-4 min-h-[calc(100vh-200px)] justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-2xl font-semibold">Waiting for M-Pesa Confirmation...</h2>
            <p className="text-muted-foreground max-w-lg">
                Please complete the payment on your phone ({checkoutForm.getValues("phoneNumber")}).
                Once confirmed, your order will be processed.
            </p>
            <Card className="mt-4 p-4 bg-blue-50 border-blue-200 text-blue-700 max-w-lg">
                <div className="flex items-start space-x-3">
                    <Info className="h-5 w-5 flex-shrink-0 mt-0.5"/>
                    <div>
                        <p className="font-semibold">Pickup Information:</p>
                        <p className="text-sm">
                            You can pick up your order at: <br />
                            <strong>Dynamic Mall, Shop M90, CBD, Nairobi.</strong>
                        </p>
                    </div>
                </div>
            </Card>
            <p className="text-sm text-muted-foreground pt-2">
                You can check your <Link href="/orders" className="underline text-primary hover:text-primary/80">orders page</Link> for updates.
                The cart will update automatically once the order is confirmed.
            </p>
            <div className="flex space-x-4 pt-4">
              <Button onClick={() => { setIsAwaitingPaymentConfirmation(false); /* fetchCart(); */ }} variant="outline">
                  Cancel & Back to Cart
              </Button>
              <Button onClick={() => router.push('/orders')}>
                  Go to My Orders
              </Button>
            </div>
        </div>
    );
  }


  if (cartIsLoading && !cart) { // Initial load of cart
    return (
        <div>
             <h1 className="text-3xl font-bold tracking-tight mb-6 font-serif">Your Cart</h1>
             <div className="space-y-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
             </div>
              <div className="mt-6">
                  <Skeleton className="h-10 w-1/3 ml-auto" />
                  <Skeleton className="h-12 w-full mt-4" />
              </div>
        </div>
    );
  }

  if (!cart || itemCount === 0) {
    return (
      <div className="text-center py-10 min-h-[300px] flex flex-col justify-center items-center">
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
              <CardTitle>Items in your cart</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                 {cart.items.map((item) => (
                   <div key={item.id} className="px-4 sm:px-6">
                       <CartItem
                         item={item}
                         onUpdateQuantity={updateCartItem}
                         onRemoveItem={removeFromCart}
                         isUpdating={cartIsLoading} // Pass global cart loading state
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
              {/* Add other costs like shipping if applicable */}
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
                                    Initiating Payment...
                                </>
                            ) : (
                                "Place Order & Pay with M-Pesa"
                            )}
                         </Button>
                    </form>
                 </Form>
                 <p className="text-xs text-muted-foreground text-center">
                    Upon successful M-Pesa payment, your order will be confirmed. <br/>
                    Pickup at: <strong>Dynamic Mall, Shop M90, CBD, Nairobi.</strong>
                 </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}