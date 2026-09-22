# Carte Fedeltà

PWA per tenere le carte fedeltà sul telefono e mostrarle alla cassa, anche offline.
Tutti i dati restano sul dispositivo (IndexedDB); non c'è alcun server.

## Funzioni

- **Aggiunta rapida**: suggerimenti per i negozi più comuni, scansione con la fotocamera
  (con torcia, dove supportata) o da una foto/screenshot, anteprima del codice mentre scrivi.
- **Alla cassa**: codice a schermo intero, schermo che resta acceso, numero copiabile.
- **Lista**: preferiti in cima, ordine per uso recente o alfabetico, ricerca che ignora
  accenti e spazi nel numero.
- **Cifratura opzionale** (AES-256-GCM, chiave derivata dalla password con
  PBKDF2-SHA256 a 600.000 iterazioni): blocco manuale dal lucchetto in alto, blocco
  automatico dopo un periodo in background, cambio della master password. Il cambio
  password è resistente alle interruzioni: se l'app si chiude a metà, al successivo
  sblocco resta valida la password che apre davvero le carte.
- **Condivisione protetta**: link cifrato + codice di 8 caratteri da comunicare a parte.
- **Backup** in JSON, protetto da password quando la cifratura è attiva.

## Sviluppo

```bash
npm ci
npm run dev       # server di sviluppo
npm test          # test unitari (Vitest)
npm run build     # build di produzione in dist/
npm run preview   # serve la build su http://localhost:4173/fidelity-card-app/
```

Il push su `main` pubblica su GitHub Pages (`.github/workflows/deploy.yml`); le pull
request eseguono test e build (`.github/workflows/ci.yml`).

## Aggiornamenti

Una nuova versione non ricarica l'app da sola: compare il banner «È disponibile una nuova
versione» e si applica con **Aggiorna**, oppure da sola alla successiva chiusura completa
dell'app.
