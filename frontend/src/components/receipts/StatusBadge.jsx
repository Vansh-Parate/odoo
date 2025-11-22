export default function StatusBadge({ status }) {
  const statusConfig = {
    draft: { label: 'Draft', color: 'text-slate-400 border-slate-500/30 bg-slate-800/50' },
    ready: { label: 'Ready', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    done: { label: 'Done', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium border rounded ${config.color}`}>
      {config.label}
    </span>
  );
}

