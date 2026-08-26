export function extractAppwriteSessionSecret(setCookies: string[], projectId: string): string | null {
  const prefix = `a_session_${projectId}=`;
  const cookie = setCookies.find(value => value.startsWith(prefix));
  if (!cookie) return null;
  const encoded = cookie.slice(prefix.length).split(";", 1)[0];
  if (!encoded) return null;
  try { return decodeURIComponent(encoded); } catch { return null; }
}
