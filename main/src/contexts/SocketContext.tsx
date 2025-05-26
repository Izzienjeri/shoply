'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Order, Artwork, Artist, DeliveryOption } from '@/lib/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { formatPrice } from '@/lib/utils';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_IO_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, token, isAuthenticated, isAdmin, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (authIsLoading) return;

    let newSocket: Socket | null = null;

    if (isAuthenticated && token && user && !socket) {
      console.log("Attempting to connect socket...");
      newSocket = io(SOCKET_URL, {
        query: { token },
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket?.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (err: Error & { data?: any }) => {
        console.error('Socket connection error:', err.message, err.data);
        setIsConnected(false);
      });
      
      newSocket.on('connection_ack', (data: { message: string }) => {
        console.log('Socket Connection ACK:', data.message);
      });

      newSocket.on('new_order_admin', (orderData: Order) => {
        console.log('Socket received new_order_admin:', orderData);
        if (isAdmin) {
          toast.info(`🚀 New Order #${orderData.id.substring(0,8)} placed!`, {
            description: `By: ${orderData.user?.email || 'N/A'}, Total: ${formatPrice(orderData.total_price)}`,
            action: { label: 'View Orders', onClick: () => router.push('/admin/orders') },
            duration: 10000,
          });
          queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
          queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
        }
      });

      newSocket.on('order_update_user', (orderData: Order) => {
        console.log('Socket received order_update_user:', orderData);
        if (user && orderData.user_id === user.id) {
          toast.success(`🔔 Order #${orderData.id.substring(0,8)} Status Update`, {
            description: `Status changed to: ${orderData.status.replace('_', ' ')}.`,
            action: { label: 'View My Orders', onClick: () => router.push('/orders') },
            duration: 8000,
          });
          queryClient.invalidateQueries({ queryKey: ['order', orderData.id, user.id] });
          queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      });
      
      newSocket.on('order_update_admin', (orderData: Order) => {
        console.log('Socket received order_update_admin:', orderData);
        if (isAdmin) {
             toast.info(`✍️ Order #${orderData.id.substring(0,8)} (User: ${orderData.user?.email || 'N/A'}) updated.`, {
                description: `New status: ${orderData.status.replace('_', ' ')}.`,
                action: { label: 'View Orders', onClick: () => router.push('/admin/orders')},
                duration: 8000,
             });
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
            queryClient.invalidateQueries({ queryKey: ['adminOrderDetails', orderData.id] });
            queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
        }
      });

      newSocket.on('artwork_update_global', (artworkData: Artwork & { is_deleted?: boolean }) => {
        console.log('Socket received artwork_update_global:', artworkData);
        if (artworkData.is_deleted) {
             toast.info(`Artwork "${artworkData.name}" has been removed.`, { duration: 5000 });
        } else {
             toast.info(`Artwork "${artworkData.name}" has been updated.`, { duration: 5000 });
        }
        
        queryClient.invalidateQueries({ queryKey: ['artworks'] });
        queryClient.invalidateQueries({ queryKey: ['artwork', artworkData.id] });
        queryClient.invalidateQueries({ queryKey: ['adminArtworks'] });
        queryClient.invalidateQueries({ queryKey: ['artistDetails', artworkData.artist_id]});
        queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        queryClient.invalidateQueries({ queryKey: ['search'] });
      });

      newSocket.on('artist_update_global', (artistData: Artist & { is_deleted?: boolean }) => {
        console.log('Socket received artist_update_global:', artistData);
        if (artistData.is_deleted) {
            toast.info(`Artist "${artistData.name}" has been removed.`, { duration: 5000 });
        } else {
            toast.info(`Artist "${artistData.name}" has been updated.`, { duration: 5000 });
        }

        queryClient.invalidateQueries({ queryKey: ['artists'] });
        queryClient.invalidateQueries({ queryKey: ['artistDetails', artistData.id] });
        queryClient.invalidateQueries({ queryKey: ['adminArtists'] });
        queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
        if (artistData.is_active === false || artistData.is_deleted) {
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            queryClient.invalidateQueries({ queryKey: ['adminArtworks'] });
        }
        queryClient.invalidateQueries({ queryKey: ['search'] });
      });

      newSocket.on('delivery_option_update_global', (optionData: DeliveryOption & { is_deleted?: boolean }) => {
        console.log('Socket received delivery_option_update_global:', optionData);
        if (optionData.is_deleted) {
            toast.info(`Delivery option "${optionData.name}" has been removed.`, { duration: 5000 });
        } else {
            toast.info(`Delivery option "${optionData.name}" has been updated.`, { duration: 5000 });
        }

        queryClient.invalidateQueries({ queryKey: ['deliveryOptions'] });
        queryClient.invalidateQueries({ queryKey: ['publicDeliveryOptions'] });
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      });


      setSocket(newSocket);

    } else if (!isAuthenticated && socket) {
      console.log("User not authenticated, disconnecting socket.");
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }

    return () => {
      if (newSocket) {
        console.log("Cleaning up socket connection.");
        newSocket.disconnect();
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('connect_error');
        newSocket.off('connection_ack');
        newSocket.off('new_order_admin');
        newSocket.off('order_update_user');
        newSocket.off('order_update_admin');
        newSocket.off('artwork_update_global');
        newSocket.off('artist_update_global');
        newSocket.off('delivery_option_update_global');
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, token, user, isAdmin, authIsLoading, queryClient, router, socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};