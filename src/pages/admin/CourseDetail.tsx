import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Users, Calendar, DollarSign, MapPin, GraduationCap, Save, X, UserPlus, Trash2, Search, UserMinus, Lock, Building, CreditCard, RefreshCw, CheckCircle, Ban, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useCourse, useUpdateCourse, useDeleteCourse } from '@/hooks/useCourses';
import { useEnrollments, useCreateEnrollment, useDeleteEnrollment } from '@/hooks/useEnrollments';
import { useAccountHolders } from '@/hooks/useAccountHolders';
import { useCourseCharges, useCreateCourseCharge } from '@/hooks/useCourseCharges';
//import { formatCurrency } from '@/lib/utils';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePageBuilder, LayoutItem, FieldConfig } from '@/components/editor/PageBuilder';
import { EditModeToggle } from '@/components/editor/EditModeToggle';
import { SortableContainer } from '@/components/editor/SortableContainer';
import { ResizableSection } from '@/components/editor/ResizableSection';
import { SectionAdder } from '@/components/editor/SectionAdder';
import { CustomSectionRenderer } from '@/components/editor/CustomSectionRenderer';
import { FieldEditor, FieldDefinition } from '@/components/editor/FieldEditor';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
type BillingCycle = 'monthly' | 'quarterly' | 'biannually' | 'yearly';

const billingCycleLabels: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannually: 'Biannually',
  yearly: 'Annually',
};

const SCHOOL_PROVIDERS = [
  'National University of Singapore',
  'Nanyang Technological University',
  'Singapore Management University',
  'Singapore Polytechnic',
  'Temasek Polytechnic',
] as const;

const SECTION_IDS = ['header', 'stats', 'course-details', 'enrolled-students'];

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isConfirmingAdd, setIsConfirmingAdd] = useState(false);
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [enrolledSearchQuery, setEnrolledSearchQuery] = useState('');
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; name: string; accountId?: string } | null>(null);
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<string[]>([]);

  const { data: course, isLoading } = useCourse(courseId || '');
  const { data: enrollments = [] } = useEnrollments();
  const { data: accountHolders = [] } = useAccountHolders();
  const { data: courseCharges = [] } = useCourseCharges();
  const updateCourseMutation = useUpdateCourse();
  const deleteCourseMutation = useDeleteCourse();
  const createEnrollmentMutation = useCreateEnrollment();
  const deleteEnrollmentMutation = useDeleteEnrollment();
  const createCourseChargeMutation = useCreateCourseCharge();

  // Helper to calculate due date based on billing cycle
  const calculateDueDate = () => {
    const today = new Date();
    const dueDate = new Date(today.getFullYear(), today.getMonth(), 5);
    if (today.getDate() > 5) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    return dueDate.toISOString().split('T')[0];
  };

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
    getFieldConfig,
    updateFieldConfig,
  } = usePageBuilder(`course-detail-${courseId}`, SECTION_IDS);

  // Helper to determine payment type
  const getPaymentType = () => {
    if (!course) return 'One Time';
    if (!course.course_run_start || !course.course_run_end) {
      return 'One Time';
    }
    
    const startDate = new Date(course.course_run_start);
    const endDate = new Date(course.course_run_end);
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;
    
    let cycles = 1;
    switch (course.billing_cycle) {
      case 'monthly':
        cycles = monthsDiff;
        break;
      case 'quarterly':
        cycles = Math.ceil(monthsDiff / 3);
        break;
      case 'biannually':
        cycles = Math.ceil(monthsDiff / 6);
        break;
      case 'yearly':
        cycles = Math.ceil(monthsDiff / 12);
        break;
    }
    
    return cycles > 1 ? 'Recurring' : 'One Time';
  };

  // Default course details fields configuration
  const defaultCourseFields: FieldDefinition[] = [
    { key: 'name', label: 'Course Name', visible: true, order: 0 },
    { key: 'provider', label: 'Provider', visible: true, order: 1 },
    { key: 'education_level', label: 'Education Level', visible: true, order: 2 },
    { key: 'course_start', label: 'Course Start', visible: true, order: 3 },
    { key: 'course_end', label: 'Course End', visible: true, order: 4 },
    { key: 'payment_type', label: 'Payment Type', visible: true, order: 5 },
    { key: 'billing_cycle', label: 'Billing Cycle', visible: true, order: 6 },
    { key: 'status', label: 'Status', visible: true, order: 7 },
    { key: 'fee', label: 'Fee per Cycle', visible: true, order: 8 },
    { key: 'mode_of_training', label: 'Mode of Training', visible: false, order: 9 },
  ];

  // Education level labels
  const educationLevelLabels: Record<string, string> = {
    primary: 'Primary',
    secondary: 'Secondary',
    post_secondary: 'Post-Secondary',
    tertiary: 'Tertiary',
    postgraduate: 'Postgraduate',
  };

  // Helper to calculate total fee based on course duration and billing cycle
  const calculateCourseTotalFee = () => {
    if (!course) return 0;
    if (!course.course_run_start || !course.course_run_end) {
      return Number(course.fee);
    }
    
    const startDate = new Date(course.course_run_start);
    const endDate = new Date(course.course_run_end);
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;
    
    let cycles = 1;
    switch (course.billing_cycle) {
      case 'monthly':
        cycles = monthsDiff;
        break;
      case 'quarterly':
        cycles = Math.ceil(monthsDiff / 3);
        break;
      case 'biannually':
        cycles = Math.ceil(monthsDiff / 6);
        break;
      case 'yearly':
        cycles = Math.ceil(monthsDiff / 12);
        break;
    }
    
    return Number(course.fee) * cycles;
  };

  const courseFieldsConfig = getFieldConfig('course-details', defaultCourseFields) as FieldDefinition[];

  const handleToggleCourseStatus = async () => {
    if (!course) return;
    const newStatus = course.status === 'active' ? 'inactive' : 'active';
    await updateCourseMutation.mutateAsync({
      id: course.id,
      status: newStatus,
    });
  };

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editModeOfTraining, setEditModeOfTraining] = useState('');
  const [editCourseRunStart, setEditCourseRunStart] = useState('');
  const [editCourseRunEnd, setEditCourseRunEnd] = useState('');
  const [editBillingCycle, setEditBillingCycle] = useState<BillingCycle>('monthly');
  const [editFee, setEditFee] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  const startEditing = () => {
    if (!course) return;
    setEditName(course.name);
    setEditProvider(course.provider);
    setEditModeOfTraining(course.mode_of_training || 'online');
    setEditCourseRunStart(course.course_run_start || '');
    setEditCourseRunEnd(course.course_run_end || '');
    setEditBillingCycle(course.billing_cycle as BillingCycle);
    setEditFee(String(course.fee));
    setEditStatus(course.status);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!course) return;
    
    // Validate course end date is not before course start
    if (editCourseRunStart && editCourseRunEnd) {
      if (new Date(editCourseRunEnd) < new Date(editCourseRunStart)) {
        toast.error('Course end date cannot be before course start date');
        return;
      }
    }

    // Validate that course start is today or in the future (only if course hasn't started yet)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const originalStartDate = course.course_run_start ? new Date(course.course_run_start) : null;
    const isCourseStarted = originalStartDate && originalStartDate <= today;
    
    if (!isCourseStarted && editCourseRunStart) {
      const newStartDate = new Date(editCourseRunStart);
      newStartDate.setHours(0, 0, 0, 0);
      if (newStartDate < today) {
        toast.error('Course start date must be today or a future date');
        return;
      }
    }
    
    await updateCourseMutation.mutateAsync({
      id: course.id,
      name: editName,
      provider: editProvider,
      mode_of_training: editModeOfTraining,
      course_run_start: editCourseRunStart || null,
      course_run_end: editCourseRunEnd || null,
      billing_cycle: editBillingCycle,
      fee: parseFloat(editFee) || 0,
      status: editStatus,
    });
    setIsEditing(false);
  };

  // Get enrolled students for this course
  const courseEnrollments = enrollments.filter(e => e.course_id === courseId);
  const enrolledAccountIds = new Set(courseEnrollments.map(e => e.account_id));

  // Filter available students (not already enrolled) based on search query
  const availableStudents = useMemo(() => {
    const query = studentSearchQuery.toLowerCase().trim();
    return accountHolders.filter(student => {
      if (enrolledAccountIds.has(student.id)) return false;
      if (!query) return true;
      return (
        student.name.toLowerCase().includes(query) ||
        student.nric.toLowerCase().includes(query)
      );
    });
  }, [accountHolders, enrolledAccountIds, studentSearchQuery]);

  // Toggle student selection for multi-select
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Get selected students details for preview
  const selectedStudentsDetails = useMemo(() => {
    return accountHolders.filter(student => selectedStudentIds.includes(student.id));
  }, [accountHolders, selectedStudentIds]);

  const handleAddStudents = async () => {
    if (selectedStudentIds.length === 0 || !courseId || !course) return;
    
    // Add all selected students
    for (const studentId of selectedStudentIds) {
      await createEnrollmentMutation.mutateAsync({
        account_id: studentId,
        course_id: courseId,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active',
      });

      // Auto-create course charge for each enrolled student
      await createCourseChargeMutation.mutateAsync({
        account_id: studentId,
        course_id: courseId,
        course_name: course.name,
        amount: course.fee,
        amount_paid: 0,
        due_date: calculateDueDate(),
        status: 'outstanding',
        paid_date: null,
        payment_method: null,
      });
    }
    
    setIsAddStudentOpen(false);
    setStudentSearchQuery('');
    setSelectedStudentIds([]);
    setIsConfirmingAdd(false);
  };

  const enrolledStudents = courseEnrollments.map(enrollment => {
    const student = accountHolders.find(a => a.id === enrollment.account_id);
    const studentCharges = courseCharges.filter(
      c => c.account_id === enrollment.account_id && c.course_id === courseId
    );
    const totalPaid = studentCharges.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
    const totalDue = studentCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    
    // Determine payment status using new billing logic
    const isCoursePaid = totalPaid >= totalDue && totalDue > 0;
    
    let paymentStatus: 'outstanding' | 'fully_paid' | 'scheduled' = 'scheduled';
    
    if (isCoursePaid) {
      paymentStatus = 'fully_paid';
    } else {
      // Check for outstanding
      const hasOutstanding = studentCharges.some(c => 
        c.status === 'outstanding' || c.status === 'partially_paid'
      );
      
      // Check if all current charges are clear (scheduled for next billing)
      const allClear = studentCharges.length > 0 && studentCharges.every(c => c.status === 'clear');
      
      if (hasOutstanding) paymentStatus = 'outstanding';
      else if (allClear) paymentStatus = 'scheduled';
    }

    return {
      id: enrollment.id,
      accountId: enrollment.account_id,
      name: student?.name || 'Unknown',
      nric: student?.nric || '-',
      enrollmentDate: enrollment.enrollment_date,
      enrollmentStatus: enrollment.status,
      totalPaid,
      totalDue,
      paymentStatus,
    };
  });

  // Filter enrolled students by search query
  const filteredEnrolledStudents = enrolledStudents.filter(student => {
    if (!enrolledSearchQuery.trim()) return true;
    const query = enrolledSearchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.nric.toLowerCase().includes(query)
    );
  });

  const handleRemoveStudent = async (enrollmentId: string, accountId: string) => {
    await deleteEnrollmentMutation.mutateAsync({ id: enrollmentId, accountId });
    setStudentToRemove(null);
  };

  const handleBulkRemoveStudents = async () => {
    for (const enrollmentId of selectedEnrollmentIds) {
      // Find the accountId for this enrollment
      const enrolledStudent = enrolledStudents.find(s => s.id === enrollmentId);
      if (enrolledStudent) {
        await deleteEnrollmentMutation.mutateAsync({ id: enrollmentId, accountId: enrolledStudent.accountId });
      }
    }
    setSelectedEnrollmentIds([]);
    setStudentToRemove(null);
  };

  const toggleEnrollmentSelection = (enrollmentId: string) => {
    setSelectedEnrollmentIds(prev => 
      prev.includes(enrollmentId) 
        ? prev.filter(id => id !== enrollmentId)
        : [...prev, enrollmentId]
    );
  };

  const toggleSelectAllEnrollments = () => {
    if (selectedEnrollmentIds.length === filteredEnrolledStudents.length) {
      setSelectedEnrollmentIds([]);
    } else {
      setSelectedEnrollmentIds(filteredEnrolledStudents.map(s => s.id));
    }
  };

  const studentColumns = [
    ...(isRemoveMode ? [{
      key: 'select',
      header: (
        <Checkbox
          checked={selectedEnrollmentIds.length === filteredEnrolledStudents.length && filteredEnrolledStudents.length > 0}
          onCheckedChange={toggleSelectAllEnrollments}
          aria-label="Select all"
        />
      ),
      render: (item: typeof enrolledStudents[0]) => (
        <Checkbox
          checked={selectedEnrollmentIds.includes(item.id)}
          onCheckedChange={() => toggleEnrollmentSelection(item.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${item.name}`}
        />
      )
    }] : []),
    {
      key: 'name',
      header: 'Student Name',
      render: (item: typeof enrolledStudents[0]) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.nric}</p>
        </div>
      )
    },
    {
      key: 'enrollmentDate',
      header: 'Enrolled Date',
      render: (item: typeof enrolledStudents[0]) => (
        <span className="text-muted-foreground">
          {new Date(item.enrollmentDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })}
        </span>
      )
    },
  ];

  const handleStudentClick = (student: typeof enrolledStudents[0]) => {
    if (!isRemoveMode) {
      navigate(`/admin/accounts/${student.accountId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Course not found</div>
      </div>
    );
  }

  const activeEnrollments = courseEnrollments.filter(e => e.status === 'active').length;
  const totalCollected = courseCharges
    .filter(c => c.course_id === courseId)
    .reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
  const totalOutstanding = courseCharges
    .filter(c => c.course_id === courseId && (c.status === 'outstanding' || c.status === 'overdue' || c.status === 'partially_paid'))
    .reduce((sum, c) => sum + (Number(c.amount) - Number(c.amount_paid || 0)), 0);

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
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin/courses')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{course.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground">{course.provider}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant={course.status === 'active' ? 'outline' : 'default'}
                      size="sm"
                      className={course.status === 'active' ? 'text-warning border-warning/30 hover:bg-warning/10' : 'bg-green-600 hover:bg-green-700 text-white'}
                    >
                      {course.status === 'active' ? (
                        <>
                          <Ban className="h-4 w-4 mr-2" />
                          Set as Inactive
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Set as Active
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {course.status === 'active' ? 'Set Course as Inactive' : 'Set Course as Active'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {course.status === 'active' ? (
                          <>
                            Are you sure you want to set "{course.name}" as inactive?
                            This will prevent new student enrollments, but existing enrollments will remain active.
                          </>
                        ) : (
                          <>
                            Are you sure you want to set "{course.name}" as active?
                            This will allow new student enrollments again.
                          </>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleToggleCourseStatus}
                        className={course.status === 'active' ? 'bg-warning text-white hover:bg-warning/90' : 'bg-green-600 text-white hover:bg-green-700'}
                      >
                        {updateCourseMutation.isPending ? 'Updating...' : (course.status === 'active' ? 'Set as Inactive' : 'Set as Active')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={cancelEditing}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      variant="accent" 
                      onClick={handleSave}
                      disabled={updateCourseMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateCourseMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={startEditing}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Course
                  </Button>
                )}
              </div>
            </div>
          </ResizableSection>
        );

      case 'stats':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Enrolled Students</p>
                      <p className="text-2xl font-bold">{activeEnrollments}</p>
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
                      <p className="text-2xl font-bold">${calculateCourseTotalFee().toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ResizableSection>
        );

      case 'course-details': {
        // Get visible fields sorted by order
        const visibleFields = [...courseFieldsConfig]
          .filter(f => f.visible)
          // Hide 'fee' (Fee per Cycle) for one-time payment courses
          .filter(f => !(f.key === 'fee' && getPaymentType() === 'One Time'))
          .sort((a, b) => a.order - b.order);

        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Course Details</CardTitle>
                  <FieldEditor
                    fields={courseFieldsConfig}
                    onFieldsChange={(fields) => updateFieldConfig('course-details', fields)}
                    isEditMode={isEditMode}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (() => {
                  // Check if course start date has already been reached
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const courseStartDate = course.course_run_start ? new Date(course.course_run_start) : null;
                  const isCourseStarted = courseStartDate && courseStartDate <= today;

                  return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label>Course Name</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                          Provider
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </Label>
                        <Input
                          value={editProvider}
                          disabled
                          className="bg-muted cursor-not-allowed"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Mode of Training</Label>
                        <Select value={editModeOfTraining} onValueChange={setEditModeOfTraining}>
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
                        <Label>Status</Label>
                        <Select value={editStatus} onValueChange={(v: 'active' | 'inactive') => setEditStatus(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="flex items-center gap-2">
                            Course Start
                            {isCourseStarted && <Lock className="h-3 w-3 text-muted-foreground" />}
                          </Label>
                          {isCourseStarted ? (
                            <Input
                              value={editCourseRunStart ? new Date(editCourseRunStart).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                              disabled
                              className="bg-muted cursor-not-allowed"
                            />
                          ) : (
                            <DateInput
                              value={editCourseRunStart}
                              onChange={setEditCourseRunStart}
                              minDate={new Date()}
                            />
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label>Course End</Label>
                          <DateInput
                            value={editCourseRunEnd}
                            onChange={setEditCourseRunEnd}
                            minDate={editCourseRunStart ? new Date(editCourseRunStart) : new Date()}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                          Billing Cycle
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </Label>
                        <Input
                          value={billingCycleLabels[editBillingCycle]}
                          disabled
                          className="bg-muted cursor-not-allowed"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                          Fee ({billingCycleLabels[editBillingCycle]})
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </Label>
                        <Input
                          type="number"
                          value={editFee}
                          disabled
                          className="bg-muted cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                  );
                })() : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {visibleFields.map((field) => {
                      const fieldConfig: Record<string, { icon: React.ReactNode; value: React.ReactNode }> = {
                        name: {
                          icon: <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />,
                          value: course.name,
                        },
                        provider: {
                          icon: <Building className="h-5 w-5 text-muted-foreground mt-0.5" />,
                          value: course.provider,
                        },
                        education_level: {
                          icon: <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />,
                          value: 'Not Set',
                        },
                        mode_of_training: {
                          icon: <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />,
                          value: <span className="capitalize">{course.mode_of_training || 'Online'}</span>,
                        },
                        course_start: {
                          icon: <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />,
                          value: course.course_run_start 
                            ? new Date(course.course_run_start).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : 'Not set',
                        },
                        course_end: {
                          icon: <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />,
                          value: course.course_run_end 
                            ? new Date(course.course_run_end).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : 'Ongoing',
                        },
                        payment_type: {
                          icon: <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />,
                          value: getPaymentType() === 'One Time' ? 'One Time' : 'Recurring',
                        },
                        billing_cycle: {
                          icon: <RefreshCw className="h-5 w-5 text-muted-foreground mt-0.5" />,
                          value: getPaymentType() === 'One Time' ? '—' : billingCycleLabels[course.billing_cycle as BillingCycle],
                        },
                        status: {
                          icon: <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />,
                          value: <StatusBadge status={course.status} />,
                        },
                        fee: {
                          icon: <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />,
                          value: getPaymentType() === 'One Time'
                            ? `$${formatCurrency(Number(course.fee))}`
                            : `$${formatCurrency(Number(course.fee))} / ${billingCycleLabels[course.billing_cycle as BillingCycle]}`,
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
                )}
              </CardContent>
            </Card>
          </ResizableSection>
        );
      }

      case 'enrolled-students':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Enrolled Students</CardTitle>
                  <div className="flex items-center gap-2">
                    {isRemoveMode && selectedEnrollmentIds.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setStudentToRemove({ 
                          id: 'bulk', 
                          name: `${selectedEnrollmentIds.length} student${selectedEnrollmentIds.length > 1 ? 's' : ''}` 
                        })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove ({selectedEnrollmentIds.length})
                      </Button>
                    )}
                    <Button
                      variant={isRemoveMode ? "outline" : "outline"}
                      size="sm"
                      onClick={() => {
                        setIsRemoveMode(!isRemoveMode);
                        setSelectedEnrollmentIds([]);
                      }}
                    >
                      {isRemoveMode ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Remove Students
                        </>
                      )}
                    </Button>
                    <Dialog open={isAddStudentOpen} onOpenChange={(open) => {
                      if (course.status === 'inactive') return;
                      setIsAddStudentOpen(open);
                      if (!open) {
                        setIsConfirmingAdd(false);
                        setSelectedStudentIds([]);
                        setStudentSearchQuery('');
                      }
                    }}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled={course.status === 'inactive'}
                                  className={course.status === 'inactive' ? 'opacity-50 cursor-not-allowed' : ''}
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Add Student
                                </Button>
                              </DialogTrigger>
                            </span>
                          </TooltipTrigger>
                          {course.status === 'inactive' && (
                            <TooltipContent>
                              <p>This action cannot be done when the Course Status is set as Inactive.</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      <DialogContent className="sm:max-w-lg">
                        {!isConfirmingAdd ? (
                          <>
                            <DialogHeader>
                              <DialogTitle>Add Students to Course</DialogTitle>
                              <DialogDescription>
                                Search and select students to enroll in {course.name}. You can select multiple students.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Selected count indicator */}
                              {selectedStudentIds.length > 0 && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
                                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                                    {selectedStudentIds.length}
                                  </div>
                                  <span className="text-sm font-medium text-primary">
                                    student{selectedStudentIds.length > 1 ? 's' : ''} selected
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto text-xs h-6 px-2"
                                    onClick={() => setSelectedStudentIds([])}
                                  >
                                    Clear all
                                  </Button>
                                </div>
                              )}
                              
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search by name or NRIC..."
                                  value={studentSearchQuery}
                                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                                  className="pl-10"
                                />
                              </div>
                              <div className="max-h-60 overflow-y-auto border rounded-md">
                                {availableStudents.length === 0 ? (
                                  <div className="p-4 text-center text-muted-foreground text-sm">
                                    {studentSearchQuery ? 'No students found' : 'All students are already enrolled'}
                                  </div>
                                ) : (
                                  <div className="divide-y">
                                    {availableStudents.slice(0, 20).map((student) => {
                                      const isSelected = selectedStudentIds.includes(student.id);
                                      return (
                                        <div
                                          key={student.id}
                                          className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-3 ${
                                            isSelected ? 'bg-primary/10 border-l-2 border-primary' : ''
                                          }`}
                                          onClick={() => toggleStudentSelection(student.id)}
                                        >
                                          <div className={`flex items-center justify-center h-5 w-5 rounded border-2 transition-colors ${
                                            isSelected 
                                              ? 'bg-primary border-primary text-primary-foreground' 
                                              : 'border-muted-foreground/30'
                                          }`}>
                                            {isSelected && (
                                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </div>
                                          <div className="flex-1">
                                            <p className="font-medium">{student.name}</p>
                                            <p className="text-sm text-muted-foreground">{student.nric}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setIsAddStudentOpen(false);
                                    setStudentSearchQuery('');
                                    setSelectedStudentIds([]);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => setIsConfirmingAdd(true)}
                                  disabled={selectedStudentIds.length === 0}
                                >
                                  Review Selection ({selectedStudentIds.length})
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <DialogHeader>
                              <DialogTitle>Confirm Student Enrollment</DialogTitle>
                              <DialogDescription>
                                You are about to enroll {selectedStudentIds.length} student{selectedStudentIds.length > 1 ? 's' : ''} in {course.name}.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                                {selectedStudentsDetails.map((student, index) => (
                                  <div key={student.id} className="p-3 flex items-center gap-3">
                                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium">{student.name}</p>
                                      <p className="text-sm text-muted-foreground">{student.nric}</p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => toggleStudentSelection(student.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                                <p>Each student will be:</p>
                                <ul className="list-disc list-inside mt-1 space-y-0.5">
                                  <li>Enrolled in the course with today's date</li>
                                  <li>Charged the course fee of ${formatCurrency(Number(course.fee))}</li>
                                </ul>
                              </div>
                              
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setIsConfirmingAdd(false)}
                                >
                                  Back to Selection
                                </Button>
                                <Button
                                  variant="accent"
                                  onClick={handleAddStudents}
                                  disabled={selectedStudentIds.length === 0 || createEnrollmentMutation.isPending}
                                >
                                  {createEnrollmentMutation.isPending ? 'Adding...' : `Confirm & Add ${selectedStudentIds.length} Student${selectedStudentIds.length > 1 ? 's' : ''}`}
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search bar for enrolled students */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search enrolled students by name or NRIC..."
                    value={enrolledSearchQuery}
                    onChange={(e) => setEnrolledSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <DataTable
                  columns={studentColumns}
                  data={filteredEnrolledStudents}
                  onRowClick={handleStudentClick}
                />
              </CardContent>
            </Card>
            
            {/* Remove Student Confirmation Dialog */}
            <AlertDialog open={!!studentToRemove} onOpenChange={(open) => !open && setStudentToRemove(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {studentToRemove?.id === 'bulk' ? 'Students' : 'Student'}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {studentToRemove?.id === 'bulk' ? (
                      <>
                        Are you sure you want to remove <strong>{studentToRemove.name}</strong> from this course? 
                        This will remove the enrollment records but keep any existing payment history.
                      </>
                    ) : (
                      <>
                        Are you sure you want to remove <strong>{studentToRemove?.name}</strong> from this course? 
                        This will remove the enrollment record but keep any existing payment history.
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setStudentToRemove(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (studentToRemove?.id === 'bulk') {
                        handleBulkRemoveStudents();
                      } else if (studentToRemove && studentToRemove.accountId) {
                        handleRemoveStudent(studentToRemove.id, studentToRemove.accountId);
                      }
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteEnrollmentMutation.isPending ? 'Removing...' : 'Remove'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
    </div>
  );
}
