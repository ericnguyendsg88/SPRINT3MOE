import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, BookOpen, AlertCircle, XCircle, Mail, Phone, Calendar, CreditCard, ArrowUp, Pencil, HelpCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { useAccountHolder, useUpdateAccountHolder } from '@/hooks/useAccountHolders';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useCourses } from '@/hooks/useCourses';
import { useCourseCharges } from '@/hooks/useCourseCharges';
import { useTransactionsByAccount } from '@/hooks/useTransactions';
import { usePageLayout, SectionSize, ColumnDefinition, LayoutItem } from '@/hooks/usePageLayout';
import { formatDate } from '@/lib/dateUtils';
import { formatTime } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { ResizableSection } from '@/components/editor/ResizableSection';
import { SortableContainer } from '@/components/editor/SortableContainer';
import { EditModeToggle } from '@/components/editor/EditModeToggle';
import { EditableText } from '@/components/editor/EditableText';
import { ColumnEditor, AvailableField } from '@/components/editor/ColumnEditor';
import { SectionAdder, CustomSection } from '@/components/editor/SectionAdder';
import { CustomSectionRenderer } from '@/components/editor/CustomSectionRenderer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Section IDs for drag-and-drop
const SECTION_IDS = ['stats', 'student-info', 'enrolled-courses', 'outstanding-fees', 'top-up-history', 'payment-history'];

export default function StudentDetail() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  
  const { data: account, isLoading: loadingAccount } = useAccountHolder(accountId || '');
  const { data: enrollments = [] } = useEnrollments();
  const { data: courses = [] } = useCourses();
  const { data: courseCharges = [] } = useCourseCharges();
  const { data: transactions = [] } = useTransactionsByAccount(accountId || '');
  const updateAccountMutation = useUpdateAccountHolder();

  // Page layout for drag-and-drop
  const {
    layout,
    updateLayout,
    updateSectionSize,
    addSection,
    removeSection,
    updateCustomSection,
    resetLayout,
    getOrderedItems,
    isSaving,
    getTableColumns,
    updateTableColumns,
  } = usePageLayout(`student-detail-${accountId}`, SECTION_IDS);

  // Handle adding new sections
  const handleAddSection = (section: CustomSection) => {
    addSection({
      type: section.type,
      title: section.title,
      fields: section.fields,
      tableDataSource: section.tableConfig?.dataSource,
    });
  };

  // Get section size from layout
  const getSectionSize = (sectionId: string): SectionSize => {
    const item = layout.find(l => l.id === sectionId);
    return item?.size || 'full';
  };

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: string) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editRegisteredAddress, setEditRegisteredAddress] = useState('');
  const [editMailingAddress, setEditMailingAddress] = useState('');
  const [editInSchool, setEditInSchool] = useState<'in_school' | 'not_in_school'>('in_school');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive' | 'closed' | 'pending'>('active');

  const openEditDialog = () => {
    if (account) {
      setEditName(account.name);
      setEditEmail(account.email);
      setEditPhone(account.phone || '');
      setEditDateOfBirth(account.date_of_birth);
      setEditRegisteredAddress(account.residential_address || '');
      setEditMailingAddress(account.mailing_address || '');
      setEditInSchool(account.in_school);
      setEditStatus(account.status);
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!account) return;
    
    await updateAccountMutation.mutateAsync({
      id: account.id,
      name: editName,
      email: editEmail,
      phone: editPhone || null,
      date_of_birth: editDateOfBirth,
      residential_address: editRegisteredAddress || null,
      mailing_address: editMailingAddress || null,
      in_school: editInSchool,
      status: editStatus,
    });
    
    setEditDialogOpen(false);
  };

  // Compute data early so we can use it in section rendering
  const computedData = useMemo(() => {
    if (!account) return null;

    // Calculate age
    const birthDate = new Date(account.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Get student's course charges
    const studentCharges = courseCharges.filter(c => c.account_id === accountId);
    const outstandingCharges = studentCharges.filter(c => c.status === 'outstanding');
    const clearCharges = studentCharges.filter(c => c.status === 'clear');
    const totalOutstanding = outstandingCharges.reduce((sum, c) => sum + Number(c.amount), 0);

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
      
      while (nextPayment <= today) {
        nextPayment.setMonth(nextPayment.getMonth() + months);
      }
      
      return nextPayment;
    };

    // Get student's enrollments with course details
    const studentEnrollments = enrollments.filter(e => e.account_id === accountId);
    const enrolledCourses = studentEnrollments.map(e => {
      const course = courses.find(c => c.id === e.course_id);
      if (!course) return null;
      
      const courseChargesForEnrollment = studentCharges.filter(c => c.course_id === course.id);
      const totalFee = courseChargesForEnrollment.reduce((sum, c) => sum + Number(c.amount), 0);
      const totalCollected = courseChargesForEnrollment
        .filter(c => c.status === 'clear')
        .reduce((sum, c) => sum + Number(c.amount), 0);
      
      // Check if course has ended (no more upcoming billing cycles)
      const today = new Date();
      const courseEndDate = course.course_run_end ? new Date(course.course_run_end) : null;
      const isCourseEnded = courseEndDate && courseEndDate < today;
      
      // Course is only "fully paid" if it has ended AND all charges are paid
      const isCoursePaid = isCourseEnded && totalCollected >= totalFee && totalFee > 0;
      
      let paymentStatus: 'outstanding' | 'fully_paid' | 'scheduled' = 'scheduled';
      
      if (isCoursePaid) {
        paymentStatus = 'fully_paid';
      } else {
        // Check for outstanding
        const hasOutstanding = courseChargesForEnrollment.some(c => 
          c.status === 'outstanding' || c.status === 'partially_paid'
        );
        
        const allClear = courseChargesForEnrollment.length > 0 && 
                         courseChargesForEnrollment.every(c => c.status === 'clear');
        
        if (hasOutstanding) paymentStatus = 'outstanding';
        else if (allClear) paymentStatus = 'scheduled';
      }
      
      const nextPaymentDate = calculateNextPaymentDate(e.enrollment_date, course.billing_cycle);
      
      // Determine payment type based on billing cycle
      const isOneTime = !course.billing_cycle || course.billing_cycle === 'one_time';
      const paymentType = isOneTime ? 'One-Time' : 'Recurring';
      
      return {
        id: e.id,
        courseId: course.id,
        courseName: course.name,
        provider: course.provider,
        fee: Number(course.fee),
        billingCycle: course.billing_cycle,
        paymentType,
        enrollmentDate: e.enrollment_date,
        nextPaymentDate,
        paymentStatus,
        totalFee,
        totalCollected,
      };
    }).filter(Boolean) as {
      id: string;
      courseId: string;
      courseName: string;
      provider: string;
      fee: number;
      billingCycle: string;
      paymentType: string;
      enrollmentDate: string;
      nextPaymentDate: Date;
      paymentStatus: 'outstanding' | 'fully_paid' | 'scheduled';
      totalFee: number;
      totalCollected: number;
    }[];

    // Filter top-up transactions
    const topUpTransactions = transactions.filter(t => t.type === 'top_up');

    return {
      age,
      studentCharges,
      outstandingCharges,
      clearCharges,
      totalOutstanding,
      enrolledCourses,
      topUpTransactions,
    };
  }, [account, accountId, courseCharges, enrollments, courses, transactions]);

  if (loadingAccount) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading student details...</div>
      </div>
    );
  }

  if (!account || !computedData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Student not found</p>
        <Button variant="outline" onClick={() => navigate('/admin/accounts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Accounts
        </Button>
      </div>
    );
  }

  const { age, outstandingCharges, clearCharges, totalOutstanding, enrolledCourses, studentCharges, topUpTransactions } = computedData;

  // Determine if account is active (inactive if age > 30 OR manually set to inactive)
  // Use account.status if it exists, otherwise default to age-based calculation
  const accountActiveStatus = account.status === 'closed' ? 'inactive' : (account.status || (calculateAge(account.date_of_birth) <= 30 ? 'active' : 'inactive'));

  // Education level labels
  const educationLevelLabels: Record<string, string> = {
    primary: 'Primary',
    secondary: 'Secondary',
    post_secondary: 'Post-Secondary',
    tertiary: 'Tertiary',
    postgraduate: 'Postgraduate',
  };

  const residentialStatusLabels: Record<string, string> = {
    sc: 'SC (Singapore Citizen)',
    pr: 'PR (Permanent Resident)',
    non_resident: 'Non-Resident',
  };

  const handleToggleActiveStatus = async () => {
    const newStatus = accountActiveStatus === 'active' ? 'inactive' : 'active';
    await updateAccountMutation.mutateAsync({
      id: account.id,
      status: newStatus,
    });
  };

  const handleCloseAccount = async () => {
    await updateAccountMutation.mutateAsync({
      id: account.id,
      status: 'closed',
      closed_at: new Date().toISOString(),
    });
    navigate('/admin/accounts');
  };

  const courseColumns = [
    {
      key: 'courseName',
      header: 'Course Name',
      render: (item: typeof enrolledCourses[0]) => (
        <div>
          <p className="font-medium text-foreground">{item.courseName}</p>
          <p className="text-xs text-muted-foreground">{item.provider}</p>
        </div>
      )
    },
    {
      key: 'paymentType',
      header: 'Payment Type',
      render: (item: typeof enrolledCourses[0]) => (
        <span className="text-muted-foreground">
          {item.paymentType}
        </span>
      )
    },
    {
      key: 'billingCycle',
      header: 'Billing Cycle',
      render: (item: typeof enrolledCourses[0]) => {
        const cycleLabels: Record<string, string> = {
          monthly: 'Monthly',
          quarterly: 'Quarterly',
          biannually: 'Bi-annually',
          yearly: 'Annually',
        };
        // Display '-' for one-time payments since billing cycle is not applicable
        const isOneTime = !item.billingCycle || item.billingCycle === 'one_time';
        if (isOneTime) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <span className="text-muted-foreground">
            {cycleLabels[item.billingCycle] || item.billingCycle}
          </span>
        );
      }
    },
    {
      key: 'totalFee',
      header: 'Total Fee',
      render: (item: typeof enrolledCourses[0]) => (
        <span className="font-semibold text-foreground">
          ${item.totalFee.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'enrollmentDate',
      header: 'Enrolled Date',
      render: (item: typeof enrolledCourses[0]) => (
        <span className="text-muted-foreground">
          {formatDate(item.enrollmentDate)}
        </span>
      )
    },
  ];

  const formatPaymentMethod = (method: string | null) => {
    if (!method) return '-';
    const methodLabels: Record<string, string> = {
      'account_balance': 'Account Balance',
      'credit_debit_card': 'Credit/Debit Card',
      'bank_transfer': 'Bank Transfer',
      'combined': 'Combined'
    };
    const label = methodLabels[method] || method;
    
    if (method === 'combined') {
      return (
        <span className="flex items-center gap-1">
          {label}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Payment made using multiple methods (e.g., Account Balance + Credit Card)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      );
    }
    
    return label;
  };

  // Helper to get billing date (5th of the month) from due date
  const getBillingDate = (dueDate: string): string => {
    const date = new Date(dueDate);
    const billingDate = new Date(date.getFullYear(), date.getMonth(), 5);
    return formatDate(billingDate.toISOString());
  };

  // Helper to get due date (30th of the month)
  const getDueDate = (dueDate: string): string => {
    const date = new Date(dueDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    // Get last day of month to handle Feb correctly
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dueDateDay = new Date(year, month, Math.min(30, lastDay));
    return formatDate(dueDateDay.toISOString());
  };

  const outstandingChargeColumns = [
    {
      key: 'course_name',
      header: 'Course',
      render: (item: typeof studentCharges[0]) => {
        const course = courses.find(c => c.id === item.course_id);
        return (
          <div>
            <p className="font-medium text-foreground">{item.course_name}</p>
            {course?.provider && (
              <p className="text-xs text-muted-foreground">{course.provider}</p>
            )}
          </div>
        );
      }
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: typeof studentCharges[0]) => (
        <span className="font-semibold text-foreground">${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
      )
    },
    {
      key: 'billing_date',
      header: 'Billing Date',
      render: (item: typeof studentCharges[0]) => (
        <span className="text-muted-foreground">
          {getBillingDate(item.due_date)}
        </span>
      )
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (item: typeof studentCharges[0]) => (
        <span className="text-muted-foreground">
          {getDueDate(item.due_date)}
        </span>
      )
    },
  ];

  const paymentHistoryColumns = [
    {
      key: 'course_name',
      header: 'Course',
      render: (item: typeof studentCharges[0]) => {
        const course = courses.find(c => c.id === item.course_id);
        return (
          <div>
            <p className="font-medium text-foreground">{item.course_name}</p>
            {course?.provider && (
              <p className="text-xs text-muted-foreground">{course.provider}</p>
            )}
          </div>
        );
      }
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: typeof studentCharges[0]) => (
        <span className="font-semibold text-foreground">${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
      )
    },
    {
      key: 'due_date',
      header: 'Paid Date',
      render: (item: typeof studentCharges[0]) => (
        <div>
          <div>{formatDate(item.paid_date || item.due_date)}</div>
          <div className="text-xs text-muted-foreground">{item.paid_date && formatTime(item.paid_date)}</div>
        </div>
      )
    },
    {
      key: 'payment_method',
      header: 'Payment Method',
      render: (item: typeof studentCharges[0]) => (
        <span className="text-muted-foreground">{formatPaymentMethod(item.payment_method)}</span>
      )
    },
  ];

  // Default column configurations for tables
  const defaultCourseColumns: ColumnDefinition[] = [
    { key: 'courseName', header: 'Course Name', visible: true, dataField: 'courseName', format: 'text' },
    { key: 'billingCycle', header: 'Billing Cycle', visible: true, dataField: 'billingCycle', format: 'text' },
    { key: 'totalFee', header: 'Total Fee', visible: true, dataField: 'totalFee', format: 'currency' },
    { key: 'enrollmentDate', header: 'Enrolled Date', visible: true, dataField: 'enrollmentDate', format: 'date' },
    { key: 'totalCollected', header: 'Collected', visible: false, dataField: 'totalCollected', format: 'currency' },
    { key: 'nextPayment', header: 'Next Payment', visible: false, dataField: 'nextPayment', format: 'date' },
    { key: 'paymentStatus', header: 'Payment Status', visible: false, dataField: 'paymentStatus', format: 'status' },
  ];

  const defaultOutstandingColumns: ColumnDefinition[] = [
    { key: 'course_name', header: 'Course', visible: true, dataField: 'course_name', format: 'text' },
    { key: 'amount', header: 'Amount', visible: true, dataField: 'amount', format: 'currency' },
    { key: 'billing_date', header: 'Billing Date', visible: true, dataField: 'billing_date', format: 'date' },
    { key: 'due_date', header: 'Due Date', visible: true, dataField: 'due_date', format: 'date' },
  ];

  const defaultPaymentHistoryColumns: ColumnDefinition[] = [
    { key: 'course_name', header: 'Course', visible: true, dataField: 'course_name', format: 'text' },
    { key: 'amount', header: 'Amount', visible: true, dataField: 'amount', format: 'currency' },
    { key: 'paid_date', header: 'Paid Date', visible: true, dataField: 'paid_date', format: 'date' },
    { key: 'payment_method', header: 'Payment Method', visible: true, dataField: 'payment_method', format: 'text' },
  ];

  // Available fields for each table
  const courseAvailableFields: AvailableField[] = [
    { key: 'courseName', label: 'Course Name', type: 'string' },
    { key: 'provider', label: 'Provider', type: 'string' },
    { key: 'paymentType', label: 'Payment Type', type: 'string' },
    { key: 'billingCycle', label: 'Billing Cycle', type: 'string' },
    { key: 'fee', label: 'Course Fee', type: 'number' },
    { key: 'totalFee', label: 'Total Fee', type: 'number' },
    { key: 'totalCollected', label: 'Total Collected', type: 'number' },
    { key: 'enrollmentDate', label: 'Enrollment Date', type: 'date' },
    { key: 'nextPaymentDate', label: 'Next Payment Date', type: 'date' },
    { key: 'paymentStatus', label: 'Payment Status', type: 'status' },
  ];

  const chargeAvailableFields: AvailableField[] = [
    { key: 'course_name', label: 'Course Name', type: 'string' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'amount_paid', label: 'Amount Paid', type: 'number' },
    { key: 'due_date', label: 'Due Date', type: 'date' },
    { key: 'paid_date', label: 'Paid Date', type: 'date' },
    { key: 'payment_method', label: 'Payment Method', type: 'string' },
    { key: 'status', label: 'Status', type: 'status' },
  ];

  // Get current columns from layout or use defaults
  const courseColumnsConfig = getTableColumns('enrolled-courses', defaultCourseColumns);
  const outstandingColumnsConfig = getTableColumns('outstanding-fees', defaultOutstandingColumns);
  const paymentHistoryColumnsConfig = getTableColumns('payment-history', defaultPaymentHistoryColumns);

  const formatCell = (value: any, format?: ColumnDefinition['format'], fieldKey?: string) => {
    if (fieldKey === 'payment_method') {
      return <span className="text-muted-foreground">{formatPaymentMethod(value ?? null)}</span>;
    }

    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;

    switch (format) {
      case 'currency':
        return (
          <span className="font-semibold text-foreground">
            ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        );
      case 'date': {
        const date = value instanceof Date ? value : new Date(value);
        return <span className="text-muted-foreground">{isNaN(date.getTime()) ? '—' : formatDate(date)}</span>;
      }
      case 'status':
        return <StatusBadge status={String(value) as any} />;
      case 'text':
      default:
        return <span className="text-muted-foreground">{String(value)}</span>;
    }
  };

  // Build DataTable columns from persisted config so edits (header/field/format/visibility) reflect immediately.
  const buildColumnsFromConfig = <T extends Record<string, any>>(
    baseColumns: { key: string; header: string; render?: (item: T) => React.ReactNode }[],
    config: ColumnDefinition[]
  ) => {
    const baseMap = new Map(baseColumns.map(c => [c.key, c] as const));

    return config
      .filter(c => c.visible)
      .map((c) => {
        const base = baseMap.get(c.key);
        const fieldKey = c.dataField || c.key;

        const canUseBaseRender = !!base?.render && (fieldKey === c.key);

        return {
          key: c.key,
          header: c.header,
          render: (item: T) => (canUseBaseRender ? base!.render!(item) : formatCell(item[fieldKey], c.format, fieldKey)),
        };
      });
  };

  // Handle inline field updates
  const handleFieldUpdate = async (field: string, value: string) => {
    if (!account) return;
    await updateAccountMutation.mutateAsync({
      id: account.id,
      [field]: value || null,
    });
  };

  // Render sections based on layout order
  const renderSection = (sectionId: string) => {
    const sectionSize = getSectionSize(sectionId);
    
    switch (sectionId) {
      case 'stats':
        return (
          <ResizableSection 
            key={sectionId} 
            id={sectionId} 
            isEditMode={isEditMode}
            size={sectionSize}
            onSizeChange={(size) => updateSectionSize(sectionId, size)}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                      <CreditCard className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="text-2xl font-bold text-foreground">${Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Enrolled Courses</p>
                      <p className="text-2xl font-bold text-foreground">
                        {enrolledCourses.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${totalOutstanding > 0 ? 'bg-warning/10' : 'bg-success/10'}`}>
                      <AlertCircle className={`h-6 w-6 ${totalOutstanding > 0 ? 'text-warning' : 'text-success'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding Fees</p>
                      <p className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-warning' : 'text-success'}`}>
                        ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ResizableSection>
        );

      case 'student-info':
        return (
          <ResizableSection 
            key={sectionId} 
            id={sectionId} 
            isEditMode={isEditMode}
            size={sectionSize}
            onSizeChange={(size) => updateSectionSize(sectionId, size)}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Date of Birth</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-foreground">
                        {formatDate(account.date_of_birth)} ({age} years old)
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <EditableText
                        value={account.email}
                        onSave={(value) => handleFieldUpdate('email', value)}
                        isEditMode={isEditMode}
                        className="font-medium text-foreground"
                        type="email"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <EditableText
                        value={account.phone || ''}
                        onSave={(value) => handleFieldUpdate('phone', value)}
                        isEditMode={isEditMode}
                        className="font-medium text-foreground"
                        type="tel"
                        placeholder="Enter phone..."
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Education Level</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {account.education_level ? educationLevelLabels[account.education_level] : '—'}
                      </p>
                      <span className="text-xs text-muted-foreground">(Auto-determined by courses)</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Residential Status</p>
                    <p className="font-medium text-foreground">
                      {residentialStatusLabels[account.residential_status] || account.residential_status}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Schooling Status</p>
                    <StatusBadge status={enrolledCourses.length > 0 ? 'in_school' : 'not_in_school'} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Created</p>
                    <p className="font-medium text-foreground">
                      {formatDate(account.created_at)}
                    </p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Registered Address</p>
                    <EditableText
                      value={account.residential_address || ''}
                      onSave={(value) => handleFieldUpdate('residential_address', value)}
                      isEditMode={isEditMode}
                      className="font-medium text-foreground"
                      placeholder="Enter address..."
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Mailing Address</p>
                    <EditableText
                      value={account.mailing_address || ''}
                      onSave={(value) => handleFieldUpdate('mailing_address', value)}
                      isEditMode={isEditMode}
                      className="font-medium text-foreground"
                      placeholder="Enter mailing address..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </ResizableSection>
        );

      case 'enrolled-courses':
        return (
          <ResizableSection 
            key={sectionId} 
            id={sectionId} 
            isEditMode={isEditMode}
            size={sectionSize}
            onSizeChange={(size) => updateSectionSize(sectionId, size)}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  Enrolled Courses ({enrolledCourses.length})
                </CardTitle>
                <ColumnEditor
                  columns={courseColumnsConfig}
                  availableFields={courseAvailableFields}
                  onColumnsChange={(cols) => updateTableColumns('enrolled-courses', cols)}
                  isEditMode={isEditMode}
                  tableId="enrolled-courses"
                />
              </CardHeader>
              <CardContent>
                <DataTable
                  data={enrolledCourses}
                  columns={buildColumnsFromConfig(courseColumns, courseColumnsConfig)}
                  emptyMessage="No courses enrolled"
                  onRowClick={(item) => navigate(`/admin/accounts/${accountId}/courses/${item.courseId}`)}
                />
              </CardContent>
            </Card>
          </ResizableSection>
        );

      case 'outstanding-fees':
        return (
          <ResizableSection 
            key={sectionId} 
            id={sectionId} 
            isEditMode={isEditMode}
            size={sectionSize}
            onSizeChange={(size) => updateSectionSize(sectionId, size)}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className={`h-5 w-5 ${outstandingCharges.length > 0 ? 'text-warning' : 'text-success'}`} />
                  Outstanding Fees ({outstandingCharges.length})
                </CardTitle>
                <ColumnEditor
                  columns={outstandingColumnsConfig}
                  availableFields={chargeAvailableFields}
                  onColumnsChange={(cols) => updateTableColumns('outstanding-fees', cols)}
                  isEditMode={isEditMode}
                  tableId="outstanding-fees"
                />
              </CardHeader>
              <CardContent>
                <DataTable
                  data={outstandingCharges}
                  columns={buildColumnsFromConfig(outstandingChargeColumns, outstandingColumnsConfig)}
                  emptyMessage="No outstanding fees"
                />
              </CardContent>
            </Card>
          </ResizableSection>
        );

      case 'top-up-history':
        return (
          <ResizableSection 
            key={sectionId} 
            id={sectionId} 
            isEditMode={isEditMode}
            size={sectionSize}
            onSizeChange={(size) => updateSectionSize(sectionId, size)}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUp className="h-5 w-5 text-success" />
                  Top Up History ({topUpTransactions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={topUpTransactions}
                  columns={[
                    {
                      key: 'created_at',
                      header: 'Date & Time',
                      render: (transaction) => (
                        <div>
                          <div>{formatDate(transaction.created_at)}</div>
                          <div className="text-xs text-muted-foreground">{formatTime(transaction.created_at)}</div>
                        </div>
                      ),
                    },
                    {
                      key: 'amount',
                      header: 'Amount',
                      render: (transaction) => (
                        <span className="font-semibold text-success">
                          +${Number(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </span>
                      ),
                    },
                    {
                      key: 'reference',
                      header: 'Reference',
                      render: (transaction) => transaction.reference || '—',
                    },
                    {
                      key: 'description',
                      header: 'Description',
                      render: (transaction) => transaction.description || '—',
                    },
                  ]}
                  emptyMessage="No top-up history"
                />
              </CardContent>
            </Card>
          </ResizableSection>
        );

      case 'payment-history':
        return (
          <ResizableSection 
            key={sectionId} 
            id={sectionId} 
            isEditMode={isEditMode}
            size={sectionSize}
            onSizeChange={(size) => updateSectionSize(sectionId, size)}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-success" />
                  Payment History ({clearCharges.length})
                </CardTitle>
                <ColumnEditor
                  columns={paymentHistoryColumnsConfig}
                  availableFields={chargeAvailableFields}
                  onColumnsChange={(cols) => updateTableColumns('payment-history', cols)}
                  isEditMode={isEditMode}
                  tableId="payment-history"
                />
              </CardHeader>
              <CardContent>
                <DataTable
                  data={clearCharges}
                  columns={buildColumnsFromConfig(paymentHistoryColumns, paymentHistoryColumnsConfig)}
                  emptyMessage="No payment history"
                />
              </CardContent>
            </Card>
          </ResizableSection>
        );

      default:
        // Check if this is a custom section
        const sectionData = layout.find(l => l.id === sectionId);
        if (sectionData?.isCustom && sectionData.customConfig) {
          return (
            <CustomSectionRenderer
              key={sectionId}
              section={sectionData}
              isEditMode={isEditMode}
              onSizeChange={(size) => updateSectionSize(sectionId, size)}
              onRemove={() => removeSection(sectionId)}
              onUpdateConfig={(config) => updateCustomSection(sectionId, config)}
            />
          );
        }
        return null;
    }
  };

  // Available data sources for table modules
  const availableDataSources = [
    { key: 'enrollments', label: 'Enrollments' },
    { key: 'course_charges', label: 'Course Charges' },
    { key: 'transactions', label: 'Transactions' },
  ];

  const orderedItems = getOrderedItems();

  return (
    <div className="space-y-6 animate-fade-in pl-12">
      {/* Header - not draggable */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/accounts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{account.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                accountActiveStatus === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {accountActiveStatus === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-muted-foreground">{account.nric}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openEditDialog}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          {account.status !== 'closed' && accountActiveStatus === 'inactive' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" className="bg-success hover:bg-success/90">
                  <Check className="h-4 w-4 mr-2" />
                  Reactivate Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reactivate Student Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reactivate the account for {account.name}. The student will be able to access the e-service portal and make payments again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleToggleActiveStatus}
                    className="bg-success text-white hover:bg-success/90"
                  >
                    Reactivate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {account.status !== 'closed' && accountActiveStatus === 'active' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Deactivate Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate Student Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will deactivate the account for {account.name}. The account will remain in the system but the student will not be able to access the e-service portal or make payments.
                    {totalOutstanding > 0 && (
                      <span className="block mt-2 text-warning font-medium">
                        Warning: This student has ${formatCurrency(totalOutstanding)} in outstanding fees.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleToggleActiveStatus}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Deactivate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student Information</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Full Name *</Label>
              <Input
                id="editName"
                value={editName}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editNric">NRIC/FIN *</Label>
              <Input
                id="editNric"
                value={account?.nric || ''}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editDateOfBirth">Date of Birth *</Label>
              <Input
                id="editDateOfBirth"
                value={editDateOfBirth ? formatDate(editDateOfBirth) : ''}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editEmail">Email *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editPhone">Phone</Label>
              <Input
                id="editPhone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editRegisteredAddress">Registered Address</Label>
              <Input
                id="editRegisteredAddress"
                value={editRegisteredAddress}
                onChange={(e) => setEditRegisteredAddress(e.target.value)}
                placeholder="Enter registered address"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editMailingAddress">Mailing Address</Label>
              <Input
                id="editMailingAddress"
                value={editMailingAddress}
                onChange={(e) => setEditMailingAddress(e.target.value)}
                placeholder="Enter mailing address"
              />
            </div>

            <div className="grid gap-2">
              <Label>Education Level</Label>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border">
                <span className="text-sm text-muted-foreground">
                  {account?.education_level ? educationLevelLabels[account.education_level] : 'Not Set'}
                </span>
                <span className="text-xs text-muted-foreground italic">(Auto-determined by enrolled courses)</span>
              </div>
            </div>


            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={!editName || !editEmail || !editDateOfBirth || updateAccountMutation.isPending}
              >
                {updateAccountMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Draggable Sections */}
      <SortableContainer items={layout} onReorder={updateLayout} isEditMode={isEditMode}>
        <div className="grid grid-cols-12 gap-6">
          {orderedItems.map(item => renderSection(item.id))}
        </div>
      </SortableContainer>

      {/* Add Section Button - only in edit mode */}
      {isEditMode && (
        <div className="col-span-12">
          <SectionAdder
            isEditMode={isEditMode}
            onAddSection={handleAddSection}
            availableDataSources={availableDataSources}
          />
        </div>
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
