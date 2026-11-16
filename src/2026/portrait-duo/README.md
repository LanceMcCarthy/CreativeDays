# duo. — Portraits à deux

Un atelier web en français : deux vidéos côte à côte, une barre de dessin indépendante par vidéo, couleurs, taille du stylo, gomme, annulation de ses propres traits, effacement partagé et capture PNG. Les deux personnes peuvent dessiner sur les deux toiles. Les dessins sont synchronisés en temps réel ; l’invitation contient l’URL complète du salon et son code.

## Démarrage local

Node.js 22 ou plus récent :

```sh
cd src/2026/portrait-duo
npm ci
npm start
```

Ouvrir <http://localhost:3000>, puis copier l’invitation dans une seconde fenêtre ou un autre navigateur. Activer explicitement les caméras et, si souhaité, les micros. Aucun compte n’est nécessaire.

## Publication sur creative-day.pages.dktapp.cloud

Adresse souhaitée : <https://creative-day.pages.dktapp.cloud/>. Le type exact de cet hébergement et ses accès de déploiement n’ont pas été confirmés. **Le projet est préparé pour le déploiement, mais n’est pas publié par ce dépôt.**

Les invitations utilisent l’origine publique courante : une fois le site publié à cette adresse, elles contiendront automatiquement `https://creative-day.pages.dktapp.cloud/?salon=XXXXXXXX`. Ne pas partager les invitations d’un aperçu local : `localhost` n’est accessible que sur sa propre machine.

### Option A — L’hébergement accepte Node.js ou les conteneurs

- Répertoire du projet : `src/2026/portrait-duo`.
- Installation : `npm ci --omit=dev`.
- Démarrage : `npm start`.
- Port : variable `PORT`, 3000 par défaut ; le serveur écoute sur `0.0.0.0`.
- Faire pointer le domaine vers ce service avec un reverse proxy HTTPS qui transmet les connexions WebSocket Socket.IO et `/socket.io/` sans les mettre en cache.
- Un `Dockerfile` est fourni. Depuis ce répertoire : `docker build -t portrait-duo .`, puis `docker run --rm -p 3000:3000 portrait-duo`.

Le même service héberge le site, la signalisation vidéo et la synchronisation des dessins. Aucun paramètre de serveur séparé n’est nécessaire.

### Option B — L’hébergement Pages accepte seulement les fichiers statiques

Un site statique seul ne peut pas synchroniser deux navigateurs. Déployer aussi `server.js` sur un hébergement Node.js/containers joignable en HTTPS et compatible WebSocket.

1. Sur le **serveur Node.js**, définir :

   ```sh
   ALLOWED_ORIGINS=https://creative-day.pages.dktapp.cloud
   PORT=3000
   ```

2. Dans le déploiement **Pages**, définir `SIGNALING_URL` avec l’origine HTTPS réelle de ce serveur (sans chemin). Exemple fictif : `https://signal.votre-domaine.fr`.
3. Configurer le répertoire racine sur `src/2026/portrait-duo`, la commande de construction sur `npm ci && npm run build`, et le dossier publié sur `dist`.
4. Publier le contenu de `dist` à la racine de `https://creative-day.pages.dktapp.cloud/`. Le script de construction génère `config.js` et embarque le client Socket.IO ; il n’y a pas besoin de CDN pour le code applicatif.

`SIGNALING_URL` est une configuration de construction du site statique. `ALLOWED_ORIGINS` est une configuration d’exécution du serveur ; plusieurs origines peuvent être séparées par une virgule. Ne pas renseigner d’URL fictive en production. Sans serveur joignable, l’interface affiche une erreur et aucun salon partagé ne fonctionne.

Pour construire manuellement :

```sh
SIGNALING_URL=https://signal.votre-domaine.fr npm run build
```

### Vidéo entre réseaux différents : STUN et TURN

La vidéo/audio passe par WebRTC, pas par Socket.IO. Par défaut, le projet utilise le STUN public de Google. Certains réseaux d’entreprise, VPN et réseaux mobiles exigent un relais **TURN**. Pour un usage fiable sur Internet, fournir un service TURN avec les droits et identifiants adaptés, puis définir `ICE_SERVERS` sur le serveur :

```sh
ICE_SERVERS='[{"urls":"stun:stun.votre-domaine.fr:3478"},{"urls":"turns:turn.votre-domaine.fr:5349","username":"identifiant","credential":"mot-de-passe"}]'
```

Ces paramètres WebRTC sont transmis aux participants via `/api/config` : ne pas y mettre de secret administratif. En production, privilégier des identifiants TURN temporaires émis par votre infrastructure. HTTPS est obligatoire pour la caméra et le micro, hors `localhost`.

## Comportement et limites

- Deux participants maximum par salon ; un troisième reçoit une erreur explicite.
- L’activation de la caméra n’active pas le micro automatiquement.
- Les dessins sont vectoriels, normalisés et superposés à la vidéo, jamais gravés dans le flux vidéo. Les deux toiles gardent le même ratio sur mobile et ordinateur.
- La gomme et le bouton de visibilité ne modifient que le calque de dessin. « Annuler » retire son dernier trait sur la toile choisie ; « Effacer » efface la toile pour les deux participants après confirmation.
- Les salons et dessins vivent en mémoire dans **une instance** du serveur. Aucun enregistrement vidéo, audio ou dessin sur disque. Un redémarrage perd les salons ; la toile d’une personne est supprimée lorsqu’elle quitte le salon. Une déconnexion conserve temporairement la copie locale à l’écran et les traits locaux sont renvoyés à la reconnexion.
- Maximum de 300 traits par toile et de 3 000 points par trait ; les longs traits sont terminés automatiquement à cette limite.
- Le code constitue l’accès au salon : partager le lien uniquement avec la personne invitée. Il n’y a pas d’authentification.
- La capture PNG est téléchargée localement et comprend les vidéos actives et les calques visibles ; les illustrations d’attente ne sont pas incluses.
- Les polices Google Fonts sont facultatives : une police système prend le relais si le service est indisponible.
- Pour plusieurs instances serveur, il faudra un stockage partagé des salons et un adaptateur Socket.IO ; ce PoC fonctionne sur une seule instance.

## Vérification

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Les tests navigateur utilisent de fausses caméras et micros locaux. Ils couvrent deux participants, la copie du lien, les vidéos WebRTC, les dessins sur les deux toiles, les outils indépendants, l’annulation, l’effacement, l’export, la sortie du salon et la disposition mobile.
