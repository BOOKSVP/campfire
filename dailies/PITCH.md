# Dailies — the pitch

*A concept and build recommendation for the team behind Campfire. Written as an outside consultant's brief for the CEO, CTO, and CMO. August 2026.*

---

## What you've already proven with Campfire

Before pitching anything new, credit where due: Campfire, tiny as it is, has already validated the hard part.

You built a status board with **no backend, no signup, no auth** — a static page on GitHub Pages, Supabase as the database, and a Raycast extension so posting a status is a single ⌘\ away. Five people at ARTSVP use it. The lessons buried in that little repo are worth more than most product decks:

1. **The magic is capture speed.** The ⌘\ hotkey — post a status from anywhere on your Mac without switching context — is the killer feature. Everything that works about Campfire flows from the interaction being under ten seconds.
2. **The glanceable roster is the product.** One screen, five faces, one line each. Nobody "checks" Campfire; they glance at the menu bar. That's the right consumption model for ambient team awareness.
3. **Statuses that expire are honest.** "In a meeting til 3pm" that quietly lapses is better than a stale status lying to everyone. Time-scoped truth is a genuinely good idea most big tools don't have.
4. **You hit the ceiling of no-backend.** No auth means anyone with the (public) anon key can post as anyone. Teammates are added by running SQL. Notifications only work while a browser tab is open. The Raycast extension hardcodes user IDs in a JSON file that drifts from the database. None of this is fixable client-side — you've extracted all the value that architecture had to give.

Campfire is a successful experiment that is now asking to become a product. That product is Dailies.

---

## The concept

**Dailies is a Mac app for asynchronous teams: one glance to see what everyone's doing, one keystroke to say what you're doing.**

Two atoms, both learned from Campfire:

- **The status** — "what I'm doing *right now*." One line, optionally expiring. Ambient presence for people who don't share an office. *(Campfire already does this.)*
- **The daily** — "what happened *today*." A few lines at day's end: what shipped, what's stuck, what's next. The standup, without the meeting. *(This is the new atom, and the one the branch name has been promising.)*

Statuses are ephemeral; dailies accumulate. The status answers "can I interrupt Mike?"; the daily answers "what did the team actually do this week?" Together they replace the two worst meetings in a distributed company: the morning standup and the "wait, what's everyone working on?" sync.

### Why "dailies"

The name comes from film. At the end of each shooting day, the crew gathers to watch the *dailies* — the raw footage from that day. No editing, no polish, just "here's what we got." It's how a distributed crew (camera, sound, directing, editing — all working apart) stays confident they're making the same movie.

That's precisely the job here. An async team is a film crew: everyone's shooting their own scenes, and without a nightly reel, drift is invisible until it's expensive.

### Why it's worth doing

**For the team using it** (the honest version):

- **It kills the standup.** A 15-minute daily standup for 6 people is 7.5 person-hours a week — and for a team spread across time zones, it's 7.5 person-hours *at someone's 6am*. Dailies makes the same information available on everyone's own clock.
- **It compounds.** Slack statuses evaporate; standup notes die in someone's notebook. Dailies produces a searchable, per-person, per-team ledger of what actually happened. Six months in, "what did we do in March?" has an answer. Performance reviews, investor updates, and post-mortems all get easier as a side effect.
- **It respects attention.** No feed, no threads, no reactions-as-obligations. You write one entry, you glance at one screen. The app's success metric is *seconds per day*, not minutes.

**For you as a business** (the CMO's version):

- The category ("async standup") has known demand — Geekbot, Standuply, Range, Status Hero all sell into it — but every incumbent is *a bot bolted onto Slack* or *a heavyweight web dashboard*. Nobody owns "native, instant, lives in your menu bar." The Mac-first, keyboard-first wedge is the same wedge Raycast, Linear, and Superhuman used: win the people who care about speed, let them pull their teams in.
- Dailies has **built-in viral mechanics**: it's only useful with your team, so every convinced user recruits 3–8 more. The invite unit is a team, not a seat.
- The free experiment already ran: ARTSVP is the design partner, and the ⌘\ habit is proven. You are not guessing whether people will post one line a day; you've watched it happen.

### The core experience (v1)

**Signing up.** Download the app → type your email → type the 6-digit code we emailed you. No passwords, no OAuth dance. Create a team ("ARTSVP") and get a speakable invite code — `ember-x7k2q` — that you paste in Slack. Teammates enter it and they're in. Time from download to posted first entry: under two minutes.

**The glance.** A flame lives in your menu bar. Click it (or hit a hotkey): the roster. Each teammate: avatar, live status ("deep work til 2pm"), and today's daily if they've written it. Click a person to see their history, grouped by day — Today, Yesterday, Tuesday. This is Campfire's board, made native.

**The capture.** ⌘\ from anywhere summons a floating panel — the Spotlight of "what are you doing?" Type, Enter, gone. Toggle between *status* (one line, optional expiry) and *daily* (a few lines, Markdown). This must stay under ten seconds or we've failed.

**The nudge.** At 5pm (yours, not the founder's — time zones are the whole point), if you haven't written today's daily, one gentle native notification: "What happened today?" Click it, the capture panel opens pre-set to *daily*. One nudge, never two. Quiet on weekends and holidays and days off.

**The reel.** Each morning, the previous day's dailies from your whole team, assembled into one digest — in the app, and optionally by email for the folks who live in their inbox. You wake up in Lisbon and read what San Francisco did overnight, like the crew watching yesterday's footage.

### Features worth building next (in roughly this order)

1. **Streaks & gentle accountability.** A subtle "🔥 12" next to people who've posted daily. Never shame, no leaderboard emails — just the visible habit. (Cheap, and it's the retention mechanic.)
2. **Blockers as a first-class flag.** Mark a line in your daily as a blocker → it's highlighted in the digest and pings the team admin. The single highest-value signal in any standup.
3. **Weekly summaries.** An LLM pass over the week's dailies: "The team shipped X and Y; Z slipped for the second week; Grace is blocked on legal." This is the CEO/investor-update generator, and it's the feature people will pay for. (One API call over text you already store — trivially cheap to build once the data exists.)
4. **Slack digest webhook.** Post the morning reel into #team. Meets teams where they are, and it's free marketing inside every customer's Slack.
5. **More capture surfaces, same API:** the existing Raycast extension pointed at the new backend; a CLI (`dailies post "shipped the thing"`) for the terminal-dwellers; an iOS app that is 90% the capture panel and the reel; email-reply capture (reply to the digest email with your daily) for the least tool-inclined teammate on the team.
6. **Quiet integrations, later:** auto-draft your daily from your merged PRs and closed Linear issues; calendar-aware statuses ("in a meeting til 3" set automatically). Draft, never auto-post — the human voice is the product.

### What Dailies is not

Discipline is the moat, so write down the "no" list now:

- **Not chat.** No threads, no replies, no DMs. The moment Dailies grows comments, it's a worse Slack. (Emoji reactions, maybe, someday — they're read-receipts with warmth.)
- **Not project management.** No tasks, no assignees, no due dates. Dailies reports the work; Linear tracks it.
- **Not surveillance.** No "last active" timers, no screenshot nonsense, no manager-only views. Everyone sees the same roster. The tone is campfire, not panopticon — people share warmth around it, nobody's being watched through it.
- **Not a web-first dashboard.** The web view exists (read-only digest links, admin), but the product is the thing in your menu bar.

---

## How to build it

*The technical companion — stack experiment, results, API design, Mac app architecture, and a four-phase roadmap — is in [TECH.md](./TECH.md). The headline: we ran the "fastest, most lightweight API" experiment and the winner is a 372-line, zero-dependency Node + SQLite server that cold-starts in ~100ms and answers in under a millisecond. It's in this repo, running, with a test script that walks the entire user journey. The Mac app is a SwiftUI menu-bar app talking to it. Total v1 surface: one file of backend, one small native app, no frameworks, no Kubernetes, no drama.*

The build philosophy is the same as the product philosophy, and the same one Campfire already proved: **the fastest tool wins, and the lightest architecture ships fastest.**
