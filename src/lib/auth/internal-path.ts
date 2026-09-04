/** Refuse les URL externes, y compris les antislashs normalisés par le navigateur. */
export function isInternalPath(chemin: string | null): chemin is string {
  return Boolean(chemin && chemin.startsWith("/") && !chemin.startsWith("//") && !/[\\\u0000-\u0020\u007f]/.test(chemin));
}
