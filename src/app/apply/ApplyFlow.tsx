'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '../../components/Icon';
import { yy } from '../../lib/signup/data';
import type { Session } from '../../lib/signup/rules';
import { after010, birthError, digits, formatPhone, isBirth, isName } from '../../lib/signup/validate';

type Gender = '' | 'f' | 'm';
type Avoid = { name: string; note: string };
const STEPS = 4;
const JOBS = ['통역사', '디자이너', '무역업', '피부관리사', '광고업', '인천공항직원', '은행원'];

export default function ApplyFlow({ sessions, initialSession }: { sessions: Session[]; initialSession: string | null }) {
  const router = useRouter();
  const pre = sessions.find((s) => s.id === initialSession && !s.closed);
  const [step, setStep] = useState(pre ? 1 : 0);
  const [sessionId, setSessionId] = useState(pre?.id ?? '');
  const [gender, setGender] = useState<Gender>('');
  const [basic, setBasic] = useState(0); // 0 이름 → 1 출생연도 → 2 하는 일 → 3 번호 (토스식으로 위에 쌓임)
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [phone, setPhone] = useState(''); // 010 뒤 8자리
  const [job, setJob] = useState('');
  const [avoidMode, setAvoidMode] = useState<'' | 'no' | 'yes'>('');
  const [avoid, setAvoid] = useState<Avoid[]>([]);
  const [draft, setDraft] = useState<Avoid>({ name: '', note: '' });
  const [sheet, setSheet] = useState(false);
  const [share, setShare] = useState(false); // 매칭되면 상대에게 이름·번호 전달 동의
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  const s = sessions.find((x) => x.id === sessionId);
  const go = (n: number) => { setStep(n); window.scrollTo(0, 0); };
  // shortcut: 브라우저 뒤로가기는 단계가 아니라 페이지 단위로 동작함. 실제 오픈 전 history 연동 고려.
  const back = () => (step === 0 ? router.push('/') : go(step - 1));

  const tel = formatPhone(`010${phone}`);
  if (done) return <Done phone={tel} />;

  const submit = async () => {
    if (!s || sending) return;
    setSending(true); setErr('');
    const fd = new FormData();
    Object.entries({ eventId: s.id, gender, name: name.trim(), birth, phone: tel, job: job.trim(), contactConsent: share ? 'yes' : '', avoid: JSON.stringify(avoidMode === 'yes' ? avoid : []) })
      .forEach(([k, v]) => fd.append(k, v));
    try {
      const r = await fetch('/api/apply', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({ ok: false, message: '잠시 뒤에 다시 시도해주세요.' }));
      if (!j.ok) { setErr(j.message); return; }
      setSheet(false); setDone(true); window.scrollTo(0, 0);
    } catch { setErr('인터넷 연결을 확인하고 다시 시도해주세요.'); }
    finally { setSending(false); }
  };

  // 단계별 다음 버튼 가능 여부
  const bErr = s ? birthError(birth, s.birthFrom, s.birthTo) : null;
  const basicOk = [isName(name), !!s && isBirth(birth, s.birthFrom, s.birthTo), job.trim().length >= 2, phone.length === 8];
  const canNext = [
    !!s, !!gender,
    basicOk[basic],
    avoidMode === 'no' || (avoidMode === 'yes' && avoid.length > 0),
  ][step];

  const next = () => {
    if (!canNext) return;
    if (step === 2 && basic < 3) { setBasic(basic + 1); return; }
    if (step === STEPS - 1) { setSheet(true); return; }
    go(step + 1);
  };

  const basicTitle = ['이름을 알려주세요', '태어난 해를 알려주세요', '어떤 일을 하세요?', '휴대폰 번호를 알려주세요'][basic];
  // 다 채우면 확인을 안 눌러도 다음 칸으로 (출생연도 4자리, 직업 칩, 번호 8자리). 이름은 길이가 제각각이라 확인 버튼으로.
  const auto = (ok: boolean) => { const n = basic; if (ok) setTimeout(() => (n < 3 ? setBasic((b) => Math.max(b, n + 1)) : go(3)), 250); };
  const okBtn = (n: number) => basic === n && <button className="btn inl" type="submit" disabled={!canNext}>확인</button>;

  return (
    <main>
      <div className="nb">
        <button className="bk" aria-label="뒤로" onClick={back}><Icon name="back" /></button>
        <div className="pg" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS} aria-valuenow={step + 1}><i style={{ width: `${((step + 1) / STEPS) * 100}%` }} /></div>
      </div>

      <form className="bd" key={step} onSubmit={(e) => { e.preventDefault(); next(); }}>
        {step === 0 && <>
          <h2 className="q">어느 날 오실래요?</h2>
          <p className="ds">남은 자리는 실시간이에요.</p>
          <div style={{ marginTop: 22 }}>
            {sessions.length === 0 && <p className="ds" style={{ marginTop: 22 }}>지금 열린 일정이 없어요. 곧 다음 일정을 열게요.</p>}
            {sessions.map((x) => (
              <button type="button" key={x.id} disabled={x.closed} className={`opt${sessionId === x.id ? ' on' : ''}`}
                onClick={() => { setSessionId(x.id); if (sessionId !== x.id) setGender(''); setTimeout(() => go(1), 180); }}>
                <div className="d">{x.mon}<b>{x.day}</b>{x.dow}</div>
                <div className="t"><strong>{x.time} · {x.place}</strong>{yy(x.birthFrom)}~{yy(x.birthTo)}년생
                  {!x.closed && <><br /><em>여성 {x.seatsF} · 남성 {x.seatsM}자리 남음</em></>}</div>
                {x.closed ? <span className="end">마감</span> : <span className="chk" />}
              </button>
            ))}
          </div>
          <p className="hint"><Icon name="info" />나이대가 맞는 날만 신청할 수 있어요</p>
        </>}

        {step === 1 && s && <>
          <h2 className="q">성별을 골라주세요</h2>
          <p className="ds">{s.dateLabel} {s.time} · {s.place}</p>
          <div className="tiles">
            {([['f', '여성', '♀', s.seatsF], ['m', '남성', '♂', s.seatsM]] as const).map(([g, label, sym, seats]) => (
              <button type="button" key={g} disabled={seats === 0} className={`tile${gender === g ? ' on' : ''}`}
                onClick={() => { setGender(g); setTimeout(() => go(2), 180); }}>
                <span className="sym" aria-hidden="true">{sym}</span>{label}<small>{seats === 0 ? '마감' : `${seats}자리 남음`}</small>
              </button>
            ))}
          </div>
        </>}

        {step === 2 && s && <>
          <h2 className="q" aria-live="polite">{basicTitle}</h2>
          {basic >= 3 && <><label className="fld new"><span>휴대폰 번호</span>
            <div className="tel010"><b>010</b><input autoFocus type="tel" inputMode="numeric" autoComplete="tel-local-suffix" placeholder="1234 5678" maxLength={14} aria-label="010 뒤 8자리"
              value={phone.length > 4 ? `${phone.slice(0, 4)} ${phone.slice(4)}` : phone}
              onChange={(e) => { const v = after010(e.target.value); setPhone(v); if (v.length === 8 && phone.length < 8) auto(true); }} /></div></label>{okBtn(3)}</>}
          {basic >= 2 && <><label className={`fld${basic === 2 ? ' new' : ''}`}><span>하는 일</span>
            <input autoFocus={basic === 2} placeholder="직군 정도면 충분해요" value={job} onChange={(e) => setJob(e.target.value)} /></label>
            {basic === 2 && <div className="chips">{JOBS.map((j) => <button type="button" key={j} onClick={() => { setJob(j); auto(true); }}>{j}</button>)}</div>}
            {okBtn(2)}</>}
          {basic >= 1 && <><label className={`fld${basic === 1 ? ' new' : ''}${bErr ? ' err' : ''}`}><span>출생연도</span>
            <input autoFocus={basic === 1} inputMode="numeric" placeholder={`예: ${s.birthFrom + 3}`} maxLength={4} value={birth}
              onChange={(e) => { const v = digits(e.target.value).slice(0, 4); setBirth(v); if (basic === 1) auto(isBirth(v, s.birthFrom, s.birthTo)); }} />
            {bErr && <p className="msg e">{bErr}</p>}</label>{okBtn(1)}</>}
          <label className="fld"><span>이름</span>
            <input autoFocus={basic === 0} autoComplete="name" placeholder="실명으로 적어주세요" value={name} onChange={(e) => setName(e.target.value)} /></label>
          {okBtn(0)}
        </>}

        {step === 3 && <>
          <h2 className="q">마주치고 싶지 않은<br />지인이 있나요?</h2>
          <p className="ds">적어주시면 같은 날 배정하지 않아요.</p>
          <div className="yn">
            <button type="button" className={avoidMode === 'no' ? 'on' : ''} onClick={() => { setAvoidMode('no'); setTimeout(() => setSheet(true), 180); }}>없어요</button>
            <button type="button" className={avoidMode === 'yes' ? 'on' : ''} onClick={() => setAvoidMode('yes')}>있어요</button>
          </div>
          {avoidMode === 'yes' && <>
            {avoid.map((a, i) => (
              <div className="pp" key={i}><span className="av"><Icon name="user" /></span><div><b>{a.name}</b>{a.note && <span>{a.note}</span>}</div>
                <button type="button" onClick={() => setAvoid(avoid.filter((_, j) => j !== i))}>삭제</button></div>
            ))}
            <div className="addf">
              <label className="fld"><span>이름</span><input autoFocus placeholder="예: 이서준" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
              <label className="fld"><span>관계나 특징 (선택)</span><input placeholder="예: 전 직장 동료 · 95년생" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
              <div className="row"><button type="button" className="btn sub" disabled={!isName(draft.name)}
                onClick={() => { setAvoid([...avoid, { name: draft.name.trim(), note: draft.note.trim() }]); setDraft({ name: '', note: '' }); }}>
                {avoid.length ? '한 명 더 적기' : '추가하기'}</button></div>
            </div>
            <div className="safe"><Icon name="lock" /><div>상대에게는 <b>절대 알리지 않아요.</b> 호스트만 확인하고 행사가 끝나면 지워요.</div></div>
          </>}
        </>}

        {/* 일정·성별은 고르면 바로 넘어가서 버튼이 필요 없음 */}
        {step === 3 && avoidMode !== '' && (
          <div className="ft"><button className="btn" type="submit" disabled={!canNext}>다음</button></div>
        )}
      </form>

      {sheet && s && <>
        <div className="dim" onClick={() => setSheet(false)} />
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t">
          <div className="grab" />
          <h3 id="sheet-t">이대로 신청할까요?</h3>
          <p className="ds">호스트가 신청을 확인(승인)하면 라운지에 입장할 수 있게 해드려요.</p>
          <dl className="sum">
            {([
              ['일정', `${s.dateLabel} ${s.time}`, 0],
              ['이름', `${name.trim()} · ${gender === 'f' ? '여성' : '남성'} · ${birth}`, 2],
              ['휴대폰', tel, 2],
              ['하는 일', job.trim(), 2],
              ['피하고 싶은 지인', avoidMode === 'yes' ? `${avoid.length}명` : '없음', 3],
            ] as const).map(([k, v, to]) => (
              <button type="button" key={k} onClick={() => { setSheet(false); go(to); }} aria-label={`${k} 고치기`}><dt>{k}</dt><dd>{v}</dd></button>
            ))}
          </dl>
          <button type="button" className={`agree${share ? ' on' : ''}`} onClick={() => setShare(!share)} aria-pressed={share}>
            <span className="chk" /><span style={{ textAlign: 'left' }}>(필수) 서로 고른 상대가 있으면, 그 상대에게 제 <b>이름과 휴대폰 번호</b>가 문자로 전달되는 데 동의해요</span></button>
          {err && <p className="msg e" role="alert" style={{ margin: '0 0 10px', fontSize: 14, textAlign: 'center' }}>{err}</p>}
          <button className="btn" disabled={!share || sending} onClick={submit}>{sending ? '보내는 중…' : '신청하기'}</button>
        </div>
      </>}
    </main>
  );
}

function Done({ phone }: { phone: string }) {
  return (
    <main className="fin">
      <div className="big"><Icon name="check" /></div>
      <h2 className="q">신청을 마쳤어요</h2>
      <p className="ds">호스트가 확인하면 문자로 안내드릴게요.<br />라운지에는 <b>신청한 휴대폰 번호</b>로 들어와요.</p>
      <div className="card"><div className="tl">
        <div className="done"><i /><span><b>신청 완료</b><small>{phone}</small></span></div>
        <div className="now"><i /><span><b>호스트 확인 중</b><small>보통 하루 안에 끝나요</small></span></div>
        <div><i /><span><b>승인 후 라운지 입장</b><small>첫 화면 '라운지 입장'에 이 번호를 넣으면 돼요</small></span></div>
      </div></div>
      <div className="ft"><Link className="btn" href="/">처음으로</Link></div>
    </main>
  );
}
