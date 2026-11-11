'use client';
import { useState } from 'react';
import Play from './Play';
import type { LoungeView } from '../../../lib/server/lounge';
import type { Shape } from '../../../lib/domain/register';
import Register, { type Initial } from './Register';

type Me = { area: string; mbti: string; keywords: string[]; answers: number[]; loveType: number; shape: Shape; prop: string };

/** 등록 전이면 등록 화면, 등록 후면 대기실 (시작 전에는 내 소개 수정 가능) */
export default function Entry({ slug, given, me, when, devStep, lounge }: { slug: string; given: { gender: 'f' | 'm'; age: number; job: string }; me: Me | null; when: string; devStep?: number; lounge: LoungeView | null }) {
  const [edit, setEdit] = useState(false);
  if (!me || devStep !== undefined) return <Register slug={slug} given={given} initial={null} devStep={devStep} />;
  if (edit) {
    const init: Initial = { area: me.area, mbti: me.mbti, keywords: me.keywords, answers: me.answers, shape: me.shape, prop: me.prop };
    return <Register slug={slug} given={given} initial={init} onCancel={() => setEdit(false)} />;
  }
  if (!lounge) return null;
  return <Play slug={slug} lounge={lounge} when={when} loveType={me.loveType} onEdit={() => { setEdit(true); window.scrollTo(0, 0); }} />;
}
