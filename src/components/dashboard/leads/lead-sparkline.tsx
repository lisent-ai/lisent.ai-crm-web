type LeadSparklineProps = {
  values: readonly number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
};

export function LeadSparkline({
  values,
  width = 76,
  height = 30,
  stroke = "var(--accent)",
  fill = "color-mix(in srgb, var(--accent) 14%, transparent)",
  className = "",
}: Readonly<LeadSparklineProps>) {
  const n = values.length;
  if (n === 0) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
      >
        <line
          stroke="var(--border-subtle)"
          strokeDasharray="2,3"
          strokeWidth="1"
          x1={0}
          x2={width}
          y1={height / 2}
          y2={height / 2}
        />
      </svg>
    );
  }

  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);
  const paddingY = 3;
  const usableH = height - paddingY * 2;
  const step = n === 1 ? 0 : width / (n - 1);

  const points = values.map((v, i) => {
    const x = n === 1 ? width / 2 : i * step;
    const y = paddingY + usableH - ((v - min) / span) * usableH;
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const area = `${line} L ${width.toFixed(2)} ${height} L 0 ${height} Z`;

  return (
    <svg
      aria-hidden="true"
      className={className}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <path d={area} fill={fill} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}
