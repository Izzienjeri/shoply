
export interface Artist {
  id: string;
  name: string;
  bio?: string;
  created_at: string;
  updated_at: string;
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
  artwork: Pick<Artwork, 'id' | 'name' | 'price' | 'image_url' | 'artist'>;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items: CartItem[];
  total_price?: string;
}

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
  total_price: string;
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