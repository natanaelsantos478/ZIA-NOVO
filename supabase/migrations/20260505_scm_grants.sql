-- GRANTs obrigatórios para todas as tabelas SCM novas
-- Sem isso o Supabase retorna 401 mesmo com RLS habilitado e policy USING(true)
GRANT ALL ON TABLE
  scm_veiculos,
  scm_rotas,
  scm_embarques,
  scm_rastreamento,
  scm_docas,
  scm_embalagens,
  scm_crossdock,
  scm_devolucoes,
  scm_auditoria_fretes,
  scm_esg_metricas,
  scm_cold_chain,
  scm_drones,
  scm_embarque_itens
TO anon, authenticated, service_role;
