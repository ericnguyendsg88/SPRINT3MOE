import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Download, ArrowUpDown, ArrowUp, ArrowDown, X, Building, Monitor, CreditCard, RefreshCw, CheckCircle, Calendar, CalendarDays, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DateInput } from '@/components/ui/date-input';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { usePageBuilder, LayoutItem } from '@/components/editor/PageBuilder';
import { EditModeToggle } from '@/components/editor/EditModeToggle';
import { SortableContainer } from '@/components/editor/SortableContainer';
import { ResizableSection } from '@/components/editor/ResizableSection';
import { SectionAdder } from '@/components/editor/SectionAdder';
import { CustomSectionRenderer } from '@/components/editor/CustomSectionRenderer';
import { useProviders } from '@/contexts/ProvidersContext';

const SECTION_IDS = ['header', 'filters', 'courses-table'];

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

  // Form state for adding course
  const [courseName, setCourseName] = useState('');
  const [provider, setProvider] = useState('');
  const [courseStart, setCourseStart] = useState('');
  const [courseEnd, setCourseEnd] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [billingCycle, setBillingCycle] = useState('');
  const [feePerCycle, setFeePerCycle] = useState('');
  const [modeOfTraining, setModeOfTraining] = useState('');
  const [courseStatus, setCourseStatus] = useState('active');

  // Page layout for drag-and-drop
  const {
    isEditMode,
    toggleEditMode,
    layout,
    updateLayout,
    updateSectionSize,
    addSection,
    removeSection,
    updateCustomSection,
    resetLayout,
    getOrderedItems,
    getSectionSize,
    isSaving,
    handleAddSection,
  } = usePageBuilder('course-management', SECTION_IDS);

  // Fetch data
  const { data: courses = [], isLoading: loadingCourses } = useCourses();
  const { data: enrollments = [] } = useEnrollments();
  const createCourseMutation = useCreateCourse();
  const { activeProviders, providers } = useProviders();

  // Get all providers (active and inactive) for filter
  const allProviders = useMemo(() => {
    return providers.map(p => p.name).sort();
  }, [providers]);

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
      const courseStart = course.course_run_start ? new Date(course.course_run_start).toDateString() : null;
      const matchesCourseStart = !courseStartDate || !courseStart || courseStart === new Date(courseStartDate).toDateString();
      
      // Course end date filter
      const courseEnd = course.course_run_end ? new Date(course.course_run_end).toDateString() : null;
      const matchesCourseEnd = !courseEndDate || !courseEnd || courseEnd === new Date(courseEndDate).toDateString();
      
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
    setFeePerCycle('');
    setModeOfTraining('');
    setCourseStatus('active');
  };

  const handleCreateCourse = async () => {
    if (!courseName.trim() || !provider || !courseStart || !courseEnd || !paymentType || !feePerCycle) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (paymentType === 'recurring' && !billingCycle) {
      toast.error('Please select a billing cycle for recurring payments');
      return;
    }

    try {
      await createCourseMutation.mutateAsync({
        name: courseName.trim(),
        provider,
        course_run_start: courseStart,
        course_run_end: courseEnd,
        billing_cycle: (paymentType === 'one_time' ? 'one_time' : billingCycle) as any,
        fee: parseFloat(feePerCycle),
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Course Management</h1>
                <p className="text-muted-foreground mt-1">
                  Manage all courses
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
                  <DialogTrigger asChild>
                    <Button variant="accent">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                      <DialogTitle>Add New Course</DialogTitle>
                      <DialogDescription>
                        Enter course details to create a new course.
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
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="courseEnd">Course End *</Label>
                          <DateInput 
                            id="courseEnd" 
                            value={courseEnd}
                            onChange={setCourseEnd}
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="paymentType">Payment Type *</Label>
                        <Select value={paymentType} onValueChange={setPaymentType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one_time">One Time</SelectItem>
                            <SelectItem value="recurring">Recurring</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {paymentType === 'recurring' && (
                        <div className="grid gap-2">
                          <Label htmlFor="billingCycle">Billing Cycle *</Label>
                          <Select value={billingCycle} onValueChange={setBillingCycle}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select billing cycle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="biannually">Bi-annually</SelectItem>
                              <SelectItem value="yearly">Annually</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label htmlFor="feePerCycle">Fee per Cycle ($) *</Label>
                        <Input 
                          id="feePerCycle" 
                          type="number"
                          step="0.01"
                          placeholder="0.00" 
                          value={feePerCycle}
                          onChange={(e) => setFeePerCycle(e.target.value)}
                        />
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
                        <Label htmlFor="status">Status *</Label>
                        <Select value={courseStatus} onValueChange={setCourseStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => { resetForm(); setIsAddCourseOpen(false); }}>
                        Cancel
                      </Button>
                      <Button 
                        variant="accent" 
                        onClick={handleCreateCourse}
                        disabled={createCourseMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {createCourseMutation.isPending ? 'Creating...' : 'Create Course'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </ResizableSection>
        );

      case 'filters':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <Card>
              <CardContent className="pt-4 space-y-4">
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by course name, provider, or Course ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* All filters row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Building className="h-4 w-4" />
                      Provider
                    </Label>
                    <Select 
                      value={providerFilter.length === 0 ? 'all' : 'custom'}
                      onValueChange={(value) => {
                        if (value === 'all') setProviderFilter([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {providerFilter.length === 0 
                            ? 'All Providers' 
                            : providerFilter.length === 1
                              ? providerFilter[0]
                              : `${providerFilter.length} selected`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <div 
                          className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setProviderFilter([])}
                        >
                          <Checkbox 
                            checked={providerFilter.length === 0}
                            className="pointer-events-none"
                          />
                          All Providers
                        </div>
                        {allProviders.map((p) => (
                          <div
                            key={p}
                            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleProviderFilter(p); }}
                          >
                            <Checkbox 
                              checked={providerFilter.includes(p)}
                              className="pointer-events-none"
                            />
                            {p}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Monitor className="h-4 w-4" />
                      Mode of Training
                    </Label>
                    <Select 
                      value={modeFilter.length === 0 ? 'all' : 'custom'}
                      onValueChange={(value) => {
                        if (value === 'all') setModeFilter([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {modeFilter.length === 0 
                            ? 'All Modes' 
                            : modeFilter.length === 1
                              ? modeLabels[modeFilter[0]]
                              : `${modeFilter.length} selected`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <div 
                          className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setModeFilter([])}
                        >
                          <Checkbox 
                            checked={modeFilter.length === 0}
                            className="pointer-events-none"
                          />
                          All Modes
                        </div>
                        {Object.entries(modeLabels).map(([value, label]) => (
                          <div
                            key={value}
                            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleModeFilter(value); }}
                          >
                            <Checkbox 
                              checked={modeFilter.includes(value)}
                              className="pointer-events-none"
                            />
                            {label}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4" />
                      Payment Type
                    </Label>
                    <Select 
                      value={paymentTypeFilter.length === 0 ? 'all' : 'custom'}
                      onValueChange={(value) => {
                        if (value === 'all') setPaymentTypeFilter([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {paymentTypeFilter.length === 0 
                            ? 'All Types' 
                            : paymentTypeFilter.length === 1
                              ? paymentTypeLabels[paymentTypeFilter[0]]
                              : `${paymentTypeFilter.length} selected`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <div 
                          className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setPaymentTypeFilter([])}
                        >
                          <Checkbox 
                            checked={paymentTypeFilter.length === 0}
                            className="pointer-events-none"
                          />
                          All Types
                        </div>
                        {Object.entries(paymentTypeLabels).map(([value, label]) => (
                          <div
                            key={value}
                            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePaymentTypeFilter(value); }}
                          >
                            <Checkbox 
                              checked={paymentTypeFilter.includes(value)}
                              className="pointer-events-none"
                            />
                            {label}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <RefreshCw className="h-4 w-4" />
                      Billing Cycle
                    </Label>
                    <Select 
                      value={billingCycleFilter.length === 0 ? 'all' : 'custom'}
                      onValueChange={(value) => {
                        if (value === 'all') setBillingCycleFilter([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {billingCycleFilter.length === 0 
                            ? 'All Cycles' 
                            : billingCycleFilter.length === 1
                              ? billingCycleLabels[billingCycleFilter[0]]
                              : `${billingCycleFilter.length} selected`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <div 
                          className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setBillingCycleFilter([])}
                        >
                          <Checkbox 
                            checked={billingCycleFilter.length === 0}
                            className="pointer-events-none"
                          />
                          All Cycles
                        </div>
                        {Object.entries(billingCycleLabels).map(([value, label]) => (
                          <div
                            key={value}
                            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBillingCycleFilter(value); }}
                          >
                            <Checkbox 
                              checked={billingCycleFilter.includes(value)}
                              className="pointer-events-none"
                            />
                            {label}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Second row of filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      Status
                    </Label>
                    <Select 
                      value={statusFilter.length === 0 ? 'all' : 'custom'}
                      onValueChange={(value) => {
                        if (value === 'all') setStatusFilter([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {statusFilter.length === 0 
                            ? 'All Statuses' 
                            : statusFilter.length === 1
                              ? statusLabels[statusFilter[0]]
                              : `${statusFilter.length} selected`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <div 
                          className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setStatusFilter([])}
                        >
                          <Checkbox 
                            checked={statusFilter.length === 0}
                            className="pointer-events-none"
                          />
                          All Statuses
                        </div>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <div
                            key={value}
                            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleStatusFilter(value); }}
                          >
                            <Checkbox 
                              checked={statusFilter.includes(value)}
                              className="pointer-events-none"
                            />
                            {label}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Course Start Date
                    </Label>
                    <DateInput
                      placeholder="Select date"
                      value={courseStartDate}
                      onChange={setCourseStartDate}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      Course End Date
                    </Label>
                    <DateInput
                      placeholder="Select date"
                      value={courseEndDate}
                      onChange={setCourseEndDate}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      Fee Range ($)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={feeMin}
                        onChange={(e) => setFeeMin(e.target.value)}
                        className="w-full"
                      />
                      <span className="flex items-center text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={feeMax}
                        onChange={(e) => setFeeMax(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Active filters and actions row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {hasActiveFilters && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          Showing {filteredAndSortedCourses.length} of {courses.length} courses
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearAllFilters}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear Filters
                        </Button>
                      </>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          </ResizableSection>
        );

      case 'courses-table':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course ID</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Course Name
                        {renderSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('provider')}
                    >
                      <div className="flex items-center">
                        Provider
                        {renderSortIcon('provider')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('course_run_start')}
                    >
                      <div className="flex items-center">
                        Start Date
                        {renderSortIcon('course_run_start')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('course_run_end')}
                    >
                      <div className="flex items-center">
                        End Date
                        {renderSortIcon('course_run_end')}
                      </div>
                    </TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('fee')}
                    >
                      <div className="flex items-center">
                        Fee
                        {renderSortIcon('fee')}
                      </div>
                    </TableHead>
                    <TableHead>Mode of Training</TableHead>
                    <TableHead>Enrolled Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No courses found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedCourses.map((course) => {
                      const paymentType = course.billing_cycle === 'one_time' ? 'One Time' : 'Recurring';
                      const billingCycleDisplay = course.billing_cycle === 'one_time' ? '—' : billingCycleLabels[course.billing_cycle] || course.billing_cycle;

                      return (
                        <TableRow 
                          key={course.id} 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleRowClick(course.id)}
                        >
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {course.id.substring(0, 8)}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-foreground">{course.name}</p>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{course.provider}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {course.course_run_start ? formatDate(course.course_run_start) : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {course.course_run_end ? formatDate(course.course_run_end) : '-'}
                          </TableCell>
                          <TableCell className="text-foreground">{paymentType}</TableCell>
                          <TableCell className="text-muted-foreground">{billingCycleDisplay}</TableCell>
                          <TableCell className="font-semibold text-foreground">
                            ${Number(course.fee).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {course.mode_of_training ? modeLabels[course.mode_of_training] || course.mode_of_training : '—'}
                          </TableCell>
                          <TableCell className="text-center font-medium text-foreground">
                            {getEnrolledStudentsCount(course.id)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </ResizableSection>
        );

      default:
        return null;
    }
  };

  if (loadingCourses) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading courses...</div>
      </div>
    );
  }

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
        <div className="space-y-6">
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
