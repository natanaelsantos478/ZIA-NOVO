import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export interface DataTableColumn<T> {
  key: Extract<keyof T, string> | string;
  header: string;
  render?: (item: T) => ReactNode;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  isLoading = false,
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-500">Carregando dados...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-200">
        <Inbox className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-base font-medium text-slate-600">Nenhum registro encontrado</p>
        <p className="text-sm text-slate-400 mt-1">Os dados aparecerão aqui quando estiverem disponíveis.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={String(col.key) + index}
                  className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((item, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick?.(item)}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/50'}`}
              >
                {columns.map((col, colIndex) => (
                  <td key={String(col.key) + colIndex} className="px-4 py-3 text-sm text-slate-700">
                    {col.render ? col.render(item) : (item[col.key as keyof T] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
