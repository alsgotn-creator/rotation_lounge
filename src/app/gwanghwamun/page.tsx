import type { Metadata, Viewport } from 'next';
import Gwanghwamun from './Gwanghwamun';
import { nextGwanghwamun } from '../../lib/server/signup';
import { INFO } from './config';
import './gw.css';

export const revalidate = 60; // 남은 자리는 1분마다 새로

const DESC = '광화문·을지로 직장인만 모이는 로테이션 소셜링. 모임 전에 파트너와 먼저 인사하고, 당일엔 게임하며 자연스럽게 가까워져요.';
export const metadata: Metadata = {
  title: '퇴근 후, 새로운 설렘 · 광화문·을지로 직장인 로테이션 소셜링',
  description: DESC,
  openGraph: { type: 'website', locale: 'ko_KR', title: '퇴근 후, 새로운 설렘 · 광화문·을지로 직장인 로테이션 소셜링', description: DESC },
};
export const viewport: Viewport = { themeColor: '#0E1424' };

const ko = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', ...o }).format(d);

/** 광화문연가 QR 랜딩. 모임 정보는 Supabase events 에서 (장소에 광화문·을지로가 들어간 가장 가까운 모임) */
export default async function GwanghwamunPage() {
  const next = await nextGwanghwamun();
  const e = next?.event;
  const d = e ? new Date(e.starts_at) : null;
  const day = d ? ko(d, { month: 'long', day: 'numeric', weekday: 'long' }) : ''; // 12월 11일 금요일
  const time = d ? ko(d, { hour: 'numeric', minute: d.getUTCMinutes() ? '2-digit' : undefined }) : ''; // 오후 7시
  return (<>
    {/* React 19가 <head>로 올려준다. 이 페이지에서만 쓰는 폰트 */}
    <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@600;800&display=swap" />
    <Gwanghwamun
      startsAt={e?.starts_at ?? null}
      serverNow={Date.now()}
      day={day}
      time={time}
      info={INFO}
    />
  </>);
}
