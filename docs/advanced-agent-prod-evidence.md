# Advanced Agent Prod Evidence

## Objectif

Prouver que la beta agents avances AgentHub est prete en prod sandbox.

Critere final : les trois agents avances ont une ligne `blockers` vide dans le rapport :

```bash
npm run smoke:agenthub:prod-readiness:api
```

## Environnement

| Signal | Valeur / preuve |
| --- | --- |
| Application | `https://agenthub-webapp.vercel.app` |
| Supabase project | `agenthub-beta` (`tntqrrwpgqdzoddppawq`, `eu-west-1`) |
| Stripe mode | Sandbox/test |
| Payment mode | `ACCESS_MODE=paid`, `PAYMENTS_PROVIDER=stripe` |
| Workflow runtime | `workflow_automation` enabled/run_enabled |
| Creator endpoint runtime | `creator_endpoint` enabled/run_enabled |
| Worker | Supabase Edge Function `agent-workflow-worker`, active version 4 |

## Agent 1 - Support Triage Agent

| Signal | Valeur |
| --- | --- |
| Runtime | `workflow_automation` |
| Agent slug | `support-triage-agent-5e763d24` |
| `agent_id` | `5e763d24-417b-4c4d-a5fb-a73544ba875d` |
| `agent_version_id` | `a02669e9-6cf9-4b17-abe3-f91deba53638` |
| Workflow asset status | `approved` |
| Security review status | `passed` |
| Marketplace visible | Oui, agent `approved` |
| Stripe checkout session | `cs_test_a1jFLP6M5iL0xHA3XXNAeXHdoc0t1UxP2Sdux3BgbOfKRbMKX7tULKXvH9` |
| `payment_id` | `5d3d854d-2e52-49dd-8556-2e9d32b700e0` |
| `rental_request_id` | `3905ad1d-9734-41c9-b701-1716886915ae` |
| `agent_run_id` | `e92866b8-dfea-44a6-a2a4-69de5acbead9` |
| `agent_workflow_run_id` | `078ae2df-c399-4642-91ba-35b4cb87ae26` |
| Final run status | `succeeded` |
| Verified review ID | `498d1e43-feef-4544-8427-8e71589e4442` |
| Readiness blockers | Vide |

### Input teste

```text
Demande support urgente avec erreur 500 sur export PDF, deadline client courte,
besoin de priorisation et reponse client.
```

### Resultat observe

```text
Workflow succeeded, resultat stocke dans agent_runs, historique visible apres reload,
avis verifie publie depuis le workspace.
```

## Agent 2 - Lead Qualification Agent

| Signal | Valeur |
| --- | --- |
| Runtime | `workflow_automation` |
| Agent slug | `lead-qualification-agent-b7674170` |
| `agent_id` | `b7674170-81a9-49e9-bcd9-0eb980fd5d7b` |
| `agent_version_id` | `5f261f0e-40f1-4b68-be8a-87c32550ebdf` |
| Workflow asset status | `approved` |
| Security review status | `passed` |
| Marketplace visible | Oui, agent `approved` |
| Stripe checkout session | `cs_test_a1GIjtO0tj7seRDMihn0A8R0wqHepfw0ZykAMpX1FxToP6AQBA1VFaIz6x` |
| `payment_id` | `b4fc86f9-0a49-40c4-a00f-a50f2b26955e` |
| `rental_request_id` | `235c71d4-3963-4af5-b318-1ea938a0c63b` |
| `agent_run_id` | `f5573fa0-7f01-4fb4-a81e-d72f625f2604` |
| `agent_workflow_run_id` | `b5f8fa86-7d06-4509-b64e-b00bb2330741` |
| Final run status | `succeeded` |
| Verified review ID | `737ba1be-bcb4-4b58-9543-9a924d36204d` |
| Readiness blockers | Vide |

### Input teste

```text
Lead inbound: Camille Martin, Head of Ops chez ScaleFlow, 120 employes.
Besoin: automatiser le suivi onboarding client et reduire les relances manuelles.
ICP cible: SaaS B2B 50-300 employes, equipe ops mature, budget outils existant.
Contexte: compare HubSpot, Zapier et une solution interne. Deadline de decision sous 2 semaines.
Objectif: qualifier le lead, donner un score 0-100, expliquer la priorite et proposer le prochain message commercial.
```

### Resultat observe

```text
Workflow succeeded. Sortie stockee avec decision `yes`, score 92, priorite haute,
raisons et prochaine action commerciale. Historique visible apres reload.
```

## Agent 3 - CRM Enrichment API Agent

| Signal | Valeur |
| --- | --- |
| Runtime | `creator_endpoint` |
| Agent slug | `crm-enrichment-api-agent-52f8170a` |
| `agent_id` | `52f8170a-61d5-4575-86a1-8a8066d58317` |
| `agent_version_id` | `d4f093ce-95eb-443e-adc2-12dfe2e2da42` |
| Endpoint URL host | Endpoint HTTPS creator approuve, host non secret |
| Endpoint status | `approved` |
| Endpoint config status | `approved` |
| Security review status | `passed` |
| Marketplace visible | Oui, agent `approved` |
| Stripe checkout session | `cs_test_a1wq3lKXLb60lQlTWRvB2vd3cXDC21WmZG9iQ9LPOoMETQLa4lcwVvP9gf` |
| `payment_id` | `f1e19a18-0b92-4a5b-815a-2491c43bd62a` |
| `rental_request_id` | `83734e8a-1e93-4732-bd19-3914a2893f33` |
| `agent_run_id` | `5378396b-abf1-42f9-9614-dfd44b21572c` |
| `agent_endpoint_run_id` | `497b5400-822c-40e1-a383-20e6b3ddead1` |
| Final run status | `succeeded` |
| Verified review ID | `1a62b431-05e1-46cf-b7b8-a78dfcdcf72e` |
| Readiness blockers | Vide |

### Input teste

```text
Entreprise cible avec contexte CRM, objectif d'enrichissement factuel,
qualification ICP et prochaine action commerciale.
```

### Resultat observe

```text
Appel endpoint serveur signe succeeded. Resultat stocke dans agent_runs,
historique visible apres reload, avis verifie publie depuis le workspace.
```

## Rapport Readiness Final

Sortie finale du 2026-06-16 :

```text
Support Triage Agent:
- runtime: workflow_automation
- status: approved
- runtime enabled/run_enabled: true/true
- creator allowliste: true
- asset approuve: true
- security review passee: true
- paid active access: 1
- successful runs: 2
- verified reviews: 1
- earned ledger: 1
- stale runs: 0
- blockers: vide

Lead Qualification Agent:
- runtime: workflow_automation
- status: approved
- runtime enabled/run_enabled: true/true
- creator allowliste: true
- asset approuve: true
- security review passee: true
- paid active access: 1
- successful runs: 1
- verified reviews: 1
- earned ledger: 1
- stale runs: 0
- blockers: vide

CRM Enrichment API Agent:
- runtime: creator_endpoint
- status: approved
- runtime enabled/run_enabled: true/true
- creator allowliste: true
- asset approuve: true
- security review passee: true
- paid active access: 3
- successful runs: 2
- verified reviews: 1
- earned ledger: 3
- stale runs: 0
- blockers: vide

agenthub-advanced-prod-readiness-ok
```

## Decision Go / No-Go

Decision : **Go beta avancee sandbox**.

Preuves :

- les trois agents sont `approved` ;
- les trois agents sont louables via Stripe sandbox ;
- les trois agents ont au moins un run `succeeded` ;
- l'historique est visible apres reload ;
- l'avis verifie est publie ;
- les revenus sandbox sont visibles dans le ledger ;
- la colonne `blockers` du rapport readiness est vide pour les trois lignes.
