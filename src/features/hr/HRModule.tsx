import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function HRModule() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Módulo HR</h1>
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Hub Central
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg text-gray-500 font-medium">Módulo HR - Em construção</p>
        </div>
      </main>
    </div>
  );
}
