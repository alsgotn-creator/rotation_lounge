'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** 승인 대기 중에는 화면을 켜둔 동안 10초마다 다시 읽어서, 호스트가 승인하면 입장 버튼이 저절로 뜬다. */
export default function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && router.refresh();
    const t = setInterval(tick, 10000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [router]);
  return null;
}
