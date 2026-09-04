export const AGENT_TEMPLATES = [
  {
    key: 'linkedin-content-studio',
    label: 'LinkedIn Content Studio',
    category_slug: 'business-documents',
    category: 'Marketing / Content',
    short_description: 'Transforme une idée ou une expertise en posts LinkedIn prêts à adapter.',
    target_user: 'Fondateurs, consultants, freelances et équipes marketing B2B.',
    detailed_description:
      'Aide l’utilisateur à transformer une idée brute, une expertise ou un retour terrain en contenu LinkedIn clair. Le workspace LLM guide l’angle, propose des hooks, structure le post et génère des variantes de ton sans publier automatiquement.',
    capabilities: [
      'Clarifier un angle éditorial LinkedIn',
      'Générer hooks, plans et call-to-action',
      'Adapter le ton à une audience B2B',
      'Proposer plusieurs variantes de post',
      'Transformer une idée brute en contenu actionnable',
    ],
    limitations: [
      'Ne publie pas directement sur LinkedIn',
      'Ne garantit pas la viralité ou la performance',
      'Ne vérifie pas les faits externes',
      'Ne remplace pas la validation de marque par l’utilisateur',
    ],
    required_inputs: [
      'Sujet ou idée principale',
      'Audience cible',
      'Objectif du post',
      'Ton souhaité',
      'Contraintes de marque éventuelles',
    ],
    setup_requirements: {
      type: 'context',
      items: ['Sujet', 'audience', 'objectif', 'ton', 'contraintes de marque'],
    },
    deliverables: [
      'Hooks possibles',
      'Structure de post LinkedIn',
      'Version courte et version détaillée',
      'Suggestions de call-to-action',
    ],
    example_output:
      'Hook: "La plupart des équipes B2B perdent leurs meilleurs insights avant même de les publier."\\n\\nPost: problème, observation terrain, méthode simple, exemple, CTA.',
    known_limits: [
      'Les données de performance doivent être vérifiées après publication',
      'Le contenu doit être relu avant usage public',
    ],
    pricing_type: 'task',
    fixed_price: 19,
    pricing_details: 'Inclut l’accès au workspace LLM pour préparer un post LinkedIn et ses variantes.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Des posts LinkedIn actionnables avec hooks, structure et variantes de ton.',
      examples: ['Post fondateur', 'Post expertise', 'Post retour d’expérience'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Définir l’angle', 'Générer des hooks', 'Créer le post', 'Adapter le ton'],
    workspace_actions_en: ['Define the angle', 'Generate hooks', 'Create the post', 'Adapt the tone'],
  },
  {
    key: 'sales-email-builder',
    label: 'Sales Email Builder',
    category_slug: 'business-documents',
    category: 'Sales',
    short_description: 'Génère des emails de prospection B2B courts, clairs et personnalisables.',
    target_user: 'Sales, fondateurs, consultants et indépendants en prospection B2B.',
    detailed_description:
      'Aide l’utilisateur à cadrer une cible, une proposition de valeur et une preuve pour générer un email de prospection, des objets et une relance. L’agent reste text-only et n’envoie aucun email.',
    capabilities: [
      'Structurer un email de prospection',
      'Clarifier la proposition de valeur',
      'Adapter le message à un segment cible',
      'Proposer objets et call-to-action',
      'Générer une relance courte',
    ],
    limitations: [
      'Ne scrape pas de données prospects',
      'N’envoie pas les emails',
      'Ne garantit pas les taux de réponse',
      'Ne remplace pas la vérification légal/anti-spam',
    ],
    required_inputs: ['Cible', 'offre', 'problème adressé', 'preuve ou référence', 'CTA souhaité'],
    setup_requirements: {
      type: 'context',
      items: ['Segment cible', 'offre', 'preuve', 'CTA'],
    },
    deliverables: ['Email principal', 'Objets possibles', 'Relance courte', 'Checklist avant envoi'],
    example_output:
      'Objet: Question rapide sur votre pipeline\\n\\nBonjour, j’ai remarqué que votre équipe recrute côté sales. Nous aidons les équipes B2B à réduire le temps de préparation des emails sans perdre la personnalisation...',
    known_limits: ['Le message doit être adapté à chaque prospect', 'La responsabilité d’envoi reste côté utilisateur'],
    pricing_type: 'task',
    fixed_price: 15,
    pricing_details: 'Inclut l’accès au workspace LLM pour générer un email, des objets et une relance.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un email de prospection B2B prêt à personnaliser avec objet, message et relance.',
      examples: ['Email froid', 'Relance 3 jours', 'Version fondateur'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Cadrer la cible', 'Écrire l’email', 'Proposer des objets', 'Préparer la relance'],
    workspace_actions_en: ['Frame the target', 'Write the email', 'Suggest subject lines', 'Prepare the follow-up'],
  },
  {
    key: 'text-rewrite-assistant',
    label: 'Text Rewrite Assistant',
    category_slug: 'business-documents',
    category: 'Productivity / Writing',
    short_description: 'Reformule un texte court pour le rendre plus clair, professionnel et actionnable.',
    target_user: 'Professionnels, freelances, managers et équipes support ou contenu.',
    detailed_description:
      'Aide l’utilisateur à améliorer un texte fourni: clarification, ton plus professionnel, version plus courte ou plus directe. Le workspace fonctionne avec du texte collé par l’utilisateur, sans fichier et sans publication automatique.',
    capabilities: [
      'Reformuler un texte fourni par l’utilisateur',
      'Améliorer la clarté et le ton',
      'Proposer une version plus concise',
      'Structurer les idées importantes',
      'Signaler les informations manquantes',
    ],
    limitations: [
      'Ne vérifie pas les faits sur internet',
      'Ne traite pas de fichiers',
      'Ne donne pas de conseil juridique, médical ou financier',
      'Ne publie pas le contenu à la place de l’utilisateur',
    ],
    required_inputs: ['Texte à reformuler', 'ton souhaité', 'objectif du message'],
    setup_requirements: {
      type: 'context',
      items: ['Texte à reformuler', 'ton souhaité', 'objectif du message'],
    },
    deliverables: ['Version reformulée', 'Suggestions d’amélioration', 'Points à vérifier avant usage'],
    example_output:
      'Version professionnelle: "Merci pour votre retour. Voici les trois points que nous proposons de clarifier avant de finaliser la prochaine étape..."',
    known_limits: ['La sortie dépend fortement du texte et du contexte fournis'],
    pricing_type: 'task',
    fixed_price: 5,
    pricing_details: 'Inclut l’accès au workspace LLM pour reformuler et améliorer un texte court.',
    risk_level: 'low',
    workspace_mode: 'instant',
    output_promise: {
      summary: 'Une version plus claire, concise ou professionnelle du texte fourni.',
      examples: ['Email professionnel', 'Message LinkedIn', 'Description produit'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'llm_prompt',
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
    short_description: 'Structure une analyse SWOT exploitable à partir du contexte fourni.',
    target_user: 'Fondateurs, freelances, consultants et équipes business.',
    detailed_description:
      'Transforme un contexte business fourni par l’utilisateur en analyse forces, faiblesses, opportunités et menaces. L’agent aide à séparer faits, hypothèses et risques, puis propose des actions prioritaires.',
    capabilities: [
      'Structurer une SWOT',
      'Identifier forces, faiblesses, opportunités et menaces',
      'Relier les constats à des actions',
      'Séparer faits, hypothèses et risques',
      'Préparer une synthèse exécutive',
    ],
    limitations: [
      'Ne remplace pas une étude de marché complète',
      'Ne vérifie pas automatiquement les données externes',
      'Ne donne pas de conseil financier réglementé',
      'Ne prend pas de décision business à la place de l’utilisateur',
    ],
    required_inputs: ['Description du projet', 'marché cible', 'concurrents connus', 'forces internes', 'contraintes'],
    setup_requirements: {
      type: 'context',
      items: ['Projet', 'marché', 'concurrents', 'forces internes', 'contraintes'],
    },
    deliverables: ['Grille SWOT', 'Synthèse des risques', 'Actions prioritaires', 'Questions ouvertes'],
    example_output:
      'Force: expertise niche déjà prouvée.\\nFaiblesse: acquisition non stabilisée.\\nOpportunité: segment PME peu outillé.\\nMenace: concurrence SaaS verticale.\\nAction: tester un positionnement vertical sur 10 prospects.',
    known_limits: ['Les recommandations dépendent de la qualité du contexte fourni'],
    pricing_type: 'task',
    fixed_price: 29,
    pricing_details: 'Inclut l’accès au workspace LLM pour produire une SWOT et des actions prioritaires.',
    risk_level: 'medium',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Une SWOT exploitable avec constats, risques, hypothèses et actions prioritaires.',
      examples: ['SWOT lancement produit', 'SWOT repositionnement', 'SWOT offre service'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'llm_prompt',
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
    short_description: 'Transforme des notes de réunion collées en décisions, actions et suivi.',
    target_user: 'Managers, chefs de projet, fondateurs et équipes opérations.',
    detailed_description:
      'Aide à organiser des notes de réunion fournies par l’utilisateur pour clarifier les décisions, les actions, les owners et les prochaines étapes. Aucun upload ni intégration calendrier n’est utilisé en v0.',
    capabilities: [
      'Structurer des notes de réunion',
      'Identifier décisions et actions',
      'Assigner owners et deadlines quand ils sont fournis',
      'Lister points ouverts',
      'Préparer un récap partageable',
    ],
    limitations: [
      'Ne transcrit pas automatiquement les réunions',
      'Ne s’intègre pas aux calendriers ou outils de notes',
      'Ne devine pas les owners absents du contexte',
      'Ne remplace pas la validation des participants',
    ],
    required_inputs: ['Notes brutes collées', 'participants', 'objectif de la réunion', 'décisions connues'],
    setup_requirements: {
      type: 'context',
      items: ['Notes brutes collées', 'participants', 'objectif', 'décisions connues'],
    },
    deliverables: ['Récap structuré', 'Liste d’actions', 'Owners et échéances', 'Points ouverts'],
    example_output:
      'Décision: valider le scope MVP.\\nAction: Sarah prépare la maquette avant vendredi.\\nPoint ouvert: confirmer le budget analytics.\\nSuivi: envoyer récap aux participants.',
    known_limits: ['La qualité dépend de la précision des notes fournies'],
    pricing_type: 'task',
    fixed_price: 12,
    pricing_details: 'Inclut l’accès au workspace LLM pour transformer des notes collées en checklist actionnable.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un récap clair avec décisions, actions, owners, échéances et points ouverts.',
      examples: ['Réunion projet', 'Comité hebdo', 'Point client'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Extraire les décisions', 'Lister les actions', 'Attribuer les owners', 'Préparer le suivi'],
    workspace_actions_en: ['Extract decisions', 'List action items', 'Assign owners', 'Prepare follow-up'],
  },
  {
    key: 'support-triage-agent',
    label: 'Support Triage Agent',
    category_slug: 'business-documents',
    category: 'Support / Operations',
    short_description: 'Classe une demande support, décide la priorité et génère une réponse de suivi.',
    target_user: 'Équipes support, fondateurs et opérations qui veulent prioriser les tickets entrants.',
    detailed_description:
      'Agent workflow beta qui analyse une demande support, décide une priorité et une catégorie, puis produit une réponse client et une checklist interne. Le workflow est linéaire, sans webhook obligatoire en v0, et reste soumis à validation admin + security review.',
    capabilities: [
      'Analyser une demande support fournie par l’utilisateur',
      'Décider une priorité faible, moyenne ou haute',
      'Classer la demande en bug, billing, how-to ou feature',
      'Générer une réponse client claire',
      'Produire une checklist de suivi interne',
    ],
    limitations: [
      'Ne se connecte pas au helpdesk',
      'Ne crée pas de ticket automatiquement',
      'Ne rembourse pas et ne modifie aucun compte client',
      'N’appelle aucun webhook tant qu’un endpoint n’est pas configuré et approuvé',
    ],
    required_inputs: [
      'Message utilisateur',
      'Produit ou service concerné',
      'Contexte client connu',
      'Urgence ou impact si connu',
    ],
    setup_requirements: {
      type: 'context',
      items: ['Message support', 'produit concerné', 'contexte client', 'impact connu'],
    },
    deliverables: [
      'Priorité décidée',
      'Catégorie support',
      'Réponse client proposée',
      'Checklist de suivi interne',
    ],
    example_output:
      'Décision: priorité haute, catégorie bug. Réponse client: nous avons identifié un blocage d’accès probable. Checklist: vérifier statut compte, logs auth, dernier paiement, puis escalader si reproduction confirmée.',
    known_limits: [
      'La priorité dépend du contexte fourni',
      'La décision doit être validée par l’équipe support avant action réelle',
      'Aucune action externe n’est déclenchée automatiquement en v0',
    ],
    pricing_type: 'task',
    fixed_price: 21,
    pricing_details: 'Inclut un workflow beta de triage support avec décision LLM structurée et réponse proposée.',
    risk_level: 'medium',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Une décision de triage support avec priorité, catégorie, réponse client et checklist interne.',
      examples: ['Ticket bug', 'Question facturation', 'Demande how-to', 'Suggestion feature'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'workflow_automation',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workflow_steps:
      'llm: Analyser la demande et extraire le problème, le contexte et l’urgence\nllm: Décider la priorité, la catégorie support et le routage recommandé\nllm: Générer une réponse client et une checklist de suivi interne',
    workspace_actions: ['Trier la demande', 'Décider la priorité', 'Générer la réponse', 'Préparer le suivi'],
    workspace_actions_en: ['Triage request', 'Decide priority', 'Generate response', 'Prepare follow-up'],
  },
  {
    key: 'lead-qualification-agent',
    label: 'Lead Qualification Agent',
    category_slug: 'business-documents',
    category: 'Sales / CRM',
    short_description: 'Analyse un lead, décide son niveau de qualification et propose la prochaine action.',
    target_user: 'Sales B2B, fondateurs et équipes growth qui qualifient des leads entrants.',
    detailed_description:
      'Agent workflow beta qui transforme un contexte lead en décision structurée: qualifié oui/non/peut-être, score 0-100, raisons et prochaine action commerciale. Le workflow ne contacte aucun prospect et ne pousse rien dans le CRM en v0.',
    capabilities: [
      'Analyser le profil et le besoin d’un lead',
      'Décider si le lead est qualifié, non qualifié ou incertain',
      'Attribuer un score de qualification de 0 à 100',
      'Choisir la prochaine action commerciale',
      'Générer un message de suivi adapté',
    ],
    limitations: [
      'Ne contacte pas le prospect',
      'Ne modifie pas le CRM',
      'Ne scrape pas d’informations externes',
      'Ne remplace pas la validation sales humaine',
    ],
    required_inputs: [
      'Description du lead',
      'Entreprise ou segment',
      'Besoin exprimé',
      'ICP cible',
      'Contraintes commerciales connues',
    ],
    setup_requirements: {
      type: 'context',
      items: ['Profil lead', 'besoin exprimé', 'ICP cible', 'contraintes commerciales'],
    },
    deliverables: ['Décision qualified yes/no/maybe', 'Score 0-100', 'Raisons principales', 'Prochaine action', 'Message de suivi'],
    example_output:
      'Décision: maybe. Score: 64/100. Next action: demander le volume mensuel et l’outil CRM actuel. Message: merci pour votre demande, pour vérifier le fit pouvez-vous préciser...',
    known_limits: [
      'Le scoring dépend du contexte fourni',
      'Aucune donnée externe n’est enrichie automatiquement',
      'La décision ne doit pas être utilisée comme unique critère commercial',
    ],
    pricing_type: 'task',
    fixed_price: 24,
    pricing_details: 'Inclut un workflow beta de qualification lead avec décision LLM structurée et message de suivi.',
    risk_level: 'medium',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Une qualification lead avec décision, score, justification et prochaine action commerciale.',
      examples: ['Lead inbound SaaS', 'Demande démo', 'Prospect incertain', 'Relance commerciale'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'workflow_automation',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workflow_steps:
      'llm: Analyser le lead, le contexte entreprise et le besoin exprimé\nllm: Décider si le lead est qualifié, calculer un score 0-100 et choisir la prochaine action\nllm: Générer un email de suivi et un résumé CRM court',
    workspace_actions: ['Analyser le lead', 'Décider le score', 'Choisir la prochaine action', 'Générer le suivi'],
    workspace_actions_en: ['Analyze lead', 'Decide score', 'Choose next action', 'Generate follow-up'],
  },
  {
    key: 'crm-enrichment-api-agent',
    label: 'CRM Enrichment API Agent',
    category_slug: 'business-documents',
    category: 'Sales / CRM',
    short_description: 'Normalise un contexte CRM puis appelle une API creator HTTPS approuvée.',
    target_user: 'Équipes sales et ops qui veulent enrichir un lead via une API interne validée.',
    detailed_description:
      'Agent API beta. AgentHub prépare et normalise le contexte fourni, vérifie si l’appel API est pertinent, puis appelle côté serveur un endpoint HTTPS creator approuvé et signé. L’URL doit être renseignée par le creator puis validée par l’admin avant publication.',
    capabilities: [
      'Normaliser un contexte lead ou compte',
      'Décider si un enrichissement API est pertinent',
      'Préparer un payload court et structuré',
      'Appeler une API creator HTTPS approuvée côté serveur',
      'Restituer une sortie enrichie lisible',
    ],
    limitations: [
      'N’accepte pas d’URL localhost ou IP privée',
      'N’appelle pas l’endpoint depuis le navigateur',
      'Ne stocke aucun secret creator côté client',
      'N’exécute aucun code creator dans AgentHub',
    ],
    required_inputs: [
      'Nom de l’entreprise ou du lead',
      'Contexte CRM connu',
      'Objectif d’enrichissement',
      'Champs attendus si connus',
    ],
    setup_requirements: {
      type: 'context',
      items: ['Entreprise ou lead', 'contexte CRM', 'objectif d’enrichissement', 'champs attendus'],
    },
    deliverables: ['Décision d’appel API', 'Payload normalisé', 'Réponse enrichie', 'Points à vérifier'],
    example_output:
      'Décision: appel API pertinent. Payload normalisé: company_name, domain, country, crm_notes. Résultat enrichi: segment estimé, signaux détectés, champs manquants à vérifier.',
    known_limits: [
      'Un endpoint HTTPS approuvé est obligatoire',
      'La réponse dépend entièrement de l’API creator',
      'Les enrichissements doivent être vérifiés avant usage commercial',
    ],
    pricing_type: 'task',
    fixed_price: 34,
    pricing_details: 'Inclut un appel serveur signé vers une API creator approuvée et une synthèse du résultat.',
    risk_level: 'medium',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un enrichissement CRM via API creator approuvée avec décision d’appel, résultat et points de contrôle.',
      examples: ['Enrichissement lead', 'Compte cible', 'Signal CRM', 'Qualification API'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'creator_endpoint',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    creator_endpoint_name: 'CRM Enrichment API',
    creator_endpoint_url: '',
    workspace_actions: ['Préparer le contexte', 'Vérifier la pertinence API', 'Envoyer à l’agent', 'Lire l’enrichissement'],
    workspace_actions_en: ['Prepare context', 'Check API relevance', 'Send to agent', 'Read enrichment'],
  },
  {
    key: 'document-summary-pro',
    label: 'Document Summary Pro',
    category_slug: 'business-documents',
    category: 'Document / Analysis',
    short_description: 'Résume un PDF ou DOCX collé en beta document et extrait les points importants.',
    target_user: 'Managers, consultants, opérations et équipes qui doivent lire vite des documents courts.',
    detailed_description:
      'Aide l’utilisateur à transformer un document texte PDF/DOCX en synthèse claire: résumé, points clés, risques, actions et questions ouvertes. Le fichier reste privé, aucun OCR ni recherche web n’est effectué en v0.',
    capabilities: [
      'Extraire les idées principales d’un document fourni',
      'Structurer un résumé actionnable',
      'Identifier points d’attention et questions ouvertes',
      'Lister les actions ou décisions mentionnées',
      'Produire une version courte pour partage interne',
    ],
    limitations: [
      'Ne traite pas les PDF scannés sans texte',
      'Ne vérifie pas les faits sur internet',
      'Ne doit pas recevoir de documents sensibles réels en beta',
      'Ne remplace pas une revue humaine du document original',
    ],
    required_inputs: ['Document PDF ou DOCX texte', 'objectif de lecture', 'angle de synthèse souhaité'],
    setup_requirements: {
      type: 'document',
      items: ['Document PDF ou DOCX', 'objectif de lecture', 'angle de synthèse'],
    },
    deliverables: ['Résumé court', 'Points clés', 'Actions ou décisions', 'Questions ouvertes'],
    example_output:
      'Synthèse: le document décrit trois priorités produit. Point d’attention: la dépendance data n’est pas tranchée. Action: confirmer owner et échéance avant lancement.',
    known_limits: ['Les fichiers scannés/image-only ne sont pas supportés', 'La beta limite la taille du fichier'],
    pricing_type: 'task',
    fixed_price: 18,
    pricing_details: 'Inclut l’analyse d’un document texte court en beta Agent document.',
    risk_level: 'low',
    workspace_mode: 'document_required',
    output_promise: {
      summary: 'Une synthèse claire du document avec points clés, actions et questions ouvertes.',
      examples: ['Mémo interne', 'Compte rendu long', 'Document projet'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: true,
      external_tools: [],
    },
    workspace_actions: ['Résumer le document', 'Extraire les actions', 'Lister les risques', 'Préparer une synthèse'],
    workspace_actions_en: ['Summarize the document', 'Extract actions', 'List risks', 'Prepare a brief'],
  },
  {
    key: 'contract-reading-assistant',
    label: 'Contract Reading Assistant',
    category_slug: 'business-documents',
    category: 'Legal assistance',
    short_description: 'Aide à lire un contrat et à repérer clauses, obligations et points à vérifier.',
    target_user: 'Fondateurs, freelances et équipes opérations avant revue juridique finale.',
    detailed_description:
      'Aide l’utilisateur à comprendre un contrat fourni en PDF/DOCX: clauses importantes, obligations, dates, risques à discuter et questions à poser. L’agent ne donne pas de conseil juridique définitif et ne remplace pas un avocat.',
    capabilities: [
      'Identifier clauses et obligations principales',
      'Repérer dates, parties et engagements',
      'Lister points à vérifier avant signature',
      'Formuler des questions pour un professionnel',
      'Résumer le contrat en langage simple',
    ],
    limitations: [
      'Ne donne pas de conseil juridique définitif',
      'Ne remplace pas une revue avocat',
      'Ne traite pas les documents scannés sans texte',
      'Ne vérifie pas le droit applicable en ligne',
    ],
    required_inputs: ['Contrat PDF ou DOCX texte', 'contexte de la relation', 'points de vigilance souhaités'],
    setup_requirements: {
      type: 'document',
      items: ['Contrat PDF ou DOCX', 'contexte de la relation', 'points à vérifier'],
    },
    deliverables: ['Résumé du contrat', 'Clauses importantes', 'Obligations et dates', 'Questions à poser'],
    example_output:
      'Point à vérifier: clause de renouvellement automatique à 30 jours. Question: quelle procédure exacte permet de résilier avant reconduction ?',
    known_limits: ['Usage informatif uniquement', 'Validation juridique externe recommandée'],
    pricing_type: 'task',
    fixed_price: 25,
    pricing_details: 'Inclut une lecture assistée d’un contrat texte court en beta Agent document.',
    risk_level: 'medium',
    workspace_mode: 'document_required',
    output_promise: {
      summary: 'Une lecture structurée du contrat avec obligations, risques et questions à clarifier.',
      examples: ['Contrat freelance', 'NDA', 'Conditions de service'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: true,
      external_tools: [],
    },
    workspace_actions: ['Résumer le contrat', 'Identifier les obligations', 'Lister les risques', 'Préparer les questions'],
    workspace_actions_en: ['Summarize the contract', 'Identify obligations', 'List risks', 'Prepare questions'],
  },
  {
    key: 'newsletter-brief-assistant',
    label: 'Newsletter Brief Assistant',
    category_slug: 'business-documents',
    category: 'Marketing / Content',
    short_description: 'Transforme un sujet ou une veille en brief de newsletter prêt à rédiger.',
    target_user: 'Créateurs, équipes marketing, fondateurs et consultants qui publient une newsletter.',
    detailed_description:
      'Aide à cadrer une édition de newsletter: angle, structure, sections, titres, messages principaux et call-to-action. L’agent ne collecte pas de veille externe et ne publie rien automatiquement.',
    capabilities: [
      'Clarifier l’angle éditorial',
      'Structurer les sections d’une newsletter',
      'Proposer titres et accroches',
      'Transformer des notes en plan de rédaction',
      'Adapter le ton à l’audience',
    ],
    limitations: [
      'Ne fait pas de veille internet automatique',
      'Ne publie pas la newsletter',
      'Ne garantit pas l’engagement',
      'Nécessite une relecture avant envoi',
    ],
    required_inputs: ['Sujet', 'audience', 'notes ou idées', 'objectif de l’édition', 'ton souhaité'],
    setup_requirements: {
      type: 'context',
      items: ['Sujet', 'audience', 'notes', 'objectif', 'ton'],
    },
    deliverables: ['Brief éditorial', 'Plan de newsletter', 'Titres possibles', 'CTA final'],
    example_output:
      'Angle: expliquer pourquoi les équipes beta doivent tester le parcours complet. Sections: contexte, problème, checklist, appel au feedback.',
    known_limits: ['La qualité dépend des notes fournies', 'Les références externes doivent être vérifiées'],
    pricing_type: 'task',
    fixed_price: 17,
    pricing_details: 'Inclut un brief de newsletter et une structure exploitable.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un brief complet pour rédiger une newsletter claire et cohérente.',
      examples: ['Newsletter produit', 'Newsletter expertise', 'Newsletter communauté'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Définir l’angle', 'Structurer les sections', 'Proposer les titres', 'Préparer le CTA'],
    workspace_actions_en: ['Define the angle', 'Structure sections', 'Suggest titles', 'Prepare the CTA'],
  },
  {
    key: 'competitor-brief-agent',
    label: 'Competitor Brief Agent',
    category_slug: 'research-analysis',
    category: 'Business analysis',
    short_description: 'Structure un brief concurrentiel à partir du contexte fourni par l’utilisateur.',
    target_user: 'Fondateurs, product managers, sales et consultants en analyse marché.',
    detailed_description:
      'Aide à organiser des informations déjà connues sur des concurrents: positionnement, forces, faiblesses, messages, risques et angles de différenciation. L’agent ne scrape pas le web et ne vérifie pas les données externes.',
    capabilities: [
      'Comparer plusieurs concurrents à partir du contexte fourni',
      'Identifier axes de différenciation',
      'Structurer forces et faiblesses',
      'Préparer une synthèse partageable',
      'Lister questions de recherche complémentaires',
    ],
    limitations: [
      'Ne collecte pas de données externes',
      'Ne garantit pas l’exhaustivité',
      'Ne remplace pas une étude de marché',
      'Ne donne pas de conseil financier réglementé',
    ],
    required_inputs: ['Liste de concurrents', 'contexte marché', 'critères de comparaison', 'objectif du brief'],
    setup_requirements: {
      type: 'context',
      items: ['Concurrents', 'contexte marché', 'critères', 'objectif'],
    },
    deliverables: ['Tableau comparatif', 'Synthèse concurrence', 'Angles de différenciation', 'Questions ouvertes'],
    example_output:
      'Concurrent A: fort sur prix, faible sur intégration. Opportunité: positionner AgentHub sur vitesse de création et qualité workspace.',
    known_limits: ['Les données doivent être fournies ou vérifiées par l’utilisateur'],
    pricing_type: 'task',
    fixed_price: 24,
    pricing_details: 'Inclut un brief concurrentiel structuré à partir des informations fournies.',
    risk_level: 'medium',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un brief concurrentiel clair avec comparaison, différenciation et questions ouvertes.',
      examples: ['Brief SaaS', 'Analyse marché local', 'Comparaison offres service'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Cadrer les concurrents', 'Comparer les offres', 'Trouver la différenciation', 'Lister les recherches'],
    workspace_actions_en: ['Frame competitors', 'Compare offers', 'Find differentiation', 'List research gaps'],
  },
  {
    key: 'product-launch-planner',
    label: 'Product Launch Planner',
    category_slug: 'business-documents',
    category: 'Productivity / Planning',
    short_description: 'Transforme une idée de lancement produit en plan d’actions clair.',
    target_user: 'Fondateurs, product managers, équipes marketing et opérations.',
    detailed_description:
      'Aide à structurer un lancement produit: objectifs, audience, messages, séquence d’actions, risques et checklist. L’agent ne déclenche aucune campagne et ne contacte aucun outil externe.',
    capabilities: [
      'Clarifier le scope de lancement',
      'Structurer une checklist par phase',
      'Identifier risques et dépendances',
      'Proposer messages et canaux',
      'Préparer un récap partageable',
    ],
    limitations: [
      'Ne lance aucune campagne automatiquement',
      'Ne se connecte pas aux outils marketing',
      'Ne garantit pas le succès commercial',
      'Nécessite validation par l’équipe',
    ],
    required_inputs: ['Produit ou feature', 'audience cible', 'objectif', 'date cible', 'contraintes'],
    setup_requirements: {
      type: 'context',
      items: ['Produit', 'audience', 'objectif', 'date cible', 'contraintes'],
    },
    deliverables: ['Plan de lancement', 'Checklist actions', 'Risques et dépendances', 'Messages clés'],
    example_output:
      'Phase 1: valider audience et message. Phase 2: préparer assets. Phase 3: ouvrir beta. Risque: support non prêt.',
    known_limits: ['Le plan doit être adapté aux ressources réelles de l’équipe'],
    pricing_type: 'project',
    fixed_price: 29,
    pricing_details: 'Inclut un plan de lancement et une checklist priorisée.',
    risk_level: 'low',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Un plan de lancement produit structuré avec actions, messages et risques.',
      examples: ['Lancement beta', 'Feature SaaS', 'Offre service'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Définir le lancement', 'Construire la checklist', 'Identifier les risques', 'Préparer les messages'],
    workspace_actions_en: ['Define the launch', 'Build the checklist', 'Identify risks', 'Prepare messaging'],
  },
  {
    key: 'interview-prep-assistant',
    label: 'Interview Prep Assistant',
    category_slug: 'business-documents',
    category: 'HR / Recruiting',
    short_description: 'Prépare une grille d’entretien non décisionnelle pour structurer les interviews.',
    target_user: 'Managers, fondateurs et recruteurs qui veulent préparer un entretien structuré.',
    detailed_description:
      'Aide à préparer une interview en clarifiant le rôle, les compétences à évaluer, les questions ouvertes et la grille de prise de notes. L’agent ne prend pas de décision de recrutement et ne classe pas les candidats.',
    capabilities: [
      'Clarifier les compétences à évaluer',
      'Proposer questions ouvertes',
      'Structurer une grille de notes',
      'Limiter les oublis pendant l’entretien',
      'Préparer un récap non décisionnel',
    ],
    limitations: [
      'Ne prend pas de décision de recrutement',
      'Ne classe pas les candidats',
      'Ne doit pas traiter de données sensibles inutiles',
      'Ne remplace pas les obligations RH et légales',
    ],
    required_inputs: ['Rôle', 'séniorité', 'compétences à évaluer', 'contexte équipe', 'contraintes légales internes'],
    setup_requirements: {
      type: 'context',
      items: ['Rôle', 'séniorité', 'compétences à évaluer', 'contexte équipe'],
    },
    deliverables: ['Questions d’entretien', 'Grille de notes', 'Signaux à observer', 'Récap non décisionnel'],
    example_output:
      'Question: racontez une situation où vous avez débloqué un projet sous contrainte. Signal observé: clarté du diagnostic, priorisation, collaboration.',
    known_limits: ['Usage non décisionnel uniquement', 'Le jugement final reste humain et encadré'],
    pricing_type: 'task',
    fixed_price: 19,
    pricing_details: 'Inclut une grille d’entretien et des questions ouvertes.',
    risk_level: 'medium',
    workspace_mode: 'guided',
    output_promise: {
      summary: 'Une grille d’entretien structurée, non décisionnelle, avec questions et signaux à observer.',
      examples: ['Entretien sales', 'Entretien product', 'Entretien opérations'],
    },
    execution_mode: 'llm_prompt',
    runtime_type: 'llm_prompt',
    data_policy: {
      stores_user_data: true,
      requires_files: false,
      external_tools: [],
    },
    workspace_actions: ['Définir le rôle', 'Choisir les compétences', 'Préparer la grille', 'Lister les signaux'],
    workspace_actions_en: ['Define the role', 'Choose competencies', 'Prepare the grid', 'List signals'],
  },
];

export const INTERNAL_RUNTIME_TEMPLATES = [
  {
    key: 'workflow-lead-qualification',
    label: 'Lead Qualification Workflow',
    runtime_type: 'workflow_automation',
    category: 'Agent workflow',
    status: 'Interne',
    workspace_mode: 'guided',
    short_description:
      'Modèle futur: qualifier un lead avec une étape LLM interne puis un webhook creator approuvé.',
  },
  {
    key: 'workflow-support-triage',
    label: 'Support Triage Workflow',
    runtime_type: 'workflow_automation',
    category: 'Agent workflow',
    status: 'Interne',
    workspace_mode: 'guided',
    short_description:
      'Modèle futur: classer une demande support, proposer une réponse et notifier un endpoint approuvé.',
  },
  {
    key: 'creator-endpoint-scoring',
    label: 'External Scoring Endpoint',
    runtime_type: 'creator_endpoint',
    category: 'Agent API',
    status: 'Interne',
    workspace_mode: 'guided',
    short_description:
      'Modèle futur: appeler une API creator signée via proxy AgentHub, jamais depuis le client.',
  },
  {
    key: 'creator-endpoint-enrichment',
    label: 'Private Enrichment Endpoint',
    runtime_type: 'creator_endpoint',
    category: 'Agent API',
    status: 'Interne',
    workspace_mode: 'guided',
    short_description:
      'Modèle futur: enrichir une sortie avec un service creator approuvé, timeouté et signé.',
  },
];

export function templateToCreatorFormValues(template, categories = []) {
  if (!template) {
    return null;
  }

  const category = categories.find((item) => item.slug === template.category_slug);
  const values = {
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
    execution_method:
      template.runtime_type === 'workflow_automation'
        ? 'Agent workflow beta: suite d’étapes validées avec décision LLM structurée.'
        : template.runtime_type === 'creator_endpoint'
          ? 'Agent API beta: appel serveur signé vers API creator approuvée.'
          : template.data_policy.external_tools.length
            ? `External tools: ${template.data_policy.external_tools.join(', ')}`
            : template.data_policy.requires_files
              ? 'Assistant IA guidé avec document: PDF/DOCX privé en beta contrôlée, extraction serveur, aucun outil externe.'
              : 'Assistant IA guidé: génération texte server-side, document léger en beta contrôlée, aucun outil externe.',
    workspace_mode: template.workspace_mode,
    setup_type: template.setup_requirements.type,
    setup_items: template.setup_requirements.items.join('\n'),
    output_promise_summary: template.output_promise.summary,
    output_promise_examples: template.output_promise.examples.join('\n'),
    execution_mode: template.execution_mode,
    runtime_type: template.runtime_type,
  };

  if (template.workflow_steps) {
    values.workflow_steps = template.workflow_steps;
  }

  if (template.workflow_endpoint_name) {
    values.workflow_endpoint_name = template.workflow_endpoint_name;
  }

  if (Object.prototype.hasOwnProperty.call(template, 'workflow_endpoint_url')) {
    values.workflow_endpoint_url = template.workflow_endpoint_url;
  }

  if (template.creator_endpoint_name) {
    values.creator_endpoint_name = template.creator_endpoint_name;
  }

  if (Object.prototype.hasOwnProperty.call(template, 'creator_endpoint_url')) {
    values.creator_endpoint_url = template.creator_endpoint_url;
  }

  return values;
}

export function getAgentTemplateByLabel(label) {
  if (!label) {
    return null;
  }

  return AGENT_TEMPLATES.find((template) => template.label.toLowerCase() === label.toLowerCase()) ?? null;
}
