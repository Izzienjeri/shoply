import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const formatPrice = (priceString: string | number): string => {
  const price = typeof priceString === 'string' ? parseFloat(priceString) : priceString;
  if (isNaN(price)) return 'N/A';
  return `Ksh ${price.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}