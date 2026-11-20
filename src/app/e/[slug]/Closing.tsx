'use client';
import { useEffect, useState } from 'react';
import { Character } from '../../../components/Character';
import { api } from '../../../lib/api';
import type { PublicCard } from '../../../lib/domain/lounge';
import type { Shape } from '../../../lib/domain/register';
import type { PlayView } from '../../../lib/server/play';
import type { ClosingKind } from '../../../lib/domain/closing';

const Face = ({ c, size }: { c: PublicCard; size: number }) => <Character shape={c.shape as Shape} color={c.color} acc={c.prop} size={size} delay={(c.number ?? 0) * 0.6} />;

/** 마무리: 결과는 호스트가 열어줄 때까지 기다리고, 열리면 서로 고른 사람만 보여준다. 롤링페이퍼는 언제든 볼 수 있다. */
function ReviewBox({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [st, setSt] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const send = async () => {
    setSt('busy');
    const r = await api(`/api/e/${slug}/review`, { body: text, rating });
    setSt(r.ok ? 'done' : 'err');
    if (r.ok) onDone();
  };
  return (
    <section className="cls-rv">
      <h3>오늘 모임 어땠나요?</h3>
      <p className="ds">이름 없이 성별·나이만 보여요. 한 번 남기면 고쳐 쓸 수 있어요.</p>
      <div className="stars-pick" role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}점`} className={n <= rating ? 'on' : undefined} onClick={() => { setRating(n); setSt('idle'); }}>★</button>
        ))}
        <b>{rating.toFixed(1)}</b>
      </div>
      <textarea value={text} maxLength={120} rows={3} placeholder="한 줄 후기를 남겨주세요 (120자)" onChange={(e) => { setText(e.target.value); setSt('idle'); }} />
      <button className="btn" disabled={!text.trim() || st === 'busy'} onClick={send}>{st === 'done' ? '남겼어요 · 고쳐 쓰기' : '후기 남기기'}</button>
      {st === 'err' && <p className="preview">저장하지 못했어요. 다시 시도해주세요.</p>}
    </section>
  );
}

/** 호스트에게 하고 싶은 말: 모임 피드백 · 요청사항. 호스트만 본다 */
function FeedbackBox({ slug }: { slug: string }) {
  const [text, setText] = useState('');
  const [st, setSt] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const send = async () => {
    setSt('busy');
    const r = await api(`/api/e/${slug}/feedback`, { body: text });
    setSt(r.ok ? 'done' : 'err');
  };
  return (
    <section className="cls-rv">
      <h3>호스트에게 하고 싶은 말</h3>
      <p className="ds">모임 피드백이나 요청사항을 남겨주세요. 호스트만 읽어요.</p>
      <textarea value={text} maxLength={300} rows={3} placeholder="예: 라운드 시간이 조금 짧았어요 / 다음엔 이런 게임도 해주세요 (300자)" onChange={(e) => { setText(e.target.value); setSt('idle'); }} />
      <button className="btn" disabled={!text.trim() || st === 'busy'} onClick={send}>{st === 'done' ? '전달했어요 · 고쳐 쓰기' : '호스트에게 보내기'}</button>
      {st === 'err' && <p className="preview">보내지 못했어요. 다시 시도해주세요.</p>}
    </section>
  );
}

/** 나가기: 창을 닫는다. 브라우저가 닫기를 막으면(문자·카톡 링크로 연 탭) 첫 화면으로 보내고 기록을 남기지 않는다 */
const leave = () => {
  window.close();
  setTimeout(() => location.replace('/'), 150);
};

/** 마무리 신청(뒷풀이 · 모임 한 번 더 · 1:1 로테이션 · 나는솔로 토론회): 누르면 신청, 한 번 더 누르면 취소 */
function useSignups(slug: string) {
  const [on, setOn] = useState<ClosingKind[]>([]);
  const [busy, setBusy] = useState<ClosingKind | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api<{ kinds: ClosingKind[] }>(`/api/e/${slug}/closing-signup`).then((j) => j.ok && setOn(j.kinds ?? [])); }, [slug]);
  const toggle = async (k: ClosingKind) => {
    const next = !on.includes(k);
    setBusy(k); setErr('');
    const r = await api(`/api/e/${slug}/closing-signup`, { kind: k, on: next });
    setBusy(null);
    if (!r.ok) return setErr(r.message ?? '저장하지 못했어요. 다시 시도해주세요.');
    setOn(next ? [...on, k] : on.filter((x) => x !== k));
    return next;
  };
  return { on, busy, err, toggle };
}

function AfterParty({ s, onDone }: { s: ReturnType<typeof useSignups>; onDone: () => void }) {
  const joined = s.on.includes('afterparty');
  return (
    <section className="cls-ap">
      <p className="cls-ap-eb">AFTER PARTY</p>
      <h3>오늘 뒷풀이 모임</h3>
      <ul>
        <li>남녀 3명 이상 모이면 진행돼요</li>
        <li>장소는 호스트가 <b>문토</b>로 전달드려요</li>
      </ul>
      <button className={`btn${joined ? ' sub' : ''}`} disabled={s.busy === 'afterparty'} onClick={async () => { if (await s.toggle('afterparty')) onDone(); }}>
        {joined ? '✓ 뒷풀이 참여 신청했어요 · 취소하려면 눌러요' : '뒷풀이 참여할게요'}
      </button>
    </section>
  );
}

const OFFERS: [ClosingKind, string][] = [
  ['again', '모임 한 번 더 참여할게요! (20% 할인)'],
  ['rotation', '1:1 로테이션으로 신청할게요! (20% 할인)'],
  ['solo', '나는솔로 토론회 참여하기'],
];

function Offers({ s }: { s: ReturnType<typeof useSignups> }) {
  return (
    <section className="cls-offers">
      {OFFERS.map(([k, label]) => {
        const on = s.on.includes(k);
        return <button key={k} type="button" className={`cls-offer${on ? ' on' : ''}`} aria-pressed={on} disabled={s.busy === k} onClick={() => s.toggle(k)}>
          <span>{label}</span><em>{on ? '✓ 신청함' : '신청'}</em>
        </button>;
      })}
      <p className="ds">신청하시면 호스트가 따로 연락드려요. 한 번 더 누르면 취소돼요.</p>
      {s.err && <p className="preview">{s.err}</p>}
    </section>
  );
}

export default function Closing({ view, me, slug }: { view: PlayView; me: PublicCard | null; slug: string }) {
  const signups = useSignups(slug);
  const [thanks, setThanks] = useState(false); // 후기나 뒷풀이 신청을 하면 캐릭터가 인사하며 마무리
  const bye = () => { setThanks(true); setTimeout(() => document.getElementById('cls-bye')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); };

  return (
    <main className="cls" style={{ paddingTop: 40 }}>
      <div className="cls-wait" aria-hidden="true">{me && <Face c={me} size={150} />}</div>
      <h2 className="q" style={{ textAlign: 'center' }}>오늘 만나서<br />반가웠어요</h2>
      <p className="ds" style={{ textAlign: 'center' }}>서로 마음이 닿은 분들께는<br />1시간 이내로 따로 연락드릴게요.</p>

      {/* 오늘 뒷풀이가 맨 먼저 */}
      <AfterParty s={signups} onDone={bye} />

      <ReviewBox slug={slug} onDone={bye} />

      <FeedbackBox slug={slug} />

      {thanks && (
        <section id="cls-bye" className="cls-bye">
          <p className="cls-bubble">오늘 정말 고생 많으셨어요!<br />조심히 들어가세요 ♡</p>
          {me && <Face c={me} size={130} />}
        </section>
      )}

      {/* 리뷰 → 신청 버튼 3개 */}
      <Offers s={signups} />

      <button type="button" className="btn sub cls-leave" onClick={leave}>나가기</button>
    </main>
  );
}
