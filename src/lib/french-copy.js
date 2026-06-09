const FRENCH_COPY_REPLACEMENTS = [
  [/\bAide a\b/g, 'Aide à'],
  [/\ba partir\b/g, 'à partir'],
  [/\ba organiser\b/g, 'à organiser'],
  [/\ba preparer\b/g, 'à préparer'],
  [/\ba verifier\b/g, 'à vérifier'],
  [/\bdeja\b/g, 'déjà'],
  [/\bdifferenciation\b/g, 'différenciation'],
  [/\bdonnees\b/g, 'données'],
  [/\bverifie\b/g, 'vérifie'],
  [/\bverifier\b/g, 'vérifier'],
  [/\bpreparer\b/g, 'préparer'],
  [/\bPreparer\b/g, 'Préparer'],
  [/\bresume\b/g, 'résumé'],
  [/\bResume\b/g, 'Résumé'],
  [/\bsynthese\b/g, 'synthèse'],
  [/\bSynthese\b/g, 'Synthèse'],
  [/\bclefs\b/g, 'clés'],
  [/\bcles\b/g, 'clés'],
  [/\bequipe\b/g, 'équipe'],
  [/\bequipes\b/g, 'équipes'],
  [/\boperation\b/g, 'opération'],
  [/\boperations\b/g, 'opérations'],
  [/\bmarche\b/g, 'marché'],
  [/\bidees\b/g, 'idées'],
  [/\bidee\b/g, 'idée'],
  [/\betape\b/g, 'étape'],
  [/\betapes\b/g, 'étapes'],
  [/\bdecision\b/g, 'décision'],
  [/\bdecisions\b/g, 'décisions'],
  [/\bmedical\b/g, 'médical'],
  [/\breglemente\b/g, 'réglementé'],
  [/\bprive\b/g, 'privé'],
  [/\bcontrolee\b/g, 'contrôlée'],
  [/\bnecessaire\b/g, 'nécessaire'],
  [/\bnecessaires\b/g, 'nécessaires'],
  [/\bresultat\b/g, 'résultat'],
  [/\bResultat\b/g, 'Résultat'],
  [/\bgenere\b/g, 'génère'],
  [/\bgenerer\b/g, 'générer'],
  [/\bGenere\b/g, 'Génère'],
  [/\bGenerer\b/g, 'Générer'],
  [/\bl agent\b/g, 'l’agent'],
  [/\bL agent\b/g, 'L’agent'],
  [/\bl utilisateur\b/g, 'l’utilisateur'],
  [/\bL utilisateur\b/g, 'L’utilisateur'],
  [/\bl angle\b/g, 'l’angle'],
  [/\bl audience\b/g, 'l’audience'],
  [/\bn envoie\b/g, 'n’envoie'],
  [/\bn est\b/g, 'n’est'],
  [/\bd un\b/g, 'd’un'],
  [/\bd une\b/g, 'd’une'],
  [/\bd attention\b/g, 'd’attention'],
  [/\bd actions\b/g, 'd’actions'],
  [/\bd experience\b/g, 'd’expérience'],
  [/\bd execution\b/g, 'd’exécution'],
  [/\bd amelioration\b/g, 'd’amélioration'],
  [/\ba l /g, 'à l’'],
  [/\ba la\b/g, 'à la'],
  [/\ba un\b/g, 'à un'],
  [/\ba une\b/g, 'à une'],
];

export function polishFrenchCopy(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  return FRENCH_COPY_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

export function polishFrenchList(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => polishFrenchCopy(item));
}
