-- Etapa 6: Trigger — embarque entregue → pedido realizado
-- Quando scm_embarques.status muda para 'entregue' e há pedido_id vinculado,
-- atualiza erp_pedidos.status = 'REALIZADO'

CREATE OR REPLACE FUNCTION scm_on_embarque_entregue()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  -- Só age quando status muda para 'entregue' vindo de estado diferente
  IF NEW.status = 'entregue'
     AND OLD.status <> 'entregue'
     AND NEW.pedido_id IS NOT NULL
  THEN
    UPDATE erp_pedidos
    SET status = 'REALIZADO'
    WHERE id = NEW.pedido_id
      -- Evita regredir pedidos já em status pós-entrega
      AND status NOT IN ('REALIZADO', 'CANCELADO');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scm_embarque_entregue ON scm_embarques;

CREATE TRIGGER trg_scm_embarque_entregue
  AFTER UPDATE OF status ON scm_embarques
  FOR EACH ROW
  EXECUTE FUNCTION scm_on_embarque_entregue();
