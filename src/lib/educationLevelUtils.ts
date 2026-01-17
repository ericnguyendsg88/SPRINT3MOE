import type { CourseProvider } from '@/data/providers';
import type { EnrollmentWithCourse } from '@/hooks/useEnrollments';

/**
 * Priority order for education levels (highest to lowest)
 */
const EDUCATION_LEVEL_PRIORITY = {
  'postgraduate': 5,
  'tertiary': 4,
  'post_secondary': 3,
  'secondary': 2,
  'primary': 1,
} as const;

/**
 * Determines the student's education level based on their active enrollments
 * Returns the highest education level among all active courses
 * Uses the course's education_level field directly
 */
export function determineEducationLevel(
  activeEnrollments: EnrollmentWithCourse[],
  providers: CourseProvider[]
): 'primary' | 'secondary' | 'post_secondary' | 'tertiary' | 'postgraduate' | null {
  if (activeEnrollments.length === 0) {
    return null;
  }

  let highestLevel: 'primary' | 'secondary' | 'post_secondary' | 'tertiary' | 'postgraduate' | null = null;
  let highestPriority = 0;

  for (const enrollment of activeEnrollments) {
    // Get education level directly from the course
    const courseEducationLevel = enrollment.courses?.education_level;
    if (!courseEducationLevel) continue;

    const priority = EDUCATION_LEVEL_PRIORITY[courseEducationLevel];
    if (priority > highestPriority) {
      highestPriority = priority;
      highestLevel = courseEducationLevel;
    }
  }

  return highestLevel;
}

/**
 * Format education level for display
 */
export function formatEducationLevel(level: string | null): string {
  if (!level) return 'Not Set';
  
  const levelMap: Record<string, string> = {
    'primary': 'Primary',
    'secondary': 'Secondary',
    'post_secondary': 'Post-Secondary',
    'tertiary': 'Tertiary',
    'postgraduate': 'Post-Graduate',
  };
  
  return levelMap[level] || level;
}
