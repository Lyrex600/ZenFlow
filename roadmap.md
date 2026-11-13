# ZenFlow roadmap

- [x] Redesign: aurora design system, 3D hero/breath/focus scenes, landing sections (FR)
- [x] Local encrypted vault (AES-256-GCM, PBKDF2 600k), lockout, auto-lock, security center
- [x] App tabs: pause guidée, Pomodoro + focus mode, alarmes, sons, stats, profil, paramètres
- [ ] Visual verification of landing + app flow in the browser
- [ ] Real accounts (email + password, server-side auth), profiles table + signup trigger, RLS, is_admin()
- [ ] Login events (IP, user agent, time) recorded server-side after sign-in; consent line on signup
- [ ] Online status visible to admins only
- [ ] /admin dashboard: users table (search/sort), detail panel with login history, disable account (server-side)
- [ ] Seed admin account (admin@gmail.com) server-side, never in client code
- [ ] Update privacy/FAQ/landing copy to match what is actually stored server-side
