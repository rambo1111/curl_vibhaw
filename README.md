# 🌟 VIBHAW ASCII Animation

A vibrant, terminal-based ASCII animation that streams epic visuals right into your terminal — powered by **Cloudflare Workers**, so it's always instant, no cold starts.

```
curl vibhaw.vibhawspark.workers.dev
```

---

## ✨ Features

- **Retro boot-up sequence** — feels like an old-school terminal coming to life
- **Animated VIBHAW letters** — each letter spells out one by one with pulsing colors
- **Rainbow finale** — the full VIBHAW logo in cycling rainbow waves
- **Bouncing mode** — the logo bounces around the terminal with fading trails
- **Matrix rain background** — green falling katakana characters (cyberpunk vibes)
- **Particle explosions** — burst of particles on every wall bounce
- **Glitch effects** — random character glitches for that corrupted-terminal feel

---

## 🚀 Run it

No installation needed:

```bash
curl vibhaw.vibhawspark.workers.dev
```

---

## 🛠 Tech Stack

- **Cloudflare Workers** — edge deployment, zero cold starts, global CDN
- **Pure ANSI escape codes** — no libraries, just raw terminal control sequences
- **ES Modules** — standard modern JavaScript

---

## 💻 Run Locally

```bash
git clone https://github.com/rambo1111/curl_vibhaw.git
cd curl_vibhaw
npm install -g wrangler
wrangler dev
```

Then in another terminal:

```bash
curl http://localhost:8787
```

---

## 🌐 Deploy Your Own

1. [Sign up for Cloudflare Workers](https://workers.cloudflare.com) (free)
2. Create a new Worker in the dashboard
3. Paste `worker.js` into the editor
4. Deploy

Your URL will be `https://YOUR_WORKER_NAME.YOUR_SUBDOMAIN.workers.dev`

---

## 📜 License

Unlicensed — public domain. Use, modify, and share freely.
