import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export default function HRModule() {
  const { setActiveModule } = useAppContext();

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      <header className="h-16 bg-white border-b px-6 flex items-center shadow-sm">
        <button
          onClick={() => setActiveModule('hub')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="font-medium">Voltar para o Hub</span>
        </button>
        <h1 className="ml-6 text-xl font-semibold text-gray-800">
          Recursos Humanos
        </h1>
      </header>
      <main className="flex-1 p-8 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Módulo de RH - Em construção</p>
      </main>
    </div>
  );
}
