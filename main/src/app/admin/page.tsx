'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Users, DollarSign, ShoppingBag, Settings, BarChart3, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { AdminDashboardStatsData, Order as OrderType } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { Badge } from '@/components/ui/badge';


interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  href?: string;
  description?: string;
  isLoading?: boolean;
}

function StatCard({ title, value, icon: Icon, href, description, isLoading }: StatCardProps) {
  const cardElement = (
    <Card className={cn("hover:shadow-lg transition-shadow", href && "cursor-pointer")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-24 mb-1" />
            {description && <Skeleton className="h-4 w-32" />}
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{cardElement}</Link> : cardElement;
}

export default function AdminDashboardPage() {
  const [statsData, setStatsData] = useState<AdminDashboardStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<AdminDashboardStatsData>('/admin/dashboard/stats', { needsAuth: true });
        setStatsData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data.");
        console.error("Dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const dynamicStats = statsData ? [
    { title: "Total Artworks", value: statsData.total_artworks, description: `${statsData.active_artworks} active`, icon: Package, href: "/admin/artworks" },
    { title: "Total Artists", value: statsData.total_artists, description: `${statsData.active_artists} active`, icon: Users, href: "/admin/artists" },
    { title: "Pending Orders", value: statsData.pending_orders_count, description: `${statsData.paid_orders_count} paid`, icon: ShoppingBag, href: "/admin/orders?status=pending" },
    { title: "Revenue (This Month)", value: formatPrice(statsData.revenue_this_month), icon: DollarSign, href: "/admin/orders?status=paid" },
  ] : [
    { title: "Total Artworks", value: "0", icon: Package, href: "/admin/artworks", isLoading: true },
    { title: "Total Artists", value: "0", icon: Users, href: "/admin/artists", isLoading: true },
    { title: "Pending Orders", value: "0", icon: ShoppingBag, href: "/admin/orders?status=pending", isLoading: true },
    { title: "Revenue (This Month)", value: "Ksh 0.00", icon: DollarSign, href: "#", isLoading: true },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive">Error Loading Dashboard</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Overview of your art store.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {dynamicStats.map((stat) => (
          <StatCard 
            key={stat.title}
            title={stat.title}
            value={stat.value as string | number}
            icon={stat.icon}
            href={stat.href}
            description={(stat as any).description}
            isLoading={isLoading || (stat as any).isLoading}
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>A list of the most recent orders.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !statsData?.recent_orders ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : statsData && statsData.recent_orders.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {statsData.recent_orders.map((order: OrderType) => (
                  <li key={order.id} className="py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Order #{order.id.substring(0, 8)}...</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {order.user?.email || 'Unknown User'} - {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                         <p className="text-sm font-semibold">{formatPrice(order.total_price)}</p>
                         <Badge 
                            variant={
                                order.status === 'paid' || order.status === 'delivered' || order.status === 'picked_up' ? 'default' :
                                order.status === 'pending' ? 'secondary' :
                                order.status === 'shipped' ? 'outline' :
                                'destructive'
                            } 
                            className="capitalize mt-1"
                         >
                             {order.status.replace('_', ' ')}
                         </Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No recent orders found.</p>
            )}
            <div className="mt-4">
                <Link href="/admin/orders" className="text-sm font-medium text-primary hover:underline">
                    View all orders →
                </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales Analytics</CardTitle>
             <CardDescription>Monthly sales performance chart (last 6 months).</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !statsData?.sales_trend ? (
              <Skeleton className="h-64 w-full" />
            ) : statsData && statsData.sales_trend.length > 0 ? (
              <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={statsData.sales_trend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis dataKey="month" fontSize={12} />
                         <YAxis fontSize={12} tickFormatter={(value) => `Ksh ${value/1000}k`} />
                         <Tooltip formatter={(value: number) => [formatPrice(value.toString()), "Revenue"]} />
                         <Legend wrapperStyle={{ fontSize: "12px" }} />
                         <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 6 }} />
                     </LineChart>
                 </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-md">
                <p className="text-muted-foreground">No sales data available for chart.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Link href="/admin/artworks/new">
                  <Button variant="outline" className="w-full justify-start p-4 h-auto text-left">
                      <Package className="mr-3 h-5 w-5 flex-shrink-0" />
                      <div>
                          <p className="font-semibold">Add New Artwork</p>
                          <p className="text-xs text-muted-foreground">Create a new piece for the gallery.</p>
                      </div>
                  </Button>
              </Link>
              <Link href="/admin/artists/new">
                   <Button variant="outline" className="w-full justify-start p-4 h-auto text-left">
                      <Users className="mr-3 h-5 w-5 flex-shrink-0" />
                       <div>
                          <p className="font-semibold">Add New Artist</p>
                          <p className="text-xs text-muted-foreground">Register a new artist profile.</p>
                      </div>
                  </Button>
              </Link>
               <Link href="/admin/delivery-options">
                   <Button variant="outline" className="w-full justify-start p-4 h-auto text-left">
                      <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
                       <div>
                          <p className="font-semibold">Manage Delivery Options</p>
                          <p className="text-xs text-muted-foreground">Update shipping & pickup methods.</p>
                      </div>
                  </Button>
              </Link>
          </div>
      </section>
    </div>
  );
}