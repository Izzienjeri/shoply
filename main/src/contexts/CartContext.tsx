'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Cart, CartItem, Artwork } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  itemCount: number;
  totalPrice: number;
  fetchCart: () => Promise<void>;
  addToCart: (artworkId: string, quantity: number) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
        setCart(null);
        return;
    }
    if (isLoading) return;
    setIsLoading(true);
    try {
      const fetchedCart = await apiClient.get<Cart>('/api/cart', { needsAuth: true });
      setCart(fetchedCart);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setIsLoading(false); 
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      fetchCart();
    } else if (!isAuthLoading && !isAuthenticated) {
      setCart(null);
    }
  }, [isAuthenticated, isAuthLoading, fetchCart]);


  const updateLocalCart = (updatedCart: Cart | null) => {
      setCart(updatedCart);
  };

  const addToCart = async (artworkId: string, quantity: number) => {
      if (!isAuthenticated) {
          toast.error("Please log in to add items to cart.");
          throw new Error("Please log in to add items to cart.");
      }
      setIsLoading(true);
      try {
          const updatedCart = await apiClient.post<Cart>(
              '/api/cart',
              { artwork_id: artworkId, quantity },
              { needsAuth: true }
          );
          if (updatedCart) {
              updateLocalCart(updatedCart);
              toast.success("Item added to cart!");
          } else {
            await fetchCart();
            toast.success("Item added to cart!");
          }
      } catch (error: any) {
          console.error("Failed to add to cart:", error);
          toast.error(error.message || "Failed to add item to cart.");
          throw error;
      } finally {
          setIsLoading(false);
      }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
      if (!isAuthenticated) {
          toast.error("Authentication error.");
          throw new Error("Authentication error.");
      }
      setIsLoading(true);
      try {
          const updatedCart = await apiClient.put<Cart>(`/api/cart/items/${itemId}`, { quantity }, { needsAuth: true });
          if (updatedCart) {
              updateLocalCart(updatedCart);
              toast.success("Cart updated.");
          } else {
            await fetchCart();
            toast.success("Cart updated.");
          }
      } catch (error: any) {
          console.error("Failed to update cart item:", error);
          toast.error(error.message || "Failed to update item quantity.");
          throw error;
      } finally {
          setIsLoading(false);
      }
  };

  const removeFromCart = async (itemId: string) => {
      if (!isAuthenticated) {
          toast.error("Authentication error.");
          throw new Error("Authentication error.");
      }
      setIsLoading(true);
      try {
          const updatedCart = await apiClient.delete<Cart | null>(`/api/cart/items/${itemId}`, { needsAuth: true });
           if (updatedCart) {
               updateLocalCart(updatedCart);
               toast.success("Item removed from cart.");
           } else {
               await fetchCart();
               toast.success("Item removed from cart.");
           }
      } catch (error: any) {
          console.error("Failed to remove cart item:", error);
           toast.error(error.message || "Failed to remove item from cart.");
          throw error;
      } finally {
          setIsLoading(false);
      }
  };

  const clearCart = () => {
      setCart(null);
  }

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const totalPrice = cart?.items.reduce((sum, item) => {
       const price = parseFloat(item.artwork.price) || 0;
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