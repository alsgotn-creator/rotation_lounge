'use client';
import { useState } from 'react';
import { Icon } from '../../components/Icon';

// 미리보기용 가짜 신청자. 실제로는 Supabase에서 읽고, 호스트 로그인 뒤에만 보인다.
type Status = 'new' | 'wait' | 'ok';
type Ap = { id: number; name: string; g: '여' | '남'; y: string; job: string; when: string; phone: string; email: string; color: string; avoid?: string; status: Status };
const SEED: Ap[] = [
  { id: 1, name: '김민지', g: '여', y: '97', job: 'UX 디자이너', when: '10분 전', phone: '010-1234-5678', email: 'minji@gmail.com', color: '#e3a9b4,#b98aa8', avoid: '이서준 · 전 직장 동료 · 95년생', status: 'new' },
  { id: 2, name: '이도윤', g: '남', y: '95', job: '개발자', when: '1시간 전', phone: '010-2222-3333', email: 'doyoon@naver.com', color: '#8ea3d6,#6b7cb3', status: 'new' },
  { id: 3, name: '박지훈', g: '남', y: '94', job: '회계사', when: '3시간 전', phone: '010-4444-5555', email: 'jihoon@kakao.com', color: '#9cc2ad,#6f9a85', status: 'new' },
  { id: 4, name: '최하은', g: '여', y: '96', job: '간호사', when: '어제', phone: '010-6666-7777', email: 'haeun@gmail.com', color: '#f2c9a0,#d49a7a', status: 'wait' },
];
const TABS: [Status, string][] = [['new', '새 신청'], ['wait', '입금 대기'], ['ok', '확정']];
const NEXT: Record<Status, { label: string; to: Status; toast: string } | null> = {
  new: { label: '확정하고 입금 안내', to: 'wait', toast: '님께 입금 안내 메일을 보냈어요' },
  wait: { label: '입금 확인 · 사전 등록 보내기', to: 'ok', toast: '님께 사전 등록 링크를 보냈어요' },
  ok: null,
};

export default function Admin() {
  const [list, setList] = useState(SEED);
  const [tab, setTab] = useState<Status>('new');
  const [open, setOpen] = useState<Ap | null>(null);
  const [toast, setToast] = useState('');
  const bg = (c: string) => ({ background: `linear-gradient(160deg,${c})` });
  const move = (a: Ap) => {
    const n = NEXT[a.status]!;
    setList(list.map((x) => (x.id === a.id ? { ...x, status: n.to } : x)));
    setOpen(null); setToast(a.name + n.toast); setTimeout(() => setToast(''), 2400);
  };
  const okF = 6 + list.filter((x) => x.status === 'ok' && x.g === '여').length;
  const okM = 4 + list.filter((x) => x.status === 'ok' && x.g === '남').length;

  if (open) {
    const n = NEXT[open.status];
    return (
      <main>
        <div className="nb"><button className="bk" aria-label="뒤로" onClick={() => setOpen(null)}><Icon name="back" /></button><div className="tt">신청자</div></div>
        <div className="pics"><div style={bg(open.color)} /><div style={{ ...bg(open.color), opacity: .8 }} /><div style={{ ...bg(open.color), opacity: .6 }} /></div>
        <div className="bd" style={{ paddingTop: 16 }}>
          <h2 className="q" style={{ fontSize: 22 }}>{open.name} <small className="ds" style={{ fontSize: 14 }}>{open.g} · 19{open.y}년생</small></h2>
          <dl className="sum" style={{ marginTop: 12 }}>
            {[['하는 일', open.job], ['연락처', open.phone], ['이메일', open.email]].map(([k, v]) => <div className="kv" key={k} style={{ borderTop: 0 }}><span>{k}</span><b>{v}</b></div>)}
          </dl>
          {open.avoid && <div className="alert"><Icon name="info" /><div><b>피하고 싶은 지인 1명</b>{open.avoid}<br /><u>11월 15일 신청자 ‘이서준’과 이름이 같아요</u></div></div>}
        </div>
        {n && <div className="ft"><div className="btn2"><button className="btn sub" onClick={() => setOpen(null)}>보류</button><button className="btn" onClick={() => move(open)}>{n.label}</button></div></div>}
      </main>
    );
  }

  const shown = list.filter((x) => x.status === tab);
  return (
    <main>
      <div className="ah"><span className="logo">플러팅<i>.</i>라운지</span><span className="host">호스트 · 미리보기</span></div>
      <div className="bd" style={{ paddingTop: 8, animation: 'none' }}>
        <div className="evs"><div><b>11월 15일(토) · 성수</b><small>7:7 · 94~99년생</small></div><Icon name="down" /></div>
        <div className="seat">
          {([['여성 확정', okF], ['남성 확정', okM]] as const).map(([k, v]) => (
            <div key={k}><span>{k}</span><b>{v}<em> / 7</em></b><i style={{ background: `linear-gradient(90deg,var(--acc) ${(v / 7) * 100}%,var(--line) 0)` }} /></div>
          ))}
        </div>
        <div className="tabs" role="tablist">
          {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label} {list.filter((x) => x.status === k).length}</button>)}
        </div>
        {shown.length === 0 && <p className="empty">아직 없어요</p>}
        {shown.map((a) => (
          <button className="ap" key={a.id} onClick={() => setOpen(a)}>
            <div className="av2" style={bg(a.color)} />
            <div className="in2"><b>{a.name} <small>{a.g} · {a.y}</small></b><span>{a.job} · {a.when}</span>{a.avoid && <em className="warn"><Icon name="info" />지인 주의</em>}</div>
            <Icon name="next" />
          </button>
        ))}
      </div>
      {toast && <div className="toast" role="status" style={{ bottom: 30 }}><Icon name="check" />{toast}</div>}
    </main>
  );
}
