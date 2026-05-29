# 🎨 Style Guide — CV_ANALIZER Frontend

Design tokens, paleta kolorów, typografia, efekty wizualne i wzorce CSS używane w aplikacji. Uzupełnienie [głównego README](../README.md) i [`docs/features.md`](features.md).

## 📑 Spis treści

- [Filozofia designu](#filozofia-designu)
- [Paleta kolorów](#-paleta-kolorów)
- [Skala szarości tekstu](#-skala-szarości-tekstu)
- [Typografia](#-typografia)
- [Spacing i radius](#-spacing-i-radius)
- [Cienie (shadows)](#-cienie-shadows)
- [Glassmorphism](#-glassmorphism)
- [Glow effects](#-glow-effects)
- [Gradienty](#-gradienty)
- [Animacje](#-animacje)
- [Wzorzec pill cards](#-wzorzec-pill-cards)
- [Stany walidacji Angular](#-stany-walidacji-angular)
- [Breakpointy responsive](#-breakpointy-responsive)
- [CSS encapsulation](#-css-encapsulation)

---

## Filozofia designu

| Cecha | Wartość |
|---|---|
| **Theme** | Light mode only (brak dark mode) |
| **Główny kolor** | Indigo (`#6366f1` / Tailwind `indigo-500`) |
| **Akcent** | Fiolet (`#a855f7` / Tailwind `violet-500`) w gradientach |
| **Font** | DM Sans → Inter → system fallback |
| **Locale** | `pl` (polskie formaty dat, separatorów) |
| **Estetyka** | Glassmorphism (półprzezroczyste karty + backdrop-blur), miękkie cienie, animowane glow w tle |
| **Typografia** | Duże, pogrubione nagłówki (font-weight 900), ściśnięte letter-spacing |
| **Mikrointerakcje** | Hover lift (`translateY(-5px)`), animacje wejścia `fadeInUp` |
| **Brak** | Bibliotek UI (Tailwind/Material/Bootstrap) — wszystko ręcznie w CSS |

---

## 🎨 Paleta kolorów

### Indigo (brand primary)

Główny kolor aplikacji. Używany w przyciskach, ikonach, aktywnych elementach, focus rings.

| Token | Hex | Tailwind eq. | Użycie |
|---|---|---|---|
| `--primary` | `#6366f1` | indigo-500 | Bazowy kolor akcentów, ikony, focus, pill checked |
| `--primary-hover` | `#4f46e5` | indigo-600 | Hover na przyciskach |
| `--primary-dark` | `#4338ca` | indigo-700 | Ciemniejsze tło submit-button |
| `--primary-deep` | `#3730a3` | indigo-800 | Końcówka gradientu submit |
| `--primary-light` | `#eef2ff` | indigo-50 | Tła tagów, hover secondary-button |
| `--primary-ring` | `rgba(99,102,241,.16)` | — | Focus ring (półprzezroczyste indigo) |

### Fiolet (akcent)

Używany w gradientach (`text-gradient` w hero, kombo z indigo).

| Token | Hex | Tailwind eq. |
|---|---|---|
| (inline) | `#a855f7` | violet-500 |
| (inline) | `rgba(139,92,246,0.06)` | violet-500/6% — bg-glow-2 |

### Stany (semantic colors)

| Token | Hex | Użycie |
|---|---|---|
| `--success` | `#10b981` | Banner sukcesu CV, komunikat zapisu |
| `--success-bg` | `#ecfdf5` | Tło bannera sukcesu |
| `--success-text` | `#065f46` | Tekst sukcesu (dark green) |
| `--danger` | `#ef4444` | Błędy, przycisk „Usuń" |
| `--danger-bg` | `#fef2f2` | Tło inputu z błędem |
| `--danger-ring` | `rgba(239, 68, 68, 0.15)` | Focus ring inputu z błędem |

---

## 🌑 Skala szarości tekstu

4-stopniowa skala oparta na Tailwind `slate-*`. Wszystkie strony używają tych samych odcieni.

| Token | Hex | Slate eq. | Użycie |
|---|---|---|---|
| `--ink-1` | `#0f172a` | slate-900 | Główne nagłówki (`h1`, `h2`) |
| `--text-main` / `--ink-2` | `#1e293b` | slate-800 | Główny kolor tekstu, nazwy firm |
| `--ink-3` / `--text-sub` | `#475569` / `#64748b` | slate-600 / slate-500 | Metadane, podpisy, etykiety |
| `--text-muted` / `--ink-4` | `#94a3b8` | slate-400 | Placeholder, mało ważne info |

### Tło i obramowania

| Token | Hex | Użycie |
|---|---|---|
| `--bg` | `#f8fafc` | Główne tło strony (slate-50) |
| `--bg-mesh-1` | `#e0e7ff` | Blado-indigo, gradient tła |
| `--bg-mesh-2` | `#f1f5f9` | Blado-szary, środek gradientu |
| `--border` | `rgba(226, 232, 240, 0.8)` | Półprzezroczyste obramowanie kart |
| `--b-lt` | `#e8edf5` | Border light (linie między elementami) |
| `--b-md` | `#dde4f0` | Border medium |
| (inline) | `#cbd5e1` | Inputy, dropzone (slate-300) |

---

## ✍️ Typografia

### Font stack

```css
font-family: 'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

> 💡 **DM Sans** to font display użyty na nagłówkach. **Inter** to fallback i font tekstów. Brak importu Google Fonts w kodzie — fonty trzeba dodać do `index.html` (TODO).

### Skala fontów (typowa)

| Element | Rozmiar | Weight | Letter-spacing |
|---|---|---|---|
| Hero `h1` | `3rem` (48px) | `900` | `-1.5px` |
| Sekcja `h2` | `1.5rem` (24px) | `800` | — |
| Karta `h3` | `1.1rem` (17.6px) | `800` | — |
| Body | `1rem` (16px) | `400-500` | — |
| Subtitle / desc | `1.15rem` (18.4px) | `400` | — |
| Meta / label | `0.85rem` (13.6px) | `600-700` | — |
| Badge / pill | `0.8rem` (12.8px) | `700` | `0.05em` (uppercase) |
| Small | `0.75rem` (12px) | `500-600` | — |

### Hierarchia weight

```
font-weight: 400  → body text, opisy
font-weight: 600  → labelki, etykiety
font-weight: 700  → badge, pill, metadane
font-weight: 800  → tytuły sekcji (h2, h3)
font-weight: 900  → hero h1 (ekstremalnie bold)
```

### Letter-spacing

Hero używa **ujemnego** letter-spacingu (`-1.5px`) dla nowoczesnego, premium wyglądu. Badge i sekcje uppercase używają **dodatniego** (`0.05em`) dla czytelności.

---

## 📐 Spacing i radius

### Promienie zaokrągleń

| Token | Wartość | Użycie |
|---|---|---|
| `--radius-lg` | `20px` | Karty (glass-card, main-card) |
| `--radius-md` | `12px` | Inputy, mniejsze elementy |
| `--radius-md` (alt) | `10px` | Pola formularza |
| (inline) | `50px` / `9999px` | Pille, badge (pill shape) |
| (inline) | `50%` | Avatary, kółka (ikona success, logo firmy) |
| (inline) | `4px` / `6px` | Pasek postępu, salary track |

### Spacing

Brak globalnych zmiennych spacing — wartości używane bezpośrednio w komponentach:

| Skala | Użycie |
|---|---|
| `0.3rem` (5px) | Tight (między iconą a tekstem w meta) |
| `0.5rem` (8px) | Default gap między elementami inline |
| `0.75rem` (12px) | Padding inputu (góra-dół) |
| `1rem` (16px) | Standardowy gap między sekcjami |
| `1.5rem` (24px) | Większy gap (między grupami pól) |
| `2rem` (32px) | Margin między sekcjami formularza |
| `3rem` (48px) | Padding karty hero, dropzone |

---

## 🌫️ Cienie (shadows)

Skala 3-stopniowa:

| Token | Wartość | Użycie |
|---|---|---|
| `--sh-xs` | `0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.02)` | Karty oferty (spoczynek) |
| `--shadow-card` | `0 20px 40px -10px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)` | Glass-card, main-card |
| `--sh-md` | `0 8px 32px -6px rgba(99,102,241,.18), 0 2px 8px rgba(0,0,0,.04)` | Karty oferty (hover) — **kolorowy cień indigo** |
| `--shadow-hover` | `0 28px 56px -12px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.04)` | Glass-card (hover) |

> 💡 **Trick:** cienie z negatywnym offsetem Y i dużym spread (np. `-10px` w `--shadow-card`) dają miękki, rozlany efekt — bardziej naturalny niż klasyczne `box-shadow: 0 4px 8px`.

> 💡 **Kolorowy cień:** karty ofert na hover dostają **indigo cień** (`rgba(99,102,241,.18)`) zamiast czarnego. To subtelnie wzmacnia brand color w mikrointerakcji.

---

## 💎 Glassmorphism

Efekt „mlecznego szkła" używany w głównych kartach na `/profile` i `/offers`.

### Tokeny

```css
--glass-bg: rgba(255, 255, 255, 0.72);  /* białe tło z 72% przezroczystości */
--glass-blur: 16px;                      /* rozmycie backdrop-filter */
```

### Implementacja

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

> ⚠️ **Wymagania:**
> - `backdrop-filter` nie działa bez tła pod spodem (potrzebne `bg-glow` lub gradient na `:host`)
> - `-webkit-` prefix obowiązkowy dla Safari (do iOS 17.x)
> - `border: 1px solid rgba(226, 232, 240, 0.8)` daje subtelną krawędź zamiast ostrego cięcia

### Gdzie używane

| Strona | Element |
|---|---|
| `/profile` | `glass-card` (główne karty z danymi i CV) |
| `/offers` | `.card` z `--card: rgba(255,255,255,0.92)` |
| `/home` | NIE — proste białe tło (`rgba(255,255,255,0.95)`), lżejsze |

> 💡 **Decyzja designu:** home jest „lekka", profile i offers — „premium" (glassmorphism). Spójne ale różnicowane per kontekst.

---

## ✨ Glow effects

Animowane plamy tła używane na każdej stronie jako dekoracja.

### Implementacja

```css
.background-glow {
  position: fixed;
  width: 100vw;
  height: 100vh;
  top: 0; left: 0;
  z-index: -1;
  background: var(--bg);
  overflow: hidden;  /* zapobiega poziomemu scrollbarowi */
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

### Kluczowe cechy

- **`position: fixed`** + `z-index: -1` → tło nie scrolluje się z resztą strony
- **`radial-gradient(circle, color 0%, transparent 70%)`** → miękkie krawędzie, brak ostrych przejść
- **`width/height: 50vw`** → plamy skalują się z viewportem
- **Negatywne top/left** → częściowe schowanie poza ekran (większa głębia)
- **`pointer-events: none`** (opcjonalne) → kliknięcia przechodzą przez glow

### Wariant animowany (`/home` — opcjonalny)

```css
@keyframes glowFloat {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(20px, -30px); }
}

.glow-1 {
  animation: glowFloat 12s ease-in-out infinite;
}
```

> 💡 Statyczne glow (offers, profile) są tańsze dla GPU. Animowane (home) sprzedają „WOW factor" na landing page.

---

## 🌈 Gradienty

### Text gradient (hero)

```css
.text-gradient {
  background: linear-gradient(90deg, #6366f1, #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

**Użycie:** wyróżnione słowa w `h1` (np. „wyższym poziomie" w hero).

> ⚠️ Wymaga **wszystkich 4 reguł** — Safari potrzebuje `-webkit-*` prefixów, inaczej tekst będzie niewidoczny (transparent).

### Background mesh (`/offers`)

```css
background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 55%, #fafbff 100%);
```

3-stopniowy gradient pod kątem 135° — subtelny, ledwo widoczny, daje głębię bez krzykliwości.

### Submit button gradient

```css
background: linear-gradient(135deg, var(--primary), var(--primary-deep));
```

Indigo → indigo deep, pod kątem — premium feel.

---

## 🎬 Animacje

### Krzywa łagodzenia

```css
--ease: cubic-bezier(0.25, 0.8, 0.25, 1);  /* ease-in-out z trzymaniem na końcu */
```

Inna używana: `cubic-bezier(0.2, 0.8, 0.2, 1)` (sprężysta).

### Wejście (`fadeInUp`)

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-up {
  opacity: 0;  /* startuje niewidoczny */
  animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
.delay-3 { animation-delay: 0.3s; }
.delay-4 { animation-delay: 0.4s; }
```

**Wzorzec waterfall:** sekcje pojawiają się sekwencyjnie (hero → main-card → filters-form → feature cards).

> ⚠️ `forwards` jest konieczne — bez tego element wraca do `opacity: 0` po zakończeniu animacji.

### Hover lift (karty)

```css
.feature-card { transition: 0.3s; }
.feature-card:hover {
  transform: translateY(-5px);
  background: white;
  box-shadow: 0 10px 20px rgba(0,0,0,0.05);
}
```

### Radar sweep (animacja CV)

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

### Pop-in (checkmark sukcesu)

```css
@keyframes popIn {
  0%   { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1);   opacity: 1; }
}
```

---

## 🔘 Wzorzec pill cards

**Technika „ukrytego checkboxa"** — checkboxy/radio wyglądają jak karty bez JavaScript.

### Implementacja

```html
<label class="pill-card">
  <input type="checkbox" [checked]="value" (change)="onChange()">
  <span class="pill-content">Frontend Developer</span>
</label>
```

```css
.pill-card input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0; height: 0;  /* niewidoczny ALE w tab-indexie */
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

/* Stan zaznaczony — CSS adjacent sibling */
.pill-card input:checked + .pill-content {
  border-color: var(--primary);
  background: #eef2ff;
  color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);  /* wewnętrzna ramka bez resize */
}
```

### Dlaczego nie `display: none` na checkboxie?

`display: none` usuwa element z **tab-indexu** — klawiatura przestałaby działać. `opacity: 0 + width/height: 0` ukrywa wizualnie ale zachowuje accessibility.

---

## ⚠️ Stany walidacji Angular

```css
/* Klasy dodawane automatycznie przez Angular ReactiveForms */
input.ng-invalid.ng-touched,
select.ng-invalid.ng-touched {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
  background-color: #fef2f2;
}
```

> ⚠️ `!important` jest konieczne, bo standardowe style inputu (`border: 1px solid #cbd5e1`) mają wyższą specyficzność.

| Klasa | Co znaczy |
|---|---|
| `.ng-touched` | Użytkownik kliknął na pole (focus + blur) |
| `.ng-invalid` | Walidator zwrócił błąd |
| `.ng-dirty` | Wartość została zmieniona |

**Reguła:** pokaż błąd **dopiero** gdy `.ng-touched` AND `.ng-invalid` — bez pierwszego użytkownik widziałby błąd zanim coś wpisał.

---

## 📱 Breakpointy responsive

Aplikacja używa **mobile-first** mindset, ale punkty graniczne są standardowe:

| Breakpoint | Wartość | Tailwind eq. | Co się zmienia |
|---|---|---|---|
| Mobile | `< 640px` | `sm` | 1-kolumnowe siatki, mniejsze paddingi |
| Tablet | `< 768px` | `md` | Hero h1 redukcja do `2.2rem`, formularze do 1 kolumny, features-grid do 1 kolumny |
| Desktop | `≥ 768px` | `md+` | Pełen układ — 2-3 kolumny, większe paddingi |
| Wide | `≥ 1280px` | `xl` | Offers sidebar resizable, max-width 1200px |

### Przykład media query

```css
@media (max-width: 768px) {
  .form-grid, .features-grid { grid-template-columns: 1fr; }
  .input-group.full-width    { grid-column: 1; }
  .hero-section h1           { font-size: 2.2rem; }
  .home-container            { padding-top: 100px; }
}
```

### Specyficzne dla `/offers`

| Element | Mobile | Desktop |
|---|---|---|
| Sidebar | Ukryty (button toggle pokazuje overlay) | 240-480px, resizable |
| Lista ofert | Pełna szerokość | Po prawej od sidebara |
| Karta oferty | 1 kolumna meta info | Wieloliniowa meta z separatorami `·` |

---

## 🔐 CSS encapsulation

Angular domyślnie używa **Emulated View Encapsulation** — atrybuty `_nghost-*` i `_ngcontent-*` dodawane do selektorów żeby style komponentu nie wyciekały na zewnątrz.

### `:host` jako `:root` dla komponentu

```css
:host {
  --primary: #6366f1;
  display: block;  /* domyślnie inline — bez tego padding/margin nie działają */
  font-family: 'DM Sans', sans-serif;
}
```

### `::ng-deep` (deprecated, ale działa)

Używane do stylowania **child componentów** (np. `<app-filters-form>` z poziomu `/profile`):

```css
:host ::ng-deep app-filters-form .filters-form__section {
  background: var(--glass-bg);
}
```

> ⚠️ `::ng-deep` jest **deprecated** w Angular, ale brak oficjalnego zamiennika dla scoped child styling. Zalecane: dodać `[host-context]` lub przejść na global styles dla child componentów.

### Wzorzec wariantów

Klasa modyfikator (BEM-like) na hoście:

```css
:host { --card-bg: white; }
:host.dark { --card-bg: #1e293b; }
```

Komponent ojca może wymusić wariant:

```html
<app-filters-form class="dark"></app-filters-form>
```

---

## 📚 Powiązane dokumenty

- [`README.md`](../README.md) — overview projektu
- [`docs/features.md`](features.md) — gdzie te tokeny są używane (per strona)
- [`docs/architecture.md`](architecture.md) — wzorce Angular (standalone, Signals)

### Pliki źródłowe z design tokens

| Plik | Co definiuje |
|---|---|
| `src/styles.css` | Globalne (obecnie pusty — wszystko per-component) |
| `src/features/home/home.component.css` | Tokeny `/home` (uproszczone, jasne) |
| `src/features/offers/offers.component.css` | Tokeny `/offers` (rozbudowane, ink-* skala) |
| `src/features/profile/profile.component.css` | Tokeny `/profile` (glassmorphism, success/danger) |
| `src/app/shared/filters-form/filters-form.component.css` | Salary slider, pill cards |
