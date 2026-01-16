import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  account_id: string;
  type: 'top_up' | 'course_fee';
  amount: number;
  description: string | null;
  reference: string | null;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useTransactionsByAccount(accountId: string) {
  return useQuery({
    queryKey: ['transactions', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!accountId,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<Transaction, 'id' | 'created_at'>) => {
      const { data: result, error } = await supabase
        .from('transactions')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to record transaction', { description: error.message });
    },
  });
}
