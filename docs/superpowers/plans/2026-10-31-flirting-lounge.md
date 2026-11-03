# 플러팅라운지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 플러팅라운지 web app that runs an offline rotation blind-date event (7:7–9:9). It covers pre-registration with a love-color result, the lounge, seated rounds with a timer and a minute-7 reveal, optional pair games, an anonymous rolling paper, final choice with mutual matching, and a host big screen with controls.

**Architecture:** Every rule lives in pure TypeScript functions under `src/lib/domain`. The server builds a per-role **view** (participant / host / screen) from an event `Snapshot` plus `now`, so privacy is decided in one tested place. Browsers never read tables: Supabase RLS denies the anon key everything, and all reads and writes go through Next.js Route Handlers that use the service-role key. Realtime uses a Supabase **broadcast** channel per event that carries only a "changed" signal; clients then refetch their own view. Persistence sits behind an `EventStore` interface with a Supabase implementation and an in-memory one, so command logic is unit-tested without a database.

**Tech Stack:** Next.js 15 (App Router, TypeScript, `src/`), plain CSS (global tokens + CSS modules), Supabase (`@supabase/supabase-js` v2: Postgres + Realtime broadcast), Vitest, Vercel (Cron). Fonts: Pretendard Variable via CDN, Nanum Pen Script via `next/font/google`.

**Spec:** `docs/superpowers/specs/2026-10-31-flirting-lounge-design.md`. Visual mockups live in `.superpowers/brainstorm/2664-1793417169/content/` (gitignored, local only). Match them: `splash-v2.html` (A), `prereg.html`, `lounge-mix.html`, `host-and-round-v2.html`, `paper-and-choice.html`, `anim-compare.html` (A).

## Status (2026-11-03)

- Supabase project created: `https://bdygooqxwvultoqhunqd.supabase.co`. The URL is in `.env.local` (gitignored); the user fills in the keys and `HOST_PASSWORD` locally and in Vercel. **This replaces the 2026-10-31 "no Supabase / browser-only preview mode" decision** — skip that preview mode.
- A public **signup site** already exists in this repo (commits `f9d456d`…`f691dba`, pushed to `github.com/alsgotn-creator/rotation_lounge`): `/` landing, `/apply` 7-step flow, `/status` + `/status/demo`, `/admin` mock. It is UI-only (no storage). Its design (navy `#0a122f`, Toss-style one-question-per-screen) is approved; draft `docs/design/signup-draft-v6.html`.
- Execution: subagent-driven. **Wait for the user to approve this revision before building.**

## Revision 2026-11-03: signup site + invite-only lounge (overrides the tasks below where they conflict)

**Intent (user):** connect the signup site with the in-event lounge app so that the lounge screens are visible **only to participants and the host** — one site, public signup outside, locked lounge inside.

**Decided with the user**
- One Next.js app, one Supabase project for both signup and lounge.
- Host name "옷깃" shown top-right of the landing; business info (대표 민시훈, 697-67-00622, alsgotn@naver.com) in the footer — already done.
- Fee 30,000원, deposit to 토스뱅크 1000-4168-0942 민시훈 (`src/lib/signup/data.ts`).
- Order: apply → host confirms → deposit request → host confirms deposit → participant gets a personal lounge link.

**My calls (stated to the user, open to change)**
- **Personal invite link replaces the shared pre-registration link.** Spec line "사전 등록은 공유 링크" and the walk-in-via-same-link rule change: `/e/[slug]` without a valid cookie shows only "입장 링크가 필요해요". Walk-ins: host adds them in the host screen, which creates a confirmed application and shows their link.
- **PIN + nickname recovery is dropped.** The invite link itself can be reopened on any device and re-sets the cookie. (Forwarding the link lets someone else in; accepted for a 14–18 person event.)
- **Registration is prefilled from the application**: gender, age (event year − birth year), job. The participant still enters nickname, area, MBTI, keywords, 15 answers, character.
- **No email until Resend + a domain exist.** Each host action shows a "메시지 복사" button with ready-to-send text (deposit info, or the invite link) for KakaoTalk/SMS. The applicant's done screen shows a personal status link `/status/[token]` to save. The email lookup on `/status` shows "신청 완료 화면의 링크로 확인해요 · 분실 시 alsgotn@naver.com" until Resend is wired.
- Seats shown on the landing = capacity − applications in `awaiting_payment` or `confirmed` per gender. `new` does not hold a seat.
- Photos are resized in the browser (long edge 1280 px, JPEG ~0.82) and uploaded with the form to the server, which stores them in a **private** Storage bucket; the host sees them via 1-hour signed URLs.

**Data (add to `0001_init.sql`)**
- `events` gains: `birth_from int`, `birth_to int`, `capacity_per_gender int default 7`, `apply_open bool default true`, `price int default 30000`, `payment_due_days int default 3`. A signup "일정" is an `events` row.
- `applications`: `id uuid pk`, `event_id → events on delete cascade`, `gender 'f'|'m'`, `name`, `birth_year int`, `phone`, `email`, `job`, `photo_paths text[]` (1–3), `avoid jsonb` (`[{name, note}]`), `status 'new'|'held'|'awaiting_payment'|'confirmed'|'cancelled'`, `status_token_hash text unique`, `invite_token_hash text unique null`, `payment_due date null`, `created_at`, `updated_at`. RLS on, no policies.
- `participants` gains `application_id uuid unique null → applications`; drop `pin_hash`.
- Storage bucket `applicant-photos` (private). The daily cron (Task 14) also deletes applications and their photos 30 days after the event.
- Privacy: application fields (name, phone, email, photos, avoid list) never appear in participant or screen views — add this to the Task 6 privacy test.

**New tasks (run before the lounge tasks; Task 5's store/migration work starts here)**

- **A1. Schema + Supabase client + apply API.** Migration as above; `src/lib/server/supabase.ts` (service-role client); `POST /api/apply` (multipart): re-validate with `src/lib/signup/validate.ts`, check `apply_open`, birth range and seats, honeypot field, rate-limit by IP (5/hour, in-memory is fine), upload photos, insert, return `{statusToken}`. `GET /api/events/public` returns open events with seats left. Landing and `/apply` read events from it instead of `SESSIONS`. Tests: validation and seat counting as pure functions.
- **A2. Host login + applicants.** `/host` password login (Task 7's `fl_host` cookie, moved earlier). `/host/[slug]/applicants` replaces the public `/admin` (delete it): tabs 새 신청 / 입금 대기 / 확정 / 보류·취소; detail with signed photo URLs; **지인 주의** when an avoid-name matches another non-cancelled applicant's name in the same event (normalize spaces/case); actions 확정→`awaiting_payment` (sets `payment_due`), 입금 확인→`confirmed` (creates invite token), 보류, 취소; each shows "메시지 복사". Test: avoid-name matching.
- **A3. Applicant status.** `/status/[token]`: real status, deposit box only in `awaiting_payment`, 신청 취소 (→ `cancelled`, only before `confirmed`; after that, show the refund rule and the contact email).
- **A4. Invite entry.** `/e/[slug]/join/[token]` checks the hash against a `confirmed` application, creates or finds the participant, sets the `fl_{eventId}` cookie, redirects to `/e/[slug]`. Task 7's `register` takes the application's gender/age/job; `recover` and PIN are removed; Task 8's consent text stays, the basic-info step loses gender/age/job.

**Change 2026-11-03 (user):** no seat picking. The 호 number is chosen at random among free numbers of that gender when the host presses 입금 확인 (`applications.number`, migration `0003_numbers.sql`), copied to `participants.number` at registration, cleared on cancel. Round 1 pairs equal numbers; men rotate from there. Task 9's `pickSeat` and SeatPicker are dropped; the host can still fix numbers (Task 11 `setSeat`).

**Deferred:** Resend emails (needs a sending domain), email magic-link lookup, Supabase keep-alive is still Task 14.

**Flag for the user:** Vercel Hobby is non-commercial; paid events need Vercel Pro ($20/mo) — Task 14 README already notes this.

## Superseded status (2026-10-31)

- The user chose **subagent-driven** execution. Building is **paused at the user's request** ("아직 디벨롭이 필요해서 나중에"). Resume from Task 1.
- **No Supabase for now. Deploy to Vercel only.** Revise the plan before starting:
  - Add a **preview mode** (user choice "가"): the whole event runs inside one browser.
    - The browser keeps state with a client-side `EventStore` persisted to `localStorage`.
    - The page reuses the same `commands.ts` and `views.ts` in the browser.
    - A role switcher (진행자 / 큰 화면 / 참가자 n명) lets one person rehearse the full flow.
  - Keep `supabaseStore.ts` and the broadcast code out until Supabase is connected. The `EventStore` interface stays, so plugging Supabase in later is a store swap.
  - Task 14 deploys to Vercel without the cron. Add keep-alive and retention back when Supabase is added.

## Global Constraints

- All UI is portrait-only and Korean-only. Write "남은 시간", never "remaining".
- Font: Pretendard Variable everywhere (`https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css`). The only exceptions are the rolling paper and the splash title, which use Nanum Pen Script.
- Timer and round digits: Pretendard weight 800, `font-variant-numeric: tabular-nums`.
- Colors: background `radial-gradient(120% 80% at 50% 30%, #2a2440 0%, #14121f 75%)`; rose gold `#e6b8a2` / `#c98a74`; lavender `#b4a7f2`; text `#f3e6dc`; muted text `#a99bb5`.
- Participant numbers always end in 호: "여1호", "남6호".
- Love type is shown as a real color only. Never show letters or a color name.
- Never include the line "너는? 꼭 되물어주기".
- The lounge app never shows contact info (the signup site collects phone/email for the host only). The match message reads exactly "진행자가 연락처를 직접 전해드릴 거예요."
- Nothing auto-advances. A timer reaching zero only shows a 종료 state.
- Defaults: round 15 min (`900` s), reveal at `420` s of un-paused elapsed time, max picks `3` (host sets 2 or 3), 15 questions on a 5-point scale.
- The participant API must never return, for anyone except the viewer:
  - age/job/area/MBTI/loveType, unless the minute-7 reveal rule passes;
  - note authors;
  - anyone else's choices;
  - pick counts.
- Monthly cost target is ₩0: Supabase free + Vercel Hobby. The daily cron keeps Supabase awake.

## Review Focus

1. **A participant refreshes or switches phones mid-round.** The timer, reveal state, and any unsent rolling-paper prompt must come back exactly. Views depend only on `Snapshot` + `now` (Task 6 test `view is a pure function of snapshot and now`).
2. **The host pauses across the 7-minute mark.** The reveal must wait for 7 minutes of *un-paused* time, and must stay revealed after the round closes even if it closed early (Task 3 tests).
3. **Uneven counts or empty tables.** The person without a partner sees a rest screen. "N번째 이성" counts only rounds that had a partner. "N명 중" counts seated opposite-sex people only (Task 3 + Task 6 tests).
4. **The host presses 다음 라운드 while someone is still writing.** That person's prompt stays until they submit or skip, and it appears before the new round's screen (Task 6 test `pending note survives next round`).
5. **The host moves the phase backwards by mistake.** No choices, notes, or rounds are lost, and going forward again restores the same state (Task 7 test `phase back and forth keeps data`).

---

## File Structure

```
src/
  lib/domain/
    types.ts          shared types (Snapshot, Participant, Round, ...)
    loveType.ts       questions, scoring, color index, palette, phrases, recommendation
    seating.ts        table/partner math, ordinal, sit-out
    timer.ts          elapsed (pause-aware), reveal reached, time-up
    reveal.ts         who may see whose private profile
    matching.ts       mutual matches
    notes.ts          contact-info filter, scatter layout
  lib/server/
    store.ts          EventStore interface
    memoryStore.ts    in-memory EventStore (tests)
    supabaseStore.ts  Supabase EventStore
    commands.ts       participant + host commands (validate → mutate store)
    views.ts          participantView / hostView / screenView (pure)
    auth.ts           token + PIN hashing, cookies, host password
    broadcast.ts      notify(eventId)
  lib/client/
    useLiveView.ts    fetch view + subscribe broadcast + clock offset
  components/
    Character.tsx  Splash.tsx  Timer.tsx  ColorOrb.tsx  RollingPaper.tsx  Phone.module.css ...
  app/
    layout.tsx  globals.css  page.tsx
    e/[slug]/page.tsx                 participant app (switches by view state)
    e/[slug]/*.tsx                    screens: Register, Lounge, Round, NoteWrite, Choice, Closing
    host/page.tsx  host/[slug]/page.tsx
    screen/[slug]/page.tsx
    api/e/[slug]/view/route.ts  api/e/[slug]/cmd/route.ts
    api/host/[slug]/view/route.ts  api/host/[slug]/cmd/route.ts  api/host/events/route.ts
    api/screen/[slug]/view/route.ts
    api/cron/daily/route.ts
supabase/migrations/0001_init.sql
public/characters/…  public/props/…  public/splash-couple.webp
tests/ (mirrors src/lib)
```

## Prerequisite (user action, before Task 5)

The user creates a Supabase project and puts these values in `.env.local`, and also in Vercel later: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `HOST_PASSWORD`, `CRON_SECRET`. Tasks 1–4 and 6–7 run without it.

---

### Task 1: Scaffold, design tokens, Character, Splash

**Files:**
- Create: the Next.js app (`create-next-app` with TS, App Router, `src/`, ESLint, no Tailwind), `vitest.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/Character.tsx`, `src/components/Character.module.css`, `src/components/Splash.tsx`, `src/components/Splash.module.css`, `public/characters/placeholder-{base,smile,blink}.webp`, `public/splash-couple.webp`
- Test: `tests/components/characterSrc.test.ts`

**Interfaces:**
- Produces:
  - `type Shape = 'cloud'|'mochi'|'drop'`
  - `type Prop = 'none'|'ribbon'|'flower'|'star'|'heart'|'crown'` (both exported from `src/lib/domain/types.ts`)
  - `characterSrc(shape: Shape, color: number, frame: 'base'|'smile'|'blink', hasAssets: boolean): string` → `/characters/{shape}/{color:02}-{frame}.webp`, or `/characters/placeholder-{frame}.webp` when `!hasAssets`
  - `<Character shape color prop size delay?: number />`
  - `<Splash minMs={1600} ready: boolean onDone />`
  - the `NEXT_PUBLIC_CHARACTER_ASSETS` env flag (`'1'` once Task 16 is done)

- [ ] **Step 1: Scaffold.** Run `npx create-next-app@15 . --ts --app --src-dir --eslint --no-tailwind --import-alias "@/*"`, then `npm i -D vitest` and `npm i @supabase/supabase-js`. Add the script `"test": "vitest run"`.
- [ ] **Step 2: Write the failing test** `tests/components/characterSrc.test.ts`:
  ```ts
  expect(characterSrc('drop', 7, 'smile', true)).toBe('/characters/drop/07-smile.webp')
  expect(characterSrc('cloud', 0, 'blink', false)).toBe('/characters/placeholder-blink.webp')
  ```
- [ ] **Step 3: Run `npm test`.** Expected: FAIL (module not found).
- [ ] **Step 4: Implement.**
  - `characterSrc`.
  - `Character`: three stacked `<img>`. The body breathes (`scale(1.035,.965)` at 50%, 3.6 s, `transform-origin: 50% 92%`). The smile/blink layers are masked to the face with `mask-image: radial-gradient(42% 22% at 50% 40%, #000 70%, transparent 100%)`. Smile opacity keyframes go 0 → 1 at 50–85% over 7 s; blink goes 1 at 92–95% over 4.6 s. `delay` offsets all three. The prop is an `<img>` from `/props/{prop}.webp`, positioned by `PROP_ANCHOR[shape] = {x:%, y:%, w:%}`. Starting values: cloud `{x:62,y:6,w:30}`, mochi `{x:60,y:10,w:30}`, drop `{x:58,y:2,w:28}`. While no assets exist, use the placeholder plus `filter: hue-rotate(color*22deg)`.
  - Placeholder frames: download from the Higgsfield URLs in `anim-compare.html` and convert to 384 px WebP.
  - `splash-couple.webp`: download job `54867cda-4cbd-46a9-9aed-8bb5b514fb2d` (URL in `splash-v2.html`) and convert to WebP.
  - `Splash`: match `splash-v2.html` A. The title is "플러팅<br>라운지" at 76px/0.92 in Nanum Pen Script with the rose-gold shimmer. Add 16 twinkling stars, the illustration below the title, and the loading bar. Call `onDone` once `ready` and `minMs` have both elapsed.
  - `page.tsx` (`/`): Splash, then the text "초대 링크로 들어와 주세요".
- [ ] **Step 5: Verify.** `npm test` → PASS. `npm run build` → success. Then run `npm run dev`, open `/` at 390×844, and confirm the splash matches the mockup.
- [ ] **Step 6: Commit** `feat: scaffold app, design tokens, character and splash`.

### Task 2: Love type — questions, scoring, color, recommendation

**Files:**
- Create: `src/lib/domain/types.ts` (start it here), `src/lib/domain/loveType.ts`
- Test: `tests/domain/loveType.test.ts`

**Interfaces:**
- Produces:
  - `QUESTIONS: {text: string; axis: 0|1|2|3; reversed: boolean}[]` (15 items: spec §5 text verbatim; axes 거리감=0 for #1–4, 표현=1 for #5–8, 데이트=2 for #9–11, 미래=3 for #12–15; reversed #3, #7, #10, #14)
  - `normalize(answers: number[]): number[]` (reversed → `6-a`)
  - `loveType(answers: number[]): number` (0–15)
  - `PALETTE: string[16]`
  - `phrases(type: number): [string, string, string, string]`
  - `recommend(me: {id: string; answers: number[]}, others: {id: string; number: number; answers: number[]}[]): string | null`

**Bit rules:**
- Each axis is the mean of its normalized answers. `mean >= 3` means pole A (bit 0); otherwise pole B (bit 1). An exact 3 goes to pole A.
- `type = d<<3 | e<<2 | t<<1 | f` (d = 거리감, e = 표현, t = 데이트, f = 미래).

**Palette** (families: bits 3–2; shade: bits 1–0):

```ts
['#B8435E','#D46A82','#E895A8','#F4BFCB', '#7E4A8C','#9C6BB0','#BB93CC','#D9BDE6',
 '#C2603F','#DB835F','#EBA584','#F5C9AE', '#3F6E9E','#5E8FC0','#86B0D8','#B5D2EE']
```

**Phrases** (A / B per axis):
- 거리감: "자주 연락하며 곁에 있고 싶어요" / "각자의 시간도 소중히 여겨요"
- 표현: "마음은 바로바로 표현해요" / "천천히, 은근하게 다가가요"
- 데이트: "둘만의 아늑한 데이트가 좋아요" / "함께 새로운 곳을 걷는 게 좋아요"
- 미래: "함께할 미래를 그려보는 게 좋아요" / "지금 이 순간에 집중해요"

- [ ] **Step 1: Write the failing tests:**
  ```ts
  test('all 5s → type with reversed items flipped', () => expect(loveType(Array(15).fill(5))).toBe(0))
  // all 5 → axis means: 거리감 (5+5+1+5)/4=4 → A; 표현 4 → A; 데이트 (5+1+5)/3≈3.67 → A; 미래 4 → A
  test('all 1s → 15', () => expect(loveType(Array(15).fill(1))).toBe(15))
  test('exact 3 goes to pole A', () => expect(loveType(Array(15).fill(3))).toBe(0))
  test('palette has 16 distinct colors', () => expect(new Set(PALETTE).size).toBe(16))
  test('recommend picks smallest euclidean distance on normalized answers, tie → lower number', () => {
    const me = {id:'m', answers:Array(15).fill(4)}
    expect(recommend(me, [{id:'a',number:2,answers:Array(15).fill(1)},{id:'b',number:5,answers:Array(15).fill(4)},{id:'c',number:1,answers:Array(15).fill(4)}])).toBe('c')
  })
  test('recommend with no others → null', () => expect(recommend({id:'m',answers:Array(15).fill(3)}, [])).toBeNull())
  ```
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** with the signatures above.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: love type scoring, palette, recommendation`.

### Task 3: Seating, timer, reveal

**Files:**
- Create: `src/lib/domain/seating.ts`, `src/lib/domain/timer.ts`, `src/lib/domain/reveal.ts`; extend `types.ts`
- Test: `tests/domain/seating.test.ts`, `tests/domain/timer.test.ts`, `tests/domain/reveal.test.ts`

**Decision (from spec §4.4, fixed here):** a participant's 호 is their **initial table number**. Women stay at table `n`. Man `n` sits at table `((n-1 + r-1) mod T) + 1` in round `r` (1-based), where `T = event.tableCount`.

**Interfaces:**
- Produces, in `types.ts`:
  - `Round {no: number; startedAt: number; pausedAt: number|null; pausedTotalMs: number; durationSec: number; closedAt: number|null}` (ms epoch)
  - `Seated {id: string; gender: 'F'|'M'; number: number}`
- Produces, in seating:
  - `tableOf(p: Seated, round: number, T: number): number`
  - `partnerOf(p: Seated, round: number, T: number, seated: Seated[]): Seated | null`
  - `pairs(round: number, T: number, seated: Seated[]): {table: number; F: Seated|null; M: Seated|null}[]`
  - `ordinal(p: Seated, round: number, T: number, seated: Seated[]): number` (rounds 1..round that had a partner)
- Produces, in timer:
  - `elapsedMs(r: Round, now: number): number`. Formula: `(closedAt ?? pausedAt ?? now) - startedAt - pausedTotalMs`, clamped to `[0, durationSec*1000]`.
  - `isTimeUp(r, now): boolean`
  - `REVEAL_MS = 420_000`
  - `revealReached(r, now): boolean`
- Produces, in reveal:
  - `canSee(viewerId: string, targetId: string, rounds: Round[], T: number, seated: Seated[], now: number): boolean`. True iff some round has viewer and target as partners and `revealReached`.

- [ ] **Step 1: Write the failing tests:**
  ```ts
  // seating, T=7
  expect(tableOf({id:'m6',gender:'M',number:6}, 3, 7)).toBe(1)   // host mockup: table1 = 여1호/남6호 in round 3
  expect(tableOf({id:'f2',gender:'F',number:2}, 5, 7)).toBe(2)
  // uneven: 7 women, 6 men, T=7 → each round exactly one woman has partner null; ordinal skips that round
  // ordinal: woman 7 with men 1..6 seated, T=7: round1 partner? man at table7 in r1 is man7 (absent) → null; ordinal(f7, 2) === 1
  // timer
  const r = {no:1,startedAt:0,pausedAt:null,pausedTotalMs:0,durationSec:900,closedAt:null}
  expect(elapsedMs(r, 1_000_000)).toBe(900_000)               // clamped
  expect(revealReached({...r,pausedTotalMs:60_000}, 450_000)).toBe(false) // 390s un-paused
  expect(revealReached({...r,pausedAt:300_000}, 999_999)).toBe(false)     // paused at 5:00
  expect(revealReached({...r,closedAt:430_000}, 2_000_000)).toBe(true)    // stays revealed after close
  expect(revealReached({...r,closedAt:400_000}, 2_000_000)).toBe(false)   // closed before 7 min → never
  // reveal
  test('canSee only for partners after 7 min, persists across later rounds', ...)
  test('canSee false for same-table people in a round that ended at 6 min', ...)
  ```
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** with the signatures above.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: seating rotation, pause-aware timer, reveal rule`.

### Task 4: Matching, note filter, paper layout

**Files:**
- Create: `src/lib/domain/matching.ts`, `src/lib/domain/notes.ts`
- Test: `tests/domain/matching.test.ts`, `tests/domain/notes.test.ts`

**Interfaces:**
- `mutualMatches(choices: {fromId: string; toId: string}[], me: string): string[]`
- `containsContact(text: string): boolean`. It catches:
  - phone numbers: `/01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/`
  - any run of 7 or more digits after stripping spaces and dashes
  - (case-insensitive) `카톡|카카오|kakao|open\.kakao|인스타|insta|instagram|텔레그램|telegram|라인\s?id|line\s?id`
  - `@[a-z0-9_.]{3,}`
- `NOTE_MAX = 200`
- `layoutNotes(ids: string[]): {id: string; xPct: number; yPct: number; rotDeg: number; sizePx: number; ink: string}[]`. Deterministic, seeded from the ids.
  - Place notes in a jittered grid of `ceil(sqrt(n))` columns.
  - `xPct` and `yPct` stay within 6–80.
  - `rotDeg` ∈ [-9, 9], `sizePx` ∈ [17, 24].
  - `ink` comes from `['#7a2638','#24345e','#5b3a24','#4b2a63']`.

- [ ] **Step 1: Write the failing tests:**
  ```ts
  expect(mutualMatches([{fromId:'a',toId:'b'},{fromId:'b',toId:'a'},{fromId:'a',toId:'c'}], 'a')).toEqual(['b'])
  expect(mutualMatches([{fromId:'c',toId:'a'}], 'a')).toEqual([])            // one-way never leaks
  for (const t of ['010-1234-5678','01012345678','카톡 abc12','@my.insta','인스타 놀러와요']) expect(containsContact(t)).toBe(true)
  for (const t of ['오늘 정말 즐거웠어요 :)','마라톤 3번 완주 멋져요','7시에 시작했죠']) expect(containsContact(t)).toBe(false)
  const a = layoutNotes(['x','y','z']); expect(a).toEqual(layoutNotes(['x','y','z']))  // deterministic
  a.forEach(n => { expect(n.xPct).toBeGreaterThanOrEqual(6); expect(n.xPct).toBeLessThanOrEqual(80) })
  ```
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** with the signatures above.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: mutual matching, contact filter, paper layout`.

### Task 5: Database schema + EventStore (memory + Supabase)

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `src/lib/server/store.ts`, `src/lib/server/memoryStore.ts`, `src/lib/server/supabaseStore.ts`; finish `src/lib/domain/types.ts`
- Test: `tests/server/memoryStore.test.ts`

**Interfaces:**
- Types (`types.ts`):
  - `Phase = 'before'|'talk'|'choice'|'closing'`
  - `EventRow {id, slug, title, startsAt: string, venue, notice: string, phase: Phase, tableCount: number, roundDurationSec: number, maxPicks: 2|3, recommendationOpen: boolean, resultsOpen: boolean, screenKey: string, createdAt: string}`
  - `Participant {id, eventId, gender, nickname, age: number, job, area, mbti, keywords: string[], answers: number[], loveType: number, shape: Shape, prop: Prop, number: number|null, excluded: boolean, tokenHash: string, pinHash: string, consentAt: string, createdAt: string}`
  - `Note {id, eventId, fromId, toId, round: number, body: string|null /* null = skipped */, hidden: boolean, createdAt}`
  - `Choice {eventId, fromId, toId}`
  - `GameCard {id, kind: 'balance'|'talk'|'scenario', prompt: string, options: string[]|null, active: boolean}`
  - `GameSession {id, eventId, round: number, table: number, cardId: string, answers: Record<string, string>, closed: boolean}`
  - `Snapshot {event: EventRow; participants: Participant[]; rounds: Round[]; notes: Note[]; choices: Choice[]; sessions: GameSession[]; cards: GameCard[]}`
- `EventStore`. Every method is async:
  - `createEvent(e: Omit<EventRow,'id'|'createdAt'>): EventRow`
  - `getEventBySlug(slug): EventRow|null`
  - `listEvents(): EventRow[]`
  - `updateEvent(id, patch: Partial<EventRow>)`
  - `snapshot(eventId): Snapshot`
  - `insertParticipant(p: Omit<Participant,'id'|'createdAt'>): Participant`
  - `updateParticipant(id, patch)`
  - `findParticipantByTokenHash(eventId, h): Participant|null`
  - `findParticipantsByNickname(eventId, nickname): Participant[]`
  - `upsertRound(eventId, r: Round)`
  - `insertNote(n: Omit<Note,'id'|'createdAt'>): Note`
  - `updateNote(id, patch)`
  - `replaceChoices(eventId, fromId, toIds: string[])`
  - `upsertSession(s: GameSession)`
  - `upsertCard(c: GameCard)`
  - `listCards(): GameCard[]`
  - `deleteEventsCreatedBefore(iso: string): number` (cascade)
  - `ping(): void`
- Constraints (enforced in **both** stores):
  - unique `(eventId, gender, number)` where `number is not null and not excluded`, which throws `SeatTakenError`;
  - unique `(eventId, fromId, toId, round)` on notes;
  - unique `(eventId, round, table)` on open sessions.

- [ ] **Step 1: Write the failing tests** `tests/server/memoryStore.test.ts`: create event → insert two women → set both to `number:1` → the second throws `SeatTakenError`; `snapshot` returns everything inserted; `deleteEventsCreatedBefore` removes an old event and its children and returns 1.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement `memoryStore.ts`.** Then write `0001_init.sql`:
  - tables `events`, `participants`, `rounds`, `notes`, `choices`, `game_cards`, `game_sessions`, all `on delete cascade` from events;
  - snake_case columns;
  - the partial unique index `participants(event_id, gender, number) where number is not null and not excluded`;
  - `alter table … enable row level security` on every table with **no policies** (the anon key gets nothing).

  Then implement `supabaseStore.ts` with a service-role client (`auth: {persistSession: false}`), mapping snake_case ⇄ camelCase. Map Postgres error `23505` on the seat index to `SeatTakenError`.
- [ ] **Step 4: Run `npm test`.** Expected: PASS. Then apply the migration (`npx supabase link` + `npx supabase db push`, or paste it into the dashboard SQL editor). Check with `node -e` and the anon key: `select` on `participants` returns 0 rows or a permission error.
- [ ] **Step 5: Commit** `feat: schema, RLS lockdown, event store`.

### Task 6: Views (privacy core)

**Files:**
- Create: `src/lib/server/views.ts`
- Test: `tests/server/views.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5.
- Helpers:
  - `seated(s: Snapshot): Seated[]` (number set and not excluded)
  - `currentRound(s): Round|null` (highest `no`)
- `PublicCard {id, gender, number: number|null, shape, prop, keywords: string[]}` (no color in public cards, because the lounge shows only character + keywords)
- `PrivateProfile {age, job, area, mbti, color: string, phrases: string[4]}`
- `participantView(s: Snapshot, meId: string, now: number): ParticipantView` with these fields:
  - `serverNow: number`
  - `phase`
  - `event: {title, startsAt, venue, notice}`
  - `me: Participant without tokenHash/pinHash + {color, phrases}`
  - `lounge: PublicCard[]` (everyone not excluded)
  - `tables: {count: number; takenBySameGender: number[]}`
  - `round: null | {no, total: number /* = tableCount */, timer: Round, partner: PublicCard|null, ordinal: number, oppositeCount: number, partnerProfile: PrivateProfile|null}`
  - `met: Record<participantId, PrivateProfile>` (all ids where `canSee`)
  - `game: null | {sessionId, card: GameCard, myAnswer: string|null, partnerAnswer: string|null /* only after both answered */}`
  - `pendingNote: null | {round: number; to: PublicCard}`
  - `choice: null | {max: number; picks: string[]; candidates: PublicCard[]}` (phase `'choice'` or `'closing'`; candidates = seated opposite gender)
  - `paper: null | {notes: {id, body}[]}` (phase `'closing'`, `!hidden`, `body !== null`, author omitted)
  - `result: null | {matches: PublicCard[]}` (only if `resultsOpen`)
  - `recommendation: null | 'pending' | PublicCard` (`'pending'` until `recommendationOpen`; computed among seated opposite gender, or among registered opposite gender if nobody is seated yet)
- `pendingNote` rule: the lowest round `r` such that:
  - I had a partner in `r`, and
  - `r` is closed **or** `isTimeUp(r, now)`, and
  - no note exists from me for `r`, and
  - phase is `'talk'`, or phase is `'choice'` and it is the last round.
- `hostView(s, now)`: everything. Plus:
  - `pairs` for the current round
  - `choicesByPerson`
  - `matches: [idA, idB][]`
  - `notes` with authors
  - `restingIds`
- `screenView(s, now)`:
  - phase, round no / total, timer, `serverNow`
  - `pairs` as `{table, F: PublicCard|null, M: PublicCard|null}`
  - `resting: PublicCard[]`
  - `lounge: PublicCard[]`
  - `choiceProgress: {done: number; total: number}`
  - no matches

- [ ] **Step 1: Write the failing tests** (build snapshots with a small `makeSnapshot()` fixture in the test file: 7 women, 7 men, seated, T=7):
  ```ts
  test('before minute 7 partnerProfile is null and JSON contains no partner age/job', () => {
    const v = participantView(s, 'f1', start + 400_000); expect(v.round!.partnerProfile).toBeNull()
    expect(JSON.stringify(v)).not.toContain(partner.job)
  })
  test('after minute 7 partner profile appears, other men stay hidden', ...)       // JSON lacks other men's jobs
  test('met profiles persist into later rounds and choice phase', ...)
  test('view is a pure function of snapshot and now', () => expect(participantView(s,'f1',t)).toEqual(participantView(structuredClone(s),'f1',t)))
  test('pending note survives next round', ...)   // round 1 closed, round 2 started, no note → pendingNote.round === 1
  test('skipped note (body null) clears pending', ...)
  test('paper hidden until closing; never includes fromId', ...)
  test('result absent until resultsOpen; never includes who picked me or counts', ...)  // one-way pick → matches []
  test('sit-out: woman without partner gets round.partner null and ordinal unchanged', ...)
  test('oppositeCount counts seated, non-excluded opposite gender only', ...)
  test('no tokenHash/pinHash anywhere in participant or screen view', ...)
  ```
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** with the signatures above.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: role views with privacy rules`.

### Task 7: Commands, auth, API routes, live updates

**Files:**
- Create: `src/lib/server/commands.ts`, `src/lib/server/auth.ts`, `src/lib/server/broadcast.ts`, `src/lib/server/getStore.ts`, `src/lib/client/useLiveView.ts`, `src/app/api/e/[slug]/view/route.ts`, `src/app/api/e/[slug]/cmd/route.ts`, `src/app/api/host/events/route.ts`, `src/app/api/host/[slug]/view/route.ts`, `src/app/api/host/[slug]/cmd/route.ts`, `src/app/api/screen/[slug]/view/route.ts`
- Test: `tests/server/commands.test.ts`, `tests/server/auth.test.ts`

**Interfaces:**
- `auth.ts`:
  - `newToken(): string` (32 bytes base64url)
  - `hash(s: string): string` (sha256 hex)
  - participant cookie `fl_{eventId}` (httpOnly, sameSite lax, 120 days)
  - host cookie `fl_host` (an HMAC of `HOST_PASSWORD`, 12 h)
  - `requireHost(req): void`
  - `requireParticipant(req, store, event): Participant` (throws `401`)
- Participant commands: `runParticipantCmd(store, event, me: Participant|null, cmd, now): Promise<{ok: true; token?: string} | {ok: false; code: string}>`. `cmd` is a discriminated union on `type`:
  - `register {gender, nickname, age, job, area, mbti, keywords, answers, shape, prop, pin, consent: true}`. Validation:
    - nickname 1–12 chars;
    - age 19–60;
    - mbti matches `/^[EI][NS][FT][JP]$/i`;
    - 1–2 keywords, each ≤ 15 chars;
    - exactly 15 answers in 1..5;
    - pin is `/^\d{4}$/`;
    - `consent === true`.

    Computes `loveType`. Returns a `token`.
  - `updateProfile {…same minus consent/pin}` (only while phase `'before'`)
  - `recover {nickname, pin}` (returns a fresh token; the old token is replaced)
  - `pickSeat {table}` (phase `'before'`, `1..tableCount`; on `SeatTakenError` → `code 'seat_taken'`)
  - `drawCard {kind}` (needs an active round and a partner; picks a random active card of that kind not used at this table in this event; closes any open session)
  - `answerCard {sessionId, answer}` (≤ 100 chars)
  - `closeCard {sessionId}`
  - `submitNote {round, body: string|null}`:
    - must match the current `pendingNote`;
    - `body` is trimmed, 1..`NOTE_MAX`;
    - `containsContact` → `code 'contact_info'`.
  - `setChoices {ids}`:
    - phase `'choice'`;
    - `ids.length <= maxPicks`;
    - all ids seated opposite gender.
- Host commands: `runHostCmd(store, event, cmd, now)` with these `type`s:
  - `setPhase {phase}`. Any phase in any direction. Entering `'choice'` or `'closing'` closes an open round. Nothing else is deleted.
  - `nextRound`:
    - closes the current round (`closedAt = now`; resumes first if paused);
    - starts round `no+1` with `durationSec = event.roundDurationSec`;
    - with no rounds, starts round 1;
    - refuses when `no === tableCount` (`code 'last_round'`).
  - `pause`
  - `resume` (`pausedTotalMs += now - pausedAt`)
  - `updateSettings {tableCount?, roundDurationSec?, maxPicks?, title?, startsAt?, venue?, notice?}`
  - `setSeat {participantId, number: number|null}`
  - `exclude {participantId, excluded}`
  - `openRecommendation`
  - `openResults`
  - `hideNote {noteId, hidden}`
  - `upsertCard {card}`
- `createEvent` lives in `POST /api/host/events`. It takes `{title, startsAt, venue, notice}` and gives:
  - a random 8-char slug and `screenKey`;
  - defaults `tableCount: 7`, `roundDurationSec: 900`, `maxPicks: 3`.
- Every successful command calls `notify(eventId)`. `broadcast.ts` sends on channel `event:{eventId}`, event `changed`, payload `{at}`, via `supabase.channel(...).httpSend` or the REST broadcast endpoint.
- `GET` view routes return the Task 6 views. The screen route needs `?k=screenKey`.
- `useLiveView<T>(url: string): {view: T|null; offsetMs: number; send(cmd): Promise<Result>}`:
  - fetches on mount, on each broadcast `changed` (anon key subscribe), on window focus, and every 15 s;
  - `offsetMs = view.serverNow - Date.now()` at fetch time.

- [ ] **Step 1: Write the failing tests** (memory store + fixed `now`):
  ```ts
  test('register validates and returns token; loveType stored', ...)
  test('register rejects missing consent / bad pin / 14 answers', ...)
  test('pickSeat twice same table same gender → seat_taken; different gender OK', ...)
  test('nextRound closes current, starts next, refuses past tableCount', ...)
  test('pause then resume adds paused time', ...)
  test('submitNote rejects contact info and wrong round; accepts null as skip', ...)
  test('setChoices enforces maxPicks and opposite gender, only in choice phase', ...)
  test('phase back and forth keeps data', ...)        // choices + notes count unchanged after choice→talk→choice
  test('recover with nickname+pin issues new token; old token no longer resolves', ...)
  test('drawCard needs a partner; resting participant gets code no_partner', ...)
  ```
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** commands and auth, then the routes. `getStore()` returns the Supabase store, or the memory store when `process.env.FL_MEMORY === '1'` (local UI work without Supabase).
- [ ] **Step 4: Run `npm test`.** Expected: PASS. Then, with `npm run dev` and Supabase env set:
  1. `curl -X POST /api/host/events` with the host cookie → slug.
  2. `GET /api/e/{slug}/view` without a cookie → `401`.
- [ ] **Step 5: Commit** `feat: commands, auth, API routes, live view hook`.

### Task 8: Participant entry, registration flow

**Files:**
- Create: `src/app/e/[slug]/page.tsx`, `src/app/e/[slug]/Register.tsx`, `src/app/e/[slug]/register.module.css`, `src/components/ColorOrb.tsx`, `src/components/ScaleInput.tsx`

**Behavior (match `prereg.html`):**
- `page.tsx` shows `<Splash>` until the first view (or the 401) arrives.
- **401 + phase `before`** → event info (title, startsAt, venue, notice text, "등록하기") → Register.
- **401 + another phase** → Register as well (a walk-in) plus a small "이미 등록했어요" link to the nickname + PIN recovery form.
- **Register steps:**
  0. Consent (required checkbox). Text: "수집 항목: 닉네임, 성별, 나이, 직업, 사는 곳, MBTI, 키워드, 연애관 응답 · 목적: 행사 진행 · 보관: 행사 후 30일 뒤 자동 삭제".
  1. Basic info, with the note "나이·직업·사는 곳·MBTI는 대화 7분째, 맞은편 상대에게만 보여요." Add a 4-digit PIN field: "다른 기기로 들어올 때 필요해요".
  2. 15 questions, one per screen; tapping advances; "← 이전"; progress "6 / 15"; dot sizes 34/26/20/26/34; end labels "전혀 아니에요" / "완전 그래요".
  3. Result: `ColorOrb(PALETTE[type])` plus four phrase lines, no text naming the color. The recommendation box shows "모두 등록하면 알려드릴게요 ✦".
  4. Character: three shapes in my color (grid of 3), then prop chips (없음 + 5) with a live preview; "등록 완료" → `register` → set cookie → view.
- Registered + phase `before` → `ProfileEdit` reuses steps 1/4 (`updateProfile`).
- **Tests:** none new (UI). The logic is covered in Tasks 2 and 7.

- [ ] **Step 1: Build the screens** with `FL_MEMORY=1 npm run dev`.
- [ ] **Step 2: Verify.**
  - Complete a registration at 390×844.
  - Reload: you land in the registered state, not Register.
  - Clear cookies and use "이미 등록했어요" with nickname + PIN: you get back in.
  - A wrong PIN shows "닉네임 또는 PIN이 맞지 않아요".
- [ ] **Step 3: Commit** `feat: participant entry and registration`.

### Task 9: Lounge and seat picking

**Files:**
- Create: `src/app/e/[slug]/Lounge.tsx`, `src/app/e/[slug]/SeatPicker.tsx`, CSS modules

**Behavior (match `lounge-mix.html`):**
- The header shows title, time, and headcount.
- Characters float with keywords only. "나" is larger. Delays are staggered by index.
- Bottom card: my `ColorOrb` + phrases.
- Recommendation line: "당신과 가장 비슷한 사람은 {n}호분이에요!" once open (its number shows only after seating).
- Phase `before`: "내 자리 고르기" opens `SeatPicker`, a rectangle where the right column has tables 1..⌈T/2⌉ top→bottom and the left column has the rest bottom→top. Taken tables are disabled. My table shows "여{n}호". Changing seat is allowed while phase is `before`.
- In other phases the lounge is also the fallback screen when there is no active round.

- [ ] **Step 1: Build the screens.**
- [ ] **Step 2: Verify** with two browsers (two cookies): picking the same table as a same-gender participant shows "이미 선택된 자리예요". The other browser updates within about 1 s (broadcast).
- [ ] **Step 3: Commit** `feat: lounge and seat picking`.

### Task 10: Round screen and rolling-paper writing

**Files:**
- Create: `src/app/e/[slug]/Round.tsx`, `src/components/Timer.tsx`, `src/app/e/[slug]/NoteWrite.tsx`, `src/app/e/[slug]/Rest.tsx`, CSS modules

**Behavior (match `host-and-round-v2.html` phone + `paper-and-choice.html` screen 1):**
- **Priority:** if `view.pendingNote`, show `NoteWrite` first.
- **NoteWrite:**
  - partner character + "{gender}{n}호에게 한마디";
  - a cream textarea in Nanum Pen Script with a 200-char limit and a counter;
  - notices "익명으로 전달돼요" and "연락처는 적을 수 없어요";
  - "남기기" / "건너뛰기";
  - `contact_info` → an inline message "연락처로 보이는 내용이 있어요".
- **Round:**
  - "Round {no}" and the chip "{ordinal}번째 이성 · {oppositeCount}명 중";
  - `Timer` ring showing "남은 시간" `mm:ss`, computed locally from `timer` + `offsetMs` with `requestAnimationFrame` at 1 Hz, Pretendard 800 tabular;
  - partner card: character, "{n}호", keywords. Before 7:00 it shows "나이 · 직업 · 사는 곳 · MBTI는 7분째에 공개돼요". Once `partnerProfile` exists, the grid appears with the "✦ 방금 공개" chip and orb + phrases. The client refetches when local elapsed crosses 420 s;
  - at time up the ring shows "종료".
- **Rest** (partner null): "이번 라운드는 쉬어가요" + timer.
- "✦ 같이 해보기" button → Task 12 sheet (render the button now, wire it in Task 12).

- [ ] **Step 1: Build the screens.**
- [ ] **Step 2: Verify** with memory store and a host curl to `nextRound`:
  - the timer counts down identically in two browsers;
  - after 7:00 (temporarily set `roundDurationSec`/`REVEAL_MS` via `updateSettings` to 60/… for testing, then restore) the profile appears only on the partner's phone;
  - pressing next round while NoteWrite is open keeps NoteWrite.
- [ ] **Step 3: Commit** `feat: round screen, timer, rolling paper writing`.

### Task 11: Host controls and big screen

**Files:**
- Create: `src/app/host/page.tsx` (password login + event list + create form), `src/app/host/[slug]/page.tsx`, `src/app/screen/[slug]/page.tsx`, `src/components/FloorPlan.tsx`, CSS modules

**Behavior:**
- **Host controls** (phone width, buttons only here). It shows:
  - the phase stepper (시작 전 · 대화 · 최종선택 · 마무리, tappable);
  - "라운드 시작" / "다음 라운드 → (남자 이동)", 일시정지/재개;
  - settings for 라운드 시간 (12/15/custom), 테이블 수, 최종선택 인원 (2/3), and 행사 정보;
  - the seat list with `setSeat` / `exclude`;
  - "추천 공개" and "결과 공개";
  - result tables: each person's picks, and **매칭 커플 목록** ("여2호 ♥ 남5호", with nicknames for the host);
  - rolling-paper moderation (author → recipient, body, 숨기기);
  - the participant link and screen link (`/screen/{slug}?k=…`) with copy buttons.
- **Big screen** (portrait, no buttons, match `host-and-round-v2.html`):
  - phase, "Round n / N", a big timer, a progress bar with a "7분 · 정보 공개" mark, `FloorPlan` (right column 1..⌈T/2⌉ top→bottom, left column the rest bottom→top, each table with two character faces + "여1호 / 남6호"), resting people, and "→ 남자는 시계방향으로 한 칸씩 ↻";
  - phase `before`: the lounge view of all characters;
  - phase `choice`: "선택 중 {done}/{total}";
  - phase `closing`: a calm "오늘 함께해 주셔서 고마워요" with characters. Never show matches.

- [ ] **Step 1: Build the screens.**
- [ ] **Step 2: Verify:**
  - a wrong host password is rejected;
  - the screen URL with a bad `k` returns 404;
  - with 14 memory participants seated, pressing 다음 라운드 shifts every man one table clockwise on the floor plan within about 1 s;
  - pause freezes the timer on both screen and phones.
- [ ] **Step 3: Commit** `feat: host controls and big screen`.

### Task 12: Pair games

**Files:**
- Create: `src/app/e/[slug]/GameSheet.tsx`, `supabase/seed/cards.sql`, `src/lib/server/seedCards.ts` (same data for memory store), host card editor section in `src/app/host/[slug]/page.tsx`
- Test: `tests/server/seedCards.test.ts`

**Interfaces:**
- Consumes: `drawCard`, `answerCard`, and `closeCard` from Task 7, plus `view.game`.
- `SEED_CARDS: Omit<GameCard,'id'>[]`

**Behavior:**
- Transcribe every item from `docs/reference/printed/03.png` (밸런스게임 vol.2), `05.png` (밸런스게임), and `06.png` (연애 토크 + 시나리오):
  - balance cards: 2 options;
  - talk cards: `options: null` (free answer ≤ 100 chars);
  - scenario cards: options if the print has them, otherwise null.
- Drop any "너는? 꼭 되물어주기" line.
- Sheet flow:
  1. pick kind (밸런스 / 토크 / 시나리오);
  2. both phones show the same card;
  3. answer;
  4. "상대를 기다리는 중…";
  5. both answers side by side;
  6. "다른 카드" or "닫기".

  The sheet can be dismissed at any time.

- [ ] **Step 1: Write the failing test:**
  ```ts
  expect(SEED_CARDS.length).toBeGreaterThan(20)
  expect(SEED_CARDS.some(c => /되물어/.test(c.prompt))).toBe(false)
  SEED_CARDS.filter(c => c.kind==='balance').forEach(c => expect(c.options).toHaveLength(2))
  ```
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement.** Transcribe the cards, build the sheet, and add the host card editor (list, toggle active, add/edit).
- [ ] **Step 4: Verify.** `npm test` → PASS. In two browsers at one table, the partner's answer is hidden until both have answered. A resting participant does not see the button.
- [ ] **Step 5: Commit** `feat: optional pair games with seeded cards`.

### Task 13: Final choice, results, rolling paper sheet

**Files:**
- Create: `src/app/e/[slug]/Choice.tsx`, `src/app/e/[slug]/Closing.tsx`, `src/components/RollingPaper.tsx`, CSS modules

**Behavior (match `paper-and-choice.html` screens 2–5):**
- **Choice:**
  - a 3-column grid of `candidates` (character, "{n}호", keyword);
  - tapping a person I have `met` shows their PrivateProfile in a small sheet;
  - a selected cell gets the rose-gold glow + ♥ and the counter "{k} / {max}";
  - picks beyond max are blocked with a gentle shake;
  - "선택 완료" → `setChoices` (editable until the phase changes); 0 picks is allowed.
- **Closing:**
  - before `resultsOpen`: "결과는 진행자가 곧 공개해요" + "내 롤링페이퍼 보기";
  - after: for each match, two characters with ♥, "{gender}{n}호님과 매칭되었어요", and "진행자가 연락처를 직접 전해드릴 거예요.";
  - with no matches: "이번엔 인연이 닿지 않았어요" + "내 롤링페이퍼 보기".
- **RollingPaper:**
  - a cream textured sheet with notes placed by `layoutNotes` in Nanum Pen Script, each with its own ink, rotation, and size;
  - small hearts in the gaps;
  - footer "{n}장 · 누가 썼는지는 비밀이에요";
  - empty state "아직 도착한 마음이 없어요".

- [ ] **Step 1: Build the screens.**
- [ ] **Step 2: Verify.** In memory mode, run 2 women and 2 men:
  - A↔B pick each other and C picks A;
  - after 결과 공개, A sees only B, and C sees "이번엔 인연이 닿지 않았어요";
  - nobody's screen or network response mentions C's pick of A (check the DevTools response JSON).
- [ ] **Step 3: Commit** `feat: final choice, match results, rolling paper sheet`.

### Task 14: Daily cron and deploy

**Files:**
- Create: `src/app/api/cron/daily/route.ts`, `vercel.json`, `README.md` (setup + env + deploy)
- Test: `tests/server/cron.test.ts`

**Interfaces:**
- `runDaily(store, now): Promise<{deleted: number}>`:
  - calls `store.ping()`;
  - deletes events whose `startsAt` is more than 30 days before `now` (fall back to `createdAt` if `startsAt` is invalid).
- The route requires `Authorization: Bearer ${CRON_SECRET}`.
- `vercel.json`: `{"crons":[{"path":"/api/cron/daily","schedule":"0 18 * * *"}]}` (03:00 KST).

- [ ] **Step 1: Write the failing test:** an event starting 31 days ago is deleted, an event 29 days ago is kept, and the result is `{deleted: 1}`.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** `runDaily`, the route, `vercel.json`, and the README (Supabase setup, migration, seed, env vars, Vercel deploy; note that Hobby is non-commercial and Pro is $20/mo when events are paid).
- [ ] **Step 4: Verify.**
  - `npm test` → PASS.
  - `npm run build` → success.
  - After deploying (the user connects the repo to Vercel and sets env), `curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/daily` → `{"deleted":0}`.
  - Without the header → `401`.
- [ ] **Step 5: Commit** `feat: daily keep-alive and 30-day retention cron, deploy docs`.

### Task 15: Character assets (Higgsfield)

**Files:**
- Create: `public/characters/{cloud,mochi,drop}/{00..15}-{base,smile,blink}.webp`, `public/props/{ribbon,flower,star,heart,crown}.webp`, `scripts/assets.md` (prompts + job ids)

**Approach:**
- Model `gpt_image_2_5`, quality `medium`, 1:1, `background: transparent`.
- References:
  - expression media `a50f82a4-27cf-4e5f-8313-d0e0d945b81f`;
  - texture media `d2160e40-9eab-439c-a7b4-4d0b9c88ac7b`;
  - the approved base job `c5870948-e1e2-4037-9350-7ee812c94549` for style.
- For each shape:
  1. Generate a base in color `#E895A8` and get user sign-off on the 3 shapes **before** making the rest. Shapes: cloud = the current puffy cloud; mochi = a smooth round rice-cake body; drop = a soft water-drop body with a rounded point on top. All are 2-head-ratio with stubby arms and legs and the same eyes.
  2. For the other colors, pass that base as a reference with the prompt "identical character, recolor body to {hex}".
  3. For smile/blink, use edit prompts on each base (the same wording as in `anim-compare.html`).
- Props: separate small transparent objects in the same glossy jelly/rose-gold style.
- Convert everything to 384 px WebP (quality 82).
- Check alignment: the alpha bbox of each blink/smile frame is within 6 px of its base. Regenerate any frame that fails.
- Budget: about 0.25 credits per image × (144 + 5 + retries) ≈ 40 credits.

- [ ] **Step 1: Generate** the 3 shape bases, show them to the user, and wait for approval.
- [ ] **Step 2: Generate** the rest in batches of 12 (`generate_image_batch` → `jobs_wait`), then download and convert.
- [ ] **Step 3: Verify.** Run a script check that all 149 files exist and the bbox drift is ≤ 6 px. Set `NEXT_PUBLIC_CHARACTER_ASSETS=1` and confirm that the lounge, seat picker, and big screen render real characters with props anchored correctly on all 3 shapes. Adjust `PROP_ANCHOR` if needed.
- [ ] **Step 4: Commit** `feat: character and prop assets`.

### Task 16: Full-event rehearsal

**Files:**
- Create: `scripts/rehearsal.ts` (uses the memory store + commands + views to simulate 7 women / 6 men end to end)
- Test: `tests/rehearsal.test.ts`

- [ ] **Step 1: Write the failing test.** It drives a full event:
  1. 13 registrations;
  2. seats;
  3. 7 rounds via `nextRound`, with time advanced 15 min each (pausing 1 min in round 2), drawing and answering one card in round 3, and writing or skipping notes;
  4. `choice`, picks, `closing`, `openResults`.

  Then assert:
  - every man met every woman except via the empty table;
  - each woman had exactly one rest round;
  - `met` sizes are correct;
  - each participant's paper count equals the notes addressed to them minus hidden ones;
  - matches equal the mutual picks;
  - `JSON.stringify` of all 13 participant views contains no other person's `pinHash`, `tokenHash`, or note `fromId`.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL until the wiring is complete, then PASS.
- [ ] **Step 3: Do a manual pass on the deployed app** with 3 real phones + 1 laptop screen: splash → register → seat → 2 short rounds (set 2 min) → choice → closing.
- [ ] **Step 4: Commit** `test: full event rehearsal`. Update the `CLAUDE.md` Status section with the commands (`npm run dev`, `npm test`, `FL_MEMORY=1 npm run dev`, `npx supabase db push`).
