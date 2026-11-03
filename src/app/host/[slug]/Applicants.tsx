'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '../../../components/Icon';
import { ACCOUNT, won } from '../../../lib/signup/data';
import type { AppStatus, Session } from '../../../lib/signup/rules';

export type Row = {
  id: string; name: string; gender: 'f' | 'm'; birthYear: number; job: string; phone: string; email: string;
  status: AppStatus; paymentDue: string | null; createdAt: string; number: number | null; avoid: { name: string; note: string }[];
  photos: string[]; avoidHits: string[]; avoidedBy: string[];
};
type Ev = { id: string; slug: string; applyOpen: boolean; capacity: number; tables: number; perTable: number; price: number };

const TABS: [string, string, AppStatus[]][] = [
  ['new', '새 신청', ['new']], ['wait', '입금 대기', ['awaiting_payment']], ['ok', '확정', ['confirmed']], ['etc', '대기·취소', ['held', 'cancelled']],
];
const STATUS_KO: Record<AppStatus, string> = { new: '새 신청', held: '대기', awaiting_payment: '입금 대기', confirmed: '확정', cancelled: '취소' };
const ACTIONS: Record<AppStatus, [string, string][]> = {
  new: [['hold', '대기로'], ['approve', '확정하고 입금 안내']],
  held: [['cancel', '취소'], ['approve', '확정하고 입금 안내']],
  awaiting_payment: [['hold', '대기로'], ['paid', '입금 확인 · 입장 링크']],
  confirmed: [['cancel', '참가 취소'], ['relink', '입장 링크 다시 만들기']],
  cancelled: [['restore', '새 신청으로 되돌리기']],
};
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 60 ? `${Math.max(m, 1)}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`;
};
const kDue = (d: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(d + 'T12:00:00+09:00'));

export default function Applicants({ event, session, rows }: { event: Ev; session: Session; rows: Row[] }) {
  const router = useRouter();
  const [tab, setTab] = useState('new');
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ title: string; text: string } | null>(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const show = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2400); };
  const open = rows.find((r) => r.id === openId) ?? null;
  const filled = (g: 'f' | 'm') => event.capacity - (g === 'f' ? session.seatsF : session.seatsM);

  const act = async (r: Row, action: string) => {
    setBusy(true);
    const res = await fetch(`/api/host/applications/${r.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
    const j = await res.json().catch(() => ({ ok: false, message: '다시 시도해주세요.' }));
    setBusy(false);
    if (!j.ok) return show(j.message);
    if (action === 'approve') setMsg({
      title: `${r.name}님께 보낼 입금 안내`,
      text: `[플러팅 라운지] ${r.name}님, ${session.dateLabel} ${session.time} 자리를 잡아뒀어요!\n\n${kDue(j.paymentDue)}까지 아래 계좌로 참가비 ${won(event.price)}을 보내주세요.\n${ACCOUNT.bank} ${ACCOUNT.number} (${ACCOUNT.holder})\n보내는 분 이름: ${r.name}\n\n입금이 확인되면 나만의 라운지 입장 링크를 보내드려요.`,
    });
    else if (j.inviteToken) setMsg({
      title: `${r.name}님께 보낼 입장 링크`,
      text: `[플러팅 라운지] ${r.name}님, 입금 확인됐어요. 자리가 확정됐어요!\n오늘 ${r.name}님은 ${r.gender === 'f' ? '여자' : '남자'} ${j.number}호예요.\n\n아래 링크로 사전 등록을 해주세요 (약 5분).\n${location.origin}/e/${event.slug}/join/${j.inviteToken}\n\n이 링크는 ${r.name}님 전용이에요. 다른 사람과 공유하지 말아주세요.`,
    });
    else { show(`${r.name}님: ${STATUS_KO[j.status as AppStatus]}`); setOpenId(null); }
    router.refresh();
  };
  const copyMsg = async () => {
    try { await navigator.clipboard.writeText(msg!.text); show('복사했어요. 카톡이나 문자로 보내주세요'); setMsg(null); setOpenId(null); }
    catch { show('길게 눌러서 복사해주세요'); }
  };
  const setLayout = async (patch: { tables?: number; perTable?: number }) => {
    const r = await fetch('/api/host/events', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: event.id, ...patch }) });
    const j = await r.json().catch(() => ({ ok: false, message: '다시 시도해주세요.' }));
    show(j.ok ? '바꿨어요' : j.message);
    router.refresh();
  };
  const toggleApply = async () => {
    await fetch('/api/host/events', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: event.id, applyOpen: !event.applyOpen }) });
    router.refresh();
  };

  if (open) {
    const acts = ACTIONS[open.status];
    return (
      <main>
        <div className="nb"><button className="bk" aria-label="뒤로" onClick={() => setOpenId(null)}><Icon name="back" /></button><div className="tt">신청자</div></div>
        <div className="pics">
          {[0, 1, 2].map((i) => open.photos[i]
            ? <a key={i} href={open.photos[i]} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 16, background: `center/cover url("${open.photos[i]}")` }} aria-label={`사진 ${i + 1} 크게 보기`} />
            : <div key={i} style={{ background: 'var(--surf)' }} />)}
        </div>
        <div className="bd" style={{ paddingTop: 16 }}>
          <span className="badge">{STATUS_KO[open.status]}{open.number != null && ` · ${open.gender === 'f' ? '여' : '남'}${open.number}호`}</span>
          <h2 className="q" style={{ fontSize: 22, marginTop: 10 }}>{open.name} <small className="ds" style={{ fontSize: 14 }}>{open.gender === 'f' ? '여' : '남'} · {open.birthYear}년생</small></h2>
          <dl className="sum" style={{ marginTop: 12 }}>
            {[['하는 일', open.job], ['연락처', open.phone], ['이메일', open.email], ['신청', ago(open.createdAt)], ...(open.paymentDue ? [['입금 기한', kDue(open.paymentDue)]] : [])]
              .map(([k, v]) => <div className="kv" key={k} style={{ borderTop: 0 }}><span>{k}</span><b>{k === '연락처' ? <a href={`tel:${v}`}>{v}</a> : v}</b></div>)}
          </dl>
          {open.avoid.length > 0 && <div className="alert"><Icon name="info" /><div>
            <b>피하고 싶은 지인 {open.avoid.length}명</b>
            {open.avoid.map((a) => <div key={a.name}>{a.name}{a.note && ` · ${a.note}`}</div>)}
            {open.avoidHits.length > 0 && <u>이 일정 신청자 중 같은 이름: {open.avoidHits.join(', ')}</u>}
          </div></div>}
          {open.avoidedBy.length > 0 && <div className="alert"><Icon name="info" /><div><b>이 사람을 피하고 싶어 하는 신청자</b>{open.avoidedBy.join(', ')}</div></div>}
        </div>
        <div className="ft"><div className="btn2" style={acts.length === 1 ? { gridTemplateColumns: '1fr' } : undefined}>
          {acts.map(([a, label], i) => <button key={a} disabled={busy} className={`btn${i === 0 && acts.length > 1 ? ' sub' : ''}`} onClick={() => act(open, a)}>{label}</button>)}
        </div></div>
        {msg && <Sheet msg={msg} onCopy={copyMsg} onClose={() => { setMsg(null); setOpenId(null); }} />}
        {toast && <div className="toast" role="status"><Icon name="check" />{toast}</div>}
      </main>
    );
  }

  const shown = rows.filter((r) => TABS.find((t) => t[0] === tab)![2].includes(r.status));
  return (
    <main>
      <div className="nb"><Link className="bk" aria-label="일정 목록" href="/host"><Icon name="back" /></Link><div className="tt" style={{ marginRight: 0 }}>신청 관리</div><Link className="host" style={{ marginRight: 12 }} href={`/host/${event.slug}/run`}>진행 화면</Link></div>
      <div className="bd" style={{ paddingTop: 4, animation: 'none' }}>
        <div className="evs"><div><b>{session.dateLabel} {session.time} · {session.place}</b><small>{session.birthFrom}~{session.birthTo}년생 · {event.capacity}:{event.capacity}</small></div>
          <button className="host" style={{ border: 0, cursor: 'pointer' }} onClick={toggleApply}>{event.applyOpen ? '신청 받는 중' : '신청 닫힘'}</button></div>
        <div className="kv" style={{ borderTop: 0, marginTop: 8, alignItems: 'center' }}><span>테이블 수</span>
          <div className="chips" style={{ margin: 0 }}>
            <button disabled={event.tables <= 2} onClick={() => setLayout({ tables: event.tables - 1 })} aria-label="테이블 줄이기">−</button>
            <b style={{ minWidth: 30, textAlign: 'center', alignSelf: 'center' }}>{event.tables}</b>
            <button disabled={event.tables >= 12} onClick={() => setLayout({ tables: event.tables + 1 })} aria-label="테이블 늘리기">+</button>
          </div></div>
        <div className="kv" style={{ alignItems: 'center' }}><span>한 테이블 인원</span>
          <div className="chips" style={{ margin: 0 }}>
            {[1, 2, 3].map((n) => <button key={n} aria-pressed={event.perTable === n} onClick={() => event.perTable !== n && setLayout({ perTable: n })}
              style={event.perTable === n ? { background: 'var(--accbg)', color: 'var(--acc)' } : undefined}>{n}:{n}</button>)}
          </div></div>
        <p className="hint" style={{ marginTop: 2 }}>성별당 최대 {event.capacity}명 ({event.tables}개 x {event.perTable}명)</p>
        <div className="seat">
          {(['f', 'm'] as const).map((g) => {
            const v = filled(g);
            return <div key={g}><span>{g === 'f' ? '여성' : '남성'} (입금 대기+확정)</span><b>{v}<em> / {event.capacity}</em></b>
              <i style={{ background: `linear-gradient(90deg,var(--acc) ${(v / event.capacity) * 100}%,var(--line) 0)` }} /></div>;
          })}
        </div>
        <div className="tabs" role="tablist">
          {TABS.map(([k, label, sts]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label} {rows.filter((r) => sts.includes(r.status)).length}</button>)}
        </div>
        {shown.length === 0 && <p className="empty">아직 없어요</p>}
        {shown.map((r) => (
          <button className="ap" key={r.id} onClick={() => setOpenId(r.id)}>
            <div className="av2" style={r.photos[0] ? { background: `center/cover url("${r.photos[0]}")` } : { background: 'var(--surf2)' }} />
            <div className="in2"><b>{r.name} <small>{r.gender === 'f' ? '여' : '남'} · {String(r.birthYear).slice(2)}</small></b>
              <span>{r.number != null && <b style={{ color: 'var(--acc)' }}>{r.gender === 'f' ? '여' : '남'}{r.number}호 · </b>}{r.job} · {ago(r.createdAt)}{r.status === 'cancelled' && ' · 취소'}{r.status === 'held' && ' · 대기'}</span>
              {(r.avoidHits.length > 0 || r.avoidedBy.length > 0) && <em className="warn"><Icon name="info" />지인 주의</em>}</div>
            <Icon name="next" />
          </button>
        ))}
      </div>
      {toast && <div className="toast" role="status" style={{ bottom: 30 }}><Icon name="check" />{toast}</div>}
    </main>
  );
}

function Sheet({ msg, onCopy, onClose }: { msg: { title: string; text: string }; onCopy: () => void; onClose: () => void }) {
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="mt">
        <div className="grab" />
        <h3 id="mt">{msg.title}</h3>
        <p className="ds">아직 메일이 연결되지 않아서, 복사해서 카톡이나 문자로 보내주세요.</p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: '16px 0', padding: 14, borderRadius: 14, background: 'var(--surf)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, lineHeight: 1.6, maxHeight: 260, overflow: 'auto' }}>{msg.text}</pre>
        <div className="btn2"><button className="btn sub" onClick={onClose}>닫기</button><button className="btn" onClick={onCopy}>메시지 복사</button></div>
      </div>
    </>
  );
}
