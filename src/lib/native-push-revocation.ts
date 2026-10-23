import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { pushNotificationsApi } from '@/lib/api';

const STORAGE_KEY = 'washsync_push_revocation_v1';

export interface NativePushRevocation {
  installationId: string;
  fcmToken: string;
  revocationKey: string;
  pending: boolean;
}

function assertNativePlatform(): void {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Armazenamento seguro disponível apenas no aplicativo nativo.');
  }
}

export async function getNativePushRevocation(): Promise<NativePushRevocation | null> {
  assertNativePlatform();
  const stored = await SecureStorage.get(STORAGE_KEY);
  if (stored === null) return null;
  if (typeof stored !== 'string') {
    throw new Error('Formato inválido do registro seguro de revogação.');
  }
  const parsed: unknown = JSON.parse(stored);
  if (
    !parsed || typeof parsed !== 'object' ||
    !('installationId' in parsed) || typeof parsed.installationId !== 'string' ||
    !('fcmToken' in parsed) || typeof parsed.fcmToken !== 'string' ||
    !('revocationKey' in parsed) || typeof parsed.revocationKey !== 'string' ||
    !/^[0-9a-f]{64}$/.test(parsed.revocationKey) ||
    !('pending' in parsed) || typeof parsed.pending !== 'boolean'
  ) {
    throw new Error('Registro seguro de revogação inválido.');
  }
  return parsed as NativePushRevocation;
}

export async function saveNativePushRevocation(record: NativePushRevocation): Promise<void> {
  assertNativePlatform();
  await SecureStorage.set(STORAGE_KEY, JSON.stringify(record));
}

export async function clearNativePushRevocation(): Promise<void> {
  assertNativePlatform();
  await SecureStorage.remove(STORAGE_KEY);
}

let pendingCleanup: Promise<boolean> | null = null;

/**
 * Retorna true quando não há revogação pendente. Em erro de rede mantém o
 * segredo protegido para nova tentativa; nunca libera um token a outra conta.
 */
export function flushPendingNativePushRevocation(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve(true);
  if (pendingCleanup) return pendingCleanup;

  const task = (async (): Promise<boolean> => {
    const record = await getNativePushRevocation();
    if (!record?.pending) return true;
    try {
      await pushNotificationsApi.revokeDeviceByKey(record.revocationKey);
      // Uma resposta bem-sucedida não revela se o registro ainda existia.
      await clearNativePushRevocation();
      if (localStorage.getItem('washsync_native_push_token') === record.fcmToken) {
        localStorage.removeItem('washsync_native_push_token');
      }
      return true;
    } catch (error) {
      console.warn('[WashSync Push] Revogação pendente não concluída.', error);
      return false;
    }
  })();

  pendingCleanup = task.finally(() => { pendingCleanup = null; });
  return pendingCleanup;
}
