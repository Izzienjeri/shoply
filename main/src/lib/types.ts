
export interface User {
    id: string;
    email: string;
    name?: string;
    address?: string;
    created_at: string;
  }
  
  export interface Product {
    id: string;
    name: string;
    description?: string;
    price: string;
    stock_quantity: number;
    created_at: string;
    updated_at: string;
    image_url?: string;
  }
  
  export interface CartItem {
    id: string;
    product_id: string;
    quantity: number;
    product: Pick<Product, 'id' | 'name' | 'price' | 'image_url'>;
  }
  
  export interface Cart {
    id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    items: CartItem[];
  }
  
  export interface OrderItem {
    id: string;
    product_id: string;
    quantity: number;
    price_at_purchase: string;
    product: Pick<Product, 'id' | 'name' | 'image_url'>;
  }
  
  export interface Order {
    id: string;
    user_id: string;
    total_price: string;
    status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
    created_at: string;
    updated_at: string;
    shipped_at?: string;
    shipping_address?: string;
    billing_address?: string;
    payment_gateway_ref?: string;
    items: OrderItem[];
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



















  