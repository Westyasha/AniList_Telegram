interface ProgressRingProps {
  value: number;
  max: number | null;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({ value, max, size = 40, stroke = 3.5, color = "var(--color-watching)", label }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max && max > 0 ? Math.min(1, value / max) : value > 0 ? 0.5 : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${value}${max ? `/${max}` : ""}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="rgba(8,8,11,0.78)" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="#F4F4F6"
        fontSize={size * 0.3}
        fontWeight={700}
        className="tabular"
      >
        {value}
      </text>
    </svg>
  );
}
