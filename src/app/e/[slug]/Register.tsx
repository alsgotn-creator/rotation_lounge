'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../../../components/Icon';
import { Character } from '../../../components/Character';
import { api } from '../../../lib/api';
import { QUESTIONS, PALETTE, loveType, phrases } from '../../../lib/domain/loveType';
import { ACCS, ACC_KO, CHARS, EYEWEAR, GLASSED, parseAccs, registrationError, type Acc, type Shape } from '../../../lib/domain/register';

export type Initial = { nickname: string; area: string; mbti: string; keywords: string[]; answers: number[]; shape: Shape; prop: string } | null;
type Given = { gender: 'f' | 'm'; age: number; job: string };

const MBTI_PAIRS: [string, string, string, string][] = [['E', '외향', 'I', '내향'], ['N', '직관', 'S', '감각'], ['F', '감정', 'T', '사고'], ['J', '계획', 'P', '즉흥']];
const KW_EX = ['필라테스 3년차', '맛집 탐방러', '강아지 집사', '주말엔 등산', '영화 덕후'];
const DOT = [34, 26, 20, 26, 34];
const Q0 = 5;                       // 질문이 시작되는 단계
const RESULT = Q0 + QUESTIONS.length, CHAR = RESULT + 1, LAST = CHAR;

export default function Register({ slug, given, initial, onCancel, devStep }: { slug: string; given: Given; initial: Initial; onCancel?: () => void; devStep?: number }) {
  const router = useRouter();
  const [step, setStep] = useState(devStep ?? (initial ? 1 : 0));
  const [consent, setConsent] = useState(!!initial);
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [area, setArea] = useState(initial?.area ?? '');
  const [mbti, setMbti] = useState<string[]>(initial ? initial.mbti.split('') : ['', '', '', '']);
  const [keywords, setKeywords] = useState<string[]>(initial?.keywords ?? []);
  const [kw, setKw] = useState('');
  const [answers, setAnswers] = useState<number[]>(initial?.answers ?? Array(QUESTIONS.length).fill(devStep && devStep > 5 ? 4 : 0));
  const [shape, setShape] = useState<Shape>(initial?.shape ?? CHARS[given.gender][0]);
  const [accs, setAccs] = useState<Acc[]>(parseAccs(initial?.prop));
  const glassed = GLASSED.includes(shape);
  const myAccs = accs.filter((a) => !(glassed && EYEWEAR.includes(a)));
  // 안경류는 하나만: 새로 고르면 다른 안경은 빠진다
  const toggleAcc = (a: Acc) => setAccs(accs.includes(a) ? accs.filter((x) => x !== a) : [...accs.filter((x) => !(EYEWEAR.includes(a) && EYEWEAR.includes(x))), a]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = (n: number) => { setStep(n); window.scrollTo(0, 0); };
  const back = () => (step === 0 || (initial && step === 1) ? onCancel?.() : go(step - 1));
  const done = answers.every((a) => a > 0);
  const type = done ? loveType(answers) : 0;
  const addKw = (k: string) => { const t = k.trim().slice(0, 15); if (t && keywords.length < 2 && !keywords.includes(t)) setKeywords([...keywords, t]); setKw(''); };

  const canNext = (() => {
    if (step === 0) return consent;
    if (step === 1) return nickname.trim().length >= 1 && nickname.trim().length <= 12;
    if (step === 2) return area.trim().length >= 1;
    if (step === 3) return mbti.every(Boolean);
    if (step === 4) return keywords.length >= 1;
    if (step === RESULT) return true;
    return step === CHAR;
  })();

  const submit = async () => {
    const body = { nickname, area, mbti: mbti.join(''), keywords, answers, shape, prop: myAccs.join(','), consent };
    const e = registrationError(body);
    if (e) return setErr(e);
    setBusy(true); setErr('');
    const j = await api(`/api/e/${slug}/register`, body);
    setBusy(false);
    if (!j.ok) return setErr(j.message ?? '다시 시도해주세요.');
    onCancel?.(); router.refresh(); window.scrollTo(0, 0);
  };

  const next = () => {
    if (!canNext) return;
    if (step === 4 && !done) return go(Q0 + Math.max(0, answers.findIndex((a) => a === 0)));
    if (step === LAST) return submit();
    go(step + 1);
  };
  const answer = (qi: number, v: number) => {
    const n = [...answers]; n[qi] = v; setAnswers(n);
    setTimeout(() => go(Q0 + qi + 1 <= RESULT ? Q0 + qi + 1 : RESULT), 220);
  };

  const qi = step - Q0;
  const isQ = qi >= 0 && qi < QUESTIONS.length;
  const total = LAST + 1;

  return (
    <main>
      <div className="nb">
        {(step > 0 || onCancel) ? <button className="bk" aria-label="뒤로" onClick={back}><Icon name="back" /></button> : <span style={{ width: 44 }} />}
        <div className="pg" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step + 1}><i style={{ width: `${((step + 1) / total) * 100}%` }} /></div>
      </div>

      <form className="bd" key={step} onSubmit={(e) => { e.preventDefault(); next(); }}>
        {step === 0 && <>
          <h2 className="q">라운지에 들어가기 전에<br />나를 소개해주세요</h2>
          <p className="ds">5분이면 끝나요. 다 쓰면 나의 연애 컬러와 캐릭터가 생겨요.</p>
          <div className="given">
            <div className="kv"><span>성별</span><b>{given.gender === 'f' ? '여성' : '남성'}</b></div>
            <div className="kv"><span>나이</span><b>{given.age}세</b></div>
            <div className="kv"><span>하는 일</span><b>{given.job}</b></div>
          </div>
          <p className="hint"><Icon name="info" />신청서에서 가져왔어요. 다시 쓰지 않아도 돼요</p>
          <button type="button" className={`agree${consent ? ' on' : ''}`} onClick={() => setConsent(!consent)} aria-pressed={consent} style={{ marginTop: 18 }}>
            <span className="chk" /><span>개인정보 수집에 동의해요<small className="ds" style={{ display: 'block', fontSize: 12, marginTop: 4, fontWeight: 500 }}>닉네임, 사는 곳, MBTI, 키워드, 연애관 응답 · 행사 진행에만 써요 · 행사 30일 뒤 자동으로 지워요</small></span>
          </button>
        </>}

        {step === 1 && <>
          <h2 className="q">라운지에서 쓸<br />닉네임을 알려주세요</h2>
          <p className="ds">대기실에서는 캐릭터와 키워드만 보여요.</p>
          <label className="fld"><span>닉네임</span><input autoFocus maxLength={12} placeholder="예: 민지" value={nickname} onChange={(e) => setNickname(e.target.value)} /></label>
        </>}

        {step === 2 && <>
          <h2 className="q">어디에 사세요?</h2>
          <p className="ds">구나 동네 정도면 충분해요.</p>
          <label className="fld"><span>사는 곳</span><input autoFocus maxLength={20} placeholder="예: 성동구" value={area} onChange={(e) => setArea(e.target.value)} /></label>
          <div className="safe"><Icon name="lock" /><div>나이·직업·사는 곳·MBTI는 <b>대화 5분 뒤</b>, 맞은편 상대에게만 보여요.</div></div>
        </>}

        {step === 3 && <>
          <h2 className="q">MBTI를 골라주세요</h2>
          {MBTI_PAIRS.map(([a, ak, b, bk], i) => (
            <div className="mbti" key={a} style={i === 0 ? { marginTop: 26 } : undefined}>
              {[[a, ak], [b, bk]].map(([v, k]) => (
                <button type="button" key={v} className={mbti[i] === v ? 'on' : ''} aria-pressed={mbti[i] === v} onClick={() => { const m = [...mbti]; m[i] = v; setMbti(m); }}>{v}<small>{k}</small></button>
              ))}
            </div>
          ))}
        </>}

        {step === 4 && <>
          <h2 className="q">나를 보여줄 키워드를<br />1~2개 적어주세요</h2>
          <p className="ds">대기실에서 캐릭터 옆에 보여요. 대화를 여는 첫 질문이 돼요.</p>
          <label className="fld"><span>키워드 ({keywords.length}/2)</span>
            <input autoFocus={keywords.length < 2} disabled={keywords.length >= 2} maxLength={15} placeholder={keywords.length >= 2 ? '2개를 다 적었어요' : '예: 필라테스 3년차'} value={kw}
              onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && kw.trim()) { e.preventDefault(); addKw(kw); } }} /></label>
          {kw.trim() && keywords.length < 2 && <button type="button" className="btn sub" style={{ height: 44, fontSize: 15, marginTop: 10 }} onClick={() => addKw(kw)}>‘{kw.trim()}’ 추가</button>}
          {keywords.length > 0 && <div className="kw">{keywords.map((k) => <span key={k}>{k}<button type="button" aria-label={`${k} 지우기`} onClick={() => setKeywords(keywords.filter((x) => x !== k))}><Icon name="x" /></button></span>)}</div>}
          {keywords.length < 2 && <div className="chips">{KW_EX.filter((k) => !keywords.includes(k)).map((k) => <button type="button" key={k} onClick={() => addKw(k)}>{k}</button>)}</div>}
        </>}

        {isQ && <>
          <p className="qno">{qi + 1} / {QUESTIONS.length}</p>
          <h2 className="q one" style={{ marginTop: 8 }}>{QUESTIONS[qi].text}</h2>
          <div className="scale" role="radiogroup" aria-label="얼마나 그런가요">
            {DOT.map((d, i) => (
              <button type="button" key={i} role="radio" aria-checked={answers[qi] === i + 1} aria-label={['전혀 아니에요', '아닌 편이에요', '보통이에요', '그런 편이에요', '완전 그래요'][i]}
                className={answers[qi] === i + 1 ? 'on' : ''} style={{ width: d * 1.5, height: d * 1.5 }} onClick={() => answer(qi, i + 1)} />
            ))}
          </div>
          <div className="scale-l"><span>전혀 아니에요</span><span>완전 그래요</span></div>
          <p className="hint" style={{ justifyContent: 'center', marginTop: 40 }}>누르면 다음 질문으로 넘어가요</p>
        </>}

        {step === RESULT && done && <>
          <h2 className="q" style={{ textAlign: 'center' }}>나의 연애 컬러예요</h2>
          <div className="orb" style={{ ['--c' as string]: PALETTE[type] }} role="img" aria-label="나의 연애 컬러" />
          {phrases(type).map((p) => <p className="phr" key={p} style={{ margin: 0 }}>{p}</p>)}
          <div className="rec">당신과 가장 비슷한 사람은<br /><b style={{ color: 'var(--text)' }}>모두 등록하면 알려드릴게요</b></div>
        </>}

        {step === CHAR && <>
          <h2 className="q">나를 닮은 캐릭터를<br />골라주세요</h2>
          <div className="preview-chr"><Character shape={shape} color={type} acc={myAccs.join(',')} size={180} /></div>
          <div className="shapes">
            {CHARS[given.gender].map((s, i) => <button type="button" key={s} className={shape === s ? 'on' : ''} aria-pressed={shape === s} aria-label={`캐릭터 ${i + 1}`} onClick={() => setShape(s)}><Character shape={s} color={type} acc={myAccs.join(',')} size={84} delay={i} /></button>)}
          </div>
          <p className="eb" style={{ marginTop: 22 }}>꾸미기 <span style={{ color: 'var(--mute)', fontWeight: 600 }}>· 여러 개 골라도 돼요</span></p>
          <div className="chips" style={{ marginTop: 0 }}>
            {ACCS.filter((a) => !(glassed && EYEWEAR.includes(a))).map((a) => (
              <button type="button" key={a} onClick={() => toggleAcc(a)} aria-pressed={accs.includes(a)} style={accs.includes(a) ? { background: 'var(--acc)', color: 'var(--btntx)' } : undefined}>{ACC_KO[a]}</button>
            ))}
          </div>
          <p className="hint">대기실에서는 이 캐릭터와 키워드만 보여요</p>
        </>}

        {!isQ && (
          <div className="ft">
            {err && <p role="alert" style={{ margin: '0 0 10px', color: 'var(--err)', fontSize: 14, textAlign: 'center' }}>{err}</p>}
            <button className="btn" type="submit" disabled={!canNext || busy}>
              {step === 0 ? '시작하기' : step === RESULT ? '캐릭터 고르러 가기' : step === CHAR ? (busy ? '저장하는 중…' : initial ? '수정 완료' : '등록 완료') : '다음'}
            </button>
          </div>
        )}
      </form>
    </main>
  );
}
