import { createContext, useContext, useState, type ReactNode } from 'react';

export type ContractType = 'CLT' | 'PJ' | 'Estágio' | 'Temporário';
export type Modality = 'Presencial' | 'Híbrido' | 'Remoto';
export type VacancyStage = 'Triagem' | 'Entrevistas' | 'Teste Técnico' | 'Proposta' | 'Aprovação';
export type Priority = 'Alta' | 'Média' | 'Baixa';

export interface DesiredProfiles {
  executor: boolean;
  analitico: boolean;
  comunicador: boolean;
  planejador: boolean;
}

export interface PublishedVacancy {
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
  salaryVisible: boolean;      // false = exibe "A combinar"
  acceptPrintedResume: boolean;
  requireProfileAnalysis: boolean;
  desiredProfiles: DesiredProfiles;
  priority: Priority;
  deadline: string;
  publishedAt: string;
  stage: VacancyStage;
  candidateCount: number;
  slug: string;
}

export interface Candidate {
  id: string;
  vacancyId: string;
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  message: string;
  profileAnswers: Partial<DesiredProfiles>;
  source: 'portal' | 'impresso' | 'indicacao';
  appliedAt: string;
}

interface VacanciesContextType {
  vacancies: PublishedVacancy[];
  candidates: Candidate[];
  publishVacancy: (data: Omit<PublishedVacancy, 'id' | 'publishedAt' | 'stage' | 'candidateCount' | 'slug'>) => PublishedVacancy;
  addCandidate: (data: Omit<Candidate, 'id' | 'appliedAt'>) => void;
  getPublicVacancies: () => PublishedVacancy[];
  getCandidatesByVacancy: (vacancyId: string) => Candidate[];
  getVacancyBySlug: (slug: string) => PublishedVacancy | undefined;
}

const VacanciesContext = createContext<VacanciesContextType | null>(null);

function generateSlug(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
  return `${id.toLowerCase()}-${base}`;
}

// Dados de seed — espelham as vagas mock existentes no ATS
const SEED_VACANCIES: PublishedVacancy[] = [
  {
    id: 'V001',
    title: 'Desenvolvedor Full Stack Sênior',
    dept: 'TI – Desenvolvimento',
    type: 'CLT',
    location: 'São Paulo, SP',
    modality: 'Híbrido',
    description: 'Buscamos um Desenvolvedor Full Stack experiente para integrar o time de produto e ajudar a construir a próxima geração da plataforma ZIA. Você vai colaborar diretamente com designers, PMs e outros engenheiros para entregar features de alto impacto.',
    requirements: '• 5+ anos de experiência com React e Node.js\n• TypeScript avançado\n• Experiência com arquitetura de microsserviços\n• Vivência com pipelines CI/CD',
    niceToHave: '• AWS ou GCP\n• Conhecimento em GraphQL\n• Contribuições em projetos open-source',
    salary: 'R$ 12.000 – R$ 18.000',
    salaryVisible: true,
    acceptPrintedResume: false,
    requireProfileAnalysis: true,
    desiredProfiles: { executor: true, analitico: true, comunicador: false, planejador: false },
    priority: 'Alta',
    deadline: '2025-03-31',
    publishedAt: '2025-01-10',
    stage: 'Entrevistas',
    candidateCount: 42,
    slug: 'v001-desenvolvedor-full-stack-senior',
  },
  {
    id: 'V002',
    title: 'Analista de Customer Success',
    dept: 'Comercial – CS',
    type: 'CLT',
    location: 'Remoto',
    modality: 'Remoto',
    description: 'Você será o principal ponto de contato dos nossos clientes após a implementação, garantindo adoção, satisfação e expansão das contas. Vamos trabalhar juntos para criar jornadas de sucesso que fidelizam e encantam.',
    requirements: '• Experiência em CS, Account Management ou Suporte Sênior\n• Excelente comunicação verbal e escrita\n• Capacidade analítica para leitura de métricas de saúde de conta',
    niceToHave: '• Inglês intermediário\n• Experiência com plataformas SaaS B2B\n• Conhecimento em HubSpot ou Gainsight',
    salary: 'R$ 5.000 – R$ 8.000',
    salaryVisible: true,
    acceptPrintedResume: false,
    requireProfileAnalysis: true,
    desiredProfiles: { executor: false, analitico: false, comunicador: true, planejador: true },
    priority: 'Alta',
    deadline: '2025-03-15',
    publishedAt: '2025-01-18',
    stage: 'Triagem',
    candidateCount: 87,
    slug: 'v002-analista-de-customer-success',
  },
  {
    id: 'V003',
    title: 'Designer UX/UI Pleno',
    dept: 'Produto',
    type: 'PJ',
    location: 'Remoto',
    modality: 'Remoto',
    description: 'O time de Produto procura um Designer UX/UI apaixonado por criar experiências simples e poderosas. Você vai do discovery ao handoff, colaborando com engenharia e produto para resolver problemas reais de usuários.',
    requirements: '• Portfolio com projetos de produto digital\n• Domínio de Figma\n• Experiência com pesquisa de usuário e testes de usabilidade',
    niceToHave: '• Noções de desenvolvimento front-end\n• Experiência com Design Systems',
    salary: 'R$ 7.000 – R$ 11.000',
    salaryVisible: false,
    acceptPrintedResume: false,
    requireProfileAnalysis: false,
    desiredProfiles: { executor: false, analitico: true, comunicador: true, planejador: false },
    priority: 'Média',
    deadline: '2025-03-20',
    publishedAt: '2025-01-22',
    stage: 'Teste Técnico',
    candidateCount: 23,
    slug: 'v003-designer-ux-ui-pleno',
  },
  {
    id: 'V004',
    title: 'Gerente de Qualidade (SGQ)',
    dept: 'Qualidade',
    type: 'CLT',
    location: 'Campinas, SP',
    modality: 'Presencial',
    description: 'Responsável por estruturar e manter o Sistema de Gestão da Qualidade (ISO 9001), liderar auditorias internas e promover uma cultura de melhoria contínua em todos os departamentos.',
    requirements: '• Graduação em Engenharia, Administração ou área afim\n• Experiência com ISO 9001 e auditorias\n• Liderança de equipes',
    niceToHave: '• Formação em Lean Six Sigma\n• Experiência em empresas de tecnologia',
    salary: 'R$ 9.000 – R$ 13.000',
    salaryVisible: true,
    acceptPrintedResume: true,
    requireProfileAnalysis: true,
    desiredProfiles: { executor: false, analitico: true, comunicador: false, planejador: true },
    priority: 'Alta',
    deadline: '2025-02-28',
    publishedAt: '2025-02-01',
    stage: 'Proposta',
    candidateCount: 11,
    slug: 'v004-gerente-de-qualidade-sgq',
  },
  {
    id: 'V005',
    title: 'Estagiário de Marketing Digital',
    dept: 'Marketing',
    type: 'Estágio',
    location: 'São Paulo, SP',
    modality: 'Híbrido',
    description: 'Oportunidade para estudantes que querem aprender na prática sobre growth, conteúdo, SEO e mídia paga. Você vai colaborar com uma equipe dinâmica e ter contato direto com estratégias de aquisição.',
    requirements: '• Cursando Marketing, Comunicação ou Publicidade\n• Interesse em métricas e dados\n• Facilidade com redes sociais',
    niceToHave: '• Conhecimento básico em Google Analytics\n• Experiência com Canva ou Adobe',
    salary: 'R$ 1.500',
    salaryVisible: true,
    acceptPrintedResume: true,
    requireProfileAnalysis: false,
    desiredProfiles: { executor: true, analitico: false, comunicador: true, planejador: false },
    priority: 'Baixa',
    deadline: '2025-04-30',
    publishedAt: '2025-02-05',
    stage: 'Triagem',
    candidateCount: 134,
    slug: 'v005-estagiario-de-marketing-digital',
  },
  {
    id: 'V006',
    title: 'Analista de Dados (BI)',
    dept: 'TI – Dados',
    type: 'CLT',
    location: 'Remoto',
    modality: 'Remoto',
    description: 'Você vai transformar dados brutos em insights que orientam decisões estratégicas. Trabalho próximo às squads de produto, comercial e financeiro para construir dashboards, modelos e relatórios que fazem a diferença.',
    requirements: '• SQL avançado\n• Experiência com Power BI ou Metabase\n• Conhecimento de modelagem dimensional',
    niceToHave: '• Python para análise de dados\n• dbt ou ferramentas de data pipeline',
    salary: 'R$ 7.000 – R$ 10.000',
    salaryVisible: false,
    acceptPrintedResume: false,
    requireProfileAnalysis: true,
    desiredProfiles: { executor: false, analitico: true, comunicador: false, planejador: true },
    priority: 'Média',
    deadline: '2025-03-10',
    publishedAt: '2025-02-08',
    stage: 'Aprovação',
    candidateCount: 19,
    slug: 'v006-analista-de-dados-bi',
  },
];

export function VacanciesProvider({ children }: { children: ReactNode }) {
  const [vacancies, setVacancies] = useState<PublishedVacancy[]>(SEED_VACANCIES);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  function publishVacancy(data: Omit<PublishedVacancy, 'id' | 'publishedAt' | 'stage' | 'candidateCount' | 'slug'>): PublishedVacancy {
    const id = `V${String(vacancies.length + 1).padStart(3, '0')}`;
    const newVacancy: PublishedVacancy = {
      ...data,
      id,
      publishedAt: new Date().toISOString().split('T')[0],
      stage: 'Triagem',
      candidateCount: 0,
      slug: generateSlug(data.title, id),
    };
    setVacancies((prev) => [newVacancy, ...prev]);
    return newVacancy;
  }

  function addCandidate(data: Omit<Candidate, 'id' | 'appliedAt'>) {
    const newCandidate: Candidate = {
      ...data,
      id: `C${Date.now()}`,
      appliedAt: new Date().toISOString(),
    };
    setCandidates((prev) => [...prev, newCandidate]);
    setVacancies((prev) =>
      prev.map((v) =>
        v.id === data.vacancyId ? { ...v, candidateCount: v.candidateCount + 1 } : v,
      ),
    );
  }

  function getPublicVacancies() {
    return vacancies.filter((v) => v.stage !== 'Aprovação');
  }

  function getCandidatesByVacancy(vacancyId: string) {
    return candidates.filter((c) => c.vacancyId === vacancyId);
  }

  function getVacancyBySlug(slug: string) {
    return vacancies.find((v) => v.slug === slug);
  }

  return (
    <VacanciesContext.Provider value={{
      vacancies,
      candidates,
      publishVacancy,
      addCandidate,
      getPublicVacancies,
      getCandidatesByVacancy,
      getVacancyBySlug,
    }}>
      {children}
    </VacanciesContext.Provider>
  );
}

export function useVacancies() {
  const ctx = useContext(VacanciesContext);
  if (!ctx) throw new Error('useVacancies deve ser usado dentro de VacanciesProvider');
  return ctx;
}
