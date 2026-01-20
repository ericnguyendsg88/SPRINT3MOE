import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, User, Trash2, ChevronDown, ChevronLeft, ChevronRight, X, ArrowUpDown, ArrowUp, ArrowDown, CalendarClock, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useTopUpSchedules, useCreateTopUpSchedule, useDeleteTopUpSchedule, useUpdateTopUpSchedule } from '@/hooks/useTopUpSchedules';
import { useAccountHolders, useUpdateAccountHolder } from '@/hooks/useAccountHolders';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/utils';
import { isEducationAccount } from '@/lib/accountTypeUtils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TopUpManagement() {
  const navigate = useNavigate();
  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
  const [topUpMode, setTopUpMode] = useState<'individual' | 'batch'>('individual');
  const [individualStep, setIndividualStep] = useState<1 | 2 | 3>(1); // 1: Select Account, 2: Details, 3: Preview
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]); // Changed to array for multiple selection
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpDescription, setTopUpDescription] = useState('');
  const [topUpInternalRemark, setTopUpInternalRemark] = useState(''); // Internal remark for individual
  const [batchAmount, setBatchAmount] = useState('');
  const [batchRuleName, setBatchRuleName] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [batchInternalRemark, setBatchInternalRemark] = useState(''); // Internal remark for batch
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [executeNow, setExecuteNow] = useState(true);
  const [accountSearch, setAccountSearch] = useState('');
  
  // Cutoff timestamp for "New" badge - set to deployment time (January 16, 2026)
  const NEW_BADGE_CUTOFF = new Date('2026-01-16T00:00:00').getTime();
  
  // Batch targeting options
  const [batchTargeting, setBatchTargeting] = useState<'everyone' | 'customized'>('everyone');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');
  const [selectedEducationStatus, setSelectedEducationStatus] = useState<string[]>([]);
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
  const [eligibleAccountsSearch, setEligibleAccountsSearch] = useState('');

  // Filter and sort state
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'this-month' | 'last-month' | 'this-quarter' | 'half-year' | 'full-year' | 'next-year' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTypes, setFilterTypes] = useState<string[]>(['individual', 'batch']);
  const [filterStatuses, setFilterStatuses] = useState<string[]>(['scheduled', 'completed', 'cancelled']);
  const [sortColumn, setSortColumn] = useState<'type' | 'name' | 'amount' | 'status' | 'scheduledDate' | 'createdDate' | null>('scheduledDate'); // Default to scheduled date
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default to descending (most recent first)
  const [sortOption, setSortOption] = useState<'default' | 'recently-created'>('default'); // Sort by option
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    const startStr = start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const filteredAccountHolders = useMemo(() => {
    // Only Education Accounts can receive top-ups (Student Accounts don't have balance)
    const educationAccounts = accountHolders.filter(a => 
      a.status === 'active' && isEducationAccount(a.account_type, a.residential_status)
    );
    
    if (!accountSearch.trim()) return educationAccounts;
    const searchLower = accountSearch.toLowerCase().trim();
    return educationAccounts.filter(a => 
      a.name.toLowerCase().includes(searchLower) || 
      a.nric.toLowerCase().includes(searchLower)
    );
  }, [accountSearch, accountHolders]);

  // Check if account has at least 1 active enrollment
  const isAccountInSchool = (accountId: string): boolean => {
    return enrollments.some(e => e.account_id === accountId && e.status === 'active');
  };

  // Filter accounts based on batch targeting criteria
  const getTargetedAccounts = (): typeof accountHolders => {
    // Only Education Accounts can receive top-ups
    let targeted = accountHolders.filter(a => 
      a.status === 'active' && isEducationAccount(a.account_type, a.residential_status)
    );

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
      targeted = targeted.filter(account => {
        // If 'none' is selected, include accounts without education level
        if (selectedEducationStatus.includes('none') && !account.education_level) {
          return true;
        }
        // Otherwise, check if the account's education level is in the selected list
        return account.education_level && selectedEducationStatus.includes(account.education_level);
      });
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
      
      // Only Education Accounts can receive top-ups
      if (targetingType === 'everyone') {
        return accountHolders.filter(a => 
          a.status === 'active' && isEducationAccount(a.account_type, a.residential_status)
        );
      }
      
      // Apply customized criteria - start with Education Accounts only
      let targeted = accountHolders.filter(a => 
        a.status === 'active' && isEducationAccount(a.account_type, a.residential_status)
      );
      
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
        targeted = targeted.filter(account => {
          // If 'none' is selected, include accounts without education level
          if (criteria.educationStatus.includes('none') && !account.education_level) {
            return true;
          }
          // Otherwise, check if the account's education level is in the selected list
          return account.education_level && criteria.educationStatus.includes(account.education_level);
        });
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
    if (selectedAccounts.length === 0 || !topUpAmount || !topUpDescription) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!executeNow && (!scheduleDate || !scheduleTime)) {
      toast.error('Please select both schedule date and time');
      return;
    }

    const amount = parseFloat(topUpAmount);
    const isImmediate = executeNow;
    const totalAccounts = selectedAccounts.length;

    try {
      // Generate reference ID for this batch of individual top-ups
      const batchReferenceId = `TOPUP-${Date.now()}`;
      
      // Create schedule records and process for each selected account
      for (const accountId of selectedAccounts) {
        const account = accountHolders.find(a => a.id === accountId);
        if (!account) continue;

        // Create the schedule record with internal remark
        await createScheduleMutation.mutateAsync({
          type: 'individual',
          scheduled_date: isImmediate ? new Date().toISOString().split('T')[0] : scheduleDate,
          scheduled_time: isImmediate ? new Date().toTimeString().slice(0, 5) : scheduleTime,
          amount: amount,
          account_id: account.id,
          account_name: account.name,
          status: isImmediate ? 'completed' : 'scheduled',
          executed_date: isImmediate ? new Date().toISOString() : null,
          rule_id: null,
          rule_name: null,
          eligible_count: null,
          processed_count: null,
          remarks: topUpInternalRemark || null,
        });

        // If immediate, also update the account balance and create transaction record
        if (isImmediate) {
          await updateAccountMutation.mutateAsync({
            id: account.id,
            balance: Number(account.balance) + amount,
          });
          
          // Create transaction record with description and reference ID
          await createTransactionMutation.mutateAsync({
            account_id: account.id,
            type: 'top_up',
            amount: amount,
            description: topUpDescription,
            reference: batchReferenceId,
            status: 'completed',
          });
        }
      }
      
      if (isImmediate) {
        toast.success(`Top-up completed for ${totalAccounts} account${totalAccounts !== 1 ? 's' : ''}`, {
          description: `Reference ID: ${batchReferenceId}`,
        });
      } else {
        toast.success(`Top-up scheduled for ${totalAccounts} account${totalAccounts !== 1 ? 's' : ''}`);
      }

      // Switch to Recently Created sorting option
      setSortOption('recently-created');

      setIsTopUpDialogOpen(false);
      setSelectedAccounts([]);
      setTopUpAmount('');
      setTopUpDescription('');
      setTopUpInternalRemark('');
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
          internalRemark: batchInternalRemark || null,
          referenceId: batchReferenceId,
          targetingType: batchTargeting,
          criteria: batchTargeting === 'everyone' ? {} : {
            minAge: minAge ? parseInt(minAge) : null,
            maxAge: maxAge ? parseInt(maxAge) : null,
            minBalance: minBalance ? parseFloat(minBalance) : null,
            maxBalance: maxBalance ? parseFloat(maxBalance) : null,
            educationStatus: selectedEducationStatus,
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
            description: batchDescription,
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

      // Switch to Recently Created sorting option
      setSortOption('recently-created');

      // Reset form
      setIsTopUpDialogOpen(false);
      setBatchAmount('');
      setBatchRuleName('');
      setBatchDescription('');
      setBatchInternalRemark('');
      setScheduleDate('');
      setScheduleTime('09:00');
      setExecuteNow(true);
      setBatchTargeting('everyone');
      setMinAge('');
      setMaxAge('');
      setMinBalance('');
      setMaxBalance('');
      setSelectedEducationStatus([]);
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
      // Filter by scheduled date range
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

    // Apply sorting based on sortOption
    let effectiveSortColumn = sortColumn;
    let effectiveSortDirection = sortDirection;
    
    if (sortOption === 'recently-created') {
      effectiveSortColumn = 'createdDate';
      effectiveSortDirection = 'desc';
    }
    
    filtered.sort((a, b) => {
      let compareResult = 0;
      
      switch (effectiveSortColumn) {
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
        case 'createdDate':
          const createdA = new Date(a.created_at);
          const createdB = new Date(b.created_at);
          compareResult = createdA.getTime() - createdB.getTime();
          break;
        default:
          // Default sort by scheduled date descending
          const defaultDateA = new Date(a.scheduled_date);
          const defaultDateB = new Date(b.scheduled_date);
          compareResult = defaultDateA.getTime() - defaultDateB.getTime();
      }
      
      return effectiveSortDirection === 'asc' ? compareResult : -compareResult;
    });

    return filtered;
  }, [topUpSchedules, filterPeriod, customStartDate, customEndDate, accountHolders, searchTerm, filterTypes, filterStatuses, sortColumn, sortDirection, sortOption]);

  const handleSort = (column: 'type' | 'name' | 'amount' | 'status' | 'scheduledDate' | 'createdDate') => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with appropriate default direction
      setSortColumn(column);
      // For date columns, default to descending (most recent first)
      setSortDirection((column === 'scheduledDate' || column === 'createdDate') ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (column: 'type' | 'name' | 'amount' | 'status' | 'scheduledDate' | 'createdDate') => {
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
      // Update the status to 'cancelled' instead of deleting
      await updateScheduleMutation.mutateAsync({
        id: selectedScheduleDetail.id,
        status: 'cancelled' as const
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
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
          item.type === 'batch' 
            ? 'bg-primary/10 text-primary' 
            : 'bg-accent/10 text-accent'
        }`}>
          {item.type === 'batch' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
          {item.type === 'batch' ? 'Batch' : 'Individual'}
        </span>
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
      render: (item: typeof topUpSchedules[0]) => {
        const isRecent = new Date(item.created_at).getTime() >= NEW_BADGE_CUTOFF;
        return (
          <div>
            <div className="flex items-center gap-1.5">
              {item.type === 'individual' && item.account_id ? (
                <button
                  className="font-medium text-primary hover:underline text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigateToStudent(item.account_id!);
                  }}
                >
                  {item.account_name}
                </button>
              ) : (
                <span className="font-medium">{item.rule_name}</span>
              )}
              {isRecent && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                  NEW
                </span>
              )}
            </div>
            {item.type === 'individual' && item.account_id && (() => {
              const account = accountHolders.find(a => a.id === item.account_id);
              return account ? <p className="text-xs text-muted-foreground">{account.nric}</p> : null;
            })()}
          </div>
        );
      }
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
        <span className="font-semibold text-success">${formatCurrency(Number(item.amount))}</span>
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
          onClick={() => handleSort('scheduledDate')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Date & Time
          {getSortIcon('scheduledDate')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {new Date(item.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
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
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
          item.type === 'batch' 
            ? 'bg-primary/10 text-primary' 
            : 'bg-accent/10 text-accent'
        }`}>
          {item.type === 'batch' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
          {item.type === 'batch' ? 'Batch' : 'Individual'}
        </span>
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
      render: (item: typeof topUpSchedules[0]) => {
        const isRecent = new Date(item.created_at).getTime() >= NEW_BADGE_CUTOFF;
        return (
          <div>
            <div className="flex items-center gap-1.5">
              {item.type === 'individual' && item.account_id ? (
                <button
                  className="font-medium text-primary hover:underline text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigateToStudent(item.account_id!);
                  }}
                >
                  {item.account_name}
                </button>
              ) : (
                <span className="font-medium">{item.rule_name}</span>
              )}
              {isRecent && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                  NEW
                </span>
              )}
            </div>
            {item.type === 'individual' && item.account_id && (() => {
              const account = accountHolders.find(a => a.id === item.account_id);
              return account ? <p className="text-xs text-muted-foreground">{account.nric}</p> : null;
            })()}
          </div>
        );
      }
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
        <span className="font-semibold text-success">${formatCurrency(Number(item.amount))}</span>
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
      render: (item: typeof topUpSchedules[0]) => {
        const schedDate = new Date(item.scheduled_date);
        // Convert 24h time to 12h AM/PM format, ensuring HH:MM only (remove seconds if present)
        let timeStr = '—';
        if (item.scheduled_time) {
          const timeParts = item.scheduled_time.split(':');
          const hours = timeParts[0];
          const minutes = timeParts[1];
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          timeStr = `${hour12}:${minutes} ${ampm}`;
        }
        return (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {schedDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </span>
            <span className="text-xs text-muted-foreground">
              {timeStr}
            </span>
          </div>
        );
      }
    },
    { 
      key: 'createdDate', 
      header: (
        <button 
          onClick={() => handleSort('createdDate')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Created Date
          {getSortIcon('createdDate')}
        </button>
      ),
      render: (item: typeof topUpSchedules[0]) => {
        const createdDate = new Date(item.created_at);
        const hour = createdDate.getHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        const minutes = String(createdDate.getMinutes()).padStart(2, '0');
        return (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {createdDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </span>
            <span className="text-xs text-muted-foreground">
              {hour12}:{minutes} {ampm}
            </span>
          </div>
        );
      }
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

      {/* All Top-up Tracking */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Top-up Tracking</CardTitle>
            {(searchTerm !== '' || 
              filterTypes.length !== 2 || 
              filterStatuses.length !== 3 || 
              filterPeriod !== 'all' || 
              customStartDate !== '' || 
              customEndDate !== '') && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setSearchTerm('');
                  setFilterTypes(['individual', 'batch']);
                  setFilterStatuses(['scheduled', 'completed', 'cancelled']);
                  setFilterPeriod('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setCurrentPage(1);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear All Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Simplified Filter Controls */}
          <div className="space-y-3">
            {/* Top Row: Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9 h-9"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Type Filter */}
              <Select 
                value={filterTypes.length === 2 ? 'all' : filterTypes[0] || 'all'} 
                onValueChange={(value) => {
                  if (value === 'all') setFilterTypes(['individual', 'batch']);
                  else setFilterTypes([value]);
                }}
              >
                <SelectTrigger className="w-[130px] h-9">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="batch">Batch</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter - Multi-select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 min-w-[160px] justify-between">
                    <CalendarClock className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {filterStatuses.length === 3 
                        ? 'All Status' 
                        : filterStatuses.length === 0 
                        ? 'Status' 
                        : filterStatuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
                      }
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="status-scheduled"
                        checked={filterStatuses.includes('scheduled')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilterStatuses([...filterStatuses, 'scheduled']);
                          } else {
                            setFilterStatuses(filterStatuses.filter(s => s !== 'scheduled'));
                          }
                        }}
                      />
                      <label htmlFor="status-scheduled" className="text-sm cursor-pointer">
                        Scheduled
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="status-completed"
                        checked={filterStatuses.includes('completed')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilterStatuses([...filterStatuses, 'completed']);
                          } else {
                            setFilterStatuses(filterStatuses.filter(s => s !== 'completed'));
                          }
                        }}
                      />
                      <label htmlFor="status-completed" className="text-sm cursor-pointer">
                        Completed
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="status-cancelled"
                        checked={filterStatuses.includes('cancelled')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilterStatuses([...filterStatuses, 'cancelled']);
                          } else {
                            setFilterStatuses(filterStatuses.filter(s => s !== 'cancelled'));
                          }
                        }}
                      />
                      <label htmlFor="status-cancelled" className="text-sm cursor-pointer">
                        Cancelled
                      </label>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Period Filters - Simplified */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-1">Period:</span>
              <Button
                size="sm"
                variant={filterPeriod === 'all' ? 'default' : 'outline'}
                onClick={() => handleFilterPeriodChange('all')}
                className="h-7 text-xs"
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filterPeriod === 'this-month' ? 'default' : 'outline'}
                onClick={() => handleFilterPeriodChange('this-month')}
                className="h-7 text-xs"
              >
                This Month
              </Button>
              <Button
                size="sm"
                variant={filterPeriod === 'last-month' ? 'default' : 'outline'}
                onClick={() => handleFilterPeriodChange('last-month')}
                className="h-7 text-xs"
              >
                Last Month
              </Button>
              <Button
                size="sm"
                variant={filterPeriod === 'this-quarter' ? 'default' : 'outline'}
                onClick={() => handleFilterPeriodChange('this-quarter')}
                className="h-7 text-xs"
              >
                This Quarter
              </Button>
              <Button
                size="sm"
                variant={filterPeriod === 'full-year' ? 'default' : 'outline'}
                onClick={() => handleFilterPeriodChange('full-year')}
                className="h-7 text-xs"
              >
                This Year
              </Button>
              <Button
                size="sm"
                variant={filterPeriod === 'next-year' ? 'default' : 'outline'}
                onClick={() => handleFilterPeriodChange('next-year')}
                className="h-7 text-xs"
              >
                Next Year
              </Button>
              
              {/* Custom Date Range - Compact */}
              <div className="flex items-center gap-1.5 ml-auto">
                <DateInput
                  value={customStartDate}
                  onChange={(date) => {
                    setCustomStartDate(date);
                    setFilterPeriod('custom');
                  }}
                  className="w-[110px] h-7 text-xs"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <DateInput
                  value={customEndDate}
                  onChange={(date) => {
                    setCustomEndDate(date);
                    setFilterPeriod('custom');
                  }}
                  className="w-[110px] h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <DataTable 
            data={filteredTopUpSchedules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)} 
            columns={scheduleColumns}
            emptyMessage="No top-ups recorded yet"
            onRowClick={(schedule) => {
              setSelectedScheduleDetail(schedule);
              setShowDetailModal(true);
            }}
          />

          {/* Pagination Controls */}
          {filteredTopUpSchedules.length > 0 && (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(filteredTopUpSchedules.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTopUpSchedules.length / itemsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(filteredTopUpSchedules.length / itemsPerPage)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unified Top-up Dialog with Tabs */}
      <Dialog open={isTopUpDialogOpen} onOpenChange={(open) => {
        setIsTopUpDialogOpen(open);
        if (!open) {
          // Reset form when dialog closes
          setIndividualStep(1);
          setSelectedAccounts([]);
          setTopUpAmount('');
          setTopUpDescription('');
          setTopUpInternalRemark('');
          setAccountSearch('');
          setBatchAmount('');
          setBatchRuleName('');
          setBatchDescription('');
          setBatchInternalRemark('');
          setBatchTargeting('everyone');
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
          {/* Progress Bar */}
          <div className="mb-6 px-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-in-out"
                style={{ width: `${(individualStep / 3) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className={`text-xs ${individualStep >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Select Account
              </span>
              <span className={`text-xs ${individualStep >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Details
              </span>
              <span className={`text-xs ${individualStep >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Preview
              </span>
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
                    <div className="flex items-center justify-between">
                      <Label>Select Accounts ({selectedAccounts.length} selected)</Label>
                      {selectedAccounts.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedAccounts([])}
                          className="h-7 text-xs"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                    <div className="border rounded-lg p-2 space-y-2 max-h-[400px] overflow-y-auto">
                      {filteredAccountHolders.map(account => (
                        <div
                          key={account.id}
                          className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                            selectedAccounts.includes(account.id)
                              ? 'bg-primary/10 border-primary/20'
                              : 'border-transparent hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            id={`account-${account.id}`}
                            checked={selectedAccounts.includes(account.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAccounts([...selectedAccounts, account.id]);
                              } else {
                                setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                              }
                            }}
                          />
                          <label htmlFor={`account-${account.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium text-sm">{account.name}</div>
                            <div className="text-xs text-muted-foreground">{account.nric}</div>
                            <div className="text-xs text-muted-foreground">Balance: ${formatCurrency(Number(account.balance))}</div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setIsTopUpDialogOpen(false);
                  setIndividualStep(1);
                  setSelectedAccounts([]);
                  setAccountSearch('');
                }}>
                  Cancel
                </Button>
                <Button 
                  variant="accent" 
                  onClick={() => setIndividualStep(2)}
                  disabled={selectedAccounts.length === 0}
                >
                  Continue ({selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''})
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Details */}
          {individualStep === 2 && (
            <>
              <div className="grid gap-4 py-4 pr-2">
                <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                  <div className="text-sm font-semibold">Selected Accounts ({selectedAccounts.length})</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedAccounts.map(accountId => {
                      const account = accountHolders.find(a => a.id === accountId);
                      return account && (
                        <div key={account.id} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{account.name}</span>
                          <span className="text-muted-foreground">{account.nric}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Description (visible to recipients) <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g., Monthly allowance, Education support, etc."
                    value={topUpDescription}
                    onChange={(e) => setTopUpDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">This will be shown to students in their transaction history</p>
                </div>
                <div className="grid gap-2">
                  <Label>Internal Remark (optional)</Label>
                  <Input
                    placeholder="e.g., Government scheme batch Q1, Special case approval, etc."
                    value={topUpInternalRemark}
                    onChange={(e) => setTopUpInternalRemark(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">For internal tracking only - recipients will NOT see this</p>
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
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground">Recipients</span>
                      <span className="text-sm font-bold text-primary">{selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Selected Accounts:</div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {selectedAccounts.map(accountId => {
                          const account = accountHolders.find(a => a.id === accountId);
                          return account && (
                            <div key={account.id} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                              <div>
                                <div className="font-medium">{account.name}</div>
                                <div className="text-muted-foreground">{account.nric}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-muted-foreground">Current: S${formatCurrency(Number(account.balance))}</div>
                                <div className="font-medium text-success">New: S${formatCurrency(Number(account.balance) + parseFloat(topUpAmount))}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between items-start border-t pt-3">
                      <span className="text-sm font-medium text-muted-foreground">Description</span>
                      <span className="text-sm font-medium text-right max-w-[60%]">{topUpDescription}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground">Internal Remark</span>
                      <span className="text-sm font-medium text-right max-w-[60%] text-orange-600">{topUpInternalRemark || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground">Amount per Account</span>
                      <span className="text-sm font-bold text-success">+S${formatCurrency(parseFloat(topUpAmount))}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground">Total Disbursement</span>
                      <span className="text-lg font-bold text-primary">S${formatCurrency(parseFloat(topUpAmount) * selectedAccounts.length)}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground">Execution</span>
                      <span className="text-sm font-medium text-right">
                        {executeNow ? 'Immediate' : `Scheduled: ${scheduleDate} at ${scheduleTime}`}
                      </span>
                    </div>
                  </div>
                </div>
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
          {/* Progress Bar */}
          <div className="mb-6 px-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-in-out"
                style={{ width: showBatchPreview ? '100%' : '50%' }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className={`text-xs ${!showBatchPreview ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Setup
              </span>
              <span className={`text-xs ${showBatchPreview ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Preview
              </span>
            </div>
          </div>

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
              <Label>Description (visible to recipients) <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Monthly government scheme, Education fund support, etc."
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This will be shown to students in their transaction history
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Internal Remark (optional)</Label>
              <Input
                placeholder="e.g., Approved by Minister, Special budget allocation, etc."
                value={batchInternalRemark}
                onChange={(e) => setBatchInternalRemark(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                For internal tracking only - recipients will NOT see this
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
                  <Label htmlFor="target-everyone" className="font-normal cursor-pointer">All Education Accounts</Label>
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
                      {['primary', 'secondary', 'post_secondary', 'tertiary', 'postgraduate', 'none'].map(level => {
                        const labels: Record<string, string> = {
                          primary: 'Primary',
                          secondary: 'Secondary',
                          post_secondary: 'Post-Secondary',
                          tertiary: 'Tertiary',
                          postgraduate: 'Postgraduate',
                          none: 'None / Not Set',
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

                  {/* Eligible Accounts Counter */}
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Eligible Accounts: <span className={getTargetedAccounts().length === 0 ? "text-destructive" : "text-foreground"}>{getTargetedAccounts().length}</span>
                        </span>
                      </div>
                      {getTargetedAccounts().length === 0 && (
                        <div className="flex items-center gap-1.5 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">No eligible accounts, adjust criteria to continue</span>
                        </div>
                      )}
                    </div>
                  </div>
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
              onClick={() => {
                // Validate that there are eligible accounts for customized targeting
                if (batchTargeting === 'customized') {
                  const eligibleAccounts = getTargetedAccounts();
                  if (eligibleAccounts.length === 0) {
                    toast.error('No eligible accounts found', {
                      description: 'Please adjust your targeting criteria. No accounts currently match the selected filters.',
                    });
                    return;
                  }
                }
                setShowBatchPreview(true);
              }}
              disabled={
                !batchRuleName || 
                !batchAmount || 
                !batchDescription || 
                (!executeNow && (!scheduleDate || !scheduleTime)) ||
                (batchTargeting === 'customized' && getTargetedAccounts().length === 0)
              }
            >
              Preview & Continue
            </Button>
          </div>
            </TabsContent>
          </Tabs>
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
                <p className="font-semibold text-success">S${formatCurrency(parseFloat(batchAmount) || 0)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="font-medium">{batchDescription}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Internal Remark</p>
                <p className="font-medium text-orange-600">{batchInternalRemark || '—'}</p>
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
                S${formatCurrency((parseFloat(batchAmount) || 0) * getTargetedAccounts().length)}
              </p>
            </div>

            {/* Scheduled Date/Time Info (when not executing immediately) */}
            {!executeNow && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Schedule Date</p>
                    <p className="font-medium">{scheduleDate ? new Date(scheduleDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Schedule Time</p>
                    <p className="font-medium">{scheduleTime || '—'}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Eligible Accounts Section (only for customized targeting) */}
            {batchTargeting === 'customized' && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Eligible Accounts: <span className="font-semibold text-foreground">{getTargetedAccounts().length}</span>
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
                  All Education Accounts will be targeted: <span className="font-semibold text-foreground">{accountHolders.filter(a => a.status === 'active' && isEducationAccount(a.account_type, a.residential_status)).length}</span>
                </p>
              </div>
            )}
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                {executeNow ? 'This batch top-up will be executed immediately for all eligible accounts.' : 'This batch top-up will be scheduled for execution.'}
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

      {/* Eligible Accounts Modal */}
      <Dialog open={showMatchingAccounts} onOpenChange={setShowMatchingAccounts}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Eligible Accounts (Real-time)</DialogTitle>
            <DialogDescription>
              Complete list of accounts matching the targeting criteria in real-time. The system identifies {getTargetedAccounts().length} eligible account(s) based on top-up rules.
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
                          Balance: S${formatCurrency(Number(account.balance))} | Status: {account.status}
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
              {selectedScheduleDetail?.type === 'batch' 
                ? 'Complete information about this scheduled top-up. Eligible accounts are computed in real-time based on top-up rules and targeting criteria.'
                : 'Complete information about this scheduled top-up'}
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
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Eligible Accounts</p>
                        <p className="font-medium">{selectedScheduleDetail.eligible_count}</p>
                      </div>
                      {selectedScheduleDetail.eligible_count > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBatchEligibleAccounts(true)}
                        >
                          View List
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Description and Internal Remarks */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                {selectedScheduleDetail.type === 'batch' && (() => {
                  try {
                    const remarksData = JSON.parse(selectedScheduleDetail.remarks || '{}');
                    const description = remarksData.description;
                    const internalRemark = remarksData.internalRemark;
                    
                    return (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Description</p>
                          <p className="font-medium">{description || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Internal Remarks</p>
                          <p className="font-medium">{internalRemark || '—'}</p>
                        </div>
                      </>
                    );
                  } catch (e) {
                    return (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Description</p>
                          <p className="font-medium">—</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Internal Remarks</p>
                          <p className="font-medium">—</p>
                        </div>
                      </>
                    );
                  }
                })()}
                {selectedScheduleDetail.type === 'individual' && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="font-medium">—</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Internal Remarks</p>
                      <p className="font-medium">{selectedScheduleDetail.remarks || '—'}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Amount and Status */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Amount per Account</p>
                  <p className="font-semibold text-success text-lg">S${formatCurrency(Number(selectedScheduleDetail.amount))}</p>
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
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled Time</p>
                  <p className="font-medium">
                    {selectedScheduleDetail.scheduled_time ? (() => {
                      const timeParts = selectedScheduleDetail.scheduled_time.split(':');
                      const hours = parseInt(timeParts[0]);
                      const minutes = timeParts[1];
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      const hour12 = hours % 12 || 12;
                      return `${hour12}:${minutes} ${ampm}`;
                    })() : '—'}
                  </p>
                </div>
              </div>

              {/* Execution Information */}
              {selectedScheduleDetail.executed_date && (
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-xs text-muted-foreground">Executed Date</p>
                  <p className="font-medium text-success">
                    {new Date(selectedScheduleDetail.executed_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Executed Time</p>
                  <p className="font-medium text-success">
                    {(() => {
                      const execDate = new Date(selectedScheduleDetail.executed_date);
                      const hours = execDate.getHours();
                      const minutes = execDate.getMinutes();
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      const hour12 = hours % 12 || 12;
                      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                    })()}
                  </p>
                </div>
              )}

              {/* Total Disbursement for Batch */}
              {selectedScheduleDetail.type === 'batch' && (
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-xs text-muted-foreground">Total Disbursement</p>
                  <p className="font-semibold text-success text-lg">
                    S${formatCurrency(Number(selectedScheduleDetail.amount) * (selectedScheduleDetail.eligible_count || 0))}
                  </p>
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
                    Amount: S${formatCurrency(Number(selectedScheduleDetail.amount))}
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
            <DialogTitle>Eligible Accounts Details (Real-time)</DialogTitle>
            <DialogDescription>
              {selectedScheduleDetail?.rule_name} - Complete list of accounts matching the targeting criteria in real-time. The system identifies eligible accounts based on top-up rules.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedScheduleDetail && (() => {
              const allEligibleAccounts = getEligibleAccountsForBatch(selectedScheduleDetail.remarks);
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
                      <p className="text-2xl font-bold text-success">S${formatCurrency(Number(selectedScheduleDetail.amount))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Disbursement</p>
                      <p className="text-2xl font-bold text-success">S${formatCurrency(Number(selectedScheduleDetail.amount) * allEligibleAccounts.length)}</p>
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
                              <p className="text-sm font-semibold text-success">+S${formatCurrency(Number(selectedScheduleDetail.amount))}</p>
                              <p className="text-xs text-muted-foreground">New Balance:</p>
                              <p className="text-sm font-semibold text-success">S${formatCurrency(Number(account.balance) + Number(selectedScheduleDetail.amount))}</p>
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
    </div>
  );
}
