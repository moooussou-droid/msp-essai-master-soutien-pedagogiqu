import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, X } from 'lucide-react';
import { checkCloudBackupAvailability, CloudBackupState } from '../utils/storageStatus';

export default function OfflineBanner() {
  const [state, setState] = useState<CloudBackupState | null>(null);
  const [hidden, setHidden] = useState(false);
  const [checking, setChecking] = useState(false);

  async function refresh() {
    setChecking(true);
    try {
      const next = await checkCloudBackupAvailability();
      setState(next);
      if (next.status === 'available') setHidden(true);
      else setHidden(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    refresh();
    const onOnlineChange = () => refresh();
    window.addEventListener('online', onOnlineChange);
    window.addEventListener('offline', onOnlineChange);
    const interval = window.setInterval(refresh, 1000 * 60 * 5);
    return () => {
      window.removeEventListener('online', onOnlineChange);
      window.removeEventListener('offline', onOnlineChange);
      window.clearInterval(interval);
    };
  }, []);

  if (!state || state.status === 'available' || hidden) return null;

  return (
    <div className="fixed left-3 right-3 top-3 z-[60] rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-lg">
      <div className="flex items-start gap-2">
        <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-900">Mode hors-ligne</p>
          <p className="text-xs text-amber-800">{state.message}</p>
        </div>
        <button
          onClick={refresh}
          className="rounded-lg bg-amber-100 p-2 text-amber-800"
          title="Revérifier CloudBackup"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => setHidden(true)}
          className="rounded-lg bg-amber-100 p-2 text-amber-800"
          title="Masquer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
