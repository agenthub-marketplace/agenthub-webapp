# Agent-Specific Workspace Blueprint

## Objectif

Faire évoluer le workspace AgentHub d'un rendu principalement piloté par le
runtime vers un workspace vraiment spécifique à chaque agent.

Le runtime répond à la question :

```text
comment l'agent s'exécute ?
```

Le blueprint agent répond à la question :

```text
qu'est-ce que l'utilisateur doit fournir, voir, valider et conserver pour cet agent précis ?
```

## État Actuel

Déjà en place :

- `WorkspaceManifestV1` : runner, infra mode, setup, trust boundary, tabs.
- `WorkspaceRecipeV1` : next actions, startup plan, readiness, success criteria,
  history preview, fallback path.
- Runners : assistant, document, workflow, creator endpoint.
- Admin review : manifest, precheck, compatibility workspace.
- Creator preview : stratégie workspace avant soumission.

Limite actuelle :

```text
Deux agents du même runtime peuvent encore avoir une expérience proche, même si
leur métier est différent.
```

Première implémentation :

```text
src/server/agents/workspace-blueprint.ts
```

Le helper dérive `AgentWorkspaceBlueprintV1` sans migration, puis le remonte via
`WorkspaceManifestV1` et `WorkspaceRecipeV1`. Le workspace user affiche déjà :

- frontière de confiance dans l'onglet présentation : données conservées par
  AgentHub, données envoyées à l'infra créateur approuvée, avertissements user ;
- inputs spécifiques à l'agent dans l'onglet setup ;
- rappel de lancement agent-aware dans l'onglet utiliser ;
- structure de sortie attendue dans l'onglet détails ;
- résultat attendu, critères et support hints dans l'onglet avis.

Le même signal est aussi consommé dans :

- `AgentManifestV1`, pour exposer le blueprint dans la review admin ;
- `SecurityPrecheckV0`, pour valider que le workspace aura des inputs et
  sorties exploitables ;
- `/code/admin/review`, pour permettre à l'admin de vérifier le workspace avant
  publication.

## Contrat Cible

Ajouter progressivement un blueprint par agent, dérivé des champs existants
avant toute migration :

```ts
type AgentWorkspaceBlueprintV1 = {
  inputSchema: {
    fields: {
      key: string;
      label: string;
      helper: string;
      required: boolean;
      example: string;
    }[];
  };
  outputSchema: {
    sections: {
      key: string;
      label: string;
      expectedContent: string;
    }[];
  };
  runChecklist: string[];
  successCriteria: string[];
  supportHints: string[];
  trustBoundary: {
    dataSentToAgentHub: string[];
    dataSentToCreatorInfra: string[];
    userWarnings: string[];
  };
};
```

V0 ne nécessite pas de nouveau champ DB. Le blueprint peut être dérivé de :

- `runtime_type`;
- `workspace_mode`;
- `setup_requirements`;
- `output_promise`;
- `capabilities`;
- `required_inputs`;
- `deliverables`;
- `limitations`;
- `workspace_actions`;
- workflow steps ou endpoint config si disponibles côté serveur.

## Règles Produit

- Le blueprint ne remplace jamais les checks serveur d'exécution.
- Le user ne voit pas les secrets, URLs privées, payloads internes ou détails
  Stripe.
- Le creator endpoint doit afficher un disclosure clair avant exécution.
- Le workflow doit afficher la décision attendue quand elle existe.
- Le document runtime doit rappeler les limites PDF/DOCX et l'absence d'OCR.
- Le résultat attendu doit être assez clair pour guider l'avis vérifié.

## Exemples Beta

### Support Triage Agent

Input schema :

- demande client ;
- contexte produit ;
- urgence ressentie ;
- canal de réponse souhaité.

Output schema :

- catégorie ;
- priorité ;
- réponse client ;
- checklist interne ;
- points à escalader.

Critère de succès :

```text
Le workflow prend une décision priorité/catégorie visible, puis produit une
réponse exploitable sans inventer de politique support.
```

### Lead Qualification Agent

Input schema :

- profil prospect ;
- contexte entreprise ;
- besoin exprimé ;
- offre à vendre.

Output schema :

- score 0-100 ;
- décision qualified/maybe/no ;
- raisons principales ;
- next action ;
- message de suivi.

Critère de succès :

```text
Le workflow explique son scoring et propose une prochaine action cohérente.
```

### CRM Enrichment API Agent

Input schema :

- nom société ou prospect ;
- secteur ;
- contexte commercial ;
- objectif d'enrichissement.

Output schema :

- payload normalisé envoyé ;
- enrichissement retourné ;
- résumé lisible ;
- signaux manquants ;
- points à vérifier manuellement.

Trust boundary :

```text
AgentHub garde accès, paiement, historique et avis. L'exécution d'enrichissement
passe par un endpoint creator HTTPS approuvé et signé côté serveur.
```

## Plan D'Implémentation

### Phase 1 - Blueprint Dérivé Sans Migration

- Créer un helper server-only :

```text
src/server/agents/workspace-blueprint.ts
```

- Entrée :

```text
AgentContract + agent metadata + runtime assets optionnels
```

- Sortie :

```text
AgentWorkspaceBlueprintV1
```

- Brancher le blueprint dans `WorkspaceManifestV1` ou `WorkspaceRecipeV1`.
- Afficher seulement les sections déjà utiles dans le workspace actuel.

Statut :

```text
Implémenté en V0.
```

### Phase 2 - Preview Creator/Admin

- Creator voit le blueprint dans `/code/agents/new` et `/code/agents/[id]/edit`.
- Admin voit le blueprint dans `/code/admin/review`.
- Le precheck signale :
  - input schema vide ;
  - output schema incohérent ;
  - trust boundary manquante ;
  - workflow sans décision claire ;
  - endpoint sans disclosure.

Statut :

```text
Implémenté en V0 sur le parcours creator/admin :
- le wizard creator `/code/agents/new` affiche une preview blueprint dérivée
  des inputs, livrables, promesse, runtime et mode workspace ;
- l'écran creator `/code/agents/[id]/edit` affiche le même signal avant
  resoumission après retour admin ;
- le manifest admin expose inputs, sorties et trust/support hints ;
- le précheck ajoute des passes/warnings `workspace_blueprint_*`.
```

### Phase 3 - Workspace Agent-Aware

- Le setup tab affiche les champs attendus de l'agent.
- Le use tab affiche l'action principale, les critères d'entrée et le rappel
  de lancement dérivé du blueprint.
- Le result/history tab compare la sortie avec l'output schema.
- Le review tab rappelle les critères de succès et la structure attendue avant
  avis.

### Phase 4 - Blueprint Persisté Plus Tard

Une migration ne devient utile que si les blueprints dérivés sont insuffisants.
Le schéma futur pourrait vivre dans `agent_versions.workspace_blueprint`, mais
ce n'est pas nécessaire pour la prochaine beta.

## Critère De Sortie

```text
Deux agents du même runtime ont des workspaces différents, adaptés à leur
promesse, leurs inputs, leurs sorties attendues et leur frontière de confiance.
```

## Non Objectifs

- Pas de builder visuel.
- Pas de node editor.
- Pas de code creator.
- Pas de n8n.
- Pas de migration tant que le blueprint dérivé suffit.
- Pas de modification Stripe/payout.
