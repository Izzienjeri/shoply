'use client';
import React, { useState, useEffect } from 'react';
import { Bell, MailCheck, CircleAlert, AlertTriangle, ShoppingCart, Edit, User, Package, SettingsIcon, Info, CheckCheck, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notification as NotificationInterface, NotificationMessageType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';


const getNotificationIcon = (type: NotificationMessageType) => {
    switch (type) {
        case 'new_order': return <ShoppingCart className="h-4 w-4 text-blue-500 flex-shrink-0" />;
        case 'order_update': return <Edit className="h-4 w-4 text-green-500 flex-shrink-0" />;
        case 'artwork_update': return <Package className="h-4 w-4 text-purple-500 flex-shrink-0" />;
        case 'artist_update': return <User className="h-4 w-4 text-indigo-500 flex-shrink-0" />;
        case 'delivery_option_update': return <SettingsIcon className="h-4 w-4 text-teal-500 flex-shrink-0" />;
        case 'success': return <MailCheck className="h-4 w-4 text-green-500 flex-shrink-0" />;
        case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
        case 'error': return <CircleAlert className="h-4 w-4 text-red-500 flex-shrink-0" />;
        default: return <Info className="h-4 w-4 text-gray-500 flex-shrink-0" />;
    }
};

function NotificationItem({ notification, onMarkRead }: { notification: NotificationInterface, onMarkRead: (id: string) => void }) {
    const handleItemClick = () => {
        if (!notification.read_at) {
            onMarkRead(notification.id);
        }
    };

    const content = (
        <div className="flex items-start space-x-3 p-3 hover:bg-muted/50 transition-colors rounded-md">
            <div className="mt-1">{getNotificationIcon(notification.type)}</div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm break-words", !notification.read_at && "font-semibold")}>{notification.message}</p>
                <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
            </div>
            {!notification.read_at && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 self-start shrink-0 ml-2"></div>}
        </div>
    );

    if (notification.link) {
        return (
            <Link href={notification.link} onClick={handleItemClick} className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-md">
                {content}
            </Link>
        );
    }
    return <div onClick={handleItemClick} className="cursor-pointer block focus:outline-none focus:ring-2 focus:ring-ring rounded-md">{content}</div>;
}

function NotificationListSkeleton() {
    return (
        <div className="space-y-1 p-1">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex items-start space-x-3 p-3">
                    <Skeleton className="h-5 w-5 rounded-full mt-1 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-2 w-2 rounded-full mt-1.5 self-start" />
                </div>
            ))}
        </div>
    );
}


export function NotificationBell() {
    const { 
        paginatedNotificationsResponse, 
        unreadCountForBadge,
        isLoadingGlobal: isBadgeLoading,
        isLoadingList: isPopoverListLoading,
        markAsRead, 
        markAllAsRead,
        showUnreadOnlyInPopover,
        setShowUnreadOnlyInPopover,
        currentPage,
        setCurrentPage
    } = useNotifications();
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen && isAuthenticated) {
            queryClient.invalidateQueries({ queryKey: ['notificationsPopover', currentPage, showUnreadOnlyInPopover, user?.id] });
        }
    }, [isOpen, isAuthenticated, currentPage, showUnreadOnlyInPopover, user?.id, queryClient]);

    const handleMarkAllRead = async () => {
        await markAllAsRead();
    };
    
    const notificationsToDisplay = paginatedNotificationsResponse?.notifications || [];
    const currentUnreadInList = paginatedNotificationsResponse?.unread_count ?? 0;

    if (!isAuthenticated) return null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    { isBadgeLoading && unreadCountForBadge === 0 ? <Skeleton className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full" />
                      : unreadCountForBadge > 0 && (
                        <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 h-4 w-4 min-w-4 p-0 flex items-center justify-center text-xs rounded-full">
                            {unreadCountForBadge > 9 ? '9+' : unreadCountForBadge}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96 p-0 shadow-xl" align="end">
                <div className="p-3 border-b">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-base font-semibold">Notifications</h3>
                        {currentUnreadInList > 0 && (
                            <Button variant="link" size="sm" onClick={handleMarkAllRead} className="p-0 h-auto text-xs text-primary hover:text-primary/80">
                                <CheckCheck className="mr-1 h-3 w-3"/> Mark all as read
                            </Button>
                        )}
                    </div>
                     <div className="flex items-center space-x-2">
                         <Button 
                            variant={showUnreadOnlyInPopover ? "secondary" : "ghost"} 
                            size="sm" 
                            className="text-xs h-7 px-2"
                            onClick={() => { setShowUnreadOnlyInPopover(true); setCurrentPage(1); }}
                         >
                            Unread
                         </Button>
                         <Button 
                            variant={!showUnreadOnlyInPopover ? "secondary" : "ghost"} 
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => { setShowUnreadOnlyInPopover(false); setCurrentPage(1); }}
                         >
                            All
                         </Button>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-7 w-7"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['notificationsPopover', currentPage, showUnreadOnlyInPopover, user?.id] })}
                            disabled={isPopoverListLoading}
                            title="Refresh notifications"
                         >
                            {isPopoverListLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                         </Button>
                     </div>
                </div>
                
                {isPopoverListLoading && notificationsToDisplay.length === 0 ? <NotificationListSkeleton /> : (
                    notificationsToDisplay.length > 0 ? (
                        <ScrollArea className="h-[300px] p-1">
                            <div className="space-y-1">
                                {notificationsToDisplay.map(notif => (
                                    <NotificationItem key={notif.id} notification={notif} onMarkRead={markAsRead} />
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <p className="p-4 text-sm text-center text-muted-foreground">
                            {showUnreadOnlyInPopover ? "No unread notifications." : "No notifications yet."}
                        </p>
                    )
                )}
                {paginatedNotificationsResponse && paginatedNotificationsResponse.pages > 1 && (
                    <>
                        <Separator />
                        <div className="p-2 flex justify-center items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={!paginatedNotificationsResponse.has_prev || isPopoverListLoading}
                            >
                                Previous
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                Page {currentPage} of {paginatedNotificationsResponse.pages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={!paginatedNotificationsResponse.has_next || isPopoverListLoading}
                            >
                                Next
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}