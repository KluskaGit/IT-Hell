# 🎨 Style Guide — IT-Hell Frontend

Design tokens, color palette, typography, visual effects and CSS patterns used in the app. Complements the [main README](../README.md) and [`docs/features.md`](features.md).

## 📑 Table of contents

- [Design philosophy](#design-philosophy)
- [Color palette](#-color-palette)
- [Text grayscale](#-text-grayscale)
- [Typography](#-typography)
- [Spacing and radius](#-spacing-and-radius)
- [Shadows](#-shadows)
- [Glassmorphism](#-glassmorphism)
- [Glow effects](#-glow-effects)
- [Gradients](#-gradients)
- [Animations](#-animations)
- [Pill cards pattern](#-pill-cards-pattern)
- [Angular validation states](#-angular-validation-states)
- [Responsive breakpoints](#-responsive-breakpoints)
- [CSS encapsulation](#-css-encapsulation)

---

## Design philosophy

| Trait | Value |
|---|---|
| **Theme** | Light mode only (no dark mode) |
| **Main color** | Indigo (`#6366f1` / Tailwind `indigo-500`) |
| **Accent** | Violet (`#a855f7` / Tailwind `violet-500`) in gradients |
| **Font** | DM Sans → Inter → system fallback |
| **Locale** | `pl` (Polish date/separator formats) |
| **Aesthetic** | Glassmorphism (semi-transparent cards + backdrop-blur), soft shadows, animated glow in the background |
| **Typography** | Large, bold headings (font-weight 900), tight letter-spacing |
| **Micro-interactions** | Hover lift (`translateY(-5px)`), `fadeInUp` entry animations |
| **No** | UI libraries (Tailwind/Material/Bootstrap) — everything is hand-written CSS |

---

## 🎨 Color palette

### Indigo (brand primary)

The app's main color. Used in buttons, icons, active elements, focus rings.

| Token | Hex | Tailwind eq. | Used for |
|---|---|---|---|
| `--primary` | `#6366f1` | indigo-500 | Base accent color, icons, focus, pill checked |
| `--primary-hover` | `#4f46e5` | indigo-600 | Button hover |
| `--primary-dark` | `#4338ca` | indigo-700 | Darker submit-button background |
| `--primary-deep` | `#3730a3` | indigo-800 | Submit gradient end |
| `--primary-light` | `#eef2ff` | indigo-50 | Tag backgrounds, secondary-button hover |
| `--pri-ring` | `rgba(99,102,241,.16)` | — | Focus ring (semi-transparent indigo) |

### Violet (accent)

Used in gradients (`text-gradient` in the hero, combined with indigo).

| Token | Hex | Tailwind eq. |
|---|---|---|
| (inline) | `#a855f7` | violet-500 |
| (inline) | `rgba(139,92,246,0.06)` | violet-500/6% — bg-glow-2 |

### States (semantic colors)

| Token | Hex | Used for |
|---|---|---|
| `--success` | `#10b981` | CV success banner, save message |
| (inline) | `#ecfdf5` | Success banner background |
| (inline) | `#065f46` | Success text (dark green) |
| `--danger` | `#ef4444` | Errors, the "Remove" button |
| (inline) | `#fef2f2` | Errored input background |
| (inline) | `rgba(239, 68, 68, 0.15)` | Errored input focus ring |

---

## 🌑 Text grayscale

A 4-step scale based on Tailwind `slate-*`. All pages use the same shades.

| Token | Hex | Slate eq. | Used for |
|---|---|---|---|
| `--ink-1` | `#0f172a` | slate-900 | Main headings (`h1`, `h2`) |
| `--text-main` / `--ink-2` | `#1e293b` | slate-800 | Main text color, company names |
| `--ink-3` / `--text-sub` | `#475569` / `#64748b` | slate-600 / slate-500 | Metadata, captions, labels |
| `--text-muted` / `--ink-4` | `#94a3b8` | slate-400 | Placeholder, low-importance info |

### Background and borders

| Token | Hex | Used for |
|---|---|---|
| `--bg` | `#f8fafc` | Main page background (slate-50) |
| `--bg-mesh-1` | `#e0e7ff` | Pale indigo, background gradient |
| `--bg-mesh-2` | `#f1f5f9` | Pale gray, gradient middle |
| `--border` | `rgba(226, 232, 240, 0.8)` | Semi-transparent card border |
| `--b-lt` | `#e8edf5` | Border light (lines between elements) |
| `--b-md` | `#dde4f0` | Border medium |
| (inline) | `#cbd5e1` | Inputs, dropzone (slate-300) |

---

## ✍️ Typography

### Font stack

```css
font-family: 'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

> 💡 **DM Sans** is the display font used in headings. **Inter** is the fallback and body font. There is no Google Fonts import in the code yet — the fonts need to be added to `index.html` (TODO).

### Font scale (typical)

| Element | Size | Weight | Letter-spacing |
|---|---|---|---|
| Hero `h1` | `3rem` (48px) | `900` | `-1.5px` |
| Section `h2` | `1.5rem` (24px) | `800` | — |
| Card `h3` | `1.1rem` (17.6px) | `800` | — |
| Body | `1rem` (16px) | `400-500` | — |
| Subtitle / desc | `1.15rem` (18.4px) | `400` | — |
| Meta / label | `0.85rem` (13.6px) | `600-700` | — |
| Badge / pill | `0.8rem` (12.8px) | `700` | `0.05em` (uppercase) |
| Small | `0.75rem` (12px) | `500-600` | — |

### Weight hierarchy

```
font-weight: 400  → body text, descriptions
font-weight: 600  → labels
font-weight: 700  → badge, pill, metadata
font-weight: 800  → section titles (h2, h3)
font-weight: 900  → hero h1 (extremely bold)
```

### Letter-spacing

The hero uses **negative** letter-spacing (`-1.5px`) for a modern, premium look. Badges and uppercase sections use **positive** spacing (`0.05em`) for readability.

---

## 📐 Spacing and radius

### Border radii

| Token | Value | Used for |
|---|---|---|
| `--radius-lg` | `20px` | Cards (glass-card, main-card) |
| `--radius-md` | `12px` | Inputs, smaller elements |
| (inline) | `10px` | Form fields |
| (inline) | `50px` / `999px` | Pills, badges (pill shape) |
| (inline) | `50%` | Avatars, circles (success icon, company logo) |
| (inline) | `4px` / `6px` | Progress bar, salary track |

### Spacing

No global spacing variables — values are used directly in the components:

| Scale | Used for |
|---|---|
| `0.3rem` (5px) | Tight (between an icon and text in meta) |
| `0.5rem` (8px) | Default gap between inline elements |
| `0.75rem` (12px) | Input padding (top-bottom) |
| `1rem` (16px) | Standard gap between sections |
| `1.5rem` (24px) | Larger gap (between field groups) |
| `2rem` (32px) | Margin between form sections |
| `3rem` (48px) | Hero card / dropzone padding |

---

## 🌫️ Shadows

A 3-step scale:

| Token | Value | Used for |
|---|---|---|
| `--sh-xs` | `0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.02)` | Offer cards (at rest) |
| `--shadow-card` | `0 20px 40px -10px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)` | Glass-card, main-card |
| `--sh-md` | `0 8px 32px -6px rgba(99,102,241,.18), 0 2px 8px rgba(0,0,0,.04)` | Offer cards (hover) — **colored indigo shadow** |
| `--shadow-hover` | `0 28px 56px -12px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.04)` | Glass-card (hover) |

> 💡 **Trick:** shadows with a negative Y offset and a large spread (e.g. `-10px` in `--shadow-card`) give a soft, diffused effect — more natural than a classic `box-shadow: 0 4px 8px`.

> 💡 **Colored shadow:** offer cards on hover get an **indigo shadow** (`rgba(99,102,241,.18)`) instead of a black one. It subtly reinforces the brand color in the micro-interaction.

---

## 💎 Glassmorphism

The "milky glass" effect used in the main cards on `/profile` and `/offers`.

### Tokens

```css
--glass-bg: rgba(255, 255, 255, 0.72);  /* white background with 72% transparency */
--glass-blur: 16px;                      /* backdrop-filter blur */
```

### Implementation

```css
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));  /* Safari prefix */
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
```

> ⚠️ **Requirements:**
> - `backdrop-filter` doesn't work without a background behind it (needs `bg-glow` or a gradient on `:host`)
> - the `-webkit-` prefix is mandatory for Safari (up to iOS 17.x)
> - `border: 1px solid rgba(226, 232, 240, 0.8)` gives a subtle edge instead of a hard cut

### Where it's used

| Page | Element |
|---|---|
| `/profile` | `glass-card` (the main data and CV cards) |
| `/offers` | `.offer-card` with `--card: rgba(255,255,255,0.92)` |
| `/home` | NO — a plain white background (`rgba(255,255,255,0.95)`), lighter |

> 💡 **Design decision:** home is "light", profile and offers are "premium" (glassmorphism). Consistent but differentiated per context.

---

## ✨ Glow effects

Blurred background blobs used on every page as decoration.

### Implementation

```css
.background-glow {
  position: fixed;
  width: 100vw;
  height: 100vh;
  top: 0; left: 0;
  z-index: -1;
  background: var(--bg);
  overflow: hidden;  /* prevents a horizontal scrollbar */
}

.glow-1 {
  position: absolute;
  top: -10%; right: -5%;
  width: 50vw; height: 50vw;
  background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(255,255,255,0) 70%);
}

.glow-2 {
  position: absolute;
  bottom: -10%; left: -10%;
  width: 40vw; height: 40vw;
  background: radial-gradient(circle, rgba(79,70,229,0.08) 0%, rgba(255,255,255,0) 70%);
}
```

### Key traits

- **`position: fixed`** + `z-index: -1` → the background doesn't scroll with the page
- **`radial-gradient(circle, color 0%, transparent 70%)`** → soft edges, no hard transitions
- **`width/height: 50vw`** → the blobs scale with the viewport
- **Negative top/left** → partly hidden off-screen (more depth)

### Animated variant (`/profile`)

```css
@keyframes glowFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, -20px) scale(1.05); }
}

.glow-1 {
  animation: glowFloat 20s ease-in-out infinite alternate;
}
```

> 💡 Static glow (`/home`, `/offers`) is cheaper for the GPU. The animated version (`/profile`) sells a "WOW factor". The three blobs there use different durations and `alternate` / `alternate-reverse` to move out of sync for an organic feel.

---

## 🌈 Gradients

### Text gradient (hero)

```css
.text-gradient {
  background: linear-gradient(90deg, #6366f1, #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

**Used for:** highlighted words in `h1` (e.g. "wyższym poziomie" in the hero).

> ⚠️ Requires **all 4 rules** — Safari needs the `-webkit-*` prefixes, otherwise the text would be invisible (transparent).

### Background mesh (`/offers`)

```css
background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 55%, #fafbff 100%);
```

A 3-stop gradient at 135° — subtle, barely visible, adds depth without being loud.

### Submit button gradient

```css
background: linear-gradient(135deg, var(--primary-dark), var(--primary-deep));
```

Indigo → indigo deep, at an angle — a premium feel.

---

## 🎬 Animations

### Easing curve

```css
--ease: cubic-bezier(0.25, 0.8, 0.25, 1);  /* ease-in-out with a hold at the end */
```

Another one in use: `cubic-bezier(0.2, 0.8, 0.2, 1)` (springy).

### Entry (`fadeInUp`)

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-up {
  opacity: 0;  /* starts invisible */
  animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
.delay-3 { animation-delay: 0.3s; }
.delay-4 { animation-delay: 0.4s; }
```

**Waterfall pattern:** sections appear sequentially (hero → main-card → filters-form → feature cards).

> ⚠️ `forwards` is required — without it the element returns to `opacity: 0` after the animation ends.

### Hover lift (cards)

```css
.feature-card { transition: 0.3s; }
.feature-card:hover {
  transform: translateY(-5px);
  background: white;
  box-shadow: 0 10px 20px rgba(0,0,0,0.05);
}
```

### Radar sweep (CV animation)

```css
@keyframes radarSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.radar-sweep {
  animation: radarSpin 1.5s linear infinite;
}

.radar-sweep.radar-done {
  animation: none;
  opacity: 0;
}
```

### Pop-in (success checkmark)

```css
@keyframes popIn {
  0%   { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1);   opacity: 1; }
}
```

---

## 🔘 Pill cards pattern

The **"hidden checkbox" technique** — checkboxes/radios look like cards without JavaScript.

### Implementation

```html
<label class="pill-card">
  <input type="checkbox" [formControlName]="option.id">
  <span class="pill-content">Frontend Developer</span>
</label>
```

```css
.pill-card input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0; height: 0;  /* invisible BUT still in the tab order */
}

.pill-content {
  padding: 0.5rem 1.2rem;
  border: 1px solid #cbd5e1;
  border-radius: 50px;
  background: #ffffff;
  color: #475569;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s;
}

/* Checked state — CSS adjacent sibling */
.pill-card input:checked + .pill-content {
  border-color: var(--primary);
  background: #eef2ff;
  color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);  /* inner border without resizing */
}
```

### Why not `display: none` on the checkbox?

`display: none` removes the element from the **tab order** — keyboard navigation would stop working. `opacity: 0 + width/height: 0` hides it visually while keeping accessibility.

---

## ⚠️ Angular validation states

```css
/* Classes added automatically by Angular ReactiveForms */
input.ng-invalid.ng-touched,
select.ng-invalid.ng-touched {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
  background-color: #fef2f2;
}
```

> ⚠️ `!important` is required because the standard input styles (`border: 1px solid #cbd5e1`) have higher specificity.

| Class | Meaning |
|---|---|
| `.ng-touched` | The user touched the field (focus + blur) |
| `.ng-invalid` | A validator returned an error |
| `.ng-dirty` | The value was changed |

**Rule:** show the error **only** when `.ng-touched` AND `.ng-invalid` — without the first, the user would see an error before typing anything.

---

## 📱 Responsive breakpoints

The app uses a **mobile-first** mindset, but the breakpoints are standard:

| Breakpoint | Value | Tailwind eq. | What changes |
|---|---|---|---|
| Mobile | `< 640px` | `sm` | 1-column grids, smaller paddings |
| Tablet | `< 768px` | `md` | Hero h1 reduced to `2.2rem`, forms to 1 column, features-grid to 1 column |
| Tablet/down | `< 900px` | — | `/offers` switches to a vertical layout (sidebar on top, list below) |
| Desktop | `≥ 900px` | — | `/offers` full layout — sidebar + list side by side |

### Media query example

```css
@media (max-width: 768px) {
  .form-grid, .features-grid { grid-template-columns: 1fr; }
  .input-group.full-width    { grid-column: 1; }
  .hero-section h1           { font-size: 2.2rem; }
  .home-container            { padding-top: 100px; }
}
```

### Specific to `/offers`

| Element | Mobile (< 900px) | Desktop (≥ 900px) |
|---|---|---|
| Sidebar | Full-width, stacked on top (toggle hides it) | 240-480px, resizable by dragging |
| Offer list | Full width, scrolls with the page | To the right of the sidebar, own scroll |
| Workspace max-width | — | `1600px`, centered |

---

## 🔐 CSS encapsulation

Angular uses **Emulated View Encapsulation** by default — `_nghost-*` and `_ngcontent-*` attributes are added to selectors so a component's styles don't leak outside.

### `:host` as the component's `:root`

```css
:host {
  --primary: #6366f1;
  display: block;  /* inline by default — without this padding/margin don't work */
  font-family: 'DM Sans', sans-serif;
}
```

### `::ng-deep` (deprecated, but works)

Used to style **child components** (e.g. `<app-filters-form>` from `/profile` or `/offers`):

```css
:host ::ng-deep app-filters-form .ff-card {
  padding: 3rem;
}
```

> ⚠️ `::ng-deep` is **deprecated** in Angular, but there's no official replacement for scoped child styling. The `:host ::ng-deep` prefix limits the scope to this component so it doesn't override the child's styles on other pages.

---

## 📚 Related documents

- [`README.md`](../README.md) — project overview
- [`docs/features.md`](features.md) — where these tokens are used (per page)
- [`docs/architecture.md`](architecture.md) — Angular patterns (standalone, Signals)

### Source files with design tokens

| File | What it defines |
|---|---|
| `src/styles.css` | Global (currently empty — everything is per-component) |
| `src/features/home/home.component.css` | `/home` tokens (simplified, light) |
| `src/features/offers/offers.component.css` | `/offers` tokens (extended, ink-* scale) |
| `src/features/profile/profile.component.css` | `/profile` tokens (glassmorphism, success/danger) |
| `src/app/shared/filters-form/filters-form.component.css` | Salary slider, pill cards |
