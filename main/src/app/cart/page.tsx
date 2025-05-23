// === main/src/app/cart/page.tsx ===
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice, cn } from '@/lib/utils';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


import { ShoppingCart, Trash2, Minus, Plus, Loader2, ImageOff, Info, CheckCircle, XCircle } from 'lucide-react';

interface PaymentTransactionStatusResponse {
    status: 'initiated' | 'pending_stk_initiation' | 'pending_confirmation' | 'successful' | 'failed_stk_initiation' | 'failed_stk_missing_id' | 'failed_underpaid' | 'failed_processing_error' | 'cancelled_by_user' | 'failed_daraja' | 'failed_timeout' | 'failed_missing_receipt' | 'not_found';
    checkout_request_id: string | null;
    message: string;
    order_id?: string;
}

const checkoutSchema = z.object({
  phoneNumber: z.string()
    .min(1, "Phone number is required")
    .length(12, "Phone number must be 12 digits (e.g. 2547XXXXXXXX)")
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
        <Link href={`/artworks/${item.artwork.id}`} className="font-medium hover:text-primary transition-colors text-base sm:text-lg line-clamp-2">
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
    fetchCart,
  } = useCart();
  const { isAuthenticated, isLoading: authIsLoading, user } = useAuth();
  const router = useRouter();

  const [isStkFlowActive, setIsStkFlowActive] = useState(false);
  const [stkCheckoutId, setStkCheckoutId] = useState<string | null>(null);
  const [pollingMessage, setPollingMessage] = useState<string>("Please complete the M-Pesa payment on your phone.");
  const [paymentStatus, setPaymentStatus] = useState<PaymentTransactionStatusResponse['status'] | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingAttemptsRef = useRef<number>(0);

  const MAX_POLLING_ATTEMPTS = 24; 
  const POLLING_INTERVAL_MS = 5000;


  const checkoutForm = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

   useEffect(() => {
    if (user?.address && !isStkFlowActive) { 
        const potentialPhone = user.address.replace(/\D/g, '');
        if (potentialPhone.startsWith("254") && potentialPhone.length === 12) {
             checkoutForm.setValue("phoneNumber", potentialPhone);
        }
    }
   }, [user, checkoutForm, isStkFlowActive]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollingAttemptsRef.current = 0;
  }, []);

  const handlePaymentSuccess = useCallback((orderId?: string) => {
    stopPolling();
    setPaymentStatus('successful');
    setPollingMessage("Payment successful! Your order has been placed.");
    toast.success("Order Placed Successfully!", {
        description: "You can pick up your order at Dynamic Mall, Shop M90, CBD, Nairobi.",
        duration: 15000,
        action: orderId ? { label: "View Order", onClick: () => router.push(`/orders/${orderId}`) } : 
                         { label: "My Orders", onClick: () => router.push(`/orders`) },
    });
    fetchCart(); 
  }, [stopPolling, router, fetchCart]);

  const handlePaymentFailure = useCallback((message: string, finalStatus?: PaymentTransactionStatusResponse['status']) => {
    stopPolling();
    setPaymentStatus(finalStatus || 'failed_daraja');
    const displayMessage = message || "Payment failed or was cancelled. Please try again.";
    setPollingMessage(displayMessage);
    toast.error(displayMessage, { duration: 10000 });
  }, [stopPolling]);


  const pollPaymentStatus = useCallback(async (checkoutIdToPoll: string) => {
    if (!checkoutIdToPoll) { 
        console.warn("pollPaymentStatus called without checkoutIdToPoll");
        handlePaymentFailure("Cannot check payment status: Missing transaction ID.", "failed_processing_error");
        return;
    }
    if (pollingAttemptsRef.current >= MAX_POLLING_ATTEMPTS) {
      handlePaymentFailure("Payment confirmation timed out. If you paid, please check 'My Orders' or contact support.", 'failed_timeout');
      return;
    }

    pollingAttemptsRef.current += 1;
    setPollingMessage(`Checking payment status (attempt ${pollingAttemptsRef.current} of ${MAX_POLLING_ATTEMPTS})...`);

    try {
      const statusResponse = await apiClient.get<PaymentTransactionStatusResponse>(`/orders/status/${checkoutIdToPoll}`, { needsAuth: true });
      if (statusResponse) {
        setPaymentStatus(statusResponse.status); 
        
        if (statusResponse.status === 'successful') {
          handlePaymentSuccess(statusResponse.order_id);
        } else if (['failed_stk_initiation', 'failed_stk_missing_id', 'failed_underpaid', 'failed_processing_error', 'cancelled_by_user', 'failed_daraja', 'failed_timeout', 'failed_missing_receipt'].includes(statusResponse.status)) {
          handlePaymentFailure(statusResponse.message || "Payment process encountered an issue.", statusResponse.status);
        } else if (statusResponse.status === 'not_found') {
           handlePaymentFailure("Transaction details not found. This could be a delay or an issue. Please contact support if payment was made.", 'not_found');
        } else { // Pending states
           setPollingMessage(statusResponse.message || "Awaiting M-Pesa confirmation...");
        }
      } else { // Should ideally not happen if apiClient throws on non-OK
        setPollingMessage("Could not retrieve payment status. Still trying...");
      }
    } catch (error: any) {
      console.error("Polling error:", error);
      if (error.message?.includes('404') || error.message?.toLowerCase().includes('not found')) {
        handlePaymentFailure("Could not find this transaction to check its status. If you paid, contact support.", 'not_found');
      } else {
        setPollingMessage("Error checking status. Retrying...");
      }
    }
  }, [handlePaymentSuccess, handlePaymentFailure]); // Dependencies for useCallback


  useEffect(() => {
    const isFinalSuccessState = paymentStatus === 'successful';
    const isFinalNonSuccessState = 
        paymentStatus === 'failed_stk_initiation' ||
        paymentStatus === 'failed_stk_missing_id' ||
        paymentStatus === 'failed_underpaid' ||
        paymentStatus === 'failed_processing_error' ||
        paymentStatus === 'cancelled_by_user' ||
        paymentStatus === 'failed_daraja' ||
        paymentStatus === 'failed_timeout' ||
        paymentStatus === 'failed_missing_receipt' ||
        paymentStatus === 'not_found';

    if (stkCheckoutId && isStkFlowActive && 
        !isFinalSuccessState && 
        !isFinalNonSuccessState &&
        !pollingIntervalRef.current) { 
          
      pollingAttemptsRef.current = 0;
      if (paymentStatus === null || paymentStatus === 'initiated' || paymentStatus === 'pending_stk_initiation') {
         setPollingMessage("Waiting for M-Pesa confirmation..."); 
      }
      
      pollPaymentStatus(stkCheckoutId);
      
      // After initial poll, re-check conditions to set interval
      // This logic needs to be careful not to miss the state update from the first pollPaymentStatus call
      // It's safer to let the interval start and let pollPaymentStatus handle stopping via final states.
      if (!pollingIntervalRef.current) { // Check again ensures it wasn't stopped by the first poll
        pollingIntervalRef.current = setInterval(() => {
            if (stkCheckoutId) { 
                 pollPaymentStatus(stkCheckoutId);
            } else {
                stopPolling(); 
            }
        }, POLLING_INTERVAL_MS);
      }
    } else if (isFinalSuccessState || isFinalNonSuccessState) {
        // If a final state is reached (possibly by an update outside this effect's direct initiation)
        stopPolling();
    }
    
    return () => {
      stopPolling();
    };
  }, [stkCheckoutId, isStkFlowActive, paymentStatus, pollPaymentStatus, stopPolling]);


  const handleInitiateCheckout = async (data: CheckoutFormValues) => {
    setIsStkFlowActive(true); 
    setStkCheckoutId(null);   
    setPaymentStatus('initiated'); 
    setPollingMessage("Initiating M-Pesa payment...");

    try {
      const response = await apiClient.post<StkPushInitiationResponse & { transaction_id?: string }>(
          '/orders/', 
          { phone_number: data.phoneNumber },
          { needsAuth: true }
      );

      if (response && response.CheckoutRequestID) {
        toast.info("STK Push sent! Please authorize payment on your phone.", { duration: 10000 });
        setStkCheckoutId(response.CheckoutRequestID); 
      } else {
        const message = response?.message || response?.ResponseDescription || "Failed to initiate payment. No Checkout ID received.";
        handlePaymentFailure(message, 'failed_stk_initiation');
      }
    } catch (error: any) {
        console.error("Checkout initiation failed:", error);
        handlePaymentFailure(error.message || "Failed to initiate M-Pesa payment.", 'failed_stk_initiation');
    }
  };

  // --- Render logic ---

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

  if (isStkFlowActive) {
    let statusIcon = <Loader2 className="h-12 w-12 animate-spin text-primary" />;
    let statusTitle = "Processing Payment...";
    let alertVariantForComponent: "default" | "destructive" = "default"; 
    let successAlertClasses = ""; 

    if (paymentStatus === 'successful') {
        statusIcon = <CheckCircle className="h-12 w-12 text-green-600" />;
        statusTitle = "Payment Successful!";
        alertVariantForComponent = "default"; 
        successAlertClasses = "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400";
    } else if (paymentStatus && (paymentStatus.startsWith('failed') || paymentStatus === 'cancelled_by_user' || paymentStatus === 'not_found')) {
        statusIcon = <XCircle className="h-12 w-12 text-red-600" />;
        statusTitle = "Payment Issue";
        alertVariantForComponent = "destructive"; 
    } else if (stkCheckoutId || paymentStatus === 'initiated' || paymentStatus === 'pending_stk_initiation' || paymentStatus === 'pending_confirmation') { 
        statusTitle = "Waiting for M-Pesa Confirmation...";
        alertVariantForComponent = "default";
    }


    return (
        <div className="text-center py-10 flex flex-col items-center space-y-6 min-h-[calc(100vh-200px)] justify-center">
            {statusIcon}
            <h2 className="text-2xl font-semibold">
                {statusTitle}
            </h2>
            
            <Alert 
                variant={alertVariantForComponent} 
                className={cn("max-w-md text-left", successAlertClasses)}
            >
                {/* Conditionally render leading icon within Alert based on its structure */}
                {/* For shadcn, Alert > svg + AlertTitle + AlertDescription */}
                {paymentStatus === 'successful' && <CheckCircle className="h-4 w-4" />}
                {paymentStatus && (paymentStatus.startsWith('failed') || paymentStatus === 'cancelled_by_user' || paymentStatus === 'not_found') && <XCircle className="h-4 w-4" />}
                {/* Show loader if stkCheckoutId is present AND status is one of the loading states */}
                {stkCheckoutId && (paymentStatus === null || paymentStatus === 'pending_confirmation' || paymentStatus === 'initiated' || paymentStatus === 'pending_stk_initiation') && <Loader2 className="h-4 w-4 animate-spin" />}
                
                <AlertTitle className="capitalize">
                    {paymentStatus ? paymentStatus.replace(/_/g, ' ') : "Status"}
                 </AlertTitle>
                <AlertDescription>
                    {pollingMessage || "Please wait while we confirm your payment."}
                </AlertDescription>
            </Alert>

            {(paymentStatus === 'successful') && (
                <Card className={cn("mt-4 p-4 max-w-lg", successAlertClasses)}> 
                    <div className="flex items-start space-x-3">
                        <Info className={cn("h-5 w-5 flex-shrink-0 mt-0.5", paymentStatus === 'successful' ? "text-green-700 dark:text-green-400" : "")}/>
                        <div>
                            <p className="font-semibold">Order Confirmed! Pickup Information:</p>
                            <p className="text-sm">
                                You can pick up your order at: <br />
                                <strong>Dynamic Mall, Shop M90, CBD, Nairobi.</strong>
                            </p>
                        </div>
                    </div>
                </Card>
            )}
            
            <div className="flex space-x-4 pt-4">
              {paymentStatus !== 'successful' && (
                  <Button 
                    onClick={() => { 
                        stopPolling(); 
                        setIsStkFlowActive(false); 
                        setPaymentStatus(null); 
                        setStkCheckoutId(null);
                        checkoutForm.reset(); 
                    }} 
                    variant="outline"
                  >
                      { paymentStatus && (paymentStatus.startsWith('failed') || paymentStatus === 'cancelled_by_user' || paymentStatus === 'not_found') ? "Try Again / Back to Cart" : "Cancel & Back to Cart"}
                  </Button>
              )}
              <Button onClick={() => router.push('/orders')}>
                  {paymentStatus === 'successful' ? 'View My Orders' : 'Check My Orders'}
              </Button>
            </div>
        </div>
    );
  }

  if (cartIsLoading && !cart && !isStkFlowActive) { 
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
  if ((!cart || itemCount === 0) && !isStkFlowActive) { 
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
                 {cart?.items.map((item) => ( 
                   <div key={item.id} className="px-4 sm:px-6">
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
                    <form onSubmit={checkoutForm.handleSubmit(handleInitiateCheckout)} className="space-y-4">
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
                         <Button type="submit" className="w-full" 
                                 disabled={isStkFlowActive || itemCount === 0 || cartIsLoading || authIsLoading}> 
                            {isStkFlowActive ? ( 
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing... 
                                </>
                            ) : (
                                "Place Order & Pay with M-Pesa"
                            )}
                         </Button>
                    </form>
                 </Form>
                 <p className="text-xs text-muted-foreground text-center">
                    Pickup at: <strong>Dynamic Mall, Shop M90, CBD, Nairobi.</strong>
                 </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}