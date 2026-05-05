-- Corrige o trigger de frete: erp_lancamentos não existe
-- A tabela correta é erp_financeiro_lancamentos

CREATE OR REPLACE FUNCTION scm_on_embarque_entregue()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status = 'entregue'
     AND OLD.status <> 'entregue'
     AND NEW.pedido_id IS NOT NULL
  THEN
    UPDATE erp_pedidos
    SET status = 'REALIZADO'
    WHERE id = NEW.pedido_id::UUID
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

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION scm_on_embarque_frete_lancamento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_transp_nome TEXT;
  v_data_vcto   DATE;
BEGIN
  IF NEW.status = 'entregue'
     AND OLD.status <> 'entregue'
     AND NEW.valor_frete IS NOT NULL
     AND NEW.valor_frete > 0
  THEN
    IF EXISTS (
      SELECT 1 FROM erp_financeiro_lancamentos
      WHERE tenant_id = NEW.tenant_id
        AND categoria = 'FRETE'
        AND descricao LIKE '%embarque ' || NEW.numero || '%'
    ) THEN
      RETURN NEW;
    END IF;

    IF NEW.transportadora IS NOT NULL THEN
      v_transp_nome := NEW.transportadora;
    ELSIF NEW.transportadora_id IS NOT NULL THEN
      SELECT nome INTO v_transp_nome FROM erp_fornecedores WHERE id = NEW.transportadora_id;
    END IF;

    BEGIN
      v_data_vcto := COALESCE(NEW.data_entrega::DATE, CURRENT_DATE);
    EXCEPTION WHEN OTHERS THEN
      v_data_vcto := CURRENT_DATE;
    END;

    INSERT INTO erp_financeiro_lancamentos (
      tenant_id, tipo, categoria, descricao,
      valor, data_vencimento, status, created_at
    ) VALUES (
      NEW.tenant_id,
      'DESPESA',
      'FRETE',
      'Frete — embarque ' || NEW.numero
        || CASE WHEN v_transp_nome IS NOT NULL THEN ' (' || v_transp_nome || ')' ELSE '' END,
      NEW.valor_frete,
      v_data_vcto,
      'PENDENTE',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scm_embarque_frete_lancamento ON scm_embarques;
CREATE TRIGGER trg_scm_embarque_frete_lancamento
  AFTER UPDATE OF status ON scm_embarques
  FOR EACH ROW
  EXECUTE FUNCTION scm_on_embarque_frete_lancamento();
