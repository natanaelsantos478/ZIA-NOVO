// ─────────────────────────────────────────────────────────────────────────────
// PropertiesPanel.tsx — Painel direito de propriedades do elemento selecionado
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { SketchPicker } from 'react-color';
import { Trash2, Copy, ChevronUp, ChevronDown, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import type { Elemento, TextoDados, ImagemDados, FormaDados, LogoDados, ProdutoCardDados, TabelaDados, CampoDadoDados, OrcConfig } from '../types';
import { VARIAVEIS_DINAMICAS, FONTES, COLUNAS_TABELA, CAMPOS_DADOS } from '../types';
import type { ItemOrcamento } from '../../../data/crmData';

// ── Color picker inline ───────────────────────────────────────────────────────
function ColorInput({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const isTransparent = value === 'transparent';
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-0.5">{label}</label>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-7 h-7 rounded border border-slate-200 flex-shrink-0 overflow-hidden"
          style={{ background: isTransparent ? 'linear-gradient(45deg,#ccc 25%,#fff 25%,#fff 75%,#ccc 75%)' : value }}
        />
        <input value={isTransparent ? 'transparent' : value} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"/>
        {open && (
          <div className="absolute z-50 right-0 mt-1 top-full shadow-xl">
            <div className="fixed inset-0" onClick={() => setOpen(false)}/>
            <div className="relative">
              <SketchPicker
                color={isTransparent ? '#ffffff' : value}
                onChange={c => onChange(c.hex)}
                presetColors={['transparent','#ffffff','#000000','#7c3aed','#2563eb','#16a34a','#dc2626','#f59e0b','#1e293b','#f8fafc']}
              />
              <button onClick={() => { onChange('transparent'); setOpen(false); }}
                className="w-full mt-1 text-xs py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-b">
                Transparente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Slider ────────────────────────────────────────────────────────────────────
function SliderInput({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs text-slate-600 font-mono">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-purple-600 cursor-pointer"/>
    </div>
  );
}

// ── Number input ──────────────────────────────────────────────────────────────
function NumInput({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void;
}) {
  const inp = 'w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400';
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-0.5">{label}</label>
      <input type="number" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} className={inp}/>
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────────────────────
const inp = 'w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400';

// ── Section header ────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ── Props TEXTO ───────────────────────────────────────────────────────────────
function PropsTexto({ el, onChange }: { el: Elemento; onChange: (p: Partial<Elemento>) => void }) {
  const d = el.dados as TextoDados;
  const upd = (patch: Partial<TextoDados>) => onChange({ dados: { ...d, ...patch } });
  return (
    <>
      <Section title="Conteúdo">
        <div>
          <label className="text-xs text-slate-400 block mb-0.5">Campo dinâmico</label>
          <select value={d.variavel ?? ''} onChange={e => upd({ variavel: e.target.value || undefined, conteudo: e.target.value ? '' : d.conteudo })} className={inp}>
            <option value="">— Texto livre —</option>
            {VARIAVEIS_DINAMICAS.map(v => <option key={v.valor} value={v.valor}>{v.label}</option>)}
          </select>
        </div>
        {!d.variavel && (
          <div>
            <label className="text-xs text-slate-400 block mb-0.5">Texto</label>
            <textarea rows={3} value={d.conteudo} onChange={e => upd({ conteudo: e.target.value })}
              className={inp + ' resize-none'}/>
          </div>
        )}
      </Section>
      <Section title="Tipografia">
        <div>
          <label className="text-xs text-slate-400 block mb-0.5">Fonte</label>
          <select value={d.fonte} onChange={e => upd({ fonte: e.target.value })} className={inp}>
            {FONTES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <NumInput label="Tamanho (px)" value={d.tamanho} min={6} max={120} onChange={v => upd({ tamanho: v })}/>
        <div className="flex gap-1">
          {[
            { k: 'negrito', l: 'N', s: 'bold' }, { k: 'italico', l: 'I', s: 'italic' }, { k: 'sublinhado', l: 'S', s: 'underline' },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => upd({ [k]: !d[k as keyof TextoDados] as unknown as boolean })}
              className={`flex-1 py-1 rounded border text-xs font-bold ${d[k as keyof TextoDados] ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500'}`}>
              {l}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-0.5">Alinhamento</label>
          <div className="flex gap-1">
            {(['left','center','right','justify'] as const).map(a => (
              <button key={a} onClick={() => upd({ alinhamento: a })}
                className={`flex-1 py-1 rounded border text-xs ${d.alinhamento === a ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500'}`}>
                {a === 'left' ? '←' : a === 'center' ? '↔' : a === 'right' ? '→' : '≡'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative"><ColorInput label="Cor do texto" value={d.cor} onChange={c => upd({ cor: c })}/></div>
        <div className="relative"><ColorInput label="Cor de fundo" value={d.cor_fundo} onChange={c => upd({ cor_fundo: c })}/></div>
        <NumInput label="Padding (px)" value={d.padding} min={0} max={40} onChange={v => upd({ padding: v })}/>
        <NumInput label="Arredondamento" value={d.borda_arredondada} min={0} max={50} onChange={v => upd({ borda_arredondada: v })}/>
      </Section>
    </>
  );
}

// ── Props IMAGEM ──────────────────────────────────────────────────────────────
function PropsImagem({ el, onChange }: { el: Elemento; onChange: (p: Partial<Elemento>) => void }) {
  const d = el.dados as ImagemDados;
  const upd = (patch: Partial<ImagemDados>) => onChange({ dados: { ...d, ...patch } });
  return (
    <Section title="Imagem">
      {d.url && <img src={d.url} className="w-full h-28 object-cover rounded-lg border border-slate-200 mb-2" alt="preview"/>}
      <div>
        <label className="text-xs text-slate-400 block mb-0.5">URL</label>
        <input value={d.url} onChange={e => upd({ url: e.target.value })} placeholder="https://..." className={inp}/>
      </div>
      <div>
        <label className="text-xs text-slate-400 block mb-0.5">Ajuste</label>
        <select value={d.object_fit} onChange={e => upd({ object_fit: e.target.value as ImagemDados['object_fit'] })} className={inp}>
          <option value="cover">Cobrir (cover)</option>
          <option value="contain">Conter (contain)</option>
          <option value="fill">Preencher (fill)</option>
        </select>
      </div>
      <SliderInput label="Arredondamento" value={d.borda_arredondada} min={0} max={50} onChange={v => upd({ borda_arredondada: v })}/>
      <SliderInput label="Opacidade" value={Math.round(d.opacidade * 100)} min={0} max={100} onChange={v => upd({ opacidade: v / 100 })}/>
    </Section>
  );
}

// ── Props FORMA ───────────────────────────────────────────────────────────────
function PropsForma({ el, onChange }: { el: Elemento; onChange: (p: Partial<Elemento>) => void }) {
  const d = el.dados as FormaDados;
  const upd = (patch: Partial<FormaDados>) => onChange({ dados: { ...d, ...patch } });
  return (
    <Section title="Forma">
      <div>
        <label className="text-xs text-slate-400 block mb-0.5">Tipo</label>
        <select value={d.tipo} onChange={e => upd({ tipo: e.target.value as FormaDados['tipo'] })} className={inp}>
          <option value="retangulo">Retângulo</option>
          <option value="elipse">Elipse / Círculo</option>
          <option value="linha">Linha</option>
        </select>
      </div>
      <div className="relative"><ColorInput label="Cor de preenchimento" value={d.cor_preenchimento} onChange={c => upd({ cor_preenchimento: c })}/></div>
      <div className="relative"><ColorInput label="Cor da borda" value={d.cor_borda} onChange={c => upd({ cor_borda: c })}/></div>
      <NumInput label="Espessura da borda" value={d.espessura_borda} min={0} max={20} onChange={v => upd({ espessura_borda: v })}/>
      {d.tipo === 'retangulo' && <SliderInput label="Arredondamento" value={d.borda_arredondada} min={0} max={50} onChange={v => upd({ borda_arredondada: v })}/>}
      <SliderInput label="Opacidade" value={Math.round(d.opacidade * 100)} min={0} max={100} onChange={v => upd({ opacidade: v / 100 })}/>
    </Section>
  );
}

// ── Props LOGO ────────────────────────────────────────────────────────────────
function PropsLogo({ el, onChange, config }: { el: Elemento; onChange: (p: Partial<Elemento>) => void; config: OrcConfig }) {
  const d = el.dados as LogoDados;
  const upd = (patch: Partial<LogoDados>) => onChange({ dados: { ...d, ...patch } });
  return (
    <Section title="Logo">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={d.usar_logo_config} onChange={e => upd({ usar_logo_config: e.target.checked })} className="w-3.5 h-3.5 accent-purple-600"/>
        <span className="text-xs text-slate-600">Usar logo das configurações globais</span>
      </label>
      {!d.usar_logo_config && (
        <div>
          <label className="text-xs text-slate-400 block mb-0.5">URL customizada</label>
          <input value={d.url_custom ?? ''} onChange={e => upd({ url_custom: e.target.value })} placeholder="https://..." className={inp}/>
        </div>
      )}
      {d.usar_logo_config && config.logo_url && (
        <img src={config.logo_url} className="h-12 object-contain border border-slate-200 rounded p-1" alt="logo"/>
      )}
      <NumInput label="Arredondamento" value={d.borda_arredondada} min={0} max={50} onChange={v => upd({ borda_arredondada: v })}/>
    </Section>
  );
}

// ── Props PRODUTO CARD ────────────────────────────────────────────────────────
function PropsProdutoCard({
  el, onChange, itens, imageMap,
}: { el: Elemento; onChange: (p: Partial<Elemento>) => void; itens: ItemOrcamento[]; imageMap: Record<string, string[]> }) {
  const d = el.dados as ProdutoCardDados;
  const upd = (patch: Partial<ProdutoCardDados>) => onChange({ dados: { ...d, ...patch } });
  const imgs = imageMap[d.produto_id] ?? [];

  return (
    <>
      <Section title="Produto">
        <div>
          <label className="text-xs text-slate-400 block mb-0.5">Produto</label>
          <select value={d.produto_id} onChange={e => upd({ produto_id: e.target.value })} className={inp}>
            {itens.filter(i => i.produto_id).map(i => <option key={i.produto_id} value={i.produto_id!}>{i.produto_nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Imagens a exibir</label>
          <div className="flex gap-1 flex-wrap">
            {imgs.map((url, i) => (
              <button key={i} onClick={() => {
                const sel = d.imagens_selecionadas.includes(i)
                  ? d.imagens_selecionadas.filter(x => x !== i)
                  : [...d.imagens_selecionadas, i];
                upd({ imagens_selecionadas: sel });
              }}
                className={`w-8 h-8 rounded border overflow-hidden ${d.imagens_selecionadas.includes(i) ? 'border-purple-500 ring-2 ring-purple-300' : 'border-slate-200'}`}>
                <img src={url} className="w-full h-full object-cover" alt=""/>
              </button>
            ))}
            {imgs.length === 0 && <span className="text-xs text-slate-400">Sem imagens cadastradas</span>}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-0.5">Layout</label>
          <div className="flex gap-1">
            <button onClick={() => upd({ layout: 'vertical' })}
              className={`flex-1 py-1 rounded border text-xs ${d.layout === 'vertical' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500'}`}>
              Vertical
            </button>
            <button onClick={() => upd({ layout: 'horizontal' })}
              className={`flex-1 py-1 rounded border text-xs ${d.layout === 'horizontal' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500'}`}>
              Horizontal
            </button>
          </div>
        </div>
        {[['mostrar_preco','Mostrar preço'],['mostrar_descricao','Mostrar descrição'],['mostrar_codigo','Mostrar código']].map(([k, l]) => (
          <label key={k} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={d[k as keyof ProdutoCardDados] as boolean} onChange={e => upd({ [k]: e.target.checked })} className="w-3.5 h-3.5 accent-purple-600"/>
            <span className="text-xs text-slate-600">{l}</span>
          </label>
        ))}
      </Section>
      <Section title="Estilo">
        <div className="relative"><ColorInput label="Cor de fundo" value={d.cor_fundo} onChange={c => upd({ cor_fundo: c })}/></div>
        <div className="relative"><ColorInput label="Cor do texto" value={d.cor_texto} onChange={c => upd({ cor_texto: c })}/></div>
        <NumInput label="Arredondamento" value={d.borda_arredondada} min={0} max={50} onChange={v => upd({ borda_arredondada: v })}/>
      </Section>
    </>
  );
}

// ── Props TABELA ──────────────────────────────────────────────────────────────
function PropsTabela({ el, onChange }: { el: Elemento; onChange: (p: Partial<Elemento>) => void }) {
  const d = el.dados as TabelaDados;
  const upd = (patch: Partial<TabelaDados>) => onChange({ dados: { ...d, ...patch } });
  return (
    <>
      <Section title="Colunas">
        {COLUNAS_TABELA.map(col => (
          <label key={col.id} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={d.colunas_visiveis.includes(col.id)}
              onChange={e => {
                const next = e.target.checked
                  ? [...d.colunas_visiveis, col.id]
                  : d.colunas_visiveis.filter(c => c !== col.id);
                upd({ colunas_visiveis: next });
              }}
              className="w-3.5 h-3.5 accent-purple-600"/>
            <span className="text-xs text-slate-600">{col.label}</span>
          </label>
        ))}
        <label className="flex items-center gap-2 cursor-pointer mt-1">
          <input type="checkbox" checked={d.mostrar_total} onChange={e => upd({ mostrar_total: e.target.checked })} className="w-3.5 h-3.5 accent-purple-600"/>
          <span className="text-xs text-slate-600">Mostrar linha de total</span>
        </label>
      </Section>
      <Section title="Cores">
        <div className="relative"><ColorInput label="Cabeçalho" value={d.cor_cabecalho} onChange={c => upd({ cor_cabecalho: c })}/></div>
        <div className="relative"><ColorInput label="Linhas pares" value={d.cor_linhas_pares} onChange={c => upd({ cor_linhas_pares: c })}/></div>
        <div className="relative"><ColorInput label="Linhas ímpares" value={d.cor_linhas_impares} onChange={c => upd({ cor_linhas_impares: c })}/></div>
        <div className="relative"><ColorInput label="Borda" value={d.cor_borda} onChange={c => upd({ cor_borda: c })}/></div>
        <div className="relative"><ColorInput label="Texto" value={d.cor_texto} onChange={c => upd({ cor_texto: c })}/></div>
      </Section>
      <Section title="Fonte">
        <NumInput label="Tamanho (px)" value={d.fonte_tamanho} min={8} max={20} onChange={v => upd({ fonte_tamanho: v })}/>
      </Section>
    </>
  );
}

// ── Props CAMPO_DADO ──────────────────────────────────────────────────────────
function PropsCampoDado({ el, onChange }: { el: Elemento; onChange: (p: Partial<Elemento>) => void }) {
  const d = el.dados as CampoDadoDados;
  const upd = (patch: Partial<CampoDadoDados>) => onChange({ dados: { ...d, ...patch } });

  const grupos = [...new Set(CAMPOS_DADOS.map(c => c.grupo))];

  return (
    <>
      <Section title="Campo">
        <div>
          <label className="text-xs text-slate-400 block mb-0.5">Dado a exibir</label>
          <select value={d.chave} onChange={e => upd({ chave: e.target.value })} className={inp}>
            {grupos.map(grupo => (
              <optgroup key={grupo} label={grupo}>
                {CAMPOS_DADOS.filter(c => c.grupo === grupo).map(c => (
                  <option key={c.chave} value={c.chave}>{c.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={d.label_visivel} onChange={e => upd({ label_visivel: e.target.checked })} className="w-3.5 h-3.5 accent-purple-600"/>
          <span className="text-xs text-slate-600">Mostrar label</span>
        </label>
        {d.label_visivel && (
          <>
            <div>
              <label className="text-xs text-slate-400 block mb-0.5">Texto do label</label>
              <input value={d.label_texto} onChange={e => upd({ label_texto: e.target.value })} className={inp}/>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-0.5">Posição do label</label>
              <div className="flex gap-1">
                <button onClick={() => upd({ label_posicao: 'acima' })}
                  className={`flex-1 py-1 rounded border text-xs ${d.label_posicao === 'acima' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500'}`}>
                  Acima
                </button>
                <button onClick={() => upd({ label_posicao: 'lado' })}
                  className={`flex-1 py-1 rounded border text-xs ${d.label_posicao === 'lado' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500'}`}>
                  Ao lado
                </button>
              </div>
            </div>
            <NumInput label="Tamanho label (px)" value={d.tamanho_label} min={6} max={40} onChange={v => upd({ tamanho_label: v })}/>
          </>
        )}
      </Section>
      <Section title="Tipografia">
        <div>
          <label className="text-xs text-slate-400 block mb-0.5">Fonte</label>
          <select value={d.fonte} onChange={e => upd({ fonte: e.target.value })} className={inp}>
            {FONTES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <NumInput label="Tamanho valor (px)" value={d.tamanho_valor} min={6} max={80} onChange={v => upd({ tamanho_valor: v })}/>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={d.negrito_valor} onChange={e => upd({ negrito_valor: e.target.checked })} className="w-3.5 h-3.5 accent-purple-600"/>
          <span className="text-xs text-slate-600">Negrito no valor</span>
        </label>
        <div>
          <label className="text-xs text-slate-400 block mb-0.5">Alinhamento</label>
          <div className="flex gap-1">
            {(['left','center','right'] as const).map(a => (
              <button key={a} onClick={() => upd({ alinhamento: a })}
                className={`flex-1 py-1 rounded border text-xs ${d.alinhamento === a ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500'}`}>
                {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative"><ColorInput label="Cor do texto" value={d.cor} onChange={c => upd({ cor: c })}/></div>
        <div className="relative"><ColorInput label="Cor de fundo" value={d.cor_fundo} onChange={c => upd({ cor_fundo: c })}/></div>
        <NumInput label="Padding (px)" value={d.padding} min={0} max={40} onChange={v => upd({ padding: v })}/>
        <NumInput label="Arredondamento" value={d.borda_arredondada} min={0} max={50} onChange={v => upd({ borda_arredondada: v })}/>
      </Section>
    </>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
interface PropsPanelProps {
  el: Elemento;
  itens: ItemOrcamento[];
  imageMap: Record<string, string[]>;
  config: OrcConfig;
  onChange: (patch: Partial<Elemento>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBack: () => void;
  onToggleLock: () => void;
  onToggleVisible: () => void;
}

export default function PropertiesPanel({
  el, itens, imageMap, config,
  onChange, onDelete, onDuplicate, onBringForward, onSendBack, onToggleLock, onToggleVisible,
}: PropsPanelProps) {
  return (
    <div className="w-56 bg-white border-l border-slate-200 flex flex-col shrink-0">
      <div className="px-3 py-2 border-b border-slate-200 shrink-0">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Propriedades</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* Actions */}
        <div className="grid grid-cols-3 gap-1">
          <button onClick={onDelete} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 text-xs">
            <Trash2 size={13}/><span>Excluir</span>
          </button>
          <button onClick={onDuplicate} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 text-xs">
            <Copy size={13}/><span>Duplicar</span>
          </button>
          <button onClick={onToggleLock} className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-xs ${el.bloqueado ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
            {el.bloqueado ? <Lock size={13}/> : <Unlock size={13}/>}<span>{el.bloqueado ? 'Desbloquear' : 'Bloquear'}</span>
          </button>
          <button onClick={onBringForward} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 text-xs">
            <ChevronUp size={13}/><span>Frente</span>
          </button>
          <button onClick={onSendBack} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 text-xs">
            <ChevronDown size={13}/><span>Atrás</span>
          </button>
          <button onClick={onToggleVisible} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 text-xs">
            {el.visivel ? <Eye size={13}/> : <EyeOff size={13}/>}<span>{el.visivel ? 'Ocultar' : 'Mostrar'}</span>
          </button>
        </div>

        {/* Position & Size */}
        <Section title="Posição e Tamanho">
          <div className="grid grid-cols-2 gap-1.5">
            <NumInput label="X" value={Math.round(el.x)} onChange={v => onChange({ x: v })}/>
            <NumInput label="Y" value={Math.round(el.y)} onChange={v => onChange({ y: v })}/>
            <NumInput label="Largura" value={Math.round(el.largura)} min={10} onChange={v => onChange({ largura: v })}/>
            <NumInput label="Altura" value={Math.round(el.altura)} min={10} onChange={v => onChange({ altura: v })}/>
          </div>
          <SliderInput label="Rotação" value={el.rotacao} min={0} max={360} onChange={v => onChange({ rotacao: v })}/>
          <SliderInput label="Opacidade %" value={Math.round(el.opacidade * 100)} min={0} max={100} onChange={v => onChange({ opacidade: v / 100 })}/>
        </Section>

        {/* Type-specific */}
        {el.tipo === 'TEXTO'          && <PropsTexto el={el} onChange={onChange}/>}
        {el.tipo === 'IMAGEM'         && <PropsImagem el={el} onChange={onChange}/>}
        {el.tipo === 'FORMA'          && <PropsForma el={el} onChange={onChange}/>}
        {el.tipo === 'LOGO'           && <PropsLogo el={el} onChange={onChange} config={config}/>}
        {el.tipo === 'PRODUTO_CARD'   && <PropsProdutoCard el={el} onChange={onChange} itens={itens} imageMap={imageMap}/>}
        {el.tipo === 'TABELA_PRODUTOS'&& <PropsTabela el={el} onChange={onChange}/>}
        {el.tipo === 'CAMPO_DADO'     && <PropsCampoDado el={el} onChange={onChange}/>}
      </div>
    </div>
  );
}
