import Link from 'next/link';
import { Icon } from '../../components/Icon';
import { BUSINESS } from '../../lib/signup/data';

export default function StatusHelp() {
  return (
    <main>
      <div className="nb"><Link className="bk" aria-label="뒤로" href="/"><Icon name="back" /></Link></div>
      <div className="bd">
        <h2 className="q">신청 내역은<br />내 링크로 확인해요</h2>
        <p className="ds">신청을 마칠 때 받은 <b>내 신청 내역 링크</b>를 열어주세요. 로그인 없이 바로 보여요.</p>
        <div className="safe" style={{ marginTop: 24 }}><Icon name="info" /><div>링크를 잃어버렸다면 신청한 이름과 휴대폰 번호를 적어 <b>{BUSINESS.email}</b>로 보내주세요. 확인 후 다시 보내드려요.</div></div>
      </div>
      <div className="ft"><a className="btn" href={`mailto:${BUSINESS.email}?subject=${encodeURIComponent('[플러팅 라운지] 신청 내역 링크 요청')}`}>메일 보내기</a></div>
    </main>
  );
}
