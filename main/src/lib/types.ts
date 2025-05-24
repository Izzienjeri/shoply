export interface Artist {
  id: string;
  name: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  artworks?: Pick<Artwork, 'id' | 'name' | 'image_url' | 'price' | 'artist' | 'stock_quantity' | 'description' | 'is_active'>[];
  artworks_count?: number;
  is_active?: boolean;
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
  artist: Pick<Artist, 'id' | 'name' | 'is_active'>;
  is_active?: boolean;
}

export interface CartItem {
  id: string;
  artwork_id: string;
  quantity: number;
  artwork: Pick<Artwork, 'id' | 'name' | 'price' | 'image_url' | 'artist' | 'stock_quantity' | 'is_active'>;
}
export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items: CartItem[];
  total_price?: string;
}

export interface DeliveryOption {
  id: string;
  name: string;
  price: string;
  description?: string | null;
  is_pickup: boolean;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  artwork_id: string;
  quantity: number;
  price_at_purchase: string;
  artwork: Pick<Artwork, 'id' | 'name' | 'image_url' | 'artist' | 'is_active'>; 
}

export interface Order {
  id: string;
  user_id: string;
  user?: Pick<User, 'id' | 'email' | 'name'>;
  total_price: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'picked_up';
  created_at: string;
  updated_at: string;
  shipped_at?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  payment_gateway_ref?: string | null;
  items: OrderItem[];
  delivery_fee?: string;
  delivery_option_details?: Pick<DeliveryOption, 'id' | 'name' | 'price' | 'is_pickup' | 'description'>;
  picked_up_by_name?: string | null;
  picked_up_by_id_no?: string | null;
  picked_up_at?: string | null;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  address?: string;
  created_at: string;
  is_admin?: boolean;
}

export interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}

export interface LoginResponse {
    message: string;
    access_token: string;
    user?: {
      id: string;
      email: string;
      name?: string;
      is_admin?: boolean;
    }
}

export interface SignupResponse {
    message: string;
    user: User;
}

export interface StkPushInitiationResponse {
  message: string;
  CheckoutRequestID: string;
  ResponseDescription: string;
  transaction_id: string;
}

export interface UserProfile extends User {}

export interface PaymentTransactionStatusResponse {
    status: 'initiated' | 'pending_stk_initiation' | 'pending_confirmation' | 'successful' | 'failed_stk_initiation' | 'failed_stk_missing_id' | 'failed_underpaid' | 'failed_processing_error' | 'cancelled_by_user' | 'failed_daraja' | 'failed_timeout' | 'failed_missing_receipt' | 'not_found';
    checkout_request_id: string | null;
    message: string;
    order_id?: string;
}

export interface AdminOrderUpdatePayload {
    status?: Order['status'];
    picked_up_by_name?: string;
    picked_up_by_id_no?: string;
}

export interface AdminDashboardStatsData {
  total_artworks: number;
  active_artworks: number;
  total_artists: number;
  active_artists: number;
  pending_orders_count: number;
  paid_orders_count: number;
  revenue_this_month: string;
  recent_orders: Order[];
  sales_trend: { month: string; revenue: number }[];
}