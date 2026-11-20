import { Icon } from '../../components/Icon';
import TabBar from '../../components/TabBar';

export const metadata = { title: '자주 묻는 질문 · 플러팅 라운지' };

const FAQ = [
  ['혼자 가도 괜찮나요?', '모두 혼자 와요. 친구와 함께 신청하면 같은 날 다른 테이블에 앉아요.'],
  ['아는 사람을 만나면 어떡하죠?', '신청할 때 마주치고 싶지 않은 지인을 적어주세요. 같은 날 배정하지 않고, 상대에게는 알리지 않아요.'],
  ['휴대폰 번호는 왜 적나요?', '라운지에 입장할 때 쓰고, 행사가 끝난 뒤 매칭 결과를 문자로 알려드려요. 다른 용도로는 쓰지 않아요.'],
  ['연락처는 언제 공개되나요?', '서로 고른 두 사람에게만, 행사가 끝난 뒤 문자로 알려드려요.'],
];

export default function FaqPage() {
  return (
    <main className="lp lp-page">
      <header className="lp-ph"><p>FAQ</p><h1>자주 묻는 질문</h1><span>궁금한 점이 더 있으면 문의하기로 물어봐주세요.</span></header>
      <section className="lp-sec">
        <div className="qa lp-qa">
          {FAQ.map(([q, a], i) => (
            <details key={q} open={i === 0}><summary>{q}<Icon name="down" /></summary><p>{a}</p></details>
          ))}
        </div>
      </section>
      <TabBar />
    </main>
  );
}
