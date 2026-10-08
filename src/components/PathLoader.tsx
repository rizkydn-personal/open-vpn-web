type PathLoaderProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
};

export function PathLoader({ size = "md", label = "Memuat" }: PathLoaderProps) {
  return (
    <span className={`path-loader path-loader--${size}`} role="status" aria-label={label}>
      <svg viewBox="0 0 120 32" aria-hidden="true" focusable="false">
        <circle className="path-loader__device" cx="12" cy="16" r="5" />
        <path className="path-loader__line" d="M17 16h24c7 0 7-9 14-9h25c7 0 7 9 14 9h14" />
        <circle className="path-loader__server" cx="108" cy="16" r="5" />
      </svg>
      <span className="sr-only">{label}...</span>
    </span>
  );
}
