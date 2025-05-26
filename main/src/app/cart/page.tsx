'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import {
    ApiErrorResponse,
    CartItem as CartItemType,
    StkPushInitiationResponse,
    DeliveryOption as DeliveryOptionType,
    PaymentTransactionStatusResponse
} from '@/lib/types';
import { apiClient } from '@/lib/api';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label"

import { ShoppingCart, Trash2, Minus, Plus, Loader2, ImageOff, Info, CheckCircle, XCircle, Truck, Package, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';


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

  const isItemAvailable = item.artwork.is_active && item.artwork.artist.is_active;
  const isItemOutOfStock = item.artwork.stock_quantity === 0;

  const handleQuantityChange = async (newQuantity: number) => {
    if (!isItemAvailable || isItemOutOfStock) {
        toast.error(`"${item.artwork.name}" is currently unavailable or out of stock.`);
        return;
    }
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
    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 py-4 border-b last:border-b-0 border-border/70 flex-col sm:flex-row">
      <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-md border bg-muted mb-2 sm:mb-0">
        <Image
          src={item.artwork.image_url || placeholderImage}
          alt={item.artwork.name}
          fill
          sizes="(max-width: 640px) 20vw, 96px"
          className={cn("object-cover", (!isItemAvailable || isItemOutOfStock) && "opacity-50")}
          onError={(e) => {
            (e.target as HTMLImageElement).srcset = placeholderImage;
            (e.target as HTMLImageElement).src = placeholderImage;
          }}
        />
         {!item.artwork.image_url && <ImageOff className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground" />}
         {(!isItemAvailable || isItemOutOfStock) && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Badge variant="destructive" className="text-xs">
                    {!isItemAvailable ? "Unavailable" : "Out of Stock"}
                </Badge>
            </div>
         )}
      </div>

      <div className="flex-1 space-y-1 min-w-0">
        <Link
            href={`/artworks/${item.artwork.id}`}
            className={cn(
                "font-medium hover:text-primary transition-colors text-base sm:text-lg line-clamp-2",
                (!isItemAvailable || isItemOutOfStock) && "text-muted-foreground line-through"
            )}
        >
          {item.artwork.name}
        </Link>
        <p className="text-xs sm:text-sm text-muted-foreground">By: {item.artwork.artist.name}</p>
        <p className="text-xs sm:text-sm font-medium">{formatPrice(item.artwork.price)}</p>
         {(!isItemAvailable || isItemOutOfStock) && (
            <p className="text-xs text-red-600 mt-1">
                {!isItemAvailable ? "This item is no longer available." : "This item is out of stock."}
            </p>
         )}
      </div>

      <div className="flex flex-row sm:flex-col items-center sm:items-end space-x-2 sm:space-x-0 sm:space-y-1 mt-2 sm:mt-0">
         <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-r-none"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={!isItemAvailable || isItemOutOfStock || item.quantity <= 1 || isQuantityUpdating || isUpdating}
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
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-l-none"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={!isItemAvailable || isItemOutOfStock || isQuantityUpdating || isUpdating || item.quantity >= item.artwork.stock_quantity}
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
         </div>
        {isItemAvailable && !isItemOutOfStock && item.artwork.stock_quantity < 5 && (
            <p className="text-xs text-orange-600 mt-1">Only {item.artwork.stock_quantity} left</p>
        )}
      </div>

      <div className={cn("font-medium text-sm sm:text-base w-full sm:w-auto text-right sm:text-left mt-2 sm:mt-0", (!isItemAvailable || isItemOutOfStock) && "text-muted-foreground line-through")}>
        {formatPrice(parseFloat(item.artwork.price) * item.quantity)}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive ml-auto sm:ml-0 rounded-md"
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
    updateCartItem,
    removeFromCart,
    fetchCart,
    clearCart,
  } = useCart();
  const { isAuthenticated, isLoading: authIsLoading, user } = useAuth();
  const router = useRouter();

  const [isStkFlowActive, setIsStkFlowActive] = useState(false);
  const [stkCheckoutId, setStkCheckoutId] = useState<string | null>(null);
  const [pollingMessage, setPollingMessage] = useState<string>("Please complete the M-Pesa payment on your phone.");
  const [paymentStatus, setPaymentStatus] = useState<PaymentTransactionStatusResponse['status'] | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);


  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOptionType[]>([]);
  const [isLoadingDeliveryOptions, setIsLoadingDeliveryOptions] = useState(false);
  const [selectedDeliveryOptionId, setSelectedDeliveryOptionId] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');

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

  const availableCartItems = useMemo(() => {
    return cart?.items.filter(item =>
        item.artwork.is_active &&
        item.artwork.artist.is_active &&
        item.artwork.stock_quantity > 0 &&
        item.artwork.stock_quantity >= item.quantity
    ) || [];
  }, [cart]);

  const unavailableCartItems = useMemo(() => {
    return cart?.items.filter(item =>
        !item.artwork.is_active ||
        !item.artwork.artist.is_active ||
        item.artwork.stock_quantity === 0 ||
        item.artwork.stock_quantity < item.quantity
    ) || [];
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return availableCartItems.reduce((sum, item) => {
      const price = parseFloat(item.artwork.price) || 0;
      return sum + (price * item.quantity);
    }, 0);
  }, [availableCartItems]);


  useEffect(() => {
    if (isAuthenticated && !isStkFlowActive) {
      const fetchDeliveryOpts = async () => {
        setIsLoadingDeliveryOptions(true);
        try {
          const opts = await apiClient.get<DeliveryOptionType[]>('/api/delivery/options', { needsAuth: true });
          setDeliveryOptions(opts || []);
          const activePickupOption = opts?.find(opt => opt.is_pickup && opt.active);
          const firstActiveDelivery = opts?.find(opt => !opt.is_pickup && opt.active);

          if (deliveryType === 'pickup' && activePickupOption) {
            setSelectedDeliveryOptionId(activePickupOption.id);
          } else if (deliveryType === 'delivery' && firstActiveDelivery) {
            setSelectedDeliveryOptionId(firstActiveDelivery.id);
          } else if (opts && opts.length > 0) {
             const firstActive = opts.find(opt => opt.active);
             if(firstActive) {
                setSelectedDeliveryOptionId(firstActive.id);
                setDeliveryType(firstActive.is_pickup ? 'pickup' : 'delivery');
             }
          }
        } catch (error) {
          console.error("Failed to fetch delivery options:", error);
          toast.error("Could not load delivery options.");
        } finally {
          setIsLoadingDeliveryOptions(false);
        }
      };
      fetchDeliveryOpts();
    }
  }, [isAuthenticated, isStkFlowActive, deliveryType]);

  useEffect(() => {
    if (user?.address && !isStkFlowActive) {
      const potentialPhone = user.address.replace(/\D/g, '');
      if (potentialPhone.startsWith("254") && potentialPhone.length === 12) {
        checkoutForm.setValue("phoneNumber", potentialPhone);
      }
    }
  }, [user, checkoutForm, isStkFlowActive]);

  const selectedDeliveryOption = useMemo(() => {
    return deliveryOptions.find(opt => opt.id === selectedDeliveryOptionId && opt.active);
  }, [deliveryOptions, selectedDeliveryOptionId]);

  const deliveryCost = useMemo(() => {
    if (!selectedDeliveryOption) return 0;
    return parseFloat(selectedDeliveryOption.price) || 0;
  }, [selectedDeliveryOption]);

  const grandTotal = useMemo(() => {
    return cartSubtotal + deliveryCost;
  }, [cartSubtotal, deliveryCost]);


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
    setConfirmedOrderId(orderId || null); 
    let successMessage = "Payment successful! Your order has been placed.";
    if (selectedDeliveryOption?.is_pickup) {
        successMessage += ` You can pick up your order at: ${selectedDeliveryOption.description || 'our store.'}`;
    } else if (selectedDeliveryOption) {
        successMessage += ` It will be delivered via ${selectedDeliveryOption.name}.`;
    }

    setPollingMessage(successMessage);
    toast.success("Order Placed Successfully!", {
        description: successMessage.replace("Payment successful! Your order has been placed.", "").trim(),
        duration: 15000,
        action: orderId 
                ? { label: "View Order", onClick: () => router.push(`/orders/${orderId}`) } 
                : { label: "My Orders", onClick: () => router.push(`/orders`) },
    });
    fetchCart();
  }, [stopPolling, router, fetchCart, selectedDeliveryOption]);

  const handlePaymentFailure = useCallback((message: string, finalStatus?: PaymentTransactionStatusResponse['status']) => {
    stopPolling();
    setPaymentStatus(finalStatus || 'failed_daraja');
    const displayMessage = message || "Payment failed or was cancelled. Please try again.";
    setPollingMessage(displayMessage);
    toast.error(displayMessage, { duration: 10000 });
  }, [stopPolling]);


  const pollPaymentStatus = useCallback(async (checkoutIdToPoll: string) => {
    if (!checkoutIdToPoll) {
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
      const statusResponse = await apiClient.get<PaymentTransactionStatusResponse>(`/api/orders/status/${checkoutIdToPoll}`, { needsAuth: true });
      if (statusResponse) {
        setPaymentStatus(statusResponse.status);
        if (statusResponse.status === 'successful') {
          handlePaymentSuccess(statusResponse.order_id);
        } else if (['failed_stk_initiation', 'failed_stk_missing_id', 'failed_underpaid', 'failed_processing_error', 'cancelled_by_user', 'failed_daraja', 'failed_timeout', 'failed_missing_receipt'].includes(statusResponse.status)) {
          handlePaymentFailure(statusResponse.message || "Payment process encountered an issue.", statusResponse.status);
        } else if (statusResponse.status === 'not_found') {
           handlePaymentFailure("Transaction details not found. This could be a delay or an issue. Please contact support if payment was made.", 'not_found');
        } else {
           setPollingMessage(statusResponse.message || "Awaiting M-Pesa confirmation...");
        }
      } else {
        setPollingMessage("Could not retrieve payment status. Still trying...");
      }
    } catch (error: any) {
      console.error("Polling error:", error);
      if (error.message?.includes('401')) {
         toast.error("Session expired. Please log in and try again.");
         handlePaymentFailure("Authentication error during polling. Please log in again.", "failed_processing_error");
      } else if (error.message?.includes('404') || error.message?.toLowerCase().includes('not found')) {
        handlePaymentFailure("Could not find this transaction to check its status. If you paid, contact support.", 'not_found');
      } else {
        setPollingMessage("Error checking status. Retrying...");
      }
    }
  }, [handlePaymentSuccess, handlePaymentFailure]);


  useEffect(() => {
    const isFinalSuccessState = paymentStatus === 'successful';
    const isFinalNonSuccessState =
        paymentStatus === 'failed_stk_initiation' || paymentStatus === 'failed_stk_missing_id' ||
        paymentStatus === 'failed_underpaid' || paymentStatus === 'failed_processing_error' ||
        paymentStatus === 'cancelled_by_user' || paymentStatus === 'failed_daraja' ||
        paymentStatus === 'failed_timeout' || paymentStatus === 'failed_missing_receipt' ||
        paymentStatus === 'not_found';

    if (stkCheckoutId && isStkFlowActive && !isFinalSuccessState && !isFinalNonSuccessState && !pollingIntervalRef.current) {
      pollingAttemptsRef.current = 0;
      if (paymentStatus === null || paymentStatus === 'initiated' || paymentStatus === 'pending_stk_initiation') {
         setPollingMessage("Waiting for M-Pesa confirmation...");
      }
      pollPaymentStatus(stkCheckoutId);

      if (!pollingIntervalRef.current && stkCheckoutId) {
        pollingIntervalRef.current = setInterval(() => {
            if (stkCheckoutId) {
                 pollPaymentStatus(stkCheckoutId);
            } else {
                stopPolling();
            }
        }, POLLING_INTERVAL_MS);
      }
    } else if (isFinalSuccessState || isFinalNonSuccessState) {
        stopPolling();
    }
    return () => {
      stopPolling();
    };
  }, [stkCheckoutId, isStkFlowActive, paymentStatus, pollPaymentStatus, stopPolling]);


  const handleInitiateCheckout = async (data: CheckoutFormValues) => {
    if (availableCartItems.length === 0) {
        toast.error("Your cart contains no items available for purchase. Please review your cart.");
        return;
    }
    if (!selectedDeliveryOptionId) {
        toast.error("Please select a delivery or pickup option.");
        return;
    }
    if (grandTotal <= 0) {
        toast.error("Total amount must be greater than zero to proceed with M-Pesa payment.");
        return;
    }

    setIsStkFlowActive(true);
    setStkCheckoutId(null);
    setPaymentStatus('initiated');
    setConfirmedOrderId(null);
    setPollingMessage("Initiating M-Pesa payment...");

    try {
      const response = await apiClient.post<StkPushInitiationResponse>(
          '/api/orders/',
          {
            phone_number: data.phoneNumber,
            delivery_option_id: selectedDeliveryOptionId,
          },
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

  const handleDeliveryTypeChange = (type: 'pickup' | 'delivery') => {
    setDeliveryType(type);
    setSelectedDeliveryOptionId(null);
    const relevantOptions = type === 'pickup'
        ? deliveryOptions.filter(opt => opt.is_pickup && opt.active)
        : deliveryOptions.filter(opt => !opt.is_pickup && opt.active);

    if (relevantOptions.length > 0) {
        setSelectedDeliveryOptionId(relevantOptions[0].id);
    }
  };


  if (authIsLoading) {
    return <div className="flex justify-center items-center p-10 min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }
  if (!isAuthenticated) {
    return (
      <div className="text-center py-10 min-h-[300px] flex flex-col justify-center items-center">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold font-serif">Your Cart is Empty</h2>
        <p className="mt-2 text-muted-foreground">Please log in to view or add items to your cart.</p>
        <Button asChild className="mt-4 rounded-md">
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
        successAlertClasses = "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400";
    } else if (paymentStatus && (paymentStatus.startsWith('failed') || paymentStatus === 'cancelled_by_user' || paymentStatus === 'not_found')) {
        statusIcon = <XCircle className="h-12 w-12 text-red-600" />;
        statusTitle = "Payment Issue";
        alertVariantForComponent = "destructive";
    } else if (stkCheckoutId || paymentStatus === 'initiated' || paymentStatus === 'pending_stk_initiation' || paymentStatus === 'pending_confirmation') {
        statusTitle = "Waiting for M-Pesa Confirmation...";
    }

    return (
        <div className="text-center py-10 flex flex-col items-center space-y-6 min-h-[calc(100vh-200px)] justify-center">
            {statusIcon}
            <h2 className="text-2xl font-semibold font-serif">{statusTitle}</h2>
            <Alert variant={alertVariantForComponent} className={cn("max-w-md text-left rounded-lg", successAlertClasses)}>
                {(paymentStatus === 'successful' && <CheckCircle className="h-4 w-4" />) ||
                 (paymentStatus && (paymentStatus.startsWith('failed') || paymentStatus === 'cancelled_by_user' || paymentStatus === 'not_found') && <XCircle className="h-4 w-4" />) ||
                 (stkCheckoutId && (paymentStatus === null || paymentStatus === 'pending_confirmation' || paymentStatus === 'initiated' || paymentStatus === 'pending_stk_initiation') && <Loader2 className="h-4 w-4 animate-spin" />)}
                <AlertTitle className="capitalize font-serif">
                    {paymentStatus ? paymentStatus.replace(/_/g, ' ') : "Status"}
                 </AlertTitle>
                <AlertDescription>
                    {pollingMessage || "Please wait while we confirm your payment."}
                </AlertDescription>
            </Alert>
            {paymentStatus === 'successful' && selectedDeliveryOption && (
                <Card className={cn("mt-4 p-4 max-w-lg text-left rounded-lg", successAlertClasses)}>
                    <div className="flex items-start space-x-3">
                        <Info className={cn("h-5 w-5 flex-shrink-0 mt-0.5", "text-green-700 dark:text-green-400")}/>
                        <div>
                            <p className="font-semibold">
                                {selectedDeliveryOption.is_pickup ? "Pickup Information:" : "Delivery Information:"}
                            </p>
                            <p className="text-sm">
                                {selectedDeliveryOption.is_pickup
                                    ? selectedDeliveryOption.description || 'our store.'
                                    : `Your order will be delivered via ${selectedDeliveryOption.name} to your registered address: ${user?.address || 'Not specified'}.`}
                            </p>
                        </div>
                    </div>
                </Card>
            )}
            <div className="flex space-x-4 pt-4">
              {paymentStatus !== 'successful' && (
                  <Button
                    onClick={() => {
                        stopPolling(); setIsStkFlowActive(false); setPaymentStatus(null); setStkCheckoutId(null); setConfirmedOrderId(null);
                        checkoutForm.reset();
                        fetchCart();
                    }}
                    variant="outline"
                    className="rounded-md"
                  >
                      {paymentStatus && (paymentStatus.startsWith('failed') || paymentStatus === 'cancelled_by_user' || paymentStatus === 'not_found') ? "Try Again / Back to Cart" : "Cancel & Back to Cart"}
                  </Button>
              )}
              <Button onClick={() => router.push(confirmedOrderId ? `/orders/${confirmedOrderId}` : '/orders')} className="rounded-md shadow hover:shadow-md">
                  {paymentStatus === 'successful' ? (confirmedOrderId ? 'View This Order' : 'View My Orders') : 'Check My Orders'}
              </Button>
            </div>
        </div>
    );
  }

  if ((cartIsLoading || isLoadingDeliveryOptions) && !cart && !isStkFlowActive) {
        return (
        <div>
             <h1 className="text-3xl font-bold tracking-tight mb-6 font-serif text-primary">Your Cart</h1>
             <div className="space-y-4">
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
             </div>
              <div className="mt-6">
                  <Skeleton className="h-10 w-1/3 ml-auto rounded-md" />
                  <Skeleton className="h-12 w-full mt-4 rounded-md" />
                  <Skeleton className="h-10 w-full mt-2 rounded-md" />
              </div>
        </div>
    );
  }
  if ((!cart || itemCount === 0) && !isStkFlowActive) {
     return (
      <div className="text-center py-10 min-h-[300px] flex flex-col justify-center items-center">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold font-serif">Your Cart is Empty</h2>
        <p className="mt-2 text-muted-foreground">Add some amazing artwork to get started.</p>
        <Button asChild className="mt-4 rounded-md">
          <Link href="/artworks">Explore Artwork</Link>
        </Button>
      </div>
    );
  }

  const pickupOptions = deliveryOptions.filter(opt => opt.is_pickup && opt.active);
  const actualDeliveryOptions = deliveryOptions.filter(opt => !opt.is_pickup && opt.active);
  const canProceedToCheckout = availableCartItems.length > 0 && selectedDeliveryOptionId !== null;


  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6 font-serif text-primary">Your Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})</h1>
      {unavailableCartItems.length > 0 && (
        <Alert variant="destructive" className="mb-6 rounded-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-serif">Some items are unavailable!</AlertTitle>
          <AlertDescription>
            One or more items in your cart are currently out of stock or no longer available.
            They have been excluded from the total and cannot be purchased.
            Please review the items below. You can remove them or update quantities if partial stock is available for other items.
          </AlertDescription>
        </Alert>
      )}
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          <Card className="rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle className="font-serif">Items in your cart</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/70">
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
          <Card className="rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle className="font-serif">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal (available items)</span>
                <span>{formatPrice(cartSubtotal)}</span>
              </div>

              <Separator />
              <div>
                <Label className="text-base font-semibold mb-2 block font-serif">Shipping Options</Label>
                <RadioGroup
                    value={deliveryType}
                    onValueChange={(value: 'pickup' | 'delivery') => handleDeliveryTypeChange(value)}
                    className="mb-3 grid grid-cols-2 gap-2"
                >
                    <Label htmlFor="pickup"
                        className={cn(
                            "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                            deliveryType === 'pickup' && "border-primary ring-2 ring-primary/30"
                        )}>
                        <RadioGroupItem value="pickup" id="pickup" className="sr-only" />
                        <Package className="mb-2 h-6 w-6" />
                        Pick Up
                    </Label>
                    <Label htmlFor="delivery"
                        className={cn(
                            "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                            deliveryType === 'delivery' && "border-primary ring-2 ring-primary/30"
                        )}>
                        <RadioGroupItem value="delivery" id="delivery" className="sr-only" />
                        <Truck className="mb-2 h-6 w-6" />
                        Delivery
                    </Label>
                </RadioGroup>

                {isLoadingDeliveryOptions && <Loader2 className="h-5 w-5 animate-spin my-2" />}

                {!isLoadingDeliveryOptions && deliveryType === 'pickup' && (
                    pickupOptions.length > 0 ? (
                        <Select
                            value={selectedDeliveryOptionId || ""}
                            onValueChange={(value) => setSelectedDeliveryOptionId(value)}
                        >
                            <SelectTrigger className="rounded-md">
                                <SelectValue placeholder="Select pickup location" />
                            </SelectTrigger>
                            <SelectContent className="rounded-md">
                                {pickupOptions.map(opt => (
                                    <SelectItem key={opt.id} value={opt.id}>
                                        {opt.name} - ({formatPrice(opt.price)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : <p className="text-sm text-muted-foreground">No active pickup options available.</p>
                )}

                {!isLoadingDeliveryOptions && deliveryType === 'delivery' && (
                     actualDeliveryOptions.length > 0 ? (
                        <Select
                            value={selectedDeliveryOptionId || ""}
                            onValueChange={(value) => setSelectedDeliveryOptionId(value)}
                        >
                            <SelectTrigger className="rounded-md">
                                <SelectValue placeholder="Select delivery zone" />
                            </SelectTrigger>
                            <SelectContent className="rounded-md">
                                {actualDeliveryOptions.map(opt => (
                                    <SelectItem key={opt.id} value={opt.id}>
                                        {opt.name} - ({formatPrice(opt.price)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     ) : <p className="text-sm text-muted-foreground">No active delivery options available.</p>
                )}
                {selectedDeliveryOption && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedDeliveryOption.description}</p>
                )}
              </div>

              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>{formatPrice(deliveryCost)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Grand Total</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch space-y-4">
                <h3 className="text-lg font-semibold font-serif">Checkout with M-Pesa</h3>
                 <Form {...checkoutForm}>
                    <form onSubmit={checkoutForm.handleSubmit(handleInitiateCheckout)} className="space-y-4">
                    <FormField
                            control={checkoutForm.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel htmlFor="phoneNumber">M-Pesa Phone Number</FormLabel>
                                <FormControl>
                                  <Input
                                    id="phoneNumber"
                                    type="tel"
                                    placeholder="e.g., 254712345678"
                                    {...field}
                                    className="rounded-md"
                                    />
                                </FormControl>
                                <FormDescription>
                                  Enter your M-Pesa registered phone number. It must start with 254 and be 12 digits long.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                         <Button type="submit" className="w-full rounded-md shadow hover:shadow-md"
                                 disabled={isStkFlowActive || !canProceedToCheckout || cartIsLoading || authIsLoading || grandTotal <=0}>
                            {isStkFlowActive ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                            ) : (
                                "Place Order & Pay with M-Pesa"
                            )}
                         </Button>
                    </form>
                 </Form>
                 {selectedDeliveryOption && selectedDeliveryOption.is_pickup && (
                     <p className="text-xs text-muted-foreground text-center">
                        Selected Pickup: {selectedDeliveryOption.name}
                     </p>
                 )}
                 {selectedDeliveryOption && !selectedDeliveryOption.is_pickup && (
                     <p className="text-xs text-muted-foreground text-center">
                        Selected Delivery: {selectedDeliveryOption.name} <br/>
                        {user?.address ? `To: ${user.address}` : "Please ensure your address is updated in your profile."}
                     </p>
                 )}
                 {!canProceedToCheckout && availableCartItems.length > 0 && (
                     <p className="text-xs text-destructive text-center">Please select a delivery/pickup option.</p>
                 )}
                  {availableCartItems.length === 0 && itemCount > 0 && (
                     <p className="text-xs text-destructive text-center">No items available for checkout. Review cart.</p>
                 )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}