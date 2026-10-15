# Spécification proposée — VehiculeAvecRadar et avoidMulti

Statut : plan à examiner avant implémentation. Ce document est le seul fichier
créé pour cette demande.

## 1. Objectif et organisation

Créer `VehiculeAvecRadar extends Vehicle` dans `vehiculeAvecRadar.js`, dans ce
dossier. La classe ajoute `avoidMulti(obstacles, nombreRayons = 3)`, qui retourne
un nouveau `p5.Vector` représentant la moyenne des forces d'évitement des rayons.
Le comportement calcule une force ; il ne déplace pas le véhicule et n'appelle
ni `applyForce()` ni `update()`.

Conserver le `vehicle.js` local et ses modifications existantes. Le chargement
prévu est : p5.js 1.7.0, les classes existantes, `vehiculeAvecRadar.js`, puis
`sketch.js`. Aucun partage implicite avec les autres exercices.

## 2. Référence précise dans les sources actuelles

La référence est `Vehicle.avoid(obstacles)`, et non `avoidCorrige()` :

- `ahead = vel × 30` et `ahead2 = vel × 15` ; leurs extrémités sont des positions
  absolues obtenues en ajoutant `pos`.
- Trois distances sont comparées : centre de l'obstacle vers le bout de `ahead`,
  vers le bout de `ahead2`, et vers `pos`.
- Le point donnant la plus petite distance détermine la direction de répulsion.
- L'obstacle menace le véhicule si cette distance est strictement inférieure à
  `obstacle.r + largeurZoneEvitementDevantVaisseau`.
- La force va du centre de l'obstacle vers le point choisi, avec une norme
  `maxForce / 2`. Le comportement ne soustrait pas la vitesse courante.

Le nouveau calcul conserve ces règles par rayon. Il n'ajoute pas une soustraction
de vitesse issue de `avoidCorrige()` et n'ajoute pas une seconde fois `this.r`
au seuil de menace.

Limites constatées dans la base : `avoid()` ne protège pas le cas sans obstacle,
utilise la globale `vehicules`, et `getObstacleLePlusProche()` mesure uniquement
la distance de l'obstacle à `this.pos`. Appeler ce dernier pour chaque rayon
sélectionnerait toujours le même obstacle. La sous-classe doit donc effectuer
sa propre sélection par rayon.

## 3. Paramètres et contrat proposés

| Élément | Proposition | Unité / rôle |
| --- | --- | --- |
| `obstacles` | Tableau d'entités possédant `pos` et `r` | Positions en pixels, rayon positif ou nul |
| `nombreRayons` | Entier de 1 à 31, défaut 3 | Nombre de directions évaluées |
| `ouvertureRadar` | `Math.PI / 2` | Ouverture totale de 90°, de −45° à +45° |
| Horizon principal | 30 | Images de mouvement projetées |
| Horizon secondaire | 15 | Images de mouvement projetées |
| Largeur de détection | Propriété héritée | Demi-largeur en pixels utilisée dans le seuil |
| Norme par rayon menaçant | `maxForce / 2` | Même budget que `avoid()` |

L'ouverture est un choix proposé pour rendre le plan concret ; la demande ne
fixe pas sa valeur. Les rayons couvrent un éventail frontal, pas un cercle complet.
Un seul rayon pointe droit devant. Trois rayons correspondent à −45°, 0°, +45°.
Pour un nombre pair, l'éventail reste symétrique sans imposer un rayon central.

Un nombre de rayons nul, négatif, fractionnaire, non fini ou supérieur à 31
déclenche une `RangeError`. Un argument `obstacles` autre qu'un tableau déclenche
une `TypeError`. Les obstacles dont les coordonnées ou le rayon sont non finis,
ou dont le rayon est négatif, sont ignorés. Un tableau vide, ou sans obstacle
valide, produit une force nulle. Les positions et vitesses du véhicule sont
supposées finies ; les états non finis sont rejetés explicitement avant le calcul.

## 4. Construction de chaque rayon

Notations : `P` est la position, `V` la vitesse, `N` le nombre de rayons et `A`
l'ouverture totale. Pour l'indice `i` de 0 à `N − 1` :

```text
angle_i = 0                         si N = 1
angle_i = −A/2 + i × A/(N−1)        sinon
vitesseTournee_i = copie(V) tournée de angle_i
ahead_i  = vitesseTournee_i × 30
ahead2_i = vitesseTournee_i × 15
Q1_i = P + ahead_i
Q2_i = P + ahead2_i
Q0_i = copie(P)
```

Chaque rayon garde donc la longueur liée à la vitesse réelle : il ne normalise
pas la vitesse pour imposer une portée fixe. À vitesse 4 px/image, les distances
projetées sont 120 et 60 pixels. Les opérations travaillent sur des copies.

À vitesse nulle, les trois points sont confondus avec `P`. La portée devient
nulle : seul un obstacle déjà proche de la position peut déclencher une force.
Mémoriser la dernière direction non nulle, avec `(1, 0)` au démarrage, uniquement
pour orienter les rayons de diagnostic et résoudre les directions dégénérées.
Cette direction de secours ne crée pas de vitesse artificielle.

## 5. Sélection de l'obstacle et force par rayon

Pour chaque rayon, parcourir tous les obstacles valides. Pour le centre `C` :

```text
d1 = distance(C, Q1_i)
d2 = distance(C, Q2_i)
d0 = distance(C, P)
distanceRayon = min(d1, d2, d0)
```

L'obstacle le plus proche **de ce rayon** est celui dont `distanceRayon` est la
plus petite. Cette définition proposée permet à deux rayons de choisir des
obstacles différents. En cas d'égalité entre obstacles, conserver le premier
dans le tableau pour rendre le résultat déterministe.

Conserver aussi le point associé à cette distance. Pour les égalités entre
points, reprendre l'ordre du `avoid()` actuel : priorité à `Q1_i`, puis `Q2_i`,
puis `P` ; remplacer le point retenu uniquement pour une distance plus petite.

Après sélection, tester la menace avec le seuil strict de la base :

```text
menace_i = distanceRayon < obstacleChoisi.r + largeurZoneEvitementDevantVaisseau
```

Si la menace est absente, `force_i = (0, 0)`. Sinon :

```text
directionEvitement_i = pointChoisi_i − obstacleChoisi.pos
force_i = directionEvitement_i ramenée à une norme maxForce / 2
```

Si le point choisi est exactement au centre de l'obstacle, utiliser d'abord
`P − obstacleChoisi.pos` si ce vecteur est non nul. Si les deux positions sont
également confondues, utiliser une perpendiculaire déterministe à la direction
du rayon. Cela définit une sortie sans normalisation indéfinie ni tirage aléatoire.
Avec `maxForce = 0`, chaque force reste nulle.

Le même obstacle peut contribuer à plusieurs rayons : chaque rayon effectue
son évaluation indépendamment. L'évitement des autres véhicules n'entre pas
dans `avoidMulti()` ; leur séparation demeure un autre comportement.

## 6. Moyenne retournée

```text
forceMoyenne = (force_0 + force_1 + … + force_(N−1)) / N
retourner forceMoyenne limitée à maxForce
```

Le dénominateur est toujours le nombre total de rayons, y compris ceux qui
renvoient zéro. Avec trois rayons dont un seul détecte une menace, la force
retournée vaut donc un tiers de sa force. Il ne faut ni diviser seulement par
le nombre de menaces, ni remettre la moyenne à une norme constante après coup.
La norme de cette moyenne ne dépasse normalement pas `maxForce / 2` ; la limite
finale constitue une garde supplémentaire.

Deux forces opposées peuvent s'annuler exactement. Cette conséquence de la
moyenne demandée doit rester observable, documentée et testée. Un arbitrage
prioritaire entre rayons constituerait une variante ultérieure.

## 7. Intégration future et diagnostic

1. Ajouter la sous-classe et tester `avoidMulti()` isolément avec les vraies
   méthodes chargées depuis les sources.
2. Charger le nouveau fichier après `vehicle.js`. Créer les véhicules radar
   dans les points de création de `sketch.js` : `setup()`, touche `v` et touche `f`.
3. Surcharger `applyBehaviors(target, obstacles, voisins)` dans la sous-classe
   pour utiliser `avoidMulti()` à la place de l'évitement simple. Réutiliser
   les méthodes héritées compatibles, composer les forces explicitement,
   puis limiter la somme finale à `maxForce` avant un unique `applyForce()`.
   La scène appelle ensuite `update()` une seule fois.
4. Examiner les limites de la composition existante avant cette intégration :
   `separate()` utilise `maxspeed`, `velocity` et `maxforce`, alors que la classe
   définit `maxSpeed`, `vel` et `maxForce` ; `boundaries()` retourne une vitesse
   désirée plutôt que le steering qu'elle calcule. Si ces comportements sont
   conservés pour le véhicule radar, leurs adaptations devront être portées
   par des surcharges dans la sous-classe et couvertes par des tests ciblés.
5. Conserver les données de perception calculées : angle, points, obstacle
   choisi, trois distances, point retenu, menace, force par rayon et moyenne.
   Le rendu debug lit ces données, sans rappeler `avoidMulti()`.

Afficher les directions, `ahead`, `ahead2`, les obstacles retenus et les forces
individuelles, puis la force moyenne. Distinguer les menaces par des marqueurs
et des traits en plus des couleurs. Isoler le rendu avec `push()` / `pop()`.
Aucun nouveau curseur ou panneau n'est nécessaire pour cette première version.

## 8. Tests prévus et critères d'acceptation

Créer `tests/avoid-multi.test.cjs` avec `node:test` et `node:assert/strict`, sans
dépendance supplémentaire. Commande depuis ce dossier :

```sh
node --test tests/*.test.cjs
```

Les tests chargeront la base locale et la vraie sous-classe. Un adaptateur p5
minimal pourra servir aux tests numériques ; il sera complété par une validation
dans le navigateur avec p5.js 1.7.0.

| Cas | Résultat à vérifier |
| --- | --- |
| 1, 3 et 4 rayons | Directions correctes et symétriques ; pas de division par zéro pour 1 |
| Rotation du véhicule | L'éventail suit la vitesse ; les portées restent `30 × vitesse` et `15 × vitesse` |
| Liste vide ou obstacles invalides | Force nulle finie ; diagnostics précédents effacés |
| Obstacle proche de `ahead`, `ahead2`, puis `pos` | Chacun des trois points peut déterminer la menace et la force |
| Plusieurs obstacles | Chaque rayon sélectionne son obstacle selon la métrique définie |
| Distance juste sous, égale, puis au-dessus du seuil | Seule la distance strictement inférieure déclenche l'évitement |
| Un rayon actif sur trois | Moyenne égale à `forceActive / 3` |
| Trois forces distinctes | Moyenne vectorielle exacte, sans renormalisation |
| Forces opposées | Annulation conservée, résultat nul fini |
| Point confondu avec le centre | Direction de secours définie et force bornée |
| Vitesse nulle et force maximale nulle | Résultats finis ; portée ou force nulle selon le cas |
| Vecteurs partagés | Aucune mutation de `pos`, `vel` ou des positions des obstacles par `avoidMulti()` |
| Intégration et pondérations | Force totale bornée, vitesse bornée, une intégration par image |
| Diagnostic activé ou désactivé | Même résultat de steering ; aucun nouveau calcul au dessin |

Pour un seul rayon et un seul obstacle non dégénéré, retrouver le résultat du
`avoid()` hérité. Avec plusieurs obstacles, la sélection proposée diffère
volontairement du choix fondé uniquement sur la position du véhicule.

## 9. Limites connues du modèle proposé

Trois points ne constituent pas une intersection continue entre le rayon et
un obstacle : un obstacle situé entre les points échantillonnés peut échapper
à la détection. De plus, sélectionner le centre le plus proche avant de tester
la menace peut masquer un obstacle plus grand dont le centre est plus éloigné.
Ces limites doivent être illustrées pendant la validation ; modifier la sélection
pour privilégier les menaces serait une évolution distincte à discuter.

Le point `P` commun à tous les rayons peut provoquer plusieurs contributions
pour un obstacle proche, y compris derrière le véhicule. Cette propriété vient
du test à trois distances demandé. Le rebouclage éventuel avec `edges()` ne rend
pas ces distances toriques. Le coût du calcul est `O(N × nombreObstacles)`.

La référence conceptuelle est Craig W. Reynolds, *Steering Behaviors for Autonomous
Characters*, sections obstacle avoidance et combining steering behaviors :
[article local](../ARTICLE_CRAIG_REYNOLDS/Steering%20Behaviors%20For%20Autonomous%20Characters.pdf)
et [version publiée par l'auteur](https://www.red3d.com/cwr/steer/gdc99/).
Le radar à plusieurs rayons et la moyenne ci-dessus constituent la variante
pédagogique demandée, fondée sur le `avoid()` de ce dossier.
