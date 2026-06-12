# Advanced Agent Smoke Pack

## Objectif

Valider que les agents avances beta ne sont pas seulement des templates, mais des agents vendables et executables dans AgentHub.

Parcours cible :

```text
creator allowliste
-> cree l'agent depuis template
-> admin approuve assets + security review + agent
-> user loue via Stripe sandbox
-> workspace lance le runtime
-> resultat stocke dans agent_runs
-> historique visible apres reload
-> avis verifie possible
```

Ce pack teste trois agents :

- `Support Triage Agent` : `workflow_automation`, LLM-only.
- `Lead Qualification Agent` : `workflow_automation`, LLM-only.
- `CRM Enrichment API Agent` : `creator_endpoint`, endpoint HTTPS creator reel.

## Preconditions Globales

### Environnement

Workflow :

```text
WORKFLOW_RUNS_ENABLED=true
WORKFLOW_WORKER_SECRET configure cote Vercel et Supabase Edge
OPENAI_API_KEY configure
OPENAI_MODEL configure
agent_runtime_settings.workflow_automation.enabled=true
agent_runtime_settings.workflow_automation.run_enabled=true
```

Creator endpoint :

```text
CREATOR_ENDPOINT_RUNS_ENABLED=true
CREATOR_ENDPOINT_SIGNING_SECRET configure
agent_runtime_settings.creator_endpoint.enabled=true
agent_runtime_settings.creator_endpoint.run_enabled=true
```

Paiement :

```text
ACCESS_MODE=paid
PAYMENTS_PROVIDER=stripe
STRIPE_MODE=test
```

### Comptes

Admin :

```text
- peut ouvrir /code/admin
- peut allowlister creator
- peut approuver endpoints, workflows, security reviews et agents
```

Creator :

```text
- role creator
- allowlist workflow_automation pour Support Triage et Lead Qualification
- allowlist creator_endpoint pour CRM Enrichment API
```

User :

```text
- role user
- peut louer depuis marketplace
- peut ouvrir workspace
- peut laisser un avis verifie
```

### Gates Admin Obligatoires

Avant publication :

- runtime global enabled/run_enabled ;
- creator allowliste pour le runtime avance ;
- asset workflow ou endpoint approuve ;
- security review `passed` ou `waived` ;
- agent lui-meme approuve ;
- precheck securite sans blocker P0/P1 non resolu.

## Agent 1 - Support Triage Agent

Runtime : `workflow_automation`

Type : workflow LLM-only avec decision structuree.

### Creation Creator

Template :

```text
Support Triage Agent
```

Workflow attendu :

```text
llm: Classer la demande support par categorie et priorite
llm: Generer une reponse client courte et une checklist interne
```

Promesse :

```text
Transformer une demande support brute en priorite, categorie, reponse client et checklist de suivi.
```

Limites :

```text
- Ne resout pas automatiquement le ticket.
- Ne contacte pas le client.
- Ne remplace pas une decision support humaine pour les cas sensibles.
```

### Input User De Test

```text
Client: agence B2B premium.

Message:
Depuis ce matin, notre equipe ne peut plus exporter les rapports PDF.
Le bouton Export tourne pendant 2 minutes puis affiche une erreur 500.
Nous avons une reunion client dans 3 heures et nous avons besoin du rapport.
Compte impacte: workspace agence-nord.
```

### Decision Attendue

```text
categorie = bug
priorite = haute
raison = blocage fonctionnel + deadline client courte
```

### Sortie Attendue

Le resultat doit contenir :

- categorie ;
- priorite ;
- justification ;
- reponse client proposee ;
- checklist interne ;
- prochaines actions.

### Preuve De Succes

- run workflow `succeeded` ;
- `agent_runs.output_text` non vide ;
- etapes visibles dans le workspace ;
- historique visible apres reload ;
- avis verifie possible.

## Agent 2 - Lead Qualification Agent

Runtime : `workflow_automation`

Type : workflow LLM-only avec scoring et next action.

### Creation Creator

Template :

```text
Lead Qualification Agent
```

Workflow attendu :

```text
llm: Evaluer ICP, urgence, budget et fit produit
llm: Decider qualified/maybe/no, scorer 0-100 et proposer le prochain message
```

Promesse :

```text
Qualifier un lead B2B a partir d'un contexte commercial et proposer la prochaine action.
```

Limites :

```text
- Ne modifie aucun CRM.
- Ne contacte pas le prospect.
- Le score reste une aide a la priorisation, pas une decision automatique.
```

### Input User De Test

```text
Prospect: SaaS RH, 120 employes, France.
Role contact: Head of Operations.
Besoin exprime: automatiser le tri des demandes internes et reduire les delais de reponse.
Timing: veut une solution testable sous 30 jours.
Budget: pas confirme, mais budget transformation ops ouvert.
Objection: equipe IT limitee.
```

### Decision Attendue

```text
qualified = yes ou maybe
score attendu = 70-90
next_action = proposer un call de cadrage + cas d'usage proche
```

### Sortie Attendue

Le resultat doit contenir :

- score ;
- statut qualification ;
- facteurs positifs ;
- risques/objections ;
- prochaine action ;
- email ou message de suivi.

### Preuve De Succes

- run workflow `succeeded` ;
- decision claire visible dans l'output ;
- historique visible apres reload ;
- double clic ne cree pas deux runs actifs ;
- avis verifie possible.

## Agent 3 - CRM Enrichment API Agent

Runtime : `creator_endpoint`

Type : AgentHub appelle une API creator HTTPS approuvee.

### Endpoint Creator Requis

URL :

```text
HTTPS public uniquement
pas localhost
pas IP privee
POST JSON
reponse en moins de 15s
```

Headers envoyes par AgentHub :

```text
x-agenthub-timestamp
x-agenthub-signature
```

Reponse obligatoire :

```json
{
  "output_text": "Resultat textuel exploitable"
}
```

### Creation Creator

Template :

```text
CRM Enrichment API Agent
```

Le creator renseigne :

- nom endpoint ;
- URL HTTPS ;
- disclosure : les inputs utilisateur sont envoyes cote serveur a une API creator approuvee ;
- limites ;
- promesse de resultat.

### Validation Admin

Dans `/code/admin/endpoints` :

1. Cliquer `Tester endpoint`.
2. Attendre `Endpoint OK`.
3. Verifier notes :
   - ownership endpoint ;
   - HMAC compris cote creator ;
   - pas de secrets dans la reponse ;
   - timeout raisonnable.
4. Approuver endpoint.

Dans `/code/admin/security` :

1. Creer ou ouvrir security review liee.
2. Checklist :
   - HTTPS ;
   - pas IP privee ;
   - payload sans paiement/secrets ;
   - HMAC attendu ;
   - output borne ;
   - erreur lisible.
3. Passer `passed` ou `waived`.

Dans `/code/admin/review` :

1. Verifier que l'agent n'a plus de blocker.
2. Approuver l'agent.

### Input User De Test

```text
Entreprise: Notion
Site: notion.so
Segment vise: equipes operations de 50 a 500 personnes
Objectif: preparer une premiere qualification CRM
Contraintes: rester factuel, ne pas inventer de donnees sensibles
```

### Sortie Attendue

Le resultat doit contenir :

- fiche enrichie ;
- hypothese ICP ;
- points d'approche commerciale ;
- donnees manquantes ;
- recommandation de prochaine action.

### Preuve De Succes

- health check endpoint OK avant approval ;
- user peut louer l'agent ;
- workspace affiche disclosure creator infra ;
- appel endpoint `succeeded` ;
- output stocke dans `agent_runs` ;
- historique visible apres reload ;
- endpoint indisponible donne une erreur lisible.

## Go / No-Go

Go beta avancee si :

- les 2 workflows LLM-only reussissent ;
- l'agent API reussit avec un endpoint HTTPS reel ;
- aucun P0/P1 ouvert sur auth, checkout, workspace, RLS ou secrets ;
- admin peut expliquer pourquoi chaque agent est approuve ;
- user peut relire les resultats dans l'historique ;
- avis verifie fonctionne apres usage.

No-Go si :

- workflow reste bloque `queued/running` sans explication ;
- endpoint health check echoue sans message exploitable ;
- security review peut etre contournee ;
- agent avance apparait en marketplace sans asset approuve ;
- user voit une URL endpoint brute, un secret, ou un payload technique ;
- paiement `paid` ne cree pas d'acces actif.

## Donnees A Relever

Pour chaque smoke :

```text
agent slug
agent_version_id
rental_request_id
payment_id
agent_run_id
runtime_type
status final
temps approximatif jusqu'au resultat
erreur visible si echec
avis verifie publie oui/non
```

## Suite Apres Smoke

Si les trois agents passent :

1. Documenter les prompts/inputs gagnants dans le guide testeurs.
2. Lancer 3 a 5 testeurs internes sur ces agents uniquement.
3. Relever incomprehensions workspace et erreurs runtime.
4. Ne corriger que P0/P1 pendant la beta.
5. Garder P2/P3 pour la release suivante.
