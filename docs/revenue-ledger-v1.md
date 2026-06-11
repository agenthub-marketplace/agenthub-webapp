# AgentHub Revenue Ledger v1

## Objectif

Passer de `Revenus beta = GMV sandbox` à une base auditable pour les futurs
payouts créateurs, sans activer Stripe Connect immédiatement.

Le ledger doit répondre à trois questions :

```text
1. Quel paiement a réellement donné un accès utilisable ?
2. Quelle part brute revient au créateur ?
3. À quel moment cette part devient-elle payable ?
```

## Hors Scope v1

```text
- Stripe Connect ;
- virements créateurs ;
- facturation fiscale complète ;
- remboursements automatisés ;
- gestion litiges Stripe ;
- commission dynamique par creator ;
- revenu net public.
```

La beta continue d'afficher :

```text
GMV sandbox, aucun payout réel en beta.
```

## Source De Vérité

Le ledger ne remplace pas les tables actuelles. Il relie les états existants :

```text
payments
-> rental_requests
-> agent_versions
-> agents
-> creator_profiles
```

Les futures écritures ledger doivent être déclenchées côté serveur uniquement,
depuis des événements fiables :

```text
Stripe webhook
access created
access stopped
payment blocked
refund/dispute future
admin payout hold/release future
```

La success page checkout ne doit jamais écrire dans le ledger.

## Événements Ledger

Événements recommandés :

```text
payment_authorized
payment_paid
access_created
activation_blocked
access_stopped
refund_pending
refund_completed
payout_hold_created
payout_hold_released
payout_ready
payout_sent
payout_failed
```

Pour la prochaine phase, seuls ces événements sont nécessaires :

```text
payment_paid
access_created
activation_blocked
access_stopped
payout_hold_created
payout_ready
```

## États De Revenu Créateur

Un paiement peut produire une ligne de revenu créateur uniquement si :

```text
payment.status = paid
payment.rental_request_id is not null
rental_requests.status in active/stopped
agent_version_id is frozen
creator_id is known
```

Statuts recommandés :

```text
pending_access
blocked
earned
hold
payout_ready
paid_out
refunded
cancelled
```

Définition :

- `pending_access` : paiement reçu mais accès pas encore confirmé.
- `blocked` : paiement reçu mais activation bloquée.
- `earned` : accès créé, revenu brut attribuable.
- `hold` : revenu attribuable mais retenu pour revue beta/support/refund window.
- `payout_ready` : revenu prêt pour payout futur.
- `paid_out` : payout Stripe Connect confirmé, futur.
- `refunded` : paiement remboursé.
- `cancelled` : revenu annulé avant payout.

## Montants

Le ledger doit séparer :

```text
gross_amount_cents
platform_fee_cents
creator_gross_cents
creator_net_cents
currency
```

En beta, `creator_net_cents` peut rester égal à `creator_gross_cents` ou être
null tant que la commission officielle n'est pas verrouillée.

Règle importante :

```text
Ne jamais afficher "revenu disponible" tant qu'il n'existe pas de payout_ready.
```

## Données Minimales Futures

Table future recommandée : `creator_revenue_ledger`.

Champs :

```text
id uuid
creator_id uuid
agent_id uuid
agent_version_id uuid
payment_id uuid
rental_request_id uuid
event_type text
status text
gross_amount_cents int
platform_fee_cents int
creator_gross_cents int
creator_net_cents int
currency text
hold_until timestamptz
payout_ready_at timestamptz
payout_id text
metadata jsonb
created_at timestamptz
```

Contraintes importantes :

```text
- une ligne earned unique par payment_id ;
- payment_id obligatoire pour événements argent ;
- rental_request_id obligatoire pour earned/payout_ready ;
- creator ne lit que ses agrégats ou ses lignes non sensibles ;
- admin lit tout ;
- aucun user final ne lit ce ledger.
```

## Règles De Calcul

### payment_paid

Créé quand le webhook Stripe confirme le paiement.

Si l'accès n'existe pas encore :

```text
status = pending_access
```

### access_created

Créé quand le webhook crée l'accès actif.

Conditions :

```text
payment.status = paid
rental_request_id exists
agent_version_id exists
agent creator_id exists
```

Résultat :

```text
status = earned
creator_gross_cents = payment.amount_cents - platform_fee_cents
```

### activation_blocked

Créé quand `paid_blocked` apparaît.

Résultat :

```text
status = blocked
creator_gross_cents = 0
payout_ready_at = null
```

### payout_hold_created

Créé automatiquement après `earned` en beta.

Raisons possibles :

```text
refund_window
security_review
manual_support
beta_policy
```

### payout_ready

Créé uniquement si :

```text
no refund
no paid_blocked
no unresolved support issue
agent not fraudulent/suspended for abuse
hold_until passed or admin released
```

## UI Attendue

### Creator

Afficher :

```text
GMV sandbox
Revenus attribués beta
Revenus en hold
Payout-ready futur
Top agents
Secteurs
Runtimes
```

Ne pas afficher :

```text
email user
stripe session id
rental private data
inputs workspace
prompt/output privé
```

### Admin

Afficher :

```text
ledger events
blocked revenues
paid without access
payout hold reasons
payout-ready candidates
creator totals
```

Actions futures admin :

```text
hold
release hold
mark payout blocked
export support CSV
```

Pas de remboursement/payout depuis l'UI v1.

## Garde-Fous

Le ledger doit être :

```text
- append-only autant que possible ;
- audit-loggé ;
- écrit côté serveur uniquement ;
- lié au payment_id et agent_version_id ;
- résilient aux webhooks rejoués ;
- sans secret Stripe ;
- sans données user privées.
```

## Critère De Passage À Stripe Connect

Ne pas activer Stripe Connect tant que ces points ne sont pas validés :

```text
[ ] paid -> access_created -> earned idempotent
[ ] paid_blocked -> blocked sans revenu payable
[ ] stopped access garde l'historique mais ne crée pas double revenu
[ ] relouer le même agent crée une nouvelle ligne revenue distincte
[ ] creator ne voit que ses totaux/lignes autorisées
[ ] admin peut auditer une ligne de bout en bout
[ ] payout_ready peut être expliqué par événements ledger
```

## Prochain Ticket Recommandé

Créer la migration additive `creator_revenue_ledger` en lecture admin/creator
scopée, puis écrire uniquement les événements :

```text
payment_paid
access_created
activation_blocked
```

Les payouts réels resteront désactivés.
