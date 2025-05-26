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
    if (authIsLoading) {
      return;
    }

    if (isAuthenticated && token && user) {
      if (!socket || !socket.connected) {
        
        if (socket) {
            socket.disconnect();
        }

        const newSocketInstance = io(SOCKET_URL, {
          query: { token },
          transports: ['websocket'],
        });

        newSocketInstance.on('connect', () => {
          console.log('Socket connected:', newSocketInstance.id);
          setIsConnected(true);
        });

        newSocketInstance.on('disconnect', (reason) => {
          console.log('Socket disconnected:', newSocketInstance.id, reason);
          setIsConnected(false);
        });

        newSocketInstance.on('connect_error', (err: Error & { data?: any }) => {
          console.error('Socket connection error:', err.message, err.data);
          setIsConnected(false);
        });
        
        newSocketInstance.on('connection_ack', (data: { message: string }) => {
          console.log('Socket Connection ACK:', data.message);
        });


        newSocketInstance.on('order_update_user_toast', (orderData: Order) => {
          console.log('Socket received order_update_user_toast:', orderData);
          if (user && orderData.user_id === user.id) {
            let descriptionMessage = `Status changed to: ${orderData.status.replace('_', ' ')}.`;
            if (orderData.status === 'picked_up' && orderData.picked_up_by_name) {
                descriptionMessage = `Your order has been picked up by ${orderData.picked_up_by_name}.`;
            } else if (orderData.status === 'delivered') {
                descriptionMessage = "Your order has been delivered!";
            }

            toast.success(`🔔 Order #${orderData.id.substring(0,8)} Status Update`, {
              description: descriptionMessage,
              action: { label: 'View Order', onClick: () => router.push(`/orders/${orderData.id}`) },
              duration: 10000,
            });
            queryClient.invalidateQueries({ queryKey: ['order', orderData.id, user.id] });
            queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          }
        });
        
        
        setSocket(newSocketInstance);


        return () => {
            console.log(`SocketContext: Cleaning up socket instance (${newSocketInstance.id}) due to effect re-run or unmount.`);
            newSocketInstance.disconnect();
        };
      }
    } else if (!isAuthenticated && socket) {
      console.log("SocketContext: User not authenticated, disconnecting existing socket.");
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, token, user, isAdmin, authIsLoading, queryClient, router]);


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