import type { Locale } from "@/lib/i18n/config";
import {
  creatorAgentDrafts,
  getAgentCategories,
  mockAgents,
  type MockAgent,
} from "@/lib/mock-data/agents";
import { mockOrders, type MockOrder } from "@/lib/mock-data/orders";
import { mockReviews, type MockReview } from "@/lib/mock-data/reviews";

const agentFr: Record<string, Partial<MockAgent>> = {
  "linkedin-content-agent": {
    name: "Agent de contenu LinkedIn",
    category: "Création de contenu",
    shortDescription:
      "Transforme des idées brutes en posts LinkedIn soignés et plans de contenu hebdomadaires.",
    longDescription:
      "Un agent de rédaction pour indépendants et consultants qui veulent publier régulièrement sur LinkedIn sans partir d’une page blanche. Il structure les idées, rédige les posts et prépare des variantes prêtes à publier.",
    priceLabel: "Dès 29 € / tâche",
    estimatedDuration: "30-60 minutes",
    deliverables: [
      "3 brouillons de posts LinkedIn finalisés",
      "1 série de variations d’accroches",
      "Notes de publication suggérées",
    ],
    requiredInputs: ["Sujet ou idée brute", "Audience cible", "Préférence de ton"],
    does: [
      "Structure les idées en posts professionnels concis",
      "Suggère des accroches et appels à l’action",
      "Adapte le texte aux freelances et consultants",
    ],
    doesNot: [
      "Publier directement sur LinkedIn",
      "Garantir l’engagement ou la portée",
      "Créer des conseils financiers ou médicaux réglementés",
    ],
  },
  "contract-review-agent": {
    name: "Agent de revue de contrat",
    category: "Analyse documentaire",
    shortDescription:
      "Résume les contrats, signale les risques courants et prépare les questions pour une revue juridique.",
    longDescription:
      "Un agent d’analyse documentaire qui aide les petites entreprises à comprendre leurs contrats avant de consulter un juriste. Il met en évidence obligations, clauses inhabituelles, renouvellements et questions ouvertes.",
    priceLabel: "Dès 79 € / projet",
    estimatedDuration: "Même jour ouvré",
    deliverables: [
      "Résumé du contrat en langage clair",
      "Checklist des risques et obligations",
      "Questions à poser à un professionnel du droit",
    ],
    requiredInputs: ["Document contractuel", "Contexte business", "Préoccupations spécifiques éventuelles"],
    does: [
      "Identifie les risques commerciaux courants",
      "Résume obligations et dates de renouvellement",
      "Crée une checklist de revue",
    ],
    doesNot: ["Fournir un avis juridique", "Remplacer un avocat qualifié", "Signer ou négocier des contrats"],
  },
  "lead-generation-agent": {
    name: "Agent de génération de leads",
    category: "Génération de leads",
    shortDescription: "Construit des listes de prospects ciblées à partir d’un ICP clair.",
    longDescription:
      "Un agent de recherche pour freelances et petites équipes B2B qui ont besoin de listes de prospects ciblées. Il transforme un profil client en recherche organisée avec notes de pertinence.",
    priceLabel: "Dès 45 € / heure",
    estimatedDuration: "2-4 heures",
    deliverables: ["Tableur de prospects", "Notes de pertinence", "Segmentation suggérée"],
    requiredInputs: ["Profil client idéal", "Zone géographique cible", "Secteurs ou types d’entreprises exclus"],
    does: [
      "Recherche des entreprises correspondant à ton ICP",
      "Ajoute des notes de qualification",
      "Organise les leads pour l’outreach",
    ],
    doesNot: ["Envoyer des messages", "Scraper des données privées ou fermées", "Garantir des rendez-vous"],
  },
  "invoice-assistant-agent": {
    name: "Agent assistant factures",
    category: "Automatisation admin",
    shortDescription: "Extrait les détails des factures et prépare un suivi de paiement propre.",
    longDescription:
      "Un agent administratif qui aide les indépendants à organiser les factures, repérer les informations manquantes et créer un tableau de suivi simple.",
    priceLabel: "Dès 19 € / tâche",
    estimatedDuration: "20-45 minutes",
    deliverables: ["Tableau récapitulatif des factures", "Checklist des informations manquantes", "Notes de relance paiement"],
    requiredInputs: ["Fichiers de factures", "Devise préférée", "Statut de paiement client optionnel"],
    does: [
      "Extrait dates, montants et fournisseurs",
      "Signale les champs manquants",
      "Prépare un résumé prêt au suivi",
    ],
    doesNot: ["Déplacer de l’argent ou payer des factures", "Se connecter à des comptes bancaires", "Remplacer un conseil comptable"],
  },
  "market-research-agent": {
    name: "Agent d’étude de marché",
    category: "Étude de marché",
    shortDescription: "Crée des snapshots de marché concis pour offres, niches et concurrents.",
    longDescription:
      "Un agent de recherche pour fondateurs et consultants qui valident un marché. Il rassemble des constats structurés, notes concurrentielles, signaux d’audience et prochaines étapes.",
    priceLabel: "Dès 120 € / projet",
    estimatedDuration: "1-2 jours ouvrés",
    deliverables: ["Brief marché", "Comparaison concurrentielle", "Notes d’opportunités et risques"],
    requiredInputs: ["Marché ou niche", "Client cible", "Questions de recherche"],
    does: [
      "Résume les signaux publics du marché",
      "Compare les concurrents visibles",
      "Met en évidence les opportunités de positionnement",
    ],
    doesNot: ["Accéder à des bases privées payantes", "Garantir la taille exacte du marché", "Faire des recommandations d’investissement"],
  },
  "csv-cleaning-agent": {
    name: "Agent de nettoyage CSV",
    category: "Automatisation admin",
    shortDescription: "Nettoie des tableurs désordonnés et rend un CSV prêt à analyser.",
    longDescription:
      "Un agent pratique pour nettoyer de petits datasets opérationnels. Il normalise les colonnes, signale les doublons et documente les hypothèses.",
    priceLabel: "Dès 39 € / tâche",
    estimatedDuration: "1-3 heures",
    deliverables: ["Fichier CSV nettoyé", "Rapport doublons et anomalies", "Notes de nettoyage"],
    requiredInputs: ["CSV ou tableur", "Format de colonnes souhaité", "Règles de nettoyage connues"],
    does: [
      "Standardise noms et formats de colonnes",
      "Repère doublons et valeurs manquantes",
      "Documente clairement les transformations",
    ],
    doesNot: ["Inférer des attributs personnels sensibles", "Entraîner des modèles sur tes données", "Garantir une donnée source parfaite"],
  },
  "email-outreach-agent": {
    name: "Agent d’outreach email",
    category: "Génération de leads",
    shortDescription: "Rédige des séquences email personnalisées à partir d’une liste de prospects.",
    longDescription:
      "Un agent de copywriting outbound qui aide créateurs et consultants à transformer une offre simple en séquences email concises par segment.",
    priceLabel: "Dès 50 € / heure",
    estimatedDuration: "2 heures",
    deliverables: ["Séquence de 3 emails", "Options d’objets", "Champs de personnalisation"],
    requiredInputs: ["Description de l’offre", "Segment prospect", "Ton et contraintes souhaités"],
    does: [
      "Rédige des séquences d’outreach concises",
      "Adapte le message par segment",
      "Suggère des placeholders de personnalisation",
    ],
    doesNot: ["Envoyer les emails", "Contourner le consentement ou la conformité", "Garantir des réponses"],
  },
  "admin-automation-agent": {
    name: "Agent d’automatisation admin",
    category: "Automatisation admin",
    shortDescription: "Cartographie les routines admin répétitives et propose un plan d’automatisation sûr.",
    longDescription:
      "Un agent de design workflow qui transforme les routines admin floues en brief d’automatisation clair avec étapes, outils, risques et chemin simple.",
    priceLabel: "Dès 95 € / projet",
    estimatedDuration: "1 jour ouvré",
    deliverables: ["Carte du workflow", "Liste d’opportunités d’automatisation", "Brief d’implémentation"],
    requiredInputs: ["Description du workflow actuel", "Outils utilisés", "Contraintes connues"],
    does: [
      "Cartographie les étapes admin répétitives",
      "Identifie les candidats à l’automatisation",
      "Recommande un chemin d’implémentation peu risqué",
    ],
    doesNot: ["Déployer directement les automatisations", "Accéder à tes outils sans consentement", "Garantir la compatibilité avec chaque app"],
  },
  "newsletter-repurposing-agent": {
    name: "Agent de réutilisation newsletter",
    category: "Création de contenu",
    shortDescription: "Transforme une newsletter en posts, résumés et extraits.",
    creatorName: "Ton espace créateur",
    priceLabel: "Tarification brouillon",
  },
  "sales-research-agent": {
    name: "Agent de recherche commerciale",
    creatorName: "Ton espace créateur",
  },
  "spreadsheet-cleanup-agent": {
    name: "Agent de nettoyage tableur",
    creatorName: "Ton espace créateur",
  },
  "ops-workflow-agent": {
    name: "Agent workflow ops",
    creatorName: "Ton espace créateur",
  },
  "legal-risk-agent": {
    name: "Agent de risques juridiques",
    creatorName: "Ton espace créateur",
  },
};

const orderFr: Record<string, Partial<MockOrder>> = {
  "order-active-1": {
    agentName: "Agent d’étude de marché",
    statusLabel: "En cours",
    taskBrief: "Étudier le marché des templates CRM pour consultants solo.",
  },
  "order-active-2": {
    agentName: "Agent de nettoyage CSV",
    statusLabel: "En file d’attente",
    taskBrief: "Nettoyer un export client avant migration newsletter.",
  },
  "order-complete-1": {
    agentName: "Agent de contenu LinkedIn",
    statusLabel: "Terminé",
    taskBrief: "Créer trois posts sur le consulting productisé.",
  },
  "order-review-1": {
    agentName: "Agent d’automatisation admin",
    statusLabel: "Avis en attente",
    taskBrief: "Cartographier les tâches admin récurrentes d’onboarding.",
  },
};

const reviewFr: Record<string, Partial<MockReview>> = {
  "review-1": {
    title: "Brouillons clairs en moins d’une heure",
    body: "Les posts ressemblaient à ma voix de consultant et demandaient seulement de légères retouches.",
  },
  "review-2": {
    title: "Utile avant d’appeler un juriste",
    body: "L’agent a fait ressortir des questions de renouvellement et responsabilité que j’avais ratées.",
  },
  "review-3": {
    title: "Bon pour la prospection de niche",
    body: "La liste était ciblée et les notes de qualification ont économisé du temps de recherche.",
  },
  "review-4": {
    title: "Transmission propre",
    body: "Le rapport d’anomalies rendait les changements faciles à vérifier.",
  },
};

function localizeAgent(agent: MockAgent, locale: Locale): MockAgent {
  return locale === "fr" ? { ...agent, ...agentFr[agent.slug] } : agent;
}

export function getLocalizedAgents(locale: Locale) {
  return mockAgents.map((agent) => localizeAgent(agent, locale));
}

export function getLocalizedApprovedAgents(locale: Locale) {
  return getLocalizedAgents(locale).filter((agent) => agent.status === "approved");
}

export function getLocalizedAgentBySlug(slug: string, locale: Locale) {
  return getLocalizedAgents(locale).find((agent) => agent.slug === slug);
}

export function getLocalizedAgentCategories(locale: Locale) {
  if (locale === "en") {
    return getAgentCategories();
  }

  return Array.from(new Set(getLocalizedAgents("fr").map((agent) => agent.category)));
}

export function getLocalizedCreatorAgents(locale: Locale) {
  return creatorAgentDrafts.map((agent) => localizeAgent(agent, locale));
}

export function getLocalizedOrders(locale: Locale) {
  return locale === "fr"
    ? mockOrders.map((order) => ({ ...order, ...orderFr[order.id] }))
    : mockOrders;
}

export function getLocalizedReviews(locale: Locale) {
  return locale === "fr"
    ? mockReviews.map((review) => ({ ...review, ...reviewFr[review.id] }))
    : mockReviews;
}

export function getLocalizedReviewsForAgent(slug: string, locale: Locale) {
  return getLocalizedReviews(locale).filter((review) => review.agentSlug === slug);
}
