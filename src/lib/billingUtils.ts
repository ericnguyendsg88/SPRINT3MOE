/**
 * Pro-Rated Billing Utility
 * 
 * Calculates pro-rated fees for mid-period enrollments across all billing cycles.
 * Formula: (Full Fee / Total Days in Billing Period) x Days Remaining in Period
 */

type BillingCycle = 'monthly' | 'quarterly' | 'biannually' | 'yearly' | 'one_time';

/**
 * Get the billing period months for each cycle type
 */
function getBillingPeriodMonths(billingCycle: BillingCycle): number {
  switch (billingCycle) {
    case 'monthly': return 1;
    case 'quarterly': return 3;
    case 'biannually': return 6;
    case 'yearly': return 12;
    case 'one_time': return 0;
    default: return 1;
  }
}

/**
 * Get the start and end dates of the current billing period based on the billing cycle
 * and course start date. Billing periods are aligned to the course start date.
 * 
 * Example for quarterly billing starting Sep 1:
 * - Period 1: Sep 1 - Nov 30
 * - Period 2: Dec 1 - Feb 28/29
 * - Period 3: Mar 1 - May 31
 * - Period 4: Jun 1 - Aug 31
 */
export function getBillingPeriodDates(
  enrollmentDate: Date,
  courseStartDate: string | null,
  billingCycle: BillingCycle
): { periodStart: Date; periodEnd: Date } {
  const periodMonths = getBillingPeriodMonths(billingCycle);
  
  // For one-time payments, just use the current month
  if (periodMonths === 0) {
    const periodStart = new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth(), 1);
    const periodEnd = new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth() + 1, 0);
    return { periodStart, periodEnd };
  }

  // Determine the anchor date - either course start or enrollment date
  let anchorDate: Date;
  if (courseStartDate) {
    anchorDate = new Date(courseStartDate);
  } else {
    // If no course start, anchor to the beginning of the year
    anchorDate = new Date(enrollmentDate.getFullYear(), 0, 1);
  }
  anchorDate.setHours(0, 0, 0, 0);

  const enrollDate = new Date(enrollmentDate);
  enrollDate.setHours(0, 0, 0, 0);

  // Calculate which billing period the enrollment falls into
  // Start from the anchor date's month and find the period containing the enrollment
  const anchorMonth = anchorDate.getFullYear() * 12 + anchorDate.getMonth();
  const enrollMonth = enrollDate.getFullYear() * 12 + enrollDate.getMonth();
  
  // Calculate months since anchor
  const monthsSinceAnchor = enrollMonth - anchorMonth;
  
  // Find which period we're in
  const periodIndex = Math.floor(monthsSinceAnchor / periodMonths);
  
  // Calculate period start month
  const periodStartMonth = anchorMonth + (periodIndex * periodMonths);
  const periodStartYear = Math.floor(periodStartMonth / 12);
  const periodStartMonthOfYear = periodStartMonth % 12;
  
  const periodStart = new Date(periodStartYear, periodStartMonthOfYear, 1);
  
  // Calculate period end - last day of the last month in the period
  const periodEndMonth = periodStartMonth + periodMonths - 1;
  const periodEndYear = Math.floor(periodEndMonth / 12);
  const periodEndMonthOfYear = periodEndMonth % 12;
  
  // Get the last day of the end month
  const periodEnd = new Date(periodEndYear, periodEndMonthOfYear + 1, 0);
  
  return { periodStart, periodEnd };
}

/**
 * Get total days in a billing period
 */
export function getTotalDaysInBillingPeriod(periodStart: Date, periodEnd: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((periodEnd.getTime() - periodStart.getTime()) / msPerDay) + 1;
}

/**
 * Get days remaining in the billing period from enrollment date (inclusive)
 */
export function getDaysRemainingInBillingPeriod(enrollmentDate: Date, periodEnd: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const enrollDate = new Date(enrollmentDate);
  enrollDate.setHours(0, 0, 0, 0);
  const endDate = new Date(periodEnd);
  endDate.setHours(0, 0, 0, 0);
  return Math.round((endDate.getTime() - enrollDate.getTime()) / msPerDay) + 1;
}

/**
 * Get total days in a given month (kept for backward compatibility)
 */
export function getTotalDaysInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  // Get last day of the month
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get days remaining in the month from a given date (inclusive) - kept for backward compatibility
 */
export function getDaysRemainingInMonth(date: Date): number {
  const totalDays = getTotalDaysInMonth(date);
  const currentDay = date.getDate();
  // Include the enrollment day
  return totalDays - currentDay + 1;
}

/**
 * Determine if pro-rating should apply
 * Pro-rate only applies when:
 * 1. It's a recurring payment (not one-time)
 * 2. Enrollment is after the first day of the billing period
 * 3. Course has already started (enrollment is after or on course start)
 */
export function shouldProrateCharge(
  enrollmentDate: Date,
  courseStartDate: string | null,
  billingCycle: BillingCycle
): boolean {
  // One-time payments don't get pro-rated
  if (billingCycle === 'one_time') {
    return false;
  }

  // If course hasn't started yet, no pro-rating
  if (courseStartDate) {
    const startDate = new Date(courseStartDate);
    startDate.setHours(0, 0, 0, 0);
    const enrollDate = new Date(enrollmentDate);
    enrollDate.setHours(0, 0, 0, 0);
    
    // If enrolling before or on the course start date, no pro-rating
    // (they'll be charged from the course start period)
    if (enrollDate <= startDate) {
      return false;
    }
  }

  // Get the billing period for this enrollment
  const { periodStart } = getBillingPeriodDates(enrollmentDate, courseStartDate, billingCycle);
  
  const enrollDate = new Date(enrollmentDate);
  enrollDate.setHours(0, 0, 0, 0);
  periodStart.setHours(0, 0, 0, 0);

  // If enrollment is on the first day of the billing period, no pro-rating
  if (enrollDate.getTime() === periodStart.getTime()) {
    return false;
  }

  return true;
}

/**
 * Calculate pro-rated fee for the first billing cycle
 * 
 * @param fullFee - The full billing period fee (monthly/quarterly/biannual/yearly)
 * @param enrollmentDate - The date the student enrolls
 * @param courseStartDate - The course start date (optional)
 * @param billingCycle - The billing cycle type
 * @returns The pro-rated fee amount (rounded to 2 decimal places)
 */
export function calculateProratedFee(
  fullFee: number,
  enrollmentDate: Date,
  courseStartDate: string | null,
  billingCycle: BillingCycle
): number {
  // Check if pro-rating applies
  if (!shouldProrateCharge(enrollmentDate, courseStartDate, billingCycle)) {
    return fullFee;
  }

  const { periodStart, periodEnd } = getBillingPeriodDates(enrollmentDate, courseStartDate, billingCycle);
  const totalDays = getTotalDaysInBillingPeriod(periodStart, periodEnd);
  const daysRemaining = getDaysRemainingInBillingPeriod(enrollmentDate, periodEnd);
  
  // Calculate pro-rated amount
  const proratedFee = (fullFee / totalDays) * daysRemaining;
  
  // Round to 2 decimal places
  return Math.round(proratedFee * 100) / 100;
}

/**
 * Get a human-readable label for the billing cycle
 */
export function getBillingCycleLabel(billingCycle: BillingCycle): string {
  switch (billingCycle) {
    case 'monthly': return 'month';
    case 'quarterly': return 'quarter';
    case 'biannually': return 'half-year';
    case 'yearly': return 'year';
    case 'one_time': return 'payment';
    default: return 'period';
  }
}

/**
 * Get pro-rating information for display
 */
export function getProratingInfo(
  fullFee: number,
  enrollmentDate: Date,
  courseStartDate: string | null,
  billingCycle: BillingCycle
): {
  isProrated: boolean;
  proratedFee: number;
  fullFee: number;
  daysRemaining: number;
  totalDays: number;
  savingsAmount: number;
  billingPeriodLabel: string;
  periodStart: Date;
  periodEnd: Date;
} {
  const { periodStart, periodEnd } = getBillingPeriodDates(enrollmentDate, courseStartDate, billingCycle);
  const totalDays = getTotalDaysInBillingPeriod(periodStart, periodEnd);
  const daysRemaining = getDaysRemainingInBillingPeriod(enrollmentDate, periodEnd);
  const isProrated = shouldProrateCharge(enrollmentDate, courseStartDate, billingCycle);
  const proratedFee = calculateProratedFee(fullFee, enrollmentDate, courseStartDate, billingCycle);
  const billingPeriodLabel = getBillingCycleLabel(billingCycle);
  
  return {
    isProrated,
    proratedFee,
    fullFee,
    daysRemaining,
    totalDays,
    savingsAmount: isProrated ? Math.round((fullFee - proratedFee) * 100) / 100 : 0,
    billingPeriodLabel,
    periodStart,
    periodEnd,
  };
}
