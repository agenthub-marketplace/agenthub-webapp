# AgentHub End-To-End Smoke Test

Objectif : prouver que AgentHub fonctionne comme une marketplace d'agents utilisables, pas seulement comme une vitrine.

Flow cible :

```text
creation agent
-> precheck securite
-> review admin
-> marketplace
-> location
-> workspace adapte
-> execution
-> historique
-> avis verifie
-> revenus creator
```

## Prerequis

- Stripe sandbox actif.
- OpenAI / runtimes actifs selon l'agent teste.
- Compte creator, admin et user disponibles.
- AgentHub Code accessible au creator/admin.
- Nouvelle migration `20260615170703_require_successful_run_for_verified_reviews.sql` appliquee sur l'environnement teste.

### Comptes locaux apres `npx supabase db reset`

Ces comptes sont uniquement pour une base Supabase locale pointee par `.env.local`.

- Creator : `creator@example.com`
- Admin : `admin@example.com`
- User : `user@example.com`
- Mot de passe local : `password`

Si `.env.local` pointe vers Supabase remote, utiliser des comptes remote valides et ne pas attendre que ces comptes seedes fonctionnent dans l'application.

## Smoke automatise local

Pour verifier les invariants principaux sans polluer la base :

```bash
npm run smoke:agenthub:local
```

Ce script :

- lit le statut Supabase local ;
- lance un smoke SQL transactionnel avec rollback ;
- demarre Next contre Supabase local sur un port dedie ;
- verifie les routes publiques/protegees avec les comptes seedes ;
- arrete le serveur Next lance par le script.

Commandes separees si besoin :

```bash
npm run smoke:agenthub:db
pwsh -NoProfile -File scripts/agenthub-http-role-smoke.ps1 -BaseUrl http://localhost:3101 -SkipEnvCheck
```

Le smoke HTTP requiert PowerShell 7 (`pwsh`). Windows PowerShell 5 peut fausser les cookies Supabase SSR.

## 1. Creation Agent

Role : creator.

1. Ouvrir `/code/agents/new`.
2. Choisir un template utilisable.
3. Remplir listing public, Agent Contract, runtime et preview.
4. Soumettre.

Preuve attendue :

- L'agent apparait dans `/code/agents`.
- Le message de soumission indique le statut du precheck.
- L'agent est visible dans la file admin.

## 2. Precheck Securite

Role : admin.

1. Ouvrir `/code/admin/review`.
2. Verifier le bloc precheck securite.
3. Si absent ou echoue, relancer le precheck depuis l'action admin.

Preuve attendue :

- Le precheck est `passed`, ou l'admin voit clairement les blockers.
- Un agent avec precheck manquant ne peut pas etre approuve.

## 3. Review Admin

Role : admin.

1. Prendre l'agent en review.
2. Verifier runtime, workspace, pricing, limitations, guardrails.
3. Pour runtime sensible, verifier asset approval et security review.
4. Approuver l'agent.

Preuve attendue :

- L'agent passe `approved`.
- Les routes marketplace/detail sont revalidees.
- Un runtime disabled ou non run-enabled bloque l'approbation.

## 4. Marketplace

Role : user.

1. Ouvrir `/agenthub/search`.
2. Chercher l'agent approuve.
3. Ouvrir la fiche.

Preuve attendue :

- L'agent apparait uniquement si son runtime est enabled et run-enabled.
- La fiche affiche le type d'agent, les limites, le workspace attendu et les avis.

## 5. Location

Role : user.

1. Cliquer `Louer cet agent`.
2. Payer avec Stripe sandbox.
3. Revenir via success page.

Preuve attendue :

- Paiement `paid`.
- Acces actif cree.
- Redirection vers `/agenthub/workspace/[rentalId]`.
- Pas de doublon d'acces actif.

## 6. Workspace Adapte

Role : user.

1. Ouvrir le workspace.
2. Verifier les onglets Overview, Setup, Use, Details, Review.
3. Verifier le blueprint agent-specific.

Preuve attendue :

- Inputs attendus, checklist, frontiere de confiance et structure de sortie sont visibles.
- Le runner correspond au runtime de l'agent.
- Les messages runtime disabled sont lisibles si le runtime est coupe.

## 7. Execution

Role : user.

1. Lancer une execution depuis l'onglet Use.
2. Attendre le resultat.
3. Recharger la page.

Preuve attendue :

- `agent_runs.status = succeeded`.
- Resultat visible dans le workspace.
- Historique visible apres reload.
- Double clic ou relance concurrente ne cree pas de spam incontrole.

## 8. Avis Verifie

Role : user.

1. Avant execution, verifier que l'avis est bloque.
2. Apres execution reussie, ouvrir l'onglet Review.
3. Publier un avis.

Preuve attendue :

- Avant run : message `avis apres utilisation`.
- Apres run : formulaire disponible.
- Apres publication : redirection vers la fiche agent.
- Deuxieme avis bloque par unicite rental/access.
- La fonction DB `can_user_review_rental_request` exige un `agent_runs.status = succeeded`.

## 9. Revenus Creator

Role : creator puis admin.

1. Ouvrir `/code`.
2. Verifier `Revenus beta`.
3. Ouvrir `/code/admin/ops` et `/code/admin/payments`.

Preuve attendue :

- Creator voit GMV sandbox agrege uniquement sur ses agents.
- Aucun email user, rental ID, input, output ou session Stripe sensible n'est expose au creator.
- Admin voit les ecarts payments / access / ledger.
- Message clair : aucun payout reel en beta.

## Go / No-Go

Go si :

- Le flow complet passe sur au moins un assistant guide et un agent avance beta.
- Aucun P0/P1 ouvert sur auth, checkout, access, workspace, run, review, RLS ou revenus.
- Les checks locaux passent.

No-Go si :

- Un paiement paid ne cree pas d'acces ou devient impossible a diagnostiquer.
- Un user voit les donnees d'un autre user.
- Un avis peut etre cree sans execution reussie.
- Un creator voit des donnees privees user.
- Un runtime disabled reste achetable ou executable.
