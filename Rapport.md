# API | Laboratoire HTTP-infrastructure

## 1 - Serveur HTTP statique avec Apache httpd

### Lancement avec image Docker

Pour lancer l'image, il faut créer un Dockerfile avec les instructions suivantes :

```dockerfile
FROM php:7.2-apache
COPY site/ /var/www/html/
```

- La première ligne spécifie l'image à utiliser

- La deuxième ligne copie le contenu du dossier `site/` dans le dossier `/var/www/html/` à l'intérieur du container
  - Le dossier `site/` contient donc les fichiers source du site web statique

##### Build de l'image docker du serveur

Commande de build à exécuter dans le dossier du Dockerfile : 

```bash
docker build -t api-apache-php-image .
```

- le `-t [tag]` spécifie le nom (tag) de l'image à construire 

- le `.` spécifie que l'image sera construite depuis le dossier courant

##### Run de l'image du serveur dans un container

Commande à lancer pour démarrer un container : 

```bash
docker run -d -p 9090:80 api-apache-php-image
```

- `-d` permet de lancer le serveur en arrière plan
- `-p 9090:80` permet de mapper le port 9090 du host au port 80 du container
- `api-apache-php-image` correspond au tag/nom de l'image depuis laquelle on crée un container

Pour ouvrir un terminal à l'intérieur du container, il est possible d'utiliser la commande :

```bash
docker exec -it [nomDuContainer] /bin/bash
```

### Template du serveur HTTP

Le serveur web apache qui tourne dans le container affiche le contenu html présent dans le dossier `/var/www/html`. Son contenu se trouve dans un dossier nommé `site` au même niveau que le dockerfile que l'on copie.

Dans ce laboratoire, il était conseiller d'utiliser un template pour l'apparance de notre site web. Nous avons pris comme base un template de **Bootstrap** nommé **Agency**.

[Voici le lien vers le template](https://startbootstrap.com/theme/agency)

## 2 - Serveur HTTP dynamique avec express.js

### Récupération d'une image docker NodeJS 14.17.0

Un dockerfile avec une image Node.js officielle provenant de Docker Hub à été crée :

```dockerfile
FROM node:16.13
COPY src /opt/app
CMD ["node", "/opt/app/index.js"]
```

- La première ligne spécifie l'image à utiliser, l'image de node 16.13 (latest version)
- La deuxième ligne copie le contenu du dossier `src`  dans le dossier `/opt/app`
- La troisième ligne exécute la commande `node /opt/app/index.js` à l'intérieur du container, ce qui va lancer le script index.js au démarrage de ce dernier.

### Création d'un projet node.js dans src

L'initialisation d'un projet NodeJS peut se faire via la commande :

```bash
npm init
```

Puis installer la dépendance node.js *chance* avec :

```bash
npm install --save chance
```

Cela crée une entrée (une dependance) dans `package.json` ainsi qu'un dossier `node_modules` qui contiendra toutes les dépendances. Ce dossier ne doit pas être mis sur Github car il est assez lourd.

Il reste à créer un fichier index.js dans lequel il est possible d'écrire un simple programme qui affiche un nom aléatoire avec le module `chance` installé précédemment (ceci n'est qu'un test pour vérifier le bon fonctionnement) :

```javascript
var Chance = require('chance')
var chance = new Chance();

console.log("Bonjour " + chance.name());
```

Finalement, ce script peut être lancé avec la commande :

```sh
node index.js
```

Au moment de la connexion au serveur, cela va retourner : 

```
Bonjour  [nom au hasard]
```

Il faut maintenant tester l'exécution du script a l'intérieur du container, pour ce faire, il suffit de build et lancer l'image lié au NodeJs :

```sh
docker build -t api-express-js-image .
docker run -p 8080:3000 api-express-js-image
```

Ici on choisi le port 3000 alors que celui par défaut pour HTTP est 80 pour prouver qu'on est pas obligé de choisir 80 à chaque fois.

Cela va afficher le même résultat que l'étape précédente mais depuis le container.

### Application express avec Docker

Installer la dépendance `express.js` grâce à la commande :

```bash
npm install --save express
```

dans le fichier index.js il faut ajouter :

- Le serveur express.js :

```javascript
var express = require('express');
var app = express();
```

-  Les end-points `/`, `/zoo` et  `/zoo/animals` pour les requêtes GET :

```javascript
app.get('/zoo/animals', function(req, res){ res.send(displayZoo());});
app.get('/zoo', function(req, res){ res.send("Welcome to the zoo");});
app.get('/', function(req, res){ res.send("Salut");});

function displayZoo(){
	var nbAnimals = chance.integer({min: 1, max: 10});
	var city = chance.city();

	console.log("Number of animals in " + city + " zoo : " + nbAnimals);

	var animals=[];
	for(var i = 0; i < nbAnimals; ++i){
		animals.push({ animal: chance.animal({ type: 'zoo' }) });
	}
	console.log(animals);
	return animals;
}
```

Voici le rôle de chaque end-point :

`/` retourne le message *Salut*

`/zoo` retourne le message *Welcome to the zoo*

`/zoo/animals` retourne une liste d'animaux présent dans un zoo d'une ville (celle-ci choisi aléatoirement avec `chance.city()`)

- La fonction express qui va permettre au serveur d'écouter sur le port 3000 :

```javascript
app.listen(3000, function() {
    console.log("Accepting HTTP requests on port 3000.");
});
```

## 3 - Reverse proxy avec Apache (configuration statique)

L'utilisation du mode reverse proxy du serveur apache permet de n'avoir qu'un seul point d'entrée dans l'infrastructure lors des  requêtes HTTP. Dépendant les chemins fournis aux requêtes HTTP, le  reverse proxy va diriger la requête vers le serveur web approprié.

### Récupération des adresses IP des containers

Création de 2 containers : `express-dynamic` et `apache-static`, qui seront les deux serveurs atteignables via le reverse proxy :

```bash
$ docker run -d --name apache-static api-apache-php-image
$ docker run -d --name express-dynamic api-express-js-image
```

-`--name` permet de définir par nous même le nom de notre container

Il est possible d'obtenir leur adresse ip grâce à la commande `docker inspect` :

```bash
$ docker inspect apache-static | grep -i ipaddr
            "SecondaryIPAddresses": null,
            "IPAddress": "172.17.0.2",
                    "IPAddress": "172.17.0.2",
$ docker inspect express-dynamic | grep -i ipaddr
            "SecondaryIPAddresses": null,
            "IPAddress": "172.17.0.3",
                    "IPAddress": "172.17.0.3",
```

Le serveur statique `apache-static` tourne à l'adresse `172.17.0.2` sur le port `80`.

L'API dynamique `express-dynamic` tourne à l'adresse `172.17.0.3` sur le port `3000`.

*Note* : attention à ne pas refermer ces containers, sinon leur adresse IP ne sera plus la même (car Docker les alloue dynamiquement). Cela rend le système  fragile car il suffit que Docker décide d'allouer une adresse différente à l'un de serveur pour qu'il y ait des problèmes dans la configuration du reverse proxy. Donc il faut refaire cette manipulation pour être sur d'être sur les bon container pour un des paramétres du dockerfile.

### Création du dockerfile pour le reverse proxy

L'image du reverse proxy peut être créée a partir d'un dockerfile assez simple :

```
FROM php:7.2-apache

COPY conf/ /etc/apache2

RUN a2enmod proxy proxy_http
RUN a2ensite 000-* 001-*

```

Dans le même dossier que le dockerfile doit se trouver un dossier `conf` contenant les fichiers `.conf` de configuration du site par défaut et du reverse proxy  (qui sont expliquées au point suivant) . Ces fichiers seront copiés dans le dossier `/etc/apache2/` de l'image à sa création.

Le commandes activant les modules proxy sont ensuite exécutées avec la commande `a2enmod`, puis les deux sites sont activés sur le serveur avec la commande `a2ensite`.

### Configuration du reverse proxy sur Apache httpd

Dans le dossier `/etc/apache2/` du container se trouve toute la configuration du serveur apache. Dans ce dossier se trouvent plusieurs sous-dossiers :

- sites-available -> Contient la liste des configurations de sites disponibles pour le serveur
- sites-enabled -> Contient la liste des sites actuellement activés sur le serveur

Un site est représenté par un fichier `.conf` contenant une balise `<VirtualHost>`. Pour activer le mode reverse proxy il faut créer un fichier `.conf` et placer divers éléments dans la balise `<VirtualHost>` :

- ServerName `<nom>` -> Le nom de l'en-tête host devant être fournie dans les requêtes HTTP
- ProxyPass `<route>` `<to>` -> Lorsque le serveur reçoit la route `<route>` il redirige la requête vers l'adresse `<to>`
- ProxyPassReverse `<route>` `<to>` -> Même chose que pour ProxyPass mais dans l'autre sens

Il faut ensuite configurer le proxy dans `001-reverse-proxy.conf` de la façon suivante :

```xml
<VirtualHost *:80>
    ServerName demo.res.ch
    
    ProxyPass "/api/fun/" "http://172.17.0.3:3000/"
    ProxyPassReverse "/api/fun/" "http://172.17.0.3:3000/"
    
    ProxyPass "/" "http://172.17.0.2:80/"
    ProxyPassReverse "/" "http://172.17.0.2:80/"
</VirtualHost>
```

Dans ce fichier, il faut ajouter le nom du serveur qui servira à être reconnu par l'en-tête http `Host`.

Il faut ensuite configurer le champs `ProxyPass` et `ProxyPassReverse` qui serviront d'aiguillage vers les deux serveurs :

- Si la requête contient le préfixe `/zoo/animals/` elle sera redirigée vers le serveur `express-dynamic` à l'adresse `http://172.17.0.3:3000/`
  - Il sera alors possible de faire les requêtes `/zoo`  ou `/zoo/animals`.
- Si la requête contient le préfixe `/` elle sera redirigée vers le serveur `apache-static`  à l'adresse `http://172.17.0.2:80/`
  -  La page web `index.html` sera alors retournée par le serveur statique.

*Note* : pour le fichier `000-default.conf`, il suffit de laisser l'intérieur de VirtualHost vide (cela force le nom de domaine aux requêtes pour l'accès aux deux serveurs.

Ne pas oublier d'inclure les modules nécessaires pour que le serveur Apache puisse faire du reverse proxy, puis activer le site :

```
a2enmod proxy
a2enmod proxy_http
a2ensite <nomDuFichierSite>
service apache2 restart
```

Finalement, il faut faire en sorte que le browser utilise l'en-tête `Host: demo.api.ch` lors de l'accès au proxy. Pour cela il faut configurer le fichier hosts (`/etc/hosts` sur Linux et `C:\Windows\System32\drivers\etc\hosts` sur Windows) et y ajouter la ligne : `127.0.0.1 demo.api.ch`.

Les deux serveurs sont maintenant accessibles via l'adresse et le  port du proxy uniquement et peuvent être sélectionnés selon la route entrée dans la requête HTTP.

### Etat de l'infrastructure

Construction de l'image et du container du reverse-proxy :
```sh
docker build -t api-apache-rp-image .
docker run -d -p 8080:80 --name apache-rp api-apache-rp-image
```

L'infrastructure est maintenant composée de trois serveurs distincs :

- api-apache-static -> Serveur statique de l'étape 1 du laboratoire
- api-express-dynamic -> Serveur Node.js et express.js dnamique de l'étape 2 du laboratoire
- api-apache-rp -> Reverse proxy Apache configuré pour rediriger vers api-apache-static ou api/express-dynamic selon l'en-tête `Host:` des requêtes

Le seul container ayant besoin d'un mappage de ports est le reverse proxy car il est le seul point d'entrée vers les autres serveurs de  l'infrastructure.

### Le proxy comme seul point d'entrée

Dans cette nouvelle infrastructure, seul le proxy peut être utilisé  pour joindre les deux autres serveurs car il est le seul ayant un port  mappé sur la machine hôte. Il est donc impossible d'accéder au serveur statique ou dynamique depuis un réseau autre que celui de docker tant avec des requêtes manuelles que des requêtes via le navigateur.

Le proxy va rediriger les requêtes HTTP **à l'intérieur du réseau de la machine Docker** en fonction du champ `Host:` fourni dans l'en-tête. Cet en-tête `Host:` **doit** être `demo.api.ch` pour que le proxy retourne les bonnes représentations de ressources. Si le `Host:` n'est pas bon, la page retournée est une erreur 403 (Forbidden) car la  requête n'est pas envoyée sur le bon nom de site. Pour cette  infrastructure, un en-tête `/` redirige vers le site statique tandis que `/zoo/animals/` redirige vers le site express.js dynamique.

### Configuration pas optimale et fragile

Un gros soucis avec cette configuration Docker et ces trois serveurs est que le fichier de configuration dans le proxy possède des adresses  IP écrites en dur pour la redirection. Or, les serveurs statiques et  dynamiques peuvent ne pas avoir la même adresse IP car cela est défini  automatiquement par docker à la création du container.

Dans le cas ou les adresses IP ne sont pas les suivantes :

| Image du container  | Adresse IPv4        |
| ------------------- | ------------------- |
| api-apache-static   | 172.17.0.2          |
| api-express-dynamic | 172.17.0.3          |
| api-apache-rp       | N'importe laquelle  |

Le proxy va rediriger les requêtes vers la mauvais adresse IP et il y aura des erreurs.

Il faudrait pouvoir s'assurer que les adresses des deux serveurs web soient fixes pour éviter ce genre de problème.

## 4 - Requêtes AJAX avec JQuery

### Mise à jour des images

Pour mettre plus de manipulations à l'intérieur des containers, il  est pratique d'ajouter les commandes suivantes au Dockerfile qui vont  installer automatiquement l'outil `vim` pour effectuer des modifications sur les fichiers des containers.

```dockerfile
RUN apt-get update && apt-get install -y vim
```

Cela est utile pour éditer les fichiers et scripts directement depuis le container en cours. Cependant il est préférable de faire les changements en local car ceux fais dans le containers ne sont pas sauvegardés à la fermeture du container.

### Création d'un script JS et modification dynamique du DOM avec AJAX

L'objectif est de créer un script `javascript` qui va remplacer un champ du site statique par une réponse de l'API, périodiquement.

Pour cela, il faut commencer par créer un fichier `zoo.js` dans le dossier `site/js` du serveur statique. Ce fichier effectuera les requêtes `AJAX` vers le serveur dynamique.

```javascript
$(function() {
    console.log("Loading Zoo");

    function loadZoo() {
        $.getJSON( "/zoo/animals/zoo/animals", function( animals ) {
            console.log(animals);
            var message = "No animals here";
            if( animals.length > 0 ) {
                message = animals[0].animal;
            }
            $(".btn.btn-primary").text(message);
        });
    };

    loadZoo();
    setInterval( loadZoo, 1000 );
});
```

La fonction asynchrone `loadZoo()` effectue la requête `GET` grâce à $.getJSON(...). Ici, la requête demande un emoji `un animal` à l'API et remplacer le contenu de la balise de classe `btn.primary-btn` de la page HTML.

On fait un appel de la fonction puis on ajoute un appel périodique à la fonction toutes les secondes avec `setInterval( loadZoo, 1000 )`.

Le bon fonctionnement de la requête peut être observé depuis l'onglet network des devtools du navigateur web au chargement de la page `index.html`.


### Pourquoi la démo ne fonctionnerait pas sans reverse proxy

Pour des raisons de sécurité, un mécanisme nommé Cross-Origin Ressource Sharing (CORS) vérifie que les réponses de requêtes envoyées par le navigateur viennent toujours du même endroit. Par exemple, lorsque le navigateur demande la page `index.html` au serveur statique et que un script `JS` demande une ressource au serveur dynamique, le mécanisme CORS exige que la réponse du serveur dynamique vienne de la même origine que le serveur statique.

Le reverse proxy permet d'assurer ce mécanisme car toutes les requêtes passent par lui et les mises à jour dynamiques sur la page du serveur statique peuvent se faire sans problème.

## 5 - Configuration dynamique du reverse proxy

Le but de cette partie est de résoudre le problème concernant les adresses IP des containers `Apache` et `NodeJS` afin que le reverse proxy gère ces dernières de façon dynamique.

Pour ce faire, il est possible d'utiliser Docker Compose pour lancer toutes les images et créer un réseau dans lequel les images se  connaissent par leur nom d'hôte. Grâce à cela, le reverse proxy peut  utiliser les noms d'hôte des serveurs `Apache` et `NodeJS` dans sa configuration.

En effet, selon la documentation Docker, si plusieur containers se trouvent dans un même réseau **définit manuellement par l'utilisateur**, ils peuvent se contacter grâce à leur nom d'hôte qui est le nom du  container docker. Il n'y a donc plus besoin de conaître l'adresse IP exacte des serveurs, le `DNS` intégré à docker se chargera de traduire les noms d'hôte.

Il faut donc commencer par changer les adresses IP du `001-reverse-proxy.conf` par les noms des containers :

```xml
<?php
	$static_ip = getenv('STATIC_APP');
	$dynamic_ip = getenv('DYNAMIC_APP');
?>

<VirtualHost *:80>
    ServerName demo.api.ch

    ProxyPass '/zoo/animals/' 'http://<?php print "$dynamic_ip"?>/'
    ProxyPassReverse '/zoo/animals/' 'http://<?php print "$dynamic_ip"?>/'

    ProxyPass '/' 'http://<?php print "$static_ip"?>/'
    ProxyPassReverse '/' 'http://<?php print "$static_ip"?>/'
</VirtualHost> 
```

Ici le serveur back-end possède le nom `dynamic_ip` et le serveur front-end `static_ip`.

Au début nous avons suivi la vidéo pour la suite de l'implémentation mais lorsque qu'on lançais avec docker nous avions un message d'erreur à cause du fichier `apache2-foreground` qui nous indiquais que le fichier était introuvable. Nous avons donc opté pour une autre approche en utilisant `traefik`.

`Traefik`est un outil similaire à `Apache httpd` spécialisé dans le reverse proxy. C'est un outil plus récent bien documenté et facile à mettre en place dans un environnement Docker.

Une [image Docker](https://hub.docker.com/_/traefik) officielle est disponible sur Docker Hub, l'image utilisée est la plus récente.

Ici le serveur back-end possède le nom `node_express` et le serveur front-end `apache_php`.

Il suffit ensuite de créer un `user defined network` et de `run` les 3 serveurs sur ce même network avec l'option `--net [networkName]`.

Pour automatiser cette partie, Il est possible d'utiliser `docker-compose` pour lancer les 3 serveurs ainsi que le network (si inexistant) en même temps.

Il faut donc créer un ficheir `docker-compose.yml` dans lequel on place les containers à créer et le réseau dans lequel ils se trouveront :

```yml
version: "3.9"  # optional since v1.27.0
services:
  reverse-proxy:
        image: api-reverse-proxy-image:latest
        container_name: api-apache-rp
        ports:
            - "8080:80"
        networks:
            - api-net
    web:
        image: api-apache-php-image:latest
        container_name: api-apache-static
        networks:
            - api-net
    dynamic:
        image: api-express-image:latest
        container_name: express-dynamic
        networks:
            - api-net
networks:
    api-net:
```

Dans ce fichier docker-compose, 3 services sont créés. Ils correspondent aux 3 serveurs. Pour chaque service il faut spécifier le nom de l'image voulue, le nom du container (doit être le même que dans le fichier de configuration du reverse-proxy).

Pour lancer tous les containers, il suffit d'utiliser la commande suivante dans le dossier du fichier `docker-compose.yml ` :

```sh
docker compose up -d
```
Pour les fonctionnalités supplémentaires du laboratoire, nous continurons d'utiliser traefik.

## Load balancing - plusieurs noeuds de serveurs en même temps

### Modification du fichier docker-compose

En reprenant la configuration de la dernière étape avec le fichier docker-compose.yml, il est possibile d'adapter les options pour lancer un container Traefik et les deux containers des étapes précédentes (le serveur statique `Apache` et le serveur `NodeJS` dynamique).

Ci-dessous le fichier docker-compose.yaml contenant toute la configuration de l'infrastructure :

```yaml
version: "3.9"  # optional since v1.27.0
services:
  web:
    build: ../apache-php-image/
    expose: 
       - "80"
    labels:
       - "traefik.http.routers.web.rule=PathPrefix(`/`)"
  dynamic:
    build: ../express-image/
    expose:
      - "3000"
    labels:
      - "traefik.http.routers.dynamic.rule=PathPrefix(`/zoo/animals`)"
      - "traefik.http.middlewares.express-dynamic.stripprefix.prefixes=/zoo/animals/"
      - "traefik.http.routers.dynamic.middlewares=express-dynamic"
  reverse-proxy:
    image: traefik:v2.5
    command: --api.insecure=true --providers.docker --accesslog=true
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  portainer:
    image: portainer/portainer-ce:latest
    container_name: "portainer"
    command: -H unix:///var/run/docker.sock
    restart: always
    ports:
      - "8181:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:

```

Les labels définis pour chaque container sont importants car ils permettent de configurer le container afin qu'il soit accessible via le reverse proxy Traefik.

*Note* : Les containers n'ont plus de nom fixe car il sera possible d'en générer plusieurs identiques pour tester le load balancing.


#### Configuration de l'image portainer

Pour plus d'informations concernant `Portainer`, voir la section Management UI.

#### Configuration de l'image api-apache-php

- `PathPrefix('/')` définit le nom d'hôte à emprunter pour accéder à ce container via le reverse proxy `Traefik`. Dans ce cas, il suffit d'entrer le nom d'hôte `demo.api.ch` pour accéder au serveur `Apache` statique

#### Configuration de l'image express

- `PathPrefix('/zoo/animals')` même explication que juste avant pour api-apache-php `Express` dynamic
- `prefixes` on ajuste la requête avec cette instruction pour éviter de reécrire `zoo/animals`
- `middlewares` permet d'ajuster la requête faite au serveur

### Lancement de plusieurs noeuds de serveurs

A cet instant, la configuration de `Traefik`est au même stade que la configuration précédente avec `Apache httpd`.

Pour lancer plusieurs serveurs il est mainentant possible d'utiliser la commande `docker compose up` en spécifiant le nombre d'unités d'un serveur. Par exemple, pour lancer 5 serveur statiques et 5 dynamiques il suffit d'entrer la commande :

```sh
docker compose up --scale web=5 --scale dynamic=5
```

## Load balancing - Round-robin vs sticky sessions

### Round-robin

Selon la [documentation](https://doc.traefik.io/traefik/routing/services/) de `Traefik` (voir load-balancing), seul round-robin est gérer. Il ne faut donc faire aucune manipulation supplémentaire pour l'activer.

### Sticky sessions

Il faut ajouter deux ligne dans le fichier docker-compose.yml pour le serveur statique:

```yaml
version: "3.9"  # optional since v1.27.0
services:
  web:
    build: ../apache-php-image/
    expose: 
       - "80"
    labels:
       - "traefik.http.routers.web.rule=PathPrefix(`/`)"
       - "traefik.http.services.web-static-service.loadBalancer.sticky.cookie=true"
       - "traefik.http.services.web-static-service.loadBalancer.sticky.cookie.name=web_static_cookie_name"

  dynamic:
    build: ../express-image/
    expose:
      - "3000"
    labels:
      - "traefik.http.routers.dynamic.rule=PathPrefix(`/zoo/animals`)"
      - "traefik.http.middlewares.express-dynamic.stripprefix.prefixes=/zoo/animals/"
      - "traefik.http.routers.dynamic.middlewares=express-dynamic"
  reverse-proxy:
    image: traefik:v2.5
    command: --api.insecure=true --providers.docker --accesslog=true
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  portainer:
    image: portainer/portainer-ce:latest
    container_name: "portainer"
    command: -H unix:///var/run/docker.sock
    restart: always
    ports:
      - "8181:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:

```
Si plusieurs requêtes sont maintenant faites depuis un navigateur, l'adresse IP du serveur ne change plus. Cela est rendu possible grâce aux sticky sessions configurées dans le fichier `docker-compose` pour chaque serveur.

Il est possible de voir le cookie de session avec les outils de développement dans le navigateur. Le cookie possède l'adresse IP du container associé à l'échange avec le client.

## Dynamic cluster management

Grâce au reverse proxy `Traefik`, dès qu'un container est crée ou supprimé, le load balancing s'adapte automatiquement.

## Management UI

Afin de faciliter la manipulation des containers Docker, une interface est accessible à l'adresse `http://localhost:8181`. Cette interface est un container Portainer, un outil permettant la gestion des containers Docker locaux. Il est possible d'en arrêter ou d'en démarrer et de visualiser l'état actuel de l'infrastructure.

Le container est configuré dans le fichier `docker-compose.yml` :

```yaml
 portainer:
    image: portainer/portainer-ce:latest
    container_name: "portainer"
    command: -H unix:///var/run/docker.sock
    restart: always
    ports:
      - "8181:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
```

Portainer possède une interface accessible via le port 8181 (le dashboard).

