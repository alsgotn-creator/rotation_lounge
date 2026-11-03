'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '../../components/Icon';
import { isEmail } from '../../lib/signup/validate';

export default function StatusLookup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <main>
      <div className="nb"><button className="bk" aria-label="뒤로" onClick={() => router.push('/')}><Icon name="back" /></button></div>
      {sent ? (
        <div className="bd">
          <h2 className="q">메일함을 확인해주세요</h2>
          <p className="ds"><b>{email}</b>로 확인 링크를 보냈어요. 링크는 30분 동안 쓸 수 있어요.</p>
          <p className="preview" style={{ textAlign: 'left', marginTop: 24 }}>미리보기 버전이라 메일은 가지 않아요. 아래 버튼으로 내역 화면을 볼 수 있어요.</p>
          <div className="ft"><Link className="btn" href="/status/demo">내역 화면 미리보기</Link><button className="lnk" onClick={() => setSent(false)}>다른 이메일로 받기</button></div>
        </div>
      ) : (
        <form className="bd" onSubmit={(e) => { e.preventDefault(); if (isEmail(email)) setSent(true); }}>
          <h2 className="q">신청한 이메일을<br />알려주세요</h2>
          <p className="ds">확인 링크를 보내드려요. 비밀번호는 필요 없어요.</p>
          <label className="fld"><span>이메일</span>
            <input autoFocus type="email" inputMode="email" autoComplete="email" placeholder="example@gmail.com" value={email} onChange={(e) => setEmail(e.target.value.trim())} /></label>
          <div className="ft"><button className="btn" disabled={!isEmail(email)}>링크 받기</button></div>
        </form>
      )}
    </main>
  );
}
