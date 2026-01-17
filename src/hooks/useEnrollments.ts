import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSyncEducationLevel } from './useEducationLevelSync';

export interface Enrollment {
  id: string;
  account_id: string;
  course_id: string;
  enrollment_date: string;
  status: 'active' | 'completed' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

export interface EnrollmentWithCourse extends Enrollment {
  courses: {
    id: string;
    name: string;
    provider: string;
    fee: number;
    billing_cycle: string;
    course_run_start: string | null;
    course_run_end: string | null;
    education_level: 'primary' | 'secondary' | 'post_secondary' | 'tertiary' | 'postgraduate' | null;
  };
}

export function useEnrollments() {
  return useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (id, name, provider, fee, billing_cycle, course_run_start, course_run_end, education_level)
        `)
        .order('enrollment_date', { ascending: false });
      
      if (error) throw error;
      return data as EnrollmentWithCourse[];
    },
  });
}

export function useEnrollmentsByAccount(accountId: string) {
  return useQuery({
    queryKey: ['enrollments', 'account', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (id, name, provider, fee, billing_cycle, course_run_start, course_run_end, education_level)
        `)
        .eq('account_id', accountId)
        .order('enrollment_date', { ascending: false });
      
      if (error) throw error;
      return data as EnrollmentWithCourse[];
    },
    enabled: !!accountId,
  });
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  const { syncEducationLevel } = useSyncEducationLevel();
  
  return useMutation({
    mutationFn: async (data: Omit<Enrollment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('enrollments')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: async (data) => {
      // Invalidate all enrollment queries
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      // Invalidate account-specific enrollments for e-service
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'account', data.account_id] });
      // Invalidate course charges as enrollment affects billing
      queryClient.invalidateQueries({ queryKey: ['course-charges'] });
      // Invalidate account holders to update enrolled courses count
      queryClient.invalidateQueries({ queryKey: ['account-holders'] });
      // Sync education level based on new enrollment
      await syncEducationLevel(data.account_id);
      toast.success('Enrollment created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create enrollment', { description: error.message });
    },
  });
}

export function useUpdateEnrollment() {
  const queryClient = useQueryClient();
  const { syncEducationLevel } = useSyncEducationLevel();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Enrollment> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('enrollments')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: async (data) => {
      // Invalidate all enrollment queries
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      // Invalidate account-specific enrollments for e-service
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'account', data.account_id] });
      // Invalidate course charges as enrollment status affects billing
      queryClient.invalidateQueries({ queryKey: ['course-charges'] });
      // Invalidate account holders to update enrolled courses count
      queryClient.invalidateQueries({ queryKey: ['account-holders'] });
      // Sync education level when enrollment is updated (e.g., status change)
      await syncEducationLevel(data.account_id);
      toast.success('Enrollment updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update enrollment', { description: error.message });
    },
  });
}

export function useDeleteEnrollment() {
  const queryClient = useQueryClient();
  const { syncEducationLevel } = useSyncEducationLevel();
  
  return useMutation({
    mutationFn: async ({ id, accountId }: { id: string; accountId: string }) => {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return accountId;
    },
    onSuccess: async (accountId) => {
      // Invalidate all enrollment queries
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      // Invalidate account-specific enrollments for e-service
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'account', accountId] });
      // Invalidate course charges as enrollment affects billing
      queryClient.invalidateQueries({ queryKey: ['course-charges'] });
      // Invalidate account holders to update enrolled courses count
      queryClient.invalidateQueries({ queryKey: ['account-holders'] });
      // Sync education level after enrollment is deleted
      await syncEducationLevel(accountId);
      toast.success('Enrollment deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete enrollment', { description: error.message });
    },
  });
}
