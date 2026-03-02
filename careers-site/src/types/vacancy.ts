// Tipos compartilhados entre a plataforma ZIA e o careers-site.
// Quando o backend for implementado, ambos os projetos consumirão
// a mesma API REST — estes tipos refletem o contrato esperado.

export type ContractType = 'CLT' | 'PJ' | 'Estágio' | 'Temporário';
export type Modality = 'Presencial' | 'Híbrido' | 'Remoto';
export type VacancyStage = 'Triagem' | 'Entrevistas' | 'Teste Técnico' | 'Proposta' | 'Aprovação';

export interface DesiredProfiles {
  executor: boolean;
  analitico: boolean;
  comunicador: boolean;
  planejador: boolean;
}

export interface Vacancy {
  id: string;
  title: string;
  dept: string;
  type: ContractType;
  location: string;
  modality: Modality;
  description: string;
  requirements: string;
  niceToHave: string;
  salary: string;
  salaryVisible: boolean;
  acceptPrintedResume: boolean;
  requireProfileAnalysis: boolean;
  desiredProfiles: DesiredProfiles;
  deadline: string;
  publishedAt: string;
  candidateCount: number;
  slug: string;
}

export interface CandidatePayload {
  vacancyId: string;
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  message: string;
  source: 'portal' | 'impresso' | 'indicacao';
  profileAnswers: Partial<DesiredProfiles>;
}

// ─────────────────────────────────────────────────────────────────────────────
// API contract (futuro)
//
// GET  /api/vacancies           → Vacancy[]          (vagas públicas ativas)
// GET  /api/vacancies/:slug     → Vacancy             (detalhe de uma vaga)
// POST /api/candidates          → { id: string }      (nova candidatura)
//
// O careers-site aponta para:
//   VITE_API_URL = https://api.ziamind.com.br  (produção)
//   VITE_API_URL = http://localhost:3001        (desenvolvimento local)
// ─────────────────────────────────────────────────────────────────────────────
