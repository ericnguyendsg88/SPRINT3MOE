// Course providers configuration
export interface CourseProvider {
  id: string;
  name: string;
  isActive: boolean;
  educationLevels: Array<'primary' | 'secondary' | 'post_secondary' | 'tertiary' | 'postgraduate'>;
}

export const INITIAL_COURSE_PROVIDERS: CourseProvider[] = [
  { id: 'provider-1', name: 'National University of Singapore', isActive: true, educationLevels: ['tertiary', 'postgraduate'] },
  { id: 'provider-2', name: 'Nanyang Technological University', isActive: true, educationLevels: ['tertiary', 'postgraduate'] },
  { id: 'provider-3', name: 'Singapore Management University', isActive: true, educationLevels: ['tertiary', 'postgraduate'] },
  { id: 'provider-4', name: 'Singapore Polytechnic', isActive: true, educationLevels: ['post_secondary'] },
  { id: 'provider-5', name: 'Temasek Polytechnic', isActive: true, educationLevels: ['post_secondary'] },
];

// Helper to get only active providers for dropdown selection
export const getActiveProviders = (providers: CourseProvider[]): string[] => {
  return providers.filter(p => p.isActive).map(p => p.name);
};
