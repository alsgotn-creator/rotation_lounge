'use client';
import { useState } from 'react';
import { Character } from '../../../components/Character';
import type { PublicCard } from '../../../lib/domain/lounge';
import type { Prop, Shape } from '../../../lib/domain/register';
import type { PlayView } from '../../../lib/server/play';

const ho = (g: 'f' | 'm', n: number | null) => `${g === 'f' ? '여' : '남'}${n}호`;
const Face = ({ c, size }: { c: PublicCard; size: number }) => <Character shape={c.shape as Shape} color={c.color} prop={c.prop as Prop} size={size} delay={(c.number ?? 0) * 0.6} />;

/** 마무리: 결과는 호스트가 열어줄 때까지 기다리고, 열리면 서로 고른 사람만 보여준다. 롤링페이퍼는 언제든 볼 수 있다. */
function ReviewBox({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [text, setText] = useState('');
  const [st, setSt] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const send = async () => {
    setSt('busy');
    const r = await fetch(`/api/e/${slug}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: text }) }).catch(() => null);
    setSt(r?.ok ? 'done' : 'err');
    if (r?.ok) onDone();
  };
  return (
    <section className="cls-rv">
      <h3>오늘 어땠나요?</h3>
      <p className="ds">이름 없이 성별·나이만 보여요. 한 번 남기면 고쳐 쓸 수 있어요.</p>
      <textarea value={text} maxLength={120} rows={3} placeholder="한 줄 후기를 남겨주세요 (120자)" onChange={(e) => { setText(e.target.value); setSt('idle'); }} />
      <button className="btn" disabled={!text.trim() || st === 'busy'} onClick={send}>{st === 'done' ? '남겼어요 · 고쳐 쓰기' : '후기 남기기'}</button>
      {st === 'err' && <p className="preview">저장하지 못했어요. 다시 시도해주세요.</p>}
    </section>
  );
}

function WineBox({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [st, setSt] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const join = async () => {
    setSt('busy');
    const r = await fetch(`/api/e/${slug}/wine`, { method: 'POST' }).catch(() => null);
    setSt(r?.ok ? 'done' : 'err');
    if (r?.ok) onDone();
  };
  return (
    <section className="cls-wine">
      <h3>연말 와인 무제한 모임</h3>
      <p className="cls-price"><s>70,000원</s> <b>60,000원</b> <em>14% 할인</em></p>
      <p className="ds">지인과 함께 오면 각각 30% 할인 (49,000원)</p>
      <ul className="cls-wine-list">
        <li>12월 중순~말 진행 예정</li>
        <li>한 테이블 3:3 · 총 4테이블</li>
        <li>관상게임 · 익명게임 · 올해 마무리 이야기</li>
        <li>인원이 모이지 않으면 진행되지 않아요</li>
      </ul>
      <p className="ds" style={{ margin: '0 0 14px', textAlign: 'center', fontWeight: 800 }}>옷깃만 믿고 오세요 😊</p>
      <button className="btn cls-wine-btn" disabled={st === 'busy' || st === 'done'} onClick={join}>
        {st === 'done' ? '✓ 메일로 안내해드릴게요' : <>와인 모임 관심있어요!<small>메일로 안내받기</small></>}
      </button>
      {st === 'done' && <p className="preview">호스트에게 이름·연락처·이메일이 전달됐어요.</p>}
      {st === 'err' && <p className="preview">신청하지 못했어요. 다시 시도해주세요.</p>}
    </section>
  );
}

export default function Closing({ view, me, slug }: { view: PlayView; me: PublicCard | null; slug: string }) {
  const matches = view.result?.matches ?? [];
  const [thanks, setThanks] = useState(false); // 후기나 와인모임 신청을 하면 캐릭터가 인사하며 마무리
  const bye = () => { setThanks(true); setTimeout(() => document.getElementById('cls-bye')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); };

  return (
    <main className="cls" style={{ paddingTop: 40 }}>
      {!view.resultsOpen && <>
        <div className="cls-wait" aria-hidden="true">{me && <Face c={me} size={150} />}</div>
        <h2 className="q" style={{ textAlign: 'center' }}>오늘 만나서<br />반가웠어요</h2>
        <p className="ds" style={{ textAlign: 'center' }}>매칭된 분들께는 1시간 이내로<br />메일 보내드려요.</p>
      </>}

      {view.resultsOpen && matches.length > 0 && <>
        <h2 className="q" style={{ textAlign: 'center' }}>서로 마음이 닿았어요</h2>
        {matches.map((m) => (
          <article className="cls-match" key={m.id}>
            <div className="cls-pair">{me && <Face c={me} size={96} />}<span className="cls-heart" aria-hidden="true">♥</span><Face c={m} size={96} /></div>
            <h3>{ho(m.gender, m.number)}님과 매칭되었어요</h3>
            <p>진행자가 연락처를 직접 전해드릴 거예요.</p>
          </article>
        ))}
      </>}

      {view.resultsOpen && matches.length === 0 && <>
        <div className="cls-wait" aria-hidden="true">{me && <Face c={me} size={130} />}</div>
        <h2 className="q" style={{ textAlign: 'center' }}>이번엔 인연이<br />닿지 않았어요</h2>
        <p className="ds" style={{ textAlign: 'center' }}>그래도 오늘 만나서 반가웠어요.</p>
      </>}

      <ReviewBox slug={slug} onDone={bye} />

      <WineBox slug={slug} onDone={bye} />

      {thanks && (
        <section id="cls-bye" className="cls-bye">
          <p className="cls-bubble">오늘 정말 고생 많으셨어요!<br />조심히 들어가세요 ♡</p>
          {me && <Face c={me} size={130} />}
        </section>
      )}
    </main>
  );
}
