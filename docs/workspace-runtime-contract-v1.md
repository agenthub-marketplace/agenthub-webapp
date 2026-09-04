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
- fallbackPath
- primaryActionLabel
- nextActions
- nextStep
- startupPlan
- setupChecklist
- outcomeChecklist
- successCriteria
- trustWarnings
- historyCount
- historyPreview
- limits
- readiness
```

`readiness` contient maintenant aussi un score synthétique :

```text
- status: ready | attention | blocked
- score: 0-100
- scoreLabel
- scoreDetail
```

Ce score est un signal d'orientation utilisateur. Il ne remplace jamais les
garde-fous serveur des routes d'exécution.

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
support_state
```

Chaque bloc indique :

```text
- label
- detail
- tab
- status: ready | attention | disabled | hidden
- required
```

## Intégration UI

`workspaceRecipe` est branché dans les workspaces FR/EN via
`WorkspaceAgentExperience`.

La première intégration reste volontairement légère :

- chaque onglet affiche les blocs pertinents pour son contexte ;
- les statuts `ready`, `attention` et `disabled` sont visibles avant le bloc
  runtime ou les empty states ;
- `/agenthub/workspace/[rentalId]` et `/en/workspace/[rentalId]` utilisent le
  même contrat ;
- les runners existants restent inchangés ;
- les détails sensibles de l’infra creator restent server-only.

La prochaine étape n’est pas de réécrire tout le workspace. Elle consiste à
faire évoluer les runners pour consommer davantage de la recette :

- masquer ou prioriser certains blocs selon le statut du run courant ;
- afficher une progression plus fine pour `workflow_automation` ;
- afficher un état d’indisponibilité plus actionnable pour `creator_endpoint` ;
- préparer un mode diagnostic admin sans exposer d’URL ou de payload privé.

Premier incrément runner :

- les messages `disabledMessage` du contrat expliquent maintenant l’action
  attendue selon le runtime : config serveur, runtime settings, asset/security
  review, endpoint creator ou clé manquante ;
- les runners assistant, document, workflow et endpoint affichent un bloc
  d’état visible lorsque l’exécution est fermée ;
- `WorkspaceAgentExperience` affiche aussi un résumé global de la recette :
  runtime, action principale, historique, limites et blocage éventuel ;
- aucune route d’exécution n’est assouplie : les API restent source de vérité
  pour les checks d’accès, runtime, assets et secrets.

Deuxième incrément runner :

- `workspaceRecipe.nextActions` donne une séquence courte et localisée
  d'actions utilisateur selon le runtime actif ;
- assistant : décrire le besoin, générer la réponse, retrouver le résultat ;
- document : ajouter un PDF/DOCX texte, vérifier l’extraction, lancer l’action ;
- workflow : fournir le contexte, suivre les états du workflow, relire le
  résultat et l’historique ;
- endpoint creator : rappeler la frontière creator-hosted, envoyer la demande,
  gérer proprement l’indisponibilité ;
- si le runtime est désactivé, `nextActions` devient une action de déblocage
  explicite basée sur `disabledReason`.

Troisième incrément workspace dynamique :

- `workspaceRecipe.startupPlan` expose un parcours de démarrage structuré,
  localisé et spécifique au runtime ;
- assistant : cadrer la demande, générer la réponse, conserver le résultat ;
- document : préparer un PDF/DOCX texte, vérifier l'extraction, analyser et
  sauvegarder ;
- workflow : préparer le contexte, lancer le workflow, relire le résultat
  final ;
- endpoint creator : confirmer la frontière infra creator, envoyer à l'agent
  API, relire la sortie stockée ;
- le plan reprend les signaux serveur de readiness : setup requis,
  disclosure creator infra, runtime désactivé et historique existant ;
- l'UI affiche ce plan dans `WorkspaceAgentExperience` sans modifier les
  runners ni les routes d'exécution.

## Creator Infra Fallback Signals

Pour `creator_endpoint`, le contrat workspace doit garder une frontière nette :

```text
AgentHub orchestre, signe et historise.
Le creator exécute derrière un endpoint approuvé.
Le navigateur user ne contacte jamais l'endpoint creator directement.
```

Les signaux autorisés dans `workspaceRecipe` sont :

```text
- infraMode: creator_hosted
- endpointStatus: approved | suspended | unavailable | unknown
- healthStatus: ok | stale | failed | not_checked
- disclosureRequired: true
- lastRunStatus: queued | running | succeeded | failed
- disabledReason
```

Les signaux interdits côté workspace user :

```text
- endpoint URL brute si elle n'est pas explicitement publique ;
- HMAC secret ;
- service role ;
- payload complet ;
- données privées d'autres users ;
- stack traces ;
- logs internes d'admin.
```

### Readiness Pour Endpoint Creator

La recette expose maintenant un état synthétique non sensible :

```text
readiness.status: ready | blocked
readiness.infraMode: agenthub_hosted | hybrid | creator_hosted
readiness.disclosureRequired: true | false
readiness.blockers: string[]
```

Pour `creator_endpoint`, cela remplace l'ancien signal conceptuel
`creatorInfraReady`. Les blockers restent volontairement user-safe :

```text
runtime disabled message
endpoint unavailable message
security/runtime gate message
agent/access closed message
```

Le workspace user transforme ces blockers en copy actionnable :

```text
L'infrastructure creator n'est pas encore disponible pour cet agent.
L'endpoint creator a ete suspendu par l'admin.
Le test de disponibilite de l'endpoint doit etre relance.
Cet acces est arrete. Relouez l'agent pour le relancer.
```

L'admin peut voir le détail complet dans `/code/admin/ops/advanced-agents` et
`/code/admin/endpoints`, pas dans le workspace user.

Troisième incrément runner :

- `WorkspaceRecipeV1.readiness` est construit côté serveur ;
- le résumé workspace affiche une carte `Infrastructure` pour distinguer
  `AgentHub-hosted`, `Hybrid execution` et `Creator-hosted` ;
- si le runtime est bloqué, le workspace affiche les blockers readiness sans
  exposer URL endpoint, payload, secret HMAC ou détails admin ;
- cette structure prépare les futurs workspaces par agent : certains resteront
  100% AgentHub, d'autres basculeront vers infra creator validée.

Quatrième incrément runner :

- les pages workspace FR/EN transmettent `workspaceRecipe.readiness` aux
  runners assistant, document, workflow et endpoint creator ;
- chaque runner affiche le même bloc `WorkspaceReadinessNotice` pour éviter
  des messages runtime incohérents entre types d’agents ;
- si `readiness.disclosureRequired = true`, le runner rappelle la frontière
  d’infrastructure sans révéler d’URL, de payload ou de secret ;
- si l’infrastructure creator/hybride est prête, ce bloc est vert et explique
  explicitement que l’appel reste orchestré côté serveur ;
- si un gate bloque l’exécution, le même bloc devient attention et liste les
  blockers user-safe issus du contrat ;
- les boutons d’exécution restent pilotés par `enabled`, donc le changement est
  purement UX et ne relâche aucun garde-fou serveur.

Cinquième incrément workspace setup :

- `workspaceRecipe.setupChecklist` n'est plus un simple miroir des inputs
  requis ;
- le serveur construit une checklist de lancement localisée selon le runtime ;
- assistant : contexte minimal nécessaire ;
- document : un seul PDF/DOCX texte sous la limite configurée ;
- workflow : contexte concis pour permettre les décisions d'étapes ;
- endpoint creator : rappel que l'input peut sortir vers une infra creator
  approuvée via AgentHub ;
- si un runtime est désactivé, la checklist indique de résoudre le blocage
  avant de saisir de vraies données ;
- si un historique existe, la checklist invite à le relire avant de relancer
  une exécution en doublon ;
- l'onglet `Mise en place` affiche cette checklist avant les inputs bruts pour
  guider l'utilisateur entre activation et première exécution.

Sixième incrément reprise d'exécution :

- `workspaceRecipe.lastRun` expose un résumé non sensible de la dernière
  exécution visible par le user ;
- le résumé workspace affiche maintenant `Dernière exécution` avec le statut,
  l'action et la date ;
- ce résumé inclut un conseil localisé : attendre si le run est en cours,
  relire l'erreur si le run a échoué, ou ouvrir le résultat stocké avant de
  relancer ;
- les quatre runtimes partagent ce signal : assistant, document, workflow et
  endpoint creator ;
- si aucun run n'existe, le workspace indique clairement que l'historique sera
  créé après la première exécution ;
- ce signal aide l'utilisateur à reprendre un agent déjà utilisé avant de
  relancer un run inutile.

Septième incrément validation du résultat :

- `workspaceRecipe.outcomeChecklist` expose une checklist non sensible pour
  juger si le résultat correspond à la promesse de l’agent ;
- elle est construite côté serveur depuis `outputPromise.summary`, les exemples
  publiés et le statut du dernier run ;
- l’onglet `Avis` affiche cette checklist avant le formulaire d’avis vérifié ;
- elle rappelle de lancer l’agent au moins une fois, de relire l’erreur si le
  dernier run a échoué, et de vérifier les limites publiées ;
- ce changement ne modifie pas l’éligibilité des avis : il améliore la qualité
  du feedback sans toucher aux règles serveur.

Huitième incrément critères de réussite :

- `workspaceRecipe.successCriteria` expose les critères permettant de décider
  si une exécution est réellement exploitable ;
- ces critères sont construits côté serveur depuis la promesse de sortie, le
  premier exemple publié, le runtime et le dernier run ;
- assistant : vérifier que la réponse respecte le format demandé ;
- document : vérifier que l’analyse se limite au texte extrait et signale les
  incertitudes ;
- workflow : vérifier qu’une décision visible mène à une sortie cohérente ;
- endpoint creator : vérifier que la sortie respecte le contrat approuvé de
  l’infra creator ;
- l’onglet `Détails` affiche ces critères à côté des livrables, exemples et
  limites, sans exposer de payload, d’URL endpoint ou de secret.

Neuvième incrément fallback infra créateur :

- `workspaceRecipe.fallbackPath` expose un parcours de secours user-safe quand
  l’agent utilise une infrastructure créateur ou quand le runtime est bloqué ;
- le signal est construit côté serveur à partir de `infraMode`, de la
  readiness runtime et des disclosures du manifest ;
- il rappelle que le navigateur user n’appelle jamais directement l’endpoint
  créateur : AgentHub signe, proxifie, historise et garde le contrôle d’accès ;
- si le runtime est désactivé, le parcours demande de résoudre le blocage
  avant d’envoyer un vrai contexte utilisateur ;
- l’onglet `Mise en place` affiche ce parcours à côté des avertissements de
  confiance, sans révéler d’URL endpoint, de payload complet, de HMAC secret ou
  de détail admin.

Dixième incrément prochaine étape :

- `workspaceRecipe.nextStep` expose une recommandation de navigation
  server-side pour guider l’utilisateur vers le bon onglet ;
- si le runtime est bloqué, la prochaine étape renvoie vers `Mise en place`
  avec le message de blocage user-safe ;
- si des inputs ou une disclosure infra creator sont nécessaires, elle renvoie
  vers `Mise en place` avant toute exécution ;
- si un run est en cours ou a échoué, elle renvoie vers `Utiliser` pour suivre
  ou relancer ;
- si aucun historique n’existe, elle renvoie vers `Utiliser` pour créer le
  premier résultat stocké ;
- si un résultat existe, elle renvoie vers `Avis` pour relire le résultat et
  laisser un feedback vérifié ;
- le CTA est affiché dans le résumé workspace et ne change aucune règle
  serveur d’exécution ou d’éligibilité review.

Onzième incrément score readiness :

- `workspaceRecipe.readiness.score` expose une estimation 0-100 de préparation
  du workspace ;
- le score est calculé côté serveur depuis les gates runtime, le setup requis,
  la frontière infra creator/hybride, les warnings de confiance et le dernier
  run connu ;
- `ready` indique que le workspace est prêt pour une première exécution utile ;
- `attention` indique qu’un setup, une disclosure ou une reprise d’historique
  mérite d’être traité avant lancement ;
- `blocked` indique que l’exécution est fermée par un gate runtime ;
- l’UI affiche ce score dans le résumé workspace sans assouplir les boutons,
  les API routes, les checks d’accès, les reviews sécurité ou les secrets
  serveur.

Douzième incrément état support :

- `workspaceRecipe.blocks` inclut maintenant le bloc `support_state` ;
- il apparaît dans l’onglet `Utiliser` avant le runner quand un signal mérite
  l’attention de l’utilisateur ;
- si le runtime est bloqué, il reprend le `disabledReason` user-safe et devient
  requis ;
- si l’agent utilise une infra creator/hybride ou possède un warning de
  confiance, il affiche le premier signal utile avant l’exécution ;
- le bloc reste masqué quand aucun support state n’est actif ;
- il ne contient pas d’URL endpoint, de payload complet, de secret HMAC, de
  stack trace ou de détail réservé admin.

Treizième incrément reprise depuis le dernier run :

- `workspaceRecipe.historyPreview` expose un aperçu court du dernier run déjà
  visible par le propriétaire de l’accès ;
- il contient un détail de reprise, un extrait d’input et un extrait d’output
  tronqués ;
- il aide l’utilisateur à reprendre le travail avant de relancer une exécution
  inutile ;
- il ne remplace pas l’historique complet des runners et ne charge aucune
  donnée supplémentaire ;
- il reste scoped au workspace user courant, comme `agent_runs`.
