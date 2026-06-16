# AgentHub Marketplace Completion Audit

Objectif audite :

```text
creation agent
-> precheck securite
-> review admin
-> marketplace
-> location
-> workspace adapte
-> execution
-> historique
-> avis
-> revenus creator
```

Ce document separe ce qui est prouve automatiquement, ce qui est rendu par les pages serveur, et ce qui reste a verifier par un smoke manuel ou navigateur interactif.

## Commandes de preuve locales

```bash
npm run smoke:agenthub:local
npm run typecheck
npm run build
npm run lint
```

La commande `npm run smoke:agenthub:local` lance :

- `scripts/agenthub-e2e-invariants-smoke.sql` ;
- un serveur Next temporaire contre Supabase local ;
- `scripts/agenthub-http-role-smoke.ps1`.

Elle utilise les comptes seed locaux :

- `creator@example.com`
- `admin@example.com`
- `user@example.com`
- mot de passe : `password`

## Matrice De Completion

| Etape | Statut | Preuve actuelle | Reste a prouver |
| --- | --- | --- | --- |
| Creation agent | Partiellement prouve | Page `/code/agents/new` rendue pour creator avec type de publication, assistant guide et preview via smoke HTTP. | Soumission reelle par clic dans le wizard. |
| Precheck securite | Prouve cote DB et surface admin | Smoke SQL cree un precheck `passed`; admin review affiche `Precheck`. | Voir le message precheck apres soumission UI reelle. |
| Review admin | Prouve cote DB et surface admin | Smoke SQL cree une review admin `approved`; `/code/admin/review` rend avec runtime/precheck. | Clic admin reel : approve/request changes/reject sur un agent cree via UI. |
| Marketplace | Prouve cote serveur | Smoke HTTP verifie `/agenthub/search`; smoke SQL verifie agent approuve runtime-enabled. | Voir l'agent cree via UI apparaitre dans la marketplace. |
| Location | Prouve cote DB, partiel cote UI | Smoke SQL cree `payments` + `rental_requests.active`; runtime gating et anti-acces non eligible couverts par code/checks. | Clic `Louer cet agent` reel, Stripe sandbox ou free beta selon env. |
| Workspace adapte | Prouve cote serveur | Pages workspace render; blueprint agent-specific integre dans manifest/recipe/UI. | Verification visuelle du workspace pour un agent cree via UI. |
| Execution | Prouve cote DB/API surfaces | Smoke SQL cree `agent_runs.succeeded`; routes run revalident workspace/dashboard. | Lancement reel depuis l'onglet Use avec un runtime actif. |
| Historique | Partiellement prouve | HTTP smoke verifie surfaces workspace; recipe expose history preview; SQL cree un run persisted. | Reload UI apres run reel et verification historique visible. |
| Avis | Prouve cote DB et partiel UI | Migration `can_user_review_rental_request` exige run `succeeded`; smoke SQL verifie bloque avant run et autorise apres run. | Publication d'un avis par formulaire UI apres run reel. |
| Revenus creator | Prouve cote DB et surfaces | Smoke SQL ecrit `creator_revenue_ledger`; admin ops/code surfaces rendent; analytics agreges cote serveur. | Voir le montant apparaitre apres achat reel dans `/code`. |

## Go / No-Go Actuel

Go technique local :

- `npm run smoke:agenthub:local` passe.
- `npm run typecheck` passe.
- `npm run build` passe.
- `npm run lint` passe avec un warning font connu dans `src/app/layout.js`.

No-Go pour marquer l'objectif complet :

- pas encore de preuve clic reel du wizard creator ;
- pas encore de preuve clic reel admin review ;
- pas encore de preuve clic reel user rent/run/review/revenue sur le meme agent.

## Smoke Manuel Final Requis

Avant de marquer l'objectif complet, executer au moins une fois :

```text
creator
-> /code/agents/new
-> creer un agent depuis template
-> submit

admin
-> /code/admin/review
-> verifier precheck/runtime/workspace
-> approve

user
-> /agenthub/search
-> ouvrir l'agent approuve
-> louer/activer
-> ouvrir workspace
-> lancer une execution
-> recharger workspace
-> verifier historique
-> publier avis

creator
-> /code
-> verifier revenus beta / GMV sandbox
```

Checklist de capture :

```text
docs/agenthub-final-ui-smoke-checklist.md
```

L'objectif peut etre considere complete uniquement si ce smoke manuel passe sans P0/P1.
