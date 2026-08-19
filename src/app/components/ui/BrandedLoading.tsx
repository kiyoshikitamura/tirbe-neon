"use client";

type Props = {
  className?: string;
  label?: string;
};

export default function BrandedLoading({ className = "", label = "読み込み中" }: Props) {
  return (
    <div className={`branded-loading ${className}`.trim()} role="status" aria-live="polite" aria-label={label}>
      <img src="/branding/tribe-neon-logo.png" alt="TRIBE NEON" />
      <i aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
