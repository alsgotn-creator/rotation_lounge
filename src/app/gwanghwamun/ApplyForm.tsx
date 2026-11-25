'use client';
import { useState } from 'react';

/** 사진을 긴 변 1280px JPEG로 줄인다 (Vercel 요청 4.5MB 제한 안에 들어가게). 못 읽는 형식이면 원본 그대로 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no()), 'image/jpeg', 0.85));
  } catch { return file; }
}

/** 광화문연가 신청서: 성별 · 이름 · 나이 · 직업 · 이상형 · 사진 1장 · 광화문 근무 여부. 연락처·입금은 수락 뒤에 받는다 */
export default function ApplyForm() {
  const [gender, setGender] = useState<'f' | 'm' | ''>('');
  const [near, setNear] = useState<'yes' | 'no' | ''>('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const pick = (f: File | null) => {
    setPhoto(f); setErr('');
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : '');
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setErr('');
    if (!gender) return setErr('성별을 골라주세요.');
    if (!photo) return setErr('잘 나온 사진 1장을 올려주세요.');
    if (!near) return setErr('광화문 근처 근무 여부를 골라주세요.');
    const fd = new FormData(e.currentTarget);
    fd.set('gender', gender); fd.set('near', near);
    const img = await shrink(photo);
    if (img.size > 4_000_000) return setErr('사진이 너무 커요. 다른 사진을 골라주세요.');
    fd.set('photo', img, 'photo.jpg');
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
      <p>호스트가 한 분 한 분 직접 보고 수락해요.<br />수락되면 그때 입금과 연락처를 부탁드릴게요.</p>
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
      <p className="qn">1. 이름, 나이, 직업, 본인의 이상형</p>
      <div className="two">
        <label><span>이름</span><input name="name" required maxLength={20} autoComplete="name" /></label>
        <label><span>나이 (한국 나이)</span><input name="age" required inputMode="numeric" maxLength={2} placeholder="예: 29" /></label>
      </div>
      <label><span>직업</span><input name="job" required maxLength={30} placeholder="예: 공공기관 기획, IT 디자이너" /></label>
      <label><span>본인의 이상형</span><textarea name="ideal" required maxLength={200} rows={3} placeholder="어떤 사람에게 끌리는지 편하게 적어주세요" /></label>

      <p className="qn">2. 잘 나온 사진 1장</p>
      <label className="file">
        {preview ? <img src={preview} alt="올린 사진 미리보기" /> : <span>사진 고르기</span>}
        <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      </label>

      <fieldset>
        <legend className="qn">3. 광화문 근처에 근무하고 계시나요?</legend>
        <div className="seg">
          {([['yes', '네'], ['no', '아니요']] as const).map(([v, l]) => <button type="button" key={v} aria-pressed={near === v} onClick={() => setNear(v)}>{l}</button>)}
        </div>
      </fieldset>

      <p className="qn">4. 입금 및 연락처는 모임 수락이 되고 나면 부탁드릴게요.</p>
      <p className="fine">제출한 사진과 정보는 모임 후 폐기돼요.</p>
      {err && <p className="ferr" role="alert">{err}</p>}
      <button className="gbtn p" disabled={busy}>{busy ? '보내는 중…' : '신청서 보내기'}</button>
    </form>
  );
}
