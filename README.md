# Souffle Focus Zen

Build "ZenFlow — Focus. Breathe. Flow." a premium French-language (fr) focus & wellbeing web app, a full redesign of an existing single-file app. Goal: an exceptional, award-level visual result with real 3D, polished motion, and strong security. React + TypeScript + Tailwind + shadcn/ui, plus three, @react-three/fiber, @react-three/drei, framer-motion (lazy-load the 3D chunk).

## DESIGN DIRECTION
- Dark-first "aurora" look, with a working light theme toggle (persisted). Base #070a0f, panels glassmorphic (blur, 1px hairline borders rgba(140,170,210,.14)), accents teal #36e2c4 and blue #4aa8ff, warn #ffb454, danger #ff5d6c, good #4ee19a. Soft gradient mesh + subtle film grain + vignette.
- Typography: Space Grotesk (display, tight tracking, huge hero 96px) + Inter (body). Generous spacing, 18px radii, glow hover states, magnetic buttons, optional custom cursor (user-toggleable, off on touch devices).
- Motion: scroll progress bar, staggered section reveals, count-up stats, parallax hero, animated gradient borders on cards, smooth page transitions. Respect prefers-reduced-motion everywhere (fall back to static).
- Fully responsive, mobile menu with animated hamburger, accessible (focus rings, aria, contrast AA, keyboard nav).

## 3D (react-three-fiber)
1. Hero: a luminous breathing orb (distorted icosahedron/sphere with fresnel + teal→blue gradient shader) surrounded by ~2000 floating particles and 3 slow orbiting rings (echoing the logo: three concentric rotating rings). Reacts to pointer (tilt/parallax) and to scroll (camera dolly, orb morph).
2. Pause guidée / breathing: the same orb scales in sync with the breathing phases (Inspire 4s, Retiens 4s, Expire 6s; presets 4-7-8, box 4-4-4-4, 5-5), with phase label and progress ring.
3. Focus mode (fullscreen Pomodoro): calm 3D particle field slowly drifting, big timer, quote carousel, no distractions.
4. Performance: Suspense + lazy canvas, dpr capped at 1.75, frameloop="demand" when off-screen, automatic low-quality fallback (fewer particles, no postprocessing) on mobile/low-end or prefers-reduced-motion, plus a static CSS gradient fallback if WebGL is unavailable.

## LANDING PAGE (sections, keep all original copy in French)
Nav (logo with 3 rotating rings, links Fonctionnalités / Comment ça marche / Pourquoi / FAQ, theme toggle, Connexion, Commencer). Hero: pill "Chiffrement local AES-256 · 100% privé", title "Reprends le contrôle de ton attention.", subtitle, two CTAs, scroll hint. Features (6 cards): Pause guidée, Focus Pomodoro, Alarmes & rappels, Sons d'ambiance (8 paysages synthétisés en direct: pluie, océan, forêt, feu, vent, ruisseau, orage, bruit blanc), Statistiques (7 jours), 100% privé. How it works (01 Choisis un cycle, 02 Entre dans le flow, 03 Respire & recommence). Why (Moins de bruit, Plus de constance, Vraiment à toi). Stats strip with count-up. Testimonials (3, fictional, clearly generic). FAQ accordion (6 Q&A; rewrite the answers so they are truthful about the new security model below). Final CTA "Prêt à entrer dans le flow ?". Footer.

## APP (after login, tabbed dashboard with animated sidebar/tab bar)
- Pause guidée: presets 1/3/5/10 min, circular progress, start/reset, chime at end.
- Focus Pomodoro: configurable focus/break minutes, presets 15/5, 25/5, 50/10, 90/15, fullscreen focus mode with pause/skip/exit, inspirational French quotes, session logging.
- Alarmes & rappels: add/toggle/delete, Web Audio chime + toast + Notification API (ask permission).
- Sons d'ambiance: 8 procedurally synthesized soundscapes via Web Audio API (no audio files), per-sound toggle, mixable, master volume.
- Statistiques: focus minutes, sessions, breaks, streak, 7-day bar chart (recharts), reset button with confirm.
- Profil: edit name, export data (JSON), delete account with confirm.
- Paramètres: theme, custom cursor, chime, toasts, auto-start next phase, quotes toggle, export, reset stats.
- DROP the old "Panneau admin" entirely (no admin role, no credential viewer).

## SECURITY (critical, this is a key requirement)
The old app wrongly stored plaintext passwords (plainPass), POSTed passwords to /api/register, hardcoded an admin password in the client, and had a "reveal credentials" admin tool. NONE of that may exist. Implement instead:
- Local-first encrypted vault: data encrypted with AES-256-GCM, key derived from the user's passphrase via PBKDF2-SHA256 (>=600,000 iterations, random 16-byte salt, random 12-byte IV per write) using Web Crypto. The password/key is NEVER stored, logged, or sent anywhere; derived key lives only in memory and is wiped on logout.
- Login verification = successful decryption of the vault (no password hash stored beside it). No network request ever contains credentials. No telemetry, no analytics, no remote calls except fonts self-hosted.
- No password recovery by design; instead offer an encrypted backup export/import (.zenflow file) and a clear warning at signup. Explain this honestly in the FAQ.
- Brute-force protection: progressive lockout (exponential delay after failed attempts, persisted), generic error messages.
- Auto-lock after configurable inactivity (default 10 min) and on tab hidden option; lock screen.
- Password rules + live strength meter (zxcvbn-style heuristics, min length 10, block very common passwords).
- XSS hardening: never use dangerouslySetInnerHTML or innerHTML with user data; sanitize/validate all inputs with zod; strict Content-Security-Policy meta (default-src 'self', no inline eval, worker/blob only if needed), referrer no-referrer, X-Content-Type-Options, frame-ancestors none via meta where possible.
- Clipboard/paste safety, autocomplete attributes correct (new-password/current-password), password field show/hide toggle.
- Security center page in Paramètres showing the real protections active (encryption, auto-lock, lockout state, last unlock) and a "Verrouiller maintenant" button.
- Honest copy everywhere: the site must not claim anything it doesn't do.

Do NOT enable a database or auth backend for now (local-first). Make the code clean, typed, componentized, with a design-token system in tailwind config / CSS variables. Ship a polished, bug-free first version.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/885aa9b4-fe2c-4a76-bb90-78c33970e88e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
