-- DROP CASCADE das 9 tabelas SCM legado (inglês)
-- Confirmado: 0 registros, 0 referências no código, duplicatas das tabelas em português
-- Equivalências: scm_vehicles→scm_veiculos, scm_routes→scm_rotas,
-- scm_shipments→scm_embarques, scm_drivers→scm_veiculos.motorista_nome,
-- scm_deliveries→scm_rastreamento, scm_freight_audits→scm_auditoria_fretes,
-- scm_reverse_logistics→scm_devolucoes, scm_packing_orders→scm_embalagens,
-- scm_dock_sessions→scm_docas
DROP TABLE IF EXISTS public.scm_deliveries        CASCADE;
DROP TABLE IF EXISTS public.scm_dock_sessions     CASCADE;
DROP TABLE IF EXISTS public.scm_drivers           CASCADE;
DROP TABLE IF EXISTS public.scm_freight_audits    CASCADE;
DROP TABLE IF EXISTS public.scm_packing_orders    CASCADE;
DROP TABLE IF EXISTS public.scm_reverse_logistics CASCADE;
DROP TABLE IF EXISTS public.scm_routes            CASCADE;
DROP TABLE IF EXISTS public.scm_shipments         CASCADE;
DROP TABLE IF EXISTS public.scm_vehicles          CASCADE;
