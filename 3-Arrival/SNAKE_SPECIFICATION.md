# Spécification — classe `Snake` pour `3-Arrival`

## Objectif

Ajouter à l’exemple `3-Arrival` une classe `Snake` qui étend le `Vehicle` local. Un serpent suit la souris avec le comportement `arrive`. Il est formé d’une tête et d’un corps composé d’anneaux ; chaque partie est elle-même une instance de `Vehicle` et est dessinée sous la forme d’un cercle.

Cette évolution reste autonome dans `3-Arrival`. Le fichier `vehicle.js` est la classe de base fournie : il ne doit pas être modifié. La classe spécialisée sera définie dans `snake.js`, chargé après `vehicle.js` et avant `sketch.js`.

## Modèle objet

- `Snake extends Vehicle` et possède une instance `head` de `Vehicle` ainsi qu’une collection `anneaux` de `Vehicle`.
- La tête et chaque anneau ont leur propre position, vitesse, accélération et paramètres de mouvement. La collection `anneaux` ne contient pas la tête.
- La propriété `couleur` définit la couleur de rendu du serpent. La tête et tous les anneaux emploient cette couleur afin de distinguer les instances de `Snake`.
- La propriété `taille` correspond au rayon `r` de chaque partie. Les cercles ont donc un diamètre de `2 × taille`.
- Le constructeur accepte au minimum la position de départ, le nombre d’anneaux, la taille et la couleur. Il accepte aussi les paramètres de mouvement initiaux de la tête et des anneaux, ou une configuration équivalente documentée.
- L’instance `Snake` orchestre la tête et les anneaux ; le déplacement visible est celui de ses `Vehicle` enfants. Elle ne doit pas intégrer une seconde fois leur locomotion.

## Comportements et mise à jour

À chaque image, la scène fournit la position de la souris comme cible de la tête. La tête calcule `arrive(cible)` et chaque anneau calcule `arrive(position de la partie précédente, distanceDeSuivi)`. Le premier anneau suit la tête ; les suivants suivent l’anneau précédent. Chaque force passe par `applyForce()`, puis chaque partie appelle `update()` une fois par image. La mise à jour ne téléporte aucune partie.

L’espacement entre parties doit rester cohérent avec leur taille. Pour `arrive`, la cible est décalée derrière la partie précédente à une distance de suivi configurable, de façon que les cercles ne se superposent pas systématiquement. Le traitement des positions identiques doit rester fini et stable. Le comportement de base `seek/arrive` et son cas `distance = 0` seront vérifiés avant l’intégration ; toute adaptation nécessaire se fera dans une sous-classe, sans retoucher `vehicle.js`.

Le modèle de la base est intégré par image. Le paramètre appelé « accélération maximale » dans l’interface correspond à la force maximale appliquée par image (`maxForce` dans `Vehicle`) ; l’interface et la documentation doivent expliquer cette correspondance sans introduire de seconde intégration temporelle.

## Paramètres réglables

Les paramètres de déplacement de la tête et ceux des anneaux sont distincts :

| Paramètre | Tête | Anneaux |
|---|---|---|
| Vitesse maximale | réglable | réglable indépendamment |
| Accélération maximale / `maxForce` | réglable | réglable indépendamment |

Les modifications des contrôles s’appliquent immédiatement à toutes les instances existantes et aux prochaines instances créées. Les valeurs initiales et les plages des contrôles seront choisies d’après les unités et les valeurs de la base locale, puis affichées à côté des contrôles. Elles doivent permettre d’observer des différences de suivi sans rendre les parties incontrôlables.

Le nombre d’anneaux, la taille et la couleur caractérisent une instance de serpent. Les contrôles de scène pourront permettre d’ajouter un serpent et de régler ces attributs pour les nouvelles instances ; ils ne sont pas nécessaires pour modifier rétroactivement ces attributs sur les serpents déjà créés.

## Rendu

Dessiner la tête et les anneaux avec `circle()` en utilisant leur position et le rayon `taille`. Chaque dessin isole ses styles avec `push()` / `pop()`. Aucun triangle ou sprite n’est requis pour cette première version. Plusieurs serpents doivent rester visuellement différenciables par leur couleur.

## Interface masquable

Ajouter une petite interface HTML de paramètres, initialisée une seule fois dans `setup()`, avec des libellés lisibles et les valeurs numériques courantes. Elle comprend au minimum quatre réglages séparés : vitesse maximale de la tête, accélération maximale de la tête, vitesse maximale des anneaux et accélération maximale des anneaux.

L’interface doit pouvoir être masquée et réaffichée par un bouton visible et par une touche dédiée (proposition : `H`). Le masquage ne suspend pas la simulation. Les contrôles restent utilisables au clavier et ne doivent pas détourner les raccourcis lorsqu’un champ est actif. La présentation reprend le style simple des interfaces des exemples du dépôt et reste lisible sur le canvas.

## Organisation attendue

- `snake.js` : définition de `Snake`, construction des `Vehicle` enfants, comportement de suivi et rendu.
- `sketch.js` : création de la cible souris, configuration/gestion de l’interface, création des serpents et orchestration mise à jour-rendu.
- `index.html` : chargement de `snake.js` après `vehicle.js` et avant `sketch.js`.
- `style.css` : présentation de l’interface masquable, si nécessaire.
- `README.md` : paramètres, commandes et lancement de l’exemple, conformément aux consignes du dépôt.
- `tests/` : tests des comportements et paramètres ajoutés, suivant le lanceur retenu pour le dépôt.

## Critères d’acceptation

1. `Snake` hérite bien de `Vehicle` et contient une tête et le nombre demandé d’anneaux, tous des `Vehicle`.
2. Tête et anneaux sont rendus en cercles de rayon commun `taille` et de couleur `couleur`.
3. La tête arrive à la position de la souris ; le premier anneau suit la tête et chaque anneau ultérieur suit le précédent.
4. Toutes les parties utilisent les forces de steering, `applyForce()` et `update()` une fois par image ; la tête et le corps ne sont pas déplacés par cinématique directe.
5. Vitesse maximale et accélération/force maximale de la tête sont indépendantes des valeurs correspondantes des anneaux.
6. Les quatre réglages de mouvement modifient les serpents en direct et affichent leur valeur.
7. L’interface se masque et se réaffiche par bouton et touche, sans interrompre l’animation.
8. Plusieurs instances peuvent avoir des couleurs distinctes et restent correctement mises à jour.
9. Les tests couvrent au moins la composition et le suivi des segments, les paramètres indépendants, les limites de mouvement, ainsi que les cas limites de suivi rapproché.
10. `vehicle.js` reste inchangé.

## Points de vigilance d’implémentation

La version locale de `arrive()` délègue à `seek()` et accepte un décalage de cible `d`. Son freinage se base sur `rayonZoneDeFreinage`, mais le calcul actuel autour de la cible confondue avec le véhicule doit être pris en compte pour éviter une vitesse résiduelle indésirable. La spécification n’autorise pas à corriger ce comportement dans la base protégée : adapter `Snake` si cela est requis, puis tester le cas.


## Extension NEON SERPENT — comportement livré

La version arcade conserve la classe Snake et son intégration d’origine. Les anneaux visent le centre de leur prédécesseur avec `arrive(positionPrecedente, distanceDeSuivi)` ; le deuxième argument détermine la distance d’arrêt. La prescription de cible décalée figurant plus haut ne décrit donc pas le suivi actuellement livré : aucun deuxième décalage de cible n’est ajouté, pour préserver le comportement existant demandé.

NeonSnake étend Snake pour le rendu et NeonFood étend Food pour le noyau. Les trois bases vehicle.js, snake.js et food.js sont inchangées. Les particules mobiles utilisent EnergyParticle, sous-classe de Vehicle, avec forces limitées et locomotion héritée.

L’arcade termine une manche de 90 secondes par victoire à 3 000 points ou par expiration du temps. Le bac à sable conserve le mode libre multi-serpents. Combo : fenêtre de 7 secondes, plafond ×5. Overdrive : charge de 20 % par collecte hors activation, durée 8 secondes, bonus de score ×2, sans modifier les paramètres physiques.

Le rendu, les règles, les limites, les contrôles audio, les commandes de validation et le scénario de présentation sont décrits dans [README.md](README.md).

