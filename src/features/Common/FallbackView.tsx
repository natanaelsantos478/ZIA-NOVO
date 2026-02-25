import { Wrench } from 'lucide-react';

export default function FallbackView() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Wrench className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-700 mb-2">Módulo em Desenvolvimento</h3>
      <p className="text-slate-400 text-sm max-w-sm">Este módulo estará disponível em breve.</p>
    </div>
  );
}
