/**
 * Payment Status Calculation Utility
 * 
 * Business Logic:
 * - Bills are sent on the 5th of each month
 * - Payment window is from 5th to end of month (outstanding period)
 * - "scheduled" - Student paid current bill, next billing cycle hasn't started yet (before 5th)
 * - "outstanding" - Student within payment window (5th to end of month, or 30 days)
 * - "overdue" - Student hasn't paid within the outstanding window (after 30 days since bill)
 * - "fully_paid" - Student paid everything, no next payment due
 */

export type PaymentStatus = 'scheduled' | 'outstanding' | 'overdue' | 'fully_paid';

interface ChargeData {
  status: 'outstanding' | 'overdue' | 'clear' | 'partially_paid';
  due_date: string;
  amount: number;
  amount_paid: number;
}

interface PaymentStatusResult {
  status: PaymentStatus;
  nextBillingDate: Date | null;
}

/**
 * Get the billing date (5th) for a given month
 */
function getBillingDateForMonth(year: number, month: number): Date {
  return new Date(year, month, 5);
}

/**
 * Get the current billing cycle's start date (5th of current or previous month)
 */
function getCurrentBillingCycleStart(today: Date = new Date()): Date {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  
  // If we're before the 5th, the current billing cycle started on the 5th of previous month
  if (day < 5) {
    if (month === 0) {
      return new Date(year - 1, 11, 5); // December of previous year
    }
    return new Date(year, month - 1, 5);
  }
  
  // If we're on or after the 5th, the current billing cycle started this month
  return new Date(year, month, 5);
}

/**
 * Get the next billing date (5th of next billing month)
 */
function getNextBillingDate(today: Date = new Date()): Date {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  
  // If we're before the 5th, next billing is the 5th of this month
  if (day < 5) {
    return new Date(year, month, 5);
  }
  
  // If we're on or after the 5th, next billing is 5th of next month
  if (month === 11) {
    return new Date(year + 1, 0, 5); // January of next year
  }
  return new Date(year, month + 1, 5);
}

/**
 * Calculate the number of days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const timeDiff = date2.getTime() - date1.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * Determine payment status based on course charges and billing cycle logic
 * 
 * @param charges - Array of charge data for a course enrollment
 * @param today - Current date (optional, for testing)
 * @returns PaymentStatusResult with status and next billing date
 */
export function calculatePaymentStatus(
  charges: ChargeData[],
  today: Date = new Date()
): PaymentStatusResult {
  // No charges = scheduled (course just started, first bill not due yet)
  if (charges.length === 0) {
    return {
      status: 'scheduled',
      nextBillingDate: getNextBillingDate(today),
    };
  }

  // Check for outstanding charges (unpaid)
  const hasUnpaid = charges.some(c => {
    if (c.status === 'outstanding') {
      const dueDate = new Date(c.due_date);
      const daysSinceDue = daysBetween(dueDate, today);
      return daysSinceDue > 30;
    }
    return false;
  });

  if (hasUnpaid) {
    return {
      status: 'outstanding',
      nextBillingDate: getNextBillingDate(today),
    };
  }

  // Check for outstanding charges (within 30 days payment window)
  const hasOutstanding = charges.some(c => {
    if (c.status === 'outstanding') {
      const dueDate = new Date(c.due_date);
      const daysSinceDue = daysBetween(dueDate, today);
      return daysSinceDue >= 0 && daysSinceDue <= 30;
    }
    return false;
  });

  if (hasOutstanding) {
    return {
      status: 'outstanding',
      nextBillingDate: getNextBillingDate(today),
    };
  }

  // Check if all charges are fully paid (using 'clear' status from database)
  const allPaid = charges.every(c => c.status === 'clear');
  
  if (allPaid) {
    // Check if there's a next billing date coming (course is ongoing)
    // For now, assume if all charges are clear, the student is either fully paid
    // or scheduled for next billing
    const currentBillingStart = getCurrentBillingCycleStart(today);
    const nextBillingDate = getNextBillingDate(today);
    
    // Check if there are charges for the current billing cycle
    const hasCurrentCycleCharge = charges.some(c => {
      const dueDate = new Date(c.due_date);
      return dueDate >= currentBillingStart;
    });
    
    // If student paid current cycle and we're before next billing date
    // they are "scheduled" for next payment
    if (hasCurrentCycleCharge) {
      return {
        status: 'scheduled',
        nextBillingDate,
      };
    }
    
    // If no current cycle charge and all previous are clear, 
    // could be fully paid (course ended) or scheduled
    // We'll consider them scheduled if course is ongoing
    return {
      status: 'scheduled',
      nextBillingDate,
    };
  }

  // Default to outstanding
  return {
    status: 'outstanding',
    nextBillingDate: getNextBillingDate(today),
  };
}

/**
 * Determine if a course enrollment is fully paid (no more payments expected)
 * This should be called separately when we know the course has ended
 * 
 * @param totalFee - Total fee for the course
 * @param totalCollected - Total amount collected
 * @param courseEndDate - Optional course end date
 * @returns true if fully paid
 */
export function isFullyPaid(
  totalFee: number,
  totalCollected: number,
  courseEndDate?: string | null
): boolean {
  // If total collected equals or exceeds total fee, it's fully paid
  if (totalCollected >= totalFee && totalFee > 0) {
    return true;
  }
  
  // If course has ended and all charges are paid
  if (courseEndDate) {
    const endDate = new Date(courseEndDate);
    const today = new Date();
    if (endDate < today && totalCollected >= totalFee) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get the next billing date formatted as a string (DD/MM/YY)
 */
export function getFormattedNextBillingDate(today: Date = new Date()): string {
  const nextBilling = getNextBillingDate(today);
  const day = nextBilling.getDate().toString().padStart(2, '0');
  const month = (nextBilling.getMonth() + 1).toString().padStart(2, '0');
  const year = nextBilling.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

/**
 * Get days until next billing date
 */
export function getDaysUntilNextBilling(today: Date = new Date()): number {
  const nextBilling = getNextBillingDate(today);
  return daysBetween(today, nextBilling);
}

/**
 * Format payment method for display
 */
export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return '—';
  
  const methodLabels: Record<string, string> = {
    'credit_card': 'Credit Card',
    'debit_card': 'Debit Card',
    'bank_transfer': 'Bank Transfer',
    'cash': 'Cash',
    'cheque': 'Cheque',
    'paynow': 'PayNow',
    'giro': 'GIRO',
    'edusave': 'Edusave',
    'skillsfuture': 'SkillsFuture',
    'account_balance': 'Account Balance',
  };
  
  // Check if it's a combined payment (format: method1+method2)
  if (method.includes('+')) {
    const methods = method.split('+');
    const formattedMethods = methods.map(m => {
      const trimmedMethod = m.trim().toLowerCase();
      return methodLabels[trimmedMethod] || m.trim().charAt(0).toUpperCase() + m.trim().slice(1);
    });
    return formattedMethods.join(' and ');
  }
  
  return methodLabels[method.toLowerCase()] || method.charAt(0).toUpperCase() + method.slice(1);
}
