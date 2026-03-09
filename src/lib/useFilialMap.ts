// ─────────────────────────────────────────────────────────────────────────────
// useFilialMap — Hook para exibir o nome da filial em listagens consolidadas
//
// Quando o usuário está em modo Matriz ou Holding, vários registros de filiais
// diferentes aparecem juntos. Este hook carrega o mapeamento tenant_id → nome.
// Em modo Filial (acesso isolado), retorna isMultiFilial=false e mapa vazio.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { getEmpresas } from './erp';

export interface FilialMap {
  /** true quando o contexto inclui mais de uma filial (modo Matriz ou Holding) */
  isMultiFilial: boolean;
  /** Mapa de tenant_id → nome_fantasia da filial */
  filialMap: Record<string, string>;
  /** Retorna o nome da filial para um tenant_id, ou '' se não encontrado */
  getFilialNome: (tenantId: string) => string;
}

export function useFilialMap(): FilialMap {
  const { orgContexto } = useAppContext();
  const [filialMap, setFilialMap] = useState<Record<string, string>>({});

  const isMultiFilial = !orgContexto.filial && (!!orgContexto.matriz || !!orgContexto.holding);

  useEffect(() => {
    if (!isMultiFilial) {
      setFilialMap({});
      return;
    }
    getEmpresas()
      .then(empresas => {
        const map: Record<string, string> = {};
        for (const e of empresas) map[e.id] = e.nome_fantasia;
        setFilialMap(map);
      })
      .catch(() => setFilialMap({}));
  }, [isMultiFilial]);

  return {
    isMultiFilial,
    filialMap,
    getFilialNome: (tenantId: string) => filialMap[tenantId] ?? '',
  };
}
