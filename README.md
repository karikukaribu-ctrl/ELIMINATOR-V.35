# ELIMINATOR

Gestionnaire de tâches gamifié (« étorions », roulette, Pomodoro, célébrations,
sets médicaux, habitudes, stats). Vanilla JS pur, **zéro dépendance**, hébergeable
tel quel sur GitHub Pages.

## Lancer en local

Comme l'app utilise des **modules ES** (`import` / `export`), elle doit être servie
en HTTP (l'ouverture directe en `file://` est bloquée par le navigateur) :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Architecture

```
js/
├── main.js              Point d'entrée : câblage des événements + init
├── core/                Cœur, sans dépendance au DOM
│   ├── dom.js           $, $$, délégation d'événements
│   ├── utils.js         clamp, uid, dates, escapeHTML, clone…
│   ├── constants.js     SEASONS, SUBLINES, TIPS, CELEBRATIONS, STORAGE_KEY
│   ├── state.js         état par défaut + migration des anciennes sauvegardes
│   ├── store.js         état central + pub/sub + persistance (débouncée)
│   └── undo.js          pile d'annulation (hors état, légère)
├── features/            Logique métier (mute le store, émet des topics)
│   ├── tasks.js         moteur de tâches, roulette, étorions
│   ├── inbox.js         parsing + import + historique des listes
│   ├── pomodoro.js      minuteur basé sur l'horloge (pas de dérive)
│   ├── habits.js  sets.js  notes.js  kiffance.js
│   ├── celebrations.js  feux d'artifice (animation annulable)
│   ├── tips.js  stats.js
└── ui/                  Rendu et interface
    ├── theme.js  panels.js  prefs.js  status.js
    └── render.js        rendus abonnés aux topics + délégation d'événements
```

### Modèle de données réactif

Le **store** (`core/store.js`) détient l'unique source de vérité. Au lieu de tout
redessiner après chaque action, les features émettent des *topics* ciblés
(`emit("tasks", "hub")`) et seuls les rendus abonnés à ces topics se rafraîchissent.
`emit("*")` force un rendu complet (undo, reset, import massif).

## Corrections notables par rapport à la version monolithique

- **Undo** : la pile vivait dans l'état et était clonée à chaque snapshot →
  croissance exponentielle du `localStorage`. Elle vit désormais hors état :
  storage stable (vérifié : ratio 1.0x après 30 annulations).
- **Rendu** : `renderAll()` redessinait ~15 sections à chaque clic. Remplacé par
  des rendus ciblés via pub/sub.
- **Listeners** : les handlers de liste étaient réattachés à chaque rendu
  (`.onclick`). Remplacés par la délégation d'événements (un listener par conteneur).
- **Stats** : lookups O(jours × historique) remplacés par une `Map` indexée.
- **Pomodoro** : minuteur recalculé depuis un timestamp de fin → pas de dérive en
  arrière-plan.
- **Célébrations** : l'animation requestAnimationFrame est désormais annulable
  (plus de boucles concurrentes) et respecte `prefers-reduced-motion`.
- **Sauvegarde** : débouncée (regroupe les écritures), avec flush sur `beforeunload`.
- **Accessibilité** : touche `Échap` ferme overlays/modals/panneaux.
