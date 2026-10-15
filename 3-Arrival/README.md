# NEON SERPENT — CYBERPUNK ARENA

**EVOLVE. CONSUME. DOMINATE.**

Une arène arcade p5.js autonome, avec le comportement `arrive` et les anneaux indépendants de l’exercice 3-Arrival. La direction artistique, les règles de partie et les effets sont ajoutés autour des classes existantes ; `vehicle.js`, `snake.js` et `food.js` sont conservés.

## Lancement immédiat

Ouvrir **index.html** dans Chrome ou Edge. Aucun téléchargement, serveur, compte ou build n’est nécessaire. Tous les scripts et la police sont locaux. Choisir un mode puis cliquer sur **PLAY** ; l’entrée dans la partie est immédiate.

Pour servir le projet par HTTP, depuis ce dossier :

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Ouvrir http://127.0.0.1:8000. Arrêter le serveur avec Ctrl+C.

## Modes et règles

L’arène occupe toute la fenêtre sur ordinateur comme sur mobile. Le HUD et les commandes restent en surimpression et ne réduisent pas le déplacement. Une marge de 14 pixels garde la tête visible près des bords. Les noyaux évitent les panneaux visibles sans exclure des bandes entières de l’écran.

- **Arcade** : atteindre **3 000 points en 90 secondes de jeu actif**. L’objectif atteint termine la manche par une victoire. Si le temps expire avant l’objectif, l’écran GAME OVER affiche score, record et meilleur combo. Pas de mort aux murs ni au contact du corps : ce choix respecte le mouvement libre d’origine.
- **Bac à sable** : mouvement libre, collecte et croissance, sans limite de temps. Le bouton **＋ SERPENT** permet jusqu’à six serpents de couleurs distinctes, tous guidés par la même cible.
- **Collecte** : un noyau donne un anneau et 100 points de base. Une seule tête peut consommer chaque génération de noyau. Sa réapparition teste jusqu’à 80 positions pour éviter têtes et anneaux ; si l’arène est saturée, la position testée offrant la meilleure distance est retenue.
- **Combo** : une nouvelle collecte dans les **7 secondes** augmente le multiplicateur, jusqu’à **×5**. Au-delà de ce délai il retombe à ×1 pour la prochaine collecte. La petite barre du HUD indique le délai restant.
- **Overdrive** : cinq noyaux collectés hors Overdrive remplissent la jauge. **Espace** ou le bouton l’active pour **8 secondes**, avec un score doublé, une traînée renforcée et un éclairage plus intense. Il ne modifie ni maxSpeed ni maxForce. Les collectes pendant l’effet ne rechargent pas la jauge.
- Formule : **100 × combo × (2 si Overdrive, sinon 1)**.
- Deux records locaux séparés : arcade et bac à sable. Si localStorage n’est pas disponible, la partie et son record en mémoire restent fonctionnels.
- Pour borner la charge graphique : six serpents maximum et 160 anneaux par serpent. Les collectes continuent à compter au plafond, mais n’ajoutent plus d’anneau.

Les compteurs correspondent à la partie en cours ; aucun niveau ou indicateur de difficulté fictif n’est affiché.

## Commandes

| Commande | Action |
|---|---|
| Souris / glissement tactile sur le canvas | Guider la tête |
| P ou Échap | Pause / reprise |
| R | Recommencer la partie |
| M | Couper / réactiver le son |
| H | Ouvrir / fermer les réglages |
| Espace | Activer un Overdrive chargé |
| Logo NEON / SERPENT | Retour au menu |

Les raccourcis ne s’exécutent pas dans un champ de réglage. Dans le dialogue, Échap ferme le panneau ; H le ferme lorsqu’un bouton est actif. Espace sur un bouton conserve son activation clavier normale.

Les boutons donnent accès aux mêmes actions. Le dialogue natif gère le focus ; les écrans pause et résultat gardent la navigation Tab dans leurs actions. Les réglages interrompent la partie et la fermeture reprend l’état précédent, sauf après une perte de focus. Changer d’onglet ou de fenêtre met la partie en pause et coupe l’audio ; la reprise est volontaire.

## Réglages et unités

| Paramètre | Défaut | Plage |
|---|---:|---:|
| Vitesse max. tête | 4 | 0–12 |
| Force max. tête | 0,20 | 0–1 |
| Vitesse max. anneaux | 4 | 0–12 |
| Force max. anneaux | 0,20 | 0–1 |
| Volume général | 45 % | 0–100 % |
| Volume effets | 70 % | 0–100 % |
| Volume ambiance | 25 % | 0–100 % |

Les quatre paramètres physiques sont appliqués immédiatement aux serpents existants et conservés pour les prochaines instances et les redémarrages. **0 est autorisé** pour observer une tête ou un corps immobile.

La base intègre vitesse et position **par image** ; maxForce représente la force/accélération maximale de ce modèle. Le redémarrage ne remplace pas les valeurs choisies. Les horloges de manche, combo et Overdrive utilisent le temps réel passé dans PLAYING. Seules les animations et durées des particules utilisent un delta plafonné pour limiter les sauts visuels.

Chaque anneau vise le centre du précédent avec `arrive(positionPrecedente, distanceDeSuivi)`. La distance de suivi est le deuxième argument déjà employé par la base, pas une seconde cible déplacée. Le rendu lit les positions : ni la membrane visuelle ni les traînées ne pilotent la locomotion.

## Audio et confort visuel

Les effets sont de vrais sons Web Audio synthétisés : interaction, collecte, combo, activation, avertissement à 10 secondes, défaite et victoire. Chaque note utilise une enveloppe douce ; les événements rapprochés sont limités et les voix plafonnées à 12.

Aucun AudioContext du jeu n’est créé avant une interaction. Le mute coupe le bus général, arrête et déconnecte les voix et l’ambiance. La pause et la perte de focus font de même. L’ambiance optionnelle est un fond discret à deux oscillateurs ; elle est désactivée par défaut et s’arrête en fin de manche. Le fichier p5.sound local reste disponible, mais n’est plus chargé : Web Audio suffit ici.

Le panneau propose **effets réduits** et une **micro-secousse optionnelle**, désactivée par défaut. La préférence système de réduction des animations est honorée au lancement. Les particules sont plafonnées à 120 sur desktop et 48 sur mobile ou en mode réduit. Les halos de corps et le fond sont mis en cache ; seule la tête utilise un halo dynamique.

## Organisation

| Fichier | Responsabilité |
|---|---|
| index.html | Menu, HUD, dialogues, scripts dans l’ordre des dépendances |
| style.css | Identité, états d’interaction, accessibilité et adaptation écran |
| sketch.js | Cycle p5, entrées, orchestration, collisions et transitions |
| vehicle.js | Base protégée, inchangée |
| snake.js / food.js | Classes originales inchangées |
| neonSnake.js | Sous-classe Snake : rendu, membrane et historique de traînée |
| neonFood.js | Sous-classe Food : rendu du noyau et pilotage des satellites |
| energyParticle.js | Particules Vehicle avec steering et locomotion héritée |
| arenaEffects.js | Pools bornés, collecte, ambiance et anneaux d’impact |
| arenaRenderer.js | Fond mis en cache, repère et réticule |
| arenaSession.js | Score, combo, Overdrive, états, horloges et records |
| arenaAudio.js | Synthèse et cycle de vie des sources audio |
| arenaUI.js | Événements DOM uniques, focus, réglages et HUD |
| tests/snake.test.cjs | Suite historique |
| tests/arena.test.cjs | Règles de partie, placement et audio |
| tests/effects.test.cjs | Particules, héritage et invariance de la physique |
| tests/browser-check.cjs | Vérification Chrome via CDP, sans paquet npm |
| tests/artifacts/ | Captures et résultat de vérification du navigateur |

Une seule boucle de jeu : `draw()` de p5.js. Les entités mobiles, y compris les satellites du noyau et le serpent du menu, sont des Vehicle ou sous-classes. Les halos qui pulsent et les traces historiques sont des effets de rendu. Lors du redimensionnement uniquement, le monde est remappé une fois et les traces effacées.

## Validation

Baseline avant modification : **10/10 tests historiques réussis**.

```powershell
node --test tests/*.test.cjs
node tests/browser-check.cjs
```

La suite Node comprend désormais **25 tests** : les 10 historiques et 15 tests des nouvelles règles et effets. Tous ont passé après les modifications. L’adaptateur vectoriel des tests Node ne remplace pas p5.js : la suite Chrome utilise la vraie bibliothèque locale, les vrais événements de souris, de clavier et de toucher, les dialogues et le signal Web Audio mesuré.

Le script navigateur nécessite Chrome ou Edge installé ; on peut fournir un autre Chromium via `CHROME_PATH`. Il crée un serveur local et un profil temporaire, produit les captures, puis ferme navigateur et serveur. Dans un environnement restreint, le lancement du navigateur peut nécessiter une autorisation. Le jeu lui-même n’a pas besoin de ces outils.

Dernier passage : **41 contrôles navigateur réussis**, aucune erreur JavaScript ou console détectée. Test de charge : six serpents / 192 anneaux à **59,8 images/s** dans Chrome automatisé.

Le résultat du dernier passage complet est conservé dans [tests/artifacts/verification.json](tests/artifacts/verification.json). Les captures couvrent menu desktop/mobile, Overdrive, réglages, défaite, victoire et partie mobile.

## Présentation au professeur — environ 3 minutes

1. Afficher le menu et le serpent animé. Expliquer : « Le rendu a changé ; le comportement arrive et les véhicules indépendants sont conservés. »
2. Lancer **ARCADE** et déplacer doucement la souris vers le noyau cyan. Montrer la collecte, l’anneau ajouté, la particule d’impact et le score.
3. Enchaîner les noyaux pour atteindre ×2, ×3 puis ×5. Après cinq collectes, appuyer sur **Espace** : la jauge devient un compte à rebours de 8 secondes et le score reçoit un bonus ×2.
4. Appuyer sur **P**, puis reprendre. Ouvrir les réglages avec **H** et changer uniquement la vitesse du corps pour rendre son indépendance visible. Montrer le mute et l’ambiance optionnelle.
5. Atteindre 3 000 points pour la victoire, ou laisser expirer la manche pour GAME OVER. Utiliser REJOUER.
6. Retourner au menu, choisir **BAC À SABLE**, ajouter un autre serpent et expliquer l’héritage et les quatre paramètres.

Les moments les plus visuels : première collecte sonore, montée du combo, activation de l’Overdrive, puis la comparaison de deux serpents avec les anneaux qui suivent naturellement.

## Limites connues

Les murs et l’auto-contact ne tuent pas le serpent ; la difficulté arcade vient du temps et de l’enchaînement des collectes. La dynamique physique reste celle de la base par image et dépend donc du nombre d’images réellement calculées. Les réglages extrêmes permettent volontairement de perturber le suivi. Un canvas saturé peut imposer une réapparition proche du corps malgré les tentatives d’évitement.

Les sons ont été vérifiés par mesure du signal dans Chrome, sans prétendre à une écoute sur chaque casque ni à une validation sur un téléphone physique. Le test mobile utilise une émulation tactile Chromium. Les performances mesurées dans Chrome automatisé ne garantissent pas le même débit sur tous les appareils.

