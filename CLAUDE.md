# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

No application code yet. The project is in design (superpowers brainstorming); the design doc will live at `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`. Add build/test commands here once the app is scaffolded. `.superpowers/` holds brainstorm mockups and is gitignored.

## What this is

A web app for running offline rotation blind-date events (로테이션 소개팅), 7:7 up to 9:9. Two surfaces, kept in sync in realtime:
- **Participant phones** — pre-registration, lounge, round view, rolling paper, final choice.
- **Host big screen + controls** — the host advances every phase; nothing auto-advances.

Stack (user's choice): **Next.js**, deployed on **Vercel**, shared state/realtime on **Supabase**. Keep monthly cost near zero (free tiers); Supabase free projects pause after a week idle, so a keep-alive ping is planned.

## Domain rules (agreed with the user)

- **Phases** set by host, visible to all: 시작 전 → 대화 → 최종선택 → 마무리. Within 대화, the host starts rounds and presses "next round".
- **Pre-registration** happens before the event via a shared link (no on-site QR entry): nickname, gender, age, job, area, MBTI, 1–2 "나만의 키워드", character, and 15 love/values questions.
- **Love type**: answers map onto 4 axes (거리감 / 표현 / 데이트 / 미래) → 16 types. Shown as a **real color only, no letters or color-name text**, plus short tendency phrases. Recommend the most similar opposite-sex participant ("당신과 가장 비슷한 사람은 ○호분이에요!"), revealed once everyone has registered.
- **Seating**: tables are a rectangular layout (venue may change). Participants tap their table before round 1; taken seats are blocked. Women stay; men move one table clockwise (wrapping) when the host presses next round. Pairings are derived from this. Unequal counts: the unpaired person just sits out that round.
- **Lounge** shows only character + keywords. Age/job/area/MBTI are revealed at **minute 7** of each conversation, **only to the person sitting opposite**.
- **Round timer**: 15 min default, host-configurable (sometimes 12).
- **Optional pair games** during a round (balance game, values/talk cards): either partner taps to draw a card, both answer, answers revealed side by side. Never required. Do not include the "너는? 꼭 되물어주기" line.
- **Rolling paper**: written to the partner after each round; **anonymous**, only the owner can read it, opened at the end. Render notes scattered randomly on one sheet in a handwriting font — not as a list. No contact info.
- **Final choice**: up to N picks (host-configurable; 2 or 3). Host sees results immediately; participants see them when the host reveals (~30 min later). Only mutual picks get a "매칭되었어요" message; nobody learns how many people chose them.

## Design direction

풋풋하고 사랑이 느껴지되 **고급스럽게** — the user rejected pastel/cartoon/pixel mockups as too childish. Theme: midnight navy + rose gold, one font (Pretendard) except the rolling paper (handwriting font), portrait layouts only.

Characters: glossy cloud-jelly body with big googly eyes (Higgsfield `gpt_image_2_5`, transparent PNG). Animation is **image-based, not video**: per character 3 aligned frames (base / smile / eyes-closed); body "breathes" via CSS scale, and only the face region (masked) swaps to blink/smile. Colors follow the 16 love types.

Splash (loading screen): app name **플러팅 / 라운지** in two lines, large, handwriting font with a rose-gold shimmer; below it a rose-gold fine-line illustration of a man and woman meeting at a café table (Higgsfield job `54867cda-4cbd-46a9-9aed-8bb5b514fb2d`, transparent PNG); twinkling stars and a thin loading bar. No characters on the splash.

The user's existing printed materials (black/white/pink-red editorial look) are content sources only — do **not** copy their visual style.
