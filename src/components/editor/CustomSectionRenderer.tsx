import { useState } from 'react';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutItem, CustomField } from '@/hooks/usePageLayout';
import { ResizableSection, SectionSize } from './ResizableSection';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CustomSectionRendererProps {
  section: LayoutItem;
  isEditMode: boolean;
  onSizeChange: (size: SectionSize) => void;
  onRemove: () => void;
  onUpdateConfig: (config: Partial<LayoutItem['customConfig']>) => void;
}

export function CustomSectionRenderer({
  section,
  isEditMode,
  onSizeChange,
  onRemove,
  onUpdateConfig,
}: CustomSectionRendererProps) {
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const config = section.customConfig;
  if (!config) return null;

  const handleFieldEdit = (field: CustomField) => {
    setEditingFieldId(field.id);
    setEditValue(field.value);
  };

  const handleFieldSave = (fieldId: string) => {
    if (!config.fields) return;
    const updatedFields = config.fields.map(f => 
      f.id === fieldId ? { ...f, value: editValue } : f
    );
    onUpdateConfig({ fields: updatedFields });
    setEditingFieldId(null);
  };

  const formatValue = (field: CustomField) => {
    switch (field.type) {
      case 'currency':
        const amount = parseFloat(field.value || '0');
        // Smart decimals: remove .00 for whole numbers
        if (Number.isInteger(amount)) {
          return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        }
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'date':
        return field.value ? new Date(field.value).toLocaleDateString() : '—';
      default:
        return field.value || '—';
    }
  };

  const renderInfoCard = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{config.title}</CardTitle>
        {isEditMode && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Section?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the "{config.title}" section.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove} className="bg-destructive text-destructive-foreground">
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {config.fields?.map((field) => (
            <div key={field.id} className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {field.label}
              </p>
              {isEditMode && editingFieldId === field.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={() => handleFieldSave(field.id)}>
                    <Check className="h-4 w-4 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingFieldId(null)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <p 
                  className={`font-medium text-foreground ${isEditMode ? 'cursor-pointer hover:bg-primary/10 px-1 -mx-1 rounded' : ''}`}
                  onClick={() => isEditMode && handleFieldEdit(field)}
                >
                  {formatValue(field)}
                  {isEditMode && <Pencil className="inline ml-1 h-3 w-3 text-primary opacity-50" />}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderStatsCard = () => (
    <div className="grid gap-4 md:grid-cols-4">
      {config.fields?.map((field) => (
        <Card key={field.id}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-xl">📊</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{field.label}</p>
                {isEditMode && editingFieldId === field.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleFieldSave(field.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p 
                    className={`text-2xl font-bold ${isEditMode ? 'cursor-pointer' : ''}`}
                    onClick={() => isEditMode && handleFieldEdit(field)}
                  >
                    {formatValue(field)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {isEditMode && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Section?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the "{config.title}" section.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onRemove} className="bg-destructive text-destructive-foreground">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );

  const renderTableCard = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{config.title}</CardTitle>
        {isEditMode && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Section?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the "{config.title}" section.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove} className="bg-destructive text-destructive-foreground">
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Table configured with data source: {config.tableDataSource || 'Custom'}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <ResizableSection
      id={section.id}
      isEditMode={isEditMode}
      size={section.size || 'full'}
      onSizeChange={onSizeChange}
    >
      {config.type === 'info-card' && renderInfoCard()}
      {config.type === 'stats' && renderStatsCard()}
      {config.type === 'table' && renderTableCard()}
    </ResizableSection>
  );
}
