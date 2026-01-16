import { cn } from '@/lib/utils';

type Status = 
  | 'active' | 'inactive' | 'pending' | 'closed' | 'completed' | 'failed' | 'cancelled'
  | 'paid' | 'enrolled' | 'graduated' | 'not_enrolled' | 'withdrawn'
  | 'in_school' | 'not_in_school'
  | 'primary' | 'secondary' | 'post_secondary' | 'tertiary' | 'postgraduate'
  | 'scheduled' | 'processing'
  | 'outstanding' | 'fully_paid' | 'clear' | 'overdue' | 'partially_paid'
  | 'payment_scheduled';

export type { Status };

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-muted',
  pending: 'bg-warning/10 text-warning border-warning/20',
  closed: 'bg-muted text-muted-foreground border-muted',
  completed: 'bg-success/10 text-success border-success/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  paid: 'bg-success/10 text-success border-success/20',
  enrolled: 'bg-success/10 text-success border-success/20',
  graduated: 'bg-success/10 text-success border-success/20',
  not_enrolled: 'bg-muted text-muted-foreground border-muted',
  withdrawn: 'bg-muted text-muted-foreground border-muted',
  in_school: 'bg-success/10 text-success border-success/20',
  not_in_school: 'bg-muted text-muted-foreground border-muted',
  primary: 'bg-success/10 text-success border-success/20',
  secondary: 'bg-success/10 text-success border-success/20',
  post_secondary: 'bg-success/10 text-success border-success/20',
  tertiary: 'bg-success/10 text-success border-success/20',
  postgraduate: 'bg-success/10 text-success border-success/20',
  scheduled: 'bg-muted text-muted-foreground border-muted',
  processing: 'bg-warning/10 text-warning border-warning/20',
  outstanding: 'bg-warning/10 text-warning border-warning/20',
  fully_paid: 'bg-success/10 text-success border-success/20',
  clear: 'bg-success/10 text-success border-success/20',
  overdue: 'bg-destructive/10 text-destructive border-destructive/20',
  partially_paid: 'bg-warning/10 text-warning border-warning/20',
  payment_scheduled: 'bg-success/10 text-success border-success/20',
};

const statusLabels: Record<Status, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  closed: 'Closed',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  paid: 'Paid',
  enrolled: 'Enrolled',
  graduated: 'Graduated',
  not_enrolled: 'Not Enrolled',
  withdrawn: 'Withdrawn',
  in_school: 'In School',
  not_in_school: 'Not In School',
  primary: 'Primary',
  secondary: 'Secondary',
  post_secondary: 'Post Secondary',
  tertiary: 'Tertiary',
  postgraduate: 'Postgraduate',
  scheduled: 'Scheduled',
  processing: 'Processing',
  outstanding: 'Outstanding',
  fully_paid: 'Fully Paid',
  clear: 'Paid',
  overdue: 'Overdue',
  partially_paid: 'Partial',
  payment_scheduled: 'Scheduled',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      statusStyles[status],
      className
    )}>
      {statusLabels[status]}
    </span>
  );
}
