import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Download, UserPlus, BookOpen, ArrowUpDown, ArrowUp, ArrowDown, X, Check, EyeOff, Eye, ChevronDown, GraduationCap, School, Home, Wallet, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DateInput } from '@/components/ui/date-input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { useAccountHolders, useCreateAccountHolder } from '@/hooks/useAccountHolders';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useCourses } from '@/hooks/useCourses';
import { useCourseCharges } from '@/hooks/useCourseCharges';
import { formatDate, formatTime } from '@/lib/dateUtils';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type SortField = 'name' | 'age' | 'balance' | 'created_at' | 'education_level';
type SortDirection = 'asc' | 'desc';

export default function AccountManagement() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [educationFilter, setEducationFilter] = useState<string[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string[]>([]);
  const [schoolingStatusFilter, setSchoolingStatusFilter] = useState<string[]>([]);
  const [balanceMin, setBalanceMin] = useState<string>('');
  const [balanceMax, setBalanceMax] = useState<string>('');
  const [ageMin, setAgeMin] = useState<string>('');
  const [ageMax, setAgeMax] = useState<string>('');
  const [residentialStatusFilter, setResidentialStatusFilter] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  
  // Form state for adding student
  const [nric, setNric] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
  const [residentialStatus, setResidentialStatus] = useState('');
  const [nricDataRetrieved, setNricDataRetrieved] = useState(false);

  // Fetch data from database
  const { data: accountHolders = [], isLoading: loadingAccounts } = useAccountHolders();
  const { data: enrollments = [] } = useEnrollments();
  const { data: courses = [] } = useCourses();
  const { data: courseCharges = [] } = useCourseCharges();
  const createAccountMutation = useCreateAccountHolder();

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: string) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Helper function to determine if account is active (inactive if age > 30 OR manually set)
  const isAccountActive = (account: any) => {
    if (account.status && account.status !== 'pending') {
      return account.status === 'active';
    }
    return calculateAge(account.date_of_birth) <= 30;
  };

  // Helper function to get payment status for an account
  const getPaymentStatusForAccount = (accountId: string) => {
    const studentCharges = courseCharges.filter(c => c.account_id === accountId);
    if (studentCharges.length === 0) return 'scheduled';
    const allClear = studentCharges.every(c => c.status === 'clear');
    if (allClear) return 'fully_paid';
    const hasOutstanding = studentCharges.some(c => c.status === 'outstanding' || c.status === 'partially_paid');
    if (hasOutstanding) return 'outstanding';
    return 'scheduled';
  };

  // Helper function to get schooling status (in school if enrolled in at least 1 active course)
  const getSchoolingStatus = (accountId: string) => {
    const activeEnrollments = enrollments.filter(e => e.account_id === accountId && e.status === 'active');
    return activeEnrollments.length > 0 ? 'in_school' : 'not_in_school';
  };

  // Get courses for a student
  const getStudentCourses = (accountId: string) => {
    const studentEnrollments = enrollments.filter(e => e.account_id === accountId && e.status === 'active');
    return studentEnrollments.map(e => {
      const course = courses.find(c => c.id === e.course_id);
      return course ? { ...course, enrollmentDate: e.enrollment_date } : null;
    }).filter(Boolean);
  };

  // Filter labels
  const educationLevelLabels: Record<string, string> = {
    primary: 'Primary',
    secondary: 'Secondary',
    post_secondary: 'Post-Secondary',
    tertiary: 'Tertiary',
    postgraduate: 'Postgraduate',
  };

  const paymentStatusLabels: Record<string, string> = {
    fully_paid: 'Fully Paid',
    outstanding: 'Outstanding',
    scheduled: 'Scheduled',
  };

  const schoolingStatusLabels: Record<string, string> = {
    in_school: 'In School',
    not_in_school: 'Not in School',
  };

  const residentialStatusLabels: Record<string, string> = {
    sc: 'Singapore Citizen',
    pr: 'PR',
    non_resident: 'Non-Resident',
  };

  // Filtered and sorted accounts
  const filteredAndSortedAccounts = useMemo(() => {
    let filtered = accountHolders.filter(account => {
      // Search filter (name, NRIC, email)
      const matchesSearch = 
        account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.nric.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Education level filter (multi-select)
      const matchesEducation = educationFilter.length === 0 || 
        (account.education_level && educationFilter.includes(account.education_level));
      
      // Payment status filter (multi-select)
      const paymentStatus = getPaymentStatusForAccount(account.id);
      const matchesPaymentStatus = paymentStatusFilter.length === 0 || paymentStatusFilter.includes(paymentStatus);
      
      // Schooling status filter (multi-select)
      const schoolingStatus = getSchoolingStatus(account.id);
      const matchesSchoolingStatus = schoolingStatusFilter.length === 0 || schoolingStatusFilter.includes(schoolingStatus);
      
      // Residential status filter (multi-select)
      const matchesResidentialStatus = residentialStatusFilter.length === 0 || 
        residentialStatusFilter.includes(account.residential_status);
      
      // Balance range filter
      const balance = Number(account.balance);
      const matchesBalanceMin = !balanceMin || balance >= parseFloat(balanceMin);
      const matchesBalanceMax = !balanceMax || balance <= parseFloat(balanceMax);
      
      // Age range filter
      const age = calculateAge(account.date_of_birth);
      const matchesAgeMin = !ageMin || age >= parseInt(ageMin);
      const matchesAgeMax = !ageMax || age <= parseInt(ageMax);

      // Active/Inactive status filter
      const isActive = isAccountActive(account);
      const matchesActiveStatus = showInactive ? !isActive : isActive;

      return matchesSearch && matchesEducation && 
             matchesPaymentStatus && matchesSchoolingStatus &&
             matchesResidentialStatus &&
             matchesBalanceMin && matchesBalanceMax &&
             matchesAgeMin && matchesAgeMax &&
             matchesActiveStatus;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'age':
          comparison = calculateAge(a.date_of_birth) - calculateAge(b.date_of_birth);
          break;
        case 'balance':
          comparison = Number(a.balance) - Number(b.balance);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'education_level':
          const levels = ['primary', 'secondary', 'post_secondary', 'tertiary', 'postgraduate'];
          const aIndex = a.education_level ? levels.indexOf(a.education_level) : -1;
          const bIndex = b.education_level ? levels.indexOf(b.education_level) : -1;
          comparison = aIndex - bIndex;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [accountHolders, searchQuery, educationFilter, paymentStatusFilter, 
      schoolingStatusFilter, residentialStatusFilter, balanceMin, balanceMax, ageMin, ageMax, 
      showInactive, sortField, sortDirection, courseCharges, enrollments]);

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1 text-primary" />
      : <ArrowDown className="h-4 w-4 ml-1 text-primary" />;
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setEducationFilter([]);
    setPaymentStatusFilter([]);
    setSchoolingStatusFilter([]);
    setResidentialStatusFilter([]);
    setBalanceMin('');
    setBalanceMax('');
    setAgeMin('');
    setAgeMax('');
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || educationFilter.length > 0 ||
    paymentStatusFilter.length > 0 || schoolingStatusFilter.length > 0 ||
    residentialStatusFilter.length > 0 ||
    balanceMin || balanceMax || ageMin || ageMax;

  // Toggle filter selection helpers
  const toggleEducationFilter = (value: string) => {
    setEducationFilter(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const togglePaymentStatusFilter = (value: string) => {
    setPaymentStatusFilter(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleSchoolingStatusFilter = (value: string) => {
    setSchoolingStatusFilter(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleResidentialStatus = (status: string) => {
    setResidentialStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleRowClick = (accountId: string) => {
    navigate(`/admin/accounts/${accountId}`);
  };

  const resetForm = () => {
    setNric('');
    setFullName('');
    setDateOfBirth('');
    setEmail('');
    setPhone('');
    setResidentialAddress('');
    setMailingAddress('');
    setResidentialStatus('');
    setNricDataRetrieved(false);
  };

  const handleCreateAccount = async () => {
    if (!nric.trim()) {
      toast.error('Please enter NRIC');
      return;
    }
    if (!nricDataRetrieved) {
      toast.error('Please verify NRIC first');
      return;
    }

    // Check if account already exists in the database
    const existingAccount = accountHolders.find(
      account => account.nric.toLowerCase() === nric.trim().toLowerCase()
    );

    if (existingAccount) {
      toast.info('This account already exists in the system. Redirecting to account details...');
      setIsAddStudentOpen(false);
      resetForm();
      navigate(`/admin/accounts/${existingAccount.id}`);
      return;
    }

    try {
      await createAccountMutation.mutateAsync({
        nric: nric.trim(),
        name: fullName.trim(),
        date_of_birth: dateOfBirth,
        email: email.trim(),
        phone: phone.trim() || null,
        residential_address: residentialAddress.trim() || null,
        mailing_address: mailingAddress.trim() || null,
        balance: 0,
        status: 'active',
        in_school: 'not_in_school',
        education_level: null,
        continuing_learning: null,
        residential_status: (residentialStatus || 'sc') as any,
      });
      resetForm();
      setIsAddStudentOpen(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  // Table columns for DataTable
  const accountColumns = [
    {
      key: 'name',
      header: (
        <button 
          onClick={() => handleSort('name')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Name
          {renderSortIcon('name')}
        </button>
      ),
      render: (account: typeof accountHolders[0]) => (
        <span className="font-medium text-foreground">{account.name}</span>
      ),
    },
    {
      key: 'nric',
      header: 'NRIC',
      render: (account: typeof accountHolders[0]) => (
        <span className="text-muted-foreground">{account.nric}</span>
      ),
    },
    {
      key: 'age',
      header: (
        <button 
          onClick={() => handleSort('age')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Age
          {renderSortIcon('age')}
        </button>
      ),
      render: (account: typeof accountHolders[0]) => (
        <span className="text-foreground">{calculateAge(account.date_of_birth)}</span>
      ),
    },
    {
      key: 'balance',
      header: (
        <button 
          onClick={() => handleSort('balance')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Balance
          {renderSortIcon('balance')}
        </button>
      ),
      render: (account: typeof accountHolders[0]) => (
        <span className="font-semibold text-foreground">
          ${Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'education_level',
      header: (
        <button 
          onClick={() => handleSort('education_level')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Education
          {renderSortIcon('education_level')}
        </button>
      ),
      render: (account: typeof accountHolders[0]) => (
        <span className="text-muted-foreground">
          {account.education_level ? educationLevelLabels[account.education_level] || account.education_level : '-'}
        </span>
      ),
    },
    {
      key: 'residential_status',
      header: 'Residential Status',
      render: (account: typeof accountHolders[0]) => (
        <span className="text-muted-foreground">
          {residentialStatusLabels[account.residential_status] || account.residential_status}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: (
        <button 
          onClick={() => handleSort('created_at')}
          className="flex items-center font-medium hover:text-foreground transition-colors"
        >
          Created
          {renderSortIcon('created_at')}
        </button>
      ),
      render: (account: typeof accountHolders[0]) => (
        <div>
          <div className="text-muted-foreground">{formatDate(account.created_at)}</div>
          <div className="text-xs text-muted-foreground/70 mt-0.5">{formatTime(account.created_at)}</div>
        </div>
      ),
    },
    {
      key: 'courses',
      header: 'Courses',
      render: (account: typeof accountHolders[0]) => {
        const studentCourses = getStudentCourses(account.id);
        return (
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{studentCourses.length}</span>
          </div>
        );
      },
    },
  ];

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading accounts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={showInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Showing Inactive
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Show Inactive
              </>
            )}
          </Button>
          <Button variant="accent" onClick={() => setIsAddStudentOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Account Tracking Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Account Tracking</CardTitle>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={clearAllFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear All Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Controls */}
          <div className="space-y-3">
            {/* Top Row: Search + Key Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, NRIC, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-9"
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

              {/* Education Level Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[180px] justify-between">
                    <GraduationCap className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {educationFilter.length === 0 ? 'Education' : `${educationFilter.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3" align="start">
                  <div className="space-y-2">
                    {Object.entries(educationLevelLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`education-${value}`}
                          checked={educationFilter.includes(value)}
                          onCheckedChange={() => toggleEducationFilter(value)}
                        />
                        <label htmlFor={`education-${value}`} className="text-sm cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Schooling Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[170px] justify-between">
                    <School className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {schoolingStatusFilter.length === 0 ? 'Schooling' : `${schoolingStatusFilter.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-3" align="start">
                  <div className="space-y-2">
                    {Object.entries(schoolingStatusLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`schooling-${value}`}
                          checked={schoolingStatusFilter.includes(value)}
                          onCheckedChange={() => toggleSchoolingStatusFilter(value)}
                        />
                        <label htmlFor={`schooling-${value}`} className="text-sm cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Residential Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[170px] justify-between">
                    <Home className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {residentialStatusFilter.length === 0 ? 'Residential' : `${residentialStatusFilter.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3" align="start">
                  <div className="space-y-2">
                    {Object.entries(residentialStatusLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`residential-${value}`}
                          checked={residentialStatusFilter.includes(value)}
                          onCheckedChange={() => toggleResidentialStatus(value)}
                        />
                        <label htmlFor={`residential-${value}`} className="text-sm cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Payment Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[160px] justify-between">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {paymentStatusFilter.length === 0 ? 'Payment' : `${paymentStatusFilter.length} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-3" align="start">
                  <div className="space-y-2">
                    {Object.entries(paymentStatusLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`payment-${value}`}
                          checked={paymentStatusFilter.includes(value)}
                          onCheckedChange={() => togglePaymentStatusFilter(value)}
                        />
                        <label htmlFor={`payment-${value}`} className="text-sm cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Second Row: Range Filters + Clear */}
            <div className="flex flex-wrap items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-1">Balance:</span>
              <Input
                type="number"
                placeholder="Min"
                value={balanceMin}
                onChange={(e) => setBalanceMin(e.target.value)}
                className="w-[80px] h-8 text-xs"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={balanceMax}
                onChange={(e) => setBalanceMax(e.target.value)}
                className="w-[80px] h-8 text-xs"
              />
              
              <Calendar className="h-4 w-4 text-muted-foreground ml-4" />
              <span className="text-sm text-muted-foreground mr-1">Age:</span>
              <Input
                type="number"
                placeholder="Min"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                className="w-[70px] h-8 text-xs"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                className="w-[70px] h-8 text-xs"
              />

              {/* Export Button */}
              <Button variant="outline" size="sm" className="h-8 text-xs ml-auto">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>

            {/* Results Count */}
            {hasActiveFilters && (
              <div className="text-sm text-muted-foreground">
                Showing {filteredAndSortedAccounts.length} of {accountHolders.length} accounts
              </div>
            )}
          </div>

          {/* Data Table */}
          <DataTable 
            data={filteredAndSortedAccounts} 
            columns={accountColumns}
            emptyMessage="No accounts found matching your criteria"
            onRowClick={(account) => handleRowClick(account.id)}
          />
        </CardContent>
      </Card>

      {/* Add Account Dialog */}
      <Dialog open={isAddStudentOpen} onOpenChange={(open) => {
        setIsAddStudentOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>
              Enter NRIC to retrieve student information from the national database. Fields will be enabled after NRIC verification.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nric">NRIC *</Label>
                <div className="flex gap-2">
                  <Input 
                    id="nric" 
                    placeholder="S1234567A" 
                    value={nric}
                    onChange={(e) => setNric(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (nric.trim()) {
                        const existingAccount = accountHolders.find(
                          account => account.nric.toLowerCase() === nric.trim().toLowerCase()
                        );
                        
                        if (existingAccount) {
                          setFullName(existingAccount.name);
                          setDateOfBirth(existingAccount.date_of_birth);
                          setEmail(existingAccount.email);
                          setPhone(existingAccount.phone || '');
                          setResidentialAddress(existingAccount.residential_address || '');
                          setMailingAddress(existingAccount.mailing_address || '');
                          setResidentialStatus(existingAccount.residential_status || 'sc');
                          setNricDataRetrieved(true);
                          toast.success('NRIC verified. Student data retrieved and auto-filled.');
                        } else {
                          toast.error('NRIC not found in database. Please check the NRIC or contact support.');
                        }
                      } else {
                        toast.error('Please enter a valid NRIC');
                      }
                    }}
                    disabled={!nric.trim() || nricDataRetrieved}
                  >
                    {nricDataRetrieved ? <Check className="h-4 w-4" /> : 'Verify'}
                  </Button>
                </div>
                {nricDataRetrieved && (
                  <p className="text-xs text-success">✓ NRIC verified</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="Auto-filled from NRIC verification" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={true}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <DateInput 
                  id="dob" 
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  disabled={true}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Auto-filled from NRIC verification" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!nricDataRetrieved}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                placeholder="Auto-filled from NRIC verification" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!nricDataRetrieved}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="residentialAddress">Registered Address</Label>
              <Input 
                id="residentialAddress" 
                placeholder="Auto-filled from NRIC verification" 
                value={residentialAddress}
                onChange={(e) => setResidentialAddress(e.target.value)}
                disabled={!nricDataRetrieved}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="residentialStatus">Residential Status</Label>
              <Input 
                id="residentialStatus" 
                placeholder="Auto-filled from NRIC verification" 
                value={residentialStatus === 'sc' ? 'Singapore Citizen' : residentialStatus === 'pr' ? 'Permanent Resident' : residentialStatus === 'non_resident' ? 'Non-Resident' : ''}
                disabled={true}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mailingAddress">Mailing Address</Label>
              <Input 
                id="mailingAddress" 
                placeholder="Auto-filled from NRIC verification" 
                value={mailingAddress}
                onChange={(e) => setMailingAddress(e.target.value)}
                disabled={!nricDataRetrieved}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { resetForm(); setIsAddStudentOpen(false); }}>
              Cancel
            </Button>
            <Button 
              variant="accent" 
              onClick={handleCreateAccount}
              disabled={createAccountMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
