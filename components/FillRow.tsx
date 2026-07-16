'use client';

import type { FillSpec } from '@/store/use3DStore';

// One colour/fill row — the single shared pattern for BOTH model parts and the
// background. Type (Original / Solid / Linear / Radial) + start/centre colour +
// end/edge colour (gradients only). `allowNone` shows the Original option
// (parts revert to the model's own colour); the background has no Original.
export interface FillRowProps {
  label: string;
  fill: FillSpec | undefined;               // undefined = Original
  allowNone?: boolean;
  onType: (type: 'none' | 'solid' | 'linear' | 'radial') => void;
  onColor: (which: 'c1' | 'c2', hex: string) => void;
  selected?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
}

export default function FillRow({ label, fill, allowNone, onType, onColor, selected, onEnter, onLeave }: FillRowProps) {
  const type: string = fill ? fill.type : 'none';
  const c1 = fill?.c1 ?? '#cccccc';
  const c2 = fill?.c2 ?? '#ffffff';
  const isGrad = type === 'linear' || type === 'radial';

  return (
    <div
      className={`mc-color-row ${selected ? 'sel' : ''}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <span className="mc-color-name" title={label}>{label}</span>
      <select className="mc-fill-type" value={type} onChange={(e) => onType(e.target.value as any)}>
        {allowNone && <option value="none">Original</option>}
        <option value="solid">Solid</option>
        <option value="linear">Linear</option>
        <option value="radial">Radial</option>
      </select>
      {type !== 'none' && (
        <input type="color" value={c1} title={isGrad ? 'Start / centre' : 'Color'}
          onChange={(e) => onColor('c1', e.target.value)} />
      )}
      {isGrad && (
        <input type="color" value={c2} title="End / edge"
          onChange={(e) => onColor('c2', e.target.value)} />
      )}
    </div>
  );
}
