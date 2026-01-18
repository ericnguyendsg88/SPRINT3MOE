import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, UserMinus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useCourses } from '@/hooks/useCourses';
import { useEnrollments, useCreateEnrollment, useDeleteEnrollment } from '@/hooks/useEnrollments';
import { useAccountHolders } from '@/hooks/useAccountHolders';
import { useCourseCharges, useCreateCourseCharge } from '@/hooks/useCourseCharges';
import { formatDate } from '@/lib/dateUtils';
import { calculateProratedFee, getProratingInfo } from '@/lib/billingUtils';
import { formatCurrency } from '@/lib/utils';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function CourseStudents() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [unenrollDialogOpen, setUnenrollDialogOpen] = useState(false);
  const [enrollmentToUnenroll, setEnrollmentToUnenroll] = useState<{ id: string; studentName: string; accountId: string } | null>(null);

  // Fetch data from database
  const { data: courses = [], isLoading: loadingCourses } = useCourses();
  const { data: enrollments = [] } = useEnrollments();
  const { data: accountHolders = [] } = useAccountHolders();
  const { data: courseCharges = [] } = useCourseCharges();
  const createEnrollmentMutation = useCreateEnrollment();
  const createCourseChargeMutation = useCreateCourseCharge();
  const deleteEnrollmentMutation = useDeleteEnrollment();

  const course = courses.find(c => c.id === courseId);

  if (loadingCourses) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate('/admin/courses')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Button>
        <div className="text-center py-8 text-muted-foreground">
          Course not found
        </div>
      </div>
    );
  }

  // Get enrolled students with their payment status
  const courseEnrollments = enrollments.filter(e => e.course_id === course.id);
  
  const enrolledStudents = courseEnrollments.map(enrollment => {
    const student = accountHolders.find(a => a.id === enrollment.account_id);
    const charges = courseCharges.filter(
      c => c.account_id === enrollment.account_id && c.course_id === course.id
    );
    
    // Determine overall payment status
    const hasOutstanding = charges.some(c => c.status === 'outstanding' || c.status === 'partially_paid');
    const allClear = charges.length > 0 && charges.every(c => c.status === 'clear');
    
    let paymentStatus: 'outstanding' | 'clear' | 'no_charges' = 'no_charges';
    if (hasOutstanding) paymentStatus = 'outstanding';
    else if (allClear) paymentStatus = 'clear';
    
    const totalOwed = charges
      .filter(c => c.status !== 'clear')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    
    return {
      id: enrollment.id,
      student,
      enrollment,
      paymentStatus,
      totalOwed,
      charges,
    };
  });

  // Get students not enrolled in this course
  const enrolledStudentIds = courseEnrollments.map(e => e.account_id);
  const availableStudents = accountHolders.filter(
    student => !enrolledStudentIds.includes(student.id)
  );

  // Filter available students by search query
  const filteredAvailableStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.nric.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate due date based on enrollment date, course billing day settings, and billing cycle.
  // Uses the course's billing_date (day of month) and billing_due_date (days after billing) settings.
  const calculateDueDate = (
    billingDayOfMonth: string | null, 
    billingDueDaysAfter: string | null,
    enrollmentDate: Date = new Date()
  ): string => {
    const billingDay = parseInt(billingDayOfMonth || '5') || 5; // Default to 5th
    const dueDaysAfter = parseInt(billingDueDaysAfter || '30') || 30; // Default to 30 days
    
    // Get the billing date for the enrollment month
    const year = enrollmentDate.getFullYear();
    const month = enrollmentDate.getMonth();
    const enrollmentDay = enrollmentDate.getDate();
    
    // If enrolled after the billing day, use next month's billing date
    let billingDate: Date;
    if (enrollmentDay > billingDay) {
      // Use next month
      billingDate = new Date(year, month + 1, billingDay);
    } else {
      // Use current month
      billingDate = new Date(year, month, billingDay);
    }
    
    // Add the due days after billing date
    const dueDate = new Date(billingDate);
    dueDate.setDate(dueDate.getDate() + dueDaysAfter);
    
    return dueDate.toISOString().split('T')[0];
  };

  const handleAddStudent = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    const student = accountHolders.find(s => s.id === selectedStudentId);
    if (!student) return;

    try {
      // Create enrollment
      await createEnrollmentMutation.mutateAsync({
        account_id: selectedStudentId,
        course_id: course.id,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active',
      });

      // Auto-create course charge with pro-rated fee
      const enrollmentDate = new Date();
      const proratedAmount = calculateProratedFee(
        course.fee,
        enrollmentDate,
        course.course_run_start,
        course.billing_cycle
      );
      
      try {
        await createCourseChargeMutation.mutateAsync({
          account_id: selectedStudentId,
          course_id: course.id,
          course_name: course.name,
          amount: proratedAmount,
          amount_paid: 0,
          due_date: calculateDueDate(course.billing_date, course.billing_due_date, enrollmentDate),
          status: 'outstanding',
          paid_date: null,
          payment_method: null,
        });
      } catch (chargeError) {
        console.error('Failed to create course charge:', chargeError);
        toast.warning('Enrolled successfully, but failed to create charge');
      }

      setSelectedStudentId('');
      setSearchQuery('');
      setIsAddStudentDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleUnenrollClick = (enrollmentId: string, studentName: string, accountId: string) => {
    setEnrollmentToUnenroll({ id: enrollmentId, studentName, accountId });
    setUnenrollDialogOpen(true);
  };

  const handleConfirmUnenroll = async () => {
    if (!enrollmentToUnenroll) return;
    
    try {
      await deleteEnrollmentMutation.mutateAsync({ 
        id: enrollmentToUnenroll.id, 
        accountId: enrollmentToUnenroll.accountId 
      });
      setUnenrollDialogOpen(false);
      setEnrollmentToUnenroll(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/courses')} 
            className="gap-2 mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{course.name}</h1>
          <p className="text-muted-foreground mt-1">
            Students enrolled in this course and their payment status
          </p>
        </div>

        <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="accent" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Student to Course</DialogTitle>
              <DialogDescription>
                Enroll a student in {course.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Select Student</Label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or NRIC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAvailableStudents.length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        {availableStudents.length === 0 
                          ? 'All students are already enrolled' 
                          : 'No students found'}
                      </div>
                    ) : (
                      filteredAvailableStudents.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          <div className="flex flex-col">
                            <span>{student.name}</span>
                            <span className="text-xs text-muted-foreground">{student.nric}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Pro-rating Info */}
              {selectedStudentId && (() => {
                const enrollmentDate = new Date();
                const proRateInfo = getProratingInfo(
                  course.fee,
                  enrollmentDate,
                  course.course_run_start,
                  course.billing_cycle
                );
                
                return (
                  <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Info className="h-4 w-4 text-primary" />
                      First Billing Period Fee
                    </div>
                    {proRateInfo.isProrated ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Full {proRateInfo.billingPeriodLabel} fee:</span>
                          <span className="line-through text-muted-foreground">${formatCurrency(proRateInfo.fullFee)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Pro-rated ({proRateInfo.daysRemaining} of {proRateInfo.totalDays} days):
                          </span>
                          <span className="font-semibold text-foreground">${formatCurrency(proRateInfo.proratedFee)}</span>
                        </div>
                        <div className="text-xs text-success mt-1">
                          Student saves ${formatCurrency(proRateInfo.savingsAmount)} this {proRateInfo.billingPeriodLabel}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Amount to charge:</span>
                        <span className="font-semibold text-foreground">${formatCurrency(proRateInfo.fullFee)}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                      Subsequent {proRateInfo.billingPeriodLabel}s will be charged at the full rate of ${formatCurrency(course.fee)}
                    </p>
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedStudentId('');
                  setSearchQuery('');
                  setIsAddStudentDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="accent" 
                onClick={handleAddStudent}
                disabled={!selectedStudentId || createEnrollmentMutation.isPending}
              >
                {createEnrollmentMutation.isPending ? 'Enrolling...' : 'Enroll Student'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Students Table */}
      {enrolledStudents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground rounded-xl border border-border bg-card">
          No students enrolled in this course
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Student</TableHead>
                <TableHead className="font-semibold">Enrolled Date</TableHead>
                <TableHead className="font-semibold">Enrollment Status</TableHead>
                <TableHead className="font-semibold">Payment Status</TableHead>
                <TableHead className="font-semibold text-right">Outstanding</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolledStudents.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{item.student?.name}</p>
                      <p className="text-xs text-muted-foreground">{item.student?.nric}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(item.enrollment.enrollment_date)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.enrollment.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge 
                      status={
                        item.paymentStatus === 'clear' ? 'completed' :
                        item.paymentStatus === 'outstanding' ? 'outstanding' :
                        'outstanding'
                      } 
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {item.totalOwed > 0 ? (
                      <span className="font-semibold text-destructive">
                        ${formatCurrency(item.totalOwed)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleUnenrollClick(item.id, item.student?.name || 'Unknown', item.enrollment.account_id)}
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Unenroll Confirmation Dialog */}
      <AlertDialog open={unenrollDialogOpen} onOpenChange={setUnenrollDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unenroll Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unenroll {enrollmentToUnenroll?.studentName} from this course? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEnrollmentToUnenroll(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnenroll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEnrollmentMutation.isPending ? 'Unenrolling...' : 'Unenroll'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
