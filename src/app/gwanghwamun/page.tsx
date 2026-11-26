import type { Metadata, Viewport } from 'next';
import Gwanghwamun from './Gwanghwamun';
import { nextGwanghwamun } from '../../lib/server/signup';
import './gw.css';

export const revalidate = 60; // 남은 자리는 1분마다 새로

const DESC = '2:2 로테이션 소셜링. 단둘의 어색함 없이, 넷이서 시작하는 설렘.';
export const metadata: Metadata = {
  title: '퇴근 후, 새로운 설렘 · 광화문 남녀 직장인을 위한 2:2 로테이션 소셜링',
  description: DESC,
  openGraph: { type: 'website', locale: 'ko_KR', title: '퇴근 후, 새로운 설렘 · 광화문 남녀 직장인을 위한 2:2 로테이션 소셜링', description: DESC },
};
export const viewport: Viewport = { themeColor: '#0E1424' };

const ko = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', ...o }).format(d);

/** 광화문연가 QR 랜딩. 모임 정보는 Supabase events 에서 (장소에 광화문·을지로가 들어간 가장 가까운 모임) */
export default async function GwanghwamunPage() {
  const next = await nextGwanghwamun();
  const e = next?.event;
  const raised = Date.now() >= Date.parse('2026-12-07T00:00:00+09:00'); // 12월 7일부터 참가비 42,000원 (페이지는 1분마다 새로 만들어진다)
  const d = e ? new Date(e.starts_at) : null;
  const day = d ? ko(d, { month: 'long', day: 'numeric', weekday: 'long' }) : ''; // 12월 11일 금요일
  const time = d ? ko(d, { hour: 'numeric', minute: d.getUTCMinutes() ? '2-digit' : undefined }) : ''; // 오후 7시
  return (<>
    {/* React 19가 <head>로 올려준다. 이 페이지에서만 쓰는 폰트 */}
    <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@600;800&display=swap" />
    <Gwanghwamun
      startsAt={e?.starts_at ?? null}
      raised={raised}
      day={day}
      time={time}
      info={[
        ['일시', '12월 11일 오후 7시'],
        ['장소', '광화문 근처 공간 (참가하시는 분들께 따로 전달)'],
        ['대상', '광화문 근처 2535 직장인'],
        ['인원', '최소 8 : 8 · 미달 시 진행하지 않고 전부 환불해드려요'],
        ['참가비', raised ? '42,000원' : '39,000원'],
      ]}
    />
  </>);
}
