import type { CSSProperties } from 'react';
import { SHAPES, type Shape } from '../lib/domain/register';
import { PALETTE } from '../lib/domain/loveType';

/** 눈 두 점의 위치와 지름 (그림 대비 %). 그림에서 자동으로 재서 넣었다: 왼눈 x,y · 오른눈 x,y · 지름 */
const EYES: Record<Shape, [number, number, number, number, number]> = {
  f1: [57.3, 32, 66.3, 31.7, 3], f2: [58.4, 34.9, 67.7, 34.4, 3.2], f3: [57.4, 34.1, 66.6, 33.8, 2.9],
  f4: [58.5, 33.1, 68.3, 32.6, 3.2], f5: [56.6, 35.1, 67.3, 34.2, 2.7], f6: [59.9, 40.6, 68.9, 40.3, 3],
  m1: [57.9, 36.5, 67.4, 35.9, 3.1], m2: [55, 35.7, 67, 35.2, 3], m3: [55.2, 34.1, 65.1, 33.5, 3],
  m4: [54.7, 32, 63.7, 31.1, 2.9], m5: [56.4, 33.3, 64.6, 33, 2.5], m6: [56.8, 35, 67.2, 33.8, 2.9],
};

/** 흑백 펜 선 캐릭터. 포인트 소품(마스크 그림)만 연애 컬러로 칠하고, 눈은 가끔 깜빡인다. */
export function Character({ shape, color, size = 120, delay = 0, flip = false }: { shape: string; color: number; size?: number; delay?: number; flip?: boolean }) {
  const id: Shape = (SHAPES as readonly string[]).includes(shape) ? (shape as Shape) : 'f1'; // 옛 캐릭터(구름 등)로 등록된 사람
  const [x1, y1, x2, y2, d] = EYES[id];
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
      </div>
    </div>
  );
}
