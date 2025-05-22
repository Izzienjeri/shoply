// === lib/types.ts ===
export interface Artist {
  id: string;
  name: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  artworks?: Pick<Artwork, 'id' | 'name' | 'image_url' | 'price' | 'artist' | 'stock_quantity' | 'description'>[]; // For artist detail page
}

export interface Artwork {
  id: string;
  name: string;
  description?: string;
  price: string; // Keep as string, backend sends Decimal as_string=True
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
  artist_id: string; // Received from backend, but mostly use nested artist object
  artist: Pick<Artist, 'id' | 'name'>; // Artist summary
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
  total_price?: string; // Calculated by backend schema
}

export interface OrderItem {
  id: string;
  artwork_id: string;
  quantity: number;
  price_at_purchase: string; // Backend sends Decimal as_string=True
  artwork: Pick<Artwork, 'id' | 'name' | 'image_url' | 'artist'>;
}

export interface Order {
  id: string;
  user_id: string;
  total_price: string; // Backend sends Decimal as_string=True
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
  shipped_at?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  payment_gateway_ref?: string | null;
  items: OrderItem[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  address?: string;
  created_at: string;
  // password_hash is not sent to frontend
}

export interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>; // For validation errors
}

export interface LoginResponse {
    message: string;
    access_token: string;
    // Backend does not send user object on login
}

export interface SignupResponse {
    message: string;
    user: User; // Backend sends user object on signup
}

export interface StkPushInitiationResponse {
  message: string;
  CheckoutRequestID: string;
  ResponseDescription: string;
}

// Type for user data fetched from a /me endpoint (if it existed)
export interface UserProfile extends User {}