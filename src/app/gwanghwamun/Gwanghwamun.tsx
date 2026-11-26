'use client';
import { useEffect, useRef, useState } from 'react';
import ApplyForm from './ApplyForm';

const IG = 'pov.love.archive';
type Props = { startsAt: string | null; day: string; time: string; info: [string, string][] };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const NS = 'http://www.w3.org/2000/svg';

/** 남은 시간 [일, 시간, 분, 초]. 지났으면 null */
function left(at: number) {
  const s = Math.floor((at - Date.now()) / 1000);
  return s > 0 ? [s / 86400, (s / 3600) % 24, (s / 60) % 60, s % 60].map(Math.floor) : null;
}

export default function Gwanghwamun({ startsAt, day, time, info }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState<number[] | null | undefined>(undefined); // undefined: 첫 렌더(서버와 같게 '--')
  const [sticky, setSticky] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!startsAt) return;
    const at = new Date(startsAt).getTime();
    const tick = () => { const v = left(at); setCount(v); if (!v) clearInterval(t); };
    const t = setInterval(tick, 1000); tick();
    return () => clearInterval(t);
  }, [startsAt]);

  useEffect(() => {
    const el = root.current!;
    const q = (s: string) => el.querySelector(s)!;
    // 보케/눈송이 18개
    const cols = ['#F4B968', '#F08FA0', '#F7F0E6'];
    for (let i = 0; i < 18; i++) {
      const e = document.createElement('i'), s = rnd(4, 22);
      e.style.cssText = `left:${rnd(0, 100)}%;width:${s}px;height:${s}px;--c:${cols[i % 3]};--o:${rnd(.12, .4).toFixed(2)};--d:${rnd(14, 30).toFixed(1)}s;--delay:-${rnd(0, 30).toFixed(1)}s;--x:${rnd(-40, 40).toFixed(0)}px;filter:blur(${s > 12 ? 2 : 0}px)`;
      q('.bokeh').append(e);
    }
    // 광화문 뒤 빌딩 창문 + 누각 불빛 (일부는 깜빡임)
    const rect = (p: string, a: Record<string, string | number>) => { const r = document.createElementNS(NS, 'rect'); for (const k in a) r.setAttribute(k, String(a[k])); q(p).append(r); };
    const light = (p: string, x: number, y: number, w: number, h: number, tw: number) =>
      rect(p, { x, y, width: w, height: h, rx: 1, class: 'win' + (Math.random() < tw ? ' tw' : ''), opacity: rnd(.4, .9).toFixed(2), style: `--d:${rnd(2, 6).toFixed(1)}s;--delay:-${rnd(0, 6).toFixed(1)}s` });
    const bl = [[0, 36, 150], [34, 30, 110], [62, 42, 175], [102, 30, 130], [130, 46, 195], [174, 40, 150], [212, 48, 205], [258, 34, 140], [290, 44, 178], [332, 30, 120], [360, 30, 160]];
    for (const [x, w, h] of bl) {
      rect('.city', { x, y: 260 - h, width: w, height: h, fill: '#141C33' });
      for (let wy = 270 - h; wy < 250; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 11) if (Math.random() < .38) light('.city', wx, wy, 5, 7, .25);
    }
    for (let x = 108; x < 284; x += 16) light('.lamps', x, 187, 8, 11, .5);
    // 스크롤 fade-up
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
    el.querySelectorAll('.fu').forEach((e) => io.observe(e));
    // 첫 화면을 지나면 하단 고정 버튼, 신청서가 보이면 숨김
    let past = false, formIn = false;
    const so = new IntersectionObserver((es) => {
      for (const e of es) {
        if (e.target.id === 'apply-form') formIn = e.isIntersecting;
        else past = !e.isIntersecting && e.boundingClientRect.top < 0;
      }
      setSticky(past && !formIn);
    });
    so.observe(q('.ghero')); so.observe(q('#apply-form'));
    return () => { io.disconnect(); so.disconnect(); el.querySelectorAll('.bokeh i, .city *, .lamps *').forEach((n) => n.remove()); };
  }, []);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t); }, [toast]);

  const share = async () => {
    try { await navigator.clipboard.writeText(location.href); setToast('링크를 복사했어요. 친구에게 붙여넣기 해주세요'); }
    catch { setToast('복사에 실패했어요. 주소창의 링크를 직접 복사해 주세요'); }
  };
  const ig = <a className="ig" href={`https://instagram.com/${IG}`} target="_blank" rel="noopener">@{IG}</a>;

  return (
    <div className="gw" ref={root}>
      <div className="bokeh" aria-hidden="true" />

      <section className="ghero">
        <div className="titlebox">
          <svg viewBox="0 0 390 260" aria-hidden="true">
            <defs>
              <radialGradient id="gw-glow" cx="50%" cy="100%" r="65%"><stop offset="0" stopColor="#F4B968" stopOpacity=".28" /><stop offset="1" stopColor="#F4B968" stopOpacity="0" /></radialGradient>
              <linearGradient id="gw-arch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F4B968" /><stop offset="1" stopColor="#F08FA0" stopOpacity=".6" /></linearGradient>
            </defs>
            <g className="city" />
            <rect width="390" height="260" fill="url(#gw-glow)" />
            {/* 광화문: 석축(홍예문 3칸) + 2층 누각 */}
            <g fill="#070B16">
              <rect x="78" y="200" width="234" height="60" />
              <rect x="100" y="182" width="190" height="20" />
              <path d="M50 174Q74 186 110 185H280Q316 186 340 174Q318 176 294 166L278 158H112L96 166Q72 176 50 174Z" />
              <rect x="125" y="140" width="140" height="20" />
              <path d="M74 140Q98 152 130 150H260Q292 152 316 140Q296 142 276 132L248 116H142L114 132Q94 142 74 140Z" />
              <rect x="140" y="111" width="110" height="7" />
              <rect x="136" y="104" width="6" height="14" /><rect x="248" y="104" width="6" height="14" />
            </g>
            <g className="lamps" />
            <g fill="url(#gw-arch)" opacity=".85">
              <path d="M180 260V237A15 15 0 0 1 210 237V260Z" />
              <path d="M124 260V241A11 11 0 0 1 146 241V260Z" />
              <path d="M244 260V241A11 11 0 0 1 266 241V260Z" />
            </g>
          </svg>
          <h1 className="gtitle">광화문<br /><span className="y">연가</span><small lang="zh">戀歌</small></h1>
        </div>
        <p className="desc"><span>광화문 근처 2535 직장인들을 위한 로테이션 소모임</span><span>20분씩 대화하고, 서로 고르면 매칭이 돼요.</span><span>뒷풀이는 원하는 분들만.</span></p>
        <ul className="tags"><li>둘이 와도 OK</li><li>최소 8 : 8</li><li>광화문 카페 통대관</li><li>결과는 문자로</li></ul>
      </section>

      <section className="when">
        {startsAt ? <>
          <p className="gdate">{day}<em>{time}</em></p>
          <p className="lbl">{count === null ? '모임이 시작됐어요' : '모임까지 남은 시간'}</p>
          <div className="count" aria-hidden="true">
            {['일', '시간', '분', '초'].map((u, i) => <div key={u}><b>{count ? String(count[i]).padStart(2, '0') : '--'}</b><span>{u}</span></div>)}
          </div>
        </> : <p className="gdate">다음 모임<em>곧 공개돼요</em></p>}
      </section>

      <section className="fu">
        <figure className="bleed river">
          <img src="/gwanghwamun/river.jpg" width={900} height={1117} loading="lazy" alt="노을 진 한강변에 나란히 앉은 두 사람의 뒷모습" />
          <figcaption><h2>어김없이 찾아온<br />추위와 연말</h2><p>설렘도 좋지만 안정적인.<br />농담보다 진짜 대화가 중요한 나이</p></figcaption>
        </figure>
      </section>

      <section className="fu">
        <h2>호스트의 인사</h2>
        <div className="letter">
          <p>안녕하세요, 광화문연가에 관심 가져주셔서 감사해요.<br />저도 광화문 근처 회사에 다니는 직장인이에요.</p>
          <p>연말이 다가오던 어느 날, 옆자리 대리님이 이런 고민을 털어놓으셨어요.
            <q>소개팅 한 번 하면 5~6만 원씩 깨지고, 호흡도 너무 길어서 힘들어요 ㅠㅠ</q>
            그래서 “광화문 주변 직장인들만 모아서 소개팅해 보면 어때요?” 하고 여쭤봤더니 “좋은 아이디어인데요?” 하시더라고요. <span className="aside">(급하셔서 다 좋다고 하신 것 같긴 해요)</span></p>
          <p>사실 제 부캐는 로테이션 소개팅 호스트예요. 사람과 사람을 잇는 걸 좋아하고, 바이브코딩으로 이 모임웹까지 직접 만든 디자이너이기도 하고요. 이번 모임도 이 모임웹으로 진행돼요.</p>
          <p>대리님과 같은 고민을 하는 분이 분명 더 계실 거예요. 아직 연말 계획이 없다면 용기 내서 신청해 보세요. 나머지는 제가 다 준비할게요. 좋은 분들만 모시고 싶어서, 신청서는 제가 한 분 한 분 직접 보고 수락할게요.</p>
          <p>궁금한 건 언제든 {ig}로 DM 주세요.<br />감기 조심하시고, 한 해 마무리 잘 하시길 바라요 :)</p>
          <p className="sign">호스트 옷깃 드림</p>
        </div>
        <figure className="bleed me">
          <img src="/gwanghwamun/host-me.jpg" width={900} height={1200} loading="lazy" alt="카페에서 노트북으로 작업 중인 호스트 옷깃" />
          <figcaption><h2>호스트 옷깃</h2><p>이 모임웹을 직접 만들었어요</p></figcaption>
        </figure>
      </section>

      <section id="about" className="fu">
        <h2>모임 안내</h2>
        <dl className="info">
          {info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={v.startsWith('[') ? 'gempty' : undefined}>{k === '참가비' ? <><s>42,000원</s> <b>{v}</b><small>12월 8일부터 42,000원으로 올라요</small></> : v}</dd></div>)}
        </dl>
      </section>

      <section className="fu">
        <h2>이런 분이라면</h2>
        <ul className="checks">
          <li>송년회는 4개, 크리스마스 약속은 0개인 분</li>
          <li>회사-집-회사, 새로운 사람 만날 틈이 없던 분</li>
          <li>어플은 불안하고 소개팅은 어려운 분</li>
          <li>설렘도 좋지만, 대화가 통하는 사람이 궁금한 분</li>
        </ul>
      </section>

      <section className="fu">
        <h2>이런 분들을 모셔요</h2>
        <ul className="checks">
          <li>나이, 직업, 사진 1장이 필요해요</li>
          <li>혼자 와도, 친구와 와도 OK</li>
          <li>피하고 싶은 회사 동료를 알려주시면 필터링해드려요</li>
          <li>제출한 사진, 정보는 모임 후 폐기돼요</li>
          <li>음료와 간식이 무제한이에요 (와인, 제로콜라, 생수 제공)</li>
        </ul>
      </section>

      <section className="fu">
        <h2>이렇게 진행돼요</h2>
        <figure className="bleed">
          <img src="/gwanghwamun/table.jpg" width={900} height={720} loading="lazy" alt="카페 테이블에 네 사람이 둘러앉아 대화하는 모습" />
          <figcaption><h2>4명이서, 20분씩<br />대화하고 자리를 바꿔요</h2></figcaption>
        </figure>
        <ol className="steps">
          <li><span className="n">1</span><h3>간단한 신청서</h3><p>나이·직업·사진 1장만 받아요. 피하고 싶은 회사 동료도 알려주시면 걸러드려요.</p></li>
          <li><span className="n">2</span><h3>호스트가 직접 수락</h3><p>나이와 분위기 밸런스를 보고 한 분씩 확인해요.</p></li>
          <li><span className="n">3</span><h3>로테이션 대화</h3><p>광화문 근처 카페를 통대관해서, 4명이서 20분씩 대화하고 자리를 바꿔요. 모든 진행은 제가 만든 모임웹으로 해요.</p></li>
          <li><span className="n">4</span><h3>최종선택, 결과는 문자로</h3><p>마음에 든 분을 3명까지 고를 수 있어요. 서로 골랐다면 문자로 알려드려요.</p></li>
          <li><span className="n">5</span><h3>롤링페이퍼와 2차</h3><p>나만 볼 수 있는 롤링페이퍼를 받아요. 아쉬운 분들을 위해 2차도 있어요 (참여는 자유예요).</p></li>
        </ol>
      </section>

      <section className="fu">
        <h2>자주 묻는 질문</h2>
        <details><summary>혼자 가도 어색하지 않나요?</summary><p>혼자 와도, 친구와 둘이 와도 괜찮아요. 로테이션이라 한 분씩이 아니라 여럿이서 함께 대화하게 돼서 어색할 틈이 적어요.</p></details>
        <details><summary>신청하면 바로 확정인가요?</summary><p>아니에요. 호스트가 나이와 분위기 밸런스를 보고 선별해서 수락해요. 성비가 차면 마감돼요.</p></details>
        <details><summary>뭘 준비해야 해요?</summary><p>휴대폰만 있으면 돼요. 최종선택과 롤링페이퍼 모두 모임웹으로 진행돼요.</p></details>
        <details><summary>제 사진과 정보는 어떻게 되나요?</summary><p>나이·직업·사진 1장만 받고, 모임이 끝나면 폐기해요. 피하고 싶은 회사 동료가 있다면 신청할 때 알려주세요. 걸러드려요.</p></details>
        <details><summary>결과는 어떻게 알려주나요?</summary><p>서로 선택했을 때만 문자로 알려드려요. 선택받지 못한 경우엔 아무에게도 알려지지 않아요.</p></details>
      </section>

      <section className="fu" id="apply-form">
        <div className="end">
          <h2>광화문 직장인들을 위한<br />올해 마지막 연말모임(선착순)</h2>
          <ApplyForm />
        </div>
      </section>

      <footer>
        <p className="use">대관비, 다과비, 수고비, 콘텐츠제작비로 활용돼요</p>
        <p>Hosted by 옷깃 · {ig}</p>
        <button className="gbtn" type="button" onClick={share}>친구에게 링크 보내기</button>
      </footer>

      <div className={`sticky${sticky ? ' on' : ''}`}><a className="gbtn p" href="#apply-form" tabIndex={sticky ? 0 : -1}>신청하기</a></div>
      <div className={`gtoast${toast ? ' on' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
