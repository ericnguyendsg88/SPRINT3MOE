import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, User, Trash2, ChevronDown, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useTopUpSchedules, useCreateTopUpSchedule, useDeleteTopUpSchedule, useUpdateTopUpSchedule } from '@/hooks/useTopUpSchedules';
import { useAccountHolders, useUpdateAccountHolder } from '@/hooks/useAccountHolders';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TopUpManagement() {
  const navigate = useNavigate();
  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
  const [topUpMode, setTopUpMode] = useState<'individual' | 'batch'>('individual');
  const [individualStep, setIndividualStep] = useState<1 | 2 | 3>(1); // 1: Select Account, 2: Details, 3: Preview
  const [selectedAccount, setSelectedAccount] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpDescription, setTopUpDescription] = useState('');
  const [batchAmount, setBatchAmount] = useState('');
  const [batchRuleName, setBatchRuleName] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [executeNow, setExecuteNow] = useState(true);
  const [accountSearch, setAccountSearch] = useState('');
  
  // Batch targeting options
  const [batchTargeting, setBatchTargeting] = useState<'everyone' | 'customized'>('everyone');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');
  const [selectedEducationStatus, setSelectedEducationStatus] = useState<string[]>([]);
  const [selectedResidentialStatus, setSelectedResidentialStatus] = useState<string[]>([]);
  const [schoolingStatus, setSchoolingStatus] = useState<'all' | 'in_school' | 'not_in_school'>('all');
  
  // Preview and matching accounts state
  const [showIndividualPreview, setShowIndividualPreview] = useState(false);
  const [showBatchPreview, setShowBatchPreview] = useState(false);
  const [showMatchingAccounts, setShowMatchingAccounts] = useState(false);
  
  // Delete schedule confirmation state
  const [deleteScheduleConfirmOpen, setDeleteScheduleConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<{ id: string; name: string } | null>(null);

  // Cancel schedule confirmation state
  const [cancelScheduleConfirmOpen, setCancelScheduleConfirmOpen] = useState(false);

  // Detail view state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedScheduleDetail, setSelectedScheduleDetail] = useState<typeof topUpSchedules[0] | null>(null);
  const [showBatchEligibleAccounts, setShowBatchEligibleAccounts] = useState(false);

  // Filter and sort state
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'this-month' | 'last-month' | 'this-quarter' | 'half-year' | 'full-year' | 'next-year' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTypes, setFilterTypes] = useState<string[]>(['individual', 'batch']);
  const [filterStatuses, setFilterStatuses] = useState<string[]>(['scheduled', 'completed', 'cancelled']);
  const [sortColumn, setSortColumn] = useState<'type' | 'name' | 'amount' | 'status' | 'scheduledDate' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch data from database
  const { data: topUpSchedules = [], isLoading: loadingSchedules } = useTopUpSchedules();
  const { data: accountHolders = [] } = useAccountHolders();
  const { data: enrollments = [] } = useEnrollments();
  const createScheduleMutation = useCreateTopUpSchedule();
  const deleteScheduleMutation = useDeleteTopUpSchedule();
  const updateScheduleMutation = useUpdateTopUpSchedule();
  const updateAccountMutation = useUpdateAccountHolder();
  const createTransactionMutation = useCreateTransaction();

  // Get date range based on filter period
  const getDateRange = (): { start: Date; end: Date } => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    switch (filterPeriod) {
      case 'this-month':
        return {
          start: new Date(currentYear, currentMonth, 1),
          end: new Date(currentYear, currentMonth + 1, 0),
        };
      case 'last-month':
        return {
          start: new Date(currentYear, currentMonth - 1, 1),
          end: new Date(currentYear, currentMonth, 0),
        };
      case 'this-quarter':
        const quarterStart = currentQuarter * 3;
        return {
          start: new Date(currentYear, quarterStart, 1),
          end: new Date(currentYear, quarterStart + 3, 0),
        };
      case 'half-year':
        const halfStart = currentMonth >= 6 ? 6 : 0;
        return {
          start: new Date(currentYear, halfStart, 1),
          end: new Date(currentYear, halfStart + 6, 0),
        };
      case 'full-year':
        return {
          start: new Date(currentYear, 0, 1),
          end: new Date(currentYear, 11, 31),
        };
      case 'next-year':
        return {
          start: new Date(currentYear + 1, 0, 1),
          end: new Date(currentYear + 1, 11, 31),
        };
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : new Date(1900, 0, 1),
          end: customEndDate ? new Date(customEndDate) : new Date(2100, 11, 31),
        };
      default:
        return {
          start: new Date(1900, 0, 1),
          end: new Date(2100, 11, 31),
        };
    }
  };

  const handleNavigateToStudent = (accountId: string) => {
    navigate(`/admin/accounts/${accountId}`);
  };

  // Get start and end dates formatted for input fields
  const getFormattedDateRange = (period: typeof filterPeriod): { start: string; end: string } => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    const formatDateForInput = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (period) {
      case 'this-month':
        return {
          start: formatDateForInput(new Date(currentYear, currentMonth, 1)),
          end: formatDateForInput(new Date(currentYear, currentMonth + 1, 0)),
        };
      case 'last-month':
        return {
          start: formatDateForInput(new Date(currentYear, currentMonth - 1, 1)),
          end: formatDateForInput(new Date(currentYear, currentMonth, 0)),
        };
      case 'this-quarter':
        const quarterStart = currentQuarter * 3;
        return {
          start: formatDateForInput(new Date(currentYear, quarterStart, 1)),
          end: formatDateForInput(new Date(currentYear, quarterStart + 3, 0)),
        };
      case 'half-year':
        const halfStart = currentMonth >= 6 ? 6 : 0;
        return {
          start: formatDateForInput(new Date(currentYear, halfStart, 1)),
          end: formatDateForInput(new Date(currentYear, halfStart + 6, 0)),
        };
      case 'full-year':
        return {
          start: formatDateForInput(new Date(currentYear, 0, 1)),
          end: formatDateForInput(new Date(currentYear, 11, 31)),
        };
      case 'next-year':
        return {
          start: formatDateForInput(new Date(currentYear + 1, 0, 1)),
          end: formatDateForInput(new Date(currentYear + 1, 11, 31)),
        };
      default:
        return {
          start: '',
          end: '',
        };
    }
  };

  const handleFilterPeriodChange = (period: typeof filterPeriod) => {
    setFilterPeriod(period);
    if (period !== 'all') {
      const { start, end } = getFormattedDateRange(period);
      setCustomStartDate(start);
      setCustomEndDate(end);
    } else {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  // Format date range for display
  const getDateRangeLabel = (): string => {
    const { start, end } = getDateRange();
    const startStr = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const filteredAccountHolders = useMemo(() => {
    if (!accountSearch.trim()) return accountHolders.filter(a => a.status === 'active');
    const searchLower = accountSearch.toLowerCase().trim();
    return accountHolders.filter(a => 
      a.status === 'active' && 
      (a.name.toLowerCase().includes(searchLower) || 
       a.nric.toLowerCase().includes(searchLower))
    );
  }, [accountSearch, accountHolders]);

  // Check if account has at least 1 active enrollment
  const isAccountInSchool = (accountId: string): boolean => {
    return enrollments.some(e => e.account_id === accountId && e.status === 'active');
  };

  // Filter accounts based on batch targeting criteria
  const getTargetedAccounts = (): typeof accountHolders => {
    let targeted = accountHolders.filter(a => a.status === 'active');

    if (batchTargeting === 'everyone') {
      return targeted;
    }

    // Apply customized criteria
    // Age range filter
    if (minAge || maxAge) {
      targeted = targeted.filter(account => {
        const birthDate = new Date(account.date_of_birth);
        const today = new Date();
        const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        
        if (minAge && age < parseInt(minAge)) return false;
        if (maxAge && age > parseInt(maxAge)) return false;
        return true;
      });
    }

    // Balance range filter
    if (minBalance || maxBalance) {
      targeted = targeted.filter(account => {
        const balance = Number(account.balance);
        if (minBalance && balance < parseFloat(minBalance)) return false;
        if (maxBalance && balance > parseFloat(maxBalance)) return false;
        return true;
      });
    }

    // Education status filter (multiple selections)
    if (selectedEducationStatus.length > 0) {
      targeted = targeted.filter(account => 
        account.education_level && selectedEducationStatus.includes(account.education_level)
      );
    }

    // Residential status filter (multiple selections)
    if (selectedResidentialStatus.length > 0) {
      targeted = targeted.filter(account => 
        selectedResidentialStatus.includes(account.residential_status)
      );
    }

    // Schooling status filter
    if (schoolingStatus !== 'all') {
      targeted = targeted.filter(account => {
        const inSchool = isAccountInSchool(account.id);
        return schoolingStatus === 'in_school' ? inSchool : !inSchool;
      });
    }

    return targeted;
  };

  // Get eligible accounts based on stored criteria
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
      
      // Residential status filter
      if (criteria.residentialStatus && criteria.residentialStatus.length > 0) {
        targeted = targeted.filter(account => 
          criteria.residentialStatus.includes(account.residential_status)
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

  const handleIndividualTopUp = async () => {
    if (!selectedAccount || !topUpAmount) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!executeNow && (!scheduleDate || !scheduleTime)) {
      toast.error('Please select both schedule date and time');
      return;
    }
    const account = accountHolders.find(a => a.id === selectedAccount);
    if (!account) return;

    const amount = parseFloat(topUpAmount);
    const isImmediate = executeNow;

    try {
      // Create the schedule record
      await createScheduleMutation.mutateAsync({
        type: 'individual',
        scheduled_date: isImmediate ? new Date().toISOString().split('T')[0] : scheduleDate,
        scheduled_time: isImmediate ? new Date().toTimeString().slice(0, 5) : '09:00',
        amount: amount,
        account_id: account.id,
        account_name: account.name,
        status: isImmediate ? 'completed' : 'scheduled',
        executed_date: isImmediate ? new Date().toISOString() : null,
        rule_id: null,
        rule_name: null,
        eligible_count: null,
        processed_count: null,
        remarks: null,
      });

      // If immediate, also update the account balance and create transaction record
      if (isImmediate) {
        await updateAccountMutation.mutateAsync({
          id: account.id,
          balance: Number(account.balance) + amount,
        });
        
        // Generate reference ID
        const referenceId = `TOPUP-${Date.now()}`;
        
        // Create transaction record with description and reference ID
        await createTransactionMutation.mutateAsync({
          account_id: account.id,
          type: 'top_up',
          amount: amount,
          description: topUpDescription ? `Individual Top-up - ${topUpDescription}` : 'Individual Top-up',
          reference: referenceId,
          status: 'completed',
        });
        
        toast.success(`$${formatCurrency(amount, 0)} credited to ${account.name}'s account`, {
          description: `Reference ID: ${referenceId}`,
        });
      } else {
        toast.success('Top-up scheduled successfully');
      }

      setIsTopUpDialogOpen(false);
      setSelectedAccount('');
      setTopUpAmount('');
      setScheduleDate('');
      setExecuteNow(true);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleBatchTopUp = async () => {
    if (!batchRuleName || !batchAmount || !batchDescription) {
      toast.error('Please fill in all mandatory fields');
      return;
    }
    if (!executeNow && (!scheduleDate || !scheduleTime)) {
      toast.error('Please select both schedule date and time');
      return;
    }

    const amount = parseFloat(batchAmount);
    const targetedAccounts = getTargetedAccounts();
    
    // Generate reference ID for batch
    const batchReferenceId = `BATCH-${Date.now()}`;

    try {
      // Create a schedule record for batch top-up
      await createScheduleMutation.mutateAsync({
        type: 'batch',
        scheduled_date: executeNow ? new Date().toISOString().split('T')[0] : scheduleDate,
        scheduled_time: executeNow ? new Date().toTimeString().slice(0, 5) : scheduleTime,
        amount: amount,
        rule_id: null,
        rule_name: batchRuleName.trim() || 'Manual Batch Top-up',
        eligible_count: targetedAccounts.length,
        status: executeNow ? 'completed' : 'scheduled',
        executed_date: executeNow ? new Date().toISOString() : null,
        processed_count: null,
        account_id: null,
        account_name: null,
        remarks: JSON.stringify({
          description: batchDescription,
          referenceId: batchReferenceId,
          targetingType: batchTargeting,
          criteria: batchTargeting === 'everyone' ? {} : {
            minAge: minAge ? parseInt(minAge) : null,
            maxAge: maxAge ? parseInt(maxAge) : null,
            minBalance: minBalance ? parseFloat(minBalance) : null,
            maxBalance: maxBalance ? parseFloat(maxBalance) : null,
            educationStatus: selectedEducationStatus,
            residentialStatus: selectedResidentialStatus,
            schoolingStatus: schoolingStatus,
          },
          eligibleAccountCount: targetedAccounts.length,
          summary: `Targeting: ${batchTargeting === 'everyone' ? 'All accounts' : 'Customized criteria'} (${targetedAccounts.length} accounts)`,
        }),
      });

      // If executing immediately, create transactions for all targeted accounts
      if (executeNow) {
        for (const account of targetedAccounts) {
          await updateAccountMutation.mutateAsync({
            id: account.id,
            balance: Number(account.balance) + amount,
          });
          
          await createTransactionMutation.mutateAsync({
            account_id: account.id,
            type: 'top_up',
            amount: amount,
            description: `Batch Top-up - ${batchDescription}`,
            reference: batchReferenceId,
            status: 'completed',
          });
        }
      }
      
      toast.success(executeNow ? 'Batch top-up completed successfully' : 'Batch top-up scheduled successfully', {
        description: executeNow 
          ? `${targetedAccounts.length} account(s) credited | Reference ID: ${batchReferenceId}`
          : `${targetedAccounts.length} account(s) targeted`,
      });

      // Reset form
      setIsTopUpDialogOpen(false);
      setBatchAmount('');
      setBatchRuleName('');
      setBatchDescription('');
      setScheduleDate('');
      setScheduleTime('09:00');
      setExecuteNow(true);
      setBatchTargeting('everyone');
      setMinAge('');
      setMaxAge('');
      setMinBalance('');
      setMaxBalance('');
      setSelectedEducationStatus([]);
      setSelectedResidentialStatus([]);
      setSchoolingStatus('all');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const scheduledCount = topUpSchedules.filter(s => s.status === 'scheduled').length;
  const completedCount = topUpSchedules.filter(s => s.status === 'completed').length;

  // Recently created top-ups (last 7 days)
  const recentlyCreatedTopUps = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return [...topUpSchedules]
      .filter(schedule => {
        const createdDate = new Date(schedule.created_at);
        return createdDate >= sevenDaysAgo;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [topUpSchedules]);

  // Upcoming top-ups (all scheduled)
  const upcomingTopUps = useMemo(() => {
    return topUpSchedules
      .filter(s => s.status === 'scheduled')
      .sort((a, b) => {
        const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time || '00:00'}`);
        const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time || '00:00'}`);
        return dateA.getTime() - dateB.getTime();
      });
  }, [topUpSchedules]);

  // Filtered top-up schedules with date range and search
  const filteredTopUpSchedules = useMemo(() => {
    const { start, end } = getDateRange();
    const searchLower = searchTerm.toLowerCase().trim();
    
    let filtered = topUpSchedules.filter(schedule => {
      // Filter by date range
      const scheduleDate = new Date(schedule.scheduled_date);
      if (scheduleDate < start || scheduleDate > end) return false;
      
      // Filter by type
      if (!filterTypes.includes(schedule.type)) return false;
      
      // Filter by status
      if (!filterStatuses.includes(schedule.status)) return false;
      
      // Filter out individual top-ups with invalid account names (not in database)
      if (schedule.type === 'individual' && schedule.account_id) {
        const accountExists = accountHolders.some(a => a.id === schedule.account_id && a.name === schedule.account_name);
        if (!accountExists) return false;
      }
      
      // Apply search filter - only search by name
      if (searchLower) {
        const accountName = schedule.account_name?.toLowerCase() || '';
        const ruleName = schedule.rule_name?.toLowerCase() || '';
        
        const matches = accountName.includes(searchLower) || ruleName.includes(searchLower);
        if (!matches) return false;
      }
      
      return true;
    });

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let compareResult = 0;
        
        switch (sortColumn) {
          case 'type':
            compareResult = a.type.localeCompare(b.type);
            break;
          case 'name':
            const nameA = a.type === 'individual' ? (a.account_name || '') : (a.rule_name || '');
            const nameB = b.type === 'individual' ? (b.account_name || '') : (b.rule_name || '');
            compareResult = nameA.localeCompare(nameB);
            break;
          case 'amount':
            compareResult = Number(a.amount) - Number(b.amount);
            break;
          case 'status':
            compareResult = a.status.localeCompare(b.status);
            break;
          case 'scheduledDate':
            const dateA = new Date(a.scheduled_date);
            const dateB = new Date(b.scheduled_date);
            compareResult = dateA.getTime() - dateB.getTime();
            break;
        }
        
        return sortDirection === 'asc' ? compareResult : -compareResult;
      });
    }

    return filtered;
  }, [topUpSchedules, filterPeriod, customStartDate, customEndDate, accountHolders, searchTerm, filterTypes, filterStatuses, sortColumn, sortDirection]);

  const handleSort = (column: 'type' | 'name' | 'amount' | 'status' | 'scheduledDate') => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with ascending direction
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: 'type' | 'name' | 'amount' | 'status' | 'scheduledDate') => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const openDeleteScheduleConfirm = (schedule: typeof topUpSchedules[0]) => {
    const name = schedule.type === 'batch' ? schedule.rule_name || 'Batch Top-up' : schedule.account_name || 'Individual Top-up';
    setScheduleToDelete({ id: schedule.id, name });
    setDeleteScheduleConfirmOpen(true);
  };

  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    try {
      await deleteScheduleMutation.mutateAsync(scheduleToDelete.id);
      setDeleteScheduleConfirmOpen(false);
      setScheduleToDelete(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancelSchedule = async () => {
    if (!selectedScheduleDetail) return;
    try {
      await updateScheduleMutation.mutateAsync({
        id: selectedScheduleDetail.id,
        status: 'cancelled',
      });
      toast.success('Top-up order cancelled successfully');
      setCancelScheduleConfirmOpen(false);
      setShowDetailModal(false);
    } catch (error: any) {
      console.error('Error cancelling top-up order:', error);
      toast.error('Failed to cancel top-up order', {
        description: error?.message || 'Please try again or contact support'
      });
    }
  };

  // Columns for recently created table (without scheduled date, with created by)
  const recentlyCreatedColumns = [
    { 
      key: 'type', 
      header: (
        <button 
          onClick={() => handleSort('type')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Type
          {getSortIcon('type')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          item.type === 'batch' 
            ? 'bg-primary/10 text-primary border border-primary/20' 
            : 'bg-accent/10 text-accent border border-accent/20'
        }`}>
          {item.type === 'batch' ? (
            <Users className="h-3.5 w-3.5" />
          ) : (
            <User className="h-3.5 w-3.5" />
          )}
          {item.type === 'batch' ? 'Batch' : 'Individual'}
        </div>
      )
    },
    { 
      key: 'name', 
      header: (
        <button 
          onClick={() => handleSort('name')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Name
          {getSortIcon('name')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => (
        <div>
          {item.type === 'individual' && item.account_id ? (
            <div>
              <button
                className="font-medium text-primary hover:underline text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigateToStudent(item.account_id!);
                }}
              >
                {item.account_name}
              </button>
              {(() => {
                const account = accountHolders.find(a => a.id === item.account_id);
                return account ? (
                  <p className="text-xs text-muted-foreground">{account.nric}</p>
                ) : null;
              })()}
            </div>
          ) : (
            <p className="font-medium text-foreground">{item.rule_name}</p>
          )}
        </div>
      )
    },
    { 
      key: 'amount', 
      header: (
        <button 
          onClick={() => handleSort('amount')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Amount
          {getSortIcon('amount')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => (
        <span className="font-semibold text-success">${formatCurrency(Number(item.amount), 0)}</span>
      )
    },
    { 
      key: 'status', 
      header: (
        <button 
          onClick={() => handleSort('status')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Status
          {getSortIcon('status')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => (
        <StatusBadge status={item.status} />
      )
    },
    { 
      key: 'createdBy', 
      header: 'Created By',
      render: (item: typeof topUpSchedules[0]) => (
        <span className="font-medium text-foreground">Admin 1</span>
      )
    },
    { 
      key: 'createdAt', 
      header: (
        <button 
          onClick={() => handleSort('created_at')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Date & Time
          {getSortIcon('created_at')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {new Date(item.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </span>
        </div>
      )
    },
  ];

  const scheduleColumns = [
    { 
      key: 'type', 
      header: (
        <button 
          onClick={() => handleSort('type')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Type
          {getSortIcon('type')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          item.type === 'batch' 
            ? 'bg-primary/10 text-primary border border-primary/20' 
            : 'bg-accent/10 text-accent border border-accent/20'
        }`}>
          {item.type === 'batch' ? (
            <Users className="h-3.5 w-3.5" />
          ) : (
            <User className="h-3.5 w-3.5" />
          )}
          {item.type === 'batch' ? 'Batch' : 'Individual'}
        </div>
      )
    },
    { 
      key: 'name', 
      header: (
        <button 
          onClick={() => handleSort('name')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Name
          {getSortIcon('name')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => (
        <div>
          {item.type === 'individual' && item.account_id ? (
            <div>
              <button
                className="font-medium text-primary hover:underline text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigateToStudent(item.account_id!);
                }}
              >
                {item.account_name}
              </button>
              {(() => {
                const account = accountHolders.find(a => a.id === item.account_id);
                return account ? (
                  <p className="text-xs text-muted-foreground">{account.nric}</p>
                ) : null;
              })()}
            </div>
          ) : (
            <p className="font-medium text-foreground">{item.rule_name}</p>
          )}
        </div>
      )
    },
    { 
      key: 'amount', 
      header: (
        <button 
          onClick={() => handleSort('amount')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Amount
          {getSortIcon('amount')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => (
        <span className="font-semibold text-success">${formatCurrency(Number(item.amount), 0)}</span>
      )
    },
    { 
      key: 'status', 
      header: (
        <button 
          onClick={() => handleSort('status')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Status
          {getSortIcon('status')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => (
        <StatusBadge status={item.status} />
      )
    },
    { 
      key: 'scheduledDate', 
      header: (
        <button 
          onClick={() => handleSort('scheduledDate')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Scheduled Date
          {getSortIcon('scheduledDate')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {new Date(item.scheduled_date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </span>
          <span className="text-xs text-muted-foreground">
            {item.scheduled_time 
              ? item.scheduled_time.slice(0, 5)
              : '—'}
          </span>
        </div>
      )
    },
  ];

  if (loadingSchedules) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading top-up data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Top-up Management</h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage batch and individual account top-ups
          </p>
        </div>
        <Button 
          variant="accent" 
          onClick={() => {
            setTopUpMode('individual');
            setIsTopUpDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Top Up
        </Button>
      </div>

      {/* Recently Created Top-ups (Last 7 Days) */}
      <Card>
        <CardHeader className="pb-3">
          <div>
            <CardTitle>Recently Created</CardTitle>
            <CardDescription>Top-up orders created in the last 7 days</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            data={recentlyCreatedTopUps} 
            columns={recentlyCreatedColumns}
            emptyMessage="No top-ups created in the last 7 days"
            onRowClick={(schedule) => {
              setSelectedScheduleDetail(schedule);
              setShowDetailModal(true);
            }}
          />
        </CardContent>
      </Card>

      {/* All Top-up Tracking */}
      <Card>
        <CardHeader className="pb-3">
          <div>
            <CardTitle>All Top-up</CardTitle>
            <CardDescription>Track all top-up operations</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter and Sort Controls */}
          <div className="space-y-4">
            {/* Search */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Search Top-ups</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for Top-Up Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Type and Status Filters */}
            <div className="grid grid-cols-2 gap-4">
              {/* Top Up Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Top Up Type</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="text-sm">
                        {filterTypes.length === 2 ? 'All Types' : filterTypes.length === 1 ? filterTypes[0].charAt(0).toUpperCase() + filterTypes[0].slice(1) : 'Select Type'}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-3">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="type-individual"
                          checked={filterTypes.includes('individual')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilterTypes(prev => [...prev, 'individual']);
                            } else if (filterTypes.length > 1) {
                              setFilterTypes(prev => prev.filter(t => t !== 'individual'));
                            }
                          }}
                        />
                        <label
                          htmlFor="type-individual"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Individual
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="type-batch"
                          checked={filterTypes.includes('batch')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilterTypes(prev => [...prev, 'batch']);
                            } else if (filterTypes.length > 1) {
                              setFilterTypes(prev => prev.filter(t => t !== 'batch'));
                            }
                          }}
                        />
                        <label
                          htmlFor="type-batch"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Batch
                        </label>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="text-sm">
                        {filterStatuses.length === 3 ? 'All Statuses' : filterStatuses.length > 0 ? `${filterStatuses.length} selected` : 'Select Status'}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-3">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="status-scheduled"
                          checked={filterStatuses.includes('scheduled')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilterStatuses(prev => [...prev, 'scheduled']);
                            } else if (filterStatuses.length > 1) {
                              setFilterStatuses(prev => prev.filter(s => s !== 'scheduled'));
                            }
                          }}
                        />
                        <label
                          htmlFor="status-scheduled"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Scheduled
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="status-completed"
                          checked={filterStatuses.includes('completed')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilterStatuses(prev => [...prev, 'completed']);
                            } else if (filterStatuses.length > 1) {
                              setFilterStatuses(prev => prev.filter(s => s !== 'completed'));
                            }
                          }}
                        />
                        <label
                          htmlFor="status-completed"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Completed
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="status-cancelled"
                          checked={filterStatuses.includes('cancelled')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilterStatuses(prev => [...prev, 'cancelled']);
                            } else if (filterStatuses.length > 1) {
                              setFilterStatuses(prev => prev.filter(s => s !== 'cancelled'));
                            }
                          }}
                        />
                        <label
                          htmlFor="status-cancelled"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Cancelled
                        </label>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Date Range Filters */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Filter by Date Range</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={filterPeriod === 'all' ? 'default' : 'outline'}
                  onClick={() => handleFilterPeriodChange('all')}
                >
                  All Time
                </Button>
                <Button
                  size="sm"
                  variant={filterPeriod === 'this-month' ? 'default' : 'outline'}
                  onClick={() => handleFilterPeriodChange('this-month')}
                >
                  This Month
                </Button>
                <Button
                  size="sm"
                  variant={filterPeriod === 'last-month' ? 'default' : 'outline'}
                  onClick={() => handleFilterPeriodChange('last-month')}
                >
                  Last Month
                </Button>
                <Button
                  size="sm"
                  variant={filterPeriod === 'this-quarter' ? 'default' : 'outline'}
                  onClick={() => handleFilterPeriodChange('this-quarter')}
                >
                  This Quarter
                </Button>
                <Button
                  size="sm"
                  variant={filterPeriod === 'half-year' ? 'default' : 'outline'}
                  onClick={() => handleFilterPeriodChange('half-year')}
                >
                  Half Year
                </Button>
                <Button
                  size="sm"
                  variant={filterPeriod === 'full-year' ? 'default' : 'outline'}
                  onClick={() => handleFilterPeriodChange('full-year')}
                >
                  This Year
                </Button>
                <Button
                  size="sm"
                  variant={filterPeriod === 'next-year' ? 'default' : 'outline'}
                  onClick={() => handleFilterPeriodChange('next-year')}
                >
                  Next Year
                </Button>
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="grid gap-2">
                <Label className="text-sm">Start Date</Label>
                <DateInput
                  value={customStartDate}
                  onChange={(date) => {
                    setCustomStartDate(date);
                    if (filterPeriod !== 'all') {
                      setFilterPeriod('all');
                    }
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm">End Date</Label>
                <DateInput
                  value={customEndDate}
                  onChange={(date) => {
                    setCustomEndDate(date);
                    if (filterPeriod !== 'all') {
                      setFilterPeriod('all');
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <DataTable 
            data={filteredTopUpSchedules} 
            columns={scheduleColumns}
            emptyMessage="No top-ups recorded yet"
            onRowClick={(schedule) => {
              setSelectedScheduleDetail(schedule);
              setShowDetailModal(true);
            }}
          />
        </CardContent>
      </Card>

      {/* Unified Top-up Dialog with Tabs */}
      <Dialog open={isTopUpDialogOpen} onOpenChange={(open) => {
        setIsTopUpDialogOpen(open);
        if (!open) {
          // Reset form when dialog closes
          setIndividualStep(1);
          setSelectedAccount('');
          setTopUpAmount('');
          setTopUpDescription('');
          setAccountSearch('');
        }
      }}>
        <DialogContent className="w-[900px] max-w-[95vw] h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Top Up</DialogTitle>
            <DialogDescription>
              Add funds to student accounts
            </DialogDescription>
          </DialogHeader>
          <Tabs value={topUpMode} onValueChange={(value) => {
            setTopUpMode(value as 'individual' | 'batch');
            // Reset individual step when switching tabs
            setIndividualStep(1);
          }} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="batch" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Batch
              </TabsTrigger>
            </TabsList>
            
            {/* Individual Top-up Content */}
            <TabsContent value="individual" className="mt-0 flex-1 overflow-y-auto">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6 px-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${individualStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              1
            </div>
            <div className={`h-[2px] w-12 ${individualStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${individualStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              2
            </div>
            <div className={`h-[2px] w-12 ${individualStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${individualStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              3
            </div>
          </div>

          {/* Step 1: Select Account */}
          {individualStep === 1 && (
            <>
              <div className="grid gap-4 py-4 pr-2">
                <div className="grid gap-2">
                  <Label>Search Account</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or NRIC..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                {filteredAccountHolders.length > 0 && (
                  <div className="grid gap-2">
                    <Label>Select Account</Label>
                    <div className="border rounded-lg p-2 space-y-2 max-h-[400px] overflow-y-auto">
                      {filteredAccountHolders.map(account => (
                        <button
                          key={account.id}
                          onClick={() => setSelectedAccount(account.id)}
                          className={`w-full text-left p-3 rounded-md transition-colors ${
                            selectedAccount === account.id
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="font-medium text-sm">{account.name}</div>
                          <div className="text-xs text-muted-foreground">{account.nric}</div>
                          <div className="text-xs text-muted-foreground">Balance: ${formatCurrency(Number(account.balance), 0)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setIsTopUpDialogOpen(false);
                  setIndividualStep(1);
                  setSelectedAccount('');
                  setAccountSearch('');
                }}>
                  Cancel
                </Button>
                <Button 
                  variant="accent" 
                  onClick={() => setIndividualStep(2)}
                  disabled={!selectedAccount}
                >
                  Continue
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Details */}
          {individualStep === 2 && (
            <>
              <div className="grid gap-4 py-4 pr-2">
                {(() => {
                  const account = accountHolders.find(a => a.id === selectedAccount);
                  return account && (
                    <div className="bg-muted/50 p-3 rounded-lg mb-2">
                      <div className="text-sm font-medium">{account.name}</div>
                      <div className="text-xs text-muted-foreground">{account.nric}</div>
                    </div>
                  );
                })()}
                <div className="grid gap-2">
                  <Label>Description <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g., Monthly allowance, Education support, etc."
                    value={topUpDescription}
                    onChange={(e) => setTopUpDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Top-up Amount <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">S$</span>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="individual-execute-now"
                    checked={executeNow}
                    onCheckedChange={(checked) => setExecuteNow(checked === true)}
                  />
                  <Label htmlFor="individual-execute-now">Execute immediately</Label>
                </div>
                {!executeNow && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Schedule Date <span className="text-destructive">*</span></Label>
                      <DateInput
                        value={scheduleDate}
                        onChange={setScheduleDate}
                        minDate={new Date()}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Schedule Time <span className="text-destructive">*</span></Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIndividualStep(1)}>
                  Back
                </Button>
                <Button 
                  variant="accent" 
                  onClick={() => setIndividualStep(3)}
                  disabled={!topUpDescription || !topUpAmount || (!executeNow && (!scheduleDate || !scheduleTime))}
                >
                  Continue to Preview
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Preview */}
          {individualStep === 3 && (
            <>
              <div className="grid gap-4 py-4 pr-2">
                {(() => {
                  const account = accountHolders.find(a => a.id === selectedAccount);
                  const amount = parseFloat(topUpAmount);
                  return account && (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-muted-foreground">Account</span>
                          <div className="text-right">
                            <div className="text-sm font-medium">{account.name}</div>
                            <div className="text-xs text-muted-foreground">{account.nric}</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-muted-foreground">Description</span>
                          <span className="text-sm font-medium text-right">{topUpDescription}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-muted-foreground">Amount</span>
                          <span className="text-sm font-bold text-success">+S${formatCurrency(amount, 0)}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-muted-foreground">Execution</span>
                          <span className="text-sm font-medium text-right">
                            {executeNow ? 'Immediate' : `Scheduled: ${scheduleDate} at ${scheduleTime}`}
                          </span>
                        </div>
                        <div className="border-t pt-3 flex justify-between items-start">
                          <span className="text-sm font-medium text-muted-foreground">New Balance</span>
                          <span className="text-base font-bold text-primary">
                            S${formatCurrency(Number(account.balance) + amount, 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIndividualStep(2)}>
                  Back
                </Button>
                <Button 
                  variant="accent" 
                  onClick={handleIndividualTopUp}
                  disabled={createScheduleMutation.isPending}
                >
                  {createScheduleMutation.isPending ? 'Processing...' : 'Confirm & Submit'}
                </Button>
              </div>
            </>
          )}
            </TabsContent>
            
            {/* Batch Top-up Content */}
            <TabsContent value="batch" className="mt-0 flex-1 overflow-y-auto">
          <div className="grid gap-4 py-4 pr-2">
            <div className="grid gap-2">
              <Label>Rule Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Monthly Support, Q1 Batch, etc."
                value={batchRuleName}
                onChange={(e) => setBatchRuleName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Top-up Amount per Account <span className="text-destructive">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">S$</span>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={batchAmount}
                  onChange={(e) => setBatchAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Monthly government scheme, Education fund support, etc."
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This description will help account holders understand the source of the top-up
              </p>
            </div>

            {/* Targeting Options */}
            <div className="border-t pt-4">
              <Label className="text-base font-medium mb-3 block">Target Accounts</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="target-everyone"
                    checked={batchTargeting === 'everyone'}
                    onCheckedChange={() => setBatchTargeting('everyone')}
                  />
                  <Label htmlFor="target-everyone" className="font-normal cursor-pointer">Everyone</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="target-customized"
                    checked={batchTargeting === 'customized'}
                    onCheckedChange={() => setBatchTargeting('customized')}
                  />
                  <Label htmlFor="target-customized" className="font-normal cursor-pointer">Customized</Label>
                </div>
              </div>

              {/* Customized Criteria */}
              {batchTargeting === 'customized' && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                  {/* Age Range */}
                  <div className="grid gap-2">
                    <Label className="text-sm">Age Range</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        placeholder="Min age" 
                        min="0" 
                        max="100"
                        value={minAge}
                        onChange={(e) => setMinAge(e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input 
                        type="number" 
                        placeholder="Max age" 
                        min="0" 
                        max="100"
                        value={maxAge}
                        onChange={(e) => setMaxAge(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Balance Range */}
                  <div className="grid gap-2">
                    <Label className="text-sm">Account Balance Range</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">S$</span>
                        <Input 
                          type="number" 
                          placeholder="Min balance" 
                          min="0"
                          value={minBalance}
                          onChange={(e) => setMinBalance(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <span className="text-muted-foreground">to</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">S$</span>
                        <Input 
                          type="number" 
                          placeholder="Max balance" 
                          min="0"
                          value={maxBalance}
                          onChange={(e) => setMaxBalance(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Education Status */}
                  <div className="grid gap-2">
                    <Label className="text-sm">Education Status</Label>
                    <div className="space-y-2">
                      {['primary', 'secondary', 'post_secondary', 'tertiary', 'postgraduate'].map(level => {
                        const labels: Record<string, string> = {
                          primary: 'Primary',
                          secondary: 'Secondary',
                          post_secondary: 'Post-Secondary',
                          tertiary: 'Tertiary',
                          postgraduate: 'Postgraduate',
                        };
                        return (
                          <div key={level} className="flex items-center gap-2">
                            <Checkbox
                              id={`edu-${level}`}
                              checked={selectedEducationStatus.includes(level)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEducationStatus([...selectedEducationStatus, level]);
                                } else {
                                  setSelectedEducationStatus(selectedEducationStatus.filter(s => s !== level));
                                }
                              }}
                            />
                            <Label htmlFor={`edu-${level}`} className="text-sm font-normal cursor-pointer">{labels[level]}</Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Residential Status */}
                  <div className="grid gap-2">
                    <Label className="text-sm">Residential Status</Label>
                    <div className="space-y-2">
                      {['sc', 'spr'].map(status => {
                        const labels: Record<string, string> = {
                          sc: 'Singapore Citizen',
                          spr: 'Singapore Permanent Resident',
                        };
                        return (
                          <div key={status} className="flex items-center gap-2">
                            <Checkbox
                              id={`res-${status}`}
                              checked={selectedResidentialStatus.includes(status)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedResidentialStatus([...selectedResidentialStatus, status]);
                                } else {
                                  setSelectedResidentialStatus(selectedResidentialStatus.filter(s => s !== status));
                                }
                              }}
                            />
                            <Label htmlFor={`res-${status}`} className="text-sm font-normal cursor-pointer">{labels[status]}</Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Schooling Status */}
                  <div className="grid gap-2">
                    <Label className="text-sm">Schooling Status</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="school-all"
                          checked={schoolingStatus === 'all'}
                          onCheckedChange={() => setSchoolingStatus('all')}
                        />
                        <Label htmlFor="school-all" className="text-sm font-normal cursor-pointer">All</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="school-in"
                          checked={schoolingStatus === 'in_school'}
                          onCheckedChange={() => setSchoolingStatus('in_school')}
                        />
                        <Label htmlFor="school-in" className="text-sm font-normal cursor-pointer">In School (has active enrollment)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="school-not"
                          checked={schoolingStatus === 'not_in_school'}
                          onCheckedChange={() => setSchoolingStatus('not_in_school')}
                        />
                        <Label htmlFor="school-not" className="text-sm font-normal cursor-pointer">Not In School</Label>
                      </div>
                    </div>
                  </div>

                  {/* Matching accounts info shown in preview */}
                </div>
              )}


            </div>

            {/* Execution Settings */}
            <div className="border-t pt-4">
              <Label className="text-base font-medium mb-3 block">Execution Settings</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="batch-execute-now"
                  checked={executeNow}
                  onCheckedChange={(checked) => setExecuteNow(checked === true)}
                />
                <Label htmlFor="batch-execute-now">Execute immediately</Label>
              </div>
            </div>
            {!executeNow && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Schedule Date <span className="text-destructive">*</span></Label>
                  <DateInput
                    value={scheduleDate}
                    onChange={setScheduleDate}
                    minDate={new Date()}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Schedule Time <span className="text-destructive">*</span></Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsTopUpDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="accent" 
              onClick={() => setShowBatchPreview(true)}
              disabled={!batchRuleName || !batchAmount || !batchDescription || (!executeNow && (!scheduleDate || !scheduleTime))}
            >
              Preview & Continue
            </Button>
          </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Individual Top-up Preview Dialog */}
      <Dialog open={showIndividualPreview} onOpenChange={setShowIndividualPreview}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Individual Top-up</DialogTitle>
            <DialogDescription>
              Please review the details before submitting
            </DialogDescription>
          </DialogHeader>
          {selectedAccount && accountHolders.find(a => a.id === selectedAccount) && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Account</p>
                  <p className="font-medium">{accountHolders.find(a => a.id === selectedAccount)?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">NRIC</p>
                  <p className="font-medium">{accountHolders.find(a => a.id === selectedAccount)?.nric}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className="font-medium">S${formatCurrency(Number(accountHolders.find(a => a.id === selectedAccount)?.balance), 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Top-up Amount</p>
                  <p className="font-semibold text-success">S${formatCurrency(parseFloat(topUpAmount) || 0, 0)}</p>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">New Balance</p>
                <p className="text-lg font-semibold text-success">
                  S${formatCurrency(Number(accountHolders.find(a => a.id === selectedAccount)?.balance) + (parseFloat(topUpAmount) || 0), 0)}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                  {executeNow ? 'This top-up will be executed immediately.' : 'This top-up will be scheduled for execution.'}
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowIndividualPreview(false)}>
              Back
            </Button>
            <Button 
              variant="accent" 
              onClick={async () => {
                await handleIndividualTopUp();
                setShowIndividualPreview(false);
              }}
              disabled={createScheduleMutation.isPending}
            >
              {createScheduleMutation.isPending ? 'Processing...' : 'Confirm & Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Top-up Preview Dialog */}
      <Dialog open={showBatchPreview} onOpenChange={setShowBatchPreview}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Batch Top-up</DialogTitle>
            <DialogDescription>
              Please review the details before submitting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Rule Name</p>
                <p className="font-medium">{batchRuleName || 'Manual Batch Top-up'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount per Account</p>
                <p className="font-semibold text-success">S${formatCurrency(parseFloat(batchAmount) || 0, 0)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="font-medium">{batchDescription}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Targeting</p>
                <p className="font-medium capitalize">{batchTargeting}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Targeted Accounts</p>
                <p className="font-medium">{batchTargeting === 'everyone' ? 'All Active Accounts' : getTargetedAccounts().length}</p>
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Disbursement</p>
              <p className="text-lg font-semibold text-success">
                S${formatCurrency((parseFloat(batchAmount) || 0) * getTargetedAccounts().length, 0)}
              </p>
            </div>

            {/* Scheduled Date/Time Info (when not executing immediately) */}
            {!executeNow && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Schedule Date</p>
                    <p className="font-medium">{scheduleDate ? new Date(scheduleDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Schedule Time</p>
                    <p className="font-medium">{scheduleTime || '—'}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Matching Accounts Section (only for customized targeting) */}
            {batchTargeting === 'customized' && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Matching accounts: <span className="font-semibold text-foreground">{getTargetedAccounts().length}</span>
                  </p>
                  {getTargetedAccounts().length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMatchingAccounts(true)}
                    >
                      View List
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Everyone Targeting Info */}
            {batchTargeting === 'everyone' && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  All active accounts will be targeted: <span className="font-semibold text-foreground">{accountHolders.filter(a => a.status === 'active').length}</span>
                </p>
              </div>
            )}
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                {executeNow ? 'This batch top-up will be executed immediately for all matching accounts.' : 'This batch top-up will be scheduled for execution.'}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowBatchPreview(false)}>
              Back
            </Button>
            <Button 
              variant="accent" 
              onClick={async () => {
                await handleBatchTopUp();
                setShowBatchPreview(false);
              }}
              disabled={createScheduleMutation.isPending}
            >
              {createScheduleMutation.isPending ? 'Processing...' : 'Confirm & Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Matching Accounts Modal */}
      <Dialog open={showMatchingAccounts} onOpenChange={setShowMatchingAccounts}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Matching Accounts</DialogTitle>
            <DialogDescription>
              {getTargetedAccounts().length} account(s) match your criteria
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {getTargetedAccounts().length > 0 ? (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {getTargetedAccounts().map((account, index) => (
                  <div key={account.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{index + 1}. {account.name}</p>
                        <p className="text-sm text-muted-foreground">NRIC: {account.nric}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Balance: S${formatCurrency(Number(account.balance), 0)} | Status: {account.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No accounts match your criteria</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowMatchingAccounts(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteScheduleConfirmOpen} onOpenChange={setDeleteScheduleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Top-Up</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this scheduled top-up? This action cannot be undone.
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="font-medium text-foreground">{scheduleToDelete?.name}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setScheduleToDelete(null)}>Keep It</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSchedule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? 'Cancelling...' : 'Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedScheduleDetail?.type === 'batch' ? 'Batch Top-up Details' : 'Individual Top-up Details'}
            </DialogTitle>
            <DialogDescription>
              Complete information about this scheduled top-up
            </DialogDescription>
          </DialogHeader>
          {selectedScheduleDetail && (
            <div className="space-y-4 py-4">
              {/* Type and Basic Info */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{selectedScheduleDetail.type}</p>
                </div>
                {selectedScheduleDetail.type === 'individual' ? (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Account Name</p>
                      <p className="font-medium">{selectedScheduleDetail.account_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Account ID</p>
                      <p className="font-mono text-sm">{selectedScheduleDetail.account_id}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Rule Name</p>
                      <p className="font-medium">{selectedScheduleDetail.rule_name || 'Manual Batch Top-up'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Eligible Accounts</p>
                      <p className="font-medium">{selectedScheduleDetail.eligible_count}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Amount and Status */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Amount per Account</p>
                  <p className="font-semibold text-success text-lg">S${formatCurrency(Number(selectedScheduleDetail.amount), 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={selectedScheduleDetail.status} />
                  </div>
                </div>
              </div>

              {/* Schedule Information */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled Date</p>
                  <p className="font-medium">
                    {new Date(selectedScheduleDetail.scheduled_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled Time</p>
                  <p className="font-medium">{selectedScheduleDetail.scheduled_time || '—'}</p>
                </div>
              </div>

              {/* Execution Information */}
              {selectedScheduleDetail.executed_date && (
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-xs text-muted-foreground">Executed Date</p>
                  <p className="font-medium text-success">
                    {new Date(selectedScheduleDetail.executed_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}{' '}
                    {new Date(selectedScheduleDetail.executed_date).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {/* Total Disbursement for Batch */}
              {selectedScheduleDetail.type === 'batch' && (
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-xs text-muted-foreground">Total Disbursement</p>
                  <p className="font-semibold text-success text-lg">
                    S${formatCurrency(Number(selectedScheduleDetail.amount) * (selectedScheduleDetail.eligible_count || 0), 0)}
                  </p>
                </div>
              )}

              {/* Eligible Accounts List for Batch - Always show for batch orders */}
              {selectedScheduleDetail.type === 'batch' && (() => {
                const eligibleAccounts = selectedScheduleDetail.remarks 
                  ? getEligibleAccountsForBatch(selectedScheduleDetail.remarks)
                  : [];
                
                return (
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Eligible Accounts ({eligibleAccounts.length})</h3>
                      <p className="text-xs text-muted-foreground">All accounts matching the targeting criteria</p>
                    </div>
                    
                    {eligibleAccounts.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {eligibleAccounts.map((account, index) => {
                          const birthDate = new Date(account.date_of_birth);
                          const today = new Date();
                          const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                          const inSchool = isAccountInSchool(account.id);
                          
                          return (
                            <div key={account.id} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">#{index + 1}</span>
                                  <button
                                    className="font-medium text-primary hover:underline text-left"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNavigateToStudent(account.id);
                                    }}
                                  >
                                    {account.name}
                                  </button>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Balance</p>
                                  <p className="font-semibold text-sm">S${formatCurrency(Number(account.balance), 0)}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">NRIC</p>
                                  <p className="font-medium">{account.nric}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Age</p>
                                  <p className="font-medium">{age} years</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Education</p>
                                  <p className="font-medium capitalize">{account.education_level?.replace('_', ' ') || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Status</p>
                                  {inSchool ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-success/10 text-success border border-success/20">
                                      In School
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border">
                                      Not in School
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-lg bg-muted/20">
                        <p className="text-muted-foreground text-sm">No eligible accounts found for this batch order</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Remarks for Individual */}
              {selectedScheduleDetail.type === 'individual' && selectedScheduleDetail.remarks && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">Remarks</p>
                  <p className="text-sm text-blue-900 dark:text-blue-100">{selectedScheduleDetail.remarks}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-between items-center gap-3">
            {selectedScheduleDetail?.status === 'scheduled' && (
              <Button 
                variant="destructive" 
                onClick={() => setCancelScheduleConfirmOpen(true)}
              >
                Cancel Top-up Order
              </Button>
            )}
            <div className="flex-1"></div>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Schedule Confirmation Dialog */}
      <AlertDialog open={cancelScheduleConfirmOpen} onOpenChange={setCancelScheduleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Top-up Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this scheduled top-up order? This will prevent the top-up from being executed and the status will be changed to "Cancelled".
              {selectedScheduleDetail && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="font-medium text-foreground">
                    {selectedScheduleDetail.type === 'batch' 
                      ? selectedScheduleDetail.rule_name 
                      : selectedScheduleDetail.account_name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Amount: S${formatCurrency(Number(selectedScheduleDetail.amount), 0)}
                    {selectedScheduleDetail.type === 'batch' && (
                      <> • {selectedScheduleDetail.eligible_count} account(s)</>
                    )}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelScheduleConfirmOpen(false)}>
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSchedule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={updateScheduleMutation.isPending}
            >
              {updateScheduleMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Eligible Accounts Modal */}
      <Dialog open={showBatchEligibleAccounts} onOpenChange={setShowBatchEligibleAccounts}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Eligible Accounts Details</DialogTitle>
            <DialogDescription>
              {selectedScheduleDetail?.rule_name} - Complete list of accounts matching the targeting criteria
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedScheduleDetail && (() => {
              const eligibleAccounts = getEligibleAccountsForBatch(selectedScheduleDetail.remarks);
              return eligibleAccounts.length > 0 ? (
                <div className="space-y-3">
                  {/* Summary Card */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Accounts</p>
                      <p className="text-2xl font-bold text-primary">{eligibleAccounts.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Amount per Account</p>
                      <p className="text-2xl font-bold text-success">S${formatCurrency(Number(selectedScheduleDetail.amount), 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Disbursement</p>
                      <p className="text-2xl font-bold text-success">S${formatCurrency(Number(selectedScheduleDetail.amount) * eligibleAccounts.length, 0)}</p>
                    </div>
                  </div>

                  {/* Accounts List */}
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
                              <p className="font-semibold text-lg">S${formatCurrency(Number(account.balance), 0)}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Age</p>
                              <p className="text-sm font-medium">{age} years</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Education Level</p>
                              <p className="text-sm font-medium capitalize">{account.education_level?.replace('_', ' ') || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Residential Status</p>
                              <p className="text-sm font-medium capitalize">{account.residential_status?.replace('_', ' ')}</p>
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
                              <p className="text-sm font-semibold text-success">+S${formatCurrency(Number(selectedScheduleDetail.amount), 0)}</p>
                              <p className="text-xs text-muted-foreground">New Balance:</p>
                              <p className="text-sm font-semibold text-success">S${formatCurrency(Number(account.balance) + Number(selectedScheduleDetail.amount), 0)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No accounts match the targeting criteria</p>
                </div>
              );
            })()}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowBatchEligibleAccounts(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
