import Link from 'next/link';
import React from 'react';
import { FloatingBlob } from '@/components/ui/effects';
import { Palette, Brush, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-rose-400/10 via-fuchsia-500/10 to-indigo-600/10 
                     dark:from-rose-700/10 dark:via-fuchsia-800/10 dark:to-indigo-900/10
                     text-neutral-600 dark:text-neutral-400 
                     border-t border-pink-500/20 dark:border-pink-400/20 
                     mt-auto py-10 md:py-12 relative isolate overflow-hidden">
      
      <FloatingBlob
        className="w-[300px] h-[300px] -bottom-1/3 -left-1/4 opacity-10 md:opacity-15"
        gradientClass="bg-gradient-to-r from-pink-400 to-purple-500"
        animateProps={{ x: [0, 20, -20, 0], y: [0, -10, 10, 0], scale: [1, 1.05, 0.95, 1] }}
        transitionProps={{ duration: 40 }}
      />
       <FloatingBlob
        className="w-[250px] h-[250px] -bottom-1/4 -right-1/5 opacity-10 md:opacity-15"
        gradientClass="bg-gradient-to-l from-sky-300 to-teal-400"
        animateProps={{ x: [0, -15, 15, 0], y: [0, 10, -10, 0], scale: [1, 0.95, 1.05, 1] }}
        transitionProps={{ duration: 45 }}
      />

      <div className="container mx-auto px-4 text-center relative z-10">
        <Link href="/" className="inline-block mb-3">
            <h3 className="text-2xl font-bold font-serif 
                        text-transparent bg-clip-text bg-gradient-to-r 
                        from-rose-500 via-fuchsia-500 to-purple-600
                        dark:from-rose-400 dark:via-fuchsia-400 dark:to-purple-500
                        hover:opacity-80 transition-opacity">
                Artistry Haven
            </h3>
        </Link>
        <p className="text-sm max-w-md mx-auto leading-relaxed">
          Discover unique art that speaks to your soul. Inspire your world with pieces that tell a story.
        </p>
        <div className="flex justify-center space-x-6 my-6 text-pink-500 dark:text-pink-400">
            <Link href="/artworks" className="hover:text-fuchsia-500 dark:hover:text-fuchsia-300 transition-colors" aria-label="Browse Artworks">
                <Palette className="h-6 w-6" />
            </Link>
            <Link href="/artists" className="hover:text-fuchsia-500 dark:hover:text-fuchsia-300 transition-colors" aria-label="Discover Artists">
                <Brush className="h-6 w-6" />
            </Link>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          © {new Date().getFullYear()} Artistry Haven by Izzie. All rights reserved.
        </p>
      </div>
    </footer>
  );
}