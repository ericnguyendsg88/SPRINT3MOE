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
 * Uses the course's education_level field directly from the database
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
    // Use the education_level directly from the course
    const courseLevel = enrollment.courses?.education_level as keyof typeof EDUCATION_LEVEL_PRIORITY | null;
    
    if (courseLevel && courseLevel in EDUCATION_LEVEL_PRIORITY) {
      const priority = EDUCATION_LEVEL_PRIORITY[courseLevel];
      if (priority > highestPriority) {
        highestPriority = priority;
        highestLevel = courseLevel;
      }
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

/**
 * Get the highest education level from an array of education levels
 */
export function getHighestEducationLevel(
  levels: (string | null | undefined)[]
): 'primary' | 'secondary' | 'post_secondary' | 'tertiary' | 'postgraduate' | null {
  const validLevels = levels.filter((level): level is keyof typeof EDUCATION_LEVEL_PRIORITY => 
    level !== null && level !== undefined && level in EDUCATION_LEVEL_PRIORITY
  );

  if (validLevels.length === 0) {
    return null;
  }

  return validLevels.reduce((highest, current) => {
    const currentPriority = EDUCATION_LEVEL_PRIORITY[current];
    const highestPriority = EDUCATION_LEVEL_PRIORITY[highest];
    return currentPriority > highestPriority ? current : highest;
  });
}

/**
 * Compare two education levels
 * Returns: 1 if level1 > level2, -1 if level1 < level2, 0 if equal
 */
export function compareEducationLevels(
  level1: string | null | undefined,
  level2: string | null | undefined
): number {
  if (!level1 && !level2) return 0;
  if (!level1) return -1;
  if (!level2) return 1;

  const priority1 = level1 in EDUCATION_LEVEL_PRIORITY ? EDUCATION_LEVEL_PRIORITY[level1 as keyof typeof EDUCATION_LEVEL_PRIORITY] : 0;
  const priority2 = level2 in EDUCATION_LEVEL_PRIORITY ? EDUCATION_LEVEL_PRIORITY[level2 as keyof typeof EDUCATION_LEVEL_PRIORITY] : 0;

  if (priority1 > priority2) return 1;  // level1 is higher
  if (priority1 < priority2) return -1; // level1 is lower
  return 0; // equal
}
