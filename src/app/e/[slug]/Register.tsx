'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../../../components/Icon';
import { Character } from '../../../components/Character';
import { api } from '../../../lib/api';
import { QUESTIONS, PALETTE, loveType, phrases, typeName } from '../../../lib/domain/loveType';
import { prepKey } from './Lounge';
import { ACCS, ACC_KO, CHARS, EYEWEAR, GLASSED, parseAccs, registrationError, type Acc, type Shape } from '../../../lib/domain/register';

export type Initial = { area: string; mbti: string; keywords: string[]; answers: number[]; shape: Shape; prop: string } | null;
export type Given = { name: string; number: number | null; gender: 'f' | 'm'; age: number; job: string };

const MBTI_PAIRS: [string, string, string, string][] = [['E', '외향', 'I', '내향'], ['N', '직관', 'S', '감각'], ['F', '감정', 'T', '사고'], ['J', '계획', 'P', '즉흥']];
const KW_EX = ['필라테스 3년차', '맛집 탐방러', '강아지 집사', '주말엔 등산', '영화 덕후'];
const DOT = [34, 26, 20, 26, 34];
const Q0 = 2;                       // 질문이 시작되는 단계 (0 동의 · 1 인적사항)
const PER = 5, PAGES = Math.ceil(QUESTIONS.length / PER); // 가치관 질문은 한 화면에 5개씩 (3쪽)
const RESULT = Q0 + PAGES, CHAR = RESULT + 1, LAST = CHAR;

export default function Register({ slug, given, initial, onCancel, devStep }: { slug: string; given: Given; initial: Initial; onCancel?: () => void; devStep?: number }) {
  const router = useRouter();
  const [step, setStep] = useState(devStep ?? (initial ? 1 : 0));
  const [consent, setConsent] = useState(!!initial);
  const [area, setArea] = useState(initial?.area ?? '');
  const [mbti, setMbti] = useState<string[]>(initial ? initial.mbti.split('') : ['', '', '', '']);
  const [keywords, setKeywords] = useState<string[]>(initial?.keywords ?? []);
  const [kw, setKw] = useState('');
  const [answers, setAnswers] = useState<number[]>(initial?.answers ?? Array(QUESTIONS.length).fill(devStep && devStep > Q0 ? 4 : 0));
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

  const page = step - Q0;
  const isQ = page >= 0 && page < PAGES;
  const canNext = (() => {
    if (step === 0) return consent;
    if (step === 1) return area.trim().length >= 1 && mbti.every(Boolean) && keywords.length >= 1;
    if (isQ) return answers.slice(page * PER, page * PER + PER).every((a) => a > 0);
    if (step === RESULT) return true;
    return step === CHAR;
  })();

  const submit = async () => {
    const body = { area, mbti: mbti.join(''), keywords, answers, shape, prop: myAccs.join(','), consent };
    const e = registrationError(body);
    if (e) return setErr(e);
    setBusy(true); setErr('');
    const j = await api(`/api/e/${slug}/register`, body);
    setBusy(false);
    if (!j.ok) return setErr(j.message ?? '다시 시도해주세요.');
    // 처음 등록이면 준비사항 팝업이 다시 뜨게 (시연처럼 같은 폰으로 새 자리에 들어온 경우)
    if (!initial) try { localStorage.removeItem(prepKey(slug)); } catch {}
    onCancel?.(); router.refresh(); window.scrollTo(0, 0);
  };

  const next = () => {
    if (!canNext) return;
    if (step === 1 && !done) return go(Q0 + Math.floor(Math.max(0, answers.findIndex((a) => a === 0)) / PER));
    if (step === LAST) return submit();
    go(step + 1);
  };
  const answer = (qi: number, v: number) => { const n = [...answers]; n[qi] = v; setAnswers(n); };
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
            <span className="chk" /><span>개인정보 수집에 동의해요<small className="ds" style={{ display: 'block', fontSize: 12, marginTop: 4, fontWeight: 500 }}>사는 곳, MBTI, 키워드, 연애관 응답 · 행사 진행에만 써요 · 행사 하루 뒤 폐기해요</small></span>
          </button>
        </>}

        {step === 1 && <>
          <h2 className="q">인적사항</h2>
          <p className="ds">신청서에서 가져온 정보는 채워 두었어요.</p>
          <div className="intro">
            <div className="given2">
              <div><small>이름</small><b>{given.name}</b></div>
              <div><small>번호</small><b>{given.number != null ? `${given.gender === 'f' ? '여' : '남'}${given.number}호` : '배정 전'}</b></div>
              <div><small>나이</small><b>{given.age}세</b></div>
              <div><small>하는 일</small><b>{given.job}</b></div>
            </div>
            <label className="fld"><span>사는 곳</span><input maxLength={20} placeholder="예: 성동구 (구나 동네 정도)" value={area} onChange={(e) => setArea(e.target.value)} /></label>
            <div className="fld"><span>MBTI</span><div className="mbti4">
              {MBTI_PAIRS.map(([a, ak, b, bk], i) => (
                <div className="mbti" key={a}>
                  {[[a, ak], [b, bk]].map(([v, k]) => (
                    <button type="button" key={v} className={mbti[i] === v ? 'on' : ''} aria-pressed={mbti[i] === v} onClick={() => { const m = [...mbti]; m[i] = v; setMbti(m); }}>{v}<small>{k}</small></button>
                  ))}
                </div>
              ))}
            </div></div>
            <label className="fld"><span>나를 보여줄 키워드 ({keywords.length}/2) · 캐릭터 옆에 보여요</span>
              <input disabled={keywords.length >= 2} maxLength={15} placeholder={keywords.length >= 2 ? '2개를 다 적었어요' : '예: 필라테스 3년차'} value={kw}
                onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && kw.trim()) { e.preventDefault(); addKw(kw); } }} /></label>
            {kw.trim() && keywords.length < 2 && <button type="button" className="btn sub" style={{ height: 40, fontSize: 14, marginTop: 8 }} onClick={() => addKw(kw)}>‘{kw.trim()}’ 추가</button>}
            {keywords.length > 0 && <div className="kw">{keywords.map((k) => <span key={k}>{k}<button type="button" aria-label={`${k} 지우기`} onClick={() => setKeywords(keywords.filter((x) => x !== k))}><Icon name="x" /></button></span>)}</div>}
            {keywords.length < 2 && <div className="chips">{KW_EX.filter((k) => !keywords.includes(k)).map((k) => <button type="button" key={k} onClick={() => addKw(k)}>{k}</button>)}</div>}
          </div>
          <div className="safe"><Icon name="lock" /><div>직업·사는 곳·MBTI는 <b>대화 5분 뒤</b>, 맞은편 상대에게만 보여요.</div></div>
        </>}

        {isQ && <>
          <p className="qno">{page + 1} / {PAGES}</p>
          <h2 className="q" style={{ marginTop: 8 }}>나와 얼마나 비슷한가요?</h2>
          {QUESTIONS.slice(page * PER, page * PER + PER).map((q, k) => {
            const qi = page * PER + k;
            return (
              <div className={`qrow${answers[qi] ? ' done' : ''}`} key={q.text}>
                <p>{q.text}</p>
                <div className="scale" role="radiogroup" aria-label={q.text}>
                  {DOT.map((d, i) => (
                    <button type="button" key={i} role="radio" aria-checked={answers[qi] === i + 1} aria-label={['전혀 아니에요', '아닌 편이에요', '보통이에요', '그런 편이에요', '완전 그래요'][i]}
                      className={answers[qi] === i + 1 ? 'on' : ''} style={{ width: d, height: d }} onClick={() => answer(qi, i + 1)} />
                  ))}
                </div>
                <div className="scale-l"><span>전혀 아니에요</span><span>완전 그래요</span></div>
              </div>
            );
          })}
        </>}

        {step === RESULT && done && <>
          <h2 className="q" style={{ textAlign: 'center' }}>나의 연애 컬러예요</h2>
          <div className="orb" style={{ ['--c' as string]: PALETTE[type] }} role="img" aria-label="나의 연애 컬러" />
          <p className="ltype">{typeName(type)}</p>
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

        <div className="ft">
          {err && <p role="alert" style={{ margin: '0 0 10px', color: 'var(--err)', fontSize: 14, textAlign: 'center' }}>{err}</p>}
          <button className="btn" type="submit" disabled={!canNext || busy}>
            {step === 0 ? '시작하기' : step === RESULT ? '캐릭터 고르러 가기' : step === CHAR ? (busy ? '저장하는 중…' : initial ? '수정 완료' : '등록 완료') : '다음'}
          </button>
        </div>
      </form>
    </main>
  );
}
