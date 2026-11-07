const DIGITS = /(\d(?:[\d.,:  ]*\d)?(?:[KkMm%])?)/;

export function Figures({ text, className }: { text: string; className?: string }) {
  const parts = text.split(DIGITS);
  return (
    <span className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="figure">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  );
}
