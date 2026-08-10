# 🔥 Dailies

The proposed evolution of Campfire: a Mac app for asynchronous teams — one glance to see what everyone's doing, one keystroke to say what you're doing.

- **[PITCH.md](./PITCH.md)** — the investor pitch: the problem, the single-entry concept (you post entries; AI infers your status and writes the end-of-day summaries), where the product stands today, and the horizon.
- **[TECH.md](./TECH.md)** — the build plan: the "fastest, most lightweight API" experiment and its results, the API contract, the single-entry intelligence layer, the Mac app architecture, and the roadmap.
- **[api/](./api/)** — the experiment itself: a working, zero-dependency Dailies API in a single file.

## Run the experiment

Requires Node ≥ 22 (SQLite is built into the runtime — there is nothing to install).

```bash
node dailies/api/server.mjs
```

Walk the full user journey (OTP signup → create team → invite → post entries/statuses → today view → digest → auth checks):

```bash
./dailies/api/test.sh
```

Without `RESEND_API_KEY` set, the API runs in dev mode and returns OTP codes inline in the response. Set `RESEND_API_KEY` (and `MAIL_FROM`) to send real sign-in emails.

## Numbers

| | |
|---|---|
| Backend | 372 lines, one file, **0 dependencies** |
| Cold start → first request | ~100 ms |
| Memory | ~67 MB RSS |
| Local request latency | ~0.6 ms |
