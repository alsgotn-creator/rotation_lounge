import type { Metadata } from 'next';
import ApplyFlow from './ApplyFlow';

export const metadata: Metadata = { title: '신청하기 · 플러팅 라운지' };

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  return <ApplyFlow initialSession={s ?? null} />;
}
