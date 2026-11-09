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
- **Love type**: answers map onto 4 axes (거리감 / 표현 / 데이트 / 미래) → 16 types. Shown as a **real color only, no letters or color-name text**, plus short tendency phrases. Recommend the most similar opposite-sex participant ("당신과 가장 비슷한 사람은 ○호분이에요!"), revealed once everyone has registered.
- **Seating** (changed 2026-11-03): each person's 호 number is assigned **at random when the host confirms their deposit** ("당신은 여자 3호예요"); participants do not pick seats. Round 1: 여n호 and 남n호 sit at table n. Women stay; men move one table clockwise (wrapping) on next round. The host places tables in the room by number. Tables are a rectangle: right column 1..⌈T/2⌉ top→bottom, left column the rest bottom→top. **Per-table size (2026-11-03):** a table seats g women + g men (g = 1, 2 or 3, host setting `events.per_table`; max per gender = tables × g). 호 numbers run 1..T×g; numbers in the same group (ceil(n/g)) share a table, and men move one table per round **as whole groups**. Round 1 starts with equal numbers (2:2 → 여1·2호 and 남1·2호 at table 1). The minute-7 reveal and the rolling paper apply to every opposite-sex person at the table. Unequal counts: the unpaired person sits out that round. Current events run 7:7 at 1:1 tables.
- **Lounge** shows only character + keywords. Age/job/area/MBTI are revealed at **minute 7** of each conversation, **only to the person sitting opposite**.
- **Round timer**: 12 min default, host-configurable. Participants see no numbers: their own character walks along a bar from left to right and reaches the right end when time is up. Each new round is created **paused** (seat move); time only runs after the host taps "대화 시작".
- **Optional pair games** during a round (balance game, talk, scenario): always laid out on the round screen (no button to open), **choice-only, no typing**. Either partner taps a kind to draw a card, both pick, answers revealed side by side. Never required. Do not include the "너는? 꼭 되물어주기" line.
- **Rolling paper** (changed 2026-11-09): written to the partner after each round, **mandatory (no skip)**, the only typed input. **Not anonymous**: each note shows the writer's 호. Only the owner reads it, and it opens automatically when the host switches to 최종선택, before picking. Notes scattered on one sheet; the reader can switch the handwriting font. No contact info ("연락처 입력 시 매칭이 되지 않아요"). Host page shows notes/choices progress and alerts when all are in.
- **Final choice**: up to N picks (host-configurable; 2 or 3). Host sees results immediately; the host emails matched pairs within an hour. Only mutual picks get a "매칭되었어요" message; nobody learns how many people chose them.

## Design direction

풋풋하고 사랑이 느껴지되 **고급스럽게** — the user rejected pastel/cartoon/pixel mockups as too childish. Theme: midnight navy + rose gold, one font (Pretendard) except the rolling paper (handwriting font), portrait layouts only.

Characters: glossy cloud-jelly body with big googly eyes (Higgsfield `gpt_image_2_5`, transparent PNG). Animation is **image-based, not video**: per character 3 aligned frames (base / smile / eyes-closed); body "breathes" via CSS scale, and only the face region (masked) swaps to blink/smile. Colors follow the 16 love types.

Splash (loading screen): app name **플러팅 / 라운지** in two lines, large, handwriting font with a rose-gold shimmer; below it a rose-gold fine-line illustration of a man and woman meeting at a café table (Higgsfield job `54867cda-4cbd-46a9-9aed-8bb5b514fb2d`, transparent PNG); twinkling stars and a thin loading bar. No characters on the splash.

The user's existing printed materials (black/white/pink-red editorial look) are content sources only — do **not** copy their visual style.
