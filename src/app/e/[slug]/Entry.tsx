'use client';
import { useState } from 'react';
import Play from './Play';
import type { LoungeView } from '../../../lib/server/lounge';
import type { Shape } from '../../../lib/domain/register';
import Register, { type Given, type Initial } from './Register';
import Worldcup from './Worldcup';

type Me = { area: string; mbti: string; keywords: string[]; answers: number[]; loveType: number; shape: Shape; prop: string; ideal?: string; charm?: string };

/** 등록 전이면 등록 화면, 등록 후면 대기실 (시작 전에는 내 소개 수정 가능) */
export default function Entry({ slug, given, me, when, devStep, lounge, double = false, needWc = false }: { slug: string; given: Given; me: Me | null; when: string; devStep?: number; lounge: LoungeView | null; double?: boolean; needWc?: boolean }) {
  const [edit, setEdit] = useState(false);
  if (!me || devStep !== undefined) return <Register slug={slug} given={given} initial={null} devStep={devStep} double={double} />;
  if (edit) {
    const init: Initial = { area: me.area, mbti: me.mbti, keywords: me.keywords, answers: me.answers, shape: me.shape, prop: me.prop, ideal: me.ideal, charm: me.charm };
    return <Register slug={slug} given={given} initial={init} onCancel={() => setEdit(false)} double={double} />;
  }
  if (needWc) return <Worldcup slug={slug} gender={given.gender} />;
  if (!lounge) return null;
  return <Play slug={slug} lounge={lounge} when={when} loveType={me.loveType} double={double} onEdit={() => { setEdit(true); window.scrollTo(0, 0); }} />;
}
