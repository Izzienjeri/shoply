'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Package, Users, DollarSign, ShoppingBag, Settings, BarChart3, AlertTriangle, Loader2, CalendarIcon, Palette, ArrowRight, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { AdminDashboardStatsData, Order as OrderType } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Bar, ComposedChart } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { motion } from 'framer-motion';
import { FloatingBlob } from '@/components/ui/effects';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  href?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
  iconColor?: string;
}

function StatCard({ title, value, icon: Icon, href, description, isLoading, className, iconColor }: StatCardProps) {
  const cardContent = (
    <CardContent className="pt-2">
      {isLoading ? (
        <>
          <Skeleton className="h-8 w-24 mb-1 bg-white/20" />
          {description && <Skeleton className="h-4 w-32 bg-white/15" />}
        </>
      ) : (
        <>
          <div className="text-3xl font-bold">{value}</div>
          {description && <p className="text-xs text-white/80 pt-1">{description}</p>}
        </>
      )}
    </CardContent>
  );

  const cardElement = (
    <Card className={cn(
        "shadow-xl hover:shadow-2xl transition-all duration-300 ease-out rounded-2xl border-transparent relative overflow-hidden group flex flex-col",
        "transform hover:-translate-y-1.5 hover:scale-[1.02]",
        className 
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-white/90">{title}</CardTitle>
        <Icon className={cn("h-6 w-6", iconColor ? iconColor : "text-white/70")} />
      </CardHeader>
      <div className="relative z-10 px-5 pb-4 flex-grow flex flex-col justify-center">{cardContent}</div>
    </Card>
  );
  return href ? <Link href={href} className="block h-full">{cardElement}</Link> : <div className="block h-full">{cardElement}</div>;
}

const cardGradients = [
    "bg-gradient-to-br from-rose-500 via-fuchsia-500 to-indigo-600",
    "bg-gradient-to-br from-purple-500 via-pink-500 to-red-500",
    "bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500",
    "bg-gradient-to-br from-teal-400 via-lime-500 to-yellow-500",
];
const iconColors = ["text-rose-100","text-purple-100","text-sky-100","text-teal-100"];

export default function AdminDashboardPage() {
  const [statsData, setStatsData] = useState<AdminDashboardStatsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: startOfMonth(subMonths(today, 5)), to: endOfMonth(today) };
  });

  const fetchDashboardData = useCallback(async (selectedDateRange?: DateRange) => {
    setIsLoadingData(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedDateRange?.from) params.append('start_date', format(selectedDateRange.from, 'yyyy-MM-dd'));
      if (selectedDateRange?.to) params.append('end_date', format(selectedDateRange.to, 'yyyy-MM-dd'));
      
      const data = await apiClient.get<AdminDashboardStatsData>(`/api/admin/dashboard/stats?${params.toString()}`, { needsAuth: true });
      setStatsData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setIsLoadingData(false);
    }
  }, []); 
  
  useEffect(() => {
    fetchDashboardData(dateRange);
  }, []);

  const handleDateRangeApply = () => {
      fetchDashboardData(dateRange);
  }

  const revenueStatDescription = dateRange?.from && dateRange.to
    ? `Revenue: ${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yy")}`
    : `Revenue (Default Range)`;

  const dynamicStats = useMemo(() => statsData ? [
    { title: "Total Artworks", value: statsData.total_artworks, description: `${statsData.active_artworks} active`, icon: Palette, href: "/admin/artworks", className: cardGradients[0], iconColor: iconColors[0], isLoading: isLoadingData },
    { title: "Total Artists", value: statsData.total_artists, description: `${statsData.active_artists} active`, icon: Users, href: "/admin/artists", className: cardGradients[1], iconColor: iconColors[1], isLoading: isLoadingData },
    { title: "Pending Orders", value: statsData.pending_orders_count, description: `${statsData.paid_orders_count} paid (all time)`, icon: ShoppingBag, href: "/admin/orders?status=pending", className: cardGradients[2], iconColor: iconColors[2], isLoading: isLoadingData },
    { title: revenueStatDescription, value: formatPrice(statsData.revenue_this_month), icon: DollarSign, href: "/admin/orders?status=paid", className: cardGradients[3], iconColor: iconColors[3], description: undefined, isLoading: isLoadingData },
  ] : [
    { title: "Total Artworks", value: "0", icon: Palette, href: "/admin/artworks", isLoading: true, className: "bg-muted dark:bg-neutral-800/50", iconColor: "text-muted-foreground", description: "Loading..." },
    { title: "Total Artists", value: "0", icon: Users, href: "/admin/artists", isLoading: true, className: "bg-muted dark:bg-neutral-800/50", iconColor: "text-muted-foreground", description: "Loading..." },
    { title: "Pending Orders", value: "0", icon: ShoppingBag, href: "/admin/orders?status=pending", isLoading: true, className: "bg-muted dark:bg-neutral-800/50", iconColor: "text-muted-foreground", description: "Loading..." },
    { title: revenueStatDescription, value: "Ksh 0.00", icon: DollarSign, href: "#", isLoading: true, className: "bg-muted dark:bg-neutral-800/50", iconColor: "text-muted-foreground", description: "Loading..." },
  ], [statsData, isLoadingData, revenueStatDescription]);

  const pageContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren:0.1 } },
  };
  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 15 } },
  };

  if (error && !isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] p-6 bg-white/70 dark:bg-neutral-800/70 backdrop-blur-md rounded-xl shadow-xl border border-destructive/40">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
        <h2 className="text-2xl font-semibold text-destructive font-serif mb-3">Error Loading Dashboard</h2>
        <p className="text-muted-foreground dark:text-neutral-300 text-center max-w-md mb-6">{error}</p>
        <Button onClick={handleDateRangeApply} className="rounded-md bg-gradient-to-r from-red-500 to-pink-500 text-white hover:opacity-90 transition-opacity shadow-lg hover:shadow-red-500/30">
            <RefreshCcw className="mr-2 h-4 w-4"/> Retry
        </Button>
      </div>
    );
  }
  
  const whiteishTranslucentBg = "bg-white/70 dark:bg-neutral-800/70 backdrop-blur-lg";

  return (
    <motion.div 
        className="space-y-6 md:space-y-8 relative isolate overflow-x-hidden"
        variants={pageContainerVariants}
        initial="hidden"
        animate="visible"
    >
        <FloatingBlob
            className="w-[40vw] h-[40vw] md:w-[30vw] md:h-[30vw] top-[-10%] left-[-15%] opacity-10 md:opacity-15 -z-10"
            gradientClass="bg-gradient-to-br from-purple-500/50 to-pink-500/50"
            animateProps={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.1, 0.9, 1] }}
            transitionProps={{ duration: 45 }}
        />
        <FloatingBlob
            className="w-[35vw] h-[35vw] md:w-[25vw] md:h-[25vw] bottom-[5%] right-[-10%] opacity-10 md:opacity-15 -z-10"
            gradientClass="bg-gradient-to-tr from-sky-400/50 to-teal-400/50"
            animateProps={{ x: [0, -25, 25, 0], y: [0, 25, -20, 0], scale: [1, 0.9, 1.1, 1] }}
            transitionProps={{ duration: 50 }}
        />

      <motion.header 
        variants={itemVariants}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-serif 
                           text-purple-700 dark:text-purple-400"> 
                Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground dark:text-neutral-400">Overview of your art gallery's performance.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <Popover>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"}
                        className={cn("w-full sm:min-w-[240px] justify-start text-left font-normal rounded-md shadow-sm hover:shadow focus-visible:ring-pink-500 border-border/70 hover:border-pink-500/50", !dateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-pink-500/90" />
                        {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-lg shadow-xl border-border" align="end">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                </PopoverContent>
            </Popover>
            <Button onClick={handleDateRangeApply} disabled={isLoadingData} className="w-full sm:w-auto rounded-md bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:opacity-90 transition-opacity shadow hover:shadow-md">
                {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin"/> : "Apply"}
            </Button>
        </div>
      </motion.header>

      <motion.section variants={itemVariants} className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {dynamicStats.map((stat, index) => (
          <StatCard 
            key={stat.title} title={stat.title} value={stat.value as string | number}
            icon={stat.icon} href={stat.href} description={stat.description}
            isLoading={stat.isLoading}
            className={cn(stat.isLoading ? "bg-card dark:bg-neutral-800/60" : stat.className, (!stat.isLoading && stat.className?.includes('gradient')) ? "text-white dark:text-white" : "")}
            iconColor={cn(stat.isLoading ? "text-muted-foreground" : stat.iconColor)}
          />
        ))}
      </motion.section>

      <motion.section variants={itemVariants} className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className={cn("rounded-xl shadow-xl border-purple-500/20 dark:border-purple-400/20 relative z-0 flex flex-col", whiteishTranslucentBg, "lg:min-h-[480px]")}>
          <CardHeader>
            <CardTitle className="font-serif text-xl text-fuchsia-600 dark:text-fuchsia-400">Recent Orders</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-neutral-300/90">Latest orders placed (not date filtered).</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ScrollArea className="h-full max-h-[300px] lg:max-h-full pr-3">
              {isLoadingData && !statsData?.recent_orders ? (
                <div className="space-y-4 py-2">
                  <Skeleton className="h-12 w-full rounded-md bg-muted/50 dark:bg-neutral-700/50" /> 
                  <Skeleton className="h-12 w-full rounded-md bg-muted/50 dark:bg-neutral-700/50" /> 
                  <Skeleton className="h-12 w-full rounded-md bg-muted/50 dark:bg-neutral-700/50" />
                </div>
              ) : statsData && statsData.recent_orders.length > 0 ? (
                <ul className="divide-y divide-border/50 dark:divide-neutral-700/50">
                  {statsData.recent_orders.map((order: OrderType) => (
                    <li key={order.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex justify-between items-center gap-2">
                        <div>
                          <Link href={`/admin/orders?search=${order.id}`} className="text-sm font-medium text-pink-600 hover:text-pink-500 dark:text-pink-400 dark:hover:text-pink-300 hover:underline">Order #{order.id.substring(0, 8)}</Link>
                          <p className="text-xs text-muted-foreground dark:text-neutral-400">{order.user?.email || 'Unknown User'} - {new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-foreground dark:text-neutral-200">{formatPrice(order.total_price)}</p>
                          <Badge variant={order.status === 'paid' || order.status === 'delivered' || order.status === 'picked_up' ? 'default' : order.status === 'pending' ? 'secondary' : order.status === 'shipped' ? 'outline' : 'destructive'} 
                              className={cn("capitalize mt-1 text-xs px-2 py-0.5",
                                  (order.status === 'paid' || order.status === 'delivered' || order.status === 'picked_up') && "bg-green-500/90 hover:bg-green-600/90 text-white dark:bg-green-600/90 dark:hover:bg-green-700/90",
                                  order.status === 'shipped' && "border-blue-500/80 text-blue-600 dark:text-blue-400 dark:border-blue-400/80",
                                  order.status === 'pending' && "bg-yellow-500/80 hover:bg-yellow-600/90 text-yellow-900 dark:text-yellow-100 dark:bg-yellow-600/80 dark:hover:bg-yellow-700/90",
                                  order.status === 'cancelled' && "bg-red-500/90 hover:bg-red-600/90 text-white dark:bg-red-600/90 dark:hover:bg-red-700/90"
                              )}>{order.status.replace('_', ' ')}</Badge>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (<p className="text-muted-foreground dark:text-neutral-400 text-center py-10">No recent orders found.</p>)}
            </ScrollArea>
          </CardContent>
           {statsData && statsData.recent_orders.length > 0 && (
            <CardFooter className="pt-4 border-t border-border/50 dark:border-neutral-700/50 mt-auto">
                <Link href="/admin/orders">
                    <Button variant="link" className="text-sm font-medium text-pink-600 hover:text-pink-500 dark:text-pink-400 dark:hover:text-pink-300 p-0">View all orders <ArrowRight className="ml-1.5 h-4 w-4"/></Button>
                </Link>
            </CardFooter>
            )}
        </Card>

        <Card className={cn("rounded-xl shadow-xl border-sky-500/20 dark:border-sky-400/20 relative z-0 flex flex-col", whiteishTranslucentBg, "lg:min-h-[480px]")}>
          <CardHeader>
            <CardTitle className="font-serif text-xl text-sky-600 dark:text-sky-400">Sales Analytics</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-neutral-300/90">Monthly revenue for {dateRange?.from && dateRange.to ? `selected range` : `the default range`}.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center p-2 sm:p-4">
            {isLoadingData && !statsData?.sales_trend ? ( <Skeleton className="h-[280px] sm:h-[300px] w-full bg-muted/50 dark:bg-neutral-700/50" /> ) : 
             statsData && statsData.sales_trend.length > 0 ? (
              <div className="h-[280px] sm:h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                     <ComposedChart data={statsData.sales_trend} margin={{ top: 5, right: 15, left: -10, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                         <XAxis dataKey="month" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border) / 0.6)" />
                         <YAxis fontSize={10} tickFormatter={(value) => `Ksh ${value/1000}k`} tick={{ fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border) / 0.6)"/>
                         <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-lg)', boxShadow: '0 6px 16px rgba(0,0,0,0.12)'}} 
                            labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: '600', marginBottom:'4px', borderBottom: '1px solid hsl(var(--border))', paddingBottom:'4px'}}
                            itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                            formatter={(value: number) => [formatPrice(value.toString()), "Revenue"]} 
                         />
                         <Legend wrapperStyle={{ fontSize: "12px", color: 'hsl(var(--muted-foreground))', paddingTop: '10px' }} />
                         <Bar dataKey="revenue" fill="hsl(var(--primary) / 0.5)" barSize={25} radius={[5, 5, 0, 0]} />
                         <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth:2, stroke: 'hsl(var(--background))' }} activeDot={{ r: 6, strokeWidth:0, fill: 'hsl(var(--ring))' }} />
                     </ComposedChart>
                 </ResponsiveContainer>
              </div>
            ) : (<div className="h-[280px] sm:h-[300px] bg-muted/20 dark:bg-neutral-700/30 flex items-center justify-center rounded-md w-full"><p className="text-muted-foreground dark:text-neutral-400">No sales data for the selected range.</p></div>)}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section variants={itemVariants}>
          <h2 className="text-2xl font-semibold mb-4 font-serif text-emerald-600 dark:text-emerald-400">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {label: "Add New Artwork", description: "Showcase a new masterpiece.", href:"/admin/artworks/new", icon: Package, gradFrom: "rose", iconColor:"text-rose-500 dark:text-rose-400"},
                {label: "Add New Artist", description: "Introduce a new talent.", href:"/admin/artists/new", icon: Users, gradFrom: "purple", iconColor:"text-purple-500 dark:text-purple-400"},
                {label: "Manage Delivery", description: "Configure shipping options.", href:"/admin/delivery-options", icon: Settings, gradFrom: "sky", iconColor:"text-sky-500 dark:text-sky-400"},
              ].map(action => (
                  <Link href={action.href} key={action.label} className="group block h-full">
                      <div className={cn(
                          "p-0.5 rounded-xl transition-all duration-300 hover:shadow-xl h-full", 
                          `bg-gradient-to-br from-${action.gradFrom}-400/20 to-${action.gradFrom}-500/20 dark:from-${action.gradFrom}-600/25 dark:to-${action.gradFrom}-700/25`
                       )}>
                        <div className={cn(
                            "w-full p-5 h-full text-left rounded-[calc(0.75rem-2px)] shadow-sm transition-all duration-200 flex flex-col sm:flex-row sm:items-start space-y-2 sm:space-y-0 sm:space-x-3.5",
                            "bg-card hover:bg-accent/30 dark:bg-neutral-800 hover:dark:bg-neutral-700/60"
                        )}>
                            <action.icon className={cn("mt-1 sm:mt-0 h-7 w-7 flex-shrink-0", action.iconColor)} strokeWidth={1.75}/>
                            <div>
                                <p className="font-semibold text-base text-foreground dark:text-neutral-100 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-purple-500 transition-all">{action.label}</p>
                                <p className="text-xs text-muted-foreground dark:text-neutral-400 mt-0.5">{action.description}</p>
                            </div>
                        </div>
                      </div>
                  </Link>
              ))}
          </div>
      </motion.section>
    </motion.div>
  );
}