// Tests locaux sans réseau ni secrets, exécutant les vrais modules TypeScript.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const importer = createRequire(import.meta.url);
import ts from 'typescript';
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function charger(fichier, doublures = {}) {
  const source = fs.readFileSync(path.join(racine, fichier), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const moduleCharge = { exports: {} };
  new Function('require', 'module', 'exports', code)(nom => doublures[nom] || importer(nom), moduleCharge, moduleCharge.exports);
  return moduleCharge.exports;
}
const chemins = charger('src/lib/auth/internal-path.ts');
for (const chemin of ['//evil.example', '/\\evil.example', '/\tevil.example', 'https://evil.example', null]) assert.equal(chemins.isInternalPath(chemin), false);
for (const chemin of ['/workspace', '/search?q=agent#results']) assert.equal(chemins.isInternalPath(chemin), true);
const reseaux = charger('src/server/workflows/network-policy.ts');
for (const adresse of ['100.127.255.254', '198.19.0.1', '0.1.2.3', 'febf::1', 'ff02::1', '::ffff:127.0.0.1', 'localhost.', '10.0.0.1']) assert.equal(reseaux.isBlockedWorkflowHostname(adresse), true, adresse);
for (const adresse of ['8.8.8.8', '2606:4700:4700::1111', 'fc-example.com']) assert.equal(reseaux.isBlockedWorkflowHostname(adresse), false, adresse);
const i18n = charger('src/lib/i18n/config.ts');
const callback = charger('src/lib/auth/callback.ts', {
  'next/server': { NextResponse: { redirect: url => url } },
  '@/lib/auth/internal-path': chemins,
  '@/lib/i18n/config': i18n,
  '@/lib/auth/session': { getUserHomePath: () => '/agenthub' },
  '@/lib/supabase/server': { createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: null }) } }) },
});
(async () => {
  const corps = charger('src/server/bounded-body.ts');
  const creerRequete = () => new Request('https://agenthub.example', { method: 'POST', body: 'abcdef' });
  assert.equal(new TextDecoder().decode(await corps.readBoundedBody(creerRequete(), 6)), 'abcdef');
  await assert.rejects(corps.readBoundedBody(creerRequete(), 5), corps.BodyTooLargeError);
  const requeteMensongere = creerRequete();
  requeteMensongere.headers.set('content-length', '1');
  await assert.rejects(corps.readBoundedBody(requeteMensongere, 5), corps.BodyTooLargeError);
  const formulaire = new FormData();
  formulaire.set('rentalId', 'test-rental');
  formulaire.set('file', new Blob(['document de test'], { type: 'application/pdf' }), 'test.pdf');
  const envoi = new Request('https://agenthub.example', { method: 'POST', body: formulaire });
  const contenu = await corps.readBoundedBody(envoi, 10_000);
  const relu = await new Response(contenu, { headers: envoi.headers }).formData();
  assert.equal(relu.get('rentalId'), 'test-rental');
  assert.equal(await relu.get('file').text(), 'document de test');
  for (const locale of ['fr', 'en']) {
    for (const chemin of ['/\\evil.example', '/en//evil.example', '/\n/evil.example', '/search?q=agent']) {
      const url = new URL('https://agenthub.example/auth/callback?code=test');
      url.searchParams.set('next', chemin);
      const resultat = await callback.handleAuthCallback({ url: url.href }, locale);
      assert.equal(resultat.origin, url.origin, `${locale}: ${chemin}`);
    }
  }
  console.log('Security regressions: OK (redirections FR/EN et réseaux réservés).');
})().catch(erreur => { console.error(erreur); process.exitCode = 1; });
