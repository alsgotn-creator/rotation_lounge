'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { roundName, shuffle, WC, wcImg, type WcCard } from '../../../lib/domain/worldcup';

/** 이상형 월드컵 16강: 둘 중 한 명을 누르면 바로 다음 대결로. 결승이 끝나면 저장하고 라운지로 간다 */
export default function Worldcup({ slug, gender }: { slug: string; gender: 'f' | 'm' }) {
  const router = useRouter();
  const pool = WC[gender === 'f' ? 'm' : 'f'];
  const [round, setRound] = useState<WcCard[]>([]); // 이번 강에 남은 사람 (첫 렌더 뒤에 섞는다: 서버와 같은 화면으로 시작)
  const [next, setNext] = useState<WcCard[]>([]);
  const [i, setI] = useState(0); // 이번 강의 몇 번째 대결
  const [out, setOut] = useState<string[]>([]); // 떨어진 순서
  const [picked, setPicked] = useState<string | null>(null);
  const [winner, setWinner] = useState<WcCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => setRound(shuffle(pool)), [pool]);
  const pair = round.slice(i * 2, i * 2 + 2);
  const matches = round.length / 2;
  // 다음 대결 사진을 미리 받아둔다
  const upcoming = useMemo(() => round.slice(i * 2 + 2, i * 2 + 4), [round, i]);

  const pick = (w: WcCard) => {
    if (picked) return;
    setPicked(w.id);
    setTimeout(() => {
      const lose = pair.find((c) => c.id !== w.id)!;
      const nx = [...next, w], o = [...out, lose.id];
      setPicked(null);
      if (i + 1 < matches) { setNext(nx); setOut(o); setI(i + 1); return; }
      if (nx.length === 1) { setOut([...o, w.id]); setWinner(w); return; }
      setRound(nx); setNext([]); setOut(o); setI(0);
    }, 320);
  };

  const save = async () => {
    if (!winner) return;
    setBusy(true); setErr('');
    const j = await api(`/api/e/${slug}/worldcup`, { winner: winner.id, order: out });
    setBusy(false);
    if (!j.ok) return setErr(j.message ?? '다시 시도해주세요.');
    router.refresh(); window.scrollTo(0, 0);
  };
  const again = () => { setRound(shuffle(pool)); setNext([]); setI(0); setOut([]); setWinner(null); };

  if (winner) return (
    <main className="wc">
      <p className="eb">이상형 월드컵 · 우승</p>
      <h2 className="q">이 분이 내 이상형이에요</h2>
      <figure className="wc-win"><img src={wcImg(winner.id)} alt="" /><figcaption>{winner.line}</figcaption></figure>
      <p className="ds">사전채팅이 열리면 파트너에게 이 결과가 보여요. 서로의 이상형 이야기를 나눠보세요.</p>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn" disabled={busy} onClick={save}>{busy ? '저장하는 중…' : '저장하고 라운지로'}</button>
      <button type="button" className="lnk" onClick={again} disabled={busy}>처음부터 다시 하기</button>
    </main>
  );

  return (
    <main className="wc">
      <p className="eb">이상형 월드컵 · {round.length ? `${roundName(round.length)} ${i + 1}/${matches}` : '준비 중'}</p>
      <h2 className="q">더 끌리는 쪽을 눌러주세요</h2>
      <p className="ds">가상의 인물이에요. 분위기만 보고 편하게 골라주세요.</p>
      <div className="wc-vs">
        {pair.map((c) => (
          <button key={c.id} type="button" className={`wc-card${picked === c.id ? ' on' : picked ? ' off' : ''}`} onClick={() => pick(c)} aria-label={`${c.line} 고르기`}>
            <img src={wcImg(c.id)} alt="" width={600} height={800} />
            <span>{c.line}</span>
          </button>
        ))}
        {pair.length === 2 && <i className="wc-x" aria-hidden="true">VS</i>}
      </div>
      <div hidden>{upcoming.map((c) => <img key={c.id} src={wcImg(c.id)} alt="" />)}</div>
    </main>
  );
}
