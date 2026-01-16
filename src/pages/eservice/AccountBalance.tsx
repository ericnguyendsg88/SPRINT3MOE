import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpRight, CreditCard, Calendar, DollarSign, X, ChevronDown, Check } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccountHolders } from '@/hooks/useAccountHolders';
import { useTransactionsByAccount, Transaction } from '@/hooks/useTransactions';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
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
import { SectionAdder } from '@/components/editor/SectionAdder';
import { CustomSectionRenderer } from '@/components/editor/CustomSectionRenderer';
import { ColumnEditor } from '@/components/editor/ColumnEditor';
import { ColumnDefinition, LayoutItem } from '@/hooks/usePageLayout';
import { cn } from '@/lib/utils';

const SECTION_IDS = ['balance-card', 'transactions'];

export default function AccountBalance() {
  const { currentUserId } = useCurrentUser();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [amountFilter, setAmountFilter] = useState<string>('all');
  const [customMinAmount, setCustomMinAmount] = useState<string>('');
  const [customMaxAmount, setCustomMaxAmount] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedTransaction, setSelectedTransaction] = useState<(Transaction & { balanceAfter: number }) | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const { data: accountHolders = [], isLoading: loadingAccounts } = useAccountHolders();
  
  // Find current user based on context
  const currentUser = accountHolders.find(a => a.id === currentUserId) || accountHolders[0];
  
  const { data: transactions = [], isLoading: loadingTransactions } = useTransactionsByAccount(currentUser?.id || '');

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
  } = usePageBuilder('account-balance', SECTION_IDS);

  if (loadingAccounts || loadingTransactions || !currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.reference?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    
    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const transactionDate = new Date(transaction.created_at);
      const now = new Date();
      
      if (dateFilter === 'custom') {
        const startDate = customStartDate ? new Date(customStartDate) : null;
        const endDate = customEndDate ? new Date(customEndDate) : null;
        
        if (startDate && endDate) {
          // Set end date to end of day
          endDate.setHours(23, 59, 59, 999);
          matchesDate = transactionDate >= startDate && transactionDate <= endDate;
        } else if (startDate) {
          matchesDate = transactionDate >= startDate;
        } else if (endDate) {
          endDate.setHours(23, 59, 59, 999);
          matchesDate = transactionDate <= endDate;
        }
      } else {
        switch (dateFilter) {
          case 'today':
            matchesDate = transactionDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = transactionDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = transactionDate >= monthAgo;
            break;
          case '3months':
            const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            matchesDate = transactionDate >= threeMonthsAgo;
            break;
          case 'year':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            matchesDate = transactionDate >= yearAgo;
            break;
        }
      }
    }
    
    // Amount filter
    let matchesAmount = true;
    if (amountFilter !== 'all') {
      const amount = Math.abs(Number(transaction.amount));
      
      if (amountFilter === 'custom') {
        const min = customMinAmount ? parseFloat(customMinAmount) : 0;
        const max = customMaxAmount ? parseFloat(customMaxAmount) : Infinity;
        matchesAmount = amount >= min && amount <= max;
      } else {
        const ranges: Record<string, [number, number]> = {
          '0-50': [0, 50],
          '50-100': [50, 100],
          '100-500': [100, 500],
          '500-1000': [500, 1000],
          '1000+': [1000, Infinity],
        };
        const [min, max] = ranges[amountFilter] || [0, Infinity];
        matchesAmount = amount >= min && amount <= max;
      }
    }
    
    return matchesSearch && matchesType && matchesDate && matchesAmount;
  });

  // Calculate running balance for each transaction (oldest to newest, then reverse)
  const sortedTransactions = [...filteredTransactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  let runningBalance = Number(currentUser.balance) - sortedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const transactionsWithBalance = sortedTransactions.map(t => {
    runningBalance += Number(t.amount);
    return { ...t, balanceAfter: runningBalance };
  });

  // Reverse to show newest first
  const displayTransactions = [...transactionsWithBalance].reverse();

  // Default column definitions
  const defaultTransactionColumns: ColumnDefinition[] = [
    { key: 'created_at', header: 'Date', visible: true, format: 'date' },
    { key: 'type', header: 'Type', visible: true, format: 'text' },
    { key: 'description', header: 'Description', visible: true, format: 'text' },
    { key: 'amount', header: 'Amount', visible: true, format: 'currency' },
    { key: 'balanceAfter', header: 'Balance', visible: true, format: 'currency' },
  ];

  const transactionColumnsConfig = getTableColumns('transactions-table', defaultTransactionColumns);

  const columns = [
    { 
      key: 'created_at', 
      header: transactionColumnsConfig.find(c => c.key === 'created_at')?.header || 'Date',
      render: (item: Transaction & { balanceAfter: number }) => {
        const date = new Date(item.created_at);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return (
          <span className="text-foreground">
            {`${day}/${month}/${year}`}
          </span>
        );
      }
    },
    { 
      key: 'type', 
      header: transactionColumnsConfig.find(c => c.key === 'type')?.header || 'Type',
      render: (item: Transaction & { balanceAfter: number }) => {
        const typeLabels: Record<string, string> = {
          'course_fee': 'Course Payment',
          'top_up': 'Balance Top-up'
        };
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {typeLabels[item.type] || item.type}
          </span>
        );
      }
    },
    { 
      key: 'description', 
      header: transactionColumnsConfig.find(c => c.key === 'description')?.header || 'Description',
      render: (item: Transaction & { balanceAfter: number }) => {
        // Parse description to format appropriately
        let displayText = item.description || '—';
        let topUpName = '';
        
        if (item.type === 'course_fee') {
          // For course payments: "Course Payment [Course Name] - [Billing Cycle]"
          // Try to extract course name from description
          const match = item.description?.match(/Course fee payment: (.+)/) || 
                       item.description?.match(/(.+)/);
          if (match) {
            displayText = `Course Payment ${match[1]}`;
          } else {
            displayText = 'Course Payment';
          }
        } else if (item.type === 'top_up') {
          // For top-ups: extract the name after the prefix
          if (item.description?.toLowerCase().includes('batch top-up')) {
            // Extract name after "Batch Top-up - "
            topUpName = item.description.replace(/^Batch Top-up - /i, '').trim();
            displayText = topUpName || 'Batch Top-Up';
          } else if (item.description?.toLowerCase().includes('individual top-up')) {
            // Extract name after "Individual Top-up - "
            topUpName = item.description.replace(/^Individual Top-up - /i, '').trim();
            displayText = topUpName || 'Individual Top-Up';
          } else {
            displayText = item.description || 'Top-Up';
          }
        }
        
        return (
          <div className="min-w-[200px]">
            <p className="font-medium text-foreground">{displayText}</p>
            {item.reference && <p className="text-xs text-muted-foreground mt-0.5">{item.reference}</p>}
          </div>
        );
      }
    },
    { 
      key: 'amount', 
      header: transactionColumnsConfig.find(c => c.key === 'amount')?.header || 'Amount',
      render: (item: Transaction & { balanceAfter: number }) => (
        <span className={`font-semibold ${Number(item.amount) >= 0 ? 'text-success' : 'text-destructive'}`}>
          {Number(item.amount) >= 0 ? '+' : '-'}${Math.abs(Number(item.amount)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      key: 'balanceAfter', 
      header: transactionColumnsConfig.find(c => c.key === 'balanceAfter')?.header || 'Balance',
      render: (item: Transaction & { balanceAfter: number }) => (
        <span className="font-medium text-foreground">${item.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
      )
    },
  ].filter(col => transactionColumnsConfig.find(c => c.key === col.key)?.visible !== false);

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

    if (item.id === 'balance-card') {
      return (
        <ResizableSection
          key={item.id}
          id={item.id}
          size={getSectionSize(item.id)}
          onSizeChange={(size) => updateSectionSize(item.id, size)}
          isEditMode={isEditMode}
        >
          <div className="rounded-2xl gradient-hero p-8 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Current Balance</p>
                <p className="text-5xl font-bold mt-2">${Number(currentUser.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                <p className="text-sm opacity-75 mt-2">Available for Education Courses Payment</p>
              </div>
              <Button 
                onClick={() => navigate('/eservice/fees')}
                variant="secondary"
                size="lg"
                className="bg-white text-primary hover:bg-white/90"
              >
                Pay Courses
              </Button>
            </div>
          </div>
        </ResizableSection>
      );
    }

    if (item.id === 'transactions') {
      return (
        <ResizableSection
          key={item.id}
          id={item.id}
          size={getSectionSize(item.id)}
          onSizeChange={(size) => updateSectionSize(item.id, size)}
          isEditMode={isEditMode}
        >
          <div className="space-y-4">
            {/* Transaction filters and table */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Transaction History</h2>
              {isEditMode && (
                <ColumnEditor
                  columns={transactionColumnsConfig}
                  availableFields={[
                    { key: 'created_at', label: 'Date', type: 'date' as const },
                    { key: 'type', label: 'Type', type: 'string' as const },
                    { key: 'description', label: 'Description', type: 'string' as const },
                    { key: 'amount', label: 'Amount', type: 'number' as const },
                    { key: 'balanceAfter', label: 'Balance', type: 'number' as const },
                    { key: 'reference', label: 'Reference', type: 'string' as const },
                  ]}
                  onColumnsChange={(cols) => updateTableColumns('transactions-table', cols)}
                  isEditMode={isEditMode}
                  tableId="transactions-table"
                />
              )}
            </div>
            
            {/* Filters */}
            <div className="flex flex-col gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
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
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Type Filter */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="course_fee">Course Payment</SelectItem>
                    <SelectItem value="top_up">Balance Top-up</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Date Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-[200px] justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="flex-1 text-left">
                        {dateFilter === 'all' ? 'All Time' :
                         dateFilter === 'today' ? 'Today' :
                         dateFilter === 'week' ? 'Last 7 Days' :
                         dateFilter === 'month' ? 'Last 30 Days' :
                         dateFilter === '3months' ? 'Last 3 Months' :
                         dateFilter === 'year' ? 'Last Year' :
                         dateFilter === 'custom' && (customStartDate || customEndDate) 
                           ? `${customStartDate || '...'} - ${customEndDate || '...'}` 
                           : 'Custom Range'}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="p-2 space-y-1">
                      {['all', 'today', 'week', 'month', '3months', 'year', 'custom'].map((value) => (
                        <button
                          key={value}
                          onClick={() => setDateFilter(value)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors flex items-center justify-between",
                            dateFilter === value && "bg-accent"
                          )}
                        >
                          <span>
                            {value === 'all' && 'All Time'}
                            {value === 'today' && 'Today'}
                            {value === 'week' && 'Last 7 Days'}
                            {value === 'month' && 'Last 30 Days'}
                            {value === '3months' && 'Last 3 Months'}
                            {value === 'year' && 'Last Year'}
                            {value === 'custom' && 'Custom Range'}
                          </span>
                          {dateFilter === value && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                    {dateFilter === 'custom' && (
                      <div className="border-t p-3 space-y-3 bg-muted/30">
                        <div>
                          <label className="text-xs font-medium text-foreground mb-1.5 block">Start Date</label>
                          <Input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            max={customEndDate || undefined}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-foreground mb-1.5 block">End Date</label>
                          <Input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            min={customStartDate || undefined}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                
                {/* Amount Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-[200px] justify-start">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span className="flex-1 text-left">
                        {amountFilter === 'all' ? 'All Amounts' :
                         amountFilter === '0-50' ? '$0 - $50' :
                         amountFilter === '50-100' ? '$50 - $100' :
                         amountFilter === '100-500' ? '$100 - $500' :
                         amountFilter === '500-1000' ? '$500 - $1,000' :
                         amountFilter === '1000+' ? '$1,000+' :
                         amountFilter === 'custom' && (customMinAmount || customMaxAmount)
                           ? `$${customMinAmount || '0'} - $${customMaxAmount || '∞'}`
                           : 'Custom Range'}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="p-2 space-y-1">
                      {['all', '0-50', '50-100', '100-500', '500-1000', '1000+', 'custom'].map((value) => (
                        <button
                          key={value}
                          onClick={() => setAmountFilter(value)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors flex items-center justify-between",
                            amountFilter === value && "bg-accent"
                          )}
                        >
                          <span>
                            {value === 'all' && 'All Amounts'}
                            {value === '0-50' && '$0 - $50'}
                            {value === '50-100' && '$50 - $100'}
                            {value === '100-500' && '$100 - $500'}
                            {value === '500-1000' && '$500 - $1,000'}
                            {value === '1000+' && '$1,000+'}
                            {value === 'custom' && 'Custom Range'}
                          </span>
                          {amountFilter === value && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                    {amountFilter === 'custom' && (
                      <div className="border-t p-3 space-y-3 bg-muted/30">
                        <div>
                          <label className="text-xs font-medium text-foreground mb-1.5 block">Min Amount</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={customMinAmount}
                              onChange={(e) => setCustomMinAmount(e.target.value)}
                              className="h-8 text-sm pl-6"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-foreground mb-1.5 block">Max Amount</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input
                              type="number"
                              placeholder="No limit"
                              value={customMaxAmount}
                              onChange={(e) => setCustomMaxAmount(e.target.value)}
                              className="h-8 text-sm pl-6"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Transactions Table */}
            <DataTable 
              data={displayTransactions} 
              columns={columns}
              emptyMessage="No transactions found"
              onRowClick={(transaction) => {
                setSelectedTransaction(transaction);
                setShowTransactionModal(true);
              }}
            />
          </div>
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
          <h1 className="text-2xl font-bold text-foreground">Account Balance</h1>
          <p className="text-muted-foreground mt-1">View your education account balance and transactions</p>
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

      {/* Info */}
      <div className="rounded-xl border border-border bg-muted/30 p-6">
        <h3 className="font-semibold text-foreground mb-2">About Your Balance</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Your balance is automatically topped up based on government schemes</li>
          <li>• Funds can be used to pay for approved education courses</li>
          <li>• Unused balance will be forfeited when account closes at age 30</li>
          <li>• Balance cannot be withdrawn as cash</li>
        </ul>
      </div>

      {/* Transaction Detail Modal */}
      <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Detailed information about this transaction
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (() => {
            // Extract top-up information from description
            let topUpType = '';
            let topUpName = '';
            
            if (selectedTransaction.type === 'top_up' && selectedTransaction.description) {
              if (selectedTransaction.description.toLowerCase().includes('batch top-up')) {
                topUpType = 'Batch Top-Up';
                topUpName = selectedTransaction.description.replace(/^Batch Top-up - /i, '').trim();
              } else if (selectedTransaction.description.toLowerCase().includes('individual top-up')) {
                topUpType = 'Individual Top-Up';
                topUpName = selectedTransaction.description.replace(/^Individual Top-up - /i, '').trim();
              } else {
                topUpName = selectedTransaction.description;
              }
            }
            
            return (
              <div className="space-y-5 py-4">
                {/* Amount - Large Display at Top */}
                <div className="text-center pb-4 border-b">
                  <p className={`text-5xl font-bold mb-2 ${
                    Number(selectedTransaction.amount) >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {Number(selectedTransaction.amount) >= 0 ? '+' : '-'}$
                    {Math.abs(Number(selectedTransaction.amount)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">Transaction Amount</p>
                </div>

                {/* Transaction Details */}
                <div className="space-y-4">
                  {/* Transaction Type */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Transaction Type</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                      {selectedTransaction.type === 'course_fee' ? 'Course Payment' : 'Balance Top-up'}
                    </span>
                  </div>

                  {/* Top-Up Type (for top-ups only) */}
                  {selectedTransaction.type === 'top_up' && topUpType && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Top-Up Type</p>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                        {topUpType}
                      </span>
                    </div>
                  )}

                  {/* Top-Up Name (for top-ups only) */}
                  {selectedTransaction.type === 'top_up' && topUpName && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Top-Up Order Name</p>
                      <p className="font-medium text-foreground">
                        {topUpName}
                      </p>
                    </div>
                  )}

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Date</p>
                      <p className="font-medium text-foreground">
                        {new Date(selectedTransaction.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Time</p>
                      <p className="font-medium text-foreground">
                        {new Date(selectedTransaction.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Full Description (for course payments) */}
                  {selectedTransaction.type === 'course_fee' && selectedTransaction.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Description</p>
                      <p className="font-medium text-foreground">
                        {selectedTransaction.description}
                      </p>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                      {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                    </span>
                  </div>

                  {/* Reference ID */}
                  {selectedTransaction.reference && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Reference ID</p>
                      <p className="font-mono text-sm font-medium text-foreground bg-muted px-3 py-2 rounded">
                        {selectedTransaction.reference}
                      </p>
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-2 border-t">
                  <Button variant="outline" onClick={() => setShowTransactionModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
