export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <span className="text-violet-600 font-semibold text-sm uppercase tracking-widest">ZIA Omnisystem</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Termos de Serviço</h1>
          <p className="text-gray-500 mt-2 text-sm">Última atualização: março de 2025</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Aceitação dos termos</h2>
            <p>
              Ao utilizar o ZIA Omnisystem, você concorda com estes Termos de Serviço. Se não concordar com qualquer
              parte destes termos, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Descrição do serviço</h2>
            <p>
              O ZIA Omnisystem é uma plataforma modular de gestão empresarial (ERP, CRM, RH, Qualidade, Logística,
              Ativos e Documentos) voltada para pequenas e médias empresas. A plataforma é oferecida como software como
              serviço (SaaS).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Uso permitido</h2>
            <p>Você concorda em usar o ZIA Omnisystem apenas para fins legais e de acordo com estes termos. É proibido:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Violar leis ou regulamentos aplicáveis</li>
              <li>Fazer engenharia reversa ou descompilar o software</li>
              <li>Acessar a plataforma por meios automatizados sem autorização</li>
              <li>Compartilhar credenciais de acesso com terceiros não autorizados</li>
              <li>Usar a plataforma para armazenar ou transmitir conteúdo ilegal</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Contas e segurança</h2>
            <p>
              Você é responsável por manter a confidencialidade das suas credenciais de acesso. Notifique-nos
              imediatamente sobre qualquer uso não autorizado da sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Propriedade intelectual</h2>
            <p>
              Todo o conteúdo, código, design e marca do ZIA Omnisystem são propriedade da empresa desenvolvedora.
              A utilização da plataforma não transfere qualquer direito de propriedade intelectual ao usuário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Disponibilidade do serviço</h2>
            <p>
              Nos esforçamos para manter a plataforma disponível continuamente, mas não garantimos disponibilidade
              ininterrupta. Reservamo-nos o direito de realizar manutenções programadas com aviso prévio quando possível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitação de responsabilidade</h2>
            <p>
              O ZIA Omnisystem não se responsabiliza por danos indiretos, incidentais ou consequentes decorrentes
              do uso ou impossibilidade de uso da plataforma. Nossa responsabilidade total está limitada ao valor
              pago pelo serviço nos últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Rescisão</h2>
            <p>
              Podemos suspender ou encerrar seu acesso à plataforma em caso de violação destes termos, mediante
              notificação. Você pode encerrar sua conta a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Alterações nos termos</h2>
            <p>
              Podemos atualizar estes termos periodicamente. Notificaremos sobre mudanças significativas por e-mail
              ou via aviso na plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Legislação aplicável</h2>
            <p>
              Estes termos são regidos pela legislação brasileira. Quaisquer disputas serão resolvidas no foro da
              comarca de São Paulo/SP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contato</h2>
            <p>
              Para dúvidas sobre estes termos, entre em contato:{' '}
              <a href="mailto:contato@ziasystem.com.br" className="text-violet-600 underline">contato@ziasystem.com.br</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <a href="/" className="text-violet-600 text-sm hover:underline">← Voltar ao início</a>
        </div>
      </div>
    </div>
  )
}
