import type { Metadata } from 'next';
import ApplyFlow from './ApplyFlow';
import { listSessions } from '../../lib/server/signup';

export const metadata: Metadata = { title: '신청하기 · 플러팅 라운지' };
export const dynamic = 'force-dynamic';

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  return <ApplyFlow sessions={await listSessions()} initialSession={s ?? null} />;
}
