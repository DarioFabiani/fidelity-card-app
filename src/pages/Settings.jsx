import { useState } from 'preact/hooks';
import { downloadExport, uploadImport } from '../utils/export-import';

export function Settings({ showToast }) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const count = await downloadExport();
      showToast(`${count} carte esportate`);
    } catch {
      showToast('Errore nell\'esportazione', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const count = await uploadImport();
      if (count > 0) {
        showToast(`${count} carte importate`);
      }
    } catch (err) {
      showToast(err.message || 'Errore nell\'importazione', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div class="page">
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
        Impostazioni
      </h2>

      <div class="settings-section">
        <h3 class="settings-section-title">Dati</h3>

        <button class="settings-item" onClick={handleExport} disabled={exporting}>
          <div class="settings-item-content">
            <span class="settings-item-label">Esporta carte</span>
            <span class="settings-item-desc">Scarica un backup in formato JSON</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        <button class="settings-item" onClick={handleImport} disabled={importing}>
          <div class="settings-item-content">
            <span class="settings-item-label">Importa carte</span>
            <span class="settings-item-desc">Carica un file JSON di backup</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">Info</h3>
        <div class="settings-about">
          <p><strong>Carte Fedeltà</strong> v1.0.0</p>
          <p>Gestisci le tue carte fedeltà dal telefono.</p>
          <p>I tuoi dati sono salvati solo sul tuo dispositivo.</p>
        </div>
      </div>

      <style>{`
        .settings-section {
          margin-bottom: 24px;
        }
        .settings-section-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 16px;
          background: var(--color-surface);
          border-radius: var(--radius-sm);
          margin-bottom: 8px;
          text-align: left;
          -webkit-tap-highlight-color: transparent;
          color: var(--color-text);
        }
        .settings-item:active {
          opacity: 0.8;
        }
        .settings-item-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .settings-item-label {
          font-size: 15px;
          font-weight: 600;
        }
        .settings-item-desc {
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .settings-about {
          padding: 16px;
          background: var(--color-surface);
          border-radius: var(--radius-sm);
          font-size: 14px;
          line-height: 1.6;
        }
        .settings-about p + p {
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
