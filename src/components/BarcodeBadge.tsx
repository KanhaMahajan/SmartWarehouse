import React from 'react';

interface BarcodeProps {
  value: string;
  className?: string;
  showText?: boolean;
}

export const BarcodeBadge: React.FC<BarcodeProps> = ({ value, className = '', showText = true }) => {
  // Generate deterministic bar widths from string hash
  const chars = value || 'SKU-0000';
  const bars: { width: number; isSpace: boolean }[] = [];

  for (let i = 0; i < chars.length; i++) {
    const code = chars.charCodeAt(i);
    bars.push({ width: (code % 3) + 1, isSpace: false });
    bars.push({ width: ((code >> 2) % 2) + 1, isSpace: true });
    bars.push({ width: ((code >> 3) % 3) + 1, isSpace: false });
    bars.push({ width: 1, isSpace: true });
  }

  return (
    <div className={`inline-flex flex-col items-center bg-white p-2 border border-slate-200 rounded-lg shadow-xs ${className}`}>
      <svg
        className="h-8 w-36 max-w-full text-slate-900"
        viewBox={`0 0 ${bars.reduce((acc, b) => acc + b.width, 0)} 30`}
        preserveAspectRatio="none"
      >
        {(() => {
          let currentX = 0;
          return bars.map((bar, idx) => {
            const x = currentX;
            currentX += bar.width;
            if (bar.isSpace) return null;
            return <rect key={idx} x={x} y="0" width={bar.width} height="30" fill="currentColor" />;
          });
        })()}
      </svg>
      {showText && (
        <span className="mt-1 font-mono text-[10px] tracking-wider text-slate-600 uppercase font-semibold">
          {chars}
        </span>
      )}
    </div>
  );
};
