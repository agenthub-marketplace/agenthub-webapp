// AgentHub mock data — noms d’agents en anglais, descriptions en français

export const currentUser = {
  id: 'u_1',
  name: 'Marie Dupont',
  email: 'marie.dupont@example.com',
  role: 'user',
  avatar: 'MD',
  job: 'Consultante freelance',
  language: 'fr',
  joined: '2025-08-12',
};

export const creatorProfile = {
  id: 'c_1',
  name: 'Thomas R.',
  avatar: 'TR',
  verified: true,
  avgRating: 4.8,
  totalRentals: 1240,
  bio: 'Spécialiste IA centré sur les outils légaux et la productivité business.',
};

export const categories = [
  { id: 'writing', name: 'Rédaction & Copywriting', count: 84, icon: 'PenLine' },
  { id: 'analysis', name: 'Analyse & Recherche', count: 56, icon: 'BarChart3' },
  { id: 'comm', name: 'Communication & Emails', count: 47, icon: 'Mail' },
  { id: 'marketing', name: 'Marketing & Réseaux sociaux', count: 92, icon: 'Megaphone' },
  { id: 'legal', name: 'Juridique & Contrats', count: 31, icon: 'Scale' },
  { id: 'finance', name: 'Finance & Comptabilité', count: 38, icon: 'Wallet' },
  { id: 'dev', name: 'Développement & Code', count: 73, icon: 'Code2' },
  { id: 'hr', name: 'Ressources humaines', count: 24, icon: 'Users' },
  { id: 'support', name: 'Service client', count: 41, icon: 'Headphones' },
  { id: 'training', name: 'Formation & Éducation', count: 29, icon: 'GraduationCap' },
  { id: 'strategy', name: 'Stratégie & Conseil', count: 35, icon: 'Target' },
  { id: 'translation', name: 'Traduction & Langues', count: 22, icon: 'Languages' },
];

export const avatarGradients = [
  'from-[#532B88] via-[#7C3AED] to-[#9B72CF]',
  'from-[#9B72CF] via-[#532B88] to-[#1A1130]',
  'from-[#7C3AED] via-[#9B72CF] to-[#532B88]',
  'from-[#1A1130] via-[#532B88] to-[#7C3AED]',
  'from-[#C8B1E4] via-[#9B72CF] to-[#532B88]',
  'from-[#532B88] to-[#1A1130]',
  'from-[#7C3AED] to-[#1A1130]',
  'from-[#9B72CF] via-[#7C3AED] to-[#532B88]',
];

export const agentsList = [
  { id: 1, slug: 'legaldraft-pro', name: 'LegalDraft Pro', pitch: 'Assistant de rédaction juridique', category: 'Juridique & Contrats', categoryId: 'legal', rating: 4.9, reviews: 127, fromPrice: 8, priceMode: 'jour', creator: { name: 'Thomas R.', avatar: 'TR' }, certified: true, trending: true, gradient: 0, level: 'beginner', languages: ['Français','Anglais','Espagnol'], tools: ['Notion','Google Docs','Gmail'], rentals: 847 },
  { id: 2, slug: 'datainsight', name: 'DataInsight', pitch: 'Spécialiste études de marché', category: 'Analyse & Recherche', categoryId: 'analysis', rating: 4.8, reviews: 89, fromPrice: 2, priceMode: 'tâche', creator: { name: 'Sophia K.', avatar: 'SK' }, certified: false, gradient: 1, level: 'intermediate', languages: ['Anglais'], tools: ['Excel','Notion'], rentals: 412 },
  { id: 3, slug: 'mailmaster', name: 'MailMaster', pitch: 'Rédacteur d’emails professionnels', category: 'Communication & Emails', categoryId: 'comm', rating: 4.7, reviews: 203, fromPrice: 1, priceMode: 'tâche', creator: { name: 'Marc D.', avatar: 'MD' }, certified: true, gradient: 2, level: 'beginner', languages: ['Français','Anglais'], tools: ['Gmail','Slack'], rentals: 1532 },
  { id: 4, slug: 'contentflow', name: 'ContentFlow', pitch: 'Rédacteur d’articles et de blogs', category: 'Rédaction & Copywriting', categoryId: 'writing', rating: 4.9, reviews: 341, fromPrice: 5, priceMode: 'jour', creator: { name: 'Emma L.', avatar: 'EL' }, certified: true, trending: true, gradient: 3, level: 'beginner', languages: ['Français','Anglais','Espagnol','Italien'], tools: ['Notion','Google Docs'], rentals: 2104 },
  { id: 5, slug: 'strategybot', name: 'StrategyBot', pitch: 'Consultant en stratégie business', category: 'Stratégie & Conseil', categoryId: 'strategy', rating: 4.6, reviews: 56, fromPrice: 15, priceMode: 'jour', creator: { name: 'Paul M.', avatar: 'PM' }, certified: false, gradient: 4, level: 'advanced', languages: ['Anglais'], tools: ['Notion','Excel'], rentals: 187 },
  { id: 6, slug: 'codehelper', name: 'CodeHelper', pitch: 'Revue de code et débogage', category: 'Développement & Code', categoryId: 'dev', rating: 4.8, reviews: 178, fromPrice: 3, priceMode: 'tâche', creator: { name: 'Alex C.', avatar: 'AC' }, certified: false, gradient: 5, level: 'intermediate', languages: ['Anglais'], tools: ['Slack'], rentals: 689 },
  { id: 7, slug: 'translatepro', name: 'TranslatePro', pitch: 'Traducteur multilingue', category: 'Traduction & Langues', categoryId: 'translation', rating: 4.7, reviews: 94, fromPrice: 1, priceMode: 'tâche', creator: { name: 'Marie P.', avatar: 'MP' }, certified: false, gradient: 6, level: 'beginner', languages: ['Français','Anglais','Espagnol','Italien'], tools: ['Google Docs'], rentals: 521 },
  { id: 8, slug: 'hrassist', name: 'HRAssist', pitch: 'Documents RH et recrutement', category: 'Ressources humaines', categoryId: 'hr', rating: 4.5, reviews: 43, fromPrice: 6, priceMode: 'jour', creator: { name: 'Julie F.', avatar: 'JF' }, certified: false, gradient: 7, level: 'intermediate', languages: ['Français','Anglais'], tools: ['Notion','Gmail'], rentals: 153 },
  { id: 9, slug: 'financeadvisor', name: 'FinanceAdvisor', pitch: 'Aide à l’analyse financière', category: 'Finance & Comptabilité', categoryId: 'finance', rating: 4.8, reviews: 112, fromPrice: 10, priceMode: 'jour', creator: { name: 'Nicolas B.', avatar: 'NB' }, certified: true, gradient: 0, level: 'advanced', languages: ['Anglais','Français'], tools: ['Excel'], rentals: 398 },
  { id: 10, slug: 'marketingpulse', name: 'MarketingPulse', pitch: 'Créateur de contenu social', category: 'Marketing & Réseaux sociaux', categoryId: 'marketing', rating: 4.9, reviews: 267, fromPrice: 4, priceMode: 'jour', creator: { name: 'Laura S.', avatar: 'LS' }, certified: false, trending: true, gradient: 1, level: 'beginner', languages: ['Français','Anglais','Espagnol'], tools: ['Notion'], rentals: 1247 },
  { id: 11, slug: 'trainerbot', name: 'TrainerBot', pitch: 'Structure de cours en ligne', category: 'Formation & Éducation', categoryId: 'training', rating: 4.6, reviews: 38, fromPrice: 8, priceMode: 'jour', creator: { name: 'Antoine V.', avatar: 'AV' }, certified: false, gradient: 2, level: 'intermediate', languages: ['Français','Anglais'], tools: ['Notion','Google Docs'], rentals: 121 },
  { id: 12, slug: 'supportagent', name: 'SupportAgent', pitch: 'Scripts pour service client', category: 'Service client', categoryId: 'support', rating: 4.7, reviews: 155, fromPrice: 3, priceMode: 'jour', creator: { name: 'Claire T.', avatar: 'CT' }, certified: false, gradient: 3, level: 'beginner', languages: ['Français','Anglais'], tools: ['Slack','Gmail'], rentals: 612 },
];

export const activeRentals = [
  { id: 'r1', agentSlug: 'legaldraft-pro', agentName: 'LegalDraft Pro', mode: 'Location 3 jours', timeRemainingHours: 52, totalHours: 72, lastUsed: 'il y a 2 heures', gradient: 0 },
  { id: 'r2', agentSlug: 'contentflow', agentName: 'ContentFlow', mode: 'À la journée', timeRemainingHours: 5, totalHours: 24, lastUsed: 'hier', gradient: 3, urgent: true },
  { id: 'r3', agentSlug: 'mailmaster', agentName: 'MailMaster', mode: 'Location 7 jours', timeRemainingHours: 144, totalHours: 168, lastUsed: 'il y a 3 jours', gradient: 2 },
];

export const rentalHistory = [
  { id: 'h1', agent: 'ContentFlow', mode: 'À la journée', dates: '24 — 25 avril 2026', price: 5, rating: 5 },
  { id: 'h2', agent: 'MailMaster', mode: 'À la tâche', dates: '18 avril 2026', price: 1, rating: 4 },
  { id: 'h3', agent: 'StrategyBot', mode: 'Projet 7 jours', dates: '2 — 9 avril 2026', price: 80, rating: 5 },
  { id: 'h4', agent: 'DataInsight', mode: 'À la tâche', dates: '28 mars 2026', price: 2, rating: 4 },
  { id: 'h5', agent: 'TranslatePro', mode: 'À la tâche', dates: '15 mars 2026', price: 1, rating: 5 },
];

export const notifications = [
  { id: 'n1', title: 'Votre location de ContentFlow expire dans 5 heures', time: 'il y a 12 min', read: false, type: 'warning' },
  { id: 'n2', title: 'Nouvelle réponse sur « Meilleurs prompts pour contrats freelance ? »', time: 'il y a 1h', read: false, type: 'community' },
  { id: 'n3', title: 'LegalDraft Pro a été mis à jour par Thomas R.', time: 'il y a 3h', read: false, type: 'info' },
  { id: 'n4', title: 'Votre facture pour MailMaster est prête', time: 'il y a 1 jour', read: true, type: 'billing' },
  { id: 'n5', title: 'Bienvenue sur AgentHub, Marie !', time: 'il y a 2 semaines', read: true, type: 'info' },
];

export const agentDiscussions = [
  { id: 'd1', title: 'Meilleurs prompts pour contrats freelance ?', replies: 18, time: 'il y a 3h', author: 'Sophie M.', avatar: 'SM', upvotes: 24, content: 'J’ai du mal à obtenir des clauses très spécifiques de l’agent. Quelqu’un a essayé des prompts structurés ?', threadReplies: [{ author:'Marc D.', avatar:'MD', time:'il y a 2h', text:'Commence par indiquer le type de projet et le budget. Ça marche beaucoup mieux.'},{ author:'Emma L.', avatar:'EL', time:'il y a 1h', text:'Je précise toujours la juridiction. Différence énorme sur la qualité du résultat.'}] },
  { id: 'd2', title: 'Gère-t-il les spécificités du droit français ?', replies: 7, time: 'il y a 1 jour', author: 'Marc D.', avatar: 'MD', upvotes: 12, content: 'Je cherche une confirmation avant de louer pour un projet plus long.', threadReplies: [{ author:'Thomas R.', avatar:'TR', time:'il y a 20h', text:'Créateur ici — oui, il a été entraîné sur le droit des contrats UE et FR. Toujours vérifier cependant.'}] },
  { id: 'd3', title: 'Comparatif LegalDraft Pro vs ContractHelper', replies: 34, time: 'il y a 2 jours', author: 'Lucas R.', avatar: 'LR', upvotes: 41, content: 'Lequel choisiriez-vous pour un contrat de service SaaS ?', threadReplies: [] },
  { id: 'd4', title: 'Astuces pour obtenir le meilleur NDA', replies: 11, time: 'il y a 4 jours', author: 'Emma L.', avatar: 'EL', upvotes: 18, content: 'Je partage mon template de prompt — vos retours bienvenus.', threadReplies: [] },
];

export const leaderboard = [
  { rank: 1, name: 'LegalDraft Pro', rentals: 847, rating: 4.9, renewal: 78, current: true },
  { rank: 2, name: 'ContentFlow', rentals: 812, rating: 4.9, renewal: 74 },
  { rank: 3, name: 'MailMaster', rentals: 698, rating: 4.7, renewal: 71 },
  { rank: 4, name: 'MarketingPulse', rentals: 612, rating: 4.9, renewal: 69 },
  { rank: 5, name: 'CodeHelper', rentals: 543, rating: 4.8, renewal: 65 },
  { rank: 6, name: 'DataInsight', rentals: 488, rating: 4.8, renewal: 63 },
  { rank: 7, name: 'SupportAgent', rentals: 432, rating: 4.7, renewal: 61 },
  { rank: 8, name: 'TranslatePro', rentals: 387, rating: 4.7, renewal: 58 },
  { rank: 9, name: 'FinanceAdvisor', rentals: 352, rating: 4.8, renewal: 57 },
  { rank: 10, name: 'StrategyBot', rentals: 298, rating: 4.6, renewal: 54 },
];

export const reviewsByAgent = {
  'legaldraft-pro': [
    { id: 'rv1', author: 'Sophie M.', avatar: 'SM', stars: 5, text: 'Exactement ce qu’il me fallait pour mes contrats clients. Professionnel et rapide.', mode: 'Loué 3 jours', date: '28 mai 2026' },
    { id: 'rv2', author: 'Marc D.', avatar: 'MD', stars: 5, text: 'Le NDA qu’il a rédigé m’a fait gagner des heures. Je relouerai.', mode: 'Loué à la tâche', date: '21 mai 2026', creatorReply: 'Merci Marc ! Ravi que ça t’ait aidé.' },
    { id: 'rv3', author: 'Julie F.', avatar: 'JF', stars: 4, text: 'Très bonne sortie, quelques ajustements mineurs mais excellent dans l’ensemble.', mode: 'Loué 1 jour', date: '14 mai 2026' },
    { id: 'rv4', author: 'Nicolas B.', avatar: 'NB', stars: 5, text: 'Parfait pour mes contrats de conseil. Hautement recommandé.', mode: 'Loué 1 semaine', date: '5 mai 2026' },
    { id: 'rv5', author: 'Emma L.', avatar: 'EL', stars: 4, text: 'Bon agent, le ton formel convient parfaitement aux documents juridiques.', mode: 'Loué à la tâche', date: '27 avril 2026' },
  ]
};

export const userReviews = [
  { id: 'ur1', name: 'Sophie M.', avatar: 'SM', job: 'Rédactrice freelance', stars: 5, quote: "LegalDraft Pro m'a économisé des heures sur mes contrats clients.", dateFr: 'Location il y a 3 jours', dateEn: 'Rented 3 days ago' },
  { id: 'ur2', name: 'Lucas D.', avatar: 'LD', job: 'Consultant indépendant', stars: 5, quote: "J'ai livré mon rapport 2 semaines plus tôt grâce à DataInsight.", dateFr: 'Location il y a 1 semaine', dateEn: 'Rented 1 week ago' },
  { id: 'ur3', name: 'Camille R.', avatar: 'CR', job: 'Designer graphique', stars: 4, quote: "MailMaster rédige des emails parfaits en anglais à ma place.", dateFr: 'Location il y a 5 jours', dateEn: 'Rented 5 days ago' },
  { id: 'ur4', name: 'Thomas B.', avatar: 'TB', job: 'Entrepreneur', stars: 5, quote: "ContentFlow a produit 10 articles en une journée. Bluffant.", dateFr: 'Location il y a 2 semaines', dateEn: 'Rented 2 weeks ago' },
  { id: 'ur5', name: 'Marie P.', avatar: 'MP', job: 'Coach business', stars: 5, quote: "La qualité des livrables de StrategyBot dépasse mes attentes.", dateFr: 'Location il y a 4 jours', dateEn: 'Rented 4 days ago' },
  { id: 'ur6', name: 'Nicolas F.', avatar: 'NF', job: 'Développeur freelance', stars: 4, quote: "CodeHelper a trouvé des bugs que je cherchais depuis des heures.", dateFr: 'Location il y a 6 jours', dateEn: 'Rented 6 days ago' },
  { id: 'ur7', name: 'Julie L.', avatar: 'JL', job: 'Responsable marketing', stars: 5, quote: "MarketingPulse génère du contenu social parfaitement adapté à ma marque.", dateFr: 'Location il y a 3 jours', dateEn: 'Rented 3 days ago' },
  { id: 'ur8', name: 'Antoine V.', avatar: 'AV', job: 'Formateur', stars: 5, quote: "TrainerBot a structuré ma formation complète en moins d'une heure.", dateFr: 'Location il y a 1 semaine', dateEn: 'Rented 1 week ago' },
];

export const testimonials = [
  { name: 'Sophie M.', job: 'Copywriter freelance', quote: 'J’ai rédigé 5 pages web en 20 minutes. C’est l’outil qui me manquait.', stars: 5, avatar: 'SM' },
  { name: 'Lucas D.', job: 'Consultant indépendant', quote: 'J’ai livré mon rapport d’analyse 2 semaines plus tôt que d’habitude.', stars: 5, avatar: 'LD' },
  { name: 'Camille R.', job: 'Graphiste', quote: 'Je n’aurais jamais cru que l’IA pouvait être aussi simple et abordable.', stars: 5, avatar: 'CR' },
];

export const adminStats = { revenueToday: 340, revenueMonth: 12800, activeRentalsNow: 847, pendingValidations: 3, newUsersToday: 127 };

export const languages = [
  { code: 'fr', label: 'Français', flag: 'FR' },
  { code: 'en', label: 'English', flag: 'GB' },
];

export function getAgentBySlug(slug) {
  return agentsList.find(a => a.slug === slug) || agentsList[0];
}

export function generateMockReply(userText) {
  const text = (userText || '').toLowerCase();
  if (text.includes('nda') || text.includes('confidential')) {
    return `Voici un projet d’accord de confidentialité :\n\nACCORD DE CONFIDENTIALITÉ (NDA)\n\nEntre : Partie A (Partie divulgatrice)\nEt : Partie B (Partie réceptrice)\n\n1. INFORMATIONS CONFIDENTIELLES\nToute information divulguée par la Partie A, qu’elle soit orale, écrite ou sous toute autre forme, sera considérée comme confidentielle.\n\n2. OBLIGATIONS\nLa Partie B s’engage à ne pas divulguer, copier ou utiliser les informations à d’autres fins que l’évaluation convenue.\n\n3. DURÉE\nCet accord reste en vigueur 3 ans à compter de la signature.\n\nSouhaitez-vous que j’ajoute des clauses de juridiction ou de pénalité ?`;
  }
  if (text.includes('revision') || text.includes('intellectu') || text.includes('propriét')) {
    return `Mis à jour. Voici les clauses renforcées :\n\n4. PROPRIÉTÉ INTELLECTUELLE (Révisée)\nTout le travail produit, les designs, le code, les concepts et les livrables créés dans le cadre de cet accord sont la propriété exclusive du Client à réception du paiement intégral. Le Prestataire ne conserve aucun droit de reproduction, de distribution ou d’affichage du travail. L’utilisation en portfolio nécessite un accord écrit préalable.\n\n5. POLITIQUE DE RÉVISION (Nouvelle clause)\nCet accord inclut jusqu’à 3 cycles de révisions par livrable. Les révisions supplémentaires seront facturées à 85 crédits/heure.\n\nL’accord complet mis à jour est prêt. Souhaitez-vous que je le formate en document final ?`;
  }
  if (text.includes('contrat') || text.includes('contract') || text.includes('agreement') || text.includes('mission')) {
    return `Voici un projet de contrat de prestation professionnel :\n\nCONTRAT DE PRESTATION FREELANCE\n\n1. OBJET DE LA PRESTATION\nLe Prestataire s’engage à délivrer les services décrits dans le brief projet.\n\n2. DURÉE\nDurée à définir à la signature.\n\n3. RÉMUNÉRATION\nMontant total et échéancier de paiement à convenir entre les parties.\n\n4. PROPRIÉTÉ INTELLECTUELLE\nTout le travail original devient la propriété du Client à réception du paiement intégral.\n\nSouhaitez-vous que j’ajoute ou modifie des clauses ?`;
  }
  return `Compris. Je vais rédiger cela pour vous avec un ton précis et professionnel. Pouvez-vous partager un peu plus de contexte — les parties concernées, la durée attendue et les clauses spécifiques que vous souhaitez inclure ? Je produirai un document propre, prêt à signer juste après.`;
}
