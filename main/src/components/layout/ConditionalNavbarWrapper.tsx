'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

export function ConditionalNavbarWrapper() {
  const pathname = usePathname();
  const isAdminView = pathname.startsWith('/admin');

  if (isAdminView) {
    return null;
  }

  return <Navbar />;
}


