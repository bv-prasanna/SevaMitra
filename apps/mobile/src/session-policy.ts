/**
 * A transient connectivity/server failure must never erase a trusted mobile
 * session or its account-bound offline booking draft.
 * Invalid/expired refresh credentials are the only recoverable HTTP failures
 * that should force reauthentication.
 */
export function shouldClearStoredSessionOnRefreshError(error: unknown): boolean {
  const status=(error as {status?:unknown}|null)?.status;
  return status===400 || status===401 || status===403;
}
