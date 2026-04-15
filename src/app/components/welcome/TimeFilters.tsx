import type { TimeFilter } from './welcomeTokens';

export function TimeFilters({
  active,
  onChange,
}: {
  active: TimeFilter;
  onChange: (f: TimeFilter) => void;
}) {
  const filters: { key: TimeFilter; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mes' },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className="px-3 py-1.5 rounded-lg text-[11px] transition-all"
          style={{
            backgroundColor: active === f.key ? 'rgba(255,255,255,0.12)' : 'transparent',
            color: active === f.key ? '#ffffff' : 'rgba(255,255,255,0.35)',
            fontWeight: active === f.key ? 600 : 400,
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export default TimeFilters;
