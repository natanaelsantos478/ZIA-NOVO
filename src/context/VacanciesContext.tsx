import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getVacancies, createVacancy, addCandidate as addCandidateSupa, generateSlug as genSlug, getCandidatesByVacancy as getCandidatesSupa } from '../lib/hr';

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
  publishVacancy: (data: Omit<PublishedVacancy, 'id' | 'publishedAt' | 'stage' | 'candidateCount' | 'slug'>) => Promise<PublishedVacancy>;
  addCandidate: (data: Omit<Candidate, 'id' | 'appliedAt'>) => void;
  getPublicVacancies: () => PublishedVacancy[];
  getCandidatesByVacancy: (vacancyId: string) => Candidate[];
  getVacancyBySlug: (slug: string) => PublishedVacancy | undefined;
}

const VacanciesContext = createContext<VacanciesContextType | null>(null);

function mapVacancy(v: Awaited<ReturnType<typeof getVacancies>>[0]): PublishedVacancy {
  return {
    id: v.id,
    title: v.title,
    dept: v.dept ?? '',
    type: (v.type as ContractType) || 'CLT',
    location: v.location ?? '',
    modality: (v.modality as Modality) || 'Presencial',
    description: v.description ?? '',
    requirements: v.requirements ?? '',
    niceToHave: v.nice_to_have ?? '',
    salary: v.salary ?? '',
    salaryVisible: v.salary_visible,
    acceptPrintedResume: v.accept_printed_resume,
    requireProfileAnalysis: v.require_profile_analysis,
    desiredProfiles: {
      executor:    !!(v.desired_profiles?.executor),
      analitico:   !!(v.desired_profiles?.analitico),
      comunicador: !!(v.desired_profiles?.comunicador),
      planejador:  !!(v.desired_profiles?.planejador),
    },
    priority: (v.priority as Priority) || 'Média',
    deadline: v.deadline ?? '',
    publishedAt: v.created_at?.split('T')[0] ?? '',
    stage: (v.stage as VacancyStage) || 'Triagem',
    candidateCount: v.candidate_count,
    slug: v.slug ?? '',
  };
}

export function VacanciesProvider({ children }: { children: ReactNode }) {
  const [vacancies, setVacancies]   = useState<PublishedVacancy[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    getVacancies().then((data) => setVacancies(data.map(mapVacancy)));
  }, []);

  async function publishVacancy(data: Omit<PublishedVacancy, 'id' | 'publishedAt' | 'stage' | 'candidateCount' | 'slug'>): Promise<PublishedVacancy> {
    const slug = genSlug(data.title);
    const created = await createVacancy({
      title: data.title,
      dept: data.dept,
      type: data.type,
      modality: data.modality,
      location: data.location,
      description: data.description,
      requirements: data.requirements,
      nice_to_have: data.niceToHave,
      salary: data.salary,
      salary_visible: data.salaryVisible,
      accept_printed_resume: data.acceptPrintedResume,
      require_profile_analysis: data.requireProfileAnalysis,
      desired_profiles: data.desiredProfiles as Record<string, boolean>,
      priority: data.priority,
      deadline: data.deadline || null,
      stage: 'Triagem',
      candidate_count: 0,
      status: 'active',
      slug,
    });
    const newVacancy = mapVacancy(created);
    setVacancies((prev) => [newVacancy, ...prev]);
    return newVacancy;
  }

  function addCandidate(data: Omit<Candidate, 'id' | 'appliedAt'>) {
    void addCandidateSupa({
      vacancy_id: data.vacancyId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      linkedin: data.linkedin,
      message: data.message,
      profile_answers: data.profileAnswers as Record<string, boolean>,
      source: data.source,
      status: 'novo',
    }).then(() => {
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
    });
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
