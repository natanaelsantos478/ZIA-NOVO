export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <span className="text-violet-600 font-semibold text-sm uppercase tracking-widest">ZIA Omnisystem</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Política de Privacidade</h1>
          <p className="text-gray-500 mt-2 text-sm">Última atualização: março de 2025</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Informações que coletamos</h2>
            <p>
              O ZIA Omnisystem coleta apenas as informações necessárias para fornecer nossos serviços. Quando você faz
              login com sua Conta do Google, coletamos seu nome, endereço de e-mail e foto de perfil fornecidos pelo
              Google OAuth 2.0. Não armazenamos senhas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Como usamos suas informações</h2>
            <p>Utilizamos suas informações para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Autenticar e identificar você na plataforma</li>
              <li>Personalizar sua experiência no sistema</li>
              <li>Comunicar atualizações e informações relevantes do serviço</li>
              <li>Garantir a segurança e integridade da plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Compartilhamento de dados</h2>
            <p>
              Não vendemos, alugamos nem compartilhamos suas informações pessoais com terceiros, exceto quando
              necessário para operar o serviço (ex: provedores de infraestrutura como Vercel e Supabase) ou quando
              exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Dados do Google</h2>
            <p>
              Quando você autoriza o acesso via Google OAuth, utilizamos apenas os escopos necessários (nome, e-mail e
              foto de perfil). Não acessamos, lemos ou modificamos seus e-mails, documentos ou outros dados do Google
              sem seu consentimento explícito.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Retenção de dados</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Você pode solicitar a exclusão dos seus dados
              a qualquer momento entrando em contato conosco.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais adequadas para proteger suas informações contra acesso não
              autorizado, alteração, divulgação ou destruição.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Seus direitos</h2>
            <p>Você tem o direito de:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Acessar os dados que temos sobre você</li>
              <li>Corrigir dados imprecisos</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Revogar o acesso do app à sua Conta do Google a qualquer momento em <a href="https://myaccount.google.com/permissions" className="text-violet-600 underline" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Contato</h2>
            <p>
              Para dúvidas sobre esta política ou sobre seus dados, entre em contato pelo e-mail:{' '}
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
