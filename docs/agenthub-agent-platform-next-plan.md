# AgentHub Agent Platform - Plan De Suite

## Objectif

Faire passer AgentHub du stade "marketplace avec runtimes beta" au stade
"plateforme d'agents utilisables" :

```text
user se connecte
-> trouve un agent adapté
-> loue l'agent
-> configure le workspace
-> lance l'agent
-> retrouve résultat, historique, support et avis vérifié
```

Et côté creator :

```text
creator poste un agent
-> précheck sécurité automatique
-> review admin/security
-> publication marketplace
-> runs utilisateurs suivis
-> revenus beta tracés
-> payouts réels plus tard
```

Le plan ci-dessous ne remplace pas les docs existantes. Il les ordonne en une
séquence d'exécution.

## État Actuel Confirmé

Fondations déjà présentes :

- AgentHub user : auth, marketplace, location, workspace, avis vérifiés.
- AgentHub Code : console creator/admin.
- Runtimes : assistant guidé, document, workflow automation, creator endpoint.
- `runtime_type` comme champ de routage produit.
- `agent_runs` comme historique d'exécution.
- Workflow automation beta et creator endpoint beta.
- Document input PDF/DOCX beta.
- Workspace runtime contract et première recette de blocs workspace.
- Creator infra fallback documenté via `creator_endpoint`.
- Security review manuelle pour runtimes sensibles.
- Security precheck déterministe persistant.
- Revenue beta et ledger interne.
- Admin ops et diagnostics agents avancés.

Dette principale :

- Les runtimes existent, mais le workspace n'est pas encore assez "agent-aware".
- Le précheck sécurité aide déjà l'admin, mais n'est pas encore un vrai agent de
  tri avec synthèse exploitable.
- Creator infra fallback existe côté contrat/API, mais doit être plus visible et
  plus testable.
- Le ledger existe, mais les revenus ne sont pas encore un vrai système de
  payout creator.
- Les boucles Codex existent, mais doivent être utilisées comme workers de
  vérification bornés, pas comme refactors concurrents.

## Principe Directeur

Chaque agent publié doit être gouverné par quatre contrats :

```text
Agent Manifest
  Ce que l'agent promet, son runtime, ses assets, son risque.

Workspace Runtime Contract
  Ce que l'utilisateur peut faire maintenant, dans quel état.

Workspace Recipe
  Les blocs d'interface nécessaires pour setup, run, historique, avis.

Security / Revenue Gates
  Ce qui permet ou bloque publication, exécution, revenus et futurs payouts.
```

Les API d'exécution restent la source de vérité :

```text
/api/agent-runs
/api/agent-runs/document
/api/agent-runs/workflow
/api/agent-runs/endpoint
```

La UI ne doit jamais bypasser :

- ownership user ;
- accès actif ;
- runtime activé ;
- asset approuvé ;
- security review ;
- limites input/coût ;
- secret server-only ;
- endpoint creator signé côté serveur.

## Phase 1 - Workspace Multi-Agent Fiable

Objectif : tout agent loué doit ouvrir un workspace compréhensible, même si le
runtime est indisponible.

À faire :

1. Faire consommer `workspaceRecipe` par tous les panneaux runtime.
2. Unifier le workspace FR/EN autour du même rendu de blocs.
3. Afficher les états critiques avant les empty states :
   - paiement en attente ;
   - activation bloquée ;
   - accès arrêté ;
   - agent suspendu ;
   - runtime désactivé ;
   - endpoint indisponible ;
   - security/asset review manquante.
4. Ajouter une vue "setup" propre par runtime :
   - assistant : contexte texte ;
   - document : upload + extraction ;
   - workflow : contexte + étapes ;
   - endpoint : disclosure infra creator + input.
5. Ajouter "Voir plus" et filtre dans l'historique des runs.
6. Ajouter un diagnostic support admin-only sans exposer payloads/URLs privées.

Critère de sortie :

```text
Un user comprend quoi faire dans le workspace sans connaître le runtime.
Un admin comprend pourquoi un workspace est bloqué sans lire la DB.
```

## Phase 2 - Agent Sécurité De Pré-Tri

Objectif : automatiser le tri initial des agents soumis avant review admin.

V0 déterministe existe déjà. Prochaine version :

1. Générer un `AgentManifestV1` snapshot lisible.
2. Exécuter les checks déterministes :
   - runtime connu/activé ;
   - creator allowlisté ;
   - workflow valide ;
   - endpoint approuvé ;
   - security review requise ;
   - data disclosure présente ;
   - promesse compatible avec le runtime.
3. Ajouter une synthèse LLM server-side sur le résultat déterministe :
   - résumé admin ;
   - risques principaux ;
   - questions à poser au creator ;
   - recommandation non bloquante.
4. Trier `/code/admin/review` par risque :
   - blockers ;
   - security required ;
   - warnings ;
   - standard review.
5. Écrire chaque décision dans `audit_logs`.

Règles :

- l'agent sécurité ne publie jamais ;
- ne rejette jamais automatiquement ;
- n'appelle jamais endpoint creator ;
- n'exécute jamais code creator ;
- ne lit jamais inputs privés user.

Critère de sortie :

```text
L'admin ouvre une file déjà triée avec un compte rendu exploitable.
```

## Phase 3 - Workspaces Spécifiques Par Agent

Objectif : le workspace ne dépend plus seulement du runtime, mais aussi du type
d'agent et de son manifest.

À faire :

1. Étendre `AgentManifestV1` :
   - input schema simple ;
   - output schema simple ;
   - setup schema ;
   - success criteria ;
   - support instructions ;
   - trust/data disclosure.
2. Transformer les templates en manifest presets.
3. Générer une `workspaceRecipe` plus fine :
   - blocs obligatoires ;
   - blocs optionnels ;
   - placeholders d'input ;
   - exemples de prompt ;
   - critères de réussite ;
   - limites visibles.
4. Ajouter un preview creator/admin :
   - fiche publique ;
   - workspace setup ;
   - run result shape ;
   - security/data boundary.

Exemples :

- Support Triage Agent :
  - input ticket ;
  - décision priorité/catégorie ;
  - sortie réponse client + checklist interne.
- Lead Qualification Agent :
  - input lead ;
  - décision score/qualification ;
  - sortie next action commercial.
- CRM Enrichment API Agent :
  - disclosure creator infra ;
  - endpoint status ;
  - sortie enrichissement normalisé.

Critère de sortie :

```text
Deux agents du même runtime peuvent avoir des workspaces différents et utiles.
```

## Phase 4 - Creator Infra Fallback Produit

Objectif : permettre de vendre des agents dont l'exécution spécialisée vit chez
le creator, tout en gardant AgentHub comme couche confiance/commerciale.

V0 actuel :

```text
AgentHub server -> endpoint creator HTTPS signé -> résultat stocké dans agent_runs
```

À renforcer :

1. Disclosure user claire avant exécution :
   - quelles données partent vers le creator ;
   - pourquoi ;
   - limites de confidentialité ;
   - historique conservé par AgentHub.
2. Health checks endpoint :
   - HTTPS ;
   - pas localhost/IP privée ;
   - timeout ;
   - JSON valide ;
   - taille réponse ;
   - test HMAC.
3. Kill switch :
   - par endpoint ;
   - par creator ;
   - par runtime.
4. Journalisation safe :
   - statut ;
   - taille réponse ;
   - latence ;
   - error code ;
   - jamais payload complet ni secret.
5. Admin readiness score :
   - endpoint approved ;
   - health ok ;
   - security passed/waived ;
   - disclosure présent ;
   - dernier run réussi.

À ne pas faire encore :

- iframe creator ;
- redirect externe ;
- OAuth tiers ;
- session handoff ;
- exécution code creator ;
- n8n.

Critère de sortie :

```text
Un Agent API creator peut être loué et exécuté en beta sans que le user quitte
AgentHub.
```

## Phase 5 - Revenus Creator Avant Payout

Objectif : préparer les vrais revenus sans brancher Stripe Connect trop tôt.

À faire :

1. Stabiliser le ledger :
   - `payment_paid` ;
   - `access_created` ;
   - `activation_blocked` ;
   - `access_stopped` ;
   - futur `refund_created` ;
   - futur `payout_hold_created` ;
   - futur `payout_ready`.
2. Ajouter un rapprochement admin :
   - paiement paid sans access ;
   - access sans ledger ;
   - ledger earned sans payment ;
   - stopped access sans trace ;
   - blocked activation.
3. Côté creator :
   - GMV sandbox ;
   - agents vendus ;
   - événements ledger ;
   - revenus beta non payables ;
   - pourquoi ce n'est pas encore payable.
4. Avant Stripe Connect :
   - policy refund/support ;
   - délai de hold ;
   - statut payout ;
   - KYC creator ;
   - commission plateforme.

Critère de sortie :

```text
On peut expliquer à un creator ce qu'il a vendu, ce qui est gagné en beta, et
pourquoi aucun payout réel n'est encore déclenché.
```

## Phase 6 - Agents Beta À Tester

Objectif : prouver l'usage avec peu d'agents mais bien choisis.

Agents avancés prioritaires :

1. `Support Triage Agent`
   - runtime : `workflow_automation`
   - décision LLM : priorité + catégorie
   - sortie : réponse client + checklist interne

2. `Lead Qualification Agent`
   - runtime : `workflow_automation`
   - décision LLM : qualified/maybe/no + score
   - sortie : prochain message + next action

3. `CRM Enrichment API Agent`
   - runtime : `creator_endpoint`
   - infra : endpoint HTTPS creator réel
   - sortie : enrichment JSON normalisé + résumé utilisateur

Agents assistant/document utiles mais non "agent avancé" :

- Meeting Notes Checklist ;
- LinkedIn Content Studio ;
- Contract Reading Assistant ;
- Document Summary Pro.

Critère de sortie :

```text
Chaque agent avancé passe :
creator -> admin/security -> marketplace -> checkout -> workspace -> run -> history -> review.
```

## Phase 7 - Orchestration Par Boucles Codex

Les conversations dédiées doivent agir comme workers spécialisés, séquentiels,
avec rapports courts. Ne pas lancer plusieurs boucles qui touchent au même
scope en même temps.

Ordre recommandé :

1. `workspace-fluidity`
   - vérifier le parcours workspace multi-runtime ;
   - proposer seulement bugs/fluidité, pas refonte.

2. `activation-flow-audit`
   - marketplace -> checkout -> access -> workspace ;
   - chercher boucles, doublons, états bloqués.

3. `verified-reviews-audit`
   - droit à l'avis ;
   - stopped access ;
   - doublons ;
   - visibilité ratings.

4. `admin-review-state-map`
   - soumission creator ;
   - review ;
   - security ;
   - runtime assets ;
   - publication.

5. `creator-submission-guardrails`
   - qualité des templates ;
   - mauvais claims ;
   - runtime mismatch ;
   - preview/warnings.

Format attendu d'un worker :

```text
scope
files read
findings
risks
changes made or none
validation run
git status
recommendation
```

## Décisions À Prendre Maintenant

1. Priorité produit :
   - améliorer workspace utilisateur ;
   - ou automatiser précheck admin ;
   - ou renforcer fallback creator endpoint.

2. Niveau d'automatisation sécurité :
   - déterministe seulement ;
   - ou déterministe + synthèse LLM advisory.

3. Stratégie creator infra :
   - rester endpoint server-side uniquement ;
   - ou préparer plus tard un handoff externe contrôlé.

4. Revenu :
   - continuer GMV sandbox/ledger ;
   - ou commencer spec Stripe Connect/KYC/payout.

## Prochaine Semaine Recommandée

Jour 1 :

- workspace recipe consommée plus largement ;
- historique long + états bloqués prioritaires.

Jour 2 :

- security precheck LLM advisory en lecture seule ;
- aucun auto-approve.

Jour 3 :

- admin review triée par risque + workspace strategy.

Jour 4 :

- creator endpoint readiness score + health check plus visible.

Jour 5 :

- smoke complet 3 agents avancés ;
- rapport blockers ;
- décision beta élargie ou stabilisation.

## Définition De Succès

Le prochain jalon est atteint quand :

```text
3 agents avancés fonctionnent en beta
+ workspace clair par runtime/agent
+ precheck sécurité utile à l'admin
+ fallback creator endpoint compréhensible
+ ledger revenu traçable
+ aucun secret/client leak
+ user peut laisser un avis vérifié après run
```

Ce jalon ne nécessite pas encore :

- Stripe Connect ;
- payout réel ;
- n8n ;
- code package ;
- iframe/redirect creator ;
- upload multi-fichier ;
- OAuth tiers ;
- automation externe non allowlistée.
