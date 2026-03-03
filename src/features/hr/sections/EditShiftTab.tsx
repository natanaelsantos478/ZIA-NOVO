import { useState, useEffect } from 'react';
import type { Shift, Employee } from '../../../context/HRContext';

export function EditShiftTab({
  shift,
  employees,
  onSave,
  onCancel
}: {
  shift: Shift,
  employees: Employee[],
  onSave: (linkedEmployeeIds: string[]) => void,
  onCancel: () => void
}) {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  useEffect(() => {
    const linkedIds = employees.filter(e => e.shiftId === shift.id).map(e => e.id);
    setSelectedEmployees(linkedIds);
  }, [shift, employees]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave(selectedEmployees);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800">Editar Vínculos: {shift.name}</h2>
        <p className="text-sm text-slate-500 mt-1">
          Selecione os funcionários que devem pertencer a esta escala.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 max-h-[400px] overflow-y-auto mb-6">
        {employees.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Nenhum funcionário cadastrado no sistema.</p>
        ) : (
          <div className="space-y-2">
            {employees.map(emp => (
              <label key={emp.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedEmployees.includes(emp.id)}
                  onChange={() => toggleEmployee(emp.id)}
                  className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{emp.name}</p>
                  <p className="text-xs text-slate-500">{emp.position} · {emp.department}</p>
                </div>
                {emp.shiftId && emp.shiftId !== shift.id && !selectedEmployees.includes(emp.id) && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    Já possui escala
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
        >
          Salvar Vínculos
        </button>
      </div>
    </div>
  );
}
