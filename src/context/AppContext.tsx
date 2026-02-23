import { createContext, useContext, useState, type ReactNode } from 'react';

interface AppConfig {
  primaryColor: string;
  companyName: string;
}

interface AppContextType {
  currentView: string;
  setCurrentView: (view: string) => void;
  config: AppConfig;
  setConfig: (config: AppConfig) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentView, setCurrentView] = useState<string>('dashboard_360');
  const [config, setConfig] = useState<AppConfig>({
    primaryColor: 'indigo',
    companyName: 'Zia Omnisystem',
  });

  return (
    <AppContext.Provider value={{ currentView, setCurrentView, config, setConfig }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
