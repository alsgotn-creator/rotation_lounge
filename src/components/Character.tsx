import type { CSSProperties } from 'react';
import type { Prop, Shape } from '../lib/domain/register';

const HAS_ASSETS = process.env.NEXT_PUBLIC_CHARACTER_ASSETS === '1';

export function characterSrc(shape: Shape, color: number, frame: 'base' | 'smile' | 'blink', hasAssets = HAS_ASSETS) {
  return hasAssets ? `/characters/${shape}/${String(color).padStart(2, '0')}-${frame}.webp` : `/characters/placeholder-${frame}.webp`;
}

// shortcut: 진짜 3모양×16색 그림(계획서 Task 15)이 나오기 전까지는 한 장을 색만 돌리고 비율로 모양을 흉내 낸다.
const SHAPE_FAKE: Record<Shape, string> = { cloud: 'none', mochi: 'scale(1.1,.9)', drop: 'scale(.9,1.08)' };
const PROP_ANCHOR: Record<Shape, { x: number; y: number; w: number }> = {
  cloud: { x: 62, y: 6, w: 30 }, mochi: { x: 60, y: 10, w: 30 }, drop: { x: 58, y: 2, w: 28 },
};

const PROP_SVG: Record<Exclude<Prop, 'none'>, React.ReactNode> = {
  ribbon: <><path d="M32 30 10 16v28zM32 30l22-14v28z" fill="#ff8fa3" /><circle cx="32" cy="30" r="7" fill="#ffc49a" /></>,
  flower: <>{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="32" cy="17" rx="9" ry="13" fill="#ffd1d9" transform={`rotate(${r} 32 32)`} />)}<circle cx="32" cy="32" r="8" fill="#ffc16b" /></>,
  star: <path d="m32 6 7.6 16.4 17.9 2-13.3 12.1 3.7 17.6L32 45.3 16.1 54.1l3.7-17.6L6.5 24.4l17.9-2z" fill="#ffd86b" />,
  heart: <path d="M32 54S8 40 8 22a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 18-24 32-24 32z" fill="#ff6f8e" />,
  crown: <path d="M8 46 12 16l12 14 8-18 8 18 12-14 4 30z" fill="#ffd86b" stroke="#e6a94a" strokeWidth="2" strokeLinejoin="round" />,
};

export function Character({ shape, color, prop, size = 120, delay = 0 }: { shape: Shape; color: number; prop: Prop; size?: number; delay?: number }) {
  const a = PROP_ANCHOR[shape];
  const style = { width: size, height: size, '--d': `${-delay}s`, '--shape': SHAPE_FAKE[shape], filter: HAS_ASSETS ? undefined : `hue-rotate(${color * 22}deg)` } as CSSProperties;
  return (
    <div className="chr" style={style} aria-hidden="true">
      <div className="chr-body">
        <img src={characterSrc(shape, color, 'base')} alt="" />
        <img className="chr-face chr-smile" src={characterSrc(shape, color, 'smile')} alt="" />
        <img className="chr-face chr-blink" src={characterSrc(shape, color, 'blink')} alt="" />
      </div>
      {prop !== 'none' && (
        <svg className="chr-prop" viewBox="0 0 64 64" style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, filter: HAS_ASSETS ? undefined : `hue-rotate(${-color * 22}deg)` }}>{PROP_SVG[prop]}</svg>
      )}
    </div>
  );
}
