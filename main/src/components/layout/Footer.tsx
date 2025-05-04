import React from 'react';

export function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground border-t border-border mt-12 py-6">
      <div className="container mx-auto px-4 text-center text-sm">
        © {new Date().getFullYear()} Artistry Haven by izzie
      </div>
    </footer>
  );
}