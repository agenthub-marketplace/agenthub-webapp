# AgentHub Final UI Smoke Checklist

Objectif : fermer la preuve manquante par un vrai parcours clique dans l'interface.

Environnement :

- URL :
- Date :
- Testeur :
- Branche/deploiement :
- Mode paiement : Stripe sandbox / free beta

## Comptes

- Creator :
- Admin :
- User :

## 1. Creator Cree L'Agent

Depuis `/code/agents/new`.

- [ ] Le creator se connecte.
- [ ] Le creator choisit un template.
- [ ] Le creator remplit le listing public.
- [ ] Le creator verifie l'Agent Contract.
- [ ] Le creator verifie le runtime.
- [ ] Le creator voit la preview fiche publique.
- [ ] Le creator voit la preview workspace.
- [ ] Le creator soumet l'agent.
- [ ] Le creator voit le statut de precheck ou un message clair.

Resultat :

```text
Agent name:
Agent id/slug:
Precheck status:
Notes:
```

## 2. Admin Review

Depuis `/code/admin/review`.

- [ ] L'admin voit l'agent soumis.
- [ ] L'admin voit runtime, execution mode et workspace mode.
- [ ] L'admin voit le precheck securite.
- [ ] Si runtime sensible, l'admin voit asset/security review.
- [ ] L'admin approuve l'agent.
- [ ] L'agent passe `approved`.

Resultat :

```text
Admin decision:
Security review status:
Notes:
```

## 3. Marketplace

Depuis `/agenthub/search`.

- [ ] Le user se connecte.
- [ ] L'agent approuve apparait dans la marketplace.
- [ ] La fiche agent charge.
- [ ] La fiche affiche type d'agent, limites, workspace attendu et CTA location.

Resultat :

```text
Agent visible: yes/no
Listing URL:
Notes:
```

## 4. Location / Activation

- [ ] Le user clique `Louer cet agent` ou active l'agent.
- [ ] Stripe sandbox ou free beta fonctionne selon l'environnement.
- [ ] Un seul acces actif est cree.
- [ ] Le user arrive dans `/agenthub/workspace/[rentalId]`.

Resultat :

```text
Rental id:
Payment id/session id:
Access status:
Notes:
```

## 5. Workspace Adapte

- [ ] Le workspace affiche Overview, Setup, Use, Details, Review.
- [ ] Le blueprint agent-specific est visible.
- [ ] Les inputs attendus sont compréhensibles.
- [ ] La frontiere de confiance est visible.
- [ ] Le runner correspond au runtime.

Resultat :

```text
Runtime:
Workspace usable: yes/no
Notes:
```

## 6. Execution Et Historique

- [ ] Le user lance une execution depuis l'onglet Use.
- [ ] Le resultat s'affiche.
- [ ] Le user recharge la page.
- [ ] L'historique contient le run.
- [ ] Pas de double run involontaire.

Resultat :

```text
Run id:
Run status:
History visible after reload: yes/no
Notes:
```

## 7. Avis Verifie

- [ ] Avant run, l'avis etait bloque ou explique comme indisponible.
- [ ] Apres run reussi, le formulaire d'avis est disponible.
- [ ] Le user publie un avis.
- [ ] Le user est redirige vers la fiche agent.
- [ ] Le deuxieme avis est bloque.

Resultat :

```text
Review submitted: yes/no
Redirect URL:
Duplicate blocked: yes/no
Notes:
```

## 8. Revenus Creator

Depuis `/code`.

- [ ] Le creator voit `Revenus beta`.
- [ ] Le GMV sandbox ou revenu beta reflete l'activation.
- [ ] Aucun email user, input, output ou detail Stripe sensible n'est expose.

Resultat :

```text
GMV visible:
Agent revenue row:
Private user data exposed: yes/no
Notes:
```

## Go / No-Go

Go si :

- [ ] Aucun P0/P1 sur auth, access, workspace, run, avis, revenus ou privacy.
- [ ] Le flow complet passe pour au moins un agent.
- [ ] Les checks locaux passent.

No-Go si :

- [ ] User A voit des donnees user B.
- [ ] Un avis est possible sans run reussi.
- [ ] Un paiement/activation reste bloque sans message clair.
- [ ] Le creator voit des donnees privees user.
- [ ] Le runtime disabled reste achetable/executable.

Decision :

```text
GO / NO-GO:
Blockers:
Follow-up tickets:
```
