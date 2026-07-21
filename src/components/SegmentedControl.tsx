"use client";

interface Option<T extends string> {
  value: T;
  label: string;
  /** Rótulo mais curto para telas pequenas (evita quebra de linha desigual entre pílulas). */
  shortLabel?: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  icon?: React.ReactNode;
  className?: string;
}

/** Alternador em pílulas com indicador deslizante animado atrás da opção ativa. */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  icon,
  className = "",
}: Props<T>) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      className={`inline-flex max-w-full items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/60 p-1 text-xs sm:gap-1.5 sm:text-sm ${className}`}
    >
      {icon}
      <div
        className="relative grid flex-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        <div
          className="absolute inset-y-0 rounded-full bg-amber-500 transition-transform duration-300 ease-out"
          style={{
            width: `${100 / options.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`relative z-10 whitespace-nowrap rounded-full px-2 py-1.5 font-medium transition-colors duration-300 sm:px-3 ${
              value === opt.value ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            <span className="sm:hidden">{opt.shortLabel ?? opt.label}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
