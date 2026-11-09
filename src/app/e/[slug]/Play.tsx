'use client';
import { useCallback, useEffect, useState } from 'react';
import Lounge from './Lounge';
import Round from './Round';
import NoteWrite from './NoteWrite';
import Choice from './Choice';
import Closing from './Closing';
import { RollingPaper } from '../../../components/RollingPaper';
import { Icon } from '../../../components/Icon';
import type { LoungeView } from '../../../lib/server/lounge';
import type { PlayView } from '../../../lib/server/play';

/** 등록을 마친 참가자의 메인 화면: 밀린 쪽지 → 진행 중인 라운드 → 대기실 순서로 보여준다. */
export default function Play({ slug, lounge, when, loveType, onEdit }: { slug: string; lounge: LoungeView; when: string; loveType: number; onEdit: () => void }) {
  const [v, setV] = useState<PlayView | null>(null);
  const [offset, setOffset] = useState(0);
  const [paperOpen, setPaperOpen] = useState(false);

  const load = useCallback(async () => {
    const t0 = Date.now();
    const r = await fetch(`/api/e/${slug}/play`, { cache: 'no-store' }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (j?.ok) { setV(j.view); setOffset(j.view.serverNow - (t0 + Date.now()) / 2); }
  }, [slug]);

  // shortcut: 3초마다 새로 읽는다. 타이머는 서버 시각 기준으로 화면에서 계산하니 어긋나지 않는다. 실시간 신호는 다음 단계.
  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 3000);
    const onVis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  if (v?.pending) return <NoteWrite key={`${v.pending.round}-${v.pending.to.id}`} slug={slug} pending={v.pending} onDone={load} />;
  if (v?.phase === 'talk' && v.paper && paperOpen) return (
    <main className="cls">
      <div className="nb"><button className="bk" aria-label="뒤로" onClick={() => setPaperOpen(false)}><Icon name="back" /></button><div className="tt">내 롤링페이퍼</div></div>
      <RollingPaper notes={v.paper.notes} />
    </main>
  );
  const fab = v?.phase === 'talk' && v.paper
    ? <button className="pp-fab" onClick={() => setPaperOpen(true)}>롤링페이퍼{v.paper.notes.length > 0 ? ` ${v.paper.notes.length}` : ''}</button> : null;
  if (v?.phase === 'closing') return <Closing slug={slug} view={v} me={lounge.cards.find((c) => c.me) ?? null} />;
  if (v?.phase === 'choice' && v.choice) return <Choice key="choice" slug={slug} view={v} onSaved={load} />;
  if (v?.round) return <>{fab}<Round key={v.round.no} slug={slug} view={v} offsetMs={offset} onRefresh={load} me={lounge.cards.find((c) => c.me) ?? null} /></>;
  return <>{fab}<Lounge slug={slug} initial={lounge} when={when} loveType={loveType} onEdit={onEdit} recommendation={v?.recommendation ?? null} /></>;
}
