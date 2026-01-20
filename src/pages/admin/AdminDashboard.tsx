import { useState } from 'react';
import { Wallet, Calendar, ArrowUpRight, ArrowDownRight, CircleDollarSign, Users, User, UserPlus, Activity, GraduationCap, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// Helper function to format time string to HH:MM AM/PM
const formatTime = (timeString: string | Date): string => {
  let date: Date;
  
  if (typeof timeString === 'string') {
    // If it's a time string like "09:00" or "14:30"
    if (timeString.includes(':') && !timeString.includes('T')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const min = parseInt(minutes);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
    }
    // If it's a full date string
    date = new Date(timeString);
  } else {
    date = timeString;
  }
  
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<typeof topUpSchedules[0] | null>(null);
  const [showBatchDetailModal, setShowBatchDetailModal] = useState(false);
  const [showBatchEligibleAccounts, setShowBatchEligibleAccounts] = useState(false);
  const [eligibleAccountsSearch, setEligibleAccountsSearch] = useState('');
  const [selectedIndividualDetail, setSelectedIndividualDetail] = useState<typeof topUpSchedules[0] | null>(null);
  const [showIndividualDetailModal, setShowIndividualDetailModal] = useState(false);
  const [batchTopUpsPage, setBatchTopUpsPage] = useState(1);
  const [individualTopUpsPage, setIndividualTopUpsPage] = useState(1);
  const [recentAccountsPage, setRecentAccountsPage] = useState(1);
  const itemsPerPage = 5;
  
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
  
  const allScheduledBatchTopUps = [...topUpSchedules]
    .filter(s => {
      const scheduledDate = new Date(s.scheduled_date);
      return s.type === 'batch' && s.status === 'scheduled' && scheduledDate <= thirtyDaysFromNow;
    })
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
  
  const scheduledBatchTopUps = allScheduledBatchTopUps
    .slice((batchTopUpsPage - 1) * itemsPerPage, batchTopUpsPage * itemsPerPage);

  const allScheduledIndividualTopUps = [...topUpSchedules]
    .filter(s => {
      const scheduledDate = new Date(s.scheduled_date);
      return s.type === 'individual' && s.status === 'scheduled' && scheduledDate <= thirtyDaysFromNow;
    })
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
  
  const scheduledIndividualTopUps = allScheduledIndividualTopUps
    .slice((individualTopUpsPage - 1) * itemsPerPage, individualTopUpsPage * itemsPerPage);

  // Recent enrollments sorted by created_at
  const recentEnrollments = [...enrollments]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Recent account creations sorted by created_at (within 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const allRecentAccounts = [...accountHolders]
    .filter(account => new Date(account.created_at) >= sevenDaysAgo)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  const recentAccounts = allRecentAccounts
    .slice((recentAccountsPage - 1) * itemsPerPage, recentAccountsPage * itemsPerPage);

  // Helper function to check if an account is currently enrolled
  const isAccountInSchool = (accountId: string): boolean => {
    return enrollments.some(e => e.account_id === accountId && e.status === 'active');
  };

  // Helper function to get eligible accounts for a batch based on targeting criteria
  const getEligibleAccountsForBatch = (remarks: string | null): typeof accountHolders => {
    if (!remarks) return [];
    
    try {
      const data = JSON.parse(remarks);
      const { targetingType, criteria } = data;
      
      if (targetingType === 'everyone') {
        return accountHolders.filter(a => a.status === 'active');
      }
      
      // Apply customized criteria
      let targeted = accountHolders.filter(a => a.status === 'active');
      
      // Age range filter
      if (criteria.minAge || criteria.maxAge) {
        targeted = targeted.filter(account => {
          const birthDate = new Date(account.date_of_birth);
          const today = new Date();
          const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          
          if (criteria.minAge && age < criteria.minAge) return false;
          if (criteria.maxAge && age > criteria.maxAge) return false;
          return true;
        });
      }
      
      // Balance range filter
      if (criteria.minBalance || criteria.maxBalance) {
        targeted = targeted.filter(account => {
          const balance = Number(account.balance);
          if (criteria.minBalance && balance < criteria.minBalance) return false;
          if (criteria.maxBalance && balance > criteria.maxBalance) return false;
          return true;
        });
      }
      
      // Education status filter
      if (criteria.educationStatus && criteria.educationStatus.length > 0) {
        targeted = targeted.filter(account => 
          account.education_level && criteria.educationStatus.includes(account.education_level)
        );
      }
      
      // Schooling status filter
      if (criteria.schoolingStatus !== 'all') {
        targeted = targeted.filter(account => {
          const inSchool = isAccountInSchool(account.id);
          return criteria.schoolingStatus === 'in_school' ? inSchool : !inSchool;
        });
      }
      
      return targeted;
    } catch (e) {
      // If remarks is not in JSON format (old data), return empty
      return [];
    }
  };

  // Helper function to navigate to student detail page
  const handleNavigateToStudent = (accountId: string) => {
    setShowBatchEligibleAccounts(false);
    setShowBatchDetailModal(false);
    navigate(`/admin/students/${accountId}`);
  };

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
            <p className="text-xs">{formatTime(item.scheduled_time)}</p>
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
      render: (item: typeof topUpSchedules[0]) => {
        const account = accountHolders.find(acc => acc.id === item.account_id);
        return (
          <div>
            <p className="font-medium text-foreground">{item.account_name}</p>
            {account && (
              <p className="text-xs text-muted-foreground">{account.nric}</p>
            )}
          </div>
        );
      }
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
            <p className="text-xs">{formatTime(item.scheduled_time)}</p>
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
                  {allScheduledBatchTopUps.length > 0 && (
                    <div className="flex items-center justify-between w-full mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {allScheduledBatchTopUps.length === 0 ? 0 : ((batchTopUpsPage - 1) * itemsPerPage) + 1} to {Math.min(batchTopUpsPage * itemsPerPage, allScheduledBatchTopUps.length)} of {allScheduledBatchTopUps.length} results
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBatchTopUpsPage(p => Math.max(1, p - 1))}
                          disabled={batchTopUpsPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {batchTopUpsPage} of {Math.ceil(allScheduledBatchTopUps.length / itemsPerPage)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBatchTopUpsPage(p => Math.min(Math.ceil(allScheduledBatchTopUps.length / itemsPerPage), p + 1))}
                          disabled={batchTopUpsPage >= Math.ceil(allScheduledBatchTopUps.length / itemsPerPage)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="individual">
                  <DataTable 
                    data={scheduledIndividualTopUps} 
                    columns={individualScheduleColumns}
                    emptyMessage="No scheduled individual top-ups"
                    onRowClick={(schedule) => {
                      setSelectedIndividualDetail(schedule);
                      setShowIndividualDetailModal(true);
                    }}
                  />
                  {allScheduledIndividualTopUps.length > 0 && (
                    <div className="flex items-center justify-between w-full mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {allScheduledIndividualTopUps.length === 0 ? 0 : ((individualTopUpsPage - 1) * itemsPerPage) + 1} to {Math.min(individualTopUpsPage * itemsPerPage, allScheduledIndividualTopUps.length)} of {allScheduledIndividualTopUps.length} results
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIndividualTopUpsPage(p => Math.max(1, p - 1))}
                          disabled={individualTopUpsPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {individualTopUpsPage} of {Math.ceil(allScheduledIndividualTopUps.length / itemsPerPage)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIndividualTopUpsPage(p => Math.min(Math.ceil(allScheduledIndividualTopUps.length / itemsPerPage), p + 1))}
                          disabled={individualTopUpsPage >= Math.ceil(allScheduledIndividualTopUps.length / itemsPerPage)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
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
                      <div className="text-sm text-muted-foreground">
                        <p>{formatDate(item.created_at)}</p>
                        <p className="text-xs">{formatTime(item.created_at)}</p>
                      </div>
                    )
                  },
                ]}
                emptyMessage="No recent accounts"
                onRowClick={(account) => navigate(`/admin/accounts/${account.id}`)}
              />
              {allRecentAccounts.length > 0 && (
                <div className="flex items-center justify-between w-full mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {allRecentAccounts.length === 0 ? 0 : ((recentAccountsPage - 1) * itemsPerPage) + 1} to {Math.min(recentAccountsPage * itemsPerPage, allRecentAccounts.length)} of {allRecentAccounts.length} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecentAccountsPage(p => Math.max(1, p - 1))}
                      disabled={recentAccountsPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {recentAccountsPage} of {Math.ceil(allRecentAccounts.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecentAccountsPage(p => Math.min(Math.ceil(allRecentAccounts.length / itemsPerPage), p + 1))}
                      disabled={recentAccountsPage >= Math.ceil(allRecentAccounts.length / itemsPerPage)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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

      {/* Greeting */}
      <div className="rounded-xl gradient-hero p-6 text-primary-foreground">
        <h1 className="text-3xl font-bold">Hi Admin!</h1>
        <p className="mt-1 opacity-90">{new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
      </div>

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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Targeted Accounts</p>
                      <p className="font-medium text-foreground">{selectedBatchDetail.eligible_count || 0} accounts</p>
                    </div>
                    {selectedBatchDetail.eligible_count > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBatchEligibleAccounts(true)}
                      >
                        View List
                      </Button>
                    )}
                  </div>
                </div>

                {/* Description and Internal Remarks */}
                {selectedBatchDetail.remarks && (() => {
                  try {
                    const remarks = JSON.parse(selectedBatchDetail.remarks);
                    return (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Description</p>
                          <p className="font-medium text-foreground">{remarks.description || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Internal Remarks</p>
                          <p className="font-medium text-foreground">{remarks.internalRemark || '—'}</p>
                        </div>
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}

                {/* Schedule Information */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-3">Schedule Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Scheduled Date</p>
                      <p className="font-medium text-foreground">
                        {new Date(selectedBatchDetail.scheduled_date).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: '2-digit' 
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Scheduled Time</p>
                      <p className="font-medium text-foreground">{formatTime(selectedBatchDetail.scheduled_time || '09:00')}</p>
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

                {/* Additional Targeting Details */}
                {selectedBatchDetail.remarks && (() => {
                  try {
                    const remarks = JSON.parse(selectedBatchDetail.remarks);
                    return (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
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
                    return null;
                  }
                })()}

                {/* Execution Information (if completed) */}
                {selectedBatchDetail.executed_date && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Executed On</p>
                    <p className="font-medium text-foreground">
                      {new Date(selectedBatchDetail.executed_date).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: '2-digit'
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

      {/* Batch Eligible Accounts Modal */}
      <Dialog open={showBatchEligibleAccounts} onOpenChange={setShowBatchEligibleAccounts}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Eligible Accounts Details</DialogTitle>
            <DialogDescription>
              {selectedBatchDetail?.rule_name || 'Batch Top-up'} - Complete list of accounts matching the targeting criteria
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedBatchDetail && (() => {
              const allEligibleAccounts = getEligibleAccountsForBatch(selectedBatchDetail.remarks);
              // Filter accounts based on search term
              const eligibleAccounts = allEligibleAccounts.filter(account => {
                if (!eligibleAccountsSearch) return true;
                const searchLower = eligibleAccountsSearch.toLowerCase();
                return (
                  account.name.toLowerCase().includes(searchLower) ||
                  account.nric.toLowerCase().includes(searchLower)
                );
              });
              
              return allEligibleAccounts.length > 0 ? (
                <div className="space-y-3">
                  {/* Summary Card */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Accounts</p>
                      <p className="text-2xl font-bold text-primary">{allEligibleAccounts.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Amount per Account</p>
                      <p className="text-2xl font-bold text-success">S${formatCurrency(Number(selectedBatchDetail.amount))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Disbursement</p>
                      <p className="text-2xl font-bold text-success">S${formatCurrency(Number(selectedBatchDetail.amount) * allEligibleAccounts.length)}</p>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by Name or NRIC..."
                      value={eligibleAccountsSearch}
                      onChange={(e) => setEligibleAccountsSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Results Count */}
                  {eligibleAccountsSearch && (
                    <div className="text-sm text-muted-foreground">
                      Showing {eligibleAccounts.length} of {allEligibleAccounts.length} accounts
                    </div>
                  )}

                  {/* Accounts List */}
                  {eligibleAccounts.length > 0 ? (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                      {eligibleAccounts.map((account, index) => {
                      const birthDate = new Date(account.date_of_birth);
                      const today = new Date();
                      const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                      const inSchool = isAccountInSchool(account.id);
                      
                      return (
                        <div key={account.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">#{index + 1}</span>
                                <button
                                  className="font-semibold text-primary hover:underline text-left"
                                  onClick={() => handleNavigateToStudent(account.id)}
                                >
                                  {account.name}
                                </button>
                              </div>
                              <p className="text-sm text-muted-foreground">NRIC: {account.nric}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Current Balance</p>
                              <p className="font-semibold text-lg">S${formatCurrency(Number(account.balance))}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Age</p>
                              <p className="text-sm font-medium">{age} years</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Education Level</p>
                              <p className="text-sm font-medium capitalize">{account.education_level?.replace('_', ' ') || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Schooling Status</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {inSchool ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                                    In School
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
                                    Not in School
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t bg-success/5 -mx-4 -mb-4 px-4 py-2 rounded-b-lg">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">Top-up Amount:</p>
                              <p className="text-sm font-semibold text-success">+S${formatCurrency(Number(selectedBatchDetail.amount))}</p>
                              <p className="text-xs text-muted-foreground">New Balance:</p>
                              <p className="text-sm font-semibold text-success">S${formatCurrency(Number(account.balance) + Number(selectedBatchDetail.amount))}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  ) : (
                    <div className="text-center py-8 border rounded-lg bg-muted/20">
                      <p className="text-muted-foreground">No accounts match your search criteria</p>
                      <p className="text-sm text-muted-foreground mt-1">Try adjusting your search term</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No accounts match the targeting criteria</p>
                </div>
              );
            })()}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBatchEligibleAccounts(false);
                setEligibleAccountsSearch('');
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Top-up Detail Modal */}
      <Dialog open={showIndividualDetailModal} onOpenChange={setShowIndividualDetailModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Individual Top-up Details</DialogTitle>
            <DialogDescription>
              Detailed information about the scheduled individual top-up
            </DialogDescription>
          </DialogHeader>
          {selectedIndividualDetail && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Account Holder</p>
                    <p className="font-medium text-foreground">{selectedIndividualDetail.account_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <StatusBadge status={selectedIndividualDetail.status === 'failed' ? 'cancelled' : selectedIndividualDetail.status} />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Top-up Amount</p>
                    <p className="font-semibold text-success text-2xl">
                      S${formatCurrency(Number(selectedIndividualDetail.amount))}
                    </p>
                  </div>
                </div>

                {/* Description and Internal Remarks */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="font-medium text-foreground">{(() => {
                      if (selectedIndividualDetail.remarks) {
                        try {
                          const parsed = JSON.parse(selectedIndividualDetail.remarks);
                          return parsed.description || '—';
                        } catch (e) {
                          return selectedIndividualDetail.remarks;
                        }
                      }
                      return '—';
                    })()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Internal Remarks</p>
                    <p className="font-medium text-foreground">{(() => {
                      if (selectedIndividualDetail.remarks) {
                        try {
                          const parsed = JSON.parse(selectedIndividualDetail.remarks);
                          return parsed.internalRemark || '—';
                        } catch (e) {
                          return '—';
                        }
                      }
                      return '—';
                    })()}</p>
                  </div>
                </div>

                {/* Schedule Information */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-3">Schedule Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Scheduled Date</p>
                      <p className="font-medium text-foreground">
                        {new Date(selectedIndividualDetail.scheduled_date).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: '2-digit' 
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Scheduled Time</p>
                      <p className="font-medium text-foreground">{formatTime(selectedIndividualDetail.scheduled_time || '09:00')}</p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                {selectedIndividualDetail.account_id && (() => {
                  const account = accountHolders.find(acc => acc.id === selectedIndividualDetail.account_id);
                  if (account) {
                    return (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-foreground mb-3">Account Information</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">NRIC</p>
                            <p className="font-medium text-foreground">{account.nric}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                            <p className="font-medium text-foreground">S${formatCurrency(Number(account.balance))}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Account Status</p>
                            <StatusBadge status={account.status} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Balance After Top-up</p>
                            <p className="font-semibold text-success">
                              S${formatCurrency(Number(account.balance) + Number(selectedIndividualDetail.amount))}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Execution Information (if completed) */}
                {selectedIndividualDetail.executed_date && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Executed On</p>
                    <p className="font-medium text-foreground">
                      {new Date(selectedIndividualDetail.executed_date).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowIndividualDetailModal(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowIndividualDetailModal(false);
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
