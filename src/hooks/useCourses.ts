import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Course {
  id: string;
  name: string;
  provider: string;
  billing_cycle: 'monthly' | 'quarterly' | 'biannually' | 'yearly' | 'one_time';
  fee: number;
  description: string | null;
  status: 'active' | 'inactive';
  main_location: string | null;
  mode_of_training: string | null;
  register_by: string | null;
  course_run_start: string | null;
  course_run_end: string | null;
  intake_size: number | null;
  education_level: string | null;
  billing_date: string | null;
  billing_due_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Course[];
    },
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['courses', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Course | null;
    },
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<Course, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('courses')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create course', { description: error.message });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Course> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('courses')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update course', { description: error.message });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete course', { description: error.message });
    },
  });
}
