// === app/admin/page.tsx ===
'use client'; // Make it a client component to use hooks if needed

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Users, DollarSign, ShoppingBag, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from '@/components/ui/button';

// Dummy data for now, replace with API calls later
const stats = [
    { title: "Total Artworks", value: "120", icon: Package, href: "/admin/artworks" },
    { title: "Total Artists", value: "15", icon: Users, href: "/admin/artists" },
    { title: "Pending Orders", value: "5", icon: ShoppingBag, href: "/admin/orders?status=pending" },
    { title: "Total Revenue (Month)", value: "Ksh 250,000", icon: DollarSign, href: "#" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Overview of your art store.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href} passHref>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>A list of the most recent orders.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for recent orders list - to be implemented */}
            <p className="text-muted-foreground">Recent orders will be displayed here.</p>
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
             <CardDescription>Monthly sales performance chart.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for sales chart - to be implemented */}
            <div className="h-64 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-md">
              <p className="text-muted-foreground">Sales chart will be displayed here.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions Section */}
      <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Link href="/admin/artworks/new" passHref>
                  <Button variant="outline" className="w-full justify-start p-4 h-auto">
                      <Package className="mr-3 h-5 w-5" />
                      <div>
                          <p className="font-semibold">Add New Artwork</p>
                          <p className="text-xs text-muted-foreground">Create a new piece for the gallery.</p>
                      </div>
                  </Button>
              </Link>
              <Link href="/admin/artists/new" passHref>
                   <Button variant="outline" className="w-full justify-start p-4 h-auto">
                      <Users className="mr-3 h-5 w-5" />
                       <div>
                          <p className="font-semibold">Add New Artist</p>
                          <p className="text-xs text-muted-foreground">Register a new artist profile.</p>
                      </div>
                  </Button>
              </Link>
               <Link href="/admin/delivery-options/new" passHref>
                   <Button variant="outline" className="w-full justify-start p-4 h-auto">
                      <Settings className="mr-3 h-5 w-5" />
                       <div>
                          <p className="font-semibold">Manage Delivery Options</p>
                          <p className="text-xs text-muted-foreground">Add or update shipping methods.</p>
                      </div>
                  </Button>
              </Link>
          </div>
      </section>
    </div>
  );
}