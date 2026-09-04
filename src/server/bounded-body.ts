export class BodyTooLargeError extends Error {}

/** Compte les octets reçus : Content-Length est fourni par le client et peut manquer. */
export async function readBoundedBody(request: Request, limiteOctets: number): Promise<Uint8Array<ArrayBuffer>> {
  const lecteur = request.body?.getReader();
  if (!lecteur) return new Uint8Array(0);
  const morceaux: Uint8Array[] = [];
  let totalOctets = 0;
  try {
    while (true) {
      const { done, value } = await lecteur.read();
      if (done) break;
      totalOctets += value.byteLength;
      if (totalOctets > limiteOctets) {
        await lecteur.cancel().catch(() => undefined);
        throw new BodyTooLargeError("body-too-large");
      }
      morceaux.push(value);
    }
  } finally {
    lecteur.releaseLock();
  }
  const contenu = new Uint8Array(totalOctets);
  let position = 0;
  for (const morceau of morceaux) {
    contenu.set(morceau, position);
    position += morceau.byteLength;
  }
  return contenu;
}
