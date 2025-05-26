'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bell, MailCheck, CircleAlert, AlertTriangle, ShoppingCart, Edit, User, Package, SettingsIcon, Info, CheckCheck, Loader2, RefreshCw } from 'lucide-react';

import { Notification as NotificationInterface, PaginatedNotificationsResponse, NotificationMessageType } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const getNotificationIcon = (type: NotificationMessageType, className?: string) => {
    const baseClasses = "h-5 w-5 flex-shrink-0";
    switch (type) {
        case 'new_order': return <ShoppingCart className={cn(baseClasses, "text-blue-500", className)} />;
        case 'order_update': return <Edit className={cn(baseClasses, "text-green-500", className)} />;
        case 'artwork_update': return <Package className={cn(baseClasses, "text-purple-500", className)} />;
        case 'artist_update': return <User className={cn(baseClasses, "text-indigo-500", className)} />;
        case 'delivery_option_update': return <SettingsIcon className={cn(baseClasses, "text-teal-500", className)} />;
        case 'success': return <MailCheck className={cn(baseClasses, "text-green-500", className)} />;
        case 'warning': return <AlertTriangle className={cn(baseClasses, "text-yellow-500", className)} />;
        case 'error': return <CircleAlert className={cn(baseClasses, "text-red-500", className)} />;
        default: return <Info className={cn(baseClasses, "text-gray-500", className)} />;
    }
};

function NotificationItemRow({ notification, onMarkRead }: { notification: NotificationInterface, onMarkRead: (id: string) => Promise<void> }) {
    const [isMarkingRead, setIsMarkingRead] = useState(false);

    const handleMarkReadClick = async (e: React.MouseEvent) => {
        e.stopPropagation(); 
        if (notification.read_at || isMarkingRead) return;
        setIsMarkingRead(true);
        try {
            await onMarkRead(notification.id);
        } finally {
            setIsMarkingRead(false);
        }
    };
    
    const itemContent = (
        <div className={cn(
            "flex items-start space-x-4 p-4 border-b last:border-b-0 border-border/70 hover:bg-muted/50 transition-colors",
            !notification.read_at && "bg-primary/5 hover:bg-primary/10"
        )}>
            <div className="mt-1">{getNotificationIcon(notification.type)}</div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm break-words", !notification.read_at && "font-semibold")}>{notification.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
            </div>
            <div className="flex-shrink-0">
                {!notification.read_at ? (
                    <Button variant="ghost" size="sm" onClick={handleMarkReadClick} disabled={isMarkingRead} className="text-xs h-7 px-2 rounded-md">
                        {isMarkingRead ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCheck className="h-3 w-3 mr-1" />}
                        Mark Read
                    </Button>
                ) : (
                    <Badge variant="outline" className="text-xs">Read</Badge>
                )}
            </div>
        </div>
    );

    if (notification.link) {
        return (
            <Link href={notification.link} className="block focus:outline-none focus:ring-1 focus:ring-ring rounded-md">
                {itemContent}
            </Link>
        );
    }
    return <div className="block focus:outline-none focus:ring-1 focus:ring-ring rounded-md">{itemContent}</div>;
}


export default function AdminNotificationsPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    
    const [currentPage, setCurrentPage] = useState(1);
    const [showUnreadOnly, setShowUnreadOnly] = useState(true);
    const notificationsPerPage = 15;

    const notificationsQueryKey = ['adminNotifications', currentPage, showUnreadOnly, user?.id];
    const { data: paginatedResponse, isLoading, isFetching, error, refetch } = useQuery<PaginatedNotificationsResponse, Error>({
        queryKey: notificationsQueryKey,
        queryFn: () => apiClient.getNotifications({ 
            page: currentPage, 
            per_page: notificationsPerPage, 
            unread_only: showUnreadOnly 
        }),
        enabled: !!user,
        placeholderData: (prev) => prev,
    });

    const markReadMutation = useMutation<NotificationInterface, Error, string>({
        mutationFn: apiClient.markNotificationAsRead,
        onSuccess: (updatedNotification) => {
          queryClient.setQueryData<PaginatedNotificationsResponse>(notificationsQueryKey, (oldData) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              notifications: oldData.notifications.map(n => n.id === updatedNotification.id ? updatedNotification : n),
              unread_count: oldData.unread_count > 0 ? oldData.unread_count -1 : 0,
            };
          });
          queryClient.invalidateQueries({ queryKey: ['notificationsBadge', user?.id] });
        },
        onError: () => toast.error("Failed to mark notification as read."),
    });

    const markAllReadMutation = useMutation<{ message: string, unread_count: number }, Error, void>({
        mutationFn: apiClient.markAllNotificationsAsRead,
        onSuccess: (data) => {
          toast.success(data.message || "All notifications marked as read.");
          refetch(); 
          queryClient.invalidateQueries({ queryKey: ['notificationsBadge', user?.id] });
        },
        onError: () => toast.error("Failed to mark all notifications as read."),
    });
    
    const notifications = paginatedResponse?.notifications || [];
    const totalUnreadInScope = paginatedResponse?.unread_count ?? 0;

    const handleMarkNotificationAsRead = async (id: string): Promise<void> => {
        try {
            await markReadMutation.mutateAsync(id);
        } catch (err) {
        }
    };


    if (isLoading && !paginatedResponse) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex space-x-2"><Skeleton className="h-9 w-20 rounded-md" /><Skeleton className="h-9 w-20 rounded-md" /></div>
                </div>
                <Card className="rounded-lg">
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent className="p-0">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-start space-x-4 p-4 border-b border-border/70">
                                <Skeleton className="h-6 w-6 rounded-full mt-1" />
                                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                                <Skeleton className="h-7 w-20 rounded-md" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (error) {
        return <div className="text-red-500">Error loading notifications: {error.message}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <h1 className="text-3xl font-bold tracking-tight font-serif text-primary mb-4 sm:mb-0 flex items-center"><Bell className="mr-3 h-7 w-7"/>Notifications</h1>
                <div className="flex items-center space-x-2">
                    <Button 
                        variant={showUnreadOnly ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => { setShowUnreadOnly(true); setCurrentPage(1); }}
                        disabled={isFetching}
                        className="rounded-md"
                    >
                        Unread {totalUnreadInScope > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{totalUnreadInScope}</Badge>}
                    </Button>
                    <Button 
                        variant={!showUnreadOnly ? "default" : "outline"} 
                        size="sm"
                        onClick={() => { setShowUnreadOnly(false); setCurrentPage(1); }}
                        disabled={isFetching}
                        className="rounded-md"
                    >
                        All
                    </Button>
                     <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        title="Refresh notifications"
                        className="rounded-md"
                     >
                        {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                     </Button>
                </div>
            </div>

            <Card className="rounded-lg shadow-md">
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle className="font-serif">Notification List</CardTitle>
                        <CardDescription>
                            {showUnreadOnly ? `Showing unread notifications.` : `Showing all notifications.`}
                        </CardDescription>
                    </div>
                    {totalUnreadInScope > 0 && (
                        <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => markAllReadMutation.mutate()}
                            disabled={markAllReadMutation.isPending || isFetching}
                        >
                            {markAllReadMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                            Mark all as read
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {notifications.length > 0 ? (
                        notifications.map(notif => (
                            <NotificationItemRow key={notif.id} notification={notif} onMarkRead={handleMarkNotificationAsRead} />
                        ))
                    ) : (
                        <p className="p-6 text-center text-muted-foreground">
                            {showUnreadOnly ? "No unread notifications." : "No notifications found."}
                        </p>
                    )}
                </CardContent>
            </Card>

            {paginatedResponse && paginatedResponse.pages > 1 && (
                <div className="flex justify-center items-center space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={!paginatedResponse.has_prev || isFetching}
                        className="rounded-md"
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {paginatedResponse.pages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(paginatedResponse.pages, prev + 1))}
                        disabled={!paginatedResponse.has_next || isFetching}
                        className="rounded-md"
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}