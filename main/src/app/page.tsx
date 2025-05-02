// src/app/page.tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6">
      <h1 className="text-4xl font-bold font-serif tracking-tight lg:text-5xl text-primary">
        Welcome to Artistry Haven
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Discover unique and captivating artwork from talented artists around the world. Find the perfect piece to inspire your space.
      </p>
      <div>
        <Link href="/products">
          <Button size="lg">Explore Artwork</Button>
        </Link>
      </div>
      {/* Optional: Add featured products section later */}
    </div>
  );
}