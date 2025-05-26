'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { Notification, PaginatedNotificationsResponse } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { toast } from 'sonner';


interface NotificationContextType {
  paginatedNotificationsResponse: PaginatedNotificationsResponse | undefined;
  unreadCountForBadge: number;
  isLoadingGlobal: boolean;
  isLoadingList: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  showUnreadOnlyInPopover: boolean;
  setShowUnreadOnlyInPopover: (unread: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [currentPage, setCurrentPage] = useState(1);
  const [showUnreadOnlyInPopover, setShowUnreadOnlyInPopover] = useState(true);

  const badgeQueryKey: QueryKey = ['notificationsBadge', user?.id];
  const { data: badgeData, isLoading: isLoadingGlobal, refetch: refetchBadge } = useQuery<PaginatedNotificationsResponse, Error>({
    queryKey: badgeQueryKey,
    queryFn: () => apiClient.getNotifications({ page: 1, per_page: 1, unread_only: true })
      .then(data => data || { notifications: [], total: 0, pages: 0, current_page: 1, per_page: 1, has_next: false, has_prev: false, unread_count: 0 }),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
  const unreadCountForBadge = badgeData?.unread_count ?? 0;

  const popoverListQueryKey: QueryKey = ['notificationsPopover', currentPage, showUnreadOnlyInPopover, user?.id];
  const { data: paginatedNotificationsResponse, isLoading: isLoadingList, refetch: refetchPopoverList } = useQuery<PaginatedNotificationsResponse, Error>({
    queryKey: popoverListQueryKey,
    queryFn: () => apiClient.getNotifications({ page: currentPage, per_page: 7, unread_only: showUnreadOnlyInPopover })
      .then(data => data || { notifications: [], total: 0, pages: 0, current_page: 1, per_page: 7, has_next: false, has_prev: false, unread_count: 0 }),
    enabled: false,
    placeholderData: (prev) => prev,
  });
  
  const markReadMutation = useMutation<Notification, Error, string>({
    mutationFn: (notificationId) => apiClient.markNotificationAsRead(notificationId).then(data => {
      if (!data) throw new Error("Failed to mark as read"); return data;
    }),
    onSuccess: (updatedNotification) => {
      queryClient.setQueryData<PaginatedNotificationsResponse>(popoverListQueryKey, (oldData) => {
        if (!oldData) return oldData;
        const wasUnread = !oldData.notifications.find(n => n.id === updatedNotification.id)?.read_at;
        return {
          ...oldData,
          notifications: oldData.notifications.map(n => n.id === updatedNotification.id ? updatedNotification : n),
          unread_count: wasUnread ? Math.max(0, oldData.unread_count - 1) : oldData.unread_count,
        };
      });
      refetchBadge();
    },
    onError: () => {
        toast.error("Failed to mark notification as read.");
    }
  });

  const markAllReadMutation = useMutation<{ message: string, unread_count: number }, Error>({
    mutationFn: apiClient.markAllNotificationsAsRead,
    onSuccess: (data) => {
      queryClient.setQueryData<PaginatedNotificationsResponse>(popoverListQueryKey, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          notifications: oldData.notifications.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
          unread_count: data.unread_count 
        };
      });
      toast.success(data.message || "All notifications marked as read.");
      refetchBadge();
    },
    onError: () => {
        toast.error("Failed to mark all notifications as read.");
    }
  });

  useEffect(() => {
     if (socket && isAuthenticated) {
        const handleNewNotification = (notificationData: Notification) => {
            toast.info(notificationData.message, {
                description: `Received: ${new Date(notificationData.created_at).toLocaleTimeString()}`,
                duration: 8000,
                action: notificationData.link ? { label: "View", onClick: () => window.location.href = notificationData.link! } : undefined
            });
            refetchBadge();
            if (paginatedNotificationsResponse) {
                 refetchPopoverList();
            }
        };
        socket.on('new_notification_available', handleNewNotification);
        return () => {
            socket.off('new_notification_available', handleNewNotification);
        };
     }
  }, [socket, isAuthenticated, refetchBadge, refetchPopoverList, paginatedNotificationsResponse]);

  return (
    <NotificationContext.Provider value={{
      paginatedNotificationsResponse,
      unreadCountForBadge,
      isLoadingGlobal,
      isLoadingList,
      markAsRead: markReadMutation.mutateAsync,
      markAllAsRead: markAllReadMutation.mutateAsync,
      currentPage,
      setCurrentPage,
      showUnreadOnlyInPopover,
      setShowUnreadOnlyInPopover,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};