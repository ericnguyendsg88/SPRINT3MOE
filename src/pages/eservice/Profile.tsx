import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Save, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAccountHolders, useUpdateAccountHolder } from '@/hooks/useAccountHolders';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from 'sonner';
import { formatDate } from '@/lib/dateUtils';
import { usePageBuilder, LayoutItem } from '@/components/editor/PageBuilder';
import { EditModeToggle } from '@/components/editor/EditModeToggle';
import { SortableContainer } from '@/components/editor/SortableContainer';
import { ResizableSection } from '@/components/editor/ResizableSection';
import { SectionAdder } from '@/components/editor/SectionAdder';
import { CustomSectionRenderer } from '@/components/editor/CustomSectionRenderer';

const SECTION_IDS = ['header', 'personal-info', 'contact-info'];

export default function Profile() {
  const { currentUserId } = useCurrentUser();
  const { data: accountHolders = [], isLoading } = useAccountHolders();
  const updateAccountMutation = useUpdateAccountHolder();

  // Use selected user from context
  const currentUser = accountHolders.find(u => u.id === currentUserId) || accountHolders[0];
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    residentialAddress: '',
    mailingAddress: ''
  });

  // Page layout for drag-and-drop
  const {
    isEditMode,
    toggleEditMode,
    updateLayout,
    updateSectionSize,
    removeSection,
    updateCustomSection,
    resetLayout,
    getOrderedItems,
    getSectionSize,
    isSaving,
    handleAddSection,
  } = usePageBuilder('eservice-profile', SECTION_IDS);

  // Update form data when currentUser loads
  useEffect(() => {
    if (currentUser) {
      setFormData({
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        residentialAddress: currentUser.residential_address || '',
        mailingAddress: currentUser.mailing_address || ''
      });
    }
  }, [currentUser]);

  if (isLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  const handleSave = async () => {
    await updateAccountMutation.mutateAsync({
      id: currentUser.id,
      email: formData.email,
      phone: formData.phone || null,
      residential_address: formData.residentialAddress || null,
      mailing_address: formData.mailingAddress || null
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      residentialAddress: currentUser.residential_address || '',
      mailingAddress: currentUser.mailing_address || ''
    });
    setIsEditing(false);
  };

  const dob = new Date(currentUser.date_of_birth);
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const educationLevelLabels: Record<string, string> = {
    primary: 'Primary',
    secondary: 'Secondary',
    post_secondary: 'Post-Secondary',
    tertiary: 'Tertiary',
    postgraduate: 'Postgraduate'
  };

  const residentialStatusLabels: Record<string, string> = {
    sc: 'SC (Singapore Citizen)',
    pr: 'PR (Permanent Resident)',
    non_resident: 'Non-Resident'
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
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
              <p className="text-muted-foreground mt-1">View and update your personal information</p>
            </div>
          </ResizableSection>
        );

      case 'personal-info':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <div className="rounded-xl border border-border bg-card p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Personal Information</h3>
                  <p className="text-sm text-muted-foreground">These details cannot be changed online</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</p>
                  <p className="font-medium text-foreground">{currentUser.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">NRIC</p>
                  <p className="font-medium text-foreground">{currentUser.nric}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Date of Birth</p>
                  <p className="font-medium text-foreground">
                    {formatDate(dob)} ({age} years old)
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Created</p>
                  <p className="font-medium text-foreground">
                    {formatDate(currentUser.created_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Schooling Status</p>
                  <p className="font-medium text-foreground">
                    {currentUser.in_school === 'in_school' ? 'In School' : 'Not In School'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Education Level</p>
                  <p className="font-medium text-foreground">
                    {currentUser.education_level ? educationLevelLabels[currentUser.education_level] || currentUser.education_level : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Residential Status</p>
                  <p className="font-medium text-foreground">
                    {residentialStatusLabels[currentUser.residential_status] || currentUser.residential_status}
                  </p>
                </div>
              </div>
            </div>
          </ResizableSection>
        );

      case 'contact-info':
        return (
          <ResizableSection
            key={item.id}
            id={item.id}
            size={getSectionSize(item.id)}
            onSizeChange={(size) => updateSectionSize(item.id, size)}
            isEditMode={isEditMode}
          >
            <div className="rounded-xl border border-border bg-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Mail className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Contact & Address Information</h3>
                    <p className="text-sm text-muted-foreground">
                      {isEditing ? 'Edit your contact and address details' : 'Your contact and address details'}
                    </p>
                  </div>
                </div>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
              
              <Separator />
              
              {isEditing ? (
                <div className="grid gap-6">
                  {/* Contact Fields */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                          id="email" 
                          type="email" 
                          value={formData.email} 
                          onChange={e => setFormData({...formData, email: e.target.value})} 
                          className="pl-9" 
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          value={formData.phone} 
                          onChange={e => setFormData({...formData, phone: e.target.value})} 
                          className="pl-9" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Address Fields */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="residential">Registered Address</Label>
                      <Textarea 
                        id="residential" 
                        value={formData.residentialAddress} 
                        onChange={e => setFormData({...formData, residentialAddress: e.target.value})} 
                        rows={2} 
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="mailing">Mailing Address</Label>
                      <Textarea 
                        id="mailing" 
                        value={formData.mailingAddress} 
                        onChange={e => setFormData({...formData, mailingAddress: e.target.value})} 
                        rows={2} 
                      />
                    </div>
                  </div>

                  {/* Save/Cancel Buttons */}
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button variant="accent" onClick={handleSave} disabled={updateAccountMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateAccountMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Email Address</p>
                    <p className="font-medium text-foreground">{formData.email || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone Number</p>
                    <p className="font-medium text-foreground">{formData.phone || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Registered Address</p>
                    <p className="font-medium text-foreground">{formData.residentialAddress || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Mailing Address</p>
                    <p className="font-medium text-foreground">{formData.mailingAddress || '—'}</p>
                  </div>
                </div>
              )}
            </div>
          </ResizableSection>
        );

      default:
        return null;
    }
  };

  const orderedItems = getOrderedItems();

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
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
