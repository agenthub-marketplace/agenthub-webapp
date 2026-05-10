# Contribution à AgentHub

AgentHub est pour l'instant maintenu avec un workflow simple afin de garder le projet propre et stable.

## Branches

- `main` = version stable.
- `staging` = validation par l'équipe avant stabilisation.
- `feature/*` = nouvelles fonctionnalités.
- `fix/*` = corrections de bugs.
- `chore/*` = configuration, maintenance, documentation ou setup.

## Rôles

Pour le moment, seul Arnaud pousse du code dans le dépôt. Les contributeurs non développeurs doivent utiliser les GitHub Issues pour partager bugs, retours produit, retours UX, questions et priorités.

## Workflow

Les sujets passent par les statuts suivants :

Backlog -> A clarifier -> Ready for dev -> In progress -> Ready for test -> Validated -> Done

## Avant une pull request

- Garder le périmètre petit et clair.
- Vérifier `npm run lint`, `npm run typecheck` et `npm run build`.
- Ne jamais ajouter de secrets, clés API ou valeurs réelles dans le dépôt.
- Documenter les changements qui touchent l'architecture, la sécurité ou le produit.

## Principes

- Ne pas overbuilder.
- Ne pas implémenter les paiements tant que Stripe Connect n'est pas cadré.
- Ne pas exécuter de code arbitraire fourni par les créateurs dans le MVP.
- Préserver une base TypeScript propre et lisible.
