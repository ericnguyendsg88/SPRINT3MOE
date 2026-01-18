import { useState, useMemo } from 'react';
import { Building, Plus, Pencil, Ban, Calendar, UserX, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useProviders } from '@/contexts/ProvidersContext';
import type { CourseProvider } from '@/data/providers';

const EDUCATION_LEVEL_OPTIONS = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'post_secondary', label: 'Post-Secondary' },
  { value: 'tertiary', label: 'Tertiary' },
  { value: 'postgraduate', label: 'Post-Graduate' },
] as const;

export default function AdminSettings() {
  const { providers, addProvider, updateProvider, toggleProviderStatus } = useProviders();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderEducationLevels, setNewProviderEducationLevels] = useState<Array<'primary' | 'secondary' | 'post_secondary' | 'tertiary' | 'postgraduate'>>([]);
  const [editingProvider, setEditingProvider] = useState<CourseProvider | null>(null);
  const [toggleStatusProvider, setToggleStatusProvider] = useState<CourseProvider | null>(null);
  const [billingDay, setBillingDay] = useState(() => localStorage.getItem('defaultBillingDay') || '5');
  const [billingDueDaysAfter, setBillingDueDaysAfter] = useState(() => localStorage.getItem('defaultBillingDueDaysAfter') || '30');
  
  // Provider search and pagination
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Billing edit mode
  const [isBillingEditMode, setIsBillingEditMode] = useState(false);
  const [originalBillingDay, setOriginalBillingDay] = useState(() => localStorage.getItem('defaultBillingDay') || '5');
  const [originalBillingDueDaysAfter, setOriginalBillingDueDaysAfter] = useState(() => localStorage.getItem('defaultBillingDueDaysAfter') || '30');
  
  // Auto Account Closure Configuration
  const [closureMonth, setClosureMonth] = useState('12'); // December
  const [closureDay, setClosureDay] = useState('31');
  
  // Closure edit mode
  const [isClosureEditMode, setIsClosureEditMode] = useState(false);
  const [originalClosureMonth, setOriginalClosureMonth] = useState('12');
  const [originalClosureDay, setOriginalClosureDay] = useState('31');
  
  // Confirmation dialog
  const [isSettingsSavedDialogOpen, setIsSettingsSavedDialogOpen] = useState(false);
  const [savedSettingType, setSavedSettingType] = useState<'billing' | 'closure'>('billing');

  // Filter and paginate providers
  const filteredProviders = useMemo(() => {
    return providers.filter(provider =>
      provider.name.toLowerCase().includes(providerSearchQuery.toLowerCase())
    );
  }, [providers, providerSearchQuery]);

  const totalPages = Math.ceil(filteredProviders.length / itemsPerPage);
  const paginatedProviders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProviders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProviders, currentPage]);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setProviderSearchQuery(value);
    setCurrentPage(1);
  };

  const handleAddProvider = () => {
    if (!newProviderName.trim()) {
      toast.error('Please enter a provider name');
      return;
    }
    
    if (newProviderEducationLevels.length === 0) {
      toast.error('Please select at least one education level');
      return;
    }
    
    const newProvider: CourseProvider = {
      id: `provider-${Date.now()}`,
      name: newProviderName.trim(),
      isActive: true,
      educationLevels: newProviderEducationLevels,
    };
    
    addProvider(newProvider);
    setNewProviderName('');
    setNewProviderEducationLevels([]);
    setIsAddDialogOpen(false);
    toast.success('Course provider added successfully');
  };

  const handleEditProvider = () => {
    if (!editingProvider || !editingProvider.name.trim()) {
      toast.error('Please enter a provider name');
      return;
    }
    
    if (editingProvider.educationLevels.length === 0) {
      toast.error('Please select at least one education level');
      return;
    }
    
    updateProvider(editingProvider);
    setEditingProvider(null);
    setIsEditDialogOpen(false);
    toast.success('Course provider updated successfully');
  };

  const handleToggleProviderStatus = () => {
    if (!toggleStatusProvider) return;
    
    toggleProviderStatus(toggleStatusProvider.id);
    const action = toggleStatusProvider.isActive ? 'deactivated' : 'reactivated';
    setToggleStatusProvider(null);
    setIsToggleStatusDialogOpen(false);
    toast.success(`Course provider ${action} successfully`);
  };

  const openEditDialog = (provider: CourseProvider) => {
    setEditingProvider({ ...provider });
    setIsEditDialogOpen(true);
  };

  const openToggleStatusDialog = (provider: CourseProvider) => {
    setToggleStatusProvider(provider);
    setIsToggleStatusDialogOpen(true);
  };

  const handleSaveBillingDate = () => {
    localStorage.setItem('defaultBillingDay', billingDay);
    localStorage.setItem('defaultBillingDueDaysAfter', billingDueDaysAfter);
    setOriginalBillingDay(billingDay);
    setOriginalBillingDueDaysAfter(billingDueDaysAfter);
    setIsBillingEditMode(false);
    setSavedSettingType('billing');
    setIsSettingsSavedDialogOpen(true);
  };

  const handleCancelBillingEdit = () => {
    setBillingDay(originalBillingDay);
    setBillingDueDaysAfter(originalBillingDueDaysAfter);
    setIsBillingEditMode(false);
  };

  const handleSaveAccountClosureConfig = () => {
    setOriginalClosureMonth(closureMonth);
    setOriginalClosureDay(closureDay);
    setIsClosureEditMode(false);
    setSavedSettingType('closure');
    setIsSettingsSavedDialogOpen(true);
  };

  const handleCancelClosureEdit = () => {
    setClosureMonth(originalClosureMonth);
    setClosureDay(originalClosureDay);
    setIsClosureEditMode(false);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure course providers, billing settings, and account management
        </p>
      </div>

      {/* Course Providers */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Course Providers</h2>
              <p className="text-sm text-muted-foreground">Manage available course providers</p>
            </div>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" variant="accent">
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search providers by name..."
            value={providerSearchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-lg border border-border overflow-hidden min-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Provider Name</TableHead>
                <TableHead>Education Levels</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProviders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {providerSearchQuery ? 'No providers found matching your search.' : 'No course providers found. Add one to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedProviders.map((provider, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <TableRow key={provider.id}>
                        <TableCell className="text-muted-foreground">{globalIndex}</TableCell>
                        <TableCell className="font-medium text-foreground">{provider.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {provider.educationLevels.map((level) => {
                              const label = EDUCATION_LEVEL_OPTIONS.find(opt => opt.value === level)?.label || level;
                              return (
                                <span key={level} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            provider.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {provider.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(provider)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={provider.isActive ? "outline" : "default"}
                              size="sm"
                              onClick={() => openToggleStatusDialog(provider)}
                              className={provider.isActive ? 'text-destructive hover:bg-destructive/10 border-destructive/30' : 'bg-green-600 hover:bg-green-700 text-white'}
                            >
                              {provider.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Empty rows to maintain consistent table height */}
                  {Array.from({ length: itemsPerPage - paginatedProviders.length }).map((_, index) => (
                    <TableRow key={`empty-${index}`} className="hover:bg-transparent">
                      <TableCell colSpan={5} className="h-[53px]">&nbsp;</TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {filteredProviders.length > 0 && (
          <div className="flex items-center justify-between px-2">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProviders.length)} of {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Billing Configuration */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Calendar className="h-5 w-5 text-success" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Billing Configuration</h2>
              <p className="text-sm text-muted-foreground">Set site-wide billing date and due date</p>
            </div>
          </div>
          {!isBillingEditMode && (
            <Button variant="outline" size="sm" onClick={() => setIsBillingEditMode(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        <div className="grid gap-6 max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="billingDay">Billing Date (Day of Month)</Label>
              <Select value={billingDay} onValueChange={setBillingDay} disabled={!isBillingEditMode}>
                <SelectTrigger id="billingDay">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of the month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Date when bills are generated
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="billingDueDaysAfter">Payment Due</Label>
              <Select value={billingDueDaysAfter} onValueChange={setBillingDueDaysAfter} disabled={!isBillingEditMode}>
                <SelectTrigger id="billingDueDaysAfter">
                  <SelectValue placeholder="Select due date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">14 days after billing date</SelectItem>
                  <SelectItem value="30">30 days after billing date</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Days after billing date for payment deadline
              </p>
            </div>
          </div>

          {isBillingEditMode && (
            <div className="flex gap-3">
              <Button onClick={handleSaveBillingDate} variant="accent" className="w-fit">
                Save Billing Configuration
              </Button>
              <Button onClick={handleCancelBillingEdit} variant="outline" className="w-fit">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Auto Account Closure Configuration */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <UserX className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Auto Account Closure</h2>
              <p className="text-sm text-muted-foreground">Configure automatic account closure period</p>
            </div>
          </div>
          {!isClosureEditMode && (
            <Button variant="outline" size="sm" onClick={() => setIsClosureEditMode(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        <div className="grid gap-6 max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="closureMonth">Closure Month</Label>
              <Select value={closureMonth} onValueChange={setClosureMonth} disabled={!isClosureEditMode}>
                <SelectTrigger id="closureMonth">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="2">February</SelectItem>
                  <SelectItem value="3">March</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">May</SelectItem>
                  <SelectItem value="6">June</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="8">August</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="closureDay">Day of Month</Label>
              <Select value={closureDay} onValueChange={setClosureDay} disabled={!isClosureEditMode}>
                <SelectTrigger id="closureDay">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-3">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              <strong>How it works:</strong> On {closureDay}{closureDay === '1' ? 'st' : closureDay === '2' ? 'nd' : closureDay === '3' ? 'rd' : 'th'} {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][parseInt(closureMonth) - 1]} each year, the system will automatically close accounts for students who turn 30 years old that calendar year. Account closure is based on this set date, not on individual birthdays.
            </p>
          </div>

          {isClosureEditMode && (
            <div className="flex gap-3">
              <Button onClick={handleSaveAccountClosureConfig} variant="accent" className="w-fit">
                Save Closure Configuration
              </Button>
              <Button onClick={handleCancelClosureEdit} variant="outline" className="w-fit">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Provider Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          setNewProviderName('');
          setNewProviderEducationLevels([]);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Course Provider</DialogTitle>
            <DialogDescription>
              Enter the name and education levels for the new course provider
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="providerName">Provider Name <span className="text-destructive">*</span></Label>
              <Input
                id="providerName"
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
                placeholder="e.g., Singapore Institute of Technology"
              />
            </div>
            <div className="grid gap-2">
              <Label>Education Levels <span className="text-destructive">*</span></Label>
              <div className="space-y-2 p-3 border rounded-lg">
                {EDUCATION_LEVEL_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`add-${option.value}`}
                      checked={newProviderEducationLevels.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewProviderEducationLevels([...newProviderEducationLevels, option.value]);
                        } else {
                          setNewProviderEducationLevels(newProviderEducationLevels.filter(l => l !== option.value));
                        }
                      }}
                    />
                    <Label htmlFor={`add-${option.value}`} className="font-normal cursor-pointer">{option.label}</Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Select all education levels this provider offers courses for</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" onClick={handleAddProvider}>
              Add Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Course Provider</DialogTitle>
            <DialogDescription>
              Update the course provider name and education levels
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editProviderName">Provider Name <span className="text-destructive">*</span></Label>
              <Input
                id="editProviderName"
                value={editingProvider?.name || ''}
                onChange={(e) => setEditingProvider(editingProvider ? { ...editingProvider, name: e.target.value } : null)}
                placeholder="e.g., Singapore Institute of Technology"
              />
            </div>
            <div className="grid gap-2">
              <Label>Education Levels <span className="text-destructive">*</span></Label>
              <div className="space-y-2 p-3 border rounded-lg">
                {EDUCATION_LEVEL_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-${option.value}`}
                      checked={editingProvider?.educationLevels.includes(option.value) || false}
                      onCheckedChange={(checked) => {
                        if (!editingProvider) return;
                        if (checked) {
                          setEditingProvider({
                            ...editingProvider,
                            educationLevels: [...editingProvider.educationLevels, option.value]
                          });
                        } else {
                          setEditingProvider({
                            ...editingProvider,
                            educationLevels: editingProvider.educationLevels.filter(l => l !== option.value)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`edit-${option.value}`} className="font-normal cursor-pointer">{option.label}</Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Select all education levels this provider offers courses for</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" onClick={handleEditProvider}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Provider Status Dialog */}
      <Dialog open={isToggleStatusDialogOpen} onOpenChange={setIsToggleStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleStatusProvider?.isActive ? 'Deactivate' : 'Reactivate'} Course Provider
            </DialogTitle>
            <DialogDescription>
              {toggleStatusProvider?.isActive ? (
                <>
                  Are you sure you want to deactivate "{toggleStatusProvider?.name}"? 
                  This provider will no longer appear in dropdown selections, but existing course data will be preserved.
                </>
              ) : (
                <>
                  Are you sure you want to reactivate "{toggleStatusProvider?.name}"? 
                  This provider will be available for selection again.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsToggleStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={toggleStatusProvider?.isActive ? "destructive" : "default"}
              onClick={handleToggleProviderStatus}
              className={!toggleStatusProvider?.isActive ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
            >
              {toggleStatusProvider?.isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Saved Confirmation Dialog */}
      <Dialog open={isSettingsSavedDialogOpen} onOpenChange={setIsSettingsSavedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <Check className="h-6 w-6 text-success" />
              </div>
              <div>
                <DialogTitle>Settings Saved Successfully</DialogTitle>
                <DialogDescription className="mt-1">
                  {savedSettingType === 'billing' 
                    ? 'Your billing configuration has been updated.'
                    : 'Your account closure configuration has been updated.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> These new settings will apply to all future course creations and transactions. 
              Existing courses and their billing schedules will remain unchanged.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSettingsSavedDialogOpen(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
