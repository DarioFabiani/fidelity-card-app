# CLAUDE.md

## Comandi

- `npm run dev` — Dev server con HMR
- `npm run build` — Build di produzione (output in `dist/`)
- `npm run preview` — Preview della build di produzione

## Tech Stack

- **Preact** — UI library (alternativa leggera a React, stessa API hooks)
- **Vite** — Bundler e dev server
- **vite-plugin-pwa** — Service worker (Workbox) e manifest generati automaticamente
- **preact-router** — Routing client-side
- **idb** — Wrapper IndexedDB per storage locale
- **JsBarcode** — Rendering barcode SVG
- **qrcode** — Generazione QR code per condivisione

## Struttura Progetto

```
src/
├── index.jsx           # Mount point
├── app.jsx             # Root component + router
├── app.css             # Stili globali + CSS custom properties
├── db/index.js         # IndexedDB CRUD (getAllCards, getCard, addCard, updateCard, deleteCard)
├── hooks/              # Preact hooks (useCards, useSearch)
├── components/         # Componenti riutilizzabili (CardForm, BarcodeDisplay, ShareModal, ecc.)
├── pages/              # Pagine (Home, AddCard, EditCard, ViewCard, SharedCard, Settings)
├── utils/              # Utility (barcode.js, share.js, export-import.js)
└── constants/          # Provider predefiniti e formati barcode
```

## Convenzioni

- **Lingua UI**: Italiano (tutti i testi visibili all'utente)
- **Stili**: CSS inline con tag `<style>` dentro i componenti JSX. Variabili globali in `app.css` con CSS custom properties (`--color-primary`, ecc.)
- **Dark mode**: Automatica via `@media (prefers-color-scheme: dark)` — le variabili CSS cambiano in `app.css`
- **Nessun framework CSS** — Solo CSS puro
- **Base path**: Tutti i route e asset usano il prefisso `/fidelity-card-app/` (configurato in `vite.config.js` per GitHub Pages)
- **Nessun backend** — Dati salvati solo in IndexedDB sul dispositivo dell'utente
- **Condivisione**: Dati carta codificati in base64 nell'URL (`/shared?data=...`), nessun server necessario

## Deploy

GitHub Actions deploya automaticamente su GitHub Pages ad ogni push su `main` (`.github/workflows/deploy.yml`).
URL: `https://dariofabiani.github.io/fidelity-card-app/`
