// === lib/types.ts ===
export interface Artist {
  id: string;
  name: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  artworks?: Pick<Artwork, 'id' | 'name' | 'image_url' | 'price' | 'artist' | 'stock_quantity' | 'description'>[];
}

export interface Artwork {
  id: string;
  name: string;
  description?: string;
  price: string;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
  artist_id: string;
  artist: Pick<Artist, 'id' | 'name'>;
}

export interface CartItem {
  id: string;
  artwork_id: string;
  quantity: number;
  artwork: Pick<Artwork, 'id' | 'name' | 'price' | 'image_url' | 'artist' | 'stock_quantity'>;
}
export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items: CartItem[];
  total_price?: string; // This is cart subtotal from backend CartSchema
}

// --- NEW ---
export interface DeliveryOption {
  id: string;
  name: string;
  price: string; // Keep as string from backend
  description?: string | null;
  is_pickup: boolean;
  active: boolean; // Though API only sends active ones
  sort_order: number;
}
// --- END NEW ---

export interface OrderItem {
  id: string;
  artwork_id: string;
  quantity: number;
  price_at_purchase: string;
  artwork: Pick<Artwork, 'id' | 'name' | 'image_url' | 'artist'>;
}

export interface Order {
  id: string;
  user_id: string;
  total_price: string; // Grand Total (items + delivery)
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'; // Add other failure statuses if needed for specific UI
  created_at: string;
  updated_at: string;
  shipped_at?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  payment_gateway_ref?: string | null;
  items: OrderItem[];
  // --- UPDATED ---
  delivery_fee?: string; // Optional because older orders might not have it
  delivery_option_details?: Pick<DeliveryOption, 'id' | 'name' | 'price' | 'is_pickup' | 'description'>; // Nested details
  // --- END UPDATED ---
}

export interface User {
  id: string;
  email: string;
  name?: string;
  address?: string; // This is the default shipping address
  created_at: string;
}

export interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}

export interface LoginResponse {
    message: string;
    access_token: string;
}

export interface SignupResponse {
    message: string;
    user: User;
}

export interface StkPushInitiationResponse {
  message: string;
  CheckoutRequestID: string;
  ResponseDescription: string;
  transaction_id: string; // Added this earlier, make sure it's used if present
}

export interface UserProfile extends User {}

// For payment status polling on cart page
export interface PaymentTransactionStatusResponse {
    status: 'initiated' | 'pending_stk_initiation' | 'pending_confirmation' | 'successful' | 'failed_stk_initiation' | 'failed_stk_missing_id' | 'failed_underpaid' | 'failed_processing_error' | 'cancelled_by_user' | 'failed_daraja' | 'failed_timeout' | 'failed_missing_receipt' | 'not_found';
    checkout_request_id: string | null;
    message: string;
    order_id?: string;
}