# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

No application code yet. Design is approved: spec `docs/superpowers/specs/2026-10-31-flirting-lounge-design.md`, plan `docs/superpowers/plans/2026-10-31-flirting-lounge.md` (read its "Status / pending revision" section first — Supabase deferred, Vercel-only preview mode, building paused by the user). The **signup site** (preview mode, no backend yet) is scaffolded: `npm run dev`, `npm run build`, `npm test` (Vitest). Pages: `/` landing, `/apply` 7-step flow, `/status` + `/status/demo`, `/admin` (mock host list). Example data, fee and deposit account live in `src/lib/signup/data.ts`. Use relative imports (the `@/` alias failed to resolve in this Windows path). Keep TypeScript on 5.x: Next 15 rejects TS 7. `.superpowers/` holds brainstorm mockups and is gitignored.

## What this is

A web app for running offline rotation blind-date events (로테이션 소개팅), 7:7 up to 9:9. Two surfaces, kept in sync in realtime:
- **Participant phones** — pre-registration, lounge, round view, rolling paper, final choice.
- **Host controls** — the host advances every phase; nothing auto-advances. (The shared big screen was removed 2026-11-09: no TV at the venue.)

Stack (user's choice): **Next.js**, deployed on **Vercel**, shared state/realtime on **Supabase**. Keep monthly cost near zero (free tiers); Supabase free projects pause after a week idle, so a keep-alive ping is planned.

## Domain rules (agreed with the user)

- **Phases** set by host, visible to all: 시작 전 → 대화 → 최종선택 → 마무리. Within 대화, the host starts rounds and presses "next round".
- **Pre-registration** happens before the event via a shared link (no on-site QR entry): nickname, gender, age, job, area, MBTI, 1–2 "나만의 키워드", character, and 15 love/values questions.
- **Love type**: answers map onto 4 axes (거리감 / 표현 / 데이트 / 미래) → 16 types. Shown as a **real color only, no letters or color-name text**, plus short tendency phrases. Similarity (changed 2026-11-10): no host toggle. When a partner's info is revealed at minute 5, the reveal box also shows how similar their 15 answers are to mine (%, Euclidean distance on reverse-scored answers, `similarity` in `loveType.ts`), and marks them if they are my most similar opposite-sex participant.
- **Seating** (changed 2026-11-03): each person's 호 number is assigned **at random when the host confirms their deposit** ("당신은 여자 3호예요"); participants do not pick seats. Round 1: 여n호 and 남n호 sit at table n. Women stay; each round men move to the next-numbered table, wrapping (남1호 → 여2호, 남7호 → 여1호; fixed 2026-11-09). The host places tables in the room by number. Tables are a rectangle: right column 1..⌈T/2⌉ top→bottom, left column the rest bottom→top. **Per-table size (2026-11-03):** a table seats g women + g men (g = 1, 2 or 3, host setting `events.per_table`; max per gender = tables × g). 호 numbers run 1..T×g; numbers in the same group (ceil(n/g)) share a table, and men move one table per round **as whole groups**. Round 1 starts with equal numbers (2:2 → 여1·2호 and 남1·2호 at table 1). The minute-5 reveal and the rolling paper apply to every opposite-sex person at the table. Unequal counts: the unpaired person sits out that round. Current events run 7:7 at 1:1 tables.
- **Lounge** shows only character + keywords. Age/job/area/MBTI are revealed at **minute 5** of each conversation (changed 2026-11-09), **only to the person sitting opposite**; the round screen explains why (get to know the person before the conditions). At final choice, everyone you sat with is viewable via the info icon.
- **Round timer**: 12 min default, host-configurable. Participants see no numbers: their own character walks along a bar from left to right and reaches the right end when time is up. Each new round is created **paused** (seat move); time only runs after the host taps "대화 시작".
- **Optional pair games** during a round (balance game, talk, scenario): always laid out on the round screen (no button to open), **choice-only, no typing**. Either partner taps a kind to draw a card, both pick, answers revealed side by side. Never required. Do not include the "너는? 꼭 되물어주기" line.
- **Rolling paper** (changed 2026-11-09): written to the partner after each round, **mandatory (no skip)**, the only typed input. **Not anonymous**: each note shows the writer's 호. Only the owner reads it, and it opens automatically when the host switches to 최종선택, before picking. Up to 7 notes (100 chars each) flow on one sheet without overlapping, slightly tilted; the **writer** picks the handwriting font (notes.font, migration 0011). No contact info ("연락처 입력 시 매칭이 되지 않아요"). Host page shows notes/choices progress and alerts when all are in.
- **Entry & lock** (2026-11-10): the landing "라운지 입장" takes the applicant's phone number. After the event the host presses "닫기" on the run page (`events.locked`, migration 0012): every participant entry is refused, data is kept.
- **Final choice**: up to 3 ranked picks (default 3; host can set 2). Any mutual pick matches, even 3rd-rank to 3rd-rank (the screen says so). Host sees results immediately; results are **never shown in the app** (no toggle, changed 2026-11-10) — the host texts everyone within an hour from a work phone (decided 2026-11-10: SMS, not email); the run page has per-person "문자 복사" buttons (`src/lib/domain/sms.ts`). Nobody learns how many people chose them.

## Design direction

**Changed 2026-11-10:** white / light-gray tone (tokens in `src/app/globals.css` `:root`: bg #f4f4f5, white cards, black text and black buttons), one font (Pretendard) except the rolling paper (handwriting font), portrait layouts only. The earlier navy + rose gold look is retired.

Characters: minimal 2D pen-line illustrations (thick black outlines, black hair, white face and clothes, two dot eyes, no mouth), 6 women (f1–f6) and 6 men (m1–m6); participants pick from their own gender's six. The id is stored in `participants.shape` (`prop` is no longer used). Each character has exactly **one accent item** (scarf, mug, beanie…) painted in the person's love-type color: `public/characters/<id>.webp` is the line art with the item left white, and `<id>-accent.webp` is the item's mask, filled with the color via CSS. Animation: a slight CSS "breathe" plus a blink overlay drawn at eye coordinates measured from the art (`EYES` in `src/components/Character.tsx`). Landing hero is `public/lounge-line.webp` in the same style.

Splash (loading screen): app name **플러팅 / 라운지** in two lines, large, handwriting font with a rose-gold shimmer; below it a rose-gold fine-line illustration of a man and woman meeting at a café table (Higgsfield job `54867cda-4cbd-46a9-9aed-8bb5b514fb2d`, transparent PNG); twinkling stars and a thin loading bar. No characters on the splash.

The user's existing printed materials (black/white/pink-red editorial look) are content sources only — do **not** copy their visual style.
