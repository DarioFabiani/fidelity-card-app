import { useEffect } from 'preact/hooks';

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'error' ? 'var(--color-danger)' : 'var(--color-success)';

  return (
    <div class="toast" style={{ background: bg }} onClick={onClose}>
      {message}
      <style>{`
        .toast {
          position: fixed;
          bottom: 90px;
          left: 50%;
          transform: translateX(-50%);
          color: #FFFFFF;
          padding: 12px 24px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 500;
          box-shadow: var(--shadow-md);
          z-index: 300;
          animation: toastIn 0.3s ease;
          cursor: pointer;
          max-width: calc(100% - 32px);
          text-align: center;
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
