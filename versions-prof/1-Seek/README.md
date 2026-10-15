# Exemple 1 — Seek

Cet exemple illustre le comportement **Seek** de Craig Reynolds avec plusieurs instances de `Vehicle` qui poursuivent la même cible rouge.

## Lancer l'exemple

Depuis la racine du dépôt :

```bash
python3 -m http.server 8000
```

Ouvrir ensuite <http://localhost:8000/1-Seek/> dans un navigateur.

## Contrôles de la tâche 1

- **Véhicules** : fait varier immédiatement la population entre 1 et 200.
- **Vitesse maximale** : applique à tous les véhicules une valeur comprise entre 0 et 40.
- **Force maximale** : applique à tous les véhicules une valeur comprise entre 0 et 10.

Les changements sont traités pendant le déplacement des curseurs. Les véhicules déjà présents conservent leur position et leur état lorsque la population change. Les nouveaux véhicules apparaissent à une position aléatoire entièrement comprise dans le canvas et héritent des limites courantes.

La cible suit le pointeur uniquement lorsque celui-ci se déplace dans le canvas. Manipuler les contrôles ne déplace donc pas la cible.

## Cibles et réapparition — tâche 2

Le menu **Cible** permet de choisir entre :

- **Suivre la souris** : tous les véhicules poursuivent le cercle rouge contrôlé par le pointeur ;
- **Suivre une cible autonome** : tous les véhicules poursuivent une instance mobile de `Target`.
- **La cible fuit les vaisseaux** : `TargetFuyante` étend `Target` (et donc `Vehicle`) et
  applique le steering `flee()` avec détection, cooldown, durée maximale et endurance.

Dans ce mode, le curseur **Cibles fuyantes** règle en temps réel le nombre d’instances
de `TargetFuyante` affichées. Chaque vaisseau suit la cible fuyante la plus proche.
Une cible touchée par un vaisseau est supprimée. Une cible qui survit au délai réglé
par **Temps avant duplication** se scinde pendant 0,7 seconde, puis donne naissance à
deux nouvelles instances indépendantes avec des chronomètres remis à zéro.

Toutes les entités graphiques mobiles de la simulation sont des `Vehicle` ou des
sous-classes. La cible spécialisée se trouve dans `targetFuyante.js`; les fonctions de
scène et de réapparition sont dans `target-utils.js`.

Le mode debug se bascule avec la touche `d` ou la case correspondante dans l’interface.
Il affiche le rayon de détection de la cible en mode fuite et les vecteurs rouges de
vitesse des vaisseaux.

## Serpents Wander

Trois serpents colorés parcourent aussi le canvas de façon autonome. Leur tête
utilise le steering `wander()` avec une direction persistante et une petite
variation angulaire par image ; un steering de bord évite qu'ils ne quittent le
canvas, et les anneaux suivent le précédent avec `arrive()`.
La base `Vehicle` locale fournit ces deux comportements. Les classes `Snake`,
`SnakeRing` et `SnakeWander` sont copiées dans ce dossier pour garder l’exercice
autonome et ne dépendent pas des fichiers d’un autre exemple.

La cible autonome reste la même lors des changements de mode. Lorsqu'un véhicule touche la cible active, la collision tient compte des deux rayons. Le véhicule réapparaît entièrement dans le canvas, hors de la cible, avec une vitesse et une accélération nulles. Son identité et ses réglages sont conservés.

## Plasma psychédélique — tâche 3

Le fond est un plasma animé composé de champs radiaux et d'ondes colorées. La souris déforme localement les blobs lorsque le pointeur se trouve dans le canvas.

Six curseurs permettent de régler en temps réel :

- la vitesse de l'animation ;
- la complexité du motif ;
- la taille des blobs ;
- la teinte générale ;
- la saturation ;
- l'influence de la souris.

Le plasma est calculé dans une surface hors écran de résolution réduite, puis agrandi derrière la simulation. Cette méthode limite le coût du rendu avec 200 véhicules. Une vitesse nulle fige le mouvement temporel, tandis qu'une influence nulle désactive seulement la réaction à la souris.

## Musique interactive — tâche 4

Le bouton **Activer la musique** démarre une voix FM, une basse mélodique et des percussions synthétiques. X règle la modulation de 1 à 20 Hz et le cutoff de 120 à 12 000 Hz. Y fait varier la porteuse de 55 Hz en bas à 880 Hz en haut. Le plasma suit la phase FM et les kicks depuis l'horloge audio. Le volume et le tempo sont réglables en direct.

Le panneau est masqué au chargement. Le bouton **UI on/off** en bas à droite permet de l'afficher ou de le masquer, sans arrêter la musique. Masquer le panneau libère le bord gauche du canvas pour la souris.

Toutes les 10 secondes de musique, un nouveau profil aléatoire est choisi : profondeur FM, niveau de la voix, résonance, léger désaccordage, longueur et niveau de basse, couleur des percussions et mélodie pentatonique mineure. Les paramètres de timbre évoluent progressivement pendant trois secondes ; les notes changent sur les déclenchements de basse. La fréquence FM, le cutoff et le pitch restent pilotés par la souris. Le morphing utilise le séquenceur existant et cesse avec la musique.

**Couper la musique** éteint tout le mix, arrête les sources et suspend le contexte. Le plasma retrouve son animation autonome. Le tempo modifié prend effet sur les prochains pas non encore programmés (avance maximale de 120 ms).

## Tests

Depuis le dossier `1-Seek` :

```bash
node --test tests/*.test.cjs
```

Les tests couvrent les bornes des paramètres, la conservation des instances, la propagation de la vitesse et de la force, la position initiale des nouveaux véhicules, la réaction immédiate aux événements `input`, le choix de la cible, les collisions, la réapparition, le calcul du plasma et les trois serpents wander.

`target.js` reste inchangé. `vehicle.js` ajoute les paramètres et méthodes `wander()`,
`arrive()` et `boundaries()` nécessaires aux serpents, tout en conservant le
comportement historique de `seek(target)` pour les véhicules Seek.

Pour la validation du signal avec la Web Audio API réelle, ouvrir `tests/audio-browser.html` via le serveur local et cliquer sur **Exécuter les tests audio**. Le rendu hors ligne mesure le mix avant et après coupure, vérifie l'annulation des notes futures et le nettoyage des sources.
