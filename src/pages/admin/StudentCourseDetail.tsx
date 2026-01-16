import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, DollarSign, GraduationCap, Building, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useCourse } from '@/hooks/useCourses';
import { useCourseChargesByAccount } from '@/hooks/useCourseCharges';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useAccountHolder } from '@/hooks/useAccountHolders';
import { formatPaymentMethod } from '@/lib/paymentStatusUtils';
import { formatDate, getBillingCycleLabel, getUpcomingBillingCycles } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/utils';

type BillingCycle = 'monthly' | 'quarterly' | 'biannually' | 'yearly';

const billingCycleLabels: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannually: 'Bi-annually',
  yearly: 'Annually',
};

export default function StudentCourseDetail() {
  const { accountId, courseId } = useParams<{ accountId: string; courseId: string }>();
  const navigate = useNavigate();

  const { data: account, isLoading: loadingAccount } = useAccountHolder(accountId || '');
  const { data: course, isLoading: loadingCourse } = useCourse(courseId || '');
  const { data: enrollments = [] } = useEnrollments();
  const { data: accountCharges = [] } = useCourseChargesByAccount(accountId || '');

  // Filter charges for this course
  const courseCharges = accountCharges.filter(c => c.course_id === courseId);

  // Get enrollment info for this course
  const enrollment = enrollments.find(e => e.account_id === accountId && e.course_id === courseId);

  if (loadingAccount || loadingCourse) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading course details...</div>
      </div>
    );
  }

  if (!account || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-muted-foreground">Course or student not found</div>
        <Button variant="outline" onClick={() => navigate(`/admin/accounts/${accountId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Student
        </Button>
      </div>
    );
  }

  // Calculate payment summary
  const totalCharged = courseCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaid = courseCharges.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
  const outstanding = totalCharged - totalPaid;

  // Separate charges by status
  const outstandingCharges = courseCharges.filter(c => c.status !== 'clear');
  const paidCharges = courseCharges.filter(c => c.status === 'clear');

  const chargeColumns = [
    {
      key: 'billing_cycle',
      header: 'Billing Cycle',
      render: (item: typeof courseCharges[0]) => (
        <span className="font-medium text-foreground">
          {getBillingCycleLabel(item.due_date)}
        </span>
      )
    },
    {
      key: 'billing_date',
      header: 'Billing Date',
      render: (item: typeof courseCharges[0]) => {
        const date = new Date(item.due_date);
        const billingDate = new Date(date.getFullYear(), date.getMonth(), 5);
        return (
          <span className="text-muted-foreground">
            {formatDate(billingDate)}
          </span>
        );
      }
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (item: typeof courseCharges[0]) => {
        const date = new Date(item.due_date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const dueDate = new Date(year, month, Math.min(30, lastDay));
        return (
          <span className="text-muted-foreground">
            {formatDate(dueDate)}
          </span>
        );
      }
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: typeof courseCharges[0]) => (
        <span className="font-semibold text-foreground">
          ${formatCurrency(Number(item.amount))}
        </span>
      )
    },
    {
      key: 'amount_paid',
      header: 'Paid',
      render: (item: typeof courseCharges[0]) => (
        <span className="font-semibold text-success">
          ${formatCurrency(Number(item.amount_paid || 0))}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: typeof courseCharges[0]) => (
        <StatusBadge status={item.status} />
      )
    },
  ];

  // Get upcoming billing cycles for this course if it has recurring payments
  const upcomingCycles = course.billing_cycle 
    ? getUpcomingBillingCycles(course.billing_cycle as BillingCycle, 3)
    : [];

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
      render: (item: typeof courseCharges[0]) => (
        <span className="font-medium text-foreground">
          {getBillingCycleLabel(item.due_date)}
        </span>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: typeof courseCharges[0]) => (
        <span className="font-semibold text-success">
          ${formatCurrency(Number(item.amount))}
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
      render: () => (
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
          onClick={() => navigate(`/admin/accounts/${accountId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{course.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{account.name}</span>
            <span>•</span>
            <span>{course.provider}</span>
          </div>
        </div>
        <StatusBadge status={course.status} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Charged</p>
                <p className="text-2xl font-bold">${formatCurrency(totalCharged)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-success">${formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-warning">${formatCurrency(outstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing Cycle</p>
                <p className="text-2xl font-bold">{billingCycleLabels[course.billing_cycle as BillingCycle]}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Details */}
      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Course Name</p>
                <p className="font-medium">{course.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Provider</p>
                <p className="font-medium">{course.provider}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Mode of Training</p>
                <p className="font-medium capitalize">{course.mode_of_training || 'Online'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Course Period</p>
                <p className="font-medium">
                  {formatDate(course.course_run_start)}
                  {' – '}
                  {course.course_run_end ? formatDate(course.course_run_end) : 'Ongoing'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Enrolled Since</p>
                <p className="font-medium">{formatDate(enrollment?.enrollment_date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Fee per Cycle</p>
                <p className="font-medium">
                  ${formatCurrency(Number(course.fee))} / {billingCycleLabels[course.billing_cycle as BillingCycle]}
                </p>
              </div>
            </div>
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
                    <p className="font-semibold text-foreground">${formatCurrency(Number(course.fee))}</p>
                    <StatusBadge status="scheduled" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
