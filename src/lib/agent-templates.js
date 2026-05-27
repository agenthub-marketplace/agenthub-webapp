export const AGENT_TEMPLATES = [
  {
    key: 'linkedin-content-studio',
    label: 'LinkedIn Content Studio',
    category_slug: 'business-documents',
    short_description: 'Transforme une idee ou une expertise en posts LinkedIn prets a adapter.',
    target_user: 'Fondateurs, consultants, freelances et equipes marketing B2B.',
    detailed_description:
      'Aide l utilisateur a structurer des posts LinkedIn clairs a partir d une idee, d un angle, d une offre ou d une experience terrain. Le workspace guide la preparation du contexte, propose une structure de post et donne des exemples de variations.',
    capabilities: [
      'Clarifier un angle editorial LinkedIn',
      'Transformer une idee brute en structure de post',
      'Proposer hooks, plan et call-to-action',
      'Adapter le ton a une audience B2B',
      'Preparer plusieurs variations reutilisables',
    ],
    limitations: [
      'Ne publie pas directement sur LinkedIn',
      'Ne garantit pas la viralite ou la performance',
      'Ne remplace pas la validation de marque par l utilisateur',
    ],
    required_inputs: [
      'Sujet ou idee principale',
      'Audience cible',
      'Objectif du post',
      'Ton souhaite',
      'Eventuelles contraintes de marque',
    ],
    setup_requirements: {
      type: 'context',
      items: ['Sujet', 'audience', 'objectif', 'ton', 'contraintes de marque'],
    },
    deliverables: [
      'Structure de post LinkedIn',
      'Hooks possibles',
      'Version courte et version detaillee',
      'Suggestions de CTA',
    ],
    example_output:
      'Hook: "La plupart des equipes B2B perdent leurs meilleurs insights avant meme de les publier."\\n\\nStructure: probleme, observation terrain, methode simple, exemple, CTA.',
    known_limits: [
      'Les donnees de performance restent a verifier apres publication',
      'Le contenu doit etre relu avant usage public',
    ],
    pricing_type: 'task',
    fixed_price: 19,
    pricing_details: 'Inclut un workspace de preparation et un pack de structure pour un post LinkedIn.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un plan de post LinkedIn actionnable avec hooks, structure et exemples.',
      examples: ['Post fondateur', 'Post expertise', 'Post retour d experience'],
    },
    execution_mode: 'guided_workspace',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Définir l’angle', 'Préparer le contexte', 'Copier la structure de post'],
    workspace_actions_en: ['Define the angle', 'Prepare context', 'Copy the post structure'],
  },
  {
    key: 'sales-email-builder',
    label: 'Sales Email Builder',
    category_slug: 'business-documents',
    short_description: 'Prepare des emails de prospection B2B courts, clairs et personnalises.',
    target_user: 'Sales, fondateurs, consultants et independants en prospection B2B.',
    detailed_description:
      'Guide l utilisateur pour transformer une cible, une proposition de valeur et une preuve en email de prospection utilisable. L agent aide a cadrer le message, eviter le ton trop generique et preparer plusieurs variantes.',
    capabilities: [
      'Structurer un email de prospection',
      'Clarifier la proposition de valeur',
      'Adapter le message a un segment cible',
      'Proposer objets et CTA',
      'Preparer une relance simple',
    ],
    limitations: [
      'Ne scrape pas de donnees prospects',
      'Ne garantit pas les taux de reponse',
      'Ne remplace pas la conformite legal/anti-spam',
    ],
    required_inputs: ['Cible', 'offre', 'probleme adresse', 'preuve ou reference', 'CTA souhaite'],
    setup_requirements: {
      type: 'context',
      items: ['Segment cible', 'offre', 'preuve', 'CTA'],
    },
    deliverables: ['Email principal', '2 objets possibles', 'Relance courte', 'Checklist avant envoi'],
    example_output:
      'Objet: Question rapide sur votre pipeline\\n\\nBonjour, j ai remarque que votre equipe recrute cote sales. Nous aidons les equipes B2B a reduire le temps de preparation des emails sans perdre la personnalisation...',
    known_limits: ['Le message doit etre adapte a chaque prospect', 'La responsabilite d envoi reste cote utilisateur'],
    pricing_type: 'task',
    fixed_price: 15,
    pricing_details: 'Inclut un email de prospection, une relance et une checklist d adaptation.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un email de prospection B2B pret a personnaliser avec objet, message et relance.',
      examples: ['Email froid', 'Relance 3 jours', 'Version fondateur'],
    },
    execution_mode: 'guided_workspace',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Cadrer la cible', 'Préparer la proposition de valeur', 'Copier le template email'],
    workspace_actions_en: ['Frame the target', 'Prepare the value proposition', 'Copy the email template'],
  },
  {
    key: 'newsletter-brief-assistant',
    label: 'Newsletter Brief Assistant',
    category_slug: 'business-documents',
    short_description: 'Transforme un sujet en brief de newsletter structure.',
    target_user: 'Createurs, equipes contenu, fondateurs et consultants.',
    detailed_description:
      'Aide a cadrer une edition de newsletter: angle, audience, sections, exemples, ressources et CTA. Le workspace sert de guide editorial avant redaction ou delegation.',
    capabilities: [
      'Definir un angle de newsletter',
      'Organiser les sections',
      'Lister les preuves ou exemples utiles',
      'Preparer un CTA coherent',
      'Creer une checklist editoriale',
    ],
    limitations: [
      'Ne redige pas une newsletter complete automatiquement',
      'Ne verifie pas les sources externes',
      'Ne gere pas l envoi email',
    ],
    required_inputs: ['Sujet', 'audience', 'objectif', 'ton', 'ressources disponibles'],
    setup_requirements: {
      type: 'context',
      items: ['Sujet', 'audience', 'objectif', 'ressources'],
    },
    deliverables: ['Brief editorial', 'Plan de sections', 'Idees de titres', 'Checklist avant publication'],
    example_output:
      'Angle: pourquoi les workflows IA echouent sans process.\\nSections: probleme, exemple terrain, methode en 3 etapes, ressources, CTA.',
    known_limits: ['Les faits et sources doivent etre verifies par l utilisateur'],
    pricing_type: 'task',
    fixed_price: 19,
    pricing_details: 'Inclut un brief structure pour une edition de newsletter.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un brief newsletter clair avec angle, sections, titres et checklist.',
      examples: ['Newsletter thought leadership', 'Newsletter produit', 'Newsletter curation'],
    },
    execution_mode: 'guided_workspace',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Choisir l’angle', 'Structurer les sections', 'Vérifier la checklist'],
    workspace_actions_en: ['Choose the angle', 'Structure the sections', 'Review the checklist'],
  },
  {
    key: 'business-swot-analyst',
    label: 'Business SWOT Analyst',
    category_slug: 'research-analysis',
    short_description: 'Guide une analyse SWOT simple et exploitable pour une activite ou un projet.',
    target_user: 'Fondateurs, freelances, consultants et equipes business.',
    detailed_description:
      'Structure une analyse forces, faiblesses, opportunites et menaces a partir du contexte business fourni. Le workspace aide a preparer les informations et a convertir la SWOT en prochaines actions.',
    capabilities: [
      'Structurer une SWOT',
      'Identifier des questions de clarification',
      'Relier les constats a des actions',
      'Separarer faits, hypotheses et risques',
      'Prepararer une synthese executive',
    ],
    limitations: [
      'Ne remplace pas une etude de marche complete',
      'Ne verifie pas automatiquement les donnees externes',
      'Ne donne pas de conseil financier reglemente',
    ],
    required_inputs: ['Description du projet', 'marche cible', 'concurrents connus', 'forces internes', 'contraintes'],
    setup_requirements: {
      type: 'context',
      items: ['Projet', 'marche', 'concurrents', 'contraintes'],
    },
    deliverables: ['Grille SWOT', 'Synthese des risques', '3 a 5 actions prioritaires', 'Questions ouvertes'],
    example_output:
      'Force: expertise niche deja prouvee.\\nFaiblesse: acquisition non stabilisee.\\nOpportunite: segment PME peu outille.\\nMenace: concurrence SaaS verticale.',
    known_limits: ['Les recommandations dependent de la qualite du contexte fourni'],
    pricing_type: 'task',
    fixed_price: 29,
    pricing_details: 'Inclut une structure SWOT et une synthese d actions prioritaires.',
    risk_level: 'medium',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Une SWOT exploitable avec constats, risques et actions prioritaires.',
      examples: ['SWOT lancement produit', 'SWOT repositionnement', 'SWOT offre service'],
    },
    execution_mode: 'guided_workspace',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Préparer le contexte business', 'Remplir la SWOT', 'Prioriser les actions'],
    workspace_actions_en: ['Prepare business context', 'Fill the SWOT', 'Prioritize actions'],
  },
  {
    key: 'competitor-brief-agent',
    label: 'Competitor Brief Agent',
    category_slug: 'research-analysis',
    short_description: 'Prepare un brief concurrentiel structure a partir d informations fournies.',
    target_user: 'Fondateurs, product marketers, consultants et equipes sales.',
    detailed_description:
      'Aide a organiser une analyse concurrentielle: positionnement, offres, forces apparentes, points de vigilance et angles de differenciation. L agent travaille a partir des informations et liens fournis par l utilisateur.',
    capabilities: [
      'Structurer un brief concurrentiel',
      'Comparer positionnement et promesses',
      'Identifier angles de differenciation',
      'Lister questions de validation',
      'Preparer une synthese pour equipe',
    ],
    limitations: [
      'Ne scrape pas automatiquement le web',
      'Ne garantit pas l exhaustivite des donnees',
      'Ne remplace pas une due diligence',
    ],
    required_inputs: ['Liste de concurrents', 'liens publics', 'critere de comparaison', 'marche cible'],
    setup_requirements: {
      type: 'context',
      items: ['Concurrents', 'liens', 'criteres de comparaison', 'marche cible'],
    },
    deliverables: ['Tableau de comparaison', 'Synthese concurrentielle', 'Angles de differenciation', 'Questions a valider'],
    example_output:
      'Concurrent A: promesse vitesse, prix premium, forte preuve sociale. Angle possible: accompagnement plus specialise et onboarding plus simple.',
    known_limits: ['L utilisateur doit fournir ou verifier les sources'],
    pricing_type: 'task',
    fixed_price: 29,
    pricing_details: 'Inclut un brief concurrentiel structure pour 3 a 5 concurrents fournis.',
    risk_level: 'medium',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un brief concurrentiel clair avec comparaison, synthese et angles de differenciation.',
      examples: ['Brief SaaS', 'Brief agence', 'Brief produit physique'],
    },
    execution_mode: 'guided_workspace',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Lister les concurrents', 'Comparer les critères', 'Identifier la différenciation'],
    workspace_actions_en: ['List competitors', 'Compare criteria', 'Identify differentiation'],
  },
  {
    key: 'document-summary-pro',
    label: 'Document Summary Pro',
    category_slug: 'business-documents',
    short_description: 'Cadre la synthese d un document long en points clairs et actionnables.',
    target_user: 'Dirigeants, operations, consultants et equipes projet.',
    detailed_description:
      'Guide l utilisateur pour extraire les points importants d un document: contexte, decisions, risques, actions et questions ouvertes. Sans upload dans cette version, l utilisateur prepare ou colle les extraits utiles dans son propre outil.',
    capabilities: [
      'Structurer une synthese executive',
      'Identifier decisions et actions',
      'Lister risques et points ouverts',
      'Transformer un document en checklist',
      'Preparer une restitution courte',
    ],
    limitations: [
      'Pas d upload de fichier dans cette version',
      'Ne traite pas automatiquement le document dans AgentHub',
      'La confidentialite du document reste sous la responsabilite de l utilisateur',
    ],
    required_inputs: ['Document ou extraits a analyser', 'objectif de synthese', 'audience', 'niveau de detail attendu'],
    setup_requirements: {
      type: 'document',
      items: ['Document ou extraits', 'objectif', 'audience', 'niveau de detail'],
    },
    deliverables: ['Synthese executive', 'Actions a suivre', 'Risques', 'Questions ouvertes'],
    example_output:
      'Resume: le document recommande de consolider le process onboarding.\\nActions: designer un owner, documenter les etapes, fixer une date de revue.',
    known_limits: ['Pas de traitement automatique du fichier tant que l upload n est pas branche'],
    pricing_type: 'task',
    fixed_price: 25,
    pricing_details: 'Inclut un cadre de synthese et une checklist pour un document.',
    risk_level: 'medium',
    workspace_mode: 'document_required',
    output_promise: {
      summary: 'Une methode de synthese de document avec structure, actions et points de vigilance.',
      examples: ['Compte rendu', 'Rapport interne', 'Document projet'],
    },
    execution_mode: 'guided_workspace',
    data_policy: {
      stores_user_data: true,
      requires_files: true,
      external_tools: [],
    },
    workspace_actions: ['Préparer le document', 'Extraire les points clés', 'Compléter la synthèse'],
    workspace_actions_en: ['Prepare the document', 'Extract key points', 'Complete the summary'],
  },
  {
    key: 'meeting-notes-checklist',
    label: 'Meeting Notes Checklist',
    category_slug: 'business-documents',
    short_description: 'Transforme des notes de reunion en decisions, actions et suivi.',
    target_user: 'Managers, chefs de projet, fondateurs et equipes operations.',
    detailed_description:
      'Aide a organiser des notes de reunion pour clarifier les decisions, les actions, les owners et les prochaines etapes. Le workspace fournit une structure simple a reutiliser apres chaque reunion.',
    capabilities: [
      'Structurer des notes de reunion',
      'Identifier decisions et actions',
      'Assigner owners et deadlines',
      'Lister points ouverts',
      'Preparer un recap partageable',
    ],
    limitations: [
      'Ne transcrit pas automatiquement les reunions',
      'Ne s integre pas encore aux calendriers ou outils de notes',
      'Ne remplace pas la validation des participants',
    ],
    required_inputs: ['Notes brutes', 'participants', 'objectif de la reunion', 'decisions connues'],
    setup_requirements: {
      type: 'context',
      items: ['Notes brutes', 'participants', 'objectif', 'decisions'],
    },
    deliverables: ['Recap structure', 'Liste d actions', 'Owners', 'Points ouverts'],
    example_output:
      'Decision: valider le scope MVP.\\nAction: Sarah prepare la maquette avant vendredi.\\nPoint ouvert: confirmer le budget analytics.',
    known_limits: ['La qualite depend de la precision des notes fournies'],
    pricing_type: 'task',
    fixed_price: 12,
    pricing_details: 'Inclut une structure de recap et une checklist actionnable pour une reunion.',
    risk_level: 'low',
    workspace_mode: 'instant',
    output_promise: {
      summary: 'Une checklist pour transformer des notes de reunion en actions claires.',
      examples: ['Reunion projet', 'Comite hebdo', 'Point client'],
    },
    execution_mode: 'guided_workspace',
    data_policy: {
      stores_user_data: false,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Coller les notes utiles', 'Identifier les décisions', 'Lister les actions'],
    workspace_actions_en: ['Paste useful notes', 'Identify decisions', 'List actions'],
  },
  {
    key: 'interview-prep-assistant',
    label: 'Interview Prep Assistant',
    category_slug: 'hr-recruiting',
    short_description: 'Prepare une grille d entretien non decisionnelle pour mieux structurer les interviews.',
    target_user: 'Recruteurs, hiring managers, fondateurs et responsables RH.',
    detailed_description:
      'Aide a preparer une interview structuree: objectifs, competences a explorer, questions ouvertes, signaux a observer et grille de prise de notes. L agent ne prend pas de decision de recrutement.',
    capabilities: [
      'Structurer une grille d entretien',
      'Proposer questions ouvertes',
      'Aligner criteres et role',
      'Preparer une grille de notes',
      'Reduire les oublis pendant l entretien',
    ],
    limitations: [
      'Ne prend aucune decision de recrutement',
      'Ne score pas automatiquement les candidats',
      'Ne remplace pas les obligations RH et anti-discrimination',
    ],
    required_inputs: ['Role', 'seniorite', 'competences a evaluer', 'contexte equipe', 'contraintes legales internes'],
    setup_requirements: {
      type: 'context',
      items: ['Role', 'seniorite', 'competences', 'contexte equipe'],
    },
    deliverables: ['Questions d entretien', 'Grille de notes', 'Signaux a observer', 'Checklist preparation'],
    example_output:
      'Competence: collaboration transverse.\\nQuestion: racontez une situation ou vous avez debloque un sujet avec une equipe non technique.',
    known_limits: ['L evaluation finale reste humaine et doit respecter les regles RH applicables'],
    pricing_type: 'task',
    fixed_price: 19,
    pricing_details: 'Inclut une grille d entretien et une checklist non decisionnelle.',
    risk_level: 'medium',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Une grille d entretien structuree, non decisionnelle, pour mieux preparer les interviews.',
      examples: ['Entretien sales', 'Entretien product', 'Entretien operations'],
    },
    execution_mode: 'guided_workspace',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Définir le rôle', 'Choisir les compétences', 'Préparer la grille'],
    workspace_actions_en: ['Define the role', 'Choose skills', 'Prepare the scorecard'],
  },
  {
    key: 'product-launch-planner',
    label: 'Product Launch Planner',
    category_slug: 'business-documents',
    short_description: 'Organise un lancement produit en plan d actions clair.',
    target_user: 'Fondateurs, product managers, marketers et equipes go-to-market.',
    detailed_description:
      'Aide a cadrer un lancement produit: audience, promesse, canaux, assets, risques, calendrier et checklist. Le workspace guide l utilisateur vers un plan pragmatique sans automatiser les canaux.',
    capabilities: [
      'Structurer une checklist de lancement',
      'Clarifier audience et message',
      'Lister assets necessaires',
      'Identifier risques et dependances',
      'Preparer un calendrier simple',
    ],
    limitations: [
      'Ne publie pas sur les canaux marketing',
      'Ne remplace pas une strategie go-to-market complete',
      'Ne predit pas les resultats commerciaux',
    ],
    required_inputs: ['Produit', 'audience cible', 'date visee', 'canaux', 'assets disponibles', 'contraintes'],
    setup_requirements: {
      type: 'context',
      items: ['Produit', 'audience', 'date visee', 'canaux', 'contraintes'],
    },
    deliverables: ['Plan de lancement', 'Checklist assets', 'Risques', 'Calendrier initial'],
    example_output:
      'Semaine -2: finaliser landing et messaging.\\nSemaine -1: preparer emails et posts.\\nJour J: annonce, suivi support, monitoring.',
    known_limits: ['Le plan doit etre ajuste aux ressources reelles de l equipe'],
    pricing_type: 'project',
    fixed_price: 49,
    pricing_details: 'Inclut un plan de lancement structure et une checklist actionnable.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un plan de lancement produit avec checklist, calendrier et risques.',
      examples: ['Lancement SaaS', 'Lancement feature', 'Lancement service'],
    },
    execution_mode: 'guided_workspace',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Cadrer le lancement', 'Lister les assets', 'Construire la checklist'],
    workspace_actions_en: ['Frame the launch', 'List assets', 'Build the checklist'],
  },
  {
    key: 'contract-reading-assistant',
    label: 'Contract Reading Assistant',
    category_slug: 'legal-documents',
    short_description: 'Aide a lire un contrat et a identifier les clauses a verifier.',
    target_user: 'Fondateurs, freelances, operations et petites equipes business.',
    detailed_description:
      'Fournit une methode de lecture de contrat pour reperer les clauses importantes, les zones a clarifier et les questions a poser. Ce n est pas un avis juridique et les decisions doivent etre validees par un professionnel qualifie si necessaire.',
    capabilities: [
      'Structurer la lecture d un contrat',
      'Lister clauses a verifier',
      'Identifier questions de clarification',
      'Preparer une checklist de points de vigilance',
      'Aider a formuler des questions pour un conseil juridique',
    ],
    limitations: [
      'Ne fournit pas de conseil juridique',
      'Ne remplace pas un avocat',
      'Ne garantit pas la conformite du contrat',
    ],
    required_inputs: ['Contrat ou extraits', 'type de relation', 'pays ou contexte general', 'points d inquietude'],
    setup_requirements: {
      type: 'document',
      items: ['Contrat ou extraits', 'contexte', 'points d inquietude'],
    },
    deliverables: ['Checklist de lecture', 'Clauses a verifier', 'Questions a poser', 'Disclaimer juridique'],
    example_output:
      'Point a verifier: clause de resiliation.\\nQuestion: quel preavis exact s applique et y a-t-il des frais?\\nNote: a valider avec un professionnel du droit.',
    known_limits: ['Usage informatif uniquement', 'Validation juridique externe recommandee'],
    pricing_type: 'task',
    fixed_price: 39,
    pricing_details: 'Inclut une checklist de lecture informative pour un contrat fourni.',
    risk_level: 'medium',
    workspace_mode: 'document_required',
    output_promise: {
      summary: 'Une checklist informative pour lire un contrat et preparer les bonnes questions.',
      examples: ['Contrat prestataire', 'NDA', 'Conditions commerciales'],
    },
    execution_mode: 'guided_workspace',
    data_policy: {
      stores_user_data: true,
      requires_files: true,
      external_tools: [],
    },
    workspace_actions: ['Préparer le contrat', 'Lire les clauses clés', 'Lister les questions'],
    workspace_actions_en: ['Prepare the contract', 'Read key clauses', 'List questions'],
  },
];

export function templateToCreatorFormValues(template, categories = []) {
  if (!template) {
    return null;
  }

  const category = categories.find((item) => item.slug === template.category_slug);

  return {
    name: template.label,
    category_id: category?.id ?? '',
    short_description: template.short_description,
    target_user: template.target_user,
    long_description: template.detailed_description,
    does: template.capabilities.join('\n'),
    does_not_do: template.limitations.join('\n'),
    required_inputs: template.required_inputs.join('\n'),
    deliverables: template.deliverables.join('\n'),
    sample_output: template.example_output,
    known_limits: template.known_limits.join('\n'),
    pricing_type: template.pricing_type,
    starting_price_eur: String(template.fixed_price),
    risk_level: template.risk_level,
    pricing_hint: template.pricing_details,
    execution_method: template.data_policy.external_tools.length
      ? `External tools: ${template.data_policy.external_tools.join(', ')}`
      : 'Guided workspace using creator-provided instructions and user context.',
    workspace_mode: template.workspace_mode,
    setup_type: template.setup_requirements.type,
    setup_items: template.setup_requirements.items.join('\n'),
    output_promise_summary: template.output_promise.summary,
    output_promise_examples: template.output_promise.examples.join('\n'),
    execution_mode: template.execution_mode,
  };
}

export function getAgentTemplateByLabel(label) {
  if (!label) {
    return null;
  }

  return AGENT_TEMPLATES.find((template) => template.label.toLowerCase() === label.toLowerCase()) ?? null;
}
