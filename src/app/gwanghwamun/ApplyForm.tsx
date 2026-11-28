'use client';
import { useState } from 'react';
import { PRICE, won } from './config';

/** 사진을 긴 변 1080px JPEG로 줄인다 (Vercel 요청 4.5MB 제한 안에 2장이 들어가게). 못 읽는 형식이면 원본 그대로 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1080 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no()), 'image/jpeg', 0.8));
  } catch { return file; }
}

/** 광화문연가 신청서: 성별 · 이름 · 나이 · 직업 · MBTI · 연락처 · 이상형 · 호스트에게 · 사진 1~2장. 입금은 수락 뒤에 안내한다 */
export default function ApplyForm() {
  const [gender, setGender] = useState<'f' | 'm' | ''>('');
  const [exposure, setExposure] = useState('');
  const [photos, setPhotos] = useState<(File | null)[]>([null, null]);
  const [previews, setPreviews] = useState(['', '']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const pick = (i: number, f: File | null) => {
    setErr('');
    if (previews[i]) URL.revokeObjectURL(previews[i]);
    const url = f ? URL.createObjectURL(f) : '';
    setPhotos((p) => p.map((x, j) => (j === i ? f : x)));
    setPreviews((p) => p.map((x, j) => (j === i ? url : x)));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setErr('');
    if (!gender) return setErr('성별을 골라주세요.');
    if (!photos[0]) return setErr('얼굴이 나온 사진을 1장 이상 올려주세요.');
    if (!exposure) return setErr('촬영 노출 범위를 골라주세요.');
    const fd = new FormData(e.currentTarget);
    fd.set('gender', gender); fd.set('exposure', exposure);
    fd.set('from', new URLSearchParams(location.search).get('from') ?? ''); // 리틀리 링크는 ?from=insta
    const imgs = await Promise.all(photos.filter((p): p is File => !!p).map(shrink));
    if (imgs.reduce((n, b) => n + b.size, 0) > 4_200_000) return setErr('사진이 너무 커요. 다른 사진을 골라주세요.');
    fd.set('photo', imgs[0], 'photo.jpg');
    if (imgs[1]) fd.set('photo2', imgs[1], 'photo2.jpg');
    setBusy(true);
    try {
      const r = await fetch('/api/gwanghwamun/apply', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({ ok: false, message: '잠시 뒤에 다시 시도해주세요.' }));
      if (!j.ok) setErr(j.message ?? '잠시 뒤에 다시 시도해주세요.');
      else setDone(j.statusToken);
    } catch { setErr('보내지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.'); }
    setBusy(false);
  };

  if (done) return (
    <div className="gdone" role="status">
      <b>신청서가 도착했어요</b>
      <p>호스트가 한 분 한 분 직접 보고 수락해요.<br />입금계좌는 모임 수락 후 안내드려요.</p>
      <a className="gbtn" href={`/status/${done}`}>내 신청 상태 보기</a>
      <small>이 링크를 저장해두면 언제든 결과를 확인할 수 있어요.</small>
    </div>
  );

  return (
    <form className="gform" onSubmit={submit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <fieldset>
        <legend>성별</legend>
        <div className="seg">
          {([['f', '여성'], ['m', '남성']] as const).map(([v, l]) => <button type="button" key={v} aria-pressed={gender === v} onClick={() => setGender(v)}>{l}</button>)}
        </div>
      </fieldset>
      <p className="qn">1. 기본 정보</p>
      <div className="two">
        <label><span>이름</span><input name="name" required maxLength={20} autoComplete="name" /></label>
        <label><span>나이 (한국 나이)</span><input name="age" required inputMode="numeric" maxLength={2} placeholder="예: 29" /></label>
      </div>
      <div className="two">
        <label><span>직군</span><input name="job" required maxLength={30} placeholder="예: IT 기획" /></label>
        <label><span>MBTI</span><input name="mbti" maxLength={4} autoCapitalize="characters" placeholder="예: ENFP" /></label>
      </div>
      <label><span>성격 키워드 (선택)</span><input name="traits" maxLength={40} placeholder="예: 차분함, 잘 웃어요, 계획형" /></label>
      <label><span>휴대폰 번호</span><input name="phone" type="tel" required inputMode="tel" maxLength={13} autoComplete="tel" placeholder="010-1234-5678" /></label>
      <div className="two">
        <label><span>본인의 이상형</span><textarea name="ideal" required maxLength={200} rows={4} placeholder="끌리는 사람을 편하게 적어주세요" /></label>
        <label><span>호스트에게 할 말 (선택)</span><textarea name="message" maxLength={300} rows={4} placeholder="궁금한 점, 바라는 점 등" /></label>
      </div>

      <p className="qn">2. 얼굴이 나온 사진 (1~2장)</p>
      <div className="two">
        {[0, 1].map((i) => (
          <label className="file" key={i}>
            {previews[i] ? <img src={previews[i]} alt={`올린 사진 ${i + 1} 미리보기`} /> : <span>{i === 0 ? '사진 1 (필수)' : '사진 2 (선택)'}</span>}
            <input type="file" accept="image/*" onChange={(e) => pick(i, e.target.files?.[0] ?? null)} />
          </label>
        ))}
      </div>

      <label><span className="qn">3. 마주치고 싶지 않은 사람의 뒷번호를 입력해주세요 (선택)</span>
        <input name="avoidTails" inputMode="numeric" maxLength={40} placeholder="휴대폰 뒷번호 4자리, 여러 명이면 쉼표로 (예: 1234, 5678)" /></label>

      <fieldset>
        <legend className="qn">4. 현장 촬영, 얼굴 노출은 어디까지 괜찮으세요?</legend>
        <div className="seg three">
          {([['face', '얼굴도 OK'], ['partial', '뒷모습·손만'], ['none', '빼주세요']] as const).map(([v, l]) => <button type="button" key={v} aria-pressed={exposure === v} onClick={() => setExposure(v)}>{l}</button>)}
        </div>
        <p className="fine">어느 쪽을 골라도 선정에는 영향이 없어요.</p>
      </fieldset>

      <p className="qn">유의사항</p>
      <ul className="notes">
        <li>광화문, 종각, 을지로 직장인만 참여 가능합니다 (명함 랜덤확인 예정)</li>
        <li>입금계좌는 모임 수락 후 안내드려요. 참가비는 {won(PRICE)}이에요. 입금해주셔야 참가 신청됩니다.</li>
        <li>환불은 12/4까지 100%, 12/6까지 50%, 12/7부터는 되지 않아요.</li>
        <li>제출한 사진과 정보는 모임 후 폐기돼요.</li>
      </ul>
      {err && <p className="ferr" role="alert">{err}</p>}
      <button className="gbtn p" disabled={busy}>{busy ? '보내는 중…' : '지금 신청하기'}</button>
    </form>
  );
}
