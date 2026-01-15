import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, DollarSign, GraduationCap, Building, CreditCard, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge, type Status } from '@/components/shared/StatusBadge';
import { useCourse } from '@/hooks/useCourses';
import { useCourseCharges } from '@/hooks/useCourseCharges';
import { useEnrollmentsByAccount } from '@/hooks/useEnrollments';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { useAccountHolders } from '@/hooks/useAccountHolders';
import { formatPaymentMethod } from '@/lib/paymentStatusUtils';
import { formatDate, getBillingCycleLabel, getUpcomingBillingCycles } from '@/lib/dateUtils';
import { usePageLayout } from '@/hooks/usePageLayout';
import { FieldEditor, FieldDefinition } from '@/components/editor/FieldEditor';
import { EditModeToggle } from '@/components/editor/EditModeToggle';

type BillingCycle = 'monthly' | 'quarterly' | 'biannually' | 'yearly' | 'one_time';

const billingCycleLabels: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannually: 'Bi-annually',
  yearly: 'Annually',
  one_time: 'One Time',
};

// Helper to determine if payment is one-time
const isOneTimePayment = (billingCycle: string) => {
  return !billingCycle || billingCycle === 'one_time';
};

const DEFAULT_COURSE_INFO_FIELDS = [
  { key: 'name', label: 'Course Name', visible: true, order: 0 },
  { key: 'provider', label: 'Provider', visible: true, order: 1 },
  { key: 'course_start', label: 'Course Start', visible: true, order: 2 },
  { key: 'course_end', label: 'Course End', visible: true, order: 3 },
  { key: 'payment_type', label: 'Payment Type', visible: true, order: 4 },
  { key: 'billing_cycle', label: 'Billing Cycle', visible: true, order: 5 },
  { key: 'status', label: 'Status', visible: true, order: 6 },
  { key: 'fee', label: 'Fee per Cycle', visible: true, order: 7 },
  { key: 'mode_of_training', label: 'Mode of Training', visible: false, order: 8 },
  { key: 'enrolled_since', label: 'Enrolled Since', visible: false, order: 9 },
];

const DEFAULT_SECTIONS = ['summary', 'course-info', 'outstanding', 'history'];

export default function EServiceCourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { currentUserId } = useCurrentUser();
  const [isEditMode, setIsEditMode] = useState(false);
  
  const { data: accountHolders = [] } = useAccountHolders();
  const currentUser = accountHolders.find(u => u.id === currentUserId) || accountHolders[0];
  
  const { data: course, isLoading: loadingCourse } = useCourse(courseId || '');
  const { data: enrollments = [] } = useEnrollmentsByAccount(currentUser?.id || '');
  const { data: allCharges = [] } = useCourseCharges();

  // Page layout for field customization
  const {
    getFieldConfig,
    updateFieldConfig,
    resetLayout,
    isSaving,
  } = usePageLayout('eservice-course-detail', DEFAULT_SECTIONS);

  // Get course info fields from layout or use defaults
  const courseInfoFields = getFieldConfig('course-info', DEFAULT_COURSE_INFO_FIELDS);

  const handleCourseInfoFieldsChange = (fields: FieldDefinition[]) => {
    updateFieldConfig('course-info', fields);
  };

  // Filter charges for this user and course
  const courseCharges = allCharges.filter(
    c => c.account_id === currentUser?.id && c.course_id === courseId
  );

  // Get enrollment info for this course
  const enrollment = enrollments.find(e => e.course_id === courseId);

  if (loadingCourse || !currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading course details...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-muted-foreground">Course not found</div>
        <Button variant="outline" onClick={() => navigate('/eservice')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Helper: charge is in billing window based on course-based billing logic
  // - If enrolled BEFORE course start date: billing starts on 5th of the month
  // - If enrolled ON/AFTER course start date (mid-month): billing starts from enrollment date
  // - Billing window ends at end of the current month
  const isChargeInBillingWindow = (dueDateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enrollmentDate = enrollment ? new Date(enrollment.enrollment_date) : null;
    const courseStartDate = course?.course_run_start ? new Date(course.course_run_start) : null;

    const isEnrollmentMonth = enrollmentDate &&
      enrollmentDate.getFullYear() === today.getFullYear() &&
      enrollmentDate.getMonth() === today.getMonth();

    let billingStart: Date;
    if (isEnrollmentMonth && enrollmentDate && courseStartDate && enrollmentDate >= courseStartDate) {
      // Mid-month enrollment after course starts: billing starts on enrollment date
      billingStart = new Date(enrollmentDate);
    } else {
      // Standard billing date: 5th of the month
      billingStart = new Date(today.getFullYear(), today.getMonth(), 5);
    }
    billingStart.setHours(0, 0, 0, 0);

    const billingEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    billingEnd.setHours(23, 59, 59, 999);

    return today >= billingStart && today <= billingEnd;
  };

  // Only show charges as outstanding if the billing window has started
  const outstandingCharges = courseCharges.filter(c => c.status !== 'clear' && isChargeInBillingWindow(c.due_date));

  const paidCharges = courseCharges.filter(c => c.status === 'clear');

  // Calculate outstanding ONLY from charges in billing window
  const totalCharged = outstandingCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaid = outstandingCharges.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
  const outstanding = totalCharged - totalPaid;

  // Calculate total course fee based on billing cycle and course duration
  const calculateTotalCourseFee = (): number => {
    if (!course) return 0;

    // For one-time payment, total fee is just the course fee
    if (isOneTimePayment(course.billing_cycle)) {
      return Number(course.fee);
    }

    // For recurring courses, calculate number of billing cycles in the course period
    const startDate = course.course_run_start ? new Date(course.course_run_start) : null;
    const endDate = course.course_run_end ? new Date(course.course_run_end) : null;

    // If dates are missing, fall back to fee per cycle
    if (!startDate || !endDate) {
      return Number(course.fee);
    }

    const cycleMonths: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      biannually: 6,
      yearly: 12,
    };

    const cycleLength = cycleMonths[course.billing_cycle] || 1;

    // Month difference ignoring days
    const monthsBetween =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());

    // Treat end date as an exclusive boundary when it's on the same day-of-month,
    // so 01/01/26 -> 01/01/27 counts as 12 monthly cycles (not 13).
    const effectiveMonths = monthsBetween + (endDate.getDate() > startDate.getDate() ? 1 : 0);

    const numberOfCycles = Math.max(1, Math.ceil(effectiveMonths / cycleLength));

    return numberOfCycles * Number(course.fee);
  };

  const totalCourseFee = calculateTotalCourseFee();

  // Helper to get billing date - uses same logic as Your Courses table
  // - If enrolled BEFORE course start date: billing date is 5th of the month
  // - If enrolled ON/AFTER course start date (mid-month): billing date is enrollment date
  const getBillingDate = (dueDate: string): string => {
    const today = new Date();
    const enrollmentDate = enrollment ? new Date(enrollment.enrollment_date) : null;
    const courseStartDate = course?.course_run_start ? new Date(course.course_run_start) : null;

    const isEnrollmentMonth = enrollmentDate &&
      enrollmentDate.getFullYear() === today.getFullYear() &&
      enrollmentDate.getMonth() === today.getMonth();

    if (isEnrollmentMonth && enrollmentDate && courseStartDate && enrollmentDate >= courseStartDate) {
      // Mid-month enrollment after course starts
      return formatDate(enrollmentDate);
    }

    // Standard billing date: 5th of the month
    const billingDate = new Date(today.getFullYear(), today.getMonth(), 5);
    return formatDate(billingDate);
  };

  // Helper to get the last day of the CURRENT month for due date (not charge's due_date month)
  const getLastDayOfCurrentMonth = (): Date => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0);
  };

  // Helper to get days until due date (last day of current month)
  const getDaysUntilDue = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = getLastDayOfCurrentMonth();
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper to determine payment status based on current date vs billing window
  const getPaymentStatus = (item: typeof courseCharges[0]): Status => {
    if (item.status === 'clear') return 'paid';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enrollmentDate = enrollment ? new Date(enrollment.enrollment_date) : null;
    const courseStartDate = course?.course_run_start ? new Date(course.course_run_start) : null;

    const isEnrollmentMonth = enrollmentDate &&
      enrollmentDate.getFullYear() === today.getFullYear() &&
      enrollmentDate.getMonth() === today.getMonth();

    let billingStart: Date;
    if (isEnrollmentMonth && enrollmentDate && courseStartDate && enrollmentDate >= courseStartDate) {
      // Mid-month enrollment after course starts
      billingStart = new Date(enrollmentDate);
    } else {
      // Standard billing date: 5th of the month
      billingStart = new Date(today.getFullYear(), today.getMonth(), 5);
    }
    billingStart.setHours(0, 0, 0, 0);

    // If today is before the billing start date, status is "paid" (not yet due)
    if (today < billingStart) {
      return 'paid';
    }

    // Otherwise, within or after billing window, status is "outstanding"
    return 'outstanding';
  };

  const chargeColumns = [
    {
      key: 'course',
      header: 'Course',
      render: (item: typeof courseCharges[0]) => (
        <div>
          <span className="font-medium text-foreground">{item.course_name}</span>
          <p className="text-sm text-muted-foreground">{course?.provider}</p>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: typeof courseCharges[0]) => {
        const chargeAmount = Number(item.amount);
        const fullFee = Number(course?.fee || 0);
        const isProrated = chargeAmount < fullFee && chargeAmount > 0;
        
        return (
          <div>
            <span className="font-semibold text-foreground">
              ${chargeAmount.toFixed(2)}
            </span>
            {isProrated && (
              <p className="text-xs text-primary mt-0.5">Pro-rated</p>
            )}
          </div>
        );
      }
    },
    {
      key: 'billing_cycle',
      header: 'Billing Cycle',
      render: () => (
        <span className="text-muted-foreground">
          {course?.billing_cycle ? billingCycleLabels[course.billing_cycle as BillingCycle] : 'One-time'}
        </span>
      )
    },
    {
      key: 'billing_date',
      header: 'Billing Date',
      render: (item: typeof courseCharges[0]) => (
        <span className="text-muted-foreground">
          {getBillingDate(item.due_date)}
        </span>
      )
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: () => {
        const daysUntil = getDaysUntilDue();
        const lastDay = getLastDayOfCurrentMonth();
        return (
          <div>
            <span className="font-medium text-foreground">{formatDate(lastDay)}</span>
            <p className="text-sm text-muted-foreground">
              {daysUntil > 0 ? `In ${daysUntil} days` : daysUntil === 0 ? 'Due today' : `${Math.abs(daysUntil)} days overdue`}
            </p>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Payment Status',
      render: (item: typeof courseCharges[0]) => (
        <StatusBadge status={getPaymentStatus(item)} />
      )
    },
    {
      key: 'actions',
      header: '',
      render: () => (
        <Button 
          variant="accent" 
          size="sm" 
          onClick={() => navigate('/eservice/fees')}
        >
          Pay Now
        </Button>
      )
    },
  ];

  // Get upcoming billing cycles for this course if it has recurring payments
  // Filter out cycles that have already been paid
  const rawUpcomingCycles = course.billing_cycle && !isOneTimePayment(course.billing_cycle)
    ? getUpcomingBillingCycles(course.billing_cycle as 'monthly' | 'quarterly' | 'biannually' | 'yearly', 12, course.course_run_start, course.course_run_end)
    : [];
  
  // Get months that are already paid (status is 'clear')
  // Use paid_date to determine which billing cycle month was paid (not due_date)
  const paidMonths = paidCharges.map(charge => {
    // The billing cycle that was paid is based on when the payment was made
    const paidDate = charge.paid_date ? new Date(charge.paid_date) : new Date();
    return `${paidDate.getFullYear()}-${paidDate.getMonth()}`;
  });
  
  // Filter out cycles that have already been paid
  const upcomingCycles = rawUpcomingCycles
    .filter(cycleDate => {
      const cycleKey = `${cycleDate.getFullYear()}-${cycleDate.getMonth()}`;
      return !paidMonths.includes(cycleKey);
    })
    .slice(0, 3); // Limit to 3 upcoming cycles

  const paymentHistoryColumns = [
    {
      key: 'paid_date',
      header: 'Payment Date',
      render: (item: typeof courseCharges[0]) => (
        <span className="text-muted-foreground">
          {formatDate(item.paid_date)}
        </span>
      )
    },
    {
      key: 'course_name',
      header: 'Course Name',
      render: (item: typeof courseCharges[0]) => (
        <span className="font-medium text-foreground">
          {item.course_name}
        </span>
      )
    },
    {
      key: 'billing_cycle',
      header: 'Paid Cycle',
      render: (item: typeof courseCharges[0]) => {
        // Paid Cycle should be based on when payment was made, not the charge's due_date
        // Use paid_date to determine the billing cycle month
        const paidDate = item.paid_date ? new Date(item.paid_date) : new Date();
        return (
          <span className="font-medium text-foreground">
            {paidDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </span>
        );
      }
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: typeof courseCharges[0]) => (
        <span className="font-semibold text-success">
          ${Number(item.amount).toFixed(2)}
        </span>
      )
    },
    {
      key: 'payment_method',
      header: 'Payment Method',
      render: (item: typeof courseCharges[0]) => (
        <span className="text-muted-foreground capitalize">
          {formatPaymentMethod(item.payment_method)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: typeof courseCharges[0]) => (
        <StatusBadge status="paid" />
      )
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/eservice')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{course.name}</h1>
          <p className="text-muted-foreground">{course.provider}</p>
        </div>
        <StatusBadge status={course.status} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-warning">${outstanding.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Fee</p>
                <p className="text-2xl font-bold">
                  ${totalCourseFee.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Course Information</CardTitle>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <FieldEditor
                fields={courseInfoFields}
                onFieldsChange={handleCourseInfoFieldsChange}
                isEditMode={isEditMode}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courseInfoFields
              .filter(f => f.visible)
              // Hide 'fee' (Fee per Cycle) for one-time payment courses
              .filter(f => !(f.key === 'fee' && isOneTimePayment(course.billing_cycle)))
              .sort((a, b) => a.order - b.order)
              .map((field) => {
                const fieldConfig: Record<string, { icon: React.ReactNode; value: React.ReactNode }> = {
                  name: {
                    icon: <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />,
                    value: course.name,
                  },
                  provider: {
                    icon: <Building className="h-5 w-5 text-muted-foreground mt-0.5" />,
                    value: course.provider,
                  },
                  mode_of_training: {
                    icon: <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />,
                    value: <span className="capitalize">{course.mode_of_training || 'Online'}</span>,
                  },
                  course_start: {
                    icon: <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />,
                    value: formatDate(course.course_run_start) || 'Not set',
                  },
                  course_end: {
                    icon: <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />,
                    value: course.course_run_end ? formatDate(course.course_run_end) : 'Ongoing',
                  },
                  enrolled_since: {
                    icon: <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />,
                    value: formatDate(enrollment?.enrollment_date),
                  },
                  payment_type: {
                    icon: <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />,
                    value: isOneTimePayment(course.billing_cycle) ? 'One Time' : 'Recurring',
                  },
                  billing_cycle: {
                    icon: <RefreshCw className="h-5 w-5 text-muted-foreground mt-0.5" />,
                    value: isOneTimePayment(course.billing_cycle) ? '—' : billingCycleLabels[course.billing_cycle as BillingCycle],
                  },
                  status: {
                    icon: <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />,
                    value: <StatusBadge status={course.status} />,
                  },
                  fee: {
                    icon: <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />,
                    value: isOneTimePayment(course.billing_cycle) 
                      ? `$${Number(course.fee).toFixed(2)}` 
                      : `$${Number(course.fee).toFixed(2)} / ${billingCycleLabels[course.billing_cycle as BillingCycle]}`,
                  },
                };
                const config = fieldConfig[field.key];
                if (!config) return null;
                
                return (
                  <div key={field.key} className="flex items-start gap-3">
                    {config.icon}
                    <div>
                      <p className="text-sm text-muted-foreground">{field.label}</p>
                      <p className="font-medium">{config.value}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Outstanding Charges */}
      {outstandingCharges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={outstandingCharges}
              columns={chargeColumns}
              emptyMessage="No outstanding fees"
            />
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={paidCharges}
            columns={paymentHistoryColumns}
            emptyMessage="No payment history yet"
          />
        </CardContent>
      </Card>

      {/* Upcoming Billing Cycles */}
      {upcomingCycles.length > 0 && outstanding >= 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Billing Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingCycles.map((cycleDate, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{getBillingCycleLabel(cycleDate)}</p>
                      <p className="text-sm text-muted-foreground">Due: {formatDate(cycleDate)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">${Number(course.fee).toFixed(2)}</p>
                    <StatusBadge status="scheduled" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Mode Toggle */}
      <EditModeToggle
        isEditMode={isEditMode}
        onToggle={() => setIsEditMode(!isEditMode)}
        onReset={resetLayout}
        isSaving={isSaving}
      />
    </div>
  );
}
