import { Character } from './Character';
import { seatColumns } from '../lib/domain/lounge';
import type { Prop, Shape } from '../lib/domain/register';

type P = { gender: 'f' | 'm'; number: number | null; shape: string; prop: string; color: number; nickname?: string } | null;
export type TablePair = { table: number; f: P; m: P };

function Seat({ p, label, faces }: { p: P; label: string; faces: boolean }) {
  if (!p) return <div className="fp-seat empty" aria-label={`${label} 빈자리`}><span>빈자리</span></div>;
  return (
    <div className="fp-seat">
      {faces && <Character shape={p.shape as Shape} color={p.color} prop={p.prop as Prop} size={40} delay={(p.number ?? 0) * 0.7} />}
      <span>{p.gender === 'f' ? '여' : '남'}{p.number}호{p.nickname ? <small>{p.nickname}</small> : null}</span>
    </div>
  );
}

/** 직사각형 배치: 오른쪽 열 1..⌈T/2⌉ 위→아래, 왼쪽 열 아래→위 (번호순이 시계 방향) */
export function FloorPlan({ pairs, faces = true }: { pairs: TablePair[]; faces?: boolean }) {
  const cols = seatColumns(pairs.length);
  const at = (n: number) => pairs[n - 1];
  return (
    <div className="fp">
      {[cols.left, cols.right].map((col, ci) => (
        <div className="fp-col" key={ci}>
          {col.map((n) => (
            <div className="fp-t" key={n}>
              <b className="fp-no">{n}</b>
              <Seat p={at(n).f} label="여" faces={faces} />
              <Seat p={at(n).m} label="남" faces={faces} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
