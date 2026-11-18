# Designs

The designs live on the Flowboard canvas (a claude.ai artifact). The `.dc.html` files here are copies for reference only. They run inside the canvas editor, not in this app, so read them for layout, spacing and copy; don't import them.

Done: landing (`landing.dc.html`), sign in (`signin.dc.html`), sign up (`signup.dc.html`). Still to design (milestone 0): everything else in `docs/plan/02-screens.md`.

## Brand
- Fonts: Bricolage Grotesque (headings; 500/700/800), Inter (body; 400/500/600)
- Cream (page) #FBF5EE · Cream 2 #F4EADF · Borders #EADFD3 / #D9C8B8 / #E2D4C6
- Espresso (ink, dark sections) #1E1512 · Espresso 2 #2A1F1A
- Text secondary #5A4A42 · Text muted #7A675D · Muted on dark #BFAEA3
- Vermilion (primary) #D23F27 · Vermilion dark #8E2614
- Lime (highlight) #D4F04A · Text on lime (secondary) #2E3A00
- Status chips (background / text): High #FBE1DA / #8E2614 · Medium #FFF0C2 / #7A5600 · Low #E3EEF9 / #1D4E86 · Done #E2F3E6 / #1E5B30
- Focus ring: 4px lime at 75% opacity
- Radii: inputs 14px, cards 18–28px, buttons pill
- Motion: words rise in on headings, stickers wiggle, a task card flips between states. Respect prefers-reduced-motion.
