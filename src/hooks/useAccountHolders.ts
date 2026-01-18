import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AccountHolder {
  id: string;
  nric: string;
  name: string;
  date_of_birth: string;
  email: string;
  phone: string | null;
  residential_address: string | null;
  mailing_address: string | null;
  balance: number;
  status: 'active' | 'inactive' | 'closed' | 'pending';
  in_school: 'in_school' | 'not_in_school';
  education_level: 'primary' | 'secondary' | 'post_secondary' | 'tertiary' | 'postgraduate' | null;
  continuing_learning: 'active' | 'inactive' | 'completed' | null;
  residential_status: 'sc' | 'pr' | 'non_resident';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export function useAccountHolders() {
  return useQuery({
    queryKey: ['account_holders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_holders')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as AccountHolder[];
    },
  });
}

export function useAccountHolder(id: string) {
  return useQuery({
    queryKey: ['account_holders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_holders')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as AccountHolder | null;
    },
    enabled: !!id,
  });
}

export function useCreateAccountHolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<AccountHolder, 'id' | 'created_at' | 'updated_at' | 'closed_at'>) => {
      const { data: result, error } = await supabase
        .from('account_holders')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account_holders'] });
      toast.success('Student account created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create account', { description: error.message });
    },
  });
}

export function useUpdateAccountHolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AccountHolder> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('account_holders')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account_holders'] });
      toast.success('Account updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update account', { description: error.message });
    },
  });
}

export function useDeleteAccountHolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('account_holders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account_holders'] });
      toast.success('Account deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete account', { description: error.message });
    },
  });
}
