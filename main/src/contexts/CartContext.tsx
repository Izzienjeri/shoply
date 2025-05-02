'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Cart, CartItem, Product } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { useAuth } from './AuthContext'; // Use auth context to know if user is logged in

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  itemCount: number;
  totalPrice: number; // Calculate this
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => void; // Local clear on logout etc.
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
        setCart(null); // Clear cart if not authenticated
        return;
    }
    setIsLoading(true);
    try {
      const fetchedCart = await apiClient.get<Cart>('/cart', { needsAuth: true });
      setCart(fetchedCart);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
      // Handle error appropriately, maybe show a toast
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch cart when authentication status changes (and is authenticated)
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      fetchCart();
    } else if (!isAuthLoading && !isAuthenticated) {
      setCart(null); // Clear cart on logout
    }
  }, [isAuthenticated, isAuthLoading, fetchCart]);


  const updateLocalCart = (updatedCart: Cart) => {
      setCart(updatedCart);
  };

  const addToCart = async (productId: string, quantity: number) => {
      if (!isAuthenticated) throw new Error("Please log in to add items to cart.");
      setIsLoading(true);
      try {
          const updatedCart = await apiClient.post<Cart>('/cart', { product_id: productId, quantity }, { needsAuth: true });
          updateLocalCart(updatedCart);
          // Optionally show success toast
      } catch (error) {
          console.error("Failed to add to cart:", error);
          // Show error toast
          throw error;
      } finally {
          setIsLoading(false);
      }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
      if (!isAuthenticated) throw new Error("Authentication error.");
      setIsLoading(true);
      try {
          const updatedCart = await apiClient.put<Cart>(`/cart/items/${itemId}`, { quantity }, { needsAuth: true });
          updateLocalCart(updatedCart);
      } catch (error) {
          console.error("Failed to update cart item:", error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  };

  const removeFromCart = async (itemId: string) => {
      if (!isAuthenticated) throw new Error("Authentication error.");
      setIsLoading(true);
      try {
          const updatedCart = await apiClient.delete<Cart>(`/cart/items/${itemId}`, { needsAuth: true });
          updateLocalCart(updatedCart);
      } catch (error) {
          console.error("Failed to remove cart item:", error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  };

  const clearCart = () => {
      setCart(null); // Only clears local state, backend cart persists until order/logout?
  }

  // Derived state: Item count and Total price
  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const totalPrice = cart?.items.reduce((sum, item) => {
        // Ensure price is treated as a number
       const price = parseFloat(item.product.price) || 0;
       return sum + (price * item.quantity);
  }, 0) ?? 0;


  return (
    <CartContext.Provider value={{ cart, isLoading, fetchCart, addToCart, updateCartItem, removeFromCart, clearCart, itemCount, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};