-- Etapa 7: Trigger — embarque entregue com valor_frete → lançamento financeiro
-- Cria automaticamente um lançamento de DESPESA em erp_lancamentos

CREATE OR REPLACE FUNCTION scm_on_embarque_frete_lancamento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Só age ao mudar para 'entregue' pela primeira vez com valor_frete preenchido
  IF NEW.status = 'entregue'
     AND (OLD.status IS NULL OR OLD.status <> 'entregue')
     AND NEW.valor_frete IS NOT NULL
     AND NEW.valor_frete > 0
  THEN
    INSERT INTO erp_lancamentos (
      tenant_id,
      tipo,
      categoria,
      descricao,
      valor,
      data_vencimento,
      status,
      created_at
    ) VALUES (
      NEW.tenant_id,
      'DESPESA',
      'FRETE',
      'Frete — embarque ' || NEW.numero
        || CASE WHEN NEW.transportadora IS NOT NULL
                THEN ' (' || NEW.transportadora || ')'
                ELSE '' END,
      NEW.valor_frete,
      COALESCE(NEW.data_entrega::DATE, CURRENT_DATE),
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
