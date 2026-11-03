'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '../../components/Icon';
import { SESSIONS, yy } from '../../lib/signup/data';
import { birthError, digits, formatPhone, isBirth, isEmail, isName, isPhone } from '../../lib/signup/validate';

type Gender = '' | 'f' | 'm';
type Avoid = { name: string; note: string };
const STEPS = 7;
const DOMAINS = ['@gmail.com', '@naver.com', '@kakao.com', '@daum.net'];
const JOBS = ['개발자', '교사', '간호사', '마케터', '공무원'];

export default function ApplyFlow({ initialSession }: { initialSession: string | null }) {
  const router = useRouter();
  const pre = SESSIONS.find((s) => s.id === initialSession && !s.closed);
  const [step, setStep] = useState(pre ? 1 : 0);
  const [sessionId, setSessionId] = useState(pre?.id ?? '');
  const [gender, setGender] = useState<Gender>('');
  const [basic, setBasic] = useState(0); // 0 이름 → 1 출생연도 → 2 번호 (토스식으로 위에 쌓임)
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [job, setJob] = useState('');
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const [avoidMode, setAvoidMode] = useState<'' | 'no' | 'yes'>('');
  const [avoid, setAvoid] = useState<Avoid[]>([]);
  const [draft, setDraft] = useState<Avoid>({ name: '', note: '' });
  const [sheet, setSheet] = useState(false);
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const slotRef = useRef(0);

  const s = SESSIONS.find((x) => x.id === sessionId);
  const go = (n: number) => { setStep(n); window.scrollTo(0, 0); };
  // shortcut: 브라우저 뒤로가기는 단계가 아니라 페이지 단위로 동작함. 실제 오픈 전 history 연동 고려.
  const back = () => (step === 0 ? router.push('/') : go(step - 1));

  useEffect(() => () => photos.forEach((p) => p && URL.revokeObjectURL(p)), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return <Done email={email} />;

  const pickPhoto = (i: number) => { slotRef.current = i; fileRef.current?.click(); };
  const onFile = (f: File | undefined) => {
    if (!f) return;
    setPhotos((ps) => {
      const n = [...ps];
      const i = n[slotRef.current] ? slotRef.current : n.findIndex((p) => !p);
      if (n[i]) URL.revokeObjectURL(n[i]!);
      n[i] = URL.createObjectURL(f);
      return n;
    });
  };
  const photoCount = photos.filter(Boolean).length;

  // 단계별 다음 버튼 가능 여부
  const bErr = s ? birthError(birth, s.birthFrom, s.birthTo) : null;
  const basicOk = [isName(name), !!s && isBirth(birth, s.birthFrom, s.birthTo), isPhone(phone)];
  const canNext = [
    !!s, !!gender,
    basicOk[basic],
    isEmail(email), job.trim().length >= 2, photoCount >= 1,
    avoidMode === 'no' || (avoidMode === 'yes' && avoid.length > 0),
  ][step];

  const next = () => {
    if (!canNext) return;
    if (step === 2 && basic < 2) { setBasic(basic + 1); return; }
    if (step === STEPS - 1) { setSheet(true); return; }
    go(step + 1);
  };

  const basicTitle = ['이름을 알려주세요', '태어난 해를 알려주세요', '휴대폰 번호를 알려주세요'][basic];

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
            {SESSIONS.map((x) => (
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
          {basic >= 2 && <label className="fld new"><span>휴대폰 번호</span>
            <input autoFocus inputMode="numeric" autoComplete="tel" placeholder="010-0000-0000" value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))} /></label>}
          {basic >= 1 && <label className={`fld${basic === 1 ? ' new' : ''}${bErr ? ' err' : ''}`}><span>출생연도</span>
            <input autoFocus={basic === 1} inputMode="numeric" placeholder={`예: ${s.birthFrom + 3}`} maxLength={4} value={birth}
              onChange={(e) => setBirth(digits(e.target.value).slice(0, 4))} />
            {bErr && <p className="msg e">{bErr}</p>}</label>}
          <label className="fld"><span>이름</span>
            <input autoFocus={basic === 0} autoComplete="name" placeholder="실명으로 적어주세요" value={name} onChange={(e) => setName(e.target.value)} /></label>
        </>}

        {step === 3 && <>
          <h2 className="q">안내 메일을 받을<br />이메일을 알려주세요</h2>
          <label className="fld"><span>이메일</span>
            <input autoFocus type="email" inputMode="email" autoComplete="email" placeholder="example@gmail.com" value={email} onChange={(e) => setEmail(e.target.value.trim())} /></label>
          {!email.includes('@') && <div className="chips">
            {DOMAINS.map((d) => <button type="button" key={d} onClick={() => setEmail((email || '') + d)}>{d}</button>)}
          </div>}
          <p className="hint"><Icon name="lock" />신청 안내 말고는 메일을 보내지 않아요</p>
        </>}

        {step === 4 && <>
          <h2 className="q">어떤 일을 하세요?</h2>
          <p className="ds">직군 정도면 충분해요. 대화 7분째에 맞은편 한 사람에게만 보여요.</p>
          <label className="fld"><span>하는 일</span>
            <input autoFocus placeholder="예: UX 디자이너" value={job} onChange={(e) => setJob(e.target.value)} /></label>
          <div className="chips">{JOBS.map((j) => <button type="button" key={j} onClick={() => setJob(j)}>{j}</button>)}</div>
        </>}

        {step === 5 && <>
          <h2 className="q">얼굴이 잘 보이는<br />사진을 올려주세요</h2>
          <p className="ds">한 장은 꼭, 두 장 더는 원하면요.</p>
          <input ref={fileRef} className="sr" type="file" accept="image/*" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          <div className="ph">
            {photos.map((p, i) => (
              <button type="button" key={i} className={`slot${i === 0 ? ' big' : ''}${p ? ' filled' : ''}`} onClick={() => pickPhoto(i)}
                aria-label={p ? `${i + 1}번째 사진 바꾸기` : `${i + 1}번째 사진 추가`}>
                {p ? <><img src={p} alt="" /><span className="chg">바꾸기</span></> : <>{i === 0 && <span className="req">필수</span>}<Icon name="plus" />{i === 0 ? '사진 올리기' : '추가'}</>}
              </button>
            ))}
          </div>
          <div className="mini"><span><Icon name="check" />정면 얼굴</span><span><Icon name="check" />최근 6개월</span><span className="no"><Icon name="x" />선글라스·단체 사진</span></div>
          <div className="safe"><Icon name="lock" /><div>사진은 <b>호스트만</b> 봐요. 다른 참가자에게 보여주지 않고, 행사 30일 뒤 지워요.</div></div>
        </>}

        {step === 6 && <>
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
        {step >= 2 && !(step === 6 && avoidMode === '') && (
          <div className="ft"><button className="btn" type="submit" disabled={!canNext}>{step === 2 && basic < 2 ? '확인' : '다음'}</button></div>
        )}
      </form>

      {sheet && s && <>
        <div className="dim" onClick={() => setSheet(false)} />
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t">
          <div className="grab" />
          <h3 id="sheet-t">이대로 신청할까요?</h3>
          <p className="ds">지금은 돈을 내지 않아요. 호스트가 확인한 뒤 입금 안내를 보내드려요.</p>
          <dl className="sum">
            {([
              ['일정', `${s.dateLabel} ${s.time}`, 0],
              ['이름', `${name.trim()} · ${gender === 'f' ? '여성' : '남성'} · ${birth}`, 2],
              ['휴대폰', phone, 2],
              ['이메일', email, 3],
              ['하는 일', job.trim(), 4],
              ['사진 · 지인', `${photoCount}장 · ${avoidMode === 'yes' ? `${avoid.length}명` : '없음'}`, 5],
            ] as const).map(([k, v, to]) => (
              <button type="button" key={k} onClick={() => { setSheet(false); go(to); }} aria-label={`${k} 고치기`}><dt>{k}</dt><dd>{v}</dd></button>
            ))}
          </dl>
          <button type="button" className={`agree${agree ? ' on' : ''}`} onClick={() => setAgree(!agree)} aria-pressed={agree}>
            <span className="chk" />필수 약관에 모두 동의해요</button>
          <button className="btn" disabled={!agree} onClick={() => { setSheet(false); setDone(true); window.scrollTo(0, 0); }}>신청하기</button>
          <p className="preview">미리보기 버전이라 실제로 접수되지는 않아요</p>
        </div>
      </>}
    </main>
  );
}

function Done({ email }: { email: string }) {
  return (
    <main className="fin">
      <div className="big"><Icon name="check" /></div>
      <h2 className="q">신청을 마쳤어요</h2>
      <p className="ds">호스트가 확인하면<br /><b>{email}</b>으로 입금 안내를 보내드려요.</p>
      <div className="card"><div className="tl">
        <div className="done"><i /><span><b>신청 완료</b><small>방금</small></span></div>
        <div className="now"><i /><span><b>호스트 확인 중</b><small>보통 하루 안에 끝나요</small></span></div>
        <div><i /><span><b>입금하고 사전 등록</b><small>메일로 안내해드려요</small></span></div>
      </div></div>
      <div className="ft"><Link className="btn" href="/">확인</Link><Link className="lnk" href="/status/demo">신청 내역 보기</Link></div>
    </main>
  );
}
