import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { isHost } from '../../../../lib/server/auth';
import { getEvent } from '../../../../lib/server/signup';
import { toSession } from '../../../../lib/signup/rules';
import Run from './Run';

export const metadata: Metadata = { title: '진행 · 플러팅 라운지', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function RunPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isHost())) redirect('/host');
  const { slug } = await params;
  const event = await getEvent({ slug });
  if (!event) notFound();
  const s = toSession(event, []);
  return <Run slug={slug} when={`${s.dateLabel} ${s.time} · ${event.venue}`} />;
}
