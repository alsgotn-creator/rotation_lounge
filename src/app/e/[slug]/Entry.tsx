'use client';
import { useState } from 'react';
import { Character } from '../../../components/Character';
import { PALETTE, phrases } from '../../../lib/domain/loveType';
import type { Prop, Shape } from '../../../lib/domain/register';
import Register, { type Initial } from './Register';

type Me = { nickname: string; area: string; mbti: string; keywords: string[]; answers: number[]; loveType: number; shape: Shape; prop: Prop };

/** 등록 전이면 등록 화면, 등록 후면 내 카드 + 수정하기 */
export default function Entry({ slug, given, me, when, canEdit, devStep }: { slug: string; given: { gender: 'f' | 'm'; age: number; job: string }; me: Me | null; when: string; canEdit: boolean; devStep?: number }) {
  const [edit, setEdit] = useState(false);
  if (!me || devStep !== undefined) return <Register slug={slug} given={given} initial={null} devStep={devStep} />;
  if (edit) {
    const init: Initial = { nickname: me.nickname, area: me.area, mbti: me.mbti, keywords: me.keywords, answers: me.answers, shape: me.shape, prop: me.prop };
    return <Register slug={slug} given={given} initial={init} onCancel={() => setEdit(false)} />;
  }
  return (
    <main className="fin" style={{ paddingTop: 48 }}>
      <div className="preview-chr"><Character shape={me.shape} color={me.loveType} prop={me.prop} size={170} /></div>
      <h2 className="q" style={{ marginTop: 8 }}>{me.nickname}님,<br />등록을 마쳤어요</h2>
      <p className="ds">{when}에 라운지에서 만나요.<br />당일에도 <b>이 링크</b>로 들어오면 돼요.</p>
      <div className="kw" style={{ justifyContent: 'center' }}>{me.keywords.map((k) => <span key={k} style={{ paddingRight: 14 }}>{k}</span>)}</div>
      <div className="card" style={{ paddingBottom: 18, textAlign: 'center' }}>
        <div className="orb" style={{ ['--c' as string]: PALETTE[me.loveType], width: 72, height: 72, margin: '4px auto 14px', animation: 'none' }} role="img" aria-label="나의 연애 컬러" />
        {phrases(me.loveType).map((p) => <p key={p} style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.9 }}>{p}</p>)}
      </div>
      <div className="rec">당신과 가장 비슷한 사람은<br /><b style={{ color: 'var(--text)' }}>모두 등록하면 알려드릴게요</b></div>
      {canEdit && <div className="ft"><button className="btn sub" onClick={() => { setEdit(true); window.scrollTo(0, 0); }}>내 소개 수정하기</button></div>}
    </main>
  );
}
