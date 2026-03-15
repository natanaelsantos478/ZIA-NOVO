// ─────────────────────────────────────────────────────────────────────────────
// GruposCusto.tsx — Gerenciar grupos de custo personalizados
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Tag, Users, Package, DollarSign } from 'lucide-react';
import type { GrupoCusto, CriterioGrupo } from './types';
import { GRUPOS_CUSTO_MOCK } from './mockData';

const uid = () => `gc-${Date.now()}`;
const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';

const CRITERIO_INFO: Record<CriterioGrupo, { label: string; desc: string; icon: React.ReactNode }> = {
  MANUAL:           { label: 'Manual',                    icon: <Tag size={14}/>,     desc: 'Adicione produtos manualmente ao grupo' },
  GRUPO_PRODUTO_ERP:{ label: 'Grupo de Produto (ERP)',    icon: <Package size={14}/>, desc: 'Todos os produtos de um grupo ERP existente' },
  FAIXA_PRECO:      { label: 'Faixa de Preço',            icon: <DollarSign size={14}/>, desc: 'Produtos com preço entre mínimo e máximo' },
  IS_SUBSCRIPTION:  { label: 'Assinaturas Ativas',        icon: <Users size={14}/>,   desc: 'Todos os produtos do tipo assinatura' },
  TODOS_PRODUTOS:   { label: 'Todos os Produtos',         icon: <Package size={14}/>, desc: 'Aplicar a todos os produtos do sistema' },
};

// ── Modal de criação/edição ───────────────────────────────────────────────────
function GrupoModal({ grupo, onSave, onClose }: { grupo?: GrupoCusto; onSave: (g: GrupoCusto) => void; onClose: () => void }) {
  const [form, setForm] = useState<GrupoCusto>(() => grupo ?? {
    id: uid(),
    nome: '',
    descricao: '',
    cor: '#8b5cf6',
    criterio: 'MANUAL',
    ativo: true,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">{grupo ? 'Editar Grupo' : 'Novo Grupo de Custo'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Cor</label>
              <input type="color" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"/>
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Nome *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inp} placeholder="Ex: Infraestrutura, Planos Premium…"/>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Descrição</label>
            <textarea rows={2} value={form.descricao ?? ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              className={inp + ' resize-none'} placeholder="Descreva o propósito deste grupo…"/>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Critério de Agrupamento</label>
            <div className="space-y-2">
              {(Object.entries(CRITERIO_INFO) as [CriterioGrupo, typeof CRITERIO_INFO[CriterioGrupo]][]).map(([crit, info]) => (
                <label key={crit} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${form.criterio === crit ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="criterio" value={crit} checked={form.criterio === crit}
                    onChange={() => setForm(f => ({ ...f, criterio: crit }))} className="accent-emerald-600"/>
                  <span className="text-emerald-600">{info.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{info.label}</p>
                    <p className="text-xs text-slate-500">{info.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {form.criterio === 'FAIXA_PRECO' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Preço Mínimo (R$)</label>
                <input type="number" value={(form.criterio_params?.preco_min as number) ?? 0}
                  onChange={e => setForm(f => ({ ...f, criterio_params: { ...f.criterio_params, preco_min: Number(e.target.value) } }))} className={inp}/>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Preço Máximo (R$)</label>
                <input type="number" value={(form.criterio_params?.preco_max as number) ?? 0}
                  onChange={e => setForm(f => ({ ...f, criterio_params: { ...f.criterio_params, preco_max: Number(e.target.value) } }))} className={inp}/>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.nome.trim()}
            className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {grupo ? 'Salvar' : 'Criar Grupo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card de grupo ─────────────────────────────────────────────────────────────
function GrupoCard({ grupo, onEdit, onDelete }: { grupo: GrupoCusto; onEdit: () => void; onDelete: () => void }) {
  const info = CRITERIO_INFO[grupo.criterio];
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: grupo.cor + '20', border: `2px solid ${grupo.cor}` }}>
        <span className="text-lg" style={{ color: grupo.cor }}>{info.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-bold text-slate-800">{grupo.nome}</h3>
          {!grupo.ativo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">Inativo</span>}
        </div>
        <p className="text-xs text-slate-500 mb-2">{grupo.descricao ?? '—'}</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 text-slate-600">
            {info.icon} {info.label}
          </span>
          {grupo.criterio === 'FAIXA_PRECO' && (
            <span className="text-slate-400">
              R$ {((grupo.criterio_params?.preco_min as number) ?? 0).toLocaleString('pt-BR')} – R$ {((grupo.criterio_params?.preco_max as number) ?? 0).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={14}/></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
      </div>
    </div>
  );
}

// ── Principal ─────────────────────────────────────────────────────────────────
export default function GruposCusto() {
  const [grupos, setGrupos] = useState<GrupoCusto[]>(GRUPOS_CUSTO_MOCK);
  const [modal, setModal] = useState<{ aberto: boolean; grupo?: GrupoCusto }>({ aberto: false });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Grupos de Custo</h1>
          <p className="text-sm text-slate-500 mt-0.5">Agrupe produtos para aplicar custos compartilhados</p>
        </div>
        <button onClick={() => setModal({ aberto: true })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
          <Plus size={15}/> Novo Grupo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Grupos ativos',   value: grupos.filter(g => g.ativo).length,   color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Total de grupos', value: grupos.length,                          color: 'text-slate-600 bg-slate-50' },
          { label: 'Grupos inativos', value: grupos.filter(g => !g.ativo).length,  color: 'text-slate-400 bg-slate-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs opacity-70 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {grupos.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Tag size={32} className="mx-auto mb-3 opacity-30"/>
            <p>Nenhum grupo cadastrado</p>
          </div>
        ) : (
          grupos.map(g => (
            <GrupoCard key={g.id} grupo={g}
              onEdit={() => setModal({ aberto: true, grupo: g })}
              onDelete={() => setGrupos(prev => prev.filter(x => x.id !== g.id))}
            />
          ))
        )}
      </div>

      {modal.aberto && (
        <GrupoModal
          grupo={modal.grupo}
          onSave={(g) => {
            setGrupos(prev => {
              const idx = prev.findIndex(x => x.id === g.id);
              return idx >= 0 ? prev.map(x => x.id === g.id ? g : x) : [...prev, g];
            });
            setModal({ aberto: false });
          }}
          onClose={() => setModal({ aberto: false })}
        />
      )}
    </div>
  );
}
