/**
 * vacanciesService
 *
 * Hoje: retorna dados mock (mesma estrutura da plataforma ZIA).
 * Futuro: substitua `useMock = false` e configure VITE_API_URL para
 * consumir a API REST da plataforma.
 */

import type { Vacancy, CandidatePayload } from '../types/vacancy';

// ── Mock data — espelha o seed do VacanciesContext na plataforma ──
const MOCK_VACANCIES: Vacancy[] = [
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
    deadline: '2025-03-31',
    publishedAt: '2025-01-10',
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
    description: 'Você será o principal ponto de contato dos nossos clientes após a implementação, garantindo adoção, satisfação e expansão das contas.',
    requirements: '• Experiência em CS, Account Management ou Suporte Sênior\n• Excelente comunicação verbal e escrita\n• Capacidade analítica para leitura de métricas de saúde de conta',
    niceToHave: '• Inglês intermediário\n• Experiência com plataformas SaaS B2B',
    salary: 'R$ 5.000 – R$ 8.000',
    salaryVisible: true,
    acceptPrintedResume: false,
    requireProfileAnalysis: true,
    desiredProfiles: { executor: false, analitico: false, comunicador: true, planejador: true },
    deadline: '2025-03-15',
    publishedAt: '2025-01-18',
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
    description: 'O time de Produto procura um Designer UX/UI apaixonado por criar experiências simples e poderosas. Você vai do discovery ao handoff, colaborando com engenharia e produto.',
    requirements: '• Portfolio com projetos de produto digital\n• Domínio de Figma\n• Experiência com pesquisa de usuário',
    niceToHave: '• Noções de desenvolvimento front-end\n• Experiência com Design Systems',
    salary: 'R$ 7.000 – R$ 11.000',
    salaryVisible: false,
    acceptPrintedResume: false,
    requireProfileAnalysis: false,
    desiredProfiles: { executor: false, analitico: true, comunicador: true, planejador: false },
    deadline: '2025-03-20',
    publishedAt: '2025-01-22',
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
    description: 'Responsável por estruturar e manter o Sistema de Gestão da Qualidade (ISO 9001), liderar auditorias internas e promover uma cultura de melhoria contínua.',
    requirements: '• Graduação em Engenharia, Administração ou área afim\n• Experiência com ISO 9001 e auditorias\n• Liderança de equipes',
    niceToHave: '• Formação em Lean Six Sigma\n• Experiência em empresas de tecnologia',
    salary: 'R$ 9.000 – R$ 13.000',
    salaryVisible: true,
    acceptPrintedResume: true,
    requireProfileAnalysis: true,
    desiredProfiles: { executor: false, analitico: true, comunicador: false, planejador: true },
    deadline: '2025-02-28',
    publishedAt: '2025-02-01',
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
    description: 'Oportunidade para estudantes que querem aprender na prática sobre growth, conteúdo, SEO e mídia paga.',
    requirements: '• Cursando Marketing, Comunicação ou Publicidade\n• Interesse em métricas e dados',
    niceToHave: '• Conhecimento básico em Google Analytics\n• Experiência com Canva ou Adobe',
    salary: 'R$ 1.500',
    salaryVisible: true,
    acceptPrintedResume: true,
    requireProfileAnalysis: false,
    desiredProfiles: { executor: true, analitico: false, comunicador: true, planejador: false },
    deadline: '2025-04-30',
    publishedAt: '2025-02-05',
    candidateCount: 134,
    slug: 'v005-estagiario-de-marketing-digital',
  },
];

// ── API URL — configure via variável de ambiente no Vercel ──
const API_URL = import.meta.env.VITE_API_URL;
const USE_MOCK = !API_URL;

export async function getVacancies(): Promise<Vacancy[]> {
  if (USE_MOCK) return MOCK_VACANCIES;
  const res = await fetch(`${API_URL}/api/vacancies`);
  if (!res.ok) throw new Error('Erro ao buscar vagas');
  return res.json();
}

export async function getVacancyBySlug(slug: string): Promise<Vacancy | undefined> {
  if (USE_MOCK) return MOCK_VACANCIES.find((v) => v.slug === slug);
  const res = await fetch(`${API_URL}/api/vacancies/${slug}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Erro ao buscar vaga');
  return res.json();
}

export async function submitCandidate(payload: CandidatePayload): Promise<{ id: string }> {
  if (USE_MOCK) {
    // Simula candidatura bem-sucedida em modo mock
    await new Promise((r) => setTimeout(r, 800));
    return { id: `C${Date.now()}` };
  }
  const res = await fetch(`${API_URL}/api/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao enviar candidatura');
  return res.json();
}
