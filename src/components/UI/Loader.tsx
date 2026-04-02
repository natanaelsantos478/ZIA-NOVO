export default function Loader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[300px] w-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Carregando…</span>
      </div>
    </div>
  );
}
