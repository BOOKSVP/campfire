# Dailies

*An investor pitch. August 2026.*

---

## The problem, as it actually feels

Picture a good team — small, senior, distributed. A designer in Lisbon, two engineers in London, a founder in San Francisco, an ops lead somewhere over the Atlantic most weeks. They're excellent at their jobs. And every single day, each of them loses a little time and a little peace of mind to the same low-grade question: *what is everyone else actually doing?*

The tools they already own don't answer it. Slack tells you who is typing, not who is progressing. Linear tells you what the tickets say, which is not the same as what happened. The daily standup — the ritual invented to answer exactly this question — is the worst offender of all: for a distributed team it means someone dials in at 6am, everyone performs a status update they half-remember, and the whole thing evaporates the moment the call ends. Fifteen minutes times six people times five days is seven and a half person-hours a week, spent producing information that is stale by lunchtime and stored nowhere.

So teams drift. Not dramatically — nobody notices drift while it's happening, that's what makes it drift. The designer polishes a flow the engineers quietly descoped on Tuesday. The founder writes an investor update from memory and misses the best thing that shipped that month. A new hire spends their first two weeks asking "what's everyone working on?" one person at a time, because the answer isn't written down anywhere.

The information exists. Everyone on that team could tell you what they did today — in about four sentences, without preparation. The problem has never been that people don't know what they're doing. The problem is that no tool has made it *effortless enough to say*, and no tool has done anything *intelligent* with what was said.

That's the whole thesis. Capture has to cost almost nothing, and the intelligence has to live in the software — not in the discipline of the user.

## What Dailies is

Dailies is a Mac app that lives in your menu bar. It does two things, and it does them with a kind of stubborn simplicity.

**It gives your team one keystroke to say what's happening.** Hit the hotkey from inside any app and a small panel floats up — the Spotlight of "what are you doing?" You type a sentence and press Enter. That's the entire interaction. *"Kicking off deep work on the pricing page."* *"Migration's done — took the whole morning, but it's clean."* *"Blocked on the legal review, switching to onboarding emails."* Post as many entries a day as suits you, or as few. One is enough.

And here is the design decision we believe matters most: **there is only one kind of entry.** Earlier versions of this idea — ours included — asked the user to choose at the moment of capture: is this a *status* ("what I'm doing right now") or a *log entry* ("something that happened today")? It seems like a small question. It isn't. Any decision placed between the thought and the Enter key is friction, and friction is the reason every standup bot and status tool eventually goes quiet. So we removed the question entirely. You just say what's happening. Dailies works out the rest.

**It turns those entries into ambient awareness and durable memory.** When you post an entry, an AI layer reads it and decides what it means. If it's something you're doing *now* — "heads down on the release" — your live status updates, visible to the whole team at a glance, and it gracefully expires when the moment passes. If it's color, context, or a postscript — "that call went better than expected" — it doesn't touch your status; it simply joins the quiet record of your day. You never think about this. You never file anything. You talk; the software sorts.

Then, at the end of each day, Dailies does the thing no human ever keeps up with: it writes the diary. It reads everything you posted — the fragments, the corrections, the 4pm frustration and the 6pm victory — and composes a clean, readable summary of your day. Your teammates see that summary, not your raw stream. And above the individual summaries sits one more: **the team's day, written up as a whole.** What moved, what shipped, what's stuck, who's blocked. The standup, held after the fact, attended by no one, missed by no one.

**And it arrives when you want it.** This matters more than it sounds. Some people want the team summary as a wind-down read at nine in the evening; some want it with coffee the next morning, so the person waking up in Lisbon reads what San Francisco did overnight. Some want a nudge at 5pm if they haven't posted anything today; some find nudges insufferable and will post on their own rhythm, thank you. Dailies treats all of this as personal settings, not policy — when you're reminded, whether you're reminded, and when your summary lands are each yours to choose. The product has opinions about capture (it must be instant) and none about your schedule.

That's the loop. One keystroke to speak. One glance to see. One summary to remember. The team stays close without a single meeting, and the company accrues something almost no company has: a searchable, truthful, day-by-day record of what actually happened.

## Why this works when the alternatives haven't

The async-standup category is not empty — Geekbot, Standuply, Range, Status Hero and others have sold into it for years, which tells you the demand is real. But look at how they all work: a Slack bot interrogates you on a schedule ("What did you do yesterday? What will you do today? Any blockers?"), or a web dashboard asks you to fill in a form. They are questionnaires. They put the structure on the human — answer these three fields, at this time, in this format — and humans quite reasonably stop.

Dailies inverts the responsibility. The human does the one thing humans are naturally good at — saying what's happening, in their own words, at the moment it's happening — and the software does everything humans are bad at: classifying, remembering, summarizing, and delivering at the right time to each person. The AI doesn't generate your work or speak in your place; your words stay yours. It's the librarian, not the author.

There's a second inversion, just as deliberate: Dailies is **native and instant, not another tab.** The incumbents live inside Slack or a browser. Dailies lives in the menu bar, summoned by a keystroke, gone in seconds — the same wedge that let Raycast, Linear, and Superhuman take on categories that looked settled. Speed is not a feature of the product; it *is* the product. If capture takes ten seconds, people do it for years. If it takes forty-five and a context switch, they stop within a month, and the tool's graveyard already exists to prove it.

And a third: what Dailies accumulates *compounds.* A Slack status evaporates. A standup evaporates. But six months of daily summaries is an asset — performance reviews stop being archaeology, investor updates half-write themselves, post-mortems have primary sources, and the new hire's first-week question is answered by reading, not by interrupting five people. Every week of use makes the product more valuable to that team and harder to leave. That's the retention story, and it's also the moat: the switching cost of Dailies is your company's memory.

We're equally clear about what Dailies is **not**, because discipline is what keeps the capture cost at zero. It is not chat — no threads, no replies, no read-receipt anxiety; the moment it grows comments it's a worse Slack. It is not project management — Dailies reports the work, Linear tracks it. And it is emphatically not surveillance — no activity timers, no manager-only views, nothing measured that wasn't freely said. Everyone sees the same fire. The name Campfire was the right instinct: people share warmth around it; nobody is being watched through it.

## Where we actually are

We didn't start with a deck; we started with a running system and a team using it.

The predecessor is **Campfire**, a deliberately primitive team status board — a static page, a hotkey, one line per person — that our own team, ARTSVP, has used daily. Primitive was the point: it proved, with real usage rather than user interviews, that the core behavior exists. People *will* post one honest line about their work, unprompted, indefinitely — if and only if it costs them seconds. It also taught us the ideas we've kept (statuses that expire are honest; the glanceable roster beats any feed; the hotkey is sacred) and it hit the exact ceiling that tells us what to build next: no real accounts, no way for a second team to join, notifications that die with a browser tab, and no intelligence anywhere in the loop.

The next foundation is already built and measured. The **Dailies API** — accounts with email-code sign-in, teams with speakable invite codes, entries, live statuses, daily digests — runs today, in this repository, with a test suite that walks the entire journey from signup to team summary. We built it as an experiment in radical lightness, and the results came back better than we hoped: the entire backend is **372 lines in a single file with zero external dependencies**, cold-starts in about a tenth of a second, and answers requests in well under a millisecond. Infrastructure cost for our first hundred teams rounds to a restaurant bill. This is not an accident of prototyping; it is the engineering culture the product demands. A tool whose pitch is "faster than the meeting it replaces" cannot be slow, and a company at our stage shouldn't spend a dollar of capital or an hour of attention on infrastructure drama.

What's in active build is the piece the concept deserves: the **native Mac app** (SwiftUI, menu-bar resident, idling in tens of megabytes — not an Electron shell pretending to be small) and the **intelligence layer** — entry classification, the end-of-day personal summary, the team reel, each delivered on the reader's own schedule. The classification and summarization are, by design, the *easy* kind of AI: short, factual, first-person text in, short factual summaries out, at pennies per team per day. No hallucination surface to speak of — the AI never says anything your team didn't say first.

## The horizon

**Near — the habit.** Ship the Mac app to ARTSVP and a handful of friendly teams. Streaks — a quiet 🔥 next to people who've written every day, because the habit deserves a mirror, never a leaderboard. Blockers surfaced automatically: when your entry sounds stuck, the summary says so, prominently, because "who is blocked" is the single most valuable sentence any standup ever produced. A Slack delivery of the team summary — which is also, not incidentally, a daily advertisement for Dailies inside every customer's Slack.

**Mid — the surfaces.** The one-keystroke panel is a philosophy, not a form factor, and it should exist everywhere work happens: a command-line client for the terminal-dwellers, an iPhone app that is ninety percent capture-panel-and-summary, reply-by-email for the teammate who lives in their inbox. Same API underneath — it was built for this. Then the integrations that make capture cheaper still: Dailies noticing your merged pull requests and closed issues and *drafting* an entry for you to approve. Drafting, never posting — the day it speaks in your voice uninvited is the day trust dies, so it won't.

**Far — the memory.** Once a company's daily truth accumulates in one place, the questions it can answer grow almost embarrassing in their value. *What happened with the pricing project, start to finish?* *Write the first draft of this month's investor update.* *What was everyone doing the week before the launch slipped?* *Catch me up — I was on leave for two weeks.* This is where Dailies graduates from a habit into infrastructure: the query layer over a company's own history, built from words its own people chose to write. Nobody owns this today. The company that does will be very hard to displace, for the same reason nobody re-types their company's history into a competitor.

## The business

Dailies is sold the way it spreads: **by the team.** It's useless alone and indispensable together, which means every convinced individual recruits their whole team just to make their own copy work — the invite unit is the sale. Free for tiny teams to let the habit take root; a per-member subscription where the AI does the remembering — summaries, blockers, digests, and eventually the memory queries that no one else can answer. The expensive parts of the business are deliberately absent: the infrastructure rounds to zero, the AI costs pennies and only runs over a few kilobytes of text per team per day, and the marketing flywheel — a useful daily summary posted into the customer's own Slack — ships as a feature.

## Why now, and why us

Distributed work stopped being an experiment years ago; what never arrived was the connective tissue — the thing that replaces the ambient awareness an office gave away for free. The first wave of async tools failed on friction: they asked humans to do the structuring. It is only in the last couple of years that the structuring became something software genuinely does well — reading a handful of plain sentences and reliably producing the status, the summary, and the signal. The capture insight is old. The intelligence to deserve it is new. Dailies is the first product built on both.

And we're the right ones to build it for an unglamorous reason: we are the user. We run a distributed team, we felt the drift, we built the primitive version, and we've watched it get used every day since — long past the point where novelty explains it. The concept is validated, the foundation is running and measured, and the build plan for the rest is specified down to the endpoint. What remains is execution on a product whose every design principle we've already proven on ourselves.

One keystroke to speak. One glance to see. One summary to remember.

**Dailies. The team, in its own words.**
