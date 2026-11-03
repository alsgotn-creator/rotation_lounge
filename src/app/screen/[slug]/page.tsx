import type { Metadata } from 'next';
import Screen from './Screen';

export const metadata: Metadata = { title: '큰 화면 · 플러팅 라운지', robots: { index: false } };

export default async function ScreenPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ k?: string }> }) {
  return <Screen slug={(await params).slug} k={(await searchParams).k ?? ''} />;
}
