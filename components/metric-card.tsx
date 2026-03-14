type MetricCardProps = {
  label: string;
  value: string | number;
  caption?: string;
};

export function MetricCard({ label, value, caption }: MetricCardProps) {
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {caption ? <p className="metric-caption">{caption}</p> : null}
    </article>
  );
}
