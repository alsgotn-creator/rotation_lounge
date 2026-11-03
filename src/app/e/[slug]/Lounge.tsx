'use client';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { Character } from '../../../components/Character';
import { PALETTE, phrases } from '../../../lib/domain/loveType';
import { seatColumns } from '../../../lib/domain/lounge';
import type { Prop, Shape } from '../../../lib/domain/register';
import type { LoungeView } from '../../../lib/server/lounge';

const ho = (g: 'f' | 'm', n: number) => `${g === 'f' ? '여' : '남'}${n}호`;

export default function Lounge({ slug, initial, when, loveType, onEdit }: { slug: string; initial: LoungeView; when: string; loveType: number; onEdit: () => void }) {
  const [v, setV] = useState(initial);
  const [seat, setSeat] = useState(false);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const me = v.cards.find((c) => c.me)!;
  const others = v.cards.filter((c) => !c.me);

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/e/${slug}/lounge`, { cache: 'no-store' }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (j?.ok) setV(j.view);
  }, [slug]);

  // shortcut: 4초마다 새로 읽는다. 라운드 타이머 단계(계획서 Task 7)에서 Supabase 실시간 신호로 바꾸기.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && refresh(), 4000);
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [refresh]);

  // 주소 끝에 #seat 이 있으면 자리 고르기를 바로 연다 (현장 안내용)
  useEffect(() => { if (location.hash === '#seat' && initial.seatOpen && initial.phase === 'before') setSeat(true); }, [initial.seatOpen, initial.phase]);

  const show = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2400); };
  const pick = async (table: number) => {
    setBusy(true);
    const r = await fetch(`/api/e/${slug}/seat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ table }) });
    const j = await r.json().catch(() => ({ ok: false, message: '다시 시도해주세요.' }));
    setBusy(false);
    await refresh();
    if (!j.ok) return show(j.message);
    setSeat(false); show(`${table}번 테이블에 앉았어요 · ${ho(me.gender, table)}`);
  };
  const cols = seatColumns(v.tableCount);
  const before = v.phase === 'before';

  return (
    <main className="lounge">
      <div className="lg-top">
        <span className="logo">플러팅<i>.</i>라운지</span>
        {before && <button className="lnk" style={{ margin: 0 }} onClick={onEdit}>내 소개 수정</button>}
      </div>
      <header className="lg-head">
        <p>ROTATION LOUNGE</p>
        <h1>오늘의 라운지</h1>
        <span>{when} · 여 {v.counts.f} · 남 {v.counts.m}</span>
      </header>

      <section className="lg-me">
        <small>나</small>
        <Character shape={me.shape as Shape} color={me.color} prop={me.prop as Prop} size={128} />
        <div className="lg-kw">{me.keywords.map((k) => <span key={k} className="on">{k}</span>)}</div>
        {me.number != null && <b className="lg-ho">{ho(me.gender, me.number)}</b>}
      </section>

      {others.length === 0
        ? <p className="empty">다른 분들이 들어오는 중이에요</p>
        : <section className="lg-crowd">
            {others.map((c, i) => (
              <div key={c.id} className="lg-p" style={{ animationDelay: `${-(i * 0.7) % 4}s` }}>
                <Character shape={c.shape as Shape} color={c.color} prop={c.prop as Prop} size={74} delay={i * 0.9} />
                <div className="lg-kw">{c.keywords.slice(0, 2).map((k) => <span key={k}>{k}</span>)}</div>
              </div>
            ))}
          </section>}

      <div className="ft">
        <div className="lg-mine">
          <span className="orb" style={{ ['--c' as string]: PALETTE[loveType], width: 28, height: 28, margin: 0, animation: 'none', flex: 'none' }} aria-hidden="true" />
          <span>{phrases(loveType).join(' · ')}</span>
        </div>
        {before && !v.seatOpen && <p className="note" style={{ margin: 0 }}>행사 당일, 테이블에 앉은 뒤 여기서 자리를 골라요</p>}
        {before && v.seatOpen
          ? <button className={`btn${me.number != null ? ' sub' : ' shine'}`} onClick={() => setSeat(true)}>
              {me.number != null ? `${me.number}번 테이블 · 자리 바꾸기` : '내 자리 고르기'}</button>
          : !before && <p className="note" style={{ margin: 0 }}>곧 호스트가 라운드를 시작해요</p>}
      </div>

      {seat && <>
        <div className="dim" onClick={() => setSeat(false)} />
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="seat-t">
          <div className="grab" />
          <h3 id="seat-t">앉은 테이블을 눌러주세요</h3>
          <p className="ds">테이블 위의 번호와 같은 곳을 누르면 돼요. 그 번호가 오늘 나의 <b>{me.gender === 'f' ? '여' : '남'}○호</b>가 돼요.</p>
          <div className="seats">
            {[cols.left, cols.right].map((col, ci) => (
              <div className="seat-col" key={ci}>
                {col.map((n) => {
                  const mine = me.number === n, taken = v.taken.includes(n);
                  return (
                    <button key={n} disabled={busy || taken} className={mine ? 'on' : ''} onClick={() => !mine && pick(n)} aria-label={`${n}번 테이블${taken ? ', 이미 선택됨' : mine ? ', 내 자리' : ''}`}>
                      <b>{n}</b><small>{mine ? '내 자리' : taken ? '선택됨' : ho(me.gender, n)}</small>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="hint" style={{ justifyContent: 'center' }}><Icon name="info" />남자분은 라운드마다 시계 방향으로 한 칸씩 옮겨요</p>
        </div>
      </>}
      {toast && <div className="toast" role="status"><Icon name="check" />{toast}</div>}
    </main>
  );
}
