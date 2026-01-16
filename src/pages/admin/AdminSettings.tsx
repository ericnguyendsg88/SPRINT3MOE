import { useState } from 'react';
import { Building, Plus, Pencil, Ban, Calendar, UserX, Check } from 'lucide-react';
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
  const [billingDay, setBillingDay] = useState('5');
  
  // Auto Account Closure Configuration
  const [closureMonth, setClosureMonth] = useState('12'); // December
  const [closureDay, setClosureDay] = useState('31');

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
    toast.success('Billing date configuration saved successfully');
  };

  const handleSaveAccountClosureConfig = () => {
    if (closureType === 'specific_date' && !closureSpecificDate) {
      toast.error('Please select a specific date for account closure');
      return;
    }
    toast.success('Account closure configuration saved successfully');
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

        <div className="rounded-lg border border-border overflow-hidden">
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
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No course providers found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider, index) => (
                  <TableRow key={provider.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Billing Configuration */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <Calendar className="h-5 w-5 text-success" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Billing Configuration</h2>
            <p className="text-sm text-muted-foreground">Set site-wide billing date</p>
          </div>
        </div>

        <div className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="billingDay">Billing Date (Day of Month)</Label>
            <Select value={billingDay} onValueChange={setBillingDay}>
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
              This billing date will be applied site-wide for all fee calculations
            </p>
          </div>

          <Button onClick={handleSaveBillingDate} variant="accent" className="w-fit">
            Save Billing Configuration
          </Button>
        </div>
      </div>

      {/* Auto Account Closure Configuration */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <UserX className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Auto Account Closure</h2>
            <p className="text-sm text-muted-foreground">Configure automatic account closure period</p>
          </div>
        </div>

        <div className="grid gap-6 max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="closureMonth">Closure Month</Label>
              <Select value={closureMonth} onValueChange={setClosureMonth}>
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
              <Select value={closureDay} onValueChange={setClosureDay}>
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

          <Button onClick={handleSaveAccountClosureConfig} variant="accent" className="w-fit">
            Save Closure Configuration
          </Button>
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
    </div>
  );
}
