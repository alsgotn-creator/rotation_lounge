import Link from 'next/link';
import TabBar from '../components/TabBar';
import EnterCard from './EnterCard';
import { HOST_NAME, BUSINESS } from '../lib/signup/data';
import { listSessions } from '../lib/server/signup';

export const revalidate = 60; // 남은 자리는 1분마다 새로

/** 첫 화면 = '일정' 탭: 그림 · 1 신청(진행 중인 일정) | 2 입장 */
export default async function Landing() {
  const sessions = await listSessions(); // 앞으로의 신청 받는 모임 (자리가 다 차면 '마감')
  return (
    <main className="lp">
      {/* 상단: 이름 · HOST · 후기 보기 아이콘 */}
      <header className="lp-top">
        <span className="lp-brand">플러팅<i>.</i>라운지</span>
        <div className="lp-topr">
          <span className="lp-host"><small>HOST</small>{HOST_NAME}</span>
          <Link className="lp-rvbtn" href="/reviews">후기보기</Link>
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

      {/* 1 신청하기 | 2 입장하기 (같은 크기) */}
      <section id="enter" className="lp-sec lp-steps">
        <div className="lp-apply">
          <span className="stepno"><b>1</b>신청하기</span>
          <b className="lp-step-t">진행 중인 일정</b>
          <ul className="lp-ses">
            {sessions.length === 0 && <li className="none">다음 모임을 준비하고 있어요</li>}
            {sessions.map((s) => {
              const label = <><strong>{s.dateLabel} {s.time}</strong><span>{s.place} {s.double ? '더블 라운지' : '라운지'} · {s.closed ? <em className="off">마감</em> : <em>여 {s.seatsF} · 남 {s.seatsM}</em>}</span></>;
              return <li key={s.id}>{s.closed ? <div>{label}</div> : <Link href={`/apply?s=${s.id}`}>{label}</Link>}</li>;
            })}
          </ul>
          <Link className="btn" href="/apply">신청하기</Link>
        </div>
        <EnterCard />
      </section>

      <footer className="biz lp-biz">상호 플러팅 라운지<br />문의 <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · 이용약관 · 개인정보처리방침</footer>

      <TabBar />
    </main>
  );
}
