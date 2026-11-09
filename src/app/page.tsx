import Link from 'next/link';
import { Icon } from '../components/Icon';
import { PRICE, won, yy, HOST_NAME, BUSINESS } from '../lib/signup/data';
import { listSessions } from '../lib/server/signup';
import { db, hasDb } from '../lib/server/supabase';

export const revalidate = 60; // 남은 자리는 1분마다 새로

const FAQ = [
  ['혼자 가도 괜찮나요?', '모두 혼자 와요. 친구와 함께 신청하면 같은 날 다른 테이블에 앉아요.'],
  ['아는 사람을 만나면 어떡하죠?', '신청할 때 마주치고 싶지 않은 지인을 적어주세요. 같은 날 배정하지 않고, 상대에게는 알리지 않아요.'],
  ['이메일은 왜 적나요?', '행사가 끝난 뒤 매칭이 됐는지 안 됐는지 알려드리려고 받아요. 다른 용도로는 쓰지 않아요.'],
  ['연락처는 언제 공개되나요?', '서로 고른 두 사람에게만, 행사가 끝난 뒤 알려드려요.'],
];

export default async function Landing() {
  const sessions = await listSessions();
  const { data: rv } = hasDb() ? await db().from('reviews').select('body,gender,age').order('created_at', { ascending: false }).limit(12) : { data: null };
  const reviews = (rv ?? []) as { body: string; gender: 'f' | 'm'; age: number }[]; // 테이블이 아직 없으면 빈 목록
  const next = sessions.find((s) => !s.closed);
  return (
    <main>
      <section className="hero">
        <span className="tw" style={{ left: '12%', top: 120 }} />
        <span className="tw" style={{ left: '86%', top: 150, animationDelay: '1.2s' }} />
        <span className="tw" style={{ left: '20%', top: 330, animationDelay: '2.1s' }} />
        <span className="tw" style={{ left: '82%', top: 300, animationDelay: '.6s' }} />
        <div className="art">
          <img src="/lounge-arch.webp" width={880} height={1168} alt="아치 문 너머로 보이는 분홍 소파 라운지" />
          <span className="glow lamp" style={{ left: '37.5%', top: '44%' }} />
          <span className="glow lamp" style={{ left: '43.7%', top: '39%', animationDelay: '1.5s' }} />
          <span className="glow candle" style={{ left: '50.3%', top: '70%' }} />
          <span className="glow neon" style={{ left: '60%', top: '55.6%' }} />
          <span className="glow spill" style={{ left: '50%', top: '92%' }} />
          <span className="dust" style={{ left: '42%', top: '72%' }} />
          <span className="dust" style={{ left: '56%', top: '76%', animationDelay: '2.4s' }} />
          <span className="dust" style={{ left: '48%', top: '80%', animationDelay: '4.6s' }} />
        </div>
        <nav className="nav"><span className="logo">플러팅<i>.</i>라운지</span><div className="navr"><Link href="/status">신청 내역</Link><span className="hostby"><small>HOST</small>{HOST_NAME}</span></div></nav>
        <div className="title"><p>ROTATION LOUNGE</p><h1>플러팅 라운지</h1><span>15분씩, 일곱 번의 설렘</span></div>
        {next && <div className="bottom">
          <Link className="ticket" href={`/apply?s=${next.id}`}>
            <div className="dt">{next.mon}<b>{next.day}</b>{next.dow}</div>
            <div className="tx"><strong>{next.time} · {next.place} 라운지</strong>{yy(next.birthFrom)}~{yy(next.birthTo)}년생 · <em>{next.seatsF <= next.seatsM ? `여성 ${next.seatsF}` : `남성 ${next.seatsM}`}자리 남음</em></div>
            <Icon name="next" />
          </Link>
        </div>}
      </section>

      <section className="lsec" style={{ paddingTop: 8 }}>
        <p className="eb">이런 자리예요</p>
        <h3>한 저녁에 일곱 명과<br />천천히 대화해요</h3>
        <div className="fact" style={{ marginTop: 10 }}><i><Icon name="clock" /></i><div><b>15분씩, 일곱 번</b><span>자리를 옮기며 한 명씩 깊게 이야기해요</span></div></div>
        <div className="fact"><i><Icon name="heart" /></i><div><b>서로 고른 사람만 연결돼요</b><span>한쪽만 고르면 아무 일도 일어나지 않아요</span></div></div>
        <div className="fact"><i><Icon name="eyeOff" /></i><div><b>몇 명이 나를 골랐는지 몰라요</b><span>결과는 ‘매칭되었어요’ 한 줄만 보여요</span></div></div>
      </section>

      <section className="lsec">
        <p className="eb">일정</p>
        <h3>오실 날을 골라주세요</h3>
        {sessions.length === 0 && <p className="ds" style={{ fontSize: 14 }}>지금 열린 일정이 없어요. 곧 다음 일정을 열게요.</p>}
        {sessions.map((s) => s.closed ? (
          <div key={s.id} className="opt" style={{ opacity: .4, cursor: 'default' }}>
            <div className="d">{s.mon}<b>{s.day}</b>{s.dow}</div>
            <div className="t"><strong>{s.time} · {s.place}</strong>{yy(s.birthFrom)}~{yy(s.birthTo)}년생</div>
            <span className="end">마감</span>
          </div>
        ) : (
          <Link key={s.id} className="opt" href={`/apply?s=${s.id}`}>
            <div className="d">{s.mon}<b>{s.day}</b>{s.dow}</div>
            <div className="t"><strong>{s.time} · {s.place}</strong>{yy(s.birthFrom)}~{yy(s.birthTo)}년생<br />
              {s.seatsF <= 1 || s.seatsM <= 1 ? <em>여성 {s.seatsF} · 남성 {s.seatsM}자리 남음</em> : <>여성 {s.seatsF} · 남성 {s.seatsM}자리 남음</>}</div>
            <Icon name="next" />
          </Link>
        ))}
      </section>

      <section className="lsec">
        <p className="eb">진행 순서</p>
        <h3>신청은 1분,<br />호스트가 승인하면 입장해요</h3>
        <div className="stp">
          <div><b>신청하기</b><span>이름, 출생연도, 연락처만 받아요</span></div>
          <div><b>호스트 승인</b><span>보통 하루 안에 나만의 입장 링크를 보내드려요</span></div>
          <div><b>사전 등록하기</b><span>링크로 들어가 나를 소개하는 질문에 답해요</span></div>
          <div><b>당일, 라운지에서 만나요</b><span>휴대폰 하나만 들고 오세요</span></div>
        </div>
      </section>

      <section className="lsec">
        <p className="eb">참가비</p>
        <div className="price">
          <div className="amt">{won(PRICE)}<small>1인</small></div>
          <div className="kv"><span>모임 4일 전까지 취소</span><b>환불 가능</b></div>
          <div className="kv"><span>그 이후 취소</span><b>환불 불가</b></div>
        </div>
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

      <div className="ft"><Link className="btn shine" href="/apply">라운지 입장 신청하기</Link></div>
    </main>
  );
}
