  import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, AlertCircle, CheckCircle, BookOpen, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge, type Status } from '@/components/shared/StatusBadge';
import { useAccountHolders, useUpdateAccountHolder } from '@/hooks/useAccountHolders';
import { useCourseCharges, CourseCharge, useUpdateCourseCharge } from '@/hooks/useCourseCharges';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useEnrollmentsByAccount } from '@/hooks/useEnrollments';
import { useCourses } from '@/hooks/useCourses';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { isEducationAccount, canUseBalance, canUseCombinedPayment } from '@/lib/accountTypeUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePageBuilder, LayoutItem } from '@/components/editor/PageBuilder';
import { EditModeToggle } from '@/components/editor/EditModeToggle';
import { SortableContainer } from '@/components/editor/SortableContainer';
import { ResizableSection } from '@/components/editor/ResizableSection';
import { SectionAdder } from '@/components/editor/SectionAdder';
import { CustomSectionRenderer } from '@/components/editor/CustomSectionRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

const SECTION_IDS = ['header', 'summary-cards', 'enrolled-courses', 'pending-fees', 'payment-history'];

export default function CourseFees() {
  const navigate = useNavigate();
  const { currentUserId } = useCurrentUser();
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPayAllDialogOpen, setIsPayAllDialogOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<CourseCharge | null>(null);
  
  // Payment options
  const [useAccountBalance, setUseAccountBalance] = useState(true);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [externalMethod, setExternalMethod] = useState('');
  const [externalAmount, setExternalAmount] = useState('');
  
  // Pay All options
  const [payAllUseBalance, setPayAllUseBalance] = useState(true);
  const [payAllBalanceAmount, setPayAllBalanceAmount] = useState('');
  const [payAllExternalMethod, setPayAllExternalMethod] = useState('');
  const [payAllExternalAmount, setPayAllExternalAmount] = useState('');

  // Page layout for drag-and-drop
  const {
    isEditMode,
    toggleEditMode,
    updateLayout,
    updateSectionSize,
    removeSection,
    updateCustomSection,
    resetLayout,
    getOrderedItems,
    getSectionSize,
    isSaving,
    handleAddSection,
  } = usePageBuilder('eservice-course-fees', SECTION_IDS);

  // Fetch data from database
  const { data: accountHolders = [], isLoading: loadingAccounts } = useAccountHolders();
  const { data: courseCharges = [] } = useCourseCharges();
  const { data: courses = [] } = useCourses();
  
  // Find current user based on context - need to find user first for enrollment query
  const currentUser = accountHolders.find(a => a.id === currentUserId) || accountHolders[0];
  
  // Use account-specific enrollment query
  const { data: enrollments = [] } = useEnrollmentsByAccount(currentUser?.id || '');
  
  // Mutations for actual payment processing
  const updateAccountMutation = useUpdateAccountHolder();
  const updateChargeMutation = useUpdateCourseCharge();
  const createTransactionMutation = useCreateTransaction();
  
  const [isProcessing, setIsProcessing] = useState(false);

  const userCharges = courseCharges.filter(c => c.account_id === currentUser?.id);

  // Helper: determine if a charge should appear as "Pending" in the current billing window.
  // Billing window rules (same as Your Courses):
  // - If enrolled BEFORE course start date: billing starts on 5th of the month
  // - If enrolled ON/AFTER course start date (mid-month): billing starts on enrollment date (first cycle)
  // - Billing window ends at end of the current month
  const isChargeInBillingWindow = (charge: CourseCharge): boolean => {
    if (charge.status === 'clear') return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enrollment = enrollments.find(
      e => e.account_id === currentUser?.id && e.course_id === charge.course_id
    );
    if (!enrollment) return false;

    const enrollmentDate = new Date(enrollment.enrollment_date);
    const courseStartDate = enrollment.courses?.course_run_start
      ? new Date(enrollment.courses.course_run_start)
      : null;

    const isEnrollmentMonth =
      enrollmentDate.getFullYear() === today.getFullYear() &&
      enrollmentDate.getMonth() === today.getMonth();

    let billingStart: Date;
    if (isEnrollmentMonth && courseStartDate && enrollmentDate >= courseStartDate) {
      billingStart = new Date(enrollmentDate);
    } else {
      billingStart = new Date(today.getFullYear(), today.getMonth(), 5);
    }
    billingStart.setHours(0, 0, 0, 0);

    const billingEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    billingEnd.setHours(23, 59, 59, 999);

    return today >= billingStart && today <= billingEnd;
  };

  // Pending fees = unpaid charges that are within the current billing window
  const pendingCharges = userCharges.filter(isChargeInBillingWindow);
  const paidCharges = userCharges.filter(c => c.status === 'clear');

  // Get user's enrolled courses - enrollments already filtered by account
  const enrolledCourses = enrollments.map(enrollment => {
    const course = courses.find(c => c.id === enrollment.course_id);
    return course ? { ...enrollment, course } : null;
  }).filter(Boolean);

  const totalOutstanding = pendingCharges.reduce((sum, c) => sum + Number(c.amount), 0);

  // Calculate remaining amount to pay externally
  const balanceAmountNum = parseFloat(balanceAmount) || 0;
  const chargeAmount = selectedCharge ? Number(selectedCharge.amount) : 0;
  const remainingAmount = Math.max(0, chargeAmount - balanceAmountNum);
  const maxBalanceUsable = currentUser ? Math.min(Number(currentUser.balance), chargeAmount) : 0;

  // Reset form when dialog opens
  useEffect(() => {
    if (selectedCharge && isPaymentDialogOpen && currentUser) {
      // For Student Accounts: no balance, must pay full amount externally
      if (!canUseBalance(currentUser.account_type, currentUser.residential_status)) {
        setBalanceAmount('0');
        setUseAccountBalance(false);
        setExternalMethod('');
        setExternalAmount(Number(selectedCharge.amount).toFixed(2));
      } else {
        // Education Accounts: can use balance
        const defaultBalanceAmount = Math.min(Number(currentUser.balance), Number(selectedCharge.amount));
        setBalanceAmount(defaultBalanceAmount.toFixed(2));
        setUseAccountBalance(defaultBalanceAmount > 0);
        setExternalMethod('');
        setExternalAmount(Math.max(0, Number(selectedCharge.amount) - defaultBalanceAmount).toFixed(2));
      }
    }
  }, [selectedCharge, isPaymentDialogOpen, currentUser]);

  // Calculate total payment - Student Accounts can only use external payment
  const canUseAccountBalance = currentUser && canUseBalance(currentUser.account_type, currentUser.residential_status);
  const totalPaymentAmount = (useAccountBalance && canUseAccountBalance ? balanceAmountNum : 0) + (parseFloat(externalAmount) || 0);

  const handlePayment = (charge: CourseCharge) => {
    setSelectedCharge(charge);
    setIsPaymentDialogOpen(true);
  };

  const handlePayAll = () => {
    if (!currentUser) return;
    
    // For Student Accounts: no balance, must pay full amount externally
    if (!canUseBalance(currentUser.account_type, currentUser.residential_status)) {
      setPayAllBalanceAmount('0');
      setPayAllUseBalance(false);
      setPayAllExternalMethod('');
      setPayAllExternalAmount(totalOutstanding.toFixed(2));
    } else {
      // Education Accounts: can use balance
      const defaultBalanceAmount = Math.min(Number(currentUser.balance), totalOutstanding);
      setPayAllBalanceAmount(defaultBalanceAmount.toFixed(2));
      setPayAllUseBalance(true);
      setPayAllExternalMethod('');
      setPayAllExternalAmount(Math.max(0, totalOutstanding - defaultBalanceAmount).toFixed(2));
    }
    setIsPayAllDialogOpen(true);
  };

  const payAllBalanceAmountNum = parseFloat(payAllBalanceAmount) || 0;
  const payAllExternalAmountNum = parseFloat(payAllExternalAmount) || 0;
  // For Student Accounts, max balance usable is 0
  const payAllMaxBalanceUsable = canUseAccountBalance && currentUser 
    ? Math.min(Number(currentUser.balance), totalOutstanding) 
    : 0;
  // For Student Accounts, remaining is always the full amount
  const payAllRemainingAmount = canUseAccountBalance 
    ? Math.max(0, totalOutstanding - (payAllUseBalance ? payAllBalanceAmountNum : 0))
    : totalOutstanding;
  // Total payment for Pay All
  const payAllTotalPayment = (payAllUseBalance && canUseAccountBalance ? payAllBalanceAmountNum : 0) + payAllExternalAmountNum;

  const processPayAll = async () => {
    if (!currentUser || pendingCharges.length === 0 || isProcessing) return;

    // For Student Accounts, balance is always 0
    const balancePaid = (payAllUseBalance && canUseAccountBalance) ? payAllBalanceAmountNum : 0;
    const externalPaid = payAllExternalAmountNum;
    const totalPaid = balancePaid + externalPaid;

    if (totalPaid < totalOutstanding) {
      toast.error('Payment amount is less than the total outstanding amount');
      return;
    }

    if (balancePaid > 0 && balancePaid > Number(currentUser.balance)) {
      toast.error('Insufficient account balance');
      return;
    }

    if (externalPaid > 0 && !payAllExternalMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setIsProcessing(true);

    try {
      const methodLabels: Record<string, string> = {
        credit_card: 'Credit Card',
        paynow: 'PayNow',
        bank_transfer: 'Bank Transfer',
        account_balance: 'Account Balance',
      };

      // Determine payment method for record
      let paymentMethod = 'account_balance';
      if (balancePaid > 0 && externalPaid > 0) {
        paymentMethod = `account_balance+${payAllExternalMethod}`;
      } else if (externalPaid > 0) {
        paymentMethod = payAllExternalMethod;
      }

      // Update all pending charges to 'clear'
      for (const charge of pendingCharges) {
        await updateChargeMutation.mutateAsync({
          id: charge.id,
          status: 'clear',
          paid_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
        });
      }

      // Deduct from account balance if using balance
      if (balancePaid > 0) {
        const newBalance = Number(currentUser.balance) - balancePaid;
        await updateAccountMutation.mutateAsync({
          id: currentUser.id,
          balance: newBalance,
        });

        // Create a transaction record for balance payment
        await createTransactionMutation.mutateAsync({
          account_id: currentUser.id,
          type: 'course_fee',
          amount: -balancePaid,
          description: `Course fee payment: ${pendingCharges.length} charge(s)`,
          reference: `CF-${Date.now()}`,
          status: 'completed',
        });
      }

      let description = `Paid ${pendingCharges.length} course fee(s). `;
      if (balancePaid > 0 && externalPaid > 0) {
        description += `$${balancePaid.toFixed(2)} from Account Balance + $${externalPaid.toFixed(2)} via ${methodLabels[payAllExternalMethod]}`;
      } else if (balancePaid > 0) {
        description += `$${balancePaid.toFixed(2)} paid from Account Balance`;
      } else {
        description += `$${externalPaid.toFixed(2)} paid via ${methodLabels[payAllExternalMethod]}`;
      }

      toast.success('All fees paid successfully!', { description });
      setIsPayAllDialogOpen(false);
    } catch (error) {
      toast.error('Payment failed', { description: 'Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = async () => {
    if (!selectedCharge || !currentUser || isProcessing) return;

    // For Student Accounts, balance is always 0
    const balancePaid = (useAccountBalance && canUseAccountBalance) ? balanceAmountNum : 0;
    const externalPaid = parseFloat(externalAmount) || 0;
    const totalPaid = balancePaid + externalPaid;
    const chargeTotal = Number(selectedCharge.amount);

    if (totalPaid < chargeTotal) {
      toast.error('Full payment required', { description: `Please pay the full amount of $${chargeTotal.toFixed(2)}` });
      return;
    }

    if (balancePaid > 0 && balancePaid > Number(currentUser.balance)) {
      toast.error('Insufficient account balance');
      return;
    }

    if (externalPaid > 0 && !externalMethod) {
      toast.error('Please select an external payment method');
      return;
    }

    setIsProcessing(true);

    try {
      const methodLabels: Record<string, string> = {
        credit_card: 'Credit Card',
        paynow: 'PayNow',
        bank_transfer: 'Bank Transfer',
        account_balance: 'Account Balance',
      };

      // Determine payment method for record
      let paymentMethod = 'account_balance';
      if (balancePaid > 0 && externalPaid > 0) {
        paymentMethod = `account_balance+${externalMethod}`;
      } else if (externalPaid > 0) {
        paymentMethod = externalMethod;
      }

      // 1. Update the course charge to clear
      await updateChargeMutation.mutateAsync({
        id: selectedCharge.id,
        status: 'clear',
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
      });

      // 2. If external payment, add it to balance first (simulating successful external payment)
      let currentBalance = Number(currentUser.balance);
      if (externalPaid > 0) {
        currentBalance += externalPaid;
        // Create a transaction record for external payment received
        await createTransactionMutation.mutateAsync({
          account_id: currentUser.id,
          type: 'top_up',
          amount: externalPaid,
          description: `External payment received via ${methodLabels[externalMethod]}`,
          reference: `EP-${Date.now()}`,
          status: 'completed',
        });
      }

      // 3. Deduct the full charge amount from balance
      const newBalance = currentBalance - chargeTotal;
      await updateAccountMutation.mutateAsync({
        id: currentUser.id,
        balance: newBalance,
      });

      // 4. Create a transaction record for course fee payment
      await createTransactionMutation.mutateAsync({
        account_id: currentUser.id,
        type: 'course_fee',
        amount: -chargeTotal,
        description: `Course fee payment: ${selectedCharge.course_name}`,
        reference: `CF-${Date.now()}`,
        status: 'completed',
      });

      let description = '';
      if (balancePaid > 0 && externalPaid > 0) {
        description = `$${balancePaid.toFixed(2)} from Account Balance + $${externalPaid.toFixed(2)} via ${methodLabels[externalMethod]}`;
      } else if (balancePaid > 0) {
        description = `$${balancePaid.toFixed(2)} paid from Account Balance`;
      } else {
        description = `$${externalPaid.toFixed(2)} paid via ${methodLabels[externalMethod]}`;
      }

      toast.success('Payment successful!', { description });
      setIsPaymentDialogOpen(false);
      setSelectedCharge(null);
    } catch (error) {
      toast.error('Payment failed', { description: 'Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingAccounts || !currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const billingCycleLabels: Record<string, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    biannually: 'Bi-annually',
    yearly: 'Annually',
  };

  // Helper to format payment method display
  const formatPaymentMethod = (method: string | null): string => {
    if (!method) return '—';
    
    const methodLabels: Record<string, string> = {
      'account_balance': 'Account Balance',
      'credit_card': 'Credit Card',
      'paynow': 'PayNow',
      'bank_transfer': 'Bank Transfer',
    };
    
    // Check if it's a combined payment (format: account_balance+other_method)
    if (method.includes('+')) {
      const methods = method.split('+');
      const formattedMethods = methods.map(m => methodLabels[m] || m.replace('_', ' '));
      return formattedMethods.join(' and ');
    }
    
    return methodLabels[method] || method.replace('_', ' ');
  };

  // Helper to get the last day of the month for due date
  const getLastDayOfMonth = (dueDate: string): Date => {
    const date = new Date(dueDate);
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };
  // Helper to check if payment is one-time
  const isOneTimePayment = (billingCycle: string) => {
    return !billingCycle || billingCycle === 'one_time';
  };

  // Helper to get the payment status for an enrolled course (synced with Dashboard logic)
  const getEnrolledCoursePaymentStatus = (courseId: string, course: typeof courses[0] | undefined): Status => {
    if (!course) return 'paid';
    
    const courseChargesForCourse = userCharges.filter(c => c.course_id === courseId);
    const unpaidCharges = courseChargesForCourse.filter(c => c.status !== 'clear');
    const paidCourseCharges = courseChargesForCourse.filter(c => c.status === 'clear');
    
    const totalFee = courseChargesForCourse.reduce((sum, c) => sum + Number(c.amount), 0);
    const totalCollected = paidCourseCharges.reduce((sum, c) => sum + Number(c.amount), 0);
    
    // Check if course has ended
    const today = new Date();
    const courseEndDate = course.course_run_end ? new Date(course.course_run_end) : null;
    const isCourseEnded = courseEndDate && courseEndDate < today;
    
    // For one-time payments: fully paid when the charge is paid
    // For recurring: fully paid ONLY when the course has ended AND all charges are paid
    const isOneTime = isOneTimePayment(course.billing_cycle);
    const allChargesPaid = courseChargesForCourse.length > 0 && courseChargesForCourse.every(c => c.status === 'clear');
    const isCoursePaid = isOneTime 
      ? (totalCollected >= totalFee && totalFee > 0)
      : (isCourseEnded && allChargesPaid && totalFee > 0);
    
    if (isCoursePaid) {
      return 'fully_paid';
    }
    
    // Check for outstanding charges in billing window
    const hasOutstandingInWindow = unpaidCharges.some(isChargeInBillingWindow);
    return hasOutstandingInWindow ? 'outstanding' : 'paid';
  };
  
  // Helper to get the next billing date for an enrolled course
  const getNextBillingDate = (courseId: string, enrollmentDate: string): string => {
    const courseChargesForCourse = userCharges.filter(c => c.course_id === courseId);
    
    // Find the next unpaid charge (outstanding or future)
    const unpaidCharges = courseChargesForCourse.filter(c => c.status !== 'clear');
    
    if (unpaidCharges.length === 0) {
      return '—'; // No upcoming billing
    }
    
    // Sort by due date and get the earliest upcoming one
    unpaidCharges.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    const nextCharge = unpaidCharges[0];
    const dueDate = new Date(nextCharge.due_date);
    const enrollment = new Date(enrollmentDate);
    
    // If this is the enrollment month, billing date is the enrollment date
    let billingDate: Date;
    if (enrollment.getFullYear() === dueDate.getFullYear() && enrollment.getMonth() === dueDate.getMonth()) {
      billingDate = new Date(enrollment);
    } else {
      // Otherwise, billing date is the 1st of the month
      billingDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
    }
    
    return billingDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const pendingColumns = [
    { 
      key: 'courseName', 
      header: 'Course',
      render: (item: CourseCharge) => (
        <div 
          className="cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate(`/eservice/courses/${item.course_id}`)}
        >
          <p className="font-medium text-foreground hover:text-primary">{item.course_name}</p>
          <p className="text-xs text-muted-foreground">{item.courses?.provider || '—'}</p>
        </div>
      )
    },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (item: CourseCharge) => (
        <span className="font-semibold text-foreground">${Number(item.amount).toFixed(2)}</span>
      )
    },
    { 
      key: 'billingCycle', 
      header: 'Billing Cycle',
      render: (item: CourseCharge) => (
        <span className="text-muted-foreground">
          {item.courses?.billing_cycle ? billingCycleLabels[item.courses.billing_cycle] || item.courses.billing_cycle : '—'}
        </span>
      )
    },
    { 
      key: 'billingDate', 
      header: 'Billing Date',
      render: (item: CourseCharge) => {
        const today = new Date();
        const enrollment = enrollments.find(
          e => e.account_id === currentUser?.id && e.course_id === item.course_id
        );
        const enrollmentDate = enrollment ? new Date(enrollment.enrollment_date) : null;
        const courseStartDate = enrollment?.courses?.course_run_start
          ? new Date(enrollment.courses.course_run_start)
          : null;

        const isEnrollmentMonth = enrollmentDate &&
          enrollmentDate.getFullYear() === today.getFullYear() &&
          enrollmentDate.getMonth() === today.getMonth();

        let billingDate: Date;
        if (isEnrollmentMonth && enrollmentDate && courseStartDate && enrollmentDate >= courseStartDate) {
          billingDate = new Date(enrollmentDate);
        } else {
          billingDate = new Date(today.getFullYear(), today.getMonth(), 5);
        }

        return (
          <span className="text-muted-foreground">
            {billingDate.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </span>
        );
      }
    },
    { 
      key: 'dueDate', 
      header: 'Due Date',
      render: () => {
        const today = new Date();
        const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysUntil < 0;
        const isUpcoming = daysUntil >= 0 && daysUntil <= 7;
        
        return (
          <div>
            <p className={`font-medium ${isOverdue ? 'text-destructive' : isUpcoming ? 'text-warning' : 'text-foreground'}`}>
              {dueDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {isOverdue 
                ? `${Math.abs(daysUntil)} days overdue` 
                : daysUntil === 0 
                  ? 'Due today' 
                  : `In ${daysUntil} days`}
            </p>
          </div>
        );
      }
    },
    { 
      key: 'status', 
      header: 'Payment Status',
      render: () => (
        <StatusBadge status={'outstanding'} />
      )
    },
    {
      key: 'actions', 
      header: '',
      render: (item: CourseCharge) => (
        <Button variant="accent" size="sm" onClick={() => handlePayment(item)}>
          Pay Now
        </Button>
      )
    },
  ];

  const paidColumns = [
    { 
      key: 'courseName', 
      header: 'Course',
      render: (item: CourseCharge) => (
        <div 
          className="cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate(`/eservice/courses/${item.course_id}`)}
        >
          <p className="font-medium text-foreground hover:text-primary">{item.course_name}</p>
          <p className="text-xs text-muted-foreground">{item.courses?.provider || '—'}</p>
        </div>
      )
    },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (item: CourseCharge) => (
        <span className="font-semibold text-foreground">${Number(item.amount).toFixed(2)}</span>
      )
    },
    { 
      key: 'billingCycle', 
      header: 'Billing Cycle',
      render: (item: CourseCharge) => (
        <span className="text-muted-foreground">
          {item.courses?.billing_cycle ? billingCycleLabels[item.courses.billing_cycle] || item.courses.billing_cycle : '—'}
        </span>
      )
    },
    { 
      key: 'paidDate', 
      header: 'Paid Date',
      render: (item: CourseCharge) => (
        <span className="text-muted-foreground">
          {item.paid_date ? new Date(item.paid_date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }) : '—'}
        </span>
      )
    },
    { 
      key: 'paymentMethod', 
      header: 'Method',
      render: (item: CourseCharge) => (
        <span className="text-xs text-muted-foreground">
          {formatPaymentMethod(item.payment_method)}
        </span>
      )
    },
  ];

  const renderSection = (item: LayoutItem) => {
    // Check if it's a custom section
    if (item.isCustom && item.customConfig) {
      return (
        <CustomSectionRenderer
          key={item.id}
          section={item}
          isEditMode={isEditMode}
          onSizeChange={(size) => updateSectionSize(item.id, size)}
          onRemove={() => removeSection(item.id)}
          onUpdateConfig={(config) => updateCustomSection(item.id, config)}
        />
      );
    }

    switch (item.id) {
      case 'header':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <div>
              <h1 className="text-2xl font-bold text-foreground">Your Courses</h1>
              <p className="text-muted-foreground mt-1">View your enrolled courses and payment history</p>
            </div>
          </ResizableSection>
        );

      case 'summary-cards':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <div className={`grid gap-4 ${canUseBalance(currentUser.account_type, currentUser.residential_status) ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                    <AlertCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="text-2xl font-bold text-foreground">${totalOutstanding.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Account Balance - only for Education Accounts */}
              {canUseBalance(currentUser.account_type, currentUser.residential_status) && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                      <Wallet className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Balance</p>
                      <p className="text-2xl font-bold text-foreground">${Number(currentUser.balance).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ResizableSection>
        );

      case 'enrolled-courses':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle>Enrolled Courses</CardTitle>
                    <CardDescription>Your current course enrollments</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {enrolledCourses.length === 0 ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No Enrolled Courses</h3>
                    <p className="text-muted-foreground mt-1">You are not currently enrolled in any courses.</p>
                  </div>
                ) : (
                  <DataTable 
                    columns={[
                      { 
                        key: 'courseName', 
                        header: 'Course',
                        render: (item: any) => (
                          <div>
                            <p className="font-medium text-foreground">{item.course.name}</p>
                            <p className="text-xs text-muted-foreground">{item.course.provider}</p>
                          </div>
                        )
                      },
                      { 
                        key: 'fee', 
                        header: 'Fee',
                        render: (item: any) => (
                          <span className="font-semibold text-foreground">${formatCurrency(Number(item.course.fee))}</span>
                        )
                      },
                      { 
                        key: 'billingCycle', 
                        header: 'Billing Cycle',
                        render: (item: any) => (
                          <span className="text-muted-foreground capitalize">
                            {item.course.billing_cycle?.replace('_', ' ') || '—'}
                          </span>
                        )
                      },
                      { 
                        key: 'enrollmentDate', 
                        header: 'Enrolled On',
                        render: (item: any) => (
                          <span className="text-muted-foreground">
                            {new Date(item.enrollment_date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        )
                      },
                      { 
                        key: 'billingDate', 
                        header: 'Billing Date',
                        render: (item: any) => (
                          <span className="text-muted-foreground">
                            {getNextBillingDate(item.course.id, item.enrollment_date)}
                          </span>
                        )
                      },
                      { 
                        key: 'paymentStatus', 
                        header: 'Payment Status',
                        render: (item: any) => (
                          <StatusBadge status={getEnrolledCoursePaymentStatus(item.course.id, item.course)} />
                        )
                      },
                    ]} 
                    data={enrolledCourses}
                    onRowClick={(item) => navigate(`/eservice/courses/${item.course.id}`)}
                  />
                )}
              </CardContent>
            </Card>
          </ResizableSection>
        );

      case 'pending-fees':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    <div>
                      <CardTitle>Pending Fees</CardTitle>
                      <CardDescription>Outstanding course fees requiring payment</CardDescription>
                    </div>
                  </div>
                  {pendingCharges.length > 1 && (
                    <Button variant="accent" onClick={handlePayAll}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay All Outstanding
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pendingCharges.length === 0 ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
                    <p className="text-muted-foreground mt-1">You have no pending course fees.</p>
                  </div>
                ) : (
                  <DataTable columns={pendingColumns} data={pendingCharges} />
                )}
              </CardContent>
            </Card>
          </ResizableSection>
        );

      case 'payment-history':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Your completed course fee payments</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {paidCharges.length === 0 ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
                    <p className="text-muted-foreground">No payment history yet.</p>
                  </div>
                ) : (
                  <DataTable columns={paidColumns} data={paidCharges} />
                )}
              </CardContent>
            </Card>
          </ResizableSection>
        );

      default:
        return null;
    }
  };

  const orderedItems = getOrderedItems();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Edit Mode Toggle */}
      <EditModeToggle
        isEditMode={isEditMode}
        onToggle={toggleEditMode}
        isSaving={isSaving}
        onReset={resetLayout}
      />

      {/* Sortable Sections */}
      <SortableContainer
        items={orderedItems}
        onReorder={updateLayout}
        isEditMode={isEditMode}
      >
        <div className="grid grid-cols-12 gap-6">
          {orderedItems.map(renderSection)}
        </div>
      </SortableContainer>

      {/* Section Adder */}
      {isEditMode && (
        <SectionAdder 
          isEditMode={isEditMode}
          onAddSection={handleAddSection} 
        />
      )}

      {/* Single Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Pay Course Fee</DialogTitle>
            <DialogDescription>
              {selectedCharge?.course_name} - ${Number(selectedCharge?.amount || 0).toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Due</span>
                <span className="font-bold text-foreground">${chargeAmount.toFixed(2)}</span>
              </div>
              {/* Only show balance for Education Accounts */}
              {canUseAccountBalance && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Balance</span>
                  <span className="font-medium text-foreground">${Number(currentUser.balance).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Account Balance option - only for Education Accounts */}
              {canUseAccountBalance && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useBalance"
                      checked={useAccountBalance}
                      onCheckedChange={(checked) => setUseAccountBalance(!!checked)}
                      disabled={Number(currentUser.balance) === 0}
                    />
                    <Label htmlFor="useBalance" className="text-sm font-medium">
                      Use Account Balance
                    </Label>
                  </div>

                  {useAccountBalance && (
                    <div className="space-y-2">
                      <Label>Amount from Balance (max: ${maxBalanceUsable.toFixed(2)})</Label>
                      <Input
                        type="number"
                        min="0"
                        max={maxBalanceUsable}
                        step="0.01"
                        value={balanceAmount}
                        onChange={(e) => {
                          const val = Math.min(parseFloat(e.target.value) || 0, maxBalanceUsable);
                          setBalanceAmount(val.toFixed(2));
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              <div className={canUseAccountBalance ? "border-t border-border pt-4" : ""}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">
                    {canUseAccountBalance ? 'External Payment' : 'Payment Method'}
                  </p>
                  {canUseAccountBalance && remainingAmount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Remaining: <span className="font-semibold text-foreground">${remainingAmount.toFixed(2)}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>External Payment Method</Label>
                    <Select value={externalMethod} onValueChange={setExternalMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">Credit/Debit Card</SelectItem>
                        <SelectItem value="paynow">PayNow</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>External Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={externalAmount}
                      onChange={(e) => setExternalAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between">
                <span className="font-medium">Total Payment</span>
                <span className="font-bold text-lg">${totalPaymentAmount.toFixed(2)}</span>
              </div>
              {totalPaymentAmount < chargeAmount && (
                <p className="text-xs text-destructive mt-1">
                  Payment must equal ${chargeAmount.toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="accent" 
              onClick={processPayment}
              disabled={isProcessing || totalPaymentAmount < chargeAmount}
            >
              {isProcessing ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay All Dialog */}
      <Dialog open={isPayAllDialogOpen} onOpenChange={setIsPayAllDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Pay All Outstanding Fees</DialogTitle>
            <DialogDescription>
              Pay all {pendingCharges.length} pending charges
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Outstanding</span>
                <span className="font-bold text-foreground">${totalOutstanding.toFixed(2)}</span>
              </div>
              {/* Only show balance for Education Accounts */}
              {canUseAccountBalance && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Balance</span>
                  <span className="font-medium text-foreground">${Number(currentUser.balance).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Account Balance option - only for Education Accounts */}
              {canUseAccountBalance && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useBalanceAll"
                      checked={payAllUseBalance}
                      onCheckedChange={(checked) => setPayAllUseBalance(!!checked)}
                      disabled={Number(currentUser.balance) === 0}
                    />
                    <Label htmlFor="useBalanceAll" className="text-sm font-medium">
                      Use Account Balance
                    </Label>
                  </div>

                  {payAllUseBalance && (
                    <div className="space-y-2">
                      <Label>Amount from Balance (max: ${payAllMaxBalanceUsable.toFixed(2)})</Label>
                      <Input
                        type="number"
                        min="0"
                        max={payAllMaxBalanceUsable}
                        step="0.01"
                        value={payAllBalanceAmount}
                        onChange={(e) => {
                          const val = Math.min(parseFloat(e.target.value) || 0, payAllMaxBalanceUsable);
                          setPayAllBalanceAmount(val.toFixed(2));
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {/* External payment - always show for combined payment */}
              <div className={canUseAccountBalance ? "border-t border-border pt-4" : ""}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">
                    {canUseAccountBalance ? 'External Payment' : 'Payment Method'}
                  </p>
                  {canUseAccountBalance && payAllRemainingAmount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Remaining: <span className="font-semibold text-foreground">${payAllRemainingAmount.toFixed(2)}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>{canUseAccountBalance ? 'External Payment Method' : 'Payment Method'}</Label>
                    <Select value={payAllExternalMethod} onValueChange={setPayAllExternalMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">Credit/Debit Card</SelectItem>
                        <SelectItem value="paynow">PayNow</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>External Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payAllExternalAmount}
                      onChange={(e) => setPayAllExternalAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between">
                <span className="font-medium">Total Payment</span>
                <span className="font-bold text-lg">${payAllTotalPayment.toFixed(2)}</span>
              </div>
              {payAllTotalPayment < totalOutstanding && (
                <p className="text-xs text-destructive mt-1">
                  Payment must equal ${totalOutstanding.toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsPayAllDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="accent" 
              onClick={processPayAll}
              disabled={isProcessing || payAllTotalPayment < totalOutstanding || (payAllExternalAmountNum > 0 && !payAllExternalMethod)}
            >
              {isProcessing ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
