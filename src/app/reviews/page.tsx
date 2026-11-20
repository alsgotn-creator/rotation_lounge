import TabBar from '../../components/TabBar';
import { Stars } from '../../components/Stars';
import { average, latestReviews } from '../../lib/server/reviews';

export const revalidate = 60;
export const metadata = { title: '후기 · 플러팅 라운지' };

export default async function ReviewsPage() {
  const reviews = await latestReviews(50);
  return (
    <main className="lp lp-page">
      <header className="lp-ph">
        <p>REVIEWS</p><h1>다녀온 분들 이야기</h1><span>행사에 다녀온 분이 직접 남긴 한 줄이에요.</span>
        {reviews.length > 0 && <div className="lp-avg"><Stars value={average(reviews)} size={18} /><small>후기 {reviews.length}개</small></div>}
      </header>
      <section className="lp-sec">
        {reviews.length === 0
          ? <div className="lp-card static"><div className="lp-tx"><strong>후기를 준비하고 있어요</strong><span>행사가 끝나면 참가자들의 이야기가 여기 모여요.</span></div></div>
          : <div className="lp-rvs">{reviews.map((r, i) => <div className="lp-rv" key={i}><Stars value={r.rating} /><p>“{r.body}”</p><small>{r.age}세 · {r.gender === 'f' ? '여성' : '남성'}</small></div>)}</div>}
      </section>
      <TabBar />
    </main>
  );
}
