import { Wallet, BookOpen, AlertCircle } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { useAccountHolders } from '@/hooks/useAccountHolders';
import { useCourseCharges } from '@/hooks/useCourseCharges';
import { useEnrollmentsByAccount } from '@/hooks/useEnrollments';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { usePageBuilder } from '@/components/editor/PageBuilder';
import { EditModeToggle } from '@/components/editor/EditModeToggle';
import { SortableContainer } from '@/components/editor/SortableContainer';
import { ResizableSection } from '@/components/editor/ResizableSection';
import { SectionAdder } from '@/components/editor/SectionAdder';
import { CustomSectionRenderer } from '@/components/editor/CustomSectionRenderer';
import { ColumnEditor } from '@/components/editor/ColumnEditor';
import { ColumnDefinition, LayoutItem } from '@/hooks/usePageLayout';
import { formatDate } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/utils';

const SECTION_IDS = ['welcome', 'stats', 'courses'];

export default function EServiceDashboard() {
  const { currentUserId } = useCurrentUser();
  const navigate = useNavigate();
  
  // Fetch data from database
  const { data: accountHolders = [], isLoading: loadingAccounts } = useAccountHolders();
  const { data: courseCharges = [] } = useCourseCharges();
  
  // Use selected user from context
  const currentUser = accountHolders.find(u => u.id === currentUserId) || accountHolders[0];
  
  const { data: enrollments = [], isLoading: loadingEnrollments } = useEnrollmentsByAccount(currentUser?.id || '');

  const {
    isEditMode,
    toggleEditMode,
    updateLayout,
    updateSectionSize,
    handleAddSection,
    removeSection,
    updateCustomSection,
    resetLayout,
    getOrderedItems,
    getSectionSize,
    isSaving,
    getTableColumns,
    updateTableColumns,
  } = usePageBuilder('eservice-dashboard', SECTION_IDS);

  if (loadingAccounts || loadingEnrollments || !currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const activeEnrollments = enrollments.filter(e => e.status === 'active');

  // Helper to determine if a charge should be considered "due" in the CURRENT billing window for its course.
  // Billing window rules (per course):
  // - If enrolled BEFORE course start date: billing starts on the 5th of the month (standard)
  // - If enrolled ON/AFTER course start date and enrollment happens mid-month: billing starts on enrollment date (first cycle)
  // - Billing window ends at end of the current month
  // NOTE: We intentionally do NOT key the billing window to charge.due_date because charges may have due dates
  //       in the following month while still being payable in the current cycle.
  const isChargeInBillingWindow = (charge: typeof courseCharges[0]): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enrollment = activeEnrollments.find(e => e.courses?.id === charge.course_id);
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
      // Mid-month enrollment after course starts: first cycle starts on enrollment date
      billingStart = new Date(enrollmentDate);
    } else {
      // Standard billing date
      billingStart = new Date(today.getFullYear(), today.getMonth(), 5);
    }
    billingStart.setHours(0, 0, 0, 0);

    const billingEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    billingEnd.setHours(23, 59, 59, 999);

    return today >= billingStart && today <= billingEnd;
  };

  // Filter pending charges - only those in billing window are truly "outstanding"
  const pendingCharges = courseCharges.filter(c => 
    c.account_id === currentUser.id && 
    c.status !== 'clear' &&
    isChargeInBillingWindow(c)
  );

  const outstandingAmount = pendingCharges.reduce((sum, c) => sum + Number(c.amount), 0);

  // Calculate next payment date based on billing cycle
  const calculateNextPaymentDate = (enrollmentDate: string, billingCycle: string): Date => {
    const enrolled = new Date(enrollmentDate);
    const today = new Date();
    let nextPayment = new Date(enrolled);
    
    const cycleMonths: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      biannually: 6,
      yearly: 12,
    };
    
    const months = cycleMonths[billingCycle] || 1;
    
    // Find the next payment date after today
    while (nextPayment <= today) {
      nextPayment.setMonth(nextPayment.getMonth() + months);
    }
    
    return nextPayment;
  };

  // Helper to determine if payment is one-time (no future billing cycles)
  const isOneTimePayment = (billingCycle: string) => {
    return !billingCycle || billingCycle === 'one_time';
  };

  // Prepare course data for table - use embedded course data from enrollment
  const courseData = activeEnrollments.map(enrollment => {
    const course = enrollment.courses;
    if (!course) return null;
    
    const nextPaymentDate = calculateNextPaymentDate(enrollment.enrollment_date, course.billing_cycle);
    
    // Get charges for this course
    const userCharges = courseCharges.filter(c => c.account_id === currentUser.id && c.course_id === course.id);
    const totalFee = userCharges.reduce((sum, c) => sum + Number(c.amount), 0);
    const totalCollected = userCharges
      .filter(c => c.status === 'clear')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    
    // Check if course has ended
    const today = new Date();
    const courseEndDate = course.course_run_end 
      ? new Date(course.course_run_end) 
      : null;
    const isCourseEnded = courseEndDate && courseEndDate < today;
    
    // For one-time payments: fully paid when the charge is paid
    // For recurring: fully paid ONLY when the course has ended AND all charges are paid
    const isOneTime = isOneTimePayment(course.billing_cycle);
    const allChargesPaid = userCharges.length > 0 && userCharges.every(c => c.status === 'clear');
    const isCoursePaid = isOneTime 
      ? (totalCollected >= totalFee && totalFee > 0)
      : (isCourseEnded && allChargesPaid && totalFee > 0);
    
    let paymentStatus: 'outstanding' | 'fully_paid' | 'paid' = 'paid';
    
    if (isCoursePaid) {
      paymentStatus = 'fully_paid';
    } else {
      // Check for outstanding charges that are within billing window
      const hasOutstandingInWindow = userCharges.some(c => 
        (c.status === 'outstanding' || c.status === 'partially_paid') &&
        isChargeInBillingWindow(c)
      );
      
      if (hasOutstandingInWindow) {
        paymentStatus = 'outstanding';
      }
      // Otherwise stays as 'paid' (no outstanding charges)
    }
    
    return {
      id: enrollment.id,
      courseId: course.id,
      name: course.name,
      provider: course.provider,
      billingCycle: course.billing_cycle,
      totalFee,
      totalCollected,
      enrollmentDate: enrollment.enrollment_date,
      nextPaymentDate,
      paymentStatus,
    };
  }).filter(Boolean) as {
    id: string;
    courseId: string;
    name: string;
    provider: string;
    billingCycle: string;
    totalFee: number;
    totalCollected: number;
    enrollmentDate: string;
    nextPaymentDate: Date;
    paymentStatus: 'outstanding' | 'fully_paid' | 'paid';
  }[];

  // Sort courses by payment status hierarchy: Outstanding → Paid → Fully Paid
  const paymentStatusOrder: Record<string, number> = {
    'outstanding': 0,
    'paid': 1,
    'fully_paid': 2,
  };

  const sortedCourseData = [...courseData].sort((a, b) => {
    return paymentStatusOrder[a.paymentStatus] - paymentStatusOrder[b.paymentStatus];
  });

  const billingCycleLabels: Record<string, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    biannually: 'Bi-annually',
    yearly: 'Annually',
  };

  // Default column definitions
  const defaultCourseColumns: ColumnDefinition[] = [
    { key: 'name', header: 'Course Name', visible: true, format: 'text' },
    { key: 'paymentType', header: 'Payment Type', visible: true, format: 'text' },
    { key: 'billingCycle', header: 'Billing Cycle', visible: true, format: 'text' },
    { key: 'enrollmentDate', header: 'Enrolled Date', visible: true, format: 'date' },
    { key: 'billingDate', header: 'Billing Date', visible: true, format: 'date' },
    { key: 'paymentStatus', header: 'Payment Status', visible: true, format: 'status' },
  ];

  const courseColumnsConfig = getTableColumns('courses-table', defaultCourseColumns);

  const courseColumns = [
    {
      key: 'name',
      header: courseColumnsConfig.find(c => c.key === 'name')?.header || 'Course Name',
      render: (item: typeof courseData[0]) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.provider}</p>
        </div>
      )
    },
    {
      key: 'paymentType',
      header: courseColumnsConfig.find(c => c.key === 'paymentType')?.header || 'Payment Type',
      render: (item: typeof courseData[0]) => (
        <span className="text-muted-foreground">
          {isOneTimePayment(item.billingCycle) ? 'One Time' : 'Recurring'}
        </span>
      )
    },
    {
      key: 'billingCycle',
      header: courseColumnsConfig.find(c => c.key === 'billingCycle')?.header || 'Billing Cycle',
      render: (item: typeof courseData[0]) => (
        <span className="text-muted-foreground">
          {isOneTimePayment(item.billingCycle) ? '—' : (billingCycleLabels[item.billingCycle] || item.billingCycle)}
        </span>
      )
    },
    {
      key: 'enrollmentDate',
      header: courseColumnsConfig.find(c => c.key === 'enrollmentDate')?.header || 'Enrolled Date',
      render: (item: typeof courseData[0]) => (
        <span className="text-muted-foreground">
          {formatDate(item.enrollmentDate)}
        </span>
      )
    },
    {
      key: 'billingDate',
      header: courseColumnsConfig.find(c => c.key === 'billingDate')?.header || 'Billing Date',
      render: (item: typeof courseData[0]) => {
        if (item.paymentStatus === 'fully_paid') {
          return <span className="text-muted-foreground">—</span>;
        }

        const enrollment = activeEnrollments.find(e => e.courses?.id === item.courseId);
        const courseStartDate = enrollment?.courses?.course_run_start
          ? new Date(enrollment.courses.course_run_start)
          : null;

        const getBillingDate = () => {
          const today = new Date();
          const enrollmentDate = new Date(item.enrollmentDate);

          const isEnrollmentMonth =
            enrollmentDate.getFullYear() === today.getFullYear() &&
            enrollmentDate.getMonth() === today.getMonth();

          if (isEnrollmentMonth && courseStartDate && enrollmentDate >= courseStartDate) {
            // Mid-month enrollment after course starts
            return enrollmentDate;
          }

          // Standard billing date
          return new Date(today.getFullYear(), today.getMonth(), 5);
        };

        return (
          <span className="text-muted-foreground">
            {formatDate(getBillingDate())}
          </span>
        );
      }
    },
    {
      key: 'paymentStatus',
      header: courseColumnsConfig.find(c => c.key === 'paymentStatus')?.header || 'Payment Status',
      render: (item: typeof courseData[0]) => (
        <StatusBadge status={item.paymentStatus} />
      )
    },
  ].filter(col => courseColumnsConfig.find(c => c.key === col.key || (col.key === 'billingDate' && c.key === 'nextPayment'))?.visible !== false);

  const renderSection = (item: LayoutItem) => {
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

    if (item.id === 'welcome') {
      return (
        <ResizableSection
          key={item.id}
          id={item.id}
          size={getSectionSize(item.id)}
          onSizeChange={(size) => updateSectionSize(item.id, size)}
          isEditMode={isEditMode}
        >
          <div className="rounded-xl gradient-hero p-6 text-primary-foreground">
            <h1 className="text-2xl font-bold">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
            <p className="mt-1 opacity-90">Manage your education account and course payments</p>
          </div>
        </ResizableSection>
      );
    }

    if (item.id === 'stats') {
      return (
        <ResizableSection
          key={item.id}
          id={item.id}
          size={getSectionSize(item.id)}
          onSizeChange={(size) => updateSectionSize(item.id, size)}
          isEditMode={isEditMode}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Account Balance"
              value={`$${formatCurrency(Number(currentUser.balance))}`}
              subtitle="Available for course fees"
              icon={Wallet}
              variant="success"
            />
            <StatCard
              title="Active Courses"
              value={activeEnrollments.length}
              subtitle="Currently enrolled"
              icon={BookOpen}
              variant="accent"
            />
            {/* Outstanding Fees with Pay Now Action - Prominent */}
            <div className={`rounded-xl border-2 p-6 shadow-lg ${outstandingAmount > 0 ? 'border-warning bg-warning/10' : 'border-border bg-card'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${outstandingAmount > 0 ? 'bg-warning/20' : 'bg-muted'}`}>
                    <AlertCircle className={`h-7 w-7 ${outstandingAmount > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Outstanding Fees</p>
                    <p className="text-3xl font-bold text-foreground">${formatCurrency(outstandingAmount)}</p>
                    <p className="text-sm text-muted-foreground">{pendingCharges.length} pending charge(s)</p>
                  </div>
                </div>
                {outstandingAmount > 0 && (
                  <Link to="/eservice/fees">
                    <Button variant="accent" size="lg" className="shadow-md">
                      Pay Now
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </ResizableSection>
      );
    }

    if (item.id === 'courses') {
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <BookOpen className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle>Your Courses</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isEditMode && (
                    <ColumnEditor
                      columns={courseColumnsConfig}
                      availableFields={[
                        { key: 'name', label: 'Course Name', type: 'string' as const },
                        { key: 'provider', label: 'Provider', type: 'string' as const },
                        { key: 'paymentType', label: 'Payment Type', type: 'string' as const },
                        { key: 'billingCycle', label: 'Billing Cycle', type: 'string' as const },
                        { key: 'totalFee', label: 'Total Fee', type: 'number' as const },
                        { key: 'totalCollected', label: 'Collected', type: 'number' as const },
                        { key: 'enrollmentDate', label: 'Enrolled Date', type: 'date' as const },
                        { key: 'paymentStatus', label: 'Payment Status', type: 'status' as const },
                      ]}
                      onColumnsChange={(cols) => updateTableColumns('courses-table', cols)}
                      isEditMode={isEditMode}
                      tableId="courses-table"
                    />
                  )}
                  <Link to="/eservice/fees">
                    <Button variant="ghost" size="sm">View all →</Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={sortedCourseData}
                columns={courseColumns}
                emptyMessage="No active courses"
                onRowClick={(course) => navigate(`/eservice/courses/${course.courseId}`)}
              />
            </CardContent>
          </Card>
        </ResizableSection>
      );
    }

    return null;
  };

  const orderedItems = getOrderedItems();

  return (
    <div className="space-y-8 animate-fade-in">
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
    </div>
  );
}
