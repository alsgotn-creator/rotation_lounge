import type { Metadata, Viewport } from 'next';
import Gwanghwamun from './Gwanghwamun';
import { nextGwanghwamun } from '../../lib/server/signup';
import './gw.css';

export const revalidate = 60; // 남은 자리는 1분마다 새로

const DESC = '광화문 근처 2535 직장인들을 위한 로테이션 소모임. 20분씩 대화하고, 서로 고르면 매칭이 돼요. 뒷풀이는 원하는 분들만.';
export const metadata: Metadata = {
  title: '광화문연가 · 2535 직장인 로테이션 소개팅',
  description: DESC,
  openGraph: { type: 'website', locale: 'ko_KR', title: '광화문연가 · 2535 직장인 로테이션 소개팅', description: DESC },
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
      day={day}
      time={time}
      info={[
        ['일시', '12월 11일 오후 7시'],
        ['장소', e?.venue || '광화문 근처 카페 통대관'],
        ['대상', '광화문 근처 2535 직장인'],
        ['인원', '최소 8 : 8 · 미달 시 진행하지 않고 전부 환불해드려요'],
        ['참가비', '40,000원'],
      ]}
    />
  </>);
}
