import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { determineEducationLevel } from '@/lib/educationLevelUtils';
import { useProviders } from '@/contexts/ProvidersContext';
import type { EnrollmentWithCourse } from './useEnrollments';

/**
 * Hook to sync student's education level based on their active enrollments
 * Call this after enrollment changes (create, update status, delete)
 */
export function useSyncEducationLevel() {
  const { providers } = useProviders();
  const queryClient = useQueryClient();

  const syncEducationLevel = async (accountId: string) => {
    try {
      // Fetch active enrollments for this account
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (id, name, provider, fee, billing_cycle, course_run_start, course_run_end)
        `)
        .eq('account_id', accountId)
        .eq('status', 'active');

      if (enrollmentError) throw enrollmentError;

      // Determine the education level
      const educationLevel = determineEducationLevel(
        enrollments as EnrollmentWithCourse[],
        providers
      );

      // Update the account holder's education level
      const { error: updateError } = await supabase
        .from('account_holders')
        .update({ education_level: educationLevel })
        .eq('id', accountId);

      if (updateError) throw updateError;

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['account_holders'] });
      queryClient.invalidateQueries({ queryKey: ['account_holders', accountId] });

      return educationLevel;
    } catch (error) {
      console.error('Failed to sync education level:', error);
      throw error;
    }
  };

  return { syncEducationLevel };
}
