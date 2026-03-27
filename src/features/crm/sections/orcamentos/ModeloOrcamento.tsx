// ─────────────────────────────────────────────────────────────────────────────
// ModeloOrcamento.tsx — Modelos estruturados de documento de orçamento
// 4 templates HTML profissionais — dados 100% reais, zero mocks
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react';
import { Printer, FileText, Check } from 'lucide-react';
import type { OrcConfig, ModeloDocumentoId } from './types';
import type { NegociacaoData, Orcamento as OrcBase, ItemOrcamento } from '../../data/crmData';
import type { ErpProdutoFoto } from '../../../../lib/erp';

// ── Props ─────────────────────────────────────────────────────────────────────
interface ModeloOrcamentoProps {
  orcamento: OrcBase;
  negociacao: NegociacaoData;
  config: OrcConfig;
  fotos: Record<string, ErpProdutoFoto[]>;
  defaultTemplate?: ModeloDocumentoId;
}

type TemplateId = ModeloDocumentoId;

interface TemplateOption {
  id: TemplateId;
  nome: string;
  descricao: string;
}

const TEMPLATES: TemplateOption[] = [
  { id: 'classico',  nome: 'Clássico',  descricao: 'Documento formal com tabela de produtos e termos completos' },
  { id: 'moderno',   nome: 'Moderno',   descricao: 'Layout limpo com destaque visual no total e cores da empresa' },
  { id: 'compacto',  nome: 'Compacto',  descricao: 'Uma página objetiva, ideal para orçamentos simples' },
  { id: 'executivo', nome: 'Executivo', descricao: 'Formato completo com imagens de produto e área de assinatura' },
];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d?: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

// ── Logo com fallback ─────────────────────────────────────────────────────────
function Logo({ url, empresa, className }: { url: string; empresa: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={empresa}
        className={className ?? 'h-10 object-contain'}
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className="font-bold text-lg">{empresa}</span>;
}

// ── Cálculos ──────────────────────────────────────────────────────────────────
function calcTotais(orc: OrcBase) {
  const sub = orc.itens.reduce((s, i) => s + i.total, 0);
  const desc = sub * (orc.desconto_global_pct / 100);
  const total = sub - desc + orc.frete;
  return { sub, desc, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1 — Clássico
// ─────────────────────────────────────────────────────────────────────────────
function TemplateClassico({ orc, neg, config }: { orc: OrcBase; neg: NegociacaoData; config: OrcConfig }) {
  const { sub, desc, total } = calcTotais(orc);
  const primary = config.cor_primaria;
  const cliente = neg.negociacao.clienteNome;

  return (
    <div style={{ fontFamily: config.fonte_padrao + ', Arial, sans-serif', fontSize: 13, color: '#1e293b', background: '#fff', padding: 32, minHeight: 1050 }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `3px solid ${primary}`, paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <Logo url={config.logo_url} empresa={config.empresa} className="h-12 object-contain mb-2" />
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{config.empresa}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: primary }}>{orc.numero ?? 'ORC-000000'}</p>
          <p style={{ fontSize: 11, color: '#64748b' }}>Data: {fmtDate(orc.dataCriacao)}</p>
          <p style={{ fontSize: 11, color: '#64748b' }}>Validade: {fmtDate(orc.validade)}</p>
          <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: primary + '20', color: primary }}>
            {orc.status?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Dados do cliente */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Cliente</p>
        <p style={{ fontWeight: 600, fontSize: 15 }}>{cliente}</p>
        {neg.negociacao.descricao && <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{neg.negociacao.descricao}</p>}
      </div>

      {/* Tabela de produtos */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
        <thead>
          <tr style={{ background: primary, color: '#fff' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Produto</th>
            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, width: 60 }}>Cód.</th>
            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, width: 50 }}>Un.</th>
            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, width: 60 }}>Qtd.</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, width: 100 }}>Preço Unit.</th>
            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, width: 60 }}>Desc.%</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, width: 100 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {orc.itens.length === 0 ? (
            <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum produto adicionado</td></tr>
          ) : orc.itens.map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '7px 10px', fontWeight: 500 }}>{item.produto_nome}</td>
              <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b', fontSize: 11 }}>{item.codigo ?? '—'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{item.unidade ?? 'un'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'center' }}>{item.quantidade}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right' }}>{fmt(item.preco_unitario)}</td>
              <td style={{ padding: '7px 10px', textAlign: 'center', color: item.desconto_pct > 0 ? '#16a34a' : '#94a3b8' }}>
                {item.desconto_pct > 0 ? `${item.desconto_pct}%` : '—'}
              </td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totais + Condições */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1, fontSize: 12, color: '#475569' }}>
          <p><strong>Condição de Pagamento:</strong> {orc.condicao_pagamento || '—'}</p>
          <p><strong>Prazo de Entrega:</strong> {orc.prazo_entrega || '—'}</p>
          <p><strong>Forma de Entrega:</strong> {orc.forma_entrega || '—'}</p>
          {orc.local_entrega && <p><strong>Local de Entrega:</strong> {orc.local_entrega}</p>}
          {orc.vendedor && <p><strong>Vendedor:</strong> {orc.vendedor}</p>}
        </div>
        <div style={{ width: 220, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
            <span style={{ color: '#64748b' }}>Subtotal</span><span>{fmt(sub)}</span>
          </div>
          {orc.desconto_global_pct > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#16a34a' }}>
              <span>Desconto ({orc.desconto_global_pct}%)</span><span>-{fmt(desc)}</span>
            </div>
          )}
          {orc.frete > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#64748b' }}>
              <span>Frete</span><span>{fmt(orc.frete)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', fontSize: 15, fontWeight: 700, borderTop: `2px solid ${primary}`, marginTop: 4, color: primary }}>
            <span>TOTAL</span><span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Condições comerciais + Obs */}
      {(orc.condicoes_comerciais || orc.observacoes) && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: 12 }}>
          {orc.condicoes_comerciais && (
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '10px 14px' }}>
              <p style={{ fontWeight: 700, marginBottom: 4, color: '#475569' }}>Condições Comerciais</p>
              <p style={{ color: '#64748b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{orc.condicoes_comerciais}</p>
            </div>
          )}
          {orc.observacoes && (
            <div style={{ flex: 1, background: '#fffbeb', borderRadius: 6, padding: '10px 14px' }}>
              <p style={{ fontWeight: 700, marginBottom: 4, color: '#92400e' }}>Observações</p>
              <p style={{ color: '#78350f', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{orc.observacoes}</p>
            </div>
          )}
        </div>
      )}

      {/* Rodapé */}
      {config.texto_rodape && (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          {config.texto_rodape}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2 — Moderno
// ─────────────────────────────────────────────────────────────────────────────
function TemplateModerno({ orc, neg, config }: { orc: OrcBase; neg: NegociacaoData; config: OrcConfig }) {
  const { sub, desc, total } = calcTotais(orc);
  const primary = config.cor_primaria;

  return (
    <div style={{ fontFamily: config.fonte_padrao + ', Arial, sans-serif', fontSize: 13, color: '#1e293b', background: '#fff', minHeight: 1050 }}>
      {/* Barra de topo colorida */}
      <div style={{ background: primary, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo url={config.logo_url} empresa={config.empresa} className="h-10 object-contain brightness-0 invert" />
        <div style={{ textAlign: 'right', color: '#fff' }}>
          <p style={{ fontSize: 13, opacity: 0.8 }}>Orçamento</p>
          <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{orc.numero ?? 'ORC-000000'}</p>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Duas colunas: cliente e total */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Para</p>
            <p style={{ fontSize: 16, fontWeight: 700 }}>{neg.negociacao.clienteNome}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Validade: {fmtDate(orc.validade)} · Vendedor: {orc.vendedor || '—'}
            </p>
          </div>
          <div style={{ width: 200, borderRadius: 10, padding: 16, background: primary, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <p style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>Valor Total</p>
            <p style={{ fontSize: 26, fontWeight: 800 }}>{fmt(total)}</p>
            {orc.desconto_global_pct > 0 && <p style={{ fontSize: 11, opacity: 0.8 }}>{orc.desconto_global_pct}% desc. aplicado</p>}
          </div>
        </div>

        {/* Tabela de itens */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${primary}` }}>
              <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Produto</th>
              <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#475569', width: 60 }}>Qtd.</th>
              <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#475569', width: 110 }}>Preço Unit.</th>
              <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#475569', width: 70 }}>Desc.%</th>
              <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#475569', width: 110 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orc.itens.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum produto</td></tr>
            ) : orc.itens.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '9px 6px' }}>
                  <p style={{ fontWeight: 600 }}>{item.produto_nome}</p>
                  {item.codigo && <p style={{ fontSize: 10, color: '#94a3b8' }}>{item.codigo} · {item.unidade}</p>}
                </td>
                <td style={{ padding: '9px 6px', textAlign: 'center' }}>{item.quantidade}</td>
                <td style={{ padding: '9px 6px', textAlign: 'right' }}>{fmt(item.preco_unitario)}</td>
                <td style={{ padding: '9px 6px', textAlign: 'center', color: item.desconto_pct > 0 ? '#16a34a' : '#cbd5e1' }}>
                  {item.desconto_pct > 0 ? `${item.desconto_pct}%` : '—'}
                </td>
                <td style={{ padding: '9px 6px', textAlign: 'right', fontWeight: 700 }}>{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Rodapé com condições e totais */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
            <p><strong style={{ color: '#475569' }}>Pagamento:</strong> {orc.condicao_pagamento || '—'}</p>
            <p><strong style={{ color: '#475569' }}>Entrega:</strong> {orc.prazo_entrega || '—'} · {orc.forma_entrega || '—'}</p>
            {orc.observacoes && <p style={{ marginTop: 8, color: '#78350f', background: '#fffbeb', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid #f59e0b' }}>{orc.observacoes}</p>}
          </div>
          <div style={{ width: 200, fontSize: 12 }}>
            {sub !== total && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#64748b' }}>
                  <span>Subtotal</span><span>{fmt(sub)}</span>
                </div>
                {orc.desconto_global_pct > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#16a34a' }}>
                    <span>Desconto</span><span>-{fmt(desc)}</span>
                  </div>
                )}
                {orc.frete > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#64748b' }}>
                    <span>Frete</span><span>{fmt(orc.frete)}</span>
                  </div>
                )}
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: primary, color: '#fff', borderRadius: 8, marginTop: 6, fontWeight: 700, fontSize: 14 }}>
              <span>TOTAL</span><span>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3 — Compacto
// ─────────────────────────────────────────────────────────────────────────────
function TemplateCompacto({ orc, neg, config }: { orc: OrcBase; neg: NegociacaoData; config: OrcConfig }) {
  const { sub, desc, total } = calcTotais(orc);
  const primary = config.cor_primaria;

  return (
    <div style={{ fontFamily: config.fonte_padrao + ', Arial, sans-serif', fontSize: 12, color: '#1e293b', background: '#fff', padding: 28, maxWidth: 680 }}>
      {/* Cabeçalho compacto */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Logo url={config.logo_url} empresa={config.empresa} className="h-8 object-contain" />
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: primary }}>{orc.numero ?? 'ORC-000000'}</p>
          <p style={{ fontSize: 10, color: '#94a3b8' }}>Válido até {fmtDate(orc.validade)}</p>
        </div>
      </div>

      <div style={{ borderTop: `2px solid ${primary}`, marginBottom: 14 }} />

      {/* Cliente e condições em linha */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 11, color: '#475569' }}>
        <div>
          <span style={{ fontWeight: 700 }}>Cliente: </span>{neg.negociacao.clienteNome}
        </div>
        <div>
          <span style={{ fontWeight: 700 }}>Pagamento: </span>{orc.condicao_pagamento || '—'}
          {orc.prazo_entrega && <> · <span style={{ fontWeight: 700 }}>Entrega: </span>{orc.prazo_entrega}</>}
        </div>
      </div>

      {/* Tabela compacta */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 11 }}>
        <thead>
          <tr style={{ background: primary + '15', borderBottom: `1px solid ${primary}` }}>
            <th style={{ padding: '6px 8px', textAlign: 'left', color: primary, fontWeight: 700 }}>Produto</th>
            <th style={{ padding: '6px 8px', textAlign: 'center', color: primary, fontWeight: 700, width: 50 }}>Qtd.</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', color: primary, fontWeight: 700, width: 90 }}>Unit.</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', color: primary, fontWeight: 700, width: 90 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {orc.itens.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Sem itens</td></tr>
          ) : orc.itens.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '5px 8px' }}>{item.produto_nome}
                {item.desconto_pct > 0 && <span style={{ color: '#16a34a', marginLeft: 4 }}>(-{item.desconto_pct}%)</span>}
              </td>
              <td style={{ padding: '5px 8px', textAlign: 'center' }}>{item.quantidade} {item.unidade}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmt(item.preco_unitario)}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totais inline */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, fontSize: 11, marginBottom: 12 }}>
        {orc.desconto_global_pct > 0 && (
          <span style={{ color: '#16a34a' }}>Desc. global: -{fmt(desc)}</span>
        )}
        {orc.frete > 0 && <span style={{ color: '#64748b' }}>Frete: {fmt(orc.frete)}</span>}
        <span style={{ fontWeight: 700, fontSize: 13, color: primary }}>TOTAL: {fmt(total)}</span>
      </div>

      {/* Obs */}
      {orc.observacoes && (
        <p style={{ fontSize: 11, color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
          <strong>Obs:</strong> {orc.observacoes}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4 — Executivo
// ─────────────────────────────────────────────────────────────────────────────
function TemplateExecutivo({
  orc, neg, config, fotos,
}: { orc: OrcBase; neg: NegociacaoData; config: OrcConfig; fotos: Record<string, ErpProdutoFoto[]> }) {
  const { sub, desc, total } = calcTotais(orc);
  const primary = config.cor_primaria;

  return (
    <div style={{ fontFamily: config.fonte_padrao + ', Arial, sans-serif', fontSize: 13, color: '#1e293b', background: '#fff', minHeight: 1100 }}>
      {/* Header com faixa colorida */}
      <div style={{ display: 'flex' }}>
        <div style={{ width: 6, background: primary, minHeight: 140 }} />
        <div style={{ flex: 1, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Logo url={config.logo_url} empresa={config.empresa} className="h-12 object-contain mb-2" />
            <p style={{ fontSize: 11, color: '#64748b' }}>{config.empresa}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Orçamento Comercial</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: primary, margin: '4px 0' }}>{orc.numero ?? 'ORC-000000'}</p>
            <p style={{ fontSize: 11, color: '#64748b' }}>Emitido em {fmtDate(orc.dataCriacao)}</p>
            <p style={{ fontSize: 11, color: '#64748b' }}>Válido até {fmtDate(orc.validade)}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 28px 28px' }}>
        {/* Bloco cliente e vendedor */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, marginTop: 8 }}>
          <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Destinatário</p>
            <p style={{ fontWeight: 700, fontSize: 15 }}>{neg.negociacao.clienteNome}</p>
            {neg.negociacao.descricao && <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{neg.negociacao.descricao}</p>}
          </div>
          <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Informações Comerciais</p>
            <p style={{ fontSize: 12 }}><strong>Vendedor:</strong> {orc.vendedor || '—'}</p>
            <p style={{ fontSize: 12 }}><strong>Pagamento:</strong> {orc.condicao_pagamento || '—'}</p>
            <p style={{ fontSize: 12 }}><strong>Entrega:</strong> {orc.prazo_entrega || '—'}</p>
            {orc.forma_entrega && <p style={{ fontSize: 12 }}><strong>Frete:</strong> {orc.forma_entrega}</p>}
          </div>
        </div>

        {/* Itens com foto quando disponível */}
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Itens do Orçamento</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${primary}` }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', width: 44 }}></th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Produto</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#475569', width: 50 }}>Un.</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#475569', width: 60 }}>Qtd.</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#475569', width: 100 }}>Unit.</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#475569', width: 70 }}>Desc.</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#475569', width: 100 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orc.itens.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum produto adicionado</td></tr>
            ) : orc.itens.map((item, i) => {
              const fotoUrl = item.produto_id ? fotos[item.produto_id]?.[0]?.url : undefined;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '6px 8px' }}>
                    {fotoUrl
                      ? <img src={fotoUrl} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : <div style={{ width: 36, height: 36, background: '#f1f5f9', borderRadius: 4 }} />
                    }
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <p style={{ fontWeight: 600 }}>{item.produto_nome}</p>
                    {item.codigo && <p style={{ fontSize: 10, color: '#94a3b8' }}>Cód: {item.codigo}</p>}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748b' }}>{item.unidade ?? 'un'}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>{item.quantidade}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt(item.preco_unitario)}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: item.desconto_pct > 0 ? '#16a34a' : '#cbd5e1' }}>
                    {item.desconto_pct > 0 ? `${item.desconto_pct}%` : '—'}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>{fmt(item.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totais */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ width: 240, border: `1px solid ${primary}30`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', fontSize: 12, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
              <span>Subtotal</span><span>{fmt(sub)}</span>
            </div>
            {orc.desconto_global_pct > 0 && (
              <div style={{ padding: '8px 14px', fontSize: 12, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>Desconto ({orc.desconto_global_pct}%)</span><span>-{fmt(desc)}</span>
              </div>
            )}
            {orc.frete > 0 && (
              <div style={{ padding: '8px 14px', fontSize: 12, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Frete</span><span>{fmt(orc.frete)}</span>
              </div>
            )}
            <div style={{ padding: '12px 14px', background: primary, display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 700, fontSize: 15 }}>
              <span>TOTAL</span><span>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Condições e obs */}
        {(orc.condicoes_comerciais || orc.observacoes) && (
          <div style={{ display: 'flex', gap: 14, marginBottom: 20, fontSize: 12 }}>
            {orc.condicoes_comerciais && (
              <div style={{ flex: 1, background: '#f8fafc', borderLeft: `3px solid ${primary}`, padding: '10px 14px', borderRadius: '0 6px 6px 0' }}>
                <p style={{ fontWeight: 700, marginBottom: 4, color: '#475569' }}>Condições Comerciais</p>
                <p style={{ color: '#64748b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{orc.condicoes_comerciais}</p>
              </div>
            )}
            {orc.observacoes && (
              <div style={{ flex: 1, background: '#fffbeb', borderLeft: '3px solid #f59e0b', padding: '10px 14px', borderRadius: '0 6px 6px 0' }}>
                <p style={{ fontWeight: 700, marginBottom: 4, color: '#92400e' }}>Observações</p>
                <p style={{ color: '#78350f', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{orc.observacoes}</p>
              </div>
            )}
          </div>
        )}

        {/* Assinatura */}
        <div style={{ display: 'flex', gap: 40, marginTop: 40 }}>
          <div style={{ flex: 1, borderTop: '1px solid #cbd5e1', paddingTop: 8, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
            Assinatura do Vendedor — {orc.vendedor || config.empresa}
          </div>
          <div style={{ flex: 1, borderTop: '1px solid #cbd5e1', paddingTop: 8, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
            Assinatura e Carimbo do Cliente — {neg.negociacao.clienteNome}
          </div>
        </div>

        {config.texto_rodape && (
          <p style={{ marginTop: 20, fontSize: 10, color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
            {config.texto_rodape}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — seletor + renderizador
// ─────────────────────────────────────────────────────────────────────────────
export default function ModeloOrcamento({ orcamento, negociacao, config, fotos, defaultTemplate }: ModeloOrcamentoProps) {
  const [selected, setSelected] = useState<TemplateId>(defaultTemplate ?? config.modelo_documento_padrao ?? 'classico');
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>${orcamento.numero ?? 'Orçamento'}</title>
      <style>
        @page { margin: 12mm; }
        body { margin: 0; padding: 0; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      </style>
      </head><body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  const renderTemplate = () => {
    const props = { orc: orcamento, neg: negociacao, config, fotos };
    switch (selected) {
      case 'classico':  return <TemplateClassico {...props} />;
      case 'moderno':   return <TemplateModerno {...props} />;
      case 'compacto':  return <TemplateCompacto {...props} />;
      case 'executivo': return <TemplateExecutivo {...props} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Barra de seleção */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 shrink-0 flex-wrap">
        <span className="text-xs font-bold text-slate-500 tracking-wide mr-1">MODELO:</span>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            title={t.descricao}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              selected === t.id
                ? 'bg-purple-600 text-white border-purple-600'
                : 'border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-700'
            }`}
          >
            {selected === t.id && <Check className="w-3 h-3" />}
            <FileText className="w-3 h-3" />
            {t.nome}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 transition-all"
        >
          <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
        </button>
      </div>

      {/* Prévia do template */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-200 p-6">
        <div className="max-w-3xl mx-auto shadow-xl rounded-lg overflow-hidden" ref={printRef}>
          {renderTemplate()}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          Use <strong>Imprimir / PDF</strong> para gerar o PDF ou enviar ao cliente via impressora
        </p>
      </div>
    </div>
  );
}
