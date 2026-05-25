/* =========================================================
   CONSTANTES & CONTENU STATIQUE
========================================================= */

export const STORAGE_KEY = "eliminator_v3_stable";

export const SEASONS = ["printemps", "ete", "automne", "hiver", "noirblanc"];

export const SEASON_LABELS = {
  printemps: "Printemps",
  ete: "Été",
  automne: "Automne",
  hiver: "Hiver",
  noirblanc: "Noir & blanc",
};

export const SUBLINES = [
  "Une quête après l’autre.",
  "Le chaos recule. Toi, tu avances.",
  "Le réel apprécie les tâches finies.",
  "Aujourd’hui, on nettoie la carte mentale.",
  "Une micro-victoire vaut mieux qu’un grand flou.",
  "Tu n’as pas besoin d’héroïsme. Juste d’un prochain geste.",
];

export const TIPS = [
  "Un seul étorion. Pas un opéra intérieur.",
  "Épaules basses. Mâchoire relâchée. Continue.",
  "Commence moche. Le cerveau adore négocier, ignore-le.",
  "Une seule cible. Un seul onglet. Un seul monde.",
  "Tu n’as pas besoin d’envie. Tu as besoin d’élan.",
  "Fais petit. Mais fais réel.",
];

export const CELEBRATIONS = {
  fantasy: [
    { title: "BANNIÈRE PLANTÉE", msg: "Le territoire du bazar vient de perdre un village stratégique. Une chèvre prophétique confirme la victoire." },
    { title: "CHANT DE VICTOIRE", msg: "Une tâche est tombée. Au loin, les montagnes administratives ont gémi comme un classeur humide." },
    { title: "DRAGON COMPTABLE TERRASSÉ", msg: "La bête gardait ce dossier depuis mille ans. Tu l’as vaincue avec calme, et probablement sans cape." },
    { title: "LE BÂTON A FRAPPÉ LE PAVÉ", msg: "Quelque part, Gandalf le Blanc approuve d’un hochement de sourcil et décrète que, oui, tu passeras." },
  ],
  dream: [
    { title: "ARCHITECTE DU RÉEL", msg: "Tu viens de plier un morceau de journée dans le bon sens. La réalité, surprise, coopère." },
    { title: "TOTEM : STABLE", msg: "Le monde intérieur vacillait un peu. Puis tu as fait une vraie chose. C’est déjà une architecture." },
    { title: "ORIGAMI DU TEMPS RÉUSSI", msg: "Tu as pris une minute informe et tu en as fait une forme utile. Le réel trouve cela vaguement insultant." },
  ],
  ninja: [
    { title: "TECHNIQUE INTERDITE", msg: "Coup propre. La tâche n’a même pas eu le temps de préparer un discours défensif." },
    { title: "MODE INFILTRATION", msg: "Tu es passé entre les lasers de la distraction. Personne n’a rien vu. Sauf le résultat." },
    { title: "ASSASSINAT ADMINISTRATIF ÉLÉGANT", msg: "Une formalité de moins. La paperasse a glissé dans le néant avec une politesse remarquable." },
  ],
  med: [
    { title: "GESTE CHIRURGICAL", msg: "Incision nette dans le chaos. Champ propre. Fermeture sans complication. L’équipe est satisfaite." },
    { title: "DIAGNOSTIC : RÉSOLU", msg: "Symptôme : tâche persistante. Traitement : action ciblée. Évolution : favorable, presque insolente." },
    { title: "HÉMOSTASE PARFAITE", msg: "Une fuite d’énergie vient d’être stoppée. Le pronostic fonctionnel s’améliore à vue d’œil." },
  ],
  game: [
    { title: "QUÊTE VALIDÉE", msg: "Objectif atteint. Butin obtenu : paix mentale légère, dignité +2, confusion -1." },
    { title: "ACHIEVEMENT DÉBLOQUÉ", msg: "« Je termine ce que je commence ». Succès rare. Les anciens pensaient cela impossible." },
    { title: "INVENTAIRE ALLÉGÉ", msg: "Une charge de moins dans le sac de quêtes. Tu marches déjà mieux, petit héros fonctionnel." },
  ],
  empire: [
    { title: "EMPIRE ÉTENDU", msg: "Un étorion de moins. Ton autorité sur la journée augmente d’un cran parfaitement délicieux." },
    { title: "HÉROÏSME ADMINISTRATIF", msg: "La bureaucratie a levé un sourcil. Tu l’as écrasé avec une action concrète. Très beau geste." },
    { title: "RÉVOLTE ÉTOUFFÉE", msg: "Une poche de désorganisation a tenté de résister. Elle a été traitée avec le tact brutal nécessaire." },
    { title: "SAMWISE APPROUVE", msg: "Ce n’est peut-être pas glorieux, mais c’est du vrai courage de jardinier : avancer encore d’un pas avec la casserole sur le dos." },
  ],
};

export const seasonLabel = (season) => SEASON_LABELS[season] || "Automne";
