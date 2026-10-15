# Wander : curseurs et mutation

Servir ce dossier avec `python -m http.server 8000`, puis ouvrir
`http://localhost:8000`. p5.js 1.7.0 et les images sont embarqués.

| Curseur | Plage | Pas | Valeur initiale |
| --- | --- | --- | --- |
| Vaisseaux | 0–200 | 1 | 20 |
| Vitesse max (pixels/image) | 1–20 | 1 | 10 |
| Force max (variation de vitesse/image) | 0,05–2 | 0,05 | 0,10 |
| Rayon wander (pixels) | 5–100 | 5 | 50 |
| Distance wander (pixels) | 10–300 | 10 | 150 |
| displaceRange (radians/image) | 0–1 | 0,01 | 0,30 |
| Traînée (nombre de points) | 0–200 | 1 | 10 |

Les curseurs réagissent pendant le glissement et sont utilisables au clavier.
Un point de traînée est mémorisé toutes les cinq images. Réduire la longueur
retire immédiatement les points excédentaires ; zéro masque la traînée.
Réduire l'effectif conserve les premiers vaisseaux et leur état. Les nouveaux
vaisseaux prennent les valeurs actuelles des curseurs.

**Mutation** ajoute à chacun des six paramètres de chaque vaisseau un tirage
indépendant dans ±20 % de sa plage. Le résultat est arrondi au pas du curseur
et borné à sa plage. Le nombre de vaisseaux et le mode debug ne mutent pas.
L'affichage indique ensuite le minimum et le maximum dans la flotte. Déplacer
un curseur réapplique sa valeur à tous les vaisseaux pour ce seul paramètre.
Les mutations successives partent des valeurs propres à chaque vaisseau.

Le mode debug s'active par la case ou la touche **d**.
La scène applique la force retournée par `wander()` avant l'intégration.
`WanderVehicle` hérite de la base et complète la limitation de la traînée.
`vehicle.js` reste intact.

## Validation

Depuis ce dossier, avec Node.js 18 ou supérieur :

```powershell
node --test tests/controls.test.cjs
node --test tests/browser.test.cjs
```

Les tests unitaires utilisent un adaptateur p5/DOM minimal pour vérifier les
événements, l'effectif, les identités, les mutations déterministes, leurs limites,
les traînées et la locomotion héritée. L'intégration charge les vrais scripts
et assets dans Chrome ou Edge en mode headless, sur un serveur local éphémère.
Définir `WANDER_BROWSER` si l'exécutable est ailleurs. Elle vérifie les contrôles,
le clic Mutation, les changements d'effectif, les traînées et le mouvement avec
p5 réel. Le profil navigateur est créé dans le dossier temporaire système.

Référence : [Craig W. Reynolds, Wander](https://www.red3d.com/cwr/steer/gdc99/).
