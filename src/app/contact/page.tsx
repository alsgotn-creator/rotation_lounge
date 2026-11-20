import { Icon } from '../../components/Icon';
import TabBar from '../../components/TabBar';
import { BUSINESS, HOST_NAME } from '../../lib/signup/data';

export const metadata = { title: '문의하기 · 플러팅 라운지' };

export default function ContactPage() {
  return (
    <main className="lp lp-page">
      <header className="lp-ph"><p>CONTACT</p><h1>문의하기</h1><span>신청, 입금, 일정 변경 무엇이든 편하게 물어봐주세요.</span></header>
      <section className="lp-list">
        <a className="lp-card" href={`sms:${BUSINESS.phone.replace(/-/g, '')}`}>
          <span className="lp-ico"><Icon name="chat" /></span>
          <div className="lp-tx"><strong>{BUSINESS.phone}</strong><span>업무용 번호 · 문자만 가능해요</span></div>
          <Icon name="next" />
        </a>
        <a className="lp-card" href={`mailto:${BUSINESS.email}`}>
          <span className="lp-ico"><Icon name="mail" /></span>
          <div className="lp-tx"><strong>이메일로 문의</strong><span>{BUSINESS.email}</span></div>
          <Icon name="next" />
        </a>
        <div className="lp-card static">
          <span className="lp-ico"><Icon name="user" /></span>
          <div className="lp-tx"><strong>호스트 {HOST_NAME}</strong><span>모임을 직접 운영하고 답장해드려요</span></div>
        </div>
      </section>
      <footer className="biz lp-biz">상호 플러팅 라운지 · 이용약관 · 개인정보처리방침</footer>
      <TabBar />
    </main>
  );
}
