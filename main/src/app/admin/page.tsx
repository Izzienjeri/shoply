'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Users, DollarSign, ShoppingBag, Settings, BarChart3, AlertTriangle, Loader2, CalendarIcon } from "lucide-react";
import Link from "next/link";
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { AdminDashboardStatsData, Order as OrderType } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

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
    <Card className={cn("hover:shadow-lg transition-shadow rounded-lg", href && "cursor-pointer")}>
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
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const fetchDashboardData = async (selectedDateRange?: DateRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedDateRange?.from) {
        params.append('start_date', format(selectedDateRange.from, 'yyyy-MM-dd'));
      }
      if (selectedDateRange?.to) {
        params.append('end_date', format(selectedDateRange.to, 'yyyy-MM-dd'));
      }
      
      const data = await apiClient.get<AdminDashboardStatsData>(`/api/admin/dashboard/stats?${params.toString()}`, { needsAuth: true });
      setStatsData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchDashboardData(dateRange);
  }, [dateRange]);

  const revenueStatDescription = dateRange?.from && dateRange.to
    ? `Revenue from ${format(dateRange.from, "LLL dd, y")} to ${format(dateRange.to, "LLL dd, y")}`
    : "Revenue (This Month)";

  const dynamicStats = statsData ? [
    { title: "Total Artworks", value: statsData.total_artworks, description: `${statsData.active_artworks} active`, icon: Package, href: "/admin/artworks" },
    { title: "Total Artists", value: statsData.total_artists, description: `${statsData.active_artists} active`, icon: Users, href: "/admin/artists" },
    { title: "Pending Orders", value: statsData.pending_orders_count, description: `${statsData.paid_orders_count} paid (all time)`, icon: ShoppingBag, href: "/admin/orders?status=pending" },
    { title: revenueStatDescription, value: formatPrice(statsData.revenue_this_month), icon: DollarSign, href: "/admin/orders?status=paid" },
  ] : [
    { title: "Total Artworks", value: "0", icon: Package, href: "/admin/artworks", isLoading: true },
    { title: "Total Artists", value: "0", icon: Users, href: "/admin/artists", isLoading: true },
    { title: "Pending Orders", value: "0", icon: ShoppingBag, href: "/admin/orders?status=pending", isLoading: true },
    { title: revenueStatDescription, value: "Ksh 0.00", icon: DollarSign, href: "#", isLoading: true },
  ];


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive font-serif">Error Loading Dashboard</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => fetchDashboardData(dateRange)} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif text-primary">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of your art store.</p>
        </div>
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                        "w-full sm:w-[300px] justify-start text-left font-normal mt-4 sm:mt-0 rounded-md",
                        !dateRange && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                        dateRange.to ? (
                        <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                        </>
                        ) : (
                        format(dateRange.from, "LLL dd, y")
                        )
                    ) : (
                        <span>Pick a date range</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-lg" align="end">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                />
            </PopoverContent>
        </Popover>
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
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="font-serif">Recent Orders</CardTitle>
            <CardDescription>A list of the most recent orders (not date filtered).</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !statsData?.recent_orders ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : statsData && statsData.recent_orders.length > 0 ? (
              <ul className="divide-y divide-border">
                {statsData.recent_orders.map((order: OrderType) => (
                  <li key={order.id} className="py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-foreground">Order #{order.id.substring(0, 8)}...</p>
                        <p className="text-xs text-muted-foreground">
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
                            className="capitalize mt-1 text-xs"
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
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="font-serif">Sales Analytics</CardTitle>
             <CardDescription>
                Monthly sales performance for {dateRange?.from && dateRange.to ? `selected range` : `last 6 months`}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !statsData?.sales_trend ? (
              <Skeleton className="h-64 w-full" />
            ) : statsData && statsData.sales_trend.length > 0 ? (
              <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={statsData.sales_trend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                         <XAxis dataKey="month" fontSize={12} tick={{ fill: 'var(--muted-foreground)' }} />
                         <YAxis fontSize={12} tickFormatter={(value) => `Ksh ${value/1000}k`} tick={{ fill: 'var(--muted-foreground)' }}/>
                         <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)'}} 
                            labelStyle={{ color: 'var(--popover-foreground)'}}
                            formatter={(value: number) => [formatPrice(value.toString()), "Revenue"]} 
                         />
                         <Legend wrapperStyle={{ fontSize: "12px", color: 'var(--muted-foreground)' }} />
                         <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} activeDot={{ r: 6, fill: 'var(--primary)' }} dot={{fill: 'var(--primary)'}} />
                     </LineChart>
                 </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 bg-muted/50 flex items-center justify-center rounded-md">
                <p className="text-muted-foreground">No sales data available for chart in the selected range.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
          <h2 className="text-xl font-semibold mb-4 font-serif text-foreground/90">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Link href="/admin/artworks/new">
                  <Button variant="outline" className="w-full justify-start p-4 h-auto text-left rounded-lg hover:shadow-md transition-shadow">
                      <Package className="mr-3 h-5 w-5 flex-shrink-0 text-primary" />
                      <div>
                          <p className="font-semibold">Add New Artwork</p>
                          <p className="text-xs text-muted-foreground">Create a new piece for the gallery.</p>
                      </div>
                  </Button>
              </Link>
              <Link href="/admin/artists/new">
                   <Button variant="outline" className="w-full justify-start p-4 h-auto text-left rounded-lg hover:shadow-md transition-shadow">
                      <Users className="mr-3 h-5 w-5 flex-shrink-0 text-primary" />
                       <div>
                          <p className="font-semibold">Add New Artist</p>
                          <p className="text-xs text-muted-foreground">Register a new artist profile.</p>
                      </div>
                  </Button>
              </Link>
               <Link href="/admin/delivery-options">
                   <Button variant="outline" className="w-full justify-start p-4 h-auto text-left rounded-lg hover:shadow-md transition-shadow">
                      <Settings className="mr-3 h-5 w-5 flex-shrink-0 text-primary" />
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