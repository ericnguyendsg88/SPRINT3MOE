/**
 * Pro-Rated Billing Utility
 * 
 * Calculates pro-rated fees for mid-month enrollments.
 * Formula: (Monthly Fee / Total Days in Month) x Days Remaining
 */

type BillingCycle = 'monthly' | 'quarterly' | 'biannually' | 'yearly' | 'one_time';

/**
 * Get total days in a given month
 */
export function getTotalDaysInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  // Get last day of the month
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get days remaining in the month from a given date (inclusive)
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
 * 2. Enrollment is after the 1st of the month
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

  // If enrollment is on the 1st, no pro-rating needed
  if (enrollmentDate.getDate() === 1) {
    return false;
  }

  // If course hasn't started yet, no pro-rating
  if (courseStartDate) {
    const startDate = new Date(courseStartDate);
    startDate.setHours(0, 0, 0, 0);
    const enrollDate = new Date(enrollmentDate);
    enrollDate.setHours(0, 0, 0, 0);
    
    // If enrolling before or on the course start date, no pro-rating
    // (they'll be charged from the course start month)
    if (enrollDate <= startDate) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate pro-rated fee for the first billing cycle
 * 
 * @param fullFee - The full monthly/cycle fee
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

  const totalDays = getTotalDaysInMonth(enrollmentDate);
  const daysRemaining = getDaysRemainingInMonth(enrollmentDate);
  
  // Calculate pro-rated amount
  const proratedFee = (fullFee / totalDays) * daysRemaining;
  
  // Round to 2 decimal places
  return Math.round(proratedFee * 100) / 100;
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
} {
  const totalDays = getTotalDaysInMonth(enrollmentDate);
  const daysRemaining = getDaysRemainingInMonth(enrollmentDate);
  const isProrated = shouldProrateCharge(enrollmentDate, courseStartDate, billingCycle);
  const proratedFee = calculateProratedFee(fullFee, enrollmentDate, courseStartDate, billingCycle);
  
  return {
    isProrated,
    proratedFee,
    fullFee,
    daysRemaining,
    totalDays,
    savingsAmount: isProrated ? Math.round((fullFee - proratedFee) * 100) / 100 : 0,
  };
}
