Read CLAUDE.md, docs/frontendStructureGuide.md, docs/plan/06-build-order.md and docs/designs/README.md.

We're on milestone 1: Foundation. Goal: an empty app shell in the new brand.
- Restructure the project to the folder layout in CLAUDE.md. Leave old features alone for now unless they block the build; list anything you move or delete.
- Brand tokens as role-named CSS variables in src/app/globals.css (from docs/designs/README.md), wired into Tailwind v4. Fonts via next/font.
- Base UI in src/components/ui: Button, Input, Dialog, Drawer, Toast, built on Radix through shadcn.
- App shell layout in src/components/layouts: sidebar (Dashboard, Projects, Settings), top bar (Create button, user menu), collapsing on phone.

Explain your plan and the decisions in it first, and wait for my approval before writing code.
