import { useState } from 'react';
import { Wallet, Calendar, ArrowUpRight, ArrowDownRight, CircleDollarSign, Users, User, UserPlus, Activity, GraduationCap } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/StatCard';
import { useTopUpSchedules } from '@/hooks/useTopUpSchedules';
import { useCourseCharges } from '@/hooks/useCourseCharges';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useAccountHolders } from '@/hooks/useAccountHolders';
import { Link, useNavigate } from 'react-router-dom';
//import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePageBuilder } from '@/components/editor/PageBuilder';
import { EditModeToggle } from '@/components/editor/EditModeToggle';
import { SortableContainer } from '@/components/editor/SortableContainer';
import { ResizableSection } from '@/components/editor/ResizableSection';
import { SectionAdder, CustomSection } from '@/components/editor/SectionAdder';
import { CustomSectionRenderer } from '@/components/editor/CustomSectionRenderer';
import { ColumnEditor, AvailableField } from '@/components/editor/ColumnEditor';
import { ColumnDefinition, LayoutItem } from '@/hooks/usePageLayout';
import { formatDate } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/utils';

const SECTION_IDS = ['topup-tracking', 'recent-activity'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<typeof topUpSchedules[0] | null>(null);
  const [showBatchDetailModal, setShowBatchDetailModal] = useState(false);
  
  const { data: topUpSchedules = [], isLoading: loadingSchedules } = useTopUpSchedules();
  const { data: courseCharges = [], isLoading: loadingCharges } = useCourseCharges();
  const { data: enrollments = [], isLoading: loadingEnrollments } = useEnrollments();
  const { data: accountHolders = [], isLoading: loadingAccounts } = useAccountHolders();

  const {
    isEditMode,
    toggleEditMode,
    layout,
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
  } = usePageBuilder('admin-dashboard', SECTION_IDS);

  // Filter all upcoming/scheduled top-ups
  const upcomingTopUps = topUpSchedules
    .filter(s => s.status === 'scheduled' || s.status === 'processing')
    .sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time || '00:00'}`);
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });

  // Calculate totals from course charges
  const totalCollected = courseCharges
    .filter(c => c.status === 'clear')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const outstandingPayments = courseCharges
    .filter(c => c.status === 'outstanding' || c.status === 'overdue')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  // Calculate total disbursed from completed top-ups
  const totalDisbursed = topUpSchedules
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount) * (t.processed_count || 1), 0);

  // Filter only scheduled top-ups for dashboard display (within 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const scheduledBatchTopUps = [...topUpSchedules]
    .filter(s => {
      const scheduledDate = new Date(s.scheduled_date);
      return s.type === 'batch' && s.status === 'scheduled' && scheduledDate <= thirtyDaysFromNow;
    })
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 8);

  const scheduledIndividualTopUps = [...topUpSchedules]
    .filter(s => {
      const scheduledDate = new Date(s.scheduled_date);
      return s.type === 'individual' && s.status === 'scheduled' && scheduledDate <= thirtyDaysFromNow;
    })
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 8);

  // Recent enrollments sorted by created_at
  const recentEnrollments = [...enrollments]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Recent account creations sorted by created_at (within 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentAccounts = [...accountHolders]
    .filter(account => new Date(account.created_at) >= sevenDaysAgo)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Default column definitions
  const defaultBatchColumns: ColumnDefinition[] = [
    { key: 'ruleName', header: 'Rule Name', visible: true, format: 'text' },
    { key: 'amount', header: 'Amount', visible: true, format: 'currency' },
    { key: 'scheduledDate', header: 'Scheduled', visible: true, format: 'date' },
    { key: 'status', header: 'Top up Status', visible: true, format: 'status' },
  ];

  const defaultIndividualColumns: ColumnDefinition[] = [
    { key: 'name', header: 'Name', visible: true, format: 'text' },
    { key: 'amount', header: 'Amount', visible: true, format: 'currency' },
    { key: 'scheduledDate', header: 'Scheduled', visible: true, format: 'date' },
    { key: 'status', header: 'Top up Status', visible: true, format: 'status' },
  ];

  const batchColumns = getTableColumns('batch-schedules', defaultBatchColumns);
  const individualColumns = getTableColumns('individual-schedules', defaultIndividualColumns);

  const batchScheduleColumns = [
    { 
      key: 'ruleName', 
      header: batchColumns.find(c => c.key === 'ruleName')?.header || 'Rule Name',
      render: (item: typeof topUpSchedules[0]) => (
        <div>
          <p className="font-medium text-foreground">{item.rule_name}</p>
          {item.eligible_count && (
            <p className="text-xs text-muted-foreground">{item.eligible_count} accounts</p>
          )}
        </div>
      )
    },
    { 
      key: 'amount', 
      header: batchColumns.find(c => c.key === 'amount')?.header || 'Amount',
      render: (item: typeof topUpSchedules[0]) => (
        <span className="font-semibold text-success">${formatCurrency(Number(item.amount))}</span>
      )
    },
    { 
      key: 'scheduledDate', 
      header: batchColumns.find(c => c.key === 'scheduledDate')?.header || 'Scheduled',
      render: (item: typeof topUpSchedules[0]) => (
        <div className="text-muted-foreground text-sm">
          <p>{formatDate(item.scheduled_date)}</p>
          {item.scheduled_time && (
            <p className="text-xs">{item.scheduled_time}</p>
          )}
        </div>
      )
    },
    { 
      key: 'status', 
      header: batchColumns.find(c => c.key === 'status')?.header || 'Top up Status',
      render: (item: typeof topUpSchedules[0]) => (
        <StatusBadge status={item.status === 'failed' ? 'cancelled' : item.status} />
      )
    },
  ].filter(col => batchColumns.find(c => c.key === col.key)?.visible !== false);

  const individualScheduleColumns = [
    { 
      key: 'name', 
      header: individualColumns.find(c => c.key === 'name')?.header || 'Name',
      render: (item: typeof topUpSchedules[0]) => (
        <div>
          <p className="font-medium text-foreground">{item.account_name}</p>
          {item.remarks && (
            <p className="text-xs text-muted-foreground">{item.remarks}</p>
          )}
        </div>
      )
    },
    { 
      key: 'amount', 
      header: individualColumns.find(c => c.key === 'amount')?.header || 'Amount',
      render: (item: typeof topUpSchedules[0]) => (
        <span className="font-semibold text-success">${formatCurrency(Number(item.amount))}</span>
      )
    },
    { 
      key: 'scheduledDate', 
      header: individualColumns.find(c => c.key === 'scheduledDate')?.header || 'Scheduled',
      render: (item: typeof topUpSchedules[0]) => (
        <div className="text-muted-foreground text-sm">
          <p>{formatDate(item.scheduled_date)}</p>
          {item.scheduled_time && (
            <p className="text-xs">{item.scheduled_time}</p>
          )}
        </div>
      )
    },
    { 
      key: 'status', 
      header: individualColumns.find(c => c.key === 'status')?.header || 'Top up Status',
      render: (item: typeof topUpSchedules[0]) => (
        <StatusBadge status={item.status === 'failed' ? 'cancelled' : item.status} />
      )
    },
  ].filter(col => individualColumns.find(c => c.key === col.key)?.visible !== false);

  if (loadingSchedules || loadingCharges || loadingEnrollments || loadingAccounts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
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


    if (item.id === 'topup-tracking') {
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
                  <Calendar className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle>Scheduled Top-ups</CardTitle>
                    <CardDescription>Scheduled top-ups within the next 30 days</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditMode && (
                    <ColumnEditor
                      columns={batchColumns}
                      availableFields={[
                        { key: 'rule_name', label: 'Rule Name', type: 'string' as const },
                        { key: 'amount', label: 'Amount', type: 'number' as const },
                        { key: 'scheduled_date', label: 'Scheduled Date', type: 'date' as const },
                        { key: 'status', label: 'Status', type: 'status' as const },
                      ]}
                      onColumnsChange={(cols) => updateTableColumns('batch-schedules', cols)}
                      isEditMode={isEditMode}
                      tableId="batch-schedules"
                    />
                  )}
                  <Link to="/admin/topup">
                    <Button variant="outline" size="sm">View All →</Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="batch" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="batch" className="gap-2">
                    <Users className="h-4 w-4" />
                    Batch
                  </TabsTrigger>
                  <TabsTrigger value="individual" className="gap-2">
                    <User className="h-4 w-4" />
                    Individual
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="batch">
                  <DataTable 
                    data={scheduledBatchTopUps} 
                    columns={batchScheduleColumns}
                    emptyMessage="No scheduled batch top-ups"
                    onRowClick={(schedule) => {
                      setSelectedBatchDetail(schedule);
                      setShowBatchDetailModal(true);
                    }}
                  />
                </TabsContent>
                <TabsContent value="individual">
                  <DataTable 
                    data={scheduledIndividualTopUps} 
                    columns={individualScheduleColumns}
                    emptyMessage="No scheduled individual top-ups"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </ResizableSection>
      );
    }

    if (item.id === 'recent-activity') {
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
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-accent" />
                <div>
                  <CardTitle>Latest Account Creation</CardTitle>
                  <CardDescription>Accounts created within the last 7 days</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={recentAccounts} 
                columns={[
                  { 
                    key: 'name', 
                    header: 'Name',
                    render: (item: typeof accountHolders[0]) => (
                      <span className="font-medium">{item.name}</span>
                    )
                  },
                  { 
                    key: 'email', 
                    header: 'Email',
                    render: (item: typeof accountHolders[0]) => (
                      <span className="text-muted-foreground">{item.email}</span>
                    )
                  },
                  { 
                    key: 'created_by', 
                    header: 'Created By',
                    render: (item: typeof accountHolders[0]) => (
                      <span className="text-sm text-muted-foreground">Admin 1</span>
                    )
                  },
                  { 
                    key: 'created_at', 
                    header: 'Created',
                    render: (item: typeof accountHolders[0]) => (
                      <span className="text-sm text-muted-foreground">
                        {formatDate(item.created_at)}
                      </span>
                    )
                  },
                ]}
                emptyMessage="No recent accounts"
                onRowClick={(account) => navigate(`/admin/accounts/${account.id}`)}
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of education account system</p>
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

      {/* Batch Top-up Detail Modal */}
      <Dialog open={showBatchDetailModal} onOpenChange={setShowBatchDetailModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Top-up Details</DialogTitle>
            <DialogDescription>
              Detailed information about the scheduled batch top-up
            </DialogDescription>
          </DialogHeader>
          {selectedBatchDetail && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Rule Name</p>
                    <p className="font-medium text-foreground">{selectedBatchDetail.rule_name || 'Manual Batch Top-up'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <StatusBadge status={selectedBatchDetail.status === 'failed' ? 'cancelled' : selectedBatchDetail.status} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount per Account</p>
                    <p className="font-semibold text-success text-lg">
                      S${formatCurrency(Number(selectedBatchDetail.amount))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Targeted Accounts</p>
                    <p className="font-medium text-foreground">{selectedBatchDetail.eligible_count || 0} accounts</p>
                  </div>
                </div>

                {/* Schedule Information */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-3">Schedule Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Scheduled Date</p>
                      <p className="font-medium text-foreground">
                        {new Date(selectedBatchDetail.scheduled_date).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Scheduled Time</p>
                      <p className="font-medium text-foreground">{selectedBatchDetail.scheduled_time || '09:00'}</p>
                    </div>
                  </div>
                </div>

                {/* Total Disbursement */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Total Disbursement</p>
                  <p className="text-2xl font-bold text-primary">
                    S${formatCurrency(Number(selectedBatchDetail.amount) * (selectedBatchDetail.eligible_count || 0))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedBatchDetail.eligible_count || 0} accounts × S${formatCurrency(Number(selectedBatchDetail.amount))}
                  </p>
                </div>

                {/* Description/Remarks */}
                {selectedBatchDetail.remarks && (() => {
                  try {
                    const remarks = JSON.parse(selectedBatchDetail.remarks);
                    return (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                        {remarks.description && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Description</p>
                            <p className="font-medium text-foreground">{remarks.description}</p>
                          </div>
                        )}
                        {remarks.targetingType && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Targeting Type</p>
                            <p className="font-medium text-foreground capitalize">{remarks.targetingType}</p>
                          </div>
                        )}
                        {remarks.summary && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Summary</p>
                            <p className="text-sm text-muted-foreground">{remarks.summary}</p>
                          </div>
                        )}
                        {remarks.criteria && remarks.targetingType === 'customized' && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Targeting Criteria</p>
                            <div className="space-y-2 text-sm">
                              {remarks.criteria.minAge && remarks.criteria.maxAge && (
                                <p className="text-muted-foreground">• Age: {remarks.criteria.minAge} - {remarks.criteria.maxAge} years</p>
                              )}
                              {remarks.criteria.minBalance !== null && remarks.criteria.maxBalance !== null && (
                                <p className="text-muted-foreground">
                                  • Balance: S${remarks.criteria.minBalance} - S${remarks.criteria.maxBalance}
                                </p>
                              )}
                              {remarks.criteria.educationStatus && remarks.criteria.educationStatus.length > 0 && (
                                <p className="text-muted-foreground">
                                  • Education: {remarks.criteria.educationStatus.join(', ')}
                                </p>
                              )}
                              {remarks.criteria.residentialStatus && remarks.criteria.residentialStatus.length > 0 && (
                                <p className="text-muted-foreground">
                                  • Residential: {remarks.criteria.residentialStatus.join(', ')}
                                </p>
                              )}
                              {remarks.criteria.schoolingStatus && remarks.criteria.schoolingStatus !== 'all' && (
                                <p className="text-muted-foreground">
                                  • Schooling: {remarks.criteria.schoolingStatus === 'in_school' ? 'In School' : 'Not In School'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } catch (e) {
                    return (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                        <p className="text-sm text-muted-foreground">{selectedBatchDetail.remarks}</p>
                      </div>
                    );
                  }
                })()}

                {/* Execution Information (if completed) */}
                {selectedBatchDetail.executed_date && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Executed On</p>
                    <p className="font-medium text-foreground">
                      {new Date(selectedBatchDetail.executed_date).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowBatchDetailModal(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowBatchDetailModal(false);
                  navigate('/admin/topup');
                }}>
                  Go to Top-Up Management
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
