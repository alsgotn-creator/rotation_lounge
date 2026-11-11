'use client';
import { useState } from 'react';
import { Character } from '../../../components/Character';
import { Icon } from '../../../components/Icon';
import { api } from '../../../lib/api';
import { ho } from '../../../lib/domain/lounge';
import type { Shape } from '../../../lib/domain/register';
import type { PlayView } from '../../../lib/server/play';
import { Reveal } from './Round';

/** 최종 선택: 이성 전원의 캐릭터를 3열로. 0명도 가능, 단계가 끝나기 전까지 고칠 수 있다. */
export default function Choice({ slug, view, onSaved, onPaper }: { slug: string; view: PlayView; onSaved: () => void; onPaper: () => void }) {
  const choice = view.choice!;
  const [sel, setSel] = useState<string[]>(choice.picks);
  const [fire, setFire] = useState<string | null>(choice.brave ?? null); // 용기 카드는 한 장
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const dirty = sel.length !== choice.picks.length || sel.some((id, i) => id !== choice.picks[i]) || fire !== (choice.brave ?? null);
  const saved = choice.done && !dirty;

  const toggle = (id: string) => {
    if (sel.includes(id)) { if (fire === id) setFire(null); return setSel(sel.filter((x) => x !== id)); }
    if (sel.length >= choice.max) { setShake(true); setMsg(`최대 ${choice.max}명까지 고를 수 있어요`); setTimeout(() => setShake(false), 500); return; }
    setMsg(''); setSel([...sel, id]);
  };
  const save = async () => {
    setBusy(true); setMsg('');
    const j = await api(`/api/e/${slug}/choices`, { ids: sel, brave: fire });
    setBusy(false);
    if (!j.ok) return setMsg(j.message ?? '다시 시도해주세요.');
    onSaved();
  };
  const fireP = choice.candidates.find((c) => c.id === fire);
  const person = info ? choice.candidates.find((c) => c.id === info) : null;

  return (
    <main className="chc">
      <div className="lg-top"><span className="logo">플러팅<i>.</i>라운지</span></div>
      <header className="chc-head">
        <h1 className="q">마음이 간 분을<br />골라주세요</h1>
        <p className="ds">최대 {choice.max}순위까지, 누른 순서대로 순위가 정해져요. 서로의 1·2순위가 겹치지 않아도 3순위끼리 서로 골랐다면 매칭해드려요. 아무도 고르지 않아도 괜찮아요.</p>
        <p className="ds" style={{ marginTop: 6 }}>캐릭터 왼쪽 위 <b>ⓘ</b>를 누르면 그분의 정보를 볼 수 있어요.</p>
        <button className="lnk" style={{ margin: '6px 0 0' }} onClick={onPaper}>롤링페이퍼 다시 보기</button>
        <span className={`chc-count${shake ? ' shake' : ''}`} aria-live="polite">{sel.length} / {choice.max}</span>
      </header>
      <div className="chc-grid">
        {choice.candidates.map((c) => {
          const on = sel.includes(c.id), met = !!view.met[c.id];
          return (
            <div key={c.id} className={`chc-cell${on ? ' on' : ''}`}>
              <button className="chc-pick" aria-pressed={on} aria-label={`${ho(c.gender, c.number)} ${on ? '선택 취소' : '선택'}`} onClick={() => toggle(c.id)}>
                {on && <span className="chc-heart" aria-hidden="true">{sel.indexOf(c.id) + 1}순위</span>}
                <Character shape={c.shape as Shape} color={c.color} acc={c.prop} size={72} delay={(c.number ?? 0) * 0.5} />
                <b>{ho(c.gender, c.number)}</b>
                <span>{c.keywords[0]}</span>
              </button>
              {on && <button className={`chc-fire${fire === c.id ? ' on' : ''}`} aria-pressed={fire === c.id} onClick={() => setFire(fire === c.id ? null : c.id)}>{fire === c.id ? '🔥 카드를 줬어요' : '🔥 카드 주기'}</button>}
              {met && <button className="chc-info" aria-label={`${ho(c.gender, c.number)} 정보 보기`} onClick={() => setInfo(c.id)}><Icon name="info" /></button>}
            </div>
          );
        })}
      </div>
      <section className="chc-brave">
        <b>🔥 용기 카드 한 장</b>
        <p>고른 분 중 <em>딱 한 명</em>에게만 줄 수 있어요.<br />서로에게 카드를 줬다면, 오늘 끝나고 두 분만 따로 카페로 안내해드려요.</p>
        <small>카드가 엇갈리면 아무도 몰라요. 매칭은 그대로 문자로 알려드려요. 안 줘도 괜찮아요.</small>
        <span className="chc-brave-to">{fireP ? <>용기 카드는 <b>{ho(fireP!.gender, fireP!.number)}</b>에게 · 바꾸려면 다른 분의 🔥를 눌러요</> : sel.length ? '고른 분 아래 🔥 카드 주기를 눌러요' : '먼저 마음이 간 분을 골라주세요'}</span>
      </section>
      {msg && <p role="alert" className="chc-msg">{msg}</p>}
      <div className="ft">
        <button className="btn" disabled={busy || saved} onClick={save}>{busy ? '저장하는 중…' : saved ? '✓ 선택을 마쳤어요 · 바꾸려면 다시 눌러요' : '선택 완료'}</button>
      </div>

      {person && <>
        <div className="dim" onClick={() => setInfo(null)} />
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="chc-t">
          <div className="grab" />
          <h3 id="chc-t">{ho(person.gender, person.number)}</h3>
          <p className="ds">대화하며 알게 된 정보예요.</p>
          <div style={{ marginTop: 14 }}><Reveal p={view.met[person.id]} fresh={false} /></div>
          <div className="btn2" style={{ marginTop: 16, gridTemplateColumns: '1fr 1.6fr' }}>
            <button className="btn sub" onClick={() => setInfo(null)}>닫기</button>
            <button className="btn" onClick={() => { toggle(person.id); setInfo(null); }}>{sel.includes(person.id) ? '선택 취소' : '이 분 고르기'}</button>
          </div>
        </div>
      </>}
    </main>
  );
}
