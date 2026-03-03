import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Define the core types reused across HR modules
export type EmployeeStatus = 'Ativo' | 'Férias' | 'Afastado' | 'Experiência' | 'Inativo';
export type ContractType   = 'CLT' | 'PJ' | 'Estágio' | 'Aprendiz' | 'Temporário';
export type WorkMode       = 'Presencial' | 'Híbrido' | 'Remoto';

export interface Employee {
  id: string;
  name: string;
  cpf: string;
  email: string;
  position: string;
  department: string;
  admissionDate: string;
  status: EmployeeStatus;
  contract: ContractType;
  workMode: WorkMode;
  shiftId: string | null; // The relation to Shifts
}

export type ShiftType = '5x2' | '12x36' | 'Rotativa' | 'Personalizada';

export interface Shift {
  id: string;
  name: string;
  type: ShiftType;
  start: string;
  end: string;
  breakMinutes: number;
  weeklyHours: string;
  color: string;
  // NOTE: 'employees' count will now be calculated dynamically, but we keep it optional for legacy compat during refactor if needed.
}

// Initial Data Migrated from Components
const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'E001', name: 'Ana Beatriz Ferreira',  cpf: '***.***.456-78', email: 'ana.ferreira@empresa.com',       position: 'Desenvolvedora Full Stack Pleno', department: 'TI – Desenvolvimento', admissionDate: '15/03/2021', status: 'Ativo',       contract: 'CLT',     workMode: 'Híbrido', shiftId: 'S1' },
  { id: 'E002', name: 'Bruno Henrique Lima',   cpf: '***.***.789-01', email: 'bruno.lima@empresa.com',         position: 'Analista de RH Pleno',           department: 'Recursos Humanos',     admissionDate: '02/07/2019', status: 'Ativo',       contract: 'CLT',     workMode: 'Presencial', shiftId: 'S4' },
  { id: 'E003', name: 'Carla Rodrigues',       cpf: '***.***.123-45', email: 'carla.rodrigues@empresa.com',    position: 'Gerente Comercial',              department: 'Comercial & Vendas',   admissionDate: '10/01/2017', status: 'Férias',      contract: 'CLT',     workMode: 'Presencial', shiftId: 'S4' },
  { id: 'E004', name: 'Diego Matos',           cpf: '***.***.456-12', email: 'diego.matos@empresa.com',        position: 'Analista Financeiro Pleno',      department: 'Financeiro',           admissionDate: '22/09/2020', status: 'Ativo',       contract: 'CLT',     workMode: 'Híbrido', shiftId: 'S4' },
  { id: 'E005', name: 'Eduarda Sousa',         cpf: '***.***.789-34', email: 'eduarda.sousa@empresa.com',      position: 'Designer UX/UI Pleno',           department: 'Tecnologia',           admissionDate: '05/04/2022', status: 'Ativo',       contract: 'CLT',     workMode: 'Remoto', shiftId: 'S1' },
  { id: 'E006', name: 'Felipe Cardoso',        cpf: '***.***.012-56', email: 'felipe.cardoso@empresa.com',     position: 'Dev. Full Stack Sênior',         department: 'TI – Desenvolvimento', admissionDate: '14/11/2018', status: 'Ativo',       contract: 'CLT',     workMode: 'Remoto', shiftId: 'S2' },
  { id: 'E007', name: 'Giovana Pereira',       cpf: '***.***.345-67', email: 'giovana.pereira@empresa.com',    position: 'Especialista em Qualidade',      department: 'Qualidade (SGQ)',      admissionDate: '08/06/2020', status: 'Afastado',    contract: 'CLT',     workMode: 'Presencial', shiftId: 'S4' },
  { id: 'E008', name: 'Henrique Torres',       cpf: '***.***.678-90', email: 'henrique.torres@empresa.com',    position: 'Executivo de Vendas Pleno',      department: 'Comercial & Vendas',   admissionDate: '19/02/2023', status: 'Experiência', contract: 'CLT',     workMode: 'Presencial', shiftId: 'S4' },
  { id: 'E009', name: 'Isabela Nascimento',    cpf: '***.***.901-23', email: 'isabela.nascimento@empresa.com', position: 'Coordenadora de Suporte',        department: 'TI – Suporte',         admissionDate: '30/08/2019', status: 'Ativo',       contract: 'CLT',     workMode: 'Híbrido', shiftId: 'S3' },
  { id: 'E010', name: 'João Victor Santos',    cpf: '***.***.234-56', email: 'joao.santos@empresa.com',        position: 'Analista de RH Júnior',          department: 'Recursos Humanos',     admissionDate: '03/01/2024', status: 'Experiência', contract: 'Estágio', workMode: 'Presencial', shiftId: 'S4' },
  { id: 'E011', name: 'Larissa Mendes',        cpf: '***.***.567-89', email: 'larissa.mendes@empresa.com',     position: 'Analista de Marketing Pleno',    department: 'Marketing',            admissionDate: '11/05/2021', status: 'Ativo',       contract: 'CLT',     workMode: 'Híbrido', shiftId: 'S4' },
  { id: 'E012', name: 'Marcelo Oliveira',      cpf: '***.***.890-12', email: 'marcelo.oliveira@empresa.com',   position: 'Gerente de Operações',           department: 'Operações',            admissionDate: '07/08/2016', status: 'Ativo',       contract: 'CLT',     workMode: 'Presencial', shiftId: 'S5' },
];

const INITIAL_SHIFTS: Shift[] = [
  { id: 'S1', name: 'Turno Manhã',      type: '5x2',        start: '06:00', end: '14:00', breakMinutes: 60,  weeklyHours: '40h', color: 'bg-blue-500'   },
  { id: 'S2', name: 'Turno Tarde',      type: '5x2',        start: '14:00', end: '22:00', breakMinutes: 60,  weeklyHours: '40h', color: 'bg-indigo-500' },
  { id: 'S3', name: 'Turno Noite',      type: '12x36',      start: '22:00', end: '10:00', breakMinutes: 60,  weeklyHours: '36h', color: 'bg-slate-600'  },
  { id: 'S4', name: 'Comercial',        type: '5x2',        start: '08:00', end: '18:00', breakMinutes: 60,  weeklyHours: '44h', color: 'bg-pink-500'   },
  { id: 'S5', name: 'Plantão Semanal',  type: 'Rotativa',   start: '07:00', end: '19:00', breakMinutes: 60,  weeklyHours: '42h', color: 'bg-amber-500'  },
];

interface HRContextProps {
  employees: Employee[];
  shifts: Shift[];
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  addShift: (shift: Shift) => void;
  updateShift: (id: string, updates: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
}

const HRContext = createContext<HRContextProps | undefined>(undefined);

export function HRProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);

  const addEmployee = (employee: Employee) => {
    setEmployees(prev => [...prev, employee]);
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(emp => (emp.id === id ? { ...emp, ...updates } : emp)));
  };

  const addShift = (shift: Shift) => {
    setShifts(prev => [...prev, shift]);
  };

  const updateShift = (id: string, updates: Partial<Shift>) => {
    setShifts(prev => prev.map(sh => (sh.id === id ? { ...sh, ...updates } : sh)));
  };

  const deleteShift = (id: string) => {
    setShifts(prev => prev.filter(sh => sh.id !== id));
  };

  return (
    <HRContext.Provider value={{ employees, shifts, addEmployee, updateEmployee, addShift, updateShift, deleteShift }}>
      {children}
    </HRContext.Provider>
  );
}

export function useHRContext() {
  const context = useContext(HRContext);
  if (!context) {
    throw new Error('useHRContext must be used within an HRProvider');
  }
  return context;
}
