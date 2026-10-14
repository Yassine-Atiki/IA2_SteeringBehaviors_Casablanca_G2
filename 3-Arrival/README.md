# 3-Arrival — Serpents et nourriture

Lancer un serveur depuis la racine du dépôt : `python3 -m http.server 8790`, puis ouvrir `http://localhost:8790/3-Arrival/`.

Un serpent de douze anneaux suit la souris au démarrage. `Snake extends Vehicle` est sa tête (`snake.head === snake`). Chaque `SnakeRing extends Vehicle` suit son prédécesseur avec `arrive()`. Le fichier `vehicle.js` est conservé tel qu'il était avant cette évolution.

## Paramètres

Le bouton **UI on/off** affiche un panneau masqué par défaut. Les contrôles réagissent à l'événement `input`, pendant le glissement.

Chaque serpent dispose de son propre groupe de contrôles :

| Contrôle | Défaut | Effet |
| --- | --- | --- |
| Longueur | 12 | Nombre d'anneaux, sans compter la tête. |
| Rayon | 12 px | Rayon de sa tête et de ses anneaux. |
| Espacement | 8 px | Distance libre souhaitée **entre les bords** des cercles. |
| Couleur | Palette | Couleur de toute la chaîne, via un sélecteur. |
| Vitesse max | 4 | `maxSpeed` de sa tête. |
| Force max | 0,2 | `maxForce` de sa tête. |

Changer ces valeurs ne modifie pas les autres serpents. Les réglages communs des anneaux restent séparés : vitesse max 5, force max 0,3 et zone de freinage 50 px. Le freinage des têtes est commun, avec un rayon de 100 px. Les nouvelles instances utilisent les réglages communs actuels et les valeurs individuelles par défaut.

La longueur est réglable de 1 à 100 anneaux ; les repas peuvent la faire dépasser 100, et le contrôle étend alors sa borne pour refléter la longueur réelle. Le rayon va de 4 à 30 px, l'espacement de 0 à 80 px, la vitesse de 0 à 40 et la force de 0 à 10.

Les unités suivent la base pédagogique : vitesse en px/image, force en variation de vitesse/image pour une masse implicite de 1. Une vitesse max nulle immobilise la partie concernée. Une force max nulle désactive son steering, avec conservation possible d'une vitesse existante.

## Arrêt et espacement : principe de la correction manuelle

Le suivi reprend le mécanisme de `3-Arrival_correction/snake.js` :

```js
const cible = anneau.predecessor.pos;
const distanceArret = anneau.r + anneau.predecessor.r + anneau.gap;
const force = anneau.arrive(cible, distanceArret);
anneau.applyForce(force);
anneau.update();
```

L'anneau vise le centre du précédent, et non un point construit depuis sa vitesse. Le second argument de `arrive()` est une distance d'arrêt : 20 px dans la correction manuelle ; ici la somme des rayons et du vide réglé par curseur, soit 32 px par défaut. La tête est mise à jour en premier, puis chaque anneau suit la nouvelle position du précédent. Chaque partie est intégrée une seule fois.

Dans la zone de freinage, la base calcule une vitesse désirée proportionnelle à `(distance - distanceArret)`. Trop loin : attraction vers le précédent. À la bonne distance : vitesse désirée nulle et freinage. Trop près : la vitesse désirée devient négative, ce qui repousse l'anneau. Ce signe négatif sert ici volontairement à rétablir l'espacement.

Une petite zone de repos évite les micro-ajustements : entrée lorsque l'erreur de distance est inférieure à 0,6 px, reprise au-delà de 1,2 px. Le freinage reste limité par `maxForce`. Lorsque la distance d'arrêt est supérieure ou égale à la zone de freinage réglée, une spécialisation locale conserve une pente positive sans division par zéro ; dans les autres cas, `super.arrive()` et `super.seek()` sont réutilisés directement.

### Pourquoi l'ancien suivi gondolait

L'ancien point suivi était `positionPrécédente - directionPrécédente * espacement`. Une petite variation angulaire déplaçait donc ce point même si le précédent bougeait à peine. Son déplacement faisait tourner le suivant, qui déplaçait à son tour le point du suivant : cette rétroaction amplifiait les ondulations. Mémoriser la dernière direction ne supprimait pas cette dépendance.

L'analyse précédente s'était focalisée sur les seuils de mémorisation de l'orientation. Les tests d'une longue ligne droite, initialement alignée, validaient cette hypothèse sans reproduire les petits déplacements latéraux. Le suivi radial reprend le modèle plus simple de la correction et ne dépend plus d'un angle pour placer la cible. L'orientation mémorisée ne sert qu'au dessin de la tête et à l'initialisation de nouveaux anneaux.

Les anneaux ne sont ni téléportés ni redressés par une contrainte rigide. Une trajectoire courbe peut laisser une chaîne courbe ; le suivi évite de créer artificiellement de grandes ondulations à partir de petits déplacements. Les anneaux ne rebouclent pas individuellement aux bords.

## Nourriture

`Nourriture extends Vehicle` est définie dans `nourriture.js`. Cinq nourritures apparaissent au départ à des positions aléatoires. Une nouvelle apparaît ensuite toutes les **5 secondes**, fréquence réglable de 0,5 à 20 s. La scène conserve au maximum 100 nourritures simultanées pour les longues sessions.

Chaque nourriture démarre avec une vitesse nulle. Lorsqu'une tête entre à une distance **inférieure ou égale à 100 px de son centre**, la nourriture choisit la tête la plus proche puis lui reste attachée : elle utilise `super.arrive(head.pos, 0)`, `applyForce()` et `super.update()` pour la rejoindre. Elle continue à la suivre si celle-ci quitte le rayon. Si le serpent est retiré, elle abandonne cette référence, freine et peut être attirée par une autre tête à portée.

Au contact d'une tête (`distance <= rayon nourriture + rayon tête`), elle disparaît et ce serpent gagne **exactement un anneau**. Les anneaux seuls ne mangent pas. Le contrôle de longueur du serpent est actualisé automatiquement, sans recréer ses autres anneaux.

Les cinq SVG (pomme, fraise, souris, fromage, carotte) sont chargés localement dans `preload()`. Source : [Twemoji v14.0.2](https://github.com/twitter/twemoji/tree/v14.0.2/assets/svg), Twitter et contributeurs, licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Les illustrations sont fournies sans modification ; attribution et licence figurent dans `assets/food/ATTRIBUTION.md` et `LICENSE-GRAPHICS` ainsi que dans l'UI.

## Debug et fichiers

La touche **D** et la case debug affichent les points de suivi, les zones de freinage et les vecteurs de vitesse, ainsi que le rayon de détection de chaque nourriture. Le panneau conserve la dernière cible du canvas quand le pointeur le survole.

- `snake.js` : tête, paramètres, croissance et orchestration de la chaîne.
- `snakeRing.js` : arrivée avec repos, suivi, direction et rendu.
- `snake-controls.js` : contrôles globaux et cartes individuelles ; synchronisation des longueurs.
- `nourriture.js` : entité nourriture et horloge d'apparition injectable.
- `sketch.js` : initialisation, SVG, boucle, populations et repas.
- `SNAKE_SPECIFICATION.md` : exigences et critères d'acceptation.

## Validation

Depuis la racine :

```sh
node --test 3-Arrival/tests/*.test.cjs
```

24 tests unitaires couvrent les vraies classes avec un adaptateur vectoriel minimal : héritage, limites de force/vitesse, mise à jour séquentielle tête vers queue, arrivée, repos, espacement, identité, réglages indépendants, coordonnées, événements, nourriture, seuils exacts, repas unique, croissance et horloge d'apparition.

Validation complémentaire effectuée dans Chrome avec le vrai p5.js : chargement des cinq SVG, paramètres individuels, cartes ajoutées/supprimées, nourriture passive puis attirée, consommation et synchronisation de longueur, fréquence, stabilité au repos et bouton UI accessible sur un écran de 390 px. Aucun changement de `vehicle.js` pendant cette évolution.

Régressions supplémentaires : orientation d'un prédécesseur immobile sans effet sur la cible, attraction/répulsion selon la distance d'arrêt, freinage à l'équilibre, espacement supérieur à la zone de freinage, petits mouvements alternés puis arrêt (écarts 0, 8, 30 et 80 px). Dans le scénario Chrome correspondant, l'écart latéral maximal final est inférieur à 0,1 px et le déplacement mesuré pendant 300 images supplémentaires est nul.
