# AgentHub Strategic Execution Plan

## Objectif Produit

AgentHub doit devenir une marketplace ou un utilisateur peut :

```text
se connecter
-> trouver un agent adapté
-> louer l'agent
-> configurer le workspace
-> lancer l'agent
-> retrouver les résultats et l'historique
-> laisser un avis vérifié
```

Et ou un creator peut :

```text
créer un agent
-> passer les garde-fous creator
-> obtenir une préanalyse sécurité
-> passer la review admin/security
-> publier
-> suivre les runs et revenus beta
-> recevoir plus tard les revenus réels via payout
```

La direction long terme n'est pas de multiplier des formulaires. La direction
est de rendre chaque agent publiable, testable, contrôlable, monétisable et
exécutable dans le bon workspace.

## État Actuel

Les fondations suivantes existent déjà :

- AgentHub user : marketplace, location, workspace, avis vérifiés.
- AgentHub Code : console creator/admin.
- Runtimes : assistant guidé, document, workflow automation, creator endpoint.
- Workspace runtime contract : décision serveur commune pour les workspaces FR/EN.
- Workspace recipe : premiers blocs dynamiques affichés dans le workspace.
- Security precheck : préanalyse déterministe persistable pour aider l'admin.
- Security review : blocage manuel pour runtimes sensibles.
- Creator infra fallback : contrat documenté pour `creator_endpoint`.
- Revenue beta : analytics GMV sandbox et design du futur ledger.
- Admin ops : diagnostic agents avancés pour comprendre les blocages.

Le produit est donc au-dessus d'une simple démo GPT. Les prochains chantiers
doivent rendre ce socle plus fluide, pas élargir le risque sans garde-fous.

## Principe D'Architecture

Chaque agent publié doit être décrit par trois couches :

```text
Agent Manifest
  Ce que l'agent promet, son runtime, son risque, ses assets, ses gates.

Workspace Runtime Contract
  Ce que l'utilisateur peut faire maintenant, avec quel runner, dans quel état.

Workspace Recipe
  Quels blocs UI afficher, dans quel ordre, avec quels avertissements.
```

Les APIs d'exécution restent la source de vérité :

```text
/api/agent-runs
/api/agent-runs/document
/api/agent-runs/workflow
/api/agent-runs/endpoint
```

Les helpers workspace améliorent l'expérience. Ils ne remplacent jamais les
vérifications serveur : ownership, accès actif, runtime activé, review passée,
limites de coût/input et absence de secrets client.

## Phase 1 - Workspace Adaptatif Fiable

Objectif : chaque runtime doit ouvrir un workspace clair, actionnable et
compréhensible sans que l'utilisateur comprenne la complexité technique.

Travail à faire :

- Faire consommer davantage `workspaceRecipe` par les runners.
- Afficher une progression plus fine pour `workflow_automation`.
- Afficher un état plus actionnable pour `creator_endpoint` :
  - endpoint indisponible ;
  - timeout ;
  - runtime désactivé ;
  - asset ou security review manquant.
- Ajouter un bouton "Voir plus" sur les historiques longs.
- Garder les blocs critiques avant les empty states :
  - activation bloquée ;
  - paiement en attente ;
  - runtime désactivé ;
  - agent suspendu ;
  - endpoint non disponible.
- Unifier les libellés FR/EN autour du même contrat.

Critère de sortie :

```text
Un user peut ouvrir n'importe quel type d'agent et comprendre :
- ce qu'il doit fournir ;
- pourquoi le runner est disponible ou non ;
- ce qui s'est passé lors du dernier run ;
- quoi faire ensuite.
```

## Phase 2 - Agent Sécurité Comme Pré-Tri Admin

Objectif : automatiser le tri initial des agents soumis sans remplacer l'admin.

Ce que l'agent sécurité doit faire :

- Lire un `AgentManifestV1`.
- Produire ou mettre à jour un `agent_security_precheck`.
- Détecter :
  - runtime non activé ;
  - creator non allowlisté ;
  - workflow incomplet ;
  - endpoint non approuvé ;
  - security review manquante ;
  - promesse publique incompatible avec le runtime ;
  - risque data non expliqué ;
  - prix ou livrables suspects.
- Donner une recommandation :
  - review standard ;
  - demander modifications ;
  - security review requise ;
  - rejet probable ;
  - review manuelle approfondie.

Ce qu'il ne doit pas faire :

- approuver automatiquement ;
- rejeter automatiquement ;
- appeler un endpoint creator ;
- exécuter du code creator ;
- accéder aux inputs privés user ;
- exposer des secrets.

Critère de sortie :

```text
La file admin est triée par risque réel, avec les blockers visibles avant que
l'admin ouvre le détail de l'agent.
```

## Phase 3 - Creator Submission Guardrails

Objectif : empêcher les mauvais agents d'arriver trop loin dans le pipeline.

Travail à faire :

- Ajouter une preview creator des warnings qualité avant soumission.
- Montrer clairement :
  - promesse trop vague ;
  - livrables manquants ;
  - limitations faibles ;
  - inputs insuffisants ;
  - runtime avancé sans asset ;
  - endpoint/API sans disclosure data ;
  - workflow sans vraie décision ou étape utile.
- Garder la validation serveur inchangée comme source de vérité.
- Ne pas bloquer brutalement les creators en beta, sauf cas dangereux déjà
  couverts par admin/security review.

Idée utile :

```text
Score qualité interne visible côté creator avant submit, puis côté admin après
submit. Public plus tard seulement si le signal devient fiable.
```

## Phase 4 - Infra Creator Fallback V1

Objectif : permettre à AgentHub de vendre et encadrer des agents dont
l'exécution spécialisée vit chez le creator.

V0 actuel :

```text
creator_endpoint = AgentHub appelle serveur -> endpoint creator HTTPS signé
```

V1 à préparer :

- Disclosure user plus visible avant exécution.
- Meilleurs statuts :
  - endpoint approuvé ;
  - endpoint suspendu ;
  - endpoint timeout ;
  - endpoint schema invalide ;
  - creator infra unavailable.
- Tests automatiques d'endpoint côté admin :
  - ping contrôlé ;
  - réponse JSON valide ;
  - taille réponse ;
  - temps de réponse ;
  - HMAC vérifiable.
- Kill switch par endpoint et par creator.
- Journalisation lisible sans payload sensible.

À ne pas faire encore :

- iframe creator ;
- redirect externe workspace ;
- session handoff token ;
- exécution code creator ;
- secrets creator côté client.

## Phase 5 - Revenue Ledger Avant Payout

Objectif : ne pas brancher Stripe Connect avant de savoir auditer qui a gagné
quoi, pourquoi, et dans quel état.

Étapes :

1. Ajouter un ledger interne `creator_revenue_ledger`.
2. Écrire les événements :
   - paiement payé ;
   - accès créé ;
   - activation bloquée ;
   - remboursement futur ;
   - hold payout futur.
3. Afficher creator :
   - GMV sandbox ;
   - agents vendus ;
   - revenus beta non payables ;
   - lignes à surveiller.
4. Afficher admin :
   - paiements sans accès ;
   - accès sans paiement ;
   - ledger incohérent ;
   - futurs montants payout.

Stripe Connect attend :

```text
ledger stable
+ access/payment stable
+ security gates fiables
+ support/refund policy claire
```

## Phase 6 - Agents Beta À Vendre Comme "Vrais Agents"

Objectif : montrer 2 à 3 agents avancés réellement différenciants.

Agents recommandés :

### Support Triage Agent

Runtime : `workflow_automation`

```text
input support
-> classer bug/billing/how-to/feature
-> décider priorité basse/moyenne/haute
-> générer réponse client
-> générer checklist interne
```

Valeur : décision structurée + plusieurs étapes.

### Lead Qualification Agent

Runtime : `workflow_automation`

```text
input lead
-> scorer ICP 0-100
-> décider qualified / maybe / no
-> proposer next action
-> générer message commercial
```

Valeur : décision métier + sortie actionnable.

### CRM Enrichment API Agent

Runtime : `creator_endpoint`

```text
input prospect
-> AgentHub normalise la requête
-> endpoint creator enrichit
-> AgentHub stocke résultat + historique
```

Valeur : preuve que la marketplace peut vendre une capability externe contrôlée.

Critère de sortie :

```text
creator allowlisté
-> agent avancé soumis
-> precheck généré
-> security review passée
-> agent approuvé
-> user loue
-> workspace exécute
-> résultat stocké
-> avis vérifié possible
```

## Phase 7 - Orchestration Par Boucles Spécialisées

Les boucles Codex dédiées doivent rester séquentielles pour éviter les conflits.

Ordre recommandé :

1. `workspace-fluidity`
   - vérifier l'expérience workspace par runtime ;
   - proposer uniquement les correctifs P0/P1 ou docs.
2. `activation-flow-audit`
   - vérifier marketplace -> rent -> checkout -> access -> workspace.
3. `verified-reviews-audit`
   - vérifier éligibilité, unicité, visibilité review.
4. `admin-review-state-map`
   - vérifier transitions creator/admin/security/runtime.
5. `creator-submission-guardrails`
   - vérifier que les creators comprennent les blockers avant submit.

La conversation principale reste le cockpit :

- elle lance une boucle ;
- elle lit le rapport ;
- elle décide quoi garder ;
- elle transforme un constat en ticket produit ;
- elle évite deux modifications concurrentes sur les mêmes fichiers.

## Nouveaux Tickets Recommandés

### Ticket A - Creator Guardrails Preview

Afficher les warnings qualité dans `/code/agents/new` avant soumission.

Critère :

```text
creator voit les manques de promesse, livrables, limites, inputs, runtime asset.
```

Statut :

```text
Première implémentation en place dans le wizard creator :
- scoring non bloquant côté client ;
- blockers/warnings issus de l'Agent Contract ;
- checks spécifiques workflow/API ;
- réutilisé dans l'édition/resoumission après retour admin ;
- rappel que la validation serveur/admin reste source de vérité.
```

### Ticket B - Workspace Runner Recipe Consumption

Faire consommer `workspaceRecipe` par chaque runner pour améliorer disabled
states, progression et historique.

Critère :

```text
workflow/API/document/assistant ont chacun des messages contextualisés.
```

### Ticket C - Endpoint Health Check Admin

Ajouter un test endpoint read-only côté admin avant approval.

Critère :

```text
admin voit HTTPS OK, HMAC attendu, JSON valide, timeout et taille réponse.
```

Statut :

```text
V0 implémentée dans `/code/admin/endpoints` :
- bouton admin-only "Tester endpoint" ;
- POST serveur signé et borné ;
- validation URL sûre, timeout, redirect, taille réponse et JSON ;
- `creator_api` exige `output_text` ;
- résultat court visible après retour page ;
- audit log sans stocker la réponse brute.
```

### Ticket D - Revenue Ledger MVP

Créer la table ledger additive et écrire les premiers événements.

Critère :

```text
payment paid + access created + activation blocked alimentent un ledger audit.
```

Statut :

```text
V0 locale implémentée :
- table `creator_revenue_ledger` additive ;
- RLS creator/admin ;
- écritures service-role depuis le fulfillment Stripe ;
- événements idempotents `payment_paid`, `access_created`, `activation_blocked` ;
- aucun Stripe Connect ou payout réel.
```

### Ticket E - Advanced Agent Smoke Pack

Créer un pack de smoke tests manuels/ops pour les 3 agents avancés.

Critère :

```text
un testeur peut valider Support Triage, Lead Qualification et CRM API sans
chercher les étapes dans le code.
```

Statut :

```text
Pack créé dans `docs/advanced-agent-smoke-pack.md` avec :
- préconditions environnement ;
- gates admin obligatoires ;
- inputs de test ;
- décisions attendues ;
- preuves de succès ;
- go/no-go beta avancée.
```

### Ticket F - Creator Infra Compatibility Matrix

Transformer le fallback creator en décision produit/admin explicite.

Critère :

```text
admin sait pourquoi un agent reste natif AgentHub ou bascule vers infra creator.
```

À faire :

- afficher une matrice runtime/capacité dans la review admin ;
- calculer un readiness score interne pour `creator_endpoint` ;
- exposer les blockers :
  - runtime disabled ;
  - creator non allowlisté ;
  - endpoint non approuvé ;
  - health check absent/échoué ;
  - security review manquante ;
  - disclosure user manquante ;
- garder le workspace user limité à une explication claire, sans URL privée ni
  payload.

Preuve attendue :

```text
un agent API creator ne peut être publié que si l'admin voit les gates et sait
quel gate bloque la mise en vente.
```

Statut :

```text
Première implémentation livrée :
- helper server-only `workspace-compatibility.ts` ;
- compatibilité workspace affichée dans l'admin review ;
- manifest/security precheck alignés sur le même signal ;
- creator preview expose la stratégie AgentHub, hybride ou infra creator ;
- docs mises à jour pour éviter des matrices divergentes.

La suite est de brancher ce signal dans le workspace user comme readiness
opérationnel, puis de l'enrichir avec un blueprint propre à chaque agent.
```

### Ticket G - Agent-Specific Workspace Blueprint

Rendre le workspace différent pour deux agents du même runtime.

Critère :

```text
Support Triage Agent, Lead Qualification Agent et CRM Enrichment API Agent ont
chacun leurs inputs attendus, sorties attendues, critères de succès et
frontière de confiance visibles dans le workspace.
```

À faire :

- dériver un blueprint v0 depuis les champs `agent_versions` existants ;
- ne pas ajouter de migration tant que le dérivé suffit ;
- intégrer le blueprint à `WorkspaceManifestV1` ou `WorkspaceRecipeV1` ;
- afficher les sections utiles dans setup/use/review ;
- réutiliser le même blueprint dans creator preview et admin review.

Statut :

```text
V0 implémentée :
- spec dans `docs/agent-specific-workspace-blueprint.md` ;
- helper server-only `workspace-blueprint.ts` ;
- blueprint remonté dans `WorkspaceManifestV1` et `WorkspaceRecipeV1` ;
- workspace user affiche inputs spécifiques, rappel de lancement, sortie
  attendue, rappel avant avis et support hints ;
- creator wizard et écran de resoumission affichent une preview blueprint ;
- admin review affiche inputs, sorties et frontière de confiance ;
- security precheck ajoute les signaux `workspace_blueprint_*`.
```

## Priorité Immédiate

La prochaine meilleure étape n'est plus le Ticket A, déjà en première version.
La priorité devient :

```text
Ticket B -> Workspace Runner Recipe Consumption
Ticket C -> Endpoint Health Check Admin
Ticket D -> Revenue Ledger MVP
Ticket E -> Advanced Agent Smoke Pack
Ticket F -> Creator Infra Compatibility Matrix
Ticket G -> Agent-Specific Workspace Blueprint
```

Raison :

- le creator voit déjà les premiers garde-fous avant submit ;
- le prochain risque principal est côté user workspace : comprendre, lancer,
  reprendre et debugger chaque runtime sans friction ;
- l'endpoint creator doit devenir vérifiable avant approval, pas seulement
  déclaratif ;
- les revenus creator doivent passer d'un GMV sandbox à un ledger auditable
  avant Stripe Connect ;
- les agents avancés ont besoin d'un smoke pack partagé pour éviter les tests
  improvisés.
- le fallback infra creator doit devenir une décision inspectable, pas seulement
  une option runtime.
- les workspaces doivent devenir spécifiques à chaque agent, pas uniquement à
  chaque famille runtime.

## Prochaine Release - Plan D'Exécution

Objectif : rendre les agents avancés testables de bout en bout sans ajouter de
risque inutile.

### 1. Workspace Multi-Runtime Plus Fluide

But :

```text
Un user loue n'importe quel type d'agent et sait immédiatement quoi faire.
```

À faire :

- faire consommer `workspaceRecipe.nextActions` directement par les runners ;
- ajouter un état "voir plus" ou vue complète d'historique quand les runs
  dépassent le résumé ;
- harmoniser les messages runtime désactivé entre assistant, document,
  workflow et endpoint ;
- afficher la progression workflow comme une vraie timeline d'étapes ;
- afficher les erreurs endpoint avec causes lisibles :
  - endpoint non approuvé ;
  - endpoint suspendu ;
  - timeout ;
  - JSON invalide ;
  - runtime désactivé.

Preuve attendue :

```text
assistant, document, workflow et endpoint ont chacun :
- setup clair ;
- action principale claire ;
- état d'exécution clair ;
- historique lisible ;
- message d'erreur contextualisé.
```

### 2. Endpoint Health Check Admin

But :

```text
Un admin peut vérifier un endpoint creator avant de le rendre vendable.
```

À faire :

- action admin read-only "Tester endpoint" ;
- POST serveur avec payload de test borné ;
- validation :
  - HTTPS ;
  - pas localhost/IP privée ;
  - réponse JSON ;
  - `output_text` ou schéma attendu ;
  - timeout ;
  - taille réponse ;
  - HMAC attendu côté documentation ;
- stocker ou afficher le dernier résultat sans payload sensible.

Preuve attendue :

```text
admin voit endpoint OK / timeout / invalid_json / schema_invalid avant approval.
```

### 3. Revenue Ledger MVP

But :

```text
Préparer le vrai revenu creator sans brancher Stripe Connect trop tôt.
```

À faire :

- créer un ledger interne additif ;
- écrire les événements non payants d'abord :
  - `payment_paid` ;
  - `access_created` ;
  - `activation_blocked` ;
- afficher creator :
  - GMV sandbox ;
  - montant non payable ;
  - état payout non configuré ;
- afficher admin :
  - incohérences payment/access ;
  - ledger manquant ;
  - futurs montants payout théoriques.

Preuve attendue :

```text
chaque vente sandbox peut être reliée à un agent, un creator, un accès et un
état ledger sans créer de payout réel.
```

Incrément cockpit creator :

- le dashboard AgentHub Code expose maintenant une action recommandée par agent
  récent : corriger, finaliser, suivre, ou piloter ;
- le tri priorise les retours admin et les brouillons avant les agents déjà
  publiés ;
- le même bloc rappelle l'état `revenueReadiness` quand l'audit revenue n'est
  pas prêt pour la future phase payout ;
- aucune donnée privée user n'est exposée : la guidance est dérivée des états
  agent, review admin et agrégats revenue.

Incrément fit avant location :

- la fiche agent affiche une checklist `Avant de louer` avant le bloc crédits ;
- les cards marketplace affichent maintenant un résumé compact `À préparer` et
  `Résultat attendu` quand ces données existent ;
- la recherche marketplace indexe aussi capacités, inputs, livrables, limites,
  promesse de sortie, exemples et runtime, pas seulement le nom ou la catégorie ;
- elle résume runtime, inputs à préparer, promesse de résultat, setup et
  contraintes spécifiques comme document, workflow ou infra creator ;
- l'objectif est de réduire les locations mauvais-fit avant checkout sans
  changer Stripe, marketplace, RLS ou règles d'accès ;
- le user sait mieux si l'agent répond à son besoin avant de payer/activer.

### 4. Advanced Agent Smoke Pack

But :

```text
Tester les vrais agents beta sans chercher les étapes dans les écrans admin.
```

Pack minimal :

- `Support Triage Agent` ;
- `Lead Qualification Agent` ;
- `CRM Enrichment API Agent`.

Chaque fiche smoke doit contenir :

- creator requis et allowlist ;
- agent template à choisir ;
- champs à remplir ;
- approvals admin nécessaires ;
- security review attendue ;
- input user de test ;
- résultat attendu ;
- erreurs connues ;
- preuve de succès :
  - run réussi ;
  - output stocké ;
  - historique visible après reload ;
  - avis vérifié possible.

### 5. Agent-Specific Workspace Blueprint

But :

```text
Un agent loué affiche une mise en place, une sortie attendue et une checklist
de réussite propres à sa promesse.
```

À faire :

- créer un helper server-only qui dérive `AgentWorkspaceBlueprintV1` ;
- commencer sans migration, à partir de l'Agent Contract et des assets runtime ;
- exposer :
  - input schema simple ;
  - output schema simple ;
  - run checklist ;
  - success criteria ;
  - support hints ;
  - trust boundary ;
- brancher progressivement dans :
  - workspace user ;
  - creator preview ;
  - admin review ;
  - security precheck.

Preuve attendue :

```text
Support Triage et Lead Qualification utilisent tous deux `workflow_automation`,
mais leur workspace ne demande pas les mêmes inputs et ne présente pas les
mêmes critères de succès.
```

### 6. Idées À Préparer Ensuite

Ces idées ne doivent pas devancer les quatre tickets ci-dessus, mais elles
servent la vision "tout type d'agent" :

- Workspace readiness score : indique si le workspace est prêt à lancer l'agent
  avant que le user clique.
- Agent compatibility matrix : montre quels runtimes/features sont supportés
  par AgentHub infra, par creator infra, ou non supportés.
- Agent-specific workspace blueprint : décrit les inputs, outputs, critères de
  réussite et frontière de confiance propres à chaque agent, pas seulement à
  chaque runtime.
- Creator infra SLA beta : dernier test endpoint, taux d'échec, latence
  médiane, erreurs récentes.
- Admin review assistant LLM : résumé narratif du precheck déterministe, sans
  décision automatique.
- Run quality signal : un run réussi + avis vérifié + faible support incident
  améliore la priorité interne de l'agent.
- Payout readiness checklist creator : KYC/Connect plus tard, mais checklist
  visible avant argent réel.

## Ordre Recommandé Des Boucles Codex

Continuer à utiliser les conversations spécialisées, une seule à la fois :

```text
1. workspace-fluidity
2. activation-flow-audit
3. admin-review-state-map
4. creator-submission-guardrails
5. verified-reviews-audit
```

Pourquoi cet ordre :

- le workspace est le coeur de la valeur user ;
- l'activation doit rester stable avant les payouts ;
- l'admin review porte les nouveaux gates endpoint/security ;
- les guardrails réduisent le bruit avant soumission ;
- les reviews vérifiées valident la boucle après usage.
