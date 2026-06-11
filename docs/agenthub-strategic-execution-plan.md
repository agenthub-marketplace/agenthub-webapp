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

### Ticket D - Revenue Ledger MVP

Créer la table ledger additive et écrire les premiers événements.

Critère :

```text
payment paid + access created + activation blocked alimentent un ledger audit.
```

### Ticket E - Advanced Agent Smoke Pack

Créer un pack de smoke tests manuels/ops pour les 3 agents avancés.

Critère :

```text
un testeur peut valider Support Triage, Lead Qualification et CRM API sans
chercher les étapes dans le code.
```

## Priorité Immédiate

La prochaine meilleure étape est :

```text
Ticket A -> Creator Guardrails Preview
```

Raison :

- réduit le bruit admin ;
- améliore la qualité des agents soumis ;
- exploite le score qualité et le manifest déjà présents ;
- n'augmente pas le risque runtime ;
- prépare les vrais agents workflow/API avant d'ouvrir plus largement.
