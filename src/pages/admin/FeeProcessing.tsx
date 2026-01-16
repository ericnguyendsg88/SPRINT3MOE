import { CreditCard, Calendar, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useCourseCharges } from '@/hooks/useCourseCharges';
import { useAccountHolders } from '@/hooks/useAccountHolders';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { usePageBuilder } from '@/components/editor/PageBuilder';
import { EditModeToggle } from '@/components/editor/EditModeToggle';
import { SortableContainer } from '@/components/editor/SortableContainer';
import { ResizableSection } from '@/components/editor/ResizableSection';
import { SectionAdder } from '@/components/editor/SectionAdder';
import { CustomSectionRenderer } from '@/components/editor/CustomSectionRenderer';
import { ColumnEditor } from '@/components/editor/ColumnEditor';
import { ColumnDefinition, LayoutItem } from '@/hooks/usePageLayout';

const SECTION_IDS = ['stats', 'info', 'charges-table'];

export default function FeeProcessing() {
  const { data: courseCharges = [], isLoading: loadingCharges } = useCourseCharges();
  const { data: accountHolders = [] } = useAccountHolders();

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
  } = usePageBuilder('fee-processing', SECTION_IDS);

  const outstandingCharges = courseCharges.filter(c => c.status === 'outstanding');
  const overdueCharges = courseCharges.filter(c => c.status === 'overdue');
  const clearCharges = courseCharges.filter(c => c.status === 'clear');
  
  const totalOutstanding = outstandingCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalOverdue = overdueCharges.reduce((sum, c) => sum + Number(c.amount), 0);

  const handleProcessFees = () => {
    toast.success('Monthly fee processing initiated', {
      description: 'Processing course fees for all enrolled students.',
    });
  };

  const handleSendReminder = () => {
    toast.success('Payment reminders sent', {
      description: `Reminders sent to ${overdueCharges.length} account holders.`,
    });
  };

  // Default column definitions
  const defaultChargeColumns: ColumnDefinition[] = [
    { key: 'student', header: 'Student', visible: true, format: 'text' },
    { key: 'courseName', header: 'Course', visible: true, format: 'text' },
    { key: 'amount', header: 'Amount', visible: true, format: 'currency' },
    { key: 'dueDate', header: 'Due Date', visible: true, format: 'date' },
    { key: 'status', header: 'Payment Status', visible: true, format: 'status' },
    { key: 'paymentMethod', header: 'Payment Method', visible: true, format: 'text' },
  ];

  const chargeColumnsConfig = getTableColumns('charges-table', defaultChargeColumns);

  const chargeColumns = [
    { 
      key: 'student', 
      header: chargeColumnsConfig.find(c => c.key === 'student')?.header || 'Student',
      render: (item: typeof courseCharges[0]) => {
        const student = accountHolders.find(a => a.id === item.account_id);
        return student ? (
          <div>
            <p className="font-medium text-foreground">{student.name}</p>
            <p className="text-xs text-muted-foreground">{student.nric}</p>
          </div>
        ) : null;
      }
    },
    { 
      key: 'courseName', 
      header: chargeColumnsConfig.find(c => c.key === 'courseName')?.header || 'Course',
      render: (item: typeof courseCharges[0]) => (
        <span className="text-foreground">{item.course_name}</span>
      )
    },
    { 
      key: 'amount', 
      header: chargeColumnsConfig.find(c => c.key === 'amount')?.header || 'Amount',
      render: (item: typeof courseCharges[0]) => (
        <span className="font-semibold text-foreground">${formatCurrency(Number(item.amount), 0)}</span>
      )
    },
    { 
      key: 'dueDate', 
      header: chargeColumnsConfig.find(c => c.key === 'dueDate')?.header || 'Due Date',
      render: (item: typeof courseCharges[0]) => (
        <span className="text-muted-foreground">
          {new Date(item.due_date).toLocaleDateString()}
        </span>
      )
    },
    { 
      key: 'status', 
      header: chargeColumnsConfig.find(c => c.key === 'status')?.header || 'Payment Status',
      render: (item: typeof courseCharges[0]) => (
        <StatusBadge status={item.status === 'overdue' ? 'outstanding' : item.status} />
      )
    },
    { 
      key: 'paymentMethod', 
      header: chargeColumnsConfig.find(c => c.key === 'paymentMethod')?.header || 'Payment Method',
      render: (item: typeof courseCharges[0]) => (
        item.payment_method ? (
          <span className="text-xs text-muted-foreground capitalize">
            {item.payment_method.replace('_', ' ')}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )
      )
    },
  ].filter(col => chargeColumnsConfig.find(c => c.key === col.key)?.visible !== false);

  if (loadingCharges) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading fee data...</div>
      </div>
    );
  }

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

    if (item.id === 'stats') {
      return (
        <ResizableSection
          key={item.id}
          id={item.id}
          size={getSectionSize(item.id)}
          onSizeChange={(size) => updateSectionSize(item.id, size)}
          isEditMode={isEditMode}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Outstanding Fees"
              value={`$${formatCurrency(totalOutstanding, 0)}`}
              subtitle={`${outstandingCharges.length} charges`}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title="Overdue Fees"
              value={`$${formatCurrency(totalOverdue, 0)}`}
              subtitle={`${overdueCharges.length} charges`}
              icon={AlertTriangle}
              variant="default"
            />
            <StatCard
              title="Collected This Month"
              value={`$${formatCurrency(clearCharges.reduce((sum, c) => sum + Number(c.amount), 0), 0)}`}
              subtitle={`${clearCharges.length} payments`}
              icon={CheckCircle}
              variant="success"
            />
            <StatCard
              title="Total Due"
              value={`$${formatCurrency(totalOutstanding + totalOverdue, 0)}`}
              subtitle="To be collected"
              icon={CreditCard}
              variant="primary"
            />
          </div>
        </ResizableSection>
      );
    }

    if (item.id === 'info') {
      return (
        <ResizableSection
          key={item.id}
          id={item.id}
          size={getSectionSize(item.id)}
          onSizeChange={(size) => updateSectionSize(item.id, size)}
          isEditMode={isEditMode}
        >
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-2">Monthly Fee Calculation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Course fees are calculated based on each student's active enrollments. 
              The system automatically generates charges at the beginning of each month.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Step 1</p>
                <p className="text-sm font-medium text-foreground">Check Enrollments</p>
                <p className="text-xs text-muted-foreground mt-1">
                  System identifies all active course enrollments
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Step 2</p>
                <p className="text-sm font-medium text-foreground">Calculate Fees</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Monthly fees computed based on course pricing
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Step 3</p>
                <p className="text-sm font-medium text-foreground">Generate Charges</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Charges created and linked to student accounts
                </p>
              </div>
            </div>
          </div>
        </ResizableSection>
      );
    }

    if (item.id === 'charges-table') {
      return (
        <ResizableSection
          key={item.id}
          id={item.id}
          size={getSectionSize(item.id)}
          onSizeChange={(size) => updateSectionSize(item.id, size)}
          isEditMode={isEditMode}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">All Course Charges</h2>
              {isEditMode && (
                <ColumnEditor
                  columns={chargeColumnsConfig}
                  availableFields={[
                    { key: 'account_id', label: 'Student', type: 'string' as const },
                    { key: 'course_name', label: 'Course', type: 'string' as const },
                    { key: 'amount', label: 'Amount', type: 'number' as const },
                    { key: 'due_date', label: 'Due Date', type: 'date' as const },
                    { key: 'status', label: 'Status', type: 'status' as const },
                    { key: 'payment_method', label: 'Payment Method', type: 'string' as const },
                  ]}
                  onColumnsChange={(cols) => updateTableColumns('charges-table', cols)}
                  isEditMode={isEditMode}
                  tableId="charges-table"
                />
              )}
            </div>
            <DataTable 
              data={courseCharges} 
              columns={chargeColumns}
              emptyMessage="No course charges found"
            />
          </div>
        </ResizableSection>
      );
    }

    return null;
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fee Processing</h1>
          <p className="text-muted-foreground mt-1">
            Calculate and manage monthly course fee charges
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSendReminder}>
            Send Reminders
          </Button>
          <Button variant="accent" onClick={handleProcessFees}>
            <Calendar className="h-4 w-4 mr-2" />
            Process Monthly Fees
          </Button>
        </div>
      </div>

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
