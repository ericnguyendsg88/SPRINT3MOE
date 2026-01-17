import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { INITIAL_COURSE_PROVIDERS, type CourseProvider, getActiveProviders } from '@/data/providers';

interface ProvidersContextType {
  providers: CourseProvider[];
  activeProviders: string[];
  updateProviders: (providers: CourseProvider[]) => void;
  addProvider: (provider: CourseProvider) => void;
  updateProvider: (provider: CourseProvider) => void;
  toggleProviderStatus: (providerId: string) => void;
}

const ProvidersContext = createContext<ProvidersContextType | undefined>(undefined);

const STORAGE_KEY = 'course_providers';

export function ProvidersProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<CourseProvider[]>(() => {
    // Load from localStorage if available
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migrate old data: ensure educationLevels array exists
        return parsed.map((p: any) => ({
          ...p,
          educationLevels: p.educationLevels || ['tertiary'],
        }));
      } catch {
        return INITIAL_COURSE_PROVIDERS;
      }
    }
    return INITIAL_COURSE_PROVIDERS;
  });

  // Persist to localStorage whenever providers change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
  }, [providers]);

  const activeProviders = getActiveProviders(providers);

  const updateProviders = (newProviders: CourseProvider[]) => {
    setProviders(newProviders);
  };

  const addProvider = (provider: CourseProvider) => {
    setProviders([...providers, provider]);
  };

  const updateProvider = (updatedProvider: CourseProvider) => {
    setProviders(providers.map(p => 
      p.id === updatedProvider.id ? updatedProvider : p
    ));
  };

  const toggleProviderStatus = (providerId: string) => {
    setProviders(providers.map(p => 
      p.id === providerId ? { ...p, isActive: !p.isActive } : p
    ));
  };

  return (
    <ProvidersContext.Provider value={{
      providers,
      activeProviders,
      updateProviders,
      addProvider,
      updateProvider,
      toggleProviderStatus,
    }}>
      {children}
    </ProvidersContext.Provider>
  );
}

export function useProviders() {
  const context = useContext(ProvidersContext);
  if (context === undefined) {
    throw new Error('useProviders must be used within a ProvidersProvider');
  }
  return context;
}
