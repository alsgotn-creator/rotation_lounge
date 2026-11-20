'use client';
import { useState } from 'react';
import { Character } from '../../../components/Character';
import { api } from '../../../lib/api';
import type { PublicCard } from '../../../lib/domain/lounge';
import type { Shape } from '../../../lib/domain/register';
import type { PlayView } from '../../../lib/server/play';

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

function WineBox({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [st, setSt] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const join = async () => {
    setSt('busy');
    const r = await api(`/api/e/${slug}/wine`, {});
    setSt(r.ok ? 'done' : 'err');
    if (r.ok) onDone();
  };
  return (
    <div className="wine-orbit"><section className="cls-wine">
      <i className="wine-snow" aria-hidden="true" />
      <p className="wine-eyebrow">Christmas Invitation</p>
      <h3>연말 와인 무제한 모임</h3>
      <p className="cls-price"><s>70,000원</s> <b>58,000원</b> <em>17% 할인</em></p>
      <p className="ds">지인과 함께 오면 각각 30% 할인 (49,000원)<br />문토 리뷰를 남겨주시면 40% 할인 (42,000원)</p>
      <ul className="cls-wine-list">
        <li>12월 18일 진행 예정</li>
        <li>한 테이블 3:3 · 총 4테이블</li>
        <li>관상게임 · 익명게임 · 포송한 한해 마무리 콘텐츠</li>
        <li>인원이 모이지 않으면 진행되지 않아요</li>
      </ul>
      <p className="ds" style={{ margin: '0 0 14px', textAlign: 'center', fontWeight: 800 }}>옷깃만 믿고 오세요 😊</p>
      <button className="btn cls-wine-btn" disabled={st === 'busy' || st === 'done'} onClick={join}>
        {st === 'done' ? '✓ 문자로 안내해드릴게요' : <>와인 모임 관심있어요!<small>문자로 안내받기</small></>}
      </button>
      {st === 'done' && <p className="preview">호스트에게 이름과 연락처가 전달됐어요.</p>}
      {st === 'err' && <p className="preview">신청하지 못했어요. 다시 시도해주세요.</p>}
    </section></div>
  );
}

export default function Closing({ view, me, slug }: { view: PlayView; me: PublicCard | null; slug: string }) {
  const [thanks, setThanks] = useState(false); // 후기나 와인모임 신청을 하면 캐릭터가 인사하며 마무리
  const bye = () => { setThanks(true); setTimeout(() => document.getElementById('cls-bye')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); };

  return (
    <main className="cls" style={{ paddingTop: 40 }}>
      <div className="cls-wait" aria-hidden="true">{me && <Face c={me} size={150} />}</div>
      <h2 className="q" style={{ textAlign: 'center' }}>오늘 만나서<br />반가웠어요</h2>
      <p className="ds" style={{ textAlign: 'center' }}>서로 마음이 닿은 분들께는<br />1시간 이내로 따로 연락드릴게요.</p>

      {view.team?.reveal && (
        <section className="cls-secret">
          <p className="tm-eb">PARTNER SECRET</p>
          <h3>사실 두 분은…</h3>
          <p>오늘 참가자 중 <b>가치관과 MBTI가 가장 다른</b> 짝이었어요.</p>
          <div className="cls-secret-n"><div><small>가치관 일치율</small><b>{view.team.reveal.similar}%</b></div><div><small>MBTI 같은 글자</small><b>{view.team.reveal.mbtiSame} / 4</b></div></div>
          <p className="ds">정반대라서 서로의 이상형을 더 잘 찾아줄 수 있었을까요?</p>
        </section>
      )}

      <ReviewBox slug={slug} onDone={bye} />

      <FeedbackBox slug={slug} />

      {thanks && (
        <section id="cls-bye" className="cls-bye">
          <p className="cls-bubble">오늘 정말 고생 많으셨어요!<br />조심히 들어가세요 ♡</p>
          {me && <Face c={me} size={130} />}
        </section>
      )}

      {/* 연말 와인모임 안내는 맨 아래 */}
      <WineBox slug={slug} onDone={bye} />

      <button type="button" className="btn sub cls-leave" onClick={leave}>나가기</button>
    </main>
  );
}
