import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Download, ArrowUpDown, ArrowUp, ArrowDown, ArrowLeft, ArrowUpRight, X, Building, Monitor, CreditCard, RefreshCw, CheckCircle, Calendar, CalendarDays, DollarSign, GraduationCap, ChevronDown, Activity, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DateInput } from '@/components/ui/date-input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { useCourses, useCreateCourse } from '@/hooks/useCourses';
import { useEnrollments } from '@/hooks/useEnrollments';
import { formatDate } from '@/lib/dateUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProviders } from '@/contexts/ProvidersContext';

type SortField = 'name' | 'provider' | 'course_run_start' | 'course_run_end' | 'fee' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function CourseManagement() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string[]>([]);
  const [modeFilter, setModeFilter] = useState<string[]>([]);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string[]>([]);
  const [billingCycleFilter, setBillingCycleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [courseStartDate, setCourseStartDate] = useState<string>('');
  const [courseEndDate, setCourseEndDate] = useState<string>('');
  const [feeMin, setFeeMin] = useState<string>('');
  const [feeMax, setFeeMax] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isReviewStep, setIsReviewStep] = useState(false);

  // Form state for adding course
  const [courseName, setCourseName] = useState('');
  const [provider, setProvider] = useState('');
  const [courseStart, setCourseStart] = useState('');
  const [courseEnd, setCourseEnd] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [billingCycle, setBillingCycle] = useState('');
  const [totalFee, setTotalFee] = useState('');
  const [modeOfTraining, setModeOfTraining] = useState('');
  const [courseStatus, setCourseStatus] = useState('active');

  // Fetch data
  const { data: courses = [], isLoading: loadingCourses } = useCourses();
  const { data: enrollments = [] } = useEnrollments();
  const createCourseMutation = useCreateCourse();
  const { activeProviders, providers } = useProviders();

  // Get all providers (active and inactive) for filter
  const allProviders = useMemo(() => {
    return providers.map(p => p.name).sort();
  }, [providers]);

  // Get education levels for selected provider
  const selectedProviderEducationLevels = useMemo(() => {
    if (!provider) return [];
    const selectedProvider = providers.find(p => p.name === provider);
    return selectedProvider?.educationLevels || [];
  }, [provider, providers]);

  // Auto-select education level if provider has only one
  // Auto-set payment type to one_time when no billing cycles available
  useMemo(() => {
    if (courseStart && courseEnd) {
      const startDate = new Date(courseStart);
      const endDate = new Date(courseEnd);
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                     (endDate.getMonth() - startDate.getMonth()) + 1;
      
      if (months <= 1) {
        // Course occurs within one month - force one-time payment
        setPaymentType('one_time');
        setBillingCycle('');
      }
    }
  }, [courseStart, courseEnd]);

  // Education level labels
  const educationLevelLabels: Record<string, string> = {
    primary: 'Primary',
    secondary: 'Secondary',
    post_secondary: 'Post-Secondary',
    tertiary: 'Tertiary',
    postgraduate: 'Postgraduate',
  };

  // Helper function to get enrolled students count for a course
  const getEnrolledStudentsCount = (courseId: string) => {
    return enrollments.filter(e => e.course_id === courseId).length;
  };

  // Filter labels
  const paymentTypeLabels: Record<string, string> = {
    one_time: 'One Time',
    recurring: 'Recurring',
  };

  const billingCycleLabels: Record<string, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    biannually: 'Bi-annually',
    yearly: 'Annually',
  };

  const modeLabels: Record<string, string> = {
    online: 'Online',
    'in-person': 'In-Person',
    hybrid: 'Hybrid',
  };

  const statusLabels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
  };

  // Filtered and sorted courses
  const filteredAndSortedCourses = useMemo(() => {
    let filtered = courses.filter(course => {
      // Search filter (course name, provider, Course ID)
      const matchesSearch = 
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Provider filter (multi-select)
      const matchesProvider = providerFilter.length === 0 || providerFilter.includes(course.provider);
      
      // Mode filter (multi-select)
      const matchesMode = modeFilter.length === 0 || 
        (course.mode_of_training && modeFilter.includes(course.mode_of_training));
      
      // Payment type filter (multi-select)
      const coursePaymentType = course.billing_cycle === 'one_time' ? 'one_time' : 'recurring';
      const matchesPaymentType = paymentTypeFilter.length === 0 || paymentTypeFilter.includes(coursePaymentType);
      
      // Billing cycle filter (multi-select)
      const matchesBillingCycle = billingCycleFilter.length === 0 || 
        (course.billing_cycle && billingCycleFilter.includes(course.billing_cycle));
      
      // Status filter (multi-select)
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(course.status);
      
      // Course start date filter
      const courseStartVal = course.course_run_start ? new Date(course.course_run_start).toDateString() : null;
      const matchesCourseStart = !courseStartDate || !courseStartVal || courseStartVal === new Date(courseStartDate).toDateString();
      
      // Course end date filter
      const courseEndVal = course.course_run_end ? new Date(course.course_run_end).toDateString() : null;
      const matchesCourseEnd = !courseEndDate || !courseEndVal || courseEndVal === new Date(courseEndDate).toDateString();
      
      // Fee range
      const fee = Number(course.fee);
      const matchesFeeMin = !feeMin || fee >= parseFloat(feeMin);
      const matchesFeeMax = !feeMax || fee <= parseFloat(feeMax);

      return matchesSearch && matchesProvider && matchesMode && 
             matchesPaymentType && matchesBillingCycle && matchesStatus &&
             matchesCourseStart && matchesCourseEnd &&
             matchesFeeMin && matchesFeeMax;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'provider':
          comparison = a.provider.localeCompare(b.provider);
          break;
        case 'course_run_start':
          comparison = new Date(a.course_run_start || 0).getTime() - new Date(b.course_run_start || 0).getTime();
          break;
        case 'course_run_end':
          comparison = new Date(a.course_run_end || 0).getTime() - new Date(b.course_run_end || 0).getTime();
          break;
        case 'fee':
          comparison = Number(a.fee) - Number(b.fee);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [courses, searchQuery, providerFilter, modeFilter, paymentTypeFilter, 
      billingCycleFilter, statusFilter, courseStartDate, courseEndDate, 
      feeMin, feeMax, sortField, sortDirection]);

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1 text-primary" />
      : <ArrowDown className="h-4 w-4 ml-1 text-primary" />;
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setProviderFilter([]);
    setModeFilter([]);
    setPaymentTypeFilter([]);
    setBillingCycleFilter([]);
    setStatusFilter([]);
    setCourseStartDate('');
    setCourseEndDate('');
    setFeeMin('');
    setFeeMax('');
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || providerFilter.length > 0 ||
    modeFilter.length > 0 || paymentTypeFilter.length > 0 ||
    billingCycleFilter.length > 0 || statusFilter.length > 0 ||
    courseStartDate || courseEndDate || feeMin || feeMax;

  // Toggle filter selection helpers
  const toggleProviderFilter = (value: string) => {
    setProviderFilter(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleModeFilter = (value: string) => {
    setModeFilter(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const togglePaymentTypeFilter = (value: string) => {
    setPaymentTypeFilter(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleBillingCycleFilter = (value: string) => {
    setBillingCycleFilter(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleStatusFilter = (value: string) => {
    setStatusFilter(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleRowClick = (courseId: string) => {
    navigate(`/admin/courses/${courseId}`);
  };

  const resetForm = () => {
    setCourseName('');
    setProvider('');
    setCourseStart('');
    setCourseEnd('');
    setPaymentType('');
    setBillingCycle('');
    setTotalFee('');
    setModeOfTraining('');
    setCourseStatus('active');
    setIsReviewStep(false);
  };

  // Calculate number of cycles based on date range and billing cycle
  const calculateCycles = (start: string, end: string, cycle: string) => {
    if (!start || !end) return 1;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (endDate.getMonth() - startDate.getMonth()) + 1;
    
    switch (cycle) {
      case 'monthly': return monthsDiff;
      case 'quarterly': return Math.ceil(monthsDiff / 3);
      case 'biannually': return Math.ceil(monthsDiff / 6);
      case 'yearly': return Math.ceil(monthsDiff / 12);
      default: return 1;
    }
  };

  // Get course duration in months
  const getCourseDurationMonths = () => {
    if (!courseStart || !courseEnd) return 0;
    const startDate = new Date(courseStart);
    const endDate = new Date(courseEnd);
    return (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
           (endDate.getMonth() - startDate.getMonth()) + 1;
  };

  // Check if no billing cycles are available (course within one month)
  const isNoBillingCycleAvailable = () => {
    const months = getCourseDurationMonths();
    return months > 0 && months <= 1;
  };

  // Check if billing cycle is valid for course duration
  const isBillingCycleValid = (cycle: string) => {
    const months = getCourseDurationMonths();
    if (months === 0) return true;
    switch (cycle) {
      case 'monthly': return months >= 1;
      case 'quarterly': return months >= 3;
      case 'biannually': return months >= 6;
      case 'yearly': return months >= 12;
      default: return true;
    }
  };

  // Calculate fee per cycle from total fee
  const calculateFeePerCycle = () => {
    if (!totalFee || !billingCycle) return '0.00';
    const cycles = calculateCycles(courseStart, courseEnd, billingCycle);
    return (parseFloat(totalFee) / cycles).toFixed(2);
  };

  // Validate form before proceeding to review
  const validateFormForReview = () => {
    if (!courseName.trim()) {
      toast.error('Please enter a course name');
      return false;
    }
    if (!provider) {
      toast.error('Please select a provider');
      return false;
    }
    if (!courseStart || !courseEnd) {
      toast.error('Please select course start and end dates');
      return false;
    }
    // Validate that course start is today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(courseStart);
    startDate.setHours(0, 0, 0, 0);
    if (startDate < today) {
      toast.error('Course start date must be today or a future date');
      return false;
    }
    // Validate that course end is not before course start
    if (new Date(courseEnd) < new Date(courseStart)) {
      toast.error('Course end date cannot be before course start date');
      return false;
    }
    // For courses within one month, paymentType is implicitly 'one_time'
    const effectivePaymentType = isNoBillingCycleAvailable() ? 'one_time' : paymentType;
    if (!effectivePaymentType) {
      toast.error('Please select a payment type');
      return false;
    }
    if (effectivePaymentType === 'recurring' && !billingCycle) {
      toast.error('Please select a billing cycle');
      return false;
    }
    if (!totalFee || parseFloat(totalFee) <= 0) {
      toast.error('Please enter a valid fee amount');
      return false;
    }
    return true;
  };

  const handleProceedToReview = () => {
    if (validateFormForReview()) {
      setIsReviewStep(true);
    }
  };

  const handleCreateCourse = async () => {
    // For courses within one month, paymentType is implicitly 'one_time'
    const effectivePaymentType = isNoBillingCycleAvailable() ? 'one_time' : paymentType;
    
    if (!courseName.trim() || !provider || !courseStart || !courseEnd || !effectivePaymentType || !totalFee) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate that course start is today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(courseStart);
    startDate.setHours(0, 0, 0, 0);
    if (startDate < today) {
      toast.error('Course start date must be today or a future date');
      return;
    }

    // Validate that course end is not before course start
    if (new Date(courseEnd) < new Date(courseStart)) {
      toast.error('Course end date cannot be before course start date');
      return;
    }

    if (effectivePaymentType === 'recurring' && !billingCycle) {
      toast.error('Please select a billing cycle for recurring payments');
      return;
    }

    try {
      // Calculate fee per cycle for database storage
      const feePerCycle = effectivePaymentType === 'one_time' 
        ? parseFloat(totalFee) 
        : parseFloat(calculateFeePerCycle());
      
      await createCourseMutation.mutateAsync({
        name: courseName.trim(),
        provider,
        course_run_start: courseStart,
        course_run_end: courseEnd,
        billing_cycle: (effectivePaymentType === 'one_time' ? 'one_time' : billingCycle) as any,
        fee: feePerCycle,
        mode_of_training: (modeOfTraining || null) as any,
        status: courseStatus as any,
        description: null,
        main_location: null,
        register_by: null,
        intake_size: null,
      });
      resetForm();
      setIsAddCourseOpen(false);
      toast.success('Course created successfully');
    } catch (error) {
      toast.error('Failed to create course');
    }
  };

  // Table columns for DataTable
  const courseColumns = [
    {
      key: 'id',
      header: 'Course ID',
      render: (course: typeof courses[0]) => (
        <span className="font-mono text-sm text-muted-foreground">
          {course.id.substring(0, 8)}
        </span>
      ),
    },
    {
      key: 'name',
      header: (
        <button 
          onClick={() => handleSort('name')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Course Name
          {renderSortIcon('name')}
        </button>
      ),
      render: (course: typeof courses[0]) => (
        <span className="font-medium text-foreground">{course.name}</span>
      ),
    },
    {
      key: 'provider',
      header: (
        <button 
          onClick={() => handleSort('provider')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Provider
          {renderSortIcon('provider')}
        </button>
      ),
      render: (course: typeof courses[0]) => (
        <span className="text-muted-foreground">{course.provider}</span>
      ),
    },
    {
      key: 'course_run_start',
      header: (
        <button 
          onClick={() => handleSort('course_run_start')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Start Date
          {renderSortIcon('course_run_start')}
        </button>
      ),
      render: (course: typeof courses[0]) => (
        <span className="text-muted-foreground">
          {course.course_run_start ? formatDate(course.course_run_start) : '-'}
        </span>
      ),
    },
    {
      key: 'course_run_end',
      header: (
        <button 
          onClick={() => handleSort('course_run_end')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          End Date
          {renderSortIcon('course_run_end')}
        </button>
      ),
      render: (course: typeof courses[0]) => (
        <span className="text-muted-foreground">
          {course.course_run_end ? formatDate(course.course_run_end) : '-'}
        </span>
      ),
    },
    {
      key: 'payment_type',
      header: 'Payment Type',
      render: (course: typeof courses[0]) => (
        <span className="text-foreground">
          {course.billing_cycle === 'one_time' ? 'One Time' : 'Recurring'}
        </span>
      ),
    },
    {
      key: 'fee',
      header: (
        <button 
          onClick={() => handleSort('fee')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Fee
          {renderSortIcon('fee')}
        </button>
      ),
      render: (course: typeof courses[0]) => (
        <span className="font-semibold text-foreground">
          ${formatCurrency(Number(course.fee))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (course: typeof courses[0]) => (
        <StatusBadge status={course.status} />
      ),
    },
    {
      key: 'enrolled',
      header: 'Enrolled',
      render: (course: typeof courses[0]) => (
        <span className="font-medium text-foreground">
          {getEnrolledStudentsCount(course.id)}
        </span>
      ),
    },
  ];

  if (loadingCourses) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Course Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all courses
          </p>
        </div>
        <Button variant="accent" onClick={() => setIsAddCourseOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      {/* Course Tracking Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Course Tracking</CardTitle>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={clearAllFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear All Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Controls */}
          <div className="space-y-3">
            {/* Top Row: Search + Key Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by course name, provider, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Provider Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[170px] justify-between">
                    <Building className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {providerFilter.length === 0 ? 'Provider' : `${providerFilter.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-3" align="start">
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {allProviders.map(p => (
                      <div key={p} className="flex items-center space-x-2">
                        <Checkbox
                          id={`provider-${p}`}
                          checked={providerFilter.includes(p)}
                          onCheckedChange={() => toggleProviderFilter(p)}
                        />
                        <label htmlFor={`provider-${p}`} className="text-sm cursor-pointer truncate">
                          {p}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[150px] justify-between">
                    <Activity className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {statusFilter.length === 0 ? 'Status' : `${statusFilter.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-3" align="start">
                  <div className="space-y-2">
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${value}`}
                          checked={statusFilter.includes(value)}
                          onCheckedChange={() => toggleStatusFilter(value)}
                        />
                        <label htmlFor={`status-${value}`} className="text-sm cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Payment Type Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[170px] justify-between">
                    <CreditCard className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {paymentTypeFilter.length === 0 ? 'Payment' : `${paymentTypeFilter.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-3" align="start">
                  <div className="space-y-2">
                    {Object.entries(paymentTypeLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`payment-${value}`}
                          checked={paymentTypeFilter.includes(value)}
                          onCheckedChange={() => togglePaymentTypeFilter(value)}
                        />
                        <label htmlFor={`payment-${value}`} className="text-sm cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Mode Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[150px] justify-between">
                    <Monitor className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {modeFilter.length === 0 ? 'Mode' : `${modeFilter.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-3" align="start">
                  <div className="space-y-2">
                    {Object.entries(modeLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mode-${value}`}
                          checked={modeFilter.includes(value)}
                          onCheckedChange={() => toggleModeFilter(value)}
                        />
                        <label htmlFor={`mode-${value}`} className="text-sm cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Second Row: Date Filters + Fee Range + Clear */}
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-1">Dates:</span>
              <DateInput
                value={courseStartDate}
                onChange={setCourseStartDate}
                className="w-[120px] h-8 text-xs"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <DateInput
                value={courseEndDate}
                onChange={setCourseEndDate}
                className="w-[120px] h-8 text-xs"
              />
              
              <DollarSign className="h-4 w-4 text-muted-foreground ml-4" />
              <span className="text-sm text-muted-foreground mr-1">Fee:</span>
              <Input
                type="number"
                placeholder="Min"
                value={feeMin}
                onChange={(e) => setFeeMin(e.target.value)}
                className="w-[80px] h-8 text-xs"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={feeMax}
                onChange={(e) => setFeeMax(e.target.value)}
                className="w-[80px] h-8 text-xs"
              />

              {/* Export Button */}
              <Button variant="outline" size="sm" className="h-8 text-xs ml-auto">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>

            {/* Results Count */}
            {hasActiveFilters && (
              <div className="text-sm text-muted-foreground">
                Showing {filteredAndSortedCourses.length} of {courses.length} courses
              </div>
            )}
          </div>

          {/* Data Table */}
          <DataTable 
            data={filteredAndSortedCourses} 
            columns={courseColumns}
            emptyMessage="No courses found matching your criteria"
            onRowClick={(course) => handleRowClick(course.id)}
          />
        </CardContent>
      </Card>

      {/* Add Course Dialog */}
      <Dialog open={isAddCourseOpen} onOpenChange={(open) => {
        setIsAddCourseOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {!isReviewStep ? (
            <>
              <DialogHeader>
                <DialogTitle>Add New Course</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new course
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="courseName">Course Name *</Label>
                  <Input 
                    id="courseName" 
                    placeholder="Enter course name" 
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="provider">Provider *</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProviders.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="courseStart">Course Start *</Label>
                    <DateInput 
                      id="courseStart" 
                      value={courseStart}
                      onChange={setCourseStart}
                      minDate={new Date()}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="courseEnd">Course End *</Label>
                    <DateInput 
                      id="courseEnd" 
                      value={courseEnd}
                      onChange={setCourseEnd}
                      minDate={courseStart ? new Date(courseStart) : new Date()}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="modeOfTraining">Mode of Training</Label>
                  <Select value={modeOfTraining} onValueChange={setModeOfTraining}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="in-person">In-Person</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="courseStatus">Status</Label>
                  <Select value={courseStatus} onValueChange={setCourseStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="paymentType">Payment Type *</Label>
                  <Select 
                    value={isNoBillingCycleAvailable() ? 'one_time' : paymentType} 
                    onValueChange={(val) => {
                      setPaymentType(val);
                      if (val === 'one_time') {
                        setBillingCycle('');
                      }
                    }}
                    disabled={!courseStart || !courseEnd}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One Time</SelectItem>
                      <SelectItem 
                        value="recurring" 
                        disabled={isNoBillingCycleAvailable()}
                      >
                        Recurring {isNoBillingCycleAvailable() && '(Course duration too short)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {isNoBillingCycleAvailable() && (
                    <p className="text-xs text-muted-foreground">
                      Course occurs within one month. Only one-time payment available.
                    </p>
                  )}
                </div>

                {paymentType === 'recurring' && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="billingCycle">Billing Cycle *</Label>
                      <Select value={billingCycle} onValueChange={setBillingCycle} disabled={!courseStart || !courseEnd}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select billing cycle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly" disabled={!isBillingCycleValid('monthly')}>
                            Monthly {!isBillingCycleValid('monthly') && '(Min 1 month required)'}
                          </SelectItem>
                          <SelectItem value="quarterly" disabled={!isBillingCycleValid('quarterly')}>
                            Quarterly {!isBillingCycleValid('quarterly') && '(Min 3 months required)'}
                          </SelectItem>
                          <SelectItem value="biannually" disabled={!isBillingCycleValid('biannually')}>
                            Bi-annually {!isBillingCycleValid('biannually') && '(Min 6 months required)'}
                          </SelectItem>
                          <SelectItem value="yearly" disabled={!isBillingCycleValid('yearly')}>
                            Annually {!isBillingCycleValid('yearly') && '(Min 12 months required)'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {billingCycle && (
                      <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                        <div className="space-y-2">
                          <Label htmlFor="totalFee" className="text-sm font-medium">Total Course Fee ($) *</Label>
                          <Input 
                            id="totalFee" 
                            type="number"
                            step="0.01"
                            placeholder="0.00" 
                            value={totalFee}
                            onChange={(e) => setTotalFee(e.target.value)}
                            className="text-lg font-semibold"
                            disabled={!courseStart || !courseEnd}
                          />
                          {totalFee && courseStart && courseEnd && billingCycle && parseFloat(totalFee) > 0 && (
                            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md border border-primary/10">
                              <CheckCircle className="h-4 w-4 text-primary" />
                              <p className="text-sm text-foreground">
                                <span className="font-medium">Fee per Cycle:</span> ${calculateFeePerCycle()} 
                                <span className="text-muted-foreground ml-1">({calculateCycles(courseStart, courseEnd, billingCycle)} cycles)</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {paymentType === 'one_time' && (
                  <div className="space-y-2">
                    <Label htmlFor="totalFee" className="text-sm font-medium">Total Course Fee ($) *</Label>
                    <Input 
                      id="totalFee" 
                      type="number"
                      step="0.01"
                      placeholder="0.00" 
                      value={totalFee}
                      onChange={(e) => setTotalFee(e.target.value)}
                      className="text-lg font-semibold"
                      disabled={!courseStart || !courseEnd}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { resetForm(); setIsAddCourseOpen(false); }}>
                  Cancel
                </Button>
                <Button variant="accent" onClick={handleProceedToReview}>
                  Preview & Create
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Review Course Details</DialogTitle>
                <DialogDescription>
                  Please review all the information before creating the course.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-3 p-4 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Course Information
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Course Name:</span>
                      <span className="font-medium text-right">{courseName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider:</span>
                      <span className="font-medium text-right">{provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode of Training:</span>
                      <span className="font-medium text-right">{modeOfTraining ? modeLabels[modeOfTraining] : 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium text-right">
                        <StatusBadge status={courseStatus as 'active' | 'inactive'} />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 p-4 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Course Schedule
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span className="font-medium">{formatDate(courseStart)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date:</span>
                      <span className="font-medium">{formatDate(courseEnd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{getCourseDurationMonths()} month{getCourseDurationMonths() !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fee Information
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Type:</span>
                      <span className="font-medium">{(isNoBillingCycleAvailable() ? 'one_time' : paymentType) === 'one_time' ? 'One Time' : 'Recurring'}</span>
                    </div>
                    {(isNoBillingCycleAvailable() ? 'one_time' : paymentType) === 'recurring' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Billing Cycle:</span>
                          <span className="font-medium">{billingCycleLabels[billingCycle]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Number of Cycles:</span>
                          <span className="font-medium">{calculateCycles(courseStart, courseEnd, billingCycle)}</span>
                        </div>
                      </>
                    )}
                    {(isNoBillingCycleAvailable() ? 'one_time' : paymentType) === 'recurring' && (
                      <>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-muted-foreground">Total Course Fee:</span>
                          <span className="text-lg font-bold text-primary">
                            ${parseFloat(totalFee).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Fee per Cycle:</span>
                          <span className="text-lg font-bold text-primary">
                            ${calculateFeePerCycle()}
                          </span>
                        </div>
                      </>
                    )}
                    {(isNoBillingCycleAvailable() ? 'one_time' : paymentType) === 'one_time' && (
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-muted-foreground">Total Course Fee:</span>
                        <span className="text-lg font-bold text-primary">
                          ${parseFloat(totalFee).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={() => setIsReviewStep(false)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Edit
                </Button>
                <Button 
                  variant="accent" 
                  onClick={handleCreateCourse}
                  disabled={createCourseMutation.isPending}
                >
                  {createCourseMutation.isPending ? 'Creating...' : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm & Create
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
