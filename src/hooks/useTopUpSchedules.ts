import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TopUpSchedule {
  id: string;
  type: 'batch' | 'individual';
  scheduled_date: string;
  scheduled_time: string | null;
  executed_date: string | null;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  amount: number;
  rule_id: string | null;
  rule_name: string | null;
  eligible_count: number | null;
  processed_count: number | null;
  account_id: string | null;
  account_name: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export function useTopUpSchedules() {
  return useQuery({
    queryKey: ['top_up_schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('top_up_schedules')
        .select('*')
        .order('scheduled_date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TopUpSchedule[];
    },
  });
}

export function useCreateTopUpSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<TopUpSchedule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('top_up_schedules')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top_up_schedules'] });
      toast.success('Top-up scheduled successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to schedule top-up', { description: error.message });
    },
  });
}

export function useUpdateTopUpSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TopUpSchedule> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('top_up_schedules')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top_up_schedules'] });
      toast.success('Schedule updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update schedule', { description: error.message });
    },
  });
}

export function useDeleteTopUpSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('top_up_schedules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top_up_schedules'] });
      toast.success('Schedule deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete schedule', { description: error.message });
    },
  });
}
