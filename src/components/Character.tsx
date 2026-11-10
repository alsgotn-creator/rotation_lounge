import type { CSSProperties } from 'react';
import { EYEWEAR, GLASSED, SHAPES, parseAccs, type Acc, type Shape } from '../lib/domain/register';
import { PALETTE } from '../lib/domain/loveType';

/** 눈 두 점의 위치와 지름 (그림 대비 %). 그림에서 자동으로 재서 넣었다: 왼눈 x,y · 오른눈 x,y · 지름 */
const EYES: Record<Shape, [number, number, number, number, number]> = {
  f1: [57.3, 32, 66.3, 31.7, 3], f2: [58.4, 34.9, 67.7, 34.4, 3.2], f3: [57.4, 34.1, 66.6, 33.8, 2.9],
  f4: [58.5, 33.1, 68.3, 32.6, 3.2], f5: [56.6, 35.1, 67.3, 34.2, 2.7], f6: [59.9, 40.6, 68.9, 40.3, 3],
  m1: [57.9, 36.5, 67.4, 35.9, 3.1], m2: [55, 35.7, 67, 35.2, 3], m3: [55.2, 34.1, 65.1, 33.5, 3],
  m4: [54.7, 32, 63.7, 31.1, 2.9], m5: [56.4, 33.3, 64.6, 33, 2.5], m6: [56.8, 35, 67.2, 33.8, 2.9],
};

const INK = { stroke: '#111', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const star = (x: number, y: number, s: number) => `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;
const heart = (x: number, y: number, s: number) => `M${x} ${y + s * 0.9}C${x - s * 1.6} ${y - s * 0.1} ${x - s * 0.7} ${y - s * 1.3} ${x} ${y - s * 0.4}C${x + s * 0.7} ${y - s * 1.3} ${x + s * 1.6} ${y - s * 0.1} ${x} ${y + s * 0.9}Z`;

/** 꾸미기 그림. 얼굴 쪽은 눈 위치에 맞추고, 반짝이·하트는 머리 오른쪽 위 빈 곳에 띄운다. */
function deco(a: Acc, [x1, y1, x2, y2, d]: [number, number, number, number, number]) {
  const r = Math.min(d * 1.9, (x2 - x1) / 2 - 0.8);
  switch (a) {
    case 'glasses': return <g key={a} {...INK} fill="none"><circle cx={x1} cy={y1} r={r} /><circle cx={x2} cy={y2} r={r} /><path d={`M${x1 + r} ${y1}Q${(x1 + x2) / 2} ${y1 - 1.2} ${x2 - r} ${y2}M${x1 - r} ${y1}l-5 -1`} /></g>;
    case 'sunglasses': return <g key={a} {...INK}><ellipse cx={x1} cy={y1} rx={r + 0.6} ry={r * 0.85} fill="#111" /><ellipse cx={x2} cy={y2} rx={r + 0.6} ry={r * 0.85} fill="#111" /><path d={`M${x1 + r} ${y1 - 0.5}Q${(x1 + x2) / 2} ${y1 - 1.5} ${x2 - r} ${y2 - 0.5}M${x1 - r} ${y1}l-5 -1`} fill="none" /><path d={`M${x1 - r * 0.4} ${y1 - r * 0.3}l1.2 -0.6M${x2 - r * 0.4} ${y2 - r * 0.3}l1.2 -0.6`} stroke="#fff" strokeWidth={0.9} strokeLinecap="round" /></g>;
    case 'blush': return <g key={a} fill="#f2a0b3" opacity={0.8}><ellipse cx={x1 - 0.5} cy={y1 + d * 1.9} rx={d * 1.1} ry={d * 0.55} /><ellipse cx={x2 + 0.5} cy={y2 + d * 1.9} rx={d * 1.1} ry={d * 0.55} /></g>;
    case 'freckles': return <g key={a} fill="#7a5a4a">{[x1, x2].flatMap((x, i) => [[-1.4, 2.1], [0, 2.6], [1.4, 2.1]].map(([dx, dy]) => <circle key={`${i}${dx}`} cx={x + dx} cy={(i ? y2 : y1) + d * dy} r={0.45} />))}</g>;
    case 'sparkle': return <g key={a} {...INK} fill="#fff"><path d={star(85, 11, 5)} /><path d={star(93, 23, 3)} /></g>;
    case 'hearts': return <g key={a} {...INK} fill="var(--c)"><path d={heart(85, 11, 4.5)} /><path d={heart(93, 23, 2.8)} /></g>;
  }
}

/** 흑백 펜 선 캐릭터. 포인트 소품(마스크 그림)만 연애 컬러로 칠하고, 눈은 가끔 깜빡인다. */
export function Character({ shape, color, acc, size = 120, delay = 0, flip = false }: { shape: string; color: number; acc?: string; size?: number; delay?: number; flip?: boolean }) {
  const id: Shape = (SHAPES as readonly string[]).includes(shape) ? (shape as Shape) : 'f1'; // 옛 캐릭터(구름 등)로 등록된 사람
  const [x1, y1, x2, y2, d] = EYES[id];
  const accs = parseAccs(acc).filter((a) => !(GLASSED.includes(id) && EYEWEAR.includes(a)));
  const mask = `url(/characters/${id}-accent.webp)`;
  const style = { width: size, height: size, '--d': `${-delay}s`, '--c': PALETTE[color] } as CSSProperties;
  return (
    <div className={flip ? 'chr flip' : 'chr'} style={style} aria-hidden="true">
      <div className="chr-body">
        <img src={`/characters/${id}.webp`} alt="" />
        <i className="chr-acc" style={{ maskImage: mask, WebkitMaskImage: mask }} />
        <svg className="chr-blink" viewBox="0 0 100 100">
          {[[x1, y1], [x2, y2]].map(([x, y]) => (
            <g key={x}><circle cx={x} cy={y} r={d * 0.8} fill="#fff" /><path d={`M${x - d * 0.55} ${y}h${d * 1.1}`} stroke="#111" strokeWidth={d * 0.35} strokeLinecap="round" /></g>
          ))}
        </svg>
        {accs.length > 0 && <svg viewBox="0 0 100 100">{accs.map((a) => deco(a, EYES[id]))}</svg>}
      </div>
    </div>
  );
}
