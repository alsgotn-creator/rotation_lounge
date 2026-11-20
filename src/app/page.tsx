import Link from 'next/link';
import { Icon } from '../components/Icon';
import TabBar from '../components/TabBar';
import EnterCard from './EnterCard';
import ReviewTicker from './ReviewTicker';
import { yy, HOST_NAME, BUSINESS } from '../lib/signup/data';
import { listSessions } from '../lib/server/signup';
import { latestReviews } from '../lib/server/reviews';

export const revalidate = 60; // 남은 자리는 1분마다 새로

/** 첫 화면 = '일정' 탭: 그림 · 모임 목록 · 신청/입장 */
export default async function Landing() {
  const [sessions, reviews] = await Promise.all([listSessions(), latestReviews()]);
  const open = sessions.filter((s) => !s.closed); // 신청 받는 모임 전부 (시연 모임도 자리가 남으면 보인다)
  return (
    <main className="lp">
      {/* 상단: 이름 · HOST, 그 아래 최근 후기 한 줄 */}
      <header className="lp-top">
        <span className="lp-brand">플러팅<i>.</i>라운지</span>
        <div className="lp-topr">
          <span className="lp-host"><small>HOST</small>{HOST_NAME}</span>
          <ReviewTicker reviews={reviews} />
        </div>
      </header>

      {/* 그림: 둥근 호(arc) 위에 일러스트, 아래는 흰 언덕 */}
      <section className="lp-hero" aria-hidden="true">
        <div className="lp-ring" />
        <span className="lp-eyebrow">ROTATION LOUNGE</span>
        <div className="lp-art">
          <img src="/lounge-line.webp" width={880} height={1168} fetchPriority="high" alt="" />
          {/* 같은 그림을 움직인 5초 반복 영상. 못 틀거나 '동작 줄이기'면 아래 그림이 그대로 보인다 */}
          <video src="/lounge-line.mp4" autoPlay muted loop playsInline preload="auto" />
        </div>
      </section>

      <div className="lp-head">
        <h1>플러팅 라운지</h1>
        <p>다양한 사람들과 나누는 기분좋은 설렘</p>
      </div>

      <section id="sessions" className="lp-list">
        {open.length === 0
          ? <div className="lp-card static"><span className="lp-ico"><Icon name="calendar" /></span><div className="lp-tx"><strong>다음 모임을 준비하고 있어요</strong><span>일정이 열리면 여기에 보여요</span></div></div>
          : open.map((s) => (
            <Link key={s.id} className="lp-card" href={`/apply?s=${s.id}`}>
              <span className="lp-ico date"><small>{s.mon}</small><b>{s.day}</b><small>{s.dow}</small></span>
              <div className="lp-tx">
                <strong>{s.time} · {s.place} {s.double ? '더블 라운지' : '라운지'}</strong>
                <span>{yy(s.birthFrom)}~{yy(s.birthTo)}년생 · <em>여 {s.seatsF} · 남 {s.seatsM}자리</em></span>
              </div>
              <Icon name="next" />
            </Link>
          ))}
      </section>

      {/* 1 신청하기 | 2 입장하기 */}
      <section id="enter" className="lp-sec lp-steps">
        <Link className="lp-apply" href="/apply">
          <span className="stepno"><b>1</b>신청하기</span>
          <span className="lp-ico"><Icon name="pen" /></span>
          <strong>처음이세요?</strong>
          <span>모임 고르고<br />신청하기</span>
          <Icon name="next" />
        </Link>
        <EnterCard />
      </section>

      <footer className="biz lp-biz">상호 플러팅 라운지<br />문의 <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · 이용약관 · 개인정보처리방침</footer>

      <TabBar />
    </main>
  );
}
