import React from 'react';

export function Footer() {
  return (
    <footer className="bg-card/50 text-muted-foreground border-t border-border/70 mt-auto py-8 backdrop-blur-sm">
      <div className="container mx-auto px-4 text-center text-sm">
        <p className="font-serif text-lg text-primary mb-1">Artistry Haven</p>
        <p className="text-xs">© {new Date().getFullYear()} Izzie. All rights reserved.</p>
        <p className="text-xs mt-2">Discover unique art. Inspire your world.</p>
      </div>
    </footer>
  );
}