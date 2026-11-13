import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { isHost } from '../../../lib/server/auth';
import { db } from '../../../lib/server/supabase';
import { eventLayout, getEvent, listApplications, photoUrls } from '../../../lib/server/signup';
import { avoidHits, toSession } from '../../../lib/signup/rules';
import Applicants, { type Row } from './Applicants';

export const metadata: Metadata = { title: '신청 관리 · 플러팅 라운지', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function HostEvent({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isHost())) redirect('/host');
  const { slug } = await params;
  const event = await getEvent({ slug });
  if (!event) notFound();
  const [apps, layout, { data: parts }] = await Promise.all([listApplications(event.id), eventLayout(event.id),
    db().from('participants').select('application_id,area,mbti,keywords,answers,love_type').eq('event_id', event.id)]); // 사전 등록 내용 (호스트만 본다)
  const prof = new Map((parts ?? []).map((p) => [p.application_id as string, { area: p.area as string, mbti: p.mbti as string, keywords: (p.keywords ?? []) as string[], answers: (p.answers ?? []) as number[], loveType: p.love_type as number }]));
  const urls = await photoUrls(apps.flatMap((a) => a.photo_paths));
  let k = 0;
  const rows: Row[] = apps.map((a) => ({
    id: a.id, name: a.name, gender: a.gender, birthYear: a.birth_year, job: a.job, phone: a.phone, email: a.email,
    status: a.status, paymentDue: a.payment_due, createdAt: a.created_at, number: a.number, avoid: a.avoid,
    photos: a.photo_paths.map(() => urls[k++]),
    profile: prof.get(a.id) ?? null,
    avoidHits: avoidHits(a, apps).map((o) => o.name),
    // 다른 신청자가 이 사람을 피하고 싶다고 적은 경우도 호스트에게 알려준다 (누가 적었는지만)
    avoidedBy: apps.filter((o) => o.id !== a.id && o.status !== 'cancelled' && avoidHits(o, [a]).length).map((o) => o.name),
  }));
  return <Applicants event={{ id: event.id, slug: event.slug, applyOpen: event.apply_open, capacity: event.capacity_per_gender, tables: layout.tables, perTable: layout.perTable, price: event.price }} session={toSession(event, apps)} rows={rows} />;
}
