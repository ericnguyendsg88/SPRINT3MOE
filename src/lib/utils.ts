import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as currency with thousands separators and smart decimals.
 * - Whole numbers display without decimals (e.g., 10000 → "10,000")
 * - Numbers with decimals keep them (e.g., 100.50 → "100.50")
 */
export function formatCurrency(amount: number): string {
  // Check if the number is a whole number
  if (Number.isInteger(amount)) {
    return amount.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  }
  // Has decimal value - keep 2 decimal places
  return amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

/**
 * Formats a number with thousands separators and smart decimals.
 */
export function formatNumber(num: number): string {
  if (Number.isInteger(num)) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
