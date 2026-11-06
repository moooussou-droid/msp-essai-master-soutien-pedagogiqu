import { isCloudConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './cloudConfig';

export type CloudBackupStatus = 'available' | 'offline' | 'unconfigured' | 'unavailable';

export interface CloudBackupState {
  status: CloudBackupStatus;
  message: string;
  checkedAt: number;
}

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * Vérifie l'état de connexion et la disponibilité du stockage CloudBackup.
 * L'application reste toujours local-first : si le cloud est indisponible,
 * les données continuent d'être sauvegardées sur l'appareil.
 */
export async function checkCloudBackupAvailability(): Promise<CloudBackupState> {
  if (!navigator.onLine) {
    return {
      status: 'offline',
      message: 'Mode hors-ligne : aucune connexion internet détectée. Les données restent sur cet appareil.',
      checkedAt: Date.now(),
    };
  }

  if (!isCloudConfigured()) {
    return {
      status: 'unconfigured',
      message: 'Mode hors-ligne : CloudBackup n’est pas encore configuré. Les données restent sur cet appareil.',
      checkedAt: Date.now(),
    };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/backups?select=sync_code&limit=1`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: withTimeout(4500),
    });

    if (!response.ok) {
      return {
        status: 'unavailable',
        message: 'Mode hors-ligne : CloudBackup est momentanément indisponible. Les données restent sur cet appareil.',
        checkedAt: Date.now(),
      };
    }

    return {
      status: 'available',
      message: 'CloudBackup disponible.',
      checkedAt: Date.now(),
    };
  } catch {
    return {
      status: 'unavailable',
      message: 'Mode hors-ligne : impossible de joindre CloudBackup. Les données restent sur cet appareil.',
      checkedAt: Date.now(),
    };
  }
}
