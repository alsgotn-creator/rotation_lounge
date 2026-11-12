import Link from 'next/link';
import { Icon } from '../components/Icon';
import EnterCard from './EnterCard';
import { yy, HOST_NAME, BUSINESS } from '../lib/signup/data';
import { listSessions } from '../lib/server/signup';
import { db, hasDb } from '../lib/server/supabase';

export const revalidate = 60; // 남은 자리는 1분마다 새로

const FAQ = [
  ['혼자 가도 괜찮나요?', '모두 혼자 와요. 친구와 함께 신청하면 같은 날 다른 테이블에 앉아요.'],
  ['아는 사람을 만나면 어떡하죠?', '신청할 때 마주치고 싶지 않은 지인을 적어주세요. 같은 날 배정하지 않고, 상대에게는 알리지 않아요.'],
  ['휴대폰 번호는 왜 적나요?', '라운지에 입장할 때 쓰고, 행사가 끝난 뒤 매칭 결과를 문자로 알려드려요. 다른 용도로는 쓰지 않아요.'],
  ['연락처는 언제 공개되나요?', '서로 고른 두 사람에게만, 행사가 끝난 뒤 문자로 알려드려요.'],
];

export default async function Landing() {
  const [sessions, { data: rv }] = await Promise.all([listSessions(), hasDb() ? db().from('reviews').select('body,gender,age').order('created_at', { ascending: false }).limit(12) : { data: null }]);
  const reviews = (rv ?? []) as { body: string; gender: 'f' | 'm'; age: number }[]; // 테이블이 아직 없으면 빈 목록
  const open = sessions.filter((s) => !s.closed); // 신청 받는 모임 전부 (시연 모임도 자리가 남으면 보인다)
  return (
    <main>
      <section className="hero">
        <div className="art">
          <img src="/lounge-line.webp" width={880} height={1168} fetchPriority="high" alt="작은 와인 라운지에서 마주 앉아 이야기하는 사람들" />
          {/* 같은 그림을 움직인 5초 반복 영상. 못 틀거나 '동작 줄이기'면 아래 그림이 그대로 보인다 */}
          <video className="mv" src="/lounge-line.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden="true" />
        </div>
        <nav className="nav"><span className="logo">플러팅<i>.</i>라운지</span><div className="navr"><span className="hostby"><small>HOST</small>{HOST_NAME}</span></div></nav>
        <div className="title"><p>ROTATION LOUNGE</p><h1>플러팅 라운지</h1><span>다양한 사람들과 15분의 설렘</span></div>
        {open.length > 0 && <div className="bottom">
          {open.map((next) => <Link key={next.id} className="ticket" href={`/apply?s=${next.id}`}>
            <span className="stepno"><b>1</b>신청하기</span>
            <div className="dt">{next.mon}<b>{next.day}</b>{next.dow}</div>
            <div className="tx"><strong>{next.time} · {next.place} 라운지</strong>{yy(next.birthFrom)}~{yy(next.birthTo)}년생 · <em>여성 {next.seatsF} · 남성 {next.seatsM}자리 남음</em></div>
            <Icon name="next" />
          </Link>)}
        </div>}
      </section>

      <section id="enter" className="lsec" style={{ paddingTop: 8 }}>
        <p className="nx"><Icon name="down" />승인 후 입력하여 라운지 입장</p>
        <EnterCard />
      </section>

      <section className="lsec">
        <p className="eb">다녀온 분들 이야기</p>
        {reviews.length === 0
          ? <p className="ds" style={{ fontSize: 14 }}>첫 후기를 기다리고 있어요. 행사에 다녀온 분이 직접 남기는 한 줄이 여기 모여요.</p>
          : <div className="rvs">{reviews.map((r, i) => <div className="rv" key={i}>{r.body}<small>{r.age}세 · {r.gender === 'f' ? '여성' : '남성'}</small></div>)}</div>}
      </section>

      <section className="lsec">
        <p className="eb">자주 묻는 질문</p>
        <div className="qa">
          {FAQ.map(([q, a], i) => (
            <details key={q} open={i === 0}><summary>{q}<Icon name="down" /></summary><p>{a}</p></details>
          ))}
        </div>
      </section>

      <footer className="biz">상호 플러팅 라운지<br />문의 <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · 이용약관 · 개인정보처리방침</footer>

      <div className="ft two"><Link className="btn shine" href="/apply"><b className="n">1</b>신청하기</Link><a className="btn line" href="#enter"><b className="n">2</b>입장하기</a></div>
    </main>
  );
}
