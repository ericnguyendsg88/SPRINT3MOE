import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Download, UserPlus, BookOpen, ArrowUpDown, ArrowUp, ArrowDown, X, Check, EyeOff, Eye, GraduationCap, School, Users, Wallet, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DateInput } from '@/components/ui/date-input';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { usePageBuilder, LayoutItem } from '@/components/editor/PageBuilder';
import { EditModeToggle } from '@/components/editor/EditModeToggle';
import { SortableContainer } from '@/components/editor/SortableContainer';
import { ResizableSection } from '@/components/editor/ResizableSection';
import { SectionAdder, CustomSection } from '@/components/editor/SectionAdder';
import { CustomSectionRenderer } from '@/components/editor/CustomSectionRenderer';

const SECTION_IDS = ['header', 'filters', 'accounts-table'];

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
  
  const [educationLevel, setEducationLevel] = useState<string>('');
  const [nricDataRetrieved, setNricDataRetrieved] = useState(false);
  

  // Page layout for drag-and-drop
  const {
    isEditMode,
    toggleEditMode,
    layout,
    updateLayout,
    updateSectionSize,
    addSection,
    removeSection,
    updateCustomSection,
    resetLayout,
    getOrderedItems,
    getSectionSize,
    isSaving,
    handleAddSection,
  } = usePageBuilder('account-management', SECTION_IDS);

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
    // Check manual status first, then fall back to age-based calculation
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
      // When showInactive is true: show ONLY inactive accounts (age > 30)
      // When showInactive is false: show ONLY active accounts (age <= 30)
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
    spr: 'PR',
    non_resident: 'Non-Resident',
  };

  const handleRowClick = (accountId: string) => {
    navigate(`/admin/accounts/${accountId}`);
  };

  // Get courses for a student
  const getStudentCourses = (accountId: string) => {
    const studentEnrollments = enrollments.filter(e => e.account_id === accountId && e.status === 'active');
    return studentEnrollments.map(e => {
      const course = courses.find(c => c.id === e.course_id);
      return course ? { ...course, enrollmentDate: e.enrollment_date } : null;
    }).filter(Boolean);
  };

  // Get outstanding fees for a student
  const getStudentOutstandingFees = (accountId: string) => {
    return courseCharges.filter(
      c => c.account_id === accountId && (c.status === 'outstanding' || c.status === 'overdue')
    );
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
    
    setEducationLevel('');
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
      // Redirect to the existing account's detail page
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
        education_level: (educationLevel || null) as any,
        continuing_learning: null,
        residential_status: (residentialStatus || 'sc') as any,
      });
      resetForm();
      setIsAddStudentOpen(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const renderSection = (item: LayoutItem) => {
    // Check if it's a custom section
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

    switch (item.id) {
      case 'header':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
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
                <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                  <DialogTrigger asChild>
                    <Button variant="accent">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Account
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
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
                                // Search for account with matching NRIC in the full accountHolders list
                                const existingAccount = accountHolders.find(
                                  account => account.nric.toLowerCase() === nric.trim().toLowerCase()
                                );
                                
                                if (existingAccount) {
                                  // Auto-fill all fields with retrieved data
                                  setFullName(existingAccount.name);
                                  setDateOfBirth(existingAccount.date_of_birth);
                                  setEmail(existingAccount.email);
                                  setPhone(existingAccount.phone || '');
                                  setResidentialAddress(existingAccount.residential_address || '');
                                  setMailingAddress(existingAccount.mailing_address || '');
                                  setEducationLevel(existingAccount.education_level || '');
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
                      <Label htmlFor="educationLevel">Education Level</Label>
                      <Select value={educationLevel} onValueChange={setEducationLevel} disabled={!nricDataRetrieved}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary</SelectItem>
                          <SelectItem value="secondary">Secondary</SelectItem>
                          <SelectItem value="post_secondary">Post-Secondary</SelectItem>
                          <SelectItem value="tertiary">Tertiary</SelectItem>
                          <SelectItem value="postgraduate">Postgraduate</SelectItem>
                        </SelectContent>
                      </Select>
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
                        value={residentialStatus === 'sc' ? 'Singapore Citizen' : residentialStatus === 'spr' ? 'Permanent Resident' : residentialStatus === 'non_resident' ? 'Non-Resident' : ''}
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
            </div>
          </ResizableSection>
        );

      case 'filters':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <Card>
              <CardContent className="pt-4 space-y-4">
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or NRIC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* All filters row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4" />
                      Education Level
                    </Label>
                    <Select 
                      value={educationFilter.length === 0 ? 'all' : 'custom'}
                      onValueChange={(value) => {
                        if (value === 'all') setEducationFilter([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {educationFilter.length === 0 
                            ? 'All Levels' 
                            : educationFilter.length === 1
                              ? educationLevelLabels[educationFilter[0]]
                              : `${educationFilter.length} selected`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <div 
                          className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setEducationFilter([])}
                        >
                          <Checkbox 
                            checked={educationFilter.length === 0}
                            className="pointer-events-none"
                          />
                          All Levels
                        </div>
                        {Object.entries(educationLevelLabels).map(([value, label]) => (
                          <div
                            key={value}
                            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleEducationFilter(value); }}
                          >
                            <Checkbox 
                              checked={educationFilter.includes(value)}
                              className="pointer-events-none"
                            />
                            {label}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <School className="h-4 w-4" />
                      Schooling Status
                    </Label>
                    <Select 
                      value={schoolingStatusFilter.length === 0 ? 'all' : 'custom'}
                      onValueChange={(value) => {
                        if (value === 'all') setSchoolingStatusFilter([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {schoolingStatusFilter.length === 0 
                            ? 'All Students' 
                            : schoolingStatusFilter.length === 1
                              ? schoolingStatusLabels[schoolingStatusFilter[0]]
                              : `${schoolingStatusFilter.length} selected`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <div 
                          className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setSchoolingStatusFilter([])}
                        >
                          <Checkbox 
                            checked={schoolingStatusFilter.length === 0}
                            className="pointer-events-none"
                          />
                          All Students
                        </div>
                        {Object.entries(schoolingStatusLabels).map(([value, label]) => (
                          <div
                            key={value}
                            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSchoolingStatusFilter(value); }}
                          >
                            <Checkbox 
                              checked={schoolingStatusFilter.includes(value)}
                              className="pointer-events-none"
                            />
                            {label}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      Residential Status
                    </Label>
                    <Select 
                      value={residentialStatusFilter.length === 0 ? 'all' : 'custom'}
                      onValueChange={(value) => {
                        if (value === 'all') {
                          setResidentialStatusFilter([]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {residentialStatusFilter.length === 0 
                            ? 'All Statuses' 
                            : residentialStatusFilter.length === 1
                              ? residentialStatusLabels[residentialStatusFilter[0]]
                              : `${residentialStatusFilter.length} selected`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <div 
                          className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setResidentialStatusFilter([])}
                        >
                          <Checkbox 
                            checked={residentialStatusFilter.length === 0}
                            className="pointer-events-none"
                          />
                          All Statuses
                        </div>
                        {Object.entries(residentialStatusLabels).map(([value, label]) => (
                          <div
                            key={value}
                            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleResidentialStatus(value);
                            }}
                          >
                            <Checkbox 
                              checked={residentialStatusFilter.includes(value)}
                              className="pointer-events-none"
                            />
                            {label}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Wallet className="h-4 w-4" />
                      Balance Range ($)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={balanceMin}
                        onChange={(e) => setBalanceMin(e.target.value)}
                        className="w-full"
                      />
                      <span className="flex items-center text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={balanceMax}
                        onChange={(e) => setBalanceMax(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Age Range
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={ageMin}
                        onChange={(e) => setAgeMin(e.target.value)}
                        className="w-full"
                      />
                      <span className="flex items-center text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={ageMax}
                        onChange={(e) => setAgeMax(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Active filters and actions row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {hasActiveFilters && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          Showing {filteredAndSortedAccounts.length} of {accountHolders.length} accounts
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearAllFilters}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear Filters
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </ResizableSection>
        );

      case 'accounts-table':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Name
                        {renderSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead>NRIC</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('age')}
                    >
                      <div className="flex items-center">
                        Age
                        {renderSortIcon('age')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('balance')}
                    >
                      <div className="flex items-center">
                        Balance
                        {renderSortIcon('balance')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('education_level')}
                    >
                      <div className="flex items-center">
                        Education
                        {renderSortIcon('education_level')}
                      </div>
                    </TableHead>
                    <TableHead>Residential Status</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Created
                        {renderSortIcon('created_at')}
                      </div>
                    </TableHead>
                    <TableHead>Courses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No accounts found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedAccounts.map((account) => {
                      const studentCourses = getStudentCourses(account.id);
                      const age = calculateAge(account.date_of_birth);
                      const schoolingStatus = getSchoolingStatus(account.id);
                      const paymentStatus = getPaymentStatusForAccount(account.id);

                      return (
                        <TableRow 
                          key={account.id} 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleRowClick(account.id)}
                        >
                          <TableCell>
                            <p className="font-medium text-foreground">{account.name}</p>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{account.nric}</TableCell>
                          <TableCell className="text-foreground">{age}</TableCell>
<<<<<<< HEAD
                          <TableCell className="font-semibold text-foreground">${Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</TableCell>
=======
                          <TableCell className="font-semibold text-foreground">${formatCurrency(Number(account.balance))}</TableCell>
>>>>>>> 785df4ae9f8bc1b93cd135d2c9890aa90cda1592
                          <TableCell className="text-muted-foreground">
                            {account.education_level ? educationLevelLabels[account.education_level] || account.education_level : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {residentialStatusLabels[account.residential_status] || account.residential_status}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div>
                              <div>{formatDate(account.created_at)}</div>
                              <div className="text-xs text-muted-foreground/70 mt-0.5">{formatTime(account.created_at)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground">{studentCourses.length}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </ResizableSection>
        );

      default:
        return null;
    }
  };

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading accounts...</div>
      </div>
    );
  }

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
