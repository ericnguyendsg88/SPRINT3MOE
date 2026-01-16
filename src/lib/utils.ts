import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, minimumFractionDigits = 0, maximumFractionDigits = 2): string {
  return amount.toLocaleString('en-US', { 
    minimumFractionDigits, 
    maximumFractionDigits 
  });
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}
