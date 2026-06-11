# Workspace Runtime Contract v1

## Objectif

Le workspace AgentHub doit pouvoir ouvrir des agents très différents sans dupliquer la logique dans chaque page.

Le `WorkspaceRuntimeContract v1` centralise la décision serveur suivante :

```text
accès actif
→ type de runtime
→ runner affiché
→ état activé/désactivé
→ message d’indisponibilité
→ limites d’input/fichier
→ historique visible
→ manifest workspace
→ recette de blocs workspace
```

## Fichier

```text
src/server/agents/workspace-runtime-contract.ts
```

## Entrées

```text
- rental
- locale
- actions workspace
- agentRuns déjà chargés
```

Le helper ne charge pas l’accès lui-même. La page reste responsable de :

```text
- authentifier le user ;
- vérifier que le rental appartient au user ;
- refuser les accès fermés ;
- charger les runs visibles.
```

## Sortie

```text
WorkspaceRuntimeContractV1
```

Contient :

```text
- runner.kind
- runner.disabledMessage
- enabled
- documentInputMode
- actions
- history
- limits.maxInputChars
- limits.maxFileBytes
- workspaceManifest
- workspaceRecipe
```

## Runtimes supportés

```text
assistant
document
workflow
creator_endpoint
```

Mapping actuel :

```text
llm_prompt sans document -> assistant
llm_prompt avec document_required/requires_files -> document
document_file -> document
workflow_automation -> workflow
creator_endpoint -> creator_endpoint
```

## Ce que le contrat ne fait pas

Le contrat ne remplace pas les garde-fous des API routes.

Les routes suivantes restent la source de vérité d’exécution :

```text
/api/agent-runs
/api/agent-runs/document
/api/agent-runs/workflow
/api/agent-runs/endpoint
```

Elles doivent continuer à vérifier :

```text
- ownership user ;
- accès actif ;
- agent approuvé ;
- runtime activé ;
- security/asset review ;
- limites de coût/input ;
- absence d’outil non autorisé.
```

## Pourquoi maintenant

Avant ce helper, les pages FR/EN recalculaient chacune :

```text
- llmRunnerEnabled
- documentRunnerEnabled
- workflowRunnerEnabled
- creatorEndpointRunnerEnabled
- disabledMessage
- workspaceManifest
```

Ce contrat réduit la duplication et prépare les prochaines étapes :

```text
- workspace plus personnalisé par agent ;
- agent security precheck visible dans le workspace/admin ;
- fallback infra créateur plus explicite ;
- métriques par runtime/run ;
- futurs runtimes sans exploser les pages.
```

## Workspace Recipe

Le contrat expose maintenant aussi :

```text
workspaceRecipe
```

Cette recette est une couche plus proche de l’UI que `workspaceManifest`.

```text
workspaceManifest = ce que l’agent est et ce qu’il promet
workspaceRecipe = quels blocs le workspace doit afficher et dans quel état
```

La recette contient :

```text
- runtimePanel: assistant | document | workflow | endpoint
- blocks[]
- disabledReason
- primaryActionLabel
- setupChecklist
- trustWarnings
- historyCount
- limits
```

Les blocs sont volontairement génériques :

```text
access_status
agent_goal
setup_checklist
primary_runner
run_status
run_history
result_viewer
trust_boundary
limitations
review_prompt
document_upload
extraction_status
workflow_progress
endpoint_status
```

Chaque bloc indique :

```text
- label
- detail
- tab
- status: ready | attention | disabled | hidden
- required
```

## Prochaine Intégration UI

La prochaine étape n’est pas de réécrire tout le workspace. Elle consiste à
utiliser `workspaceRecipe` pour :

- ordonner les états bloqués avant les empty states ;
- afficher des messages runtime plus spécifiques ;
- rapprocher `/agenthub/workspace/[rentalId]` et `/en/workspace/[rentalId]` ;
- rendre l’onglet "Utiliser" plus cohérent entre assistant, workflow et
  endpoint creator ;
- préparer le fallback infra creator sans exposer d’URL ou de payload privé.
