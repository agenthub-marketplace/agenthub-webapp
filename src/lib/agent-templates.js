export const AGENT_TEMPLATES = [
  {
    key: 'linkedin-content-studio',
    label: 'LinkedIn Content Studio',
    category_slug: 'business-documents',
    category: 'Marketing / Content',
    short_description: 'Transforme une idee ou une expertise en posts LinkedIn prets a adapter.',
    target_user: 'Fondateurs, consultants, freelances et equipes marketing B2B.',
    detailed_description:
      'Aide l utilisateur a transformer une idee brute, une expertise ou un retour terrain en contenu LinkedIn clair. Le workspace LLM guide l angle, propose des hooks, structure le post et genere des variantes de ton sans publier automatiquement.',
    capabilities: [
      'Clarifier un angle editorial LinkedIn',
      'Generer hooks, plans et call-to-action',
      'Adapter le ton a une audience B2B',
      'Proposer plusieurs variantes de post',
      'Transformer une idee brute en contenu actionnable',
    ],
    limitations: [
      'Ne publie pas directement sur LinkedIn',
      'Ne garantit pas la viralite ou la performance',
      'Ne verifie pas les faits externes',
      'Ne remplace pas la validation de marque par l utilisateur',
    ],
    required_inputs: [
      'Sujet ou idee principale',
      'Audience cible',
      'Objectif du post',
      'Ton souhaite',
      'Contraintes de marque eventuelles',
    ],
    setup_requirements: {
      type: 'context',
      items: ['Sujet', 'audience', 'objectif', 'ton', 'contraintes de marque'],
    },
    deliverables: [
      'Hooks possibles',
      'Structure de post LinkedIn',
      'Version courte et version detaillee',
      'Suggestions de call-to-action',
    ],
    example_output:
      'Hook: "La plupart des equipes B2B perdent leurs meilleurs insights avant meme de les publier."\\n\\nPost: probleme, observation terrain, methode simple, exemple, CTA.',
    known_limits: [
      'Les donnees de performance doivent etre verifiees apres publication',
      'Le contenu doit etre relu avant usage public',
    ],
    pricing_type: 'task',
    fixed_price: 19,
    pricing_details: 'Inclut l acces au workspace LLM pour preparer un post LinkedIn et ses variantes.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Des posts LinkedIn actionnables avec hooks, structure et variantes de ton.',
      examples: ['Post fondateur', 'Post expertise', 'Post retour d experience'],
    },
    execution_mode: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Definir l angle', 'Generer des hooks', 'Creer le post', 'Adapter le ton'],
    workspace_actions_en: ['Define the angle', 'Generate hooks', 'Create the post', 'Adapt the tone'],
  },
  {
    key: 'sales-email-builder',
    label: 'Sales Email Builder',
    category_slug: 'business-documents',
    category: 'Sales',
    short_description: 'Genere des emails de prospection B2B courts, clairs et personnalisables.',
    target_user: 'Sales, fondateurs, consultants et independants en prospection B2B.',
    detailed_description:
      'Aide l utilisateur a cadrer une cible, une proposition de valeur et une preuve pour generer un email de prospection, des objets et une relance. L agent reste text-only et n envoie aucun email.',
    capabilities: [
      'Structurer un email de prospection',
      'Clarifier la proposition de valeur',
      'Adapter le message a un segment cible',
      'Proposer objets et call-to-action',
      'Generer une relance courte',
    ],
    limitations: [
      'Ne scrape pas de donnees prospects',
      'N envoie pas les emails',
      'Ne garantit pas les taux de reponse',
      'Ne remplace pas la verification legal/anti-spam',
    ],
    required_inputs: ['Cible', 'offre', 'probleme adresse', 'preuve ou reference', 'CTA souhaite'],
    setup_requirements: {
      type: 'context',
      items: ['Segment cible', 'offre', 'preuve', 'CTA'],
    },
    deliverables: ['Email principal', 'Objets possibles', 'Relance courte', 'Checklist avant envoi'],
    example_output:
      'Objet: Question rapide sur votre pipeline\\n\\nBonjour, j ai remarque que votre equipe recrute cote sales. Nous aidons les equipes B2B a reduire le temps de preparation des emails sans perdre la personnalisation...',
    known_limits: ['Le message doit etre adapte a chaque prospect', 'La responsabilite d envoi reste cote utilisateur'],
    pricing_type: 'task',
    fixed_price: 15,
    pricing_details: 'Inclut l acces au workspace LLM pour generer un email, des objets et une relance.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un email de prospection B2B pret a personnaliser avec objet, message et relance.',
      examples: ['Email froid', 'Relance 3 jours', 'Version fondateur'],
    },
    execution_mode: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Cadrer la cible', 'Ecrire l email', 'Proposer des objets', 'Preparer la relance'],
    workspace_actions_en: ['Frame the target', 'Write the email', 'Suggest subject lines', 'Prepare the follow-up'],
  },
  {
    key: 'text-rewrite-assistant',
    label: 'Text Rewrite Assistant',
    category_slug: 'business-documents',
    category: 'Productivity / Writing',
    short_description: 'Reformule un texte court pour le rendre plus clair, professionnel et actionnable.',
    target_user: 'Professionnels, freelances, managers et equipes support ou contenu.',
    detailed_description:
      'Aide l utilisateur a ameliorer un texte fourni: clarification, ton plus professionnel, version plus courte ou plus directe. Le workspace fonctionne avec du texte colle par l utilisateur, sans fichier et sans publication automatique.',
    capabilities: [
      'Reformuler un texte fourni par l utilisateur',
      'Ameliorer la clarte et le ton',
      'Proposer une version plus concise',
      'Structurer les idees importantes',
      'Signaler les informations manquantes',
    ],
    limitations: [
      'Ne verifie pas les faits sur internet',
      'Ne traite pas de fichiers',
      'Ne donne pas de conseil juridique, medical ou financier',
      'Ne publie pas le contenu a la place de l utilisateur',
    ],
    required_inputs: ['Texte a reformuler', 'ton souhaite', 'objectif du message'],
    setup_requirements: {
      type: 'context',
      items: ['Texte a reformuler', 'ton souhaite', 'objectif du message'],
    },
    deliverables: ['Version reformulee', 'Suggestions d amelioration', 'Points a verifier avant usage'],
    example_output:
      'Version professionnelle: "Merci pour votre retour. Voici les trois points que nous proposons de clarifier avant de finaliser la prochaine etape..."',
    known_limits: ['La sortie depend fortement du texte et du contexte fournis'],
    pricing_type: 'task',
    fixed_price: 5,
    pricing_details: 'Inclut l acces au workspace LLM pour reformuler et ameliorer un texte court.',
    risk_level: 'low',
    workspace_mode: 'instant',
    output_promise: {
      summary: 'Une version plus claire, concise ou professionnelle du texte fourni.',
      examples: ['Email professionnel', 'Message LinkedIn', 'Description produit'],
    },
    execution_mode: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Clarifier le texte', 'Raccourcir le message', 'Professionnaliser le ton'],
    workspace_actions_en: ['Clarify the text', 'Shorten the message', 'Make the tone professional'],
  },
  {
    key: 'business-swot-analyst',
    label: 'Business SWOT Analyst',
    category_slug: 'research-analysis',
    category: 'Business analysis',
    short_description: 'Structure une analyse SWOT exploitable a partir du contexte fourni.',
    target_user: 'Fondateurs, freelances, consultants et equipes business.',
    detailed_description:
      'Transforme un contexte business fourni par l utilisateur en analyse forces, faiblesses, opportunites et menaces. L agent aide a separer faits, hypotheses et risques, puis propose des actions prioritaires.',
    capabilities: [
      'Structurer une SWOT',
      'Identifier forces, faiblesses, opportunites et menaces',
      'Relier les constats a des actions',
      'Separarer faits, hypotheses et risques',
      'Preparer une synthese executive',
    ],
    limitations: [
      'Ne remplace pas une etude de marche complete',
      'Ne verifie pas automatiquement les donnees externes',
      'Ne donne pas de conseil financier reglemente',
      'Ne prend pas de decision business a la place de l utilisateur',
    ],
    required_inputs: ['Description du projet', 'marche cible', 'concurrents connus', 'forces internes', 'contraintes'],
    setup_requirements: {
      type: 'context',
      items: ['Projet', 'marche', 'concurrents', 'forces internes', 'contraintes'],
    },
    deliverables: ['Grille SWOT', 'Synthese des risques', 'Actions prioritaires', 'Questions ouvertes'],
    example_output:
      'Force: expertise niche deja prouvee.\\nFaiblesse: acquisition non stabilisee.\\nOpportunite: segment PME peu outille.\\nMenace: concurrence SaaS verticale.\\nAction: tester un positionnement vertical sur 10 prospects.',
    known_limits: ['Les recommandations dependent de la qualite du contexte fourni'],
    pricing_type: 'task',
    fixed_price: 29,
    pricing_details: 'Inclut l acces au workspace LLM pour produire une SWOT et des actions prioritaires.',
    risk_level: 'medium',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Une SWOT exploitable avec constats, risques, hypotheses et actions prioritaires.',
      examples: ['SWOT lancement produit', 'SWOT repositionnement', 'SWOT offre service'],
    },
    execution_mode: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Cadrer le contexte', 'Construire la SWOT', 'Prioriser les actions', 'Identifier les risques'],
    workspace_actions_en: ['Frame the context', 'Build the SWOT', 'Prioritize actions', 'Identify risks'],
  },
  {
    key: 'meeting-notes-checklist',
    label: 'Meeting Notes Checklist',
    category_slug: 'business-documents',
    category: 'Productivity',
    short_description: 'Transforme des notes de reunion collees en decisions, actions et suivi.',
    target_user: 'Managers, chefs de projet, fondateurs et equipes operations.',
    detailed_description:
      'Aide a organiser des notes de reunion fournies par l utilisateur pour clarifier les decisions, les actions, les owners et les prochaines etapes. Aucun upload ni integration calendrier n est utilise en v0.',
    capabilities: [
      'Structurer des notes de reunion',
      'Identifier decisions et actions',
      'Assigner owners et deadlines quand ils sont fournis',
      'Lister points ouverts',
      'Preparer un recap partageable',
    ],
    limitations: [
      'Ne transcrit pas automatiquement les reunions',
      'Ne s integre pas aux calendriers ou outils de notes',
      'Ne devine pas les owners absents du contexte',
      'Ne remplace pas la validation des participants',
    ],
    required_inputs: ['Notes brutes collees', 'participants', 'objectif de la reunion', 'decisions connues'],
    setup_requirements: {
      type: 'context',
      items: ['Notes brutes collees', 'participants', 'objectif', 'decisions connues'],
    },
    deliverables: ['Recap structure', 'Liste d actions', 'Owners et echeances', 'Points ouverts'],
    example_output:
      'Decision: valider le scope MVP.\\nAction: Sarah prepare la maquette avant vendredi.\\nPoint ouvert: confirmer le budget analytics.\\nSuivi: envoyer recap aux participants.',
    known_limits: ['La qualite depend de la precision des notes fournies'],
    pricing_type: 'task',
    fixed_price: 12,
    pricing_details: 'Inclut l acces au workspace LLM pour transformer des notes collees en checklist actionnable.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un recap clair avec decisions, actions, owners, echeances et points ouverts.',
      examples: ['Reunion projet', 'Comite hebdo', 'Point client'],
    },
    execution_mode: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Extraire les decisions', 'Lister les actions', 'Attribuer les owners', 'Preparer le suivi'],
    workspace_actions_en: ['Extract decisions', 'List action items', 'Assign owners', 'Prepare follow-up'],
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
      : 'LLM Runner texte: OpenAI server-side, text-only, no files, no external tools.',
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
