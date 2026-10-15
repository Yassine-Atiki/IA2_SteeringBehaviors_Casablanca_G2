# 2-PursueEvade

Cet exemple montre plusieurs `Vehicle` qui poursuivent plusieurs cibles, elles-mêmes capables de fuir le véhicule le plus proche avec le comportement `evade()`. Chaque cible est une `BouncingBall`, sous-classe de `Target`, donc un objet piloté par les mêmes steering behaviors que les vaisseaux.

L'interface est masquée au démarrage pour laisser la scène libre. Le bouton `UI on/off` affiche les réglages : nombre de véhicules, nombre de cibles, rayon de détection, vitesse et force, choix entre `pursue()` et `pursuePerfect()`, et distance de prédiction de `pursue()`. Le mode debug est activable par la case ou la touche `D`; il affiche les vecteurs et les points de prédiction ainsi que les rayons de détection.

Les curseurs utilisent l'événement `input`, ce qui met à jour la scène pendant le déplacement du curseur. Les fonctions de gestion de population et de sélection de la cible la plus proche sont dans `pursue-scene.js` afin de rester testables sans navigateur.

Une cible principale est détruite lorsqu'un vaisseau la touche, en tenant compte de la somme des rayons. Le compteur des cibles principales reste visible dans l'interface. Lorsqu'une cible détecte un vaisseau, elle utilise `evade()` pendant une seconde et libère des instances de `Leurres`, définies dans `leurres.js`. Les leurres sont des sous-classes de `Target`, se déplacent très lentement sans fuir et expirent après la durée réglée dans l'interface. Ils peuvent détourner la poursuite d'un vaisseau et sont eux aussi supprimés en cas de collision.

Chaque cible dispose d'un budget de cent leurres pour toute sa session. Le curseur règle le nombre lâché lors d'une détection, entre 1 et 25, avec 10 par défaut. Un délai réglable de trois secondes empêche un nouveau largage immédiat. Les leurres forment un nuage aléatoire derrière la cible, avec des profondeurs et des décalages latéraux variés. Le compteur restant est affiché au-dessus de chaque cible. Quand son budget est épuisé, la cible ne peut plus déployer de contre-mesures et devient vulnérable.

Le bouton `Audio : on/off` active les effets après un geste utilisateur, conformément aux règles d'autoplay des navigateurs. [WebAudioX](https://github.com/jeromeetienne/webaudiox) est intégré localement dans `libraries/webaudiox/webaudiox.js`. Son helper JSFX génère les sons chiptune courts : explosion, largage de leurres, impact sur un leurre et alarme. Un oscillateur carré Web Audio assure le son continu de fuite, dont la fréquence monte avec la vitesse de la cible.

`evade()` ne consiste pas à inverser la force de `pursue()`. Il prédit d'abord la position de la menace, puis appelle `flee()` sur cette position. La prédiction utilise le mouvement relatif entre la cible et le prédateur et cherche le temps de rapprochement le plus probable, limité par la distance de prédiction réglée dans l'interface. Si le point prédit coïncide avec la cible, la position actuelle de la menace est utilisée pour conserver une direction de fuite non nulle. `flee()` construit alors une vitesse désirée qui part de la menace, puis calcule le steering `vitesse désirée - vitesse actuelle` et le limite par `maxForce`.

Tests unitaires :

```bash
node --test 2-PursueEvade/tests/*.test.cjs
```

### Effets sonores JSFX corrigés

Les trois dépendances JSFX (`audio.js`, `jsfx.js`, `jsfxlib.js`) sont incluses localement avant WebAudioX, comme dans la [démo officielle](https://jeromeetienne.github.io/webaudiox/examples/jsfx.html). Sans elles, les buffers ne peuvent pas être générés. Les presets Explosion (bruit), Pickup (largage), Hurt (impact leurre) et Power Up adapté (alarme modulée) ont chacun leur timbre. Les explosions durent 0,4 s, l’alarme 0,5 s et le largage 0,2 s. Les sources sont jouées une fois et libérées ; le bouton audio coupe et nettoie aussi les sons de fuite.

Validation du signal dans le navigateur : ouvrir `tests/audio-browser.html`. Cette page utilise de vrais `OfflineAudioContext`, mesure l’énergie de chaque effet, vérifie leur durée, le silence après leur fin et le silence après désactivation. Tests unitaires : `node --test 2-PursueEvade/tests/*.test.cjs`.
