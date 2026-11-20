'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Stars } from '../components/Stars';
import type { Review } from '../lib/server/reviews';

/** 상단 HOST 칩 아래: 최근 후기가 별점과 함께 한 장씩 넘어간다. 누르면 후기 페이지. 후기가 없으면 아무것도 안 보인다 */
export default function ReviewTicker({ reviews }: { reviews: Review[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reviews.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % reviews.length), 3200);
    return () => clearInterval(t);
  }, [reviews.length]);
  const r = reviews[i];
  if (!r) return null;
  return (
    <Link href="/reviews" className="lp-tick" aria-label="후기 모두 보기">
      <span key={i} className="lp-tick-in">
        <Stars value={r.rating} size={11} />
        <q>{r.body}</q>
        <small>{r.age}세 · {r.gender === 'f' ? '여성' : '남성'}{r.sample && <i className="lp-sample">예시</i>}</small>
      </span>
    </Link>
  );
}
