// ─────────────────────────────────────────────────────────────────────────────
// ZIA — Sistema de Usuários e Controle de Acesso
// Tabela: zia_usuarios
//
// Níveis de acesso:
//   1 = Gestor de Holding   → acessa holding, matrizes e filiais
//   2 = Gestor de Matriz    → acessa a matriz e filiais vinculadas
//   3 = Gestor de Filial    → acessa a filial
//   4 = Funcionário         → acessa apenas o módulo definido em modulo_acesso
//
// Código de acesso: 5 dígitos auto-incrementais (00001, 00002, …)
// Senha: base64 simples — substituir por bcrypt em produção
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

export type NivelAcesso = 1 | 2 | 3 | 4;
export type EntidadeTipo = 'holding' | 'matriz' | 'filial';

export const NIVEL_LABELS: Record<NivelAcesso, string> = {
  1: 'Gestor de Holding',
  2: 'Gestor de Matriz',
  3: 'Gestor de Filial',
  4: 'Funcionário',
};

export const NIVEL_DESC: Record<NivelAcesso, string> = {
  1: 'Acesso completo: holding, todas as matrizes e filiais',
  2: 'Acesso à matriz selecionada e suas filiais',
  3: 'Acesso apenas à filial selecionada',
  4: 'Acesso a um único módulo da entidade selecionada',
};

export const MODULO_LABELS: Record<string, string> = {
  erp:       'ERP — Backoffice',
  crm:       'CRM',
  hr:        'RH',
  logistics: 'Logística (SCM)',
  assets:    'Ativos (EAM)',
  quality:   'Qualidade',
  docs:      'Documentos',
};

export const MODULO_ROUTES: Record<string, string> = {
  erp:       '/app/backoffice',
  crm:       '/app/crm',
  hr:        '/app/hr',
  logistics: '/app/logistics',
  assets:    '/app/assets',
  quality:   '/app/quality',
  docs:      '/app/docs',
};

export interface ZiaUsuario {
  id: string;
  codigo: string;            // '00001' .. '99999'
  nome: string;
  nivel: NivelAcesso;
  entidade_tipo: EntidadeTipo;
  entidade_id: string;       // UUID da holding/matriz/filial
  entidade_nome: string;     // nome para exibição
  modulo_acesso: string | null;  // apenas nível 4
  ativo: boolean;
  criado_por: string;
  tenant_id: string;
  created_at: string;
}

// Codificação de senha — simplificada para demo
// Em produção: usar bcrypt via Edge Function ou similar
function hashSenha(senha: string): string {
  return btoa(senha);
}
function verificarSenha(senha: string, hash: string): boolean {
  return btoa(senha) === hash;
}

// ── Login ──────────────────────────────────────────────────────────────────────

export async function loginZia(
  codigo: string,
  senha: string
): Promise<ZiaUsuario | null> {
  const codigoPadded = codigo.padStart(5, '0');
  const { data, error } = await supabase
    .from('zia_usuarios')
    .select('*')
    .eq('codigo', codigoPadded)
    .eq('ativo', true)
    .single();

  if (error || !data) return null;
  if (!verificarSenha(senha, data.senha_hash)) return null;
  return data as ZiaUsuario;
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

export async function getUsuarios(): Promise<ZiaUsuario[]> {
  const { data, error } = await supabase
    .from('zia_usuarios')
    .select('*')
    .order('codigo');
  if (error) throw error;
  return (data ?? []) as ZiaUsuario[];
}

export async function createUsuario(payload: {
  nome: string;
  senha: string;
  nivel: NivelAcesso;
  entidade_tipo: EntidadeTipo;
  entidade_id: string;
  entidade_nome: string;
  modulo_acesso?: string | null;
}): Promise<ZiaUsuario> {
  const { data: { user } } = await supabase.auth.getUser();
  const tenant_id = user?.id ?? '00000000-0000-0000-0000-000000000001';

  // Gera próximo código sequencial
  const { data: last } = await supabase
    .from('zia_usuarios')
    .select('codigo')
    .order('codigo', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNum = last ? parseInt(last.codigo, 10) + 1 : 1;
  const codigo = String(nextNum).padStart(5, '0');

  const { data, error } = await supabase
    .from('zia_usuarios')
    .insert({
      codigo,
      nome: payload.nome,
      senha_hash: hashSenha(payload.senha),
      nivel: payload.nivel,
      entidade_tipo: payload.entidade_tipo,
      entidade_id: payload.entidade_id,
      entidade_nome: payload.entidade_nome,
      modulo_acesso: payload.modulo_acesso ?? null,
      ativo: true,
      criado_por: tenant_id,
      tenant_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ZiaUsuario;
}

export async function updateUsuario(
  id: string,
  payload: Partial<Pick<ZiaUsuario, 'nome' | 'nivel' | 'entidade_tipo' | 'entidade_id' | 'entidade_nome' | 'modulo_acesso' | 'ativo'>> & { senha?: string }
): Promise<ZiaUsuario> {
  const update: Record<string, unknown> = { ...payload };
  if (payload.senha) {
    update.senha_hash = hashSenha(payload.senha);
    delete update.senha;
  }

  const { data, error } = await supabase
    .from('zia_usuarios')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ZiaUsuario;
}

export async function toggleUsuarioAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .from('zia_usuarios')
    .update({ ativo })
    .eq('id', id);
  if (error) throw error;
}
