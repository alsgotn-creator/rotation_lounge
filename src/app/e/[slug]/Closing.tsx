'use client';
import { useState } from 'react';
import { Character } from '../../../components/Character';
import { Icon } from '../../../components/Icon';
import { RollingPaper } from '../../../components/RollingPaper';
import type { PublicCard } from '../../../lib/domain/lounge';
import type { Prop, Shape } from '../../../lib/domain/register';
import type { PlayView } from '../../../lib/server/play';

const ho = (g: 'f' | 'm', n: number | null) => `${g === 'f' ? '여' : '남'}${n}호`;
const Face = ({ c, size }: { c: PublicCard; size: number }) => <Character shape={c.shape as Shape} color={c.color} prop={c.prop as Prop} size={size} delay={(c.number ?? 0) * 0.6} />;

/** 마무리: 결과는 호스트가 열어줄 때까지 기다리고, 열리면 서로 고른 사람만 보여준다. 롤링페이퍼는 언제든 볼 수 있다. */
function ReviewBox({ slug }: { slug: string }) {
  const [text, setText] = useState('');
  const [st, setSt] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const send = async () => {
    setSt('busy');
    const r = await fetch(`/api/e/${slug}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: text }) }).catch(() => null);
    setSt(r?.ok ? 'done' : 'err');
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

export default function Closing({ view, me, slug }: { view: PlayView; me: PublicCard | null; slug: string }) {
  const [paper, setPaper] = useState(false);
  const matches = view.result?.matches ?? [];

  if (paper) return (
    <main className="cls">
      <div className="nb"><button className="bk" aria-label="뒤로" onClick={() => setPaper(false)}><Icon name="back" /></button><div className="tt">내 롤링페이퍼</div></div>
      <RollingPaper notes={view.paper?.notes ?? []} />
    </main>
  );

  return (
    <main className="cls" style={{ paddingTop: 40 }}>
      {!view.resultsOpen && <>
        <div className="cls-wait" aria-hidden="true">{me && <Face c={me} size={150} />}</div>
        <h2 className="q" style={{ textAlign: 'center' }}>결과는 진행자가<br />곧 공개해요</h2>
        <p className="ds" style={{ textAlign: 'center' }}>기다리는 동안 받은 쪽지를 읽어볼까요?</p>
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
        <p className="ds" style={{ textAlign: 'center' }}>그래도 오늘 만난 마음들은 쪽지에 남아 있어요.</p>
      </>}

      <ReviewBox slug={slug} />

      <div className="ft"><button className="btn" onClick={() => setPaper(true)}>내 롤링페이퍼 보기{view.paper && view.paper.notes.length > 0 ? ` · ${view.paper.notes.length}장` : ''}</button></div>
    </main>
  );
}
