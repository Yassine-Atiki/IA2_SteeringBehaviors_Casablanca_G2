# 4-Wander

Exemple p5.js du comportement wander, combiné à arrive vers le pointeur.

## Réglages

- **Nombre de vaisseaux** : de 1 à 40. Les vaisseaux déjà présents sont conservés quand la population augmente ou diminue.
- **Displace range** : amplitude maximale de la variation aléatoire de `wanderTheta` à chaque image, de 0,1 à 0,5 radian par image, par pas de 0,01.
- **Longueur de traînée** : nombre maximal de positions mémorisées par véhicule, de 0 à 100 points. L'échantillonnage reste d'un point toutes les cinq images.
- Les réglages historiques de vitesse, force, rayon, distance et poids restent disponibles.
- **Mutation** applique à chaque vaisseau une variation aléatoire indépendante à chaque paramètre individuel. Les variations respectent les plages et les pas affichés par les curseurs ; une traînée trop longue est tronquée immédiatement. Quand les vaisseaux ont des réglages différents, les curseurs affichent une position moyenne et la valeur « variés ».
- La touche `d` et la case à cocher activent le diagnostic wander.

Ouvrir `index.html` dans un navigateur pour lancer l'exemple. p5.js 1.x est embarqué dans `libraries/`.

## Tests

Depuis ce dossier, lancer :

```sh
node --test tests/*.test.cjs
```

Les tests couvrent les variations aléatoires injectées, les plages et pas, les bornes, et la réduction de la traînée.
