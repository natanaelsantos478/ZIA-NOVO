import { createContext, useContext, useState, type ReactNode } from 'react';

interface AppFeatures {
  enableERP: boolean;
  enableEAM: boolean;
  enableRFID: boolean;
}

interface AppConfig {
  primaryColor: string;
  companyName: string;
  features: AppFeatures;
}

interface AppContextType {
  currentView: string;
  setCurrentView: (view: string) => void;
  config: AppConfig;
  setConfig: (config: AppConfig) => void;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  handleFinishMeeting: () => void;
  handleStartMeeting: () => void;

  // Dashboard Central State
  activeModule: string;
  setActiveModule: (m: string) => void;
  activeEntity: string;
  setActiveEntity: (e: string) => void;
  activeIndicator: string;
  setActiveIndicator: (i: string) => void;
  biPanelOpen: boolean;
  setBiPanelOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentView, setCurrentView] = useState<string>('dashboard_360');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [config, setConfig] = useState<AppConfig>({
    primaryColor: 'indigo',
    companyName: 'Zia Omnisystem',
    features: {
      enableERP: true,
      enableEAM: true,
      enableRFID: true,
    }
  });

  // Dashboard Central State
  const [activeModule, setActiveModule] = useState('crm');
  const [activeEntity, setActiveEntity] = useState('all');
  const [activeIndicator, setActiveIndicator] = useState('revenue');
  const [biPanelOpen, setBiPanelOpen] = useState(false);

  const handleFinishMeeting = () => {
    console.log('Meeting finished');
    setCurrentView('dashboard_360');
  };

  const handleStartMeeting = () => {
    console.log('Meeting started');
    setCurrentView('meeting');
  };

  return (
    <AppContext.Provider value={{
      currentView,
      setCurrentView,
      config,
      setConfig,
      isProcessing,
      setIsProcessing,
      handleFinishMeeting,
      handleStartMeeting,
      activeModule,
      setActiveModule,
      activeEntity,
      setActiveEntity,
      activeIndicator,
      setActiveIndicator,
      biPanelOpen,
      setBiPanelOpen
    }}>
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
