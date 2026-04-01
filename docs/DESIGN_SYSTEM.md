# Gastar App v2 — Design System

> **Purpose**: This document defines the visual identity, component conventions, page layouts, and user feedback patterns for Gastar App v2. Every UI decision should trace back to this document. If it's not here, it doesn't exist yet.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Typography](#2-typography)
3. [Color Palette](#3-color-palette)
4. [Dark Mode](#4-dark-mode)
5. [Component Variants](#5-component-variants)
6. [Icon System](#6-icon-system)
7. [Logo](#7-logo)
8. [Global Layout](#8-global-layout)
9. [Page Layouts](#9-page-layouts)
10. [Modal & Sheet Strategy](#10-modal--sheet-strategy)
11. [Toast & Notification System](#11-toast--notification-system)
12. [Responsive Patterns](#12-responsive-patterns)

---

## 1. Design Principles

- **Warm & Modern**: Amber-based palette with soft backgrounds. Never cold or clinical.
- **Minimalist**: Every element earns its place. No decoration without function.
- **Rounded**: Soft corners and shapes throughout. Friendly, not aggressive.
- **Consistent Feedback**: Every user action gets a visible response. No silent operations.
- **Mobile-First**: Design for mobile, enhance for desktop. Never the other way around.

---

## 2. Typography

### Font

**Plus Jakarta Sans** — Google Font, variable weight.

| Use             | Weight     | Size (base)  | Tailwind Class           |
| --------------- | ---------- | ------------ | ------------------------ |
| Page titles     | Bold (700) | 24px / 1.5rem | `text-2xl font-bold`    |
| Section headers | Semibold (600) | 18px / 1.125rem | `text-lg font-semibold` |
| Body text       | Regular (400) | 14px / 0.875rem | `text-sm`              |
| Labels          | Medium (500) | 14px / 0.875rem | `text-sm font-medium`  |
| Captions        | Regular (400) | 12px / 0.75rem | `text-xs`              |
| Amounts (money) | Semibold (600) | Contextual | `font-semibold tabular-nums` |

### Rules

- **All monetary amounts** use `tabular-nums` for proper alignment in tables and cards.
- **Font sizes** follow the Tailwind default scale. No custom sizes unless absolutely necessary.
- Import via Google Fonts CDN or `@fontsource/plus-jakarta-sans` (self-hosted, better performance).

---

## 3. Color Palette

### Semantic Colors

| Role          | Light Mode  | Dark Mode   | Usage                          |
| ------------- | ----------- | ----------- | ------------------------------ |
| Primary       | `#D97706` (amber-600) | `#F59E0B` (amber-500) | Buttons, active states, links |
| Primary Fg    | `#FFFFFF`   | `#1C1917`   | Text on primary background     |
| Background    | `#FFFBF5` (warm cream) | `#1C1917` (stone-900) | Page background             |
| Card/Surface  | `#FFFFFF`   | `#292524` (stone-800) | Cards, modals, sheets        |
| Foreground    | `#1C1917` (stone-900) | `#FAF9F6` (warm white) | Primary text               |
| Muted         | `#F5F0EB` (warm beige) | `#44403C` (stone-700) | Secondary backgrounds       |
| Muted Fg      | `#78716C` (stone-500) | `#A8A29E` (stone-400) | Secondary text, placeholders |
| Border        | `#E7E5E4` (stone-200) | `rgba(255,255,255,0.1)` | Borders, dividers          |
| Input         | `#E7E5E4` (stone-200) | `rgba(255,255,255,0.15)` | Input borders              |
| Ring          | `#D97706` (amber-600) | `#F59E0B` (amber-500) | Focus rings                 |

### Functional Colors

| Role          | Color       | Usage                                   |
| ------------- | ----------- | --------------------------------------- |
| Income        | `#16A34A` (green-600) | Income amounts, positive indicators |
| Expense       | `#DC2626` (red-600) | Expense amounts, negative indicators  |
| Transfer      | `#2563EB` (blue-600) | Transfer indicators, neutral actions  |
| Destructive   | `#DC2626` (red-600) | Delete buttons, error states          |
| Destructive Fg| `#FFFFFF`   | Text on destructive background          |
| Warning       | `#D97706` (amber-600) | Warning toasts, caution states       |
| Info          | `#2563EB` (blue-600) | Informational toasts, hints          |
| Success       | `#16A34A` (green-600) | Success toasts, confirmations        |

### Chart Colors

Used for category visualization in charts and badges. These match the default categories defined in `ARCHITECTURE.md`.

| Category   | Color     | Tailwind-Compatible |
| ---------- | --------- | ------------------- |
| Auto       | `#3B82F6` | blue-500            |
| Salud      | `#EF4444` | red-500             |
| Personal   | `#8B5CF6` | violet-500          |
| Social     | `#F59E0B` | amber-500           |
| Comida     | `#10B981` | emerald-500         |
| Viajes     | `#06B6D4` | cyan-500            |

> User-created categories pick from an extended palette. The chart system supports up to 12 distinct colors before recycling.

---

## 4. Dark Mode

Dark mode is **MVP scope**. Implementation details:

| Aspect            | Approach                                              |
| ----------------- | ----------------------------------------------------- |
| Toggle mechanism  | User preference stored in `UserSettings.language` → extend to include `theme` field, or use Zustand + `localStorage` |
| CSS strategy      | Tailwind's `class` strategy (`.dark` class on `<html>`) |
| Default           | System preference (`prefers-color-scheme`) on first visit, then user choice |
| Persistence       | `localStorage` for instant load, synced to UserSettings after auth |
| Transition        | `transition-colors duration-200` on `<body>` for smooth switch |

### Dark Mode Rules

- **Never use pure black** (`#000`). Use warm dark tones (`stone-900`, `stone-800`).
- **Never use pure white text** on dark backgrounds. Use warm white (`#FAF9F6`).
- **Reduce shadow intensity** in dark mode — shadows are less visible and can create muddy effects.
- **Increase border opacity** slightly in dark mode for element separation.
- **Charts** use a different color set in dark mode (more saturated/luminous for contrast — see Shadcn chart variables).

---

## 5. Component Variants

Built on **Shadcn/ui** (Radix UI primitives + Tailwind). All components follow the warm amber identity.

### Global

| Property        | Value         | Note                                    |
| --------------- | ------------- | --------------------------------------- |
| Border radius   | `0.625rem` (10px) | `--radius: 0.625rem` in CSS variables |
| Font family     | Plus Jakarta Sans | Applied globally via Tailwind config  |

### Buttons

| Variant     | Background         | Border         | Text            | Use Case                    |
| ----------- | ------------------ | -------------- | --------------- | --------------------------- |
| `default`   | Primary (amber)    | None           | Primary Fg      | Main actions: Save, Create  |
| `secondary` | Transparent        | stone-300      | Foreground      | Secondary: Cancel, Back     |
| `ghost`     | Transparent        | None           | Foreground      | Tertiary: icon buttons      |
| `destructive` | Destructive (red) | None          | White           | Delete, dangerous actions   |
| `outline`   | Transparent        | Border color   | Foreground      | Form actions, filters       |
| `link`      | Transparent        | None           | Primary (amber) | Inline text links           |

> All buttons: `font-medium`, no uppercase, rounded per global radius.

### Cards

| Property     | Light Mode                    | Dark Mode                     |
| ------------ | ----------------------------- | ----------------------------- |
| Background   | `#FFFFFF`                     | stone-800                     |
| Border       | `1px solid` stone-200         | `1px solid` white/10%         |
| Shadow       | `shadow-sm`                   | `shadow-none` or very subtle  |
| Hover        | `shadow-md` transition        | Border brightens slightly     |
| Border radius| Global `--radius`             | Global `--radius`             |

### Inputs

| State        | Border         | Ring            |
| ------------ | -------------- | --------------- |
| Default      | stone-200      | None            |
| Focus        | amber-600      | amber-600/20%   |
| Error        | red-600        | red-600/20%     |
| Disabled     | stone-200 50%  | None            |

> Focus state uses the amber ring for brand consistency.

### Badges / Chips

- **Shape**: Full rounded (`rounded-full`) — pill style.
- **Category badges**: Background is the category color at 10% opacity, text is the category color at full.
- **Status badges**: Follow functional colors (success/warning/error/info).
- **Size**: `text-xs`, `px-2.5 py-0.5`.

### Tables (Desktop only)

- **Header**: `font-medium`, muted background, uppercase `text-xs tracking-wider`.
- **Rows**: Alternating muted/transparent backgrounds for readability.
- **Hover**: Row highlights with muted background.
- **Amounts**: Right-aligned, `tabular-nums`, colored by transaction type (income green, expense red).

### Skeleton Loaders

- Animated pulse (`animate-pulse`) with muted background.
- Match the exact shape and size of the content they replace.
- Used during: page load, infinite scroll next batch, modal data fetch.

---

## 6. Icon System

**Lucide React** — consistent with Shadcn/ui.

### Size Convention

| Context          | Size   | Tailwind Class |
| ---------------- | ------ | -------------- |
| Inline with text | 16px   | `size-4`       |
| Buttons          | 16px   | `size-4`       |
| Navigation items | 20px   | `size-5`       |
| Empty states     | 48px   | `size-12`      |
| Feature icons    | 24px   | `size-6`       |

### Category Icons

Defined in `ARCHITECTURE.md`, section 5 (Default Categories):

| Category | Lucide Icon     |
| -------- | --------------- |
| Auto     | `car`           |
| Salud    | `heart-pulse`   |
| Personal | `user`          |
| Social   | `users`         |
| Comida   | `utensils`      |
| Viajes   | `plane`         |

### Transaction Type Icons

| Type     | Lucide Icon      |
| -------- | ---------------- |
| Income   | `arrow-down-left` |
| Expense  | `arrow-up-right`  |
| Transfer | `arrow-left-right`|

### Navigation Icons

| Page         | Lucide Icon   |
| ------------ | ------------- |
| Dashboard    | `layout-dashboard` |
| Accounts     | `wallet`      |
| Categories   | `tags`        |
| Transactions | `receipt`     |
| Settings     | `settings`    |

---

## 7. Logo

### Final Design

A geometric **G** letterform where the right arm extends into an **arrow/chevron** pointing right — evoking forward movement and financial direction. Single solid fill, no gradients, no shadows. Clean vector path (~300 bytes).

The G is constructed as a thick arc (~270°) with the opening on the upper-right. The bottom-right arm of the G extends horizontally and terminates in a triangular arrow tip, integrated as a single continuous shape.

### Assets

| File | Purpose | Usage |
|------|---------|-------|
| `assets/logo.svg` | Source logo (G mark) | Design reference |
| `assets/logo-mark.svg` | G mark only | Favicon, PWA icons, mobile header, collapsed sidebar |
| `assets/logo-full.svg` | G mark + "GASTAR" text | Auth pages, expanded sidebar, splash screen |

### Specs

- **Color**: Amber `#D97706` (primary). Single fill — change `fill` attribute for variants.
- **Format**: SVG (primary). PNG exports at 192px and 512px generated at build time for PWA manifest.
- **Font in logo-full**: Plus Jakarta Sans Bold 700, `letter-spacing: 8`, matching the app's primary typeface.
- **Color variants**: Swap the `fill` attribute:
  - Full color on light bg: `fill="#D97706"`
  - Full color on dark bg: `fill="#D97706"` (amber has sufficient contrast on dark surfaces)
  - Monochrome light: `fill="#FFFFFF"` (for dark backgrounds where amber doesn't work)
  - Monochrome dark: `fill="#1C1917"` (stone-950, for light backgrounds)
  - Current color: `fill="currentColor"` (inherits from parent — useful in components)

---

## 8. Global Layout

### Desktop (≥1024px / `lg` breakpoint)

```
┌──────────────────────────────────────────────────────┐
│  Header: Logo | App name          User menu | Theme  │
├────────────┬─────────────────────────────────────────┤
│            │                                         │
│  Sidebar   │           Main Content                  │
│            │           (changes per page)             │
│  Dashboard │                                         │
│  Accounts  │                                         │
│  Categories│                                         │
│  Transact. │                                         │
│            │                                         │
│  ────────  │                                         │
│  [+ Nueva  │                                         │
│  Transac.] │                                         │
│            │                                         │
│  ────────  │                                         │
│  Settings  │                                         │
└────────────┴─────────────────────────────────────────┘
```

- **Sidebar**: Fixed, collapsible (icon-only mode). Width: `16rem` expanded, `4rem` collapsed.
- **Header**: Sticky top. Contains logo, app name (hidden when sidebar collapsed), user avatar dropdown, theme toggle.
- **Main Content**: Scrollable. Padded (`p-6`). Max content width: none (fills available space).
- **[+ Nueva Transacción]**: Prominent button in sidebar, always visible. Uses primary (amber) variant.

### Mobile (<1024px)

```
┌─────────────────────────┐
│  Header: Logo   Avatar  │
├─────────────────────────┤
│                         │
│      Main Content       │
│      (scrollable)       │
│                         │
│                         │
│                     [+] │  ← FAB (fixed position)
├─────────────────────────┤
│  🏠    💰    📊    ⚙️    │  ← Bottom navigation
└─────────────────────────┘
```

- **Header**: Simplified — logo left, avatar/menu right. No app name text (space constraint).
- **Bottom Nav**: Fixed. 4 items: Dashboard, Accounts, Transactions, Settings. Active item highlighted with primary color.
- **FAB**: Fixed `bottom-20 right-4` (above bottom nav). Creates new transaction from any page. `size-14`, `rounded-full`, primary amber, plus icon.
- **No sidebar** on mobile — navigation is entirely via bottom nav.

### FAB Safety Rules

- Content areas must have `pb-24` (96px) minimum padding at the bottom to prevent the FAB from covering the last item.
- The FAB must never overlap interactive elements (buttons, links) in its resting position.
- On the Transactions page with infinite scroll, the scroll container naturally handles this via the bottom padding rule.

---

## 9. Page Layouts

### Auth Pages (`/login`, `/register`, `/reset-password`)

**Standalone layout** — no sidebar, no header, no bottom nav.

```
┌────────────────────────────────────┐
│          (centered vertically)     │
│        ┌────────────────────┐      │
│        │       Logo         │      │
│        │                    │      │
│        │    Form Card       │      │
│        │    email input     │      │
│        │    password input  │      │
│        │    [Submit]        │      │
│        │                    │      │
│        │    Footer links    │      │
│        │    (register/login │      │
│        │     forgot pass)   │      │
│        └────────────────────┘      │
│                                    │
└────────────────────────────────────┘
```

- **Max-width**: `400px` for the card.
- **Background**: Muted/warm cream (light) or dark background (dark). Subtle pattern or gradient optional.
- **Responsive**: Looks identical on mobile and desktop — centered card is always the same width.

### Dashboard (`/dashboard`)

**Desktop (3-column grid)**:
```
┌──────────────────────────────────────────────┐
│  Panel Principal                             │
├──────────────┬──────────────┬────────────────┤
│  ARS Balance │  USD Balance │  EUR Balance   │
│  card        │  card        │  card          │
├──────────────┴──────────────┴────────────────┤
│  Monthly Income    │    Monthly Expenses      │
│  card              │    card                  │
├────────────────────┴─────────────────────────┤
│  Expenses by Category          │  Monthly    │
│  (donut chart)                 │  Net card   │
├────────────────────────────────┴─────────────┤
│  Recent Transactions (last 5-10)             │
│  compact list / mini-table                   │
└──────────────────────────────────────────────┘
```

**Mobile (1-column stack)**: Same cards, stacked vertically. Full width. Same order top to bottom.

- **Balance cards**: Show currency symbol, formatted amount, account count. Color-coded border-left by currency.
- **Monthly stats**: Income (green text), expenses (red text), net (green if positive, red if negative).
- **Donut chart**: Shows expense distribution by category for the current month. Legend below.
- **Recent transactions**: Compact list — date, description/category, amount (colored by type).

### Accounts (`/accounts`)

**Desktop (grid, 3 columns)**:
```
┌──────────────────────────────────────────────┐
│  Mis Cuentas                       [+ Nueva] │
├──────────────┬──────────────┬────────────────┤
│  Account     │  Account     │  Account       │
│  Card        │  Card        │  Card          │
├──────────────┼──────────────┼────────────────┤
│  Account     │  Account     │                │
│  Card        │  Card        │                │
└──────────────┴──────────────┘────────────────┘
```

**Mobile (1-column stack)**: Cards stacked full-width.

- **Account Card**: Name, account type icon, currency badge, balance (formatted). Subtle border-left with currency color hint.
- **Click/tap** → opens edit modal (not a new page).
- **[+ Nueva]** button in page header (desktop). FAB handles mobile.

### Categories (`/categories`)

**Desktop (grid of cards/chips)**:
```
┌──────────────────────────────────────────────┐
│  Categorías                        [+ Nueva] │
├──────────────────────────────────────────────┤
│  ● Auto    ● Salud    ● Personal             │
│  ● Social  ● Comida   ● Viajes               │
│  ● Custom1 ● Custom2                         │
└──────────────────────────────────────────────┘
```

**Mobile**: Vertical list with category color dot, icon, name, and transaction count.

- Each item shows: **color dot** + **icon** + **name** + **transaction count** (badge).
- **Click/tap** → opens edit modal.
- **Delete** → confirmation AlertDialog. If transactions exist, shows warning with count.

### Transactions (`/transactions`)

**Desktop (full table)**:
```
┌──────────────────────────────────────────────┐
│  Transacciones                     [+ Nueva] │
├──────────────────────────────────────────────┤
│  Filters: [Account ▾] [Category ▾] [Type ▾] │
│           [Date from] [Date to]    [Clear]   │
├──────────────────────────────────────────────┤
│  Date    │ Description │ Category │ Account │ Amount │
│  ─────── │ ─────────── │ ──────── │ ─────── │ ────── │
│  30/03   │ Supermercado│ ● Comida │ Efectivo│ -$5.000│
│  29/03   │ Sueldo      │ ● Ingres │ Banco   │ +$500k │
│  ...     │             │          │         │        │
├──────────────────────────────────────────────┤
│           ‹ 1  2  3  4  5 ›                 │
└──────────────────────────────────────────────┘
```

**Mobile (card list + infinite scroll)**:
```
┌─────────────────────────┐
│ Transacciones           │
│ [🔍 Filtros (2)]        │  ← badge shows active filter count
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ ● Comida    30/03   │ │
│ │ Supermercado        │ │
│ │ Efectivo   -$5.000  │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ ● Ingreso   29/03   │ │
│ │ Sueldo              │ │
│ │ Banco    +$500.000  │ │
│ └─────────────────────┘ │
│                         │
│ ┌─ skeleton loading ──┐ │  ← infinite scroll trigger
│ └─────────────────────┘ │
│                     [+] │
├─────────────────────────┤
│ 🏠    💰    📊    ⚙️    │
└─────────────────────────┘
```

**Mobile filters (Bottom Sheet)**:
```
┌─────────────────────────┐
│ ─── drag bar ───        │
│                         │
│ Cuenta                  │
│ [▾ Todas              ] │
│                         │
│ Categoría               │
│ [▾ Todas              ] │
│                         │
│ Tipo                    │
│ ○ Todos  ○ Ingreso      │
│ ○ Gasto  ○ Transferencia│
│                         │
│ Rango de fecha          │
│ [Desde      ] [Hasta  ] │
│                         │
│ [Aplicar]     [Limpiar] │
└─────────────────────────┘
```

- **Filter badge** on the trigger button shows count of active (non-default) filters.
- **Desktop filters**: Inline bar, always visible above the table.
- **Mobile filters**: Bottom Sheet, opened by tapping the filter button.

---

## 10. Modal & Sheet Strategy

All create, edit, and delete operations happen in modals. **No separate pages for CRUD.**

### Responsive Behavior

| Action                        | Mobile               | Desktop              |
| ----------------------------- | -------------------- | -------------------- |
| Create/edit transaction       | Sheet (bottom, full height) | Dialog (centered, `max-w-lg`) |
| Create/edit account           | Sheet (bottom, ~60% height) | Dialog (centered, `max-w-md`) |
| Create/edit category          | Sheet (bottom, ~50% height) | Dialog (centered, `max-w-sm`) |
| Confirm delete                | AlertDialog (centered) | AlertDialog (centered) |
| Transaction filters           | Sheet (bottom, ~70% height) | N/A (inline filters) |
| User settings                 | Sheet (bottom, full height) | Dialog (centered, `max-w-md`) |

### Modal Rules

- **Sheets** on mobile slide up from the bottom and can be dismissed with swipe-down gesture.
- **Dialogs** on desktop are centered with a backdrop overlay (`bg-black/50`).
- **AlertDialogs** (delete confirmation) are the same on both breakpoints — small centered dialog with a clear destructive action button.
- **All modals** must be keyboard-navigable (Tab, Escape to close). Handled by Radix UI primitives.
- **Form modals** must show a loading state on the submit button while the request is in-flight. Disable all form inputs during submission.
- **Large forms** (transaction with many fields) should scroll within the modal, not make the modal itself scroll the page.

---

## 11. Toast & Notification System

**Every user action gets visible feedback.** No silent operations. No browser-native notifications for in-app events.

### Configuration

| Property         | Mobile              | Desktop             |
| ---------------- | ------------------- | ------------------- |
| Position         | Bottom center       | Top right           |
| Max visible      | 1 (stacked queue)   | 3 (stacked)         |
| Auto-dismiss     | 4 seconds           | 5 seconds           |
| Dismissable      | Swipe right         | Click X             |
| Persistent       | Only for actions with undo | Same           |

### Toast Types

| Type      | Color          | Icon (Lucide)     | Left border accent |
| --------- | -------------- | ----------------- | ------------------ |
| Success   | Green-600      | `check-circle`    | Green              |
| Error     | Red-600        | `x-circle`        | Red                |
| Warning   | Amber-600      | `alert-triangle`  | Amber              |
| Info      | Blue-600       | `info`            | Blue               |

### Generic CRUD Toasts

All CRUD operations use parameterized messages via i18n. The entity name is injected dynamically.

| Key (i18n)                  | Spanish                              | English                            |
| --------------------------- | ------------------------------------ | ---------------------------------- |
| `toast.created`             | `{entity} creado/a correctamente`    | `{entity} created successfully`    |
| `toast.updated`             | `{entity} actualizado/a correctamente` | `{entity} updated successfully`  |
| `toast.deleted`             | `{entity} eliminado/a correctamente` | `{entity} deleted successfully`    |
| `toast.validationError`     | `Revisá los campos marcados`         | `Check the highlighted fields`     |
| `toast.notFound`            | `{entity} no encontrado/a`           | `{entity} not found`               |
| `toast.conflict`            | `{entity} ya existe`                 | `{entity} already exists`          |
| `toast.serverError`         | `Algo salió mal. Intentá de nuevo.`  | `Something went wrong. Try again.` |
| `toast.networkError`        | `Sin conexión. Verificá tu internet.` | `No connection. Check your internet.` |

### Auth Toasts

| Key (i18n)                  | Type    | Spanish                                          |
| --------------------------- | ------- | ------------------------------------------------ |
| `toast.auth.loginSuccess`   | success | `¡Bienvenido/a, {name}!`                         |
| `toast.auth.registerSuccess`| success | `Cuenta creada. ¡Bienvenido/a!`                  |
| `toast.auth.logout`         | info    | `Sesión cerrada`                                 |
| `toast.auth.sessionRenewed` | info    | `Sesión renovada automáticamente`                |
| `toast.auth.sessionExpired` | warning | `Tu sesión expiró. Iniciá sesión de nuevo.`      |
| `toast.auth.resetSent`      | success | `Te enviamos un email para restablecer tu contraseña` |
| `toast.auth.resetSuccess`   | success | `Contraseña actualizada correctamente`           |
| `toast.auth.invalidCredentials` | error | `Email o contraseña incorrectos`              |
| `toast.auth.emailExists`    | error   | `Este email ya está registrado`                  |

### Business Logic Toasts

| Key (i18n)                          | Type    | Spanish                                             |
| ----------------------------------- | ------- | --------------------------------------------------- |
| `toast.category.hasTransactions`    | warning | `Esta categoría tiene {count} transacciones. Reasignalas antes de eliminar.` |
| `toast.account.deleteWarning`       | warning | `Eliminar esta cuenta borrará todas sus transacciones.` |
| `toast.transfer.created`            | success | `Transferencia registrada correctamente`            |
| `toast.transfer.exchangeRate`       | info    | `Tipo de cambio: 1 {from} = {rate} {to}`           |

### System Toasts

| Key (i18n)                       | Type    | Spanish                                          |
| -------------------------------- | ------- | ------------------------------------------------ |
| `toast.system.offline`           | warning | `Estás sin conexión. Los datos pueden no estar actualizados.` |
| `toast.system.online`            | info    | `Conexión restaurada`                            |
| `toast.system.updateAvailable`   | info    | `Hay una nueva versión disponible. [Actualizar]` |
| `toast.settings.languageChanged` | success | `Idioma cambiado a {language}`                   |
| `toast.settings.themeChanged`    | success | `Tema cambiado a {theme}`                        |

### Rules

- **Never use browser-native alerts** (`window.alert`, `window.confirm`). Always use custom toasts or AlertDialogs.
- **Never use browser-native notifications** (`Notification API`) for in-app events. Toasts handle all feedback.
- **Error toasts** from API responses use the error `code` to look up the translated message via i18next.
- **Validation errors** do NOT use toasts — they appear inline on the form fields. Only a generic toast if the form submit fails for non-validation reasons.
- **Delete confirmations** use AlertDialog (modal), NOT toasts. The toast fires AFTER the delete succeeds.

---

## 12. Responsive Patterns

### Breakpoints (Tailwind Defaults)

| Name | Min Width | Typical Device       |
| ---- | --------- | -------------------- |
| `sm` | 640px     | Large phones         |
| `md` | 768px     | Tablets              |
| `lg` | 1024px    | Small desktops       |
| `xl` | 1280px    | Desktops             |

### Key Layout Shifts

| Element              | Mobile (<lg)            | Desktop (≥lg)             |
| -------------------- | ----------------------- | ------------------------- |
| Navigation           | Bottom tab bar          | Sidebar (collapsible)     |
| New transaction      | FAB (floating button)   | Sidebar button + page header button |
| Transaction list     | Card list + infinite scroll | Table + pagination    |
| Filters              | Bottom Sheet            | Inline bar                |
| Create/Edit forms    | Bottom Sheet            | Centered Dialog           |
| Dashboard cards      | 1-column stack          | 2-3 column grid           |
| Account cards        | 1-column stack          | 3-column grid             |

### Spacing Scale

| Context           | Mobile    | Desktop   |
| ----------------- | --------- | --------- |
| Page padding      | `p-4`     | `p-6`     |
| Card gap (grid)   | `gap-3`   | `gap-4`   |
| Section spacing   | `space-y-4` | `space-y-6` |
| Content max-width | 100%      | 100% (fills main area) |

---

> **This document is a living artifact.** Update it as the visual identity evolves. Every deviation should be a conscious, documented decision.
