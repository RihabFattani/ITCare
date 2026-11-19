# ITCare - Deploiement gratuit sur une VM Oracle Cloud (Always Free)

Resultat : un lien public (`http://IP-DE-LA-VM`) ou l'application fonctionne comme en local (base MySQL, fichiers uploades conserves, pas de mise en veille).

Architecture : 3 conteneurs Docker (`docker-compose.yml`) : `db` (MySQL 8), `back` (Spring Boot, port 8081 interne), `front` (Nginx : sert Angular et relaie `/api` vers le backend, port 80 public).

## 1. Pousser le projet sur GitHub
Le depot existe deja (`origin`). Les fichiers ajoutes : `docker-compose.yml`, `.env.example`, `back/Dockerfile`, `front/Dockerfile`, `front/nginx.conf`, `.dockerignore`. Ne jamais commiter `.env`.

## 2. Creer la VM Oracle
1. Creer un compte sur https://www.oracle.com/cloud/free/ (carte bancaire pour verification, rien n'est debite en Always Free). Choisir la region la plus proche.
2. Menu **Compute > Instances > Create instance** :
   - Image : **Ubuntu 22.04**.
   - Shape : **VM.Standard.A1.Flex (Ampere ARM)**, 2 OCPU et 12 Go de RAM (reste dans l'offre gratuite). Si "Out of capacity" : reessayer plus tard ou changer de domaine de disponibilite.
   - Reseau : garder **Assign a public IPv4 address**.
   - Cles SSH : telecharger la cle privee proposee (la garder).
3. Ouvrir le port 80 : **Networking > Virtual Cloud Networks > votre VCN > Security Lists > Default > Add Ingress Rules** : Source CIDR `0.0.0.0/0`, protocole TCP, port de destination `80` (ajouter aussi `443` pour HTTPS plus tard).

## 3. Preparer la VM (en SSH)
```bash
ssh -i cle.key ubuntu@IP-DE-LA-VM

# Pare-feu de la VM (les images Oracle bloquent les ports par defaut)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && newgrp docker
```

## 4. Recuperer et configurer le projet
```bash
git clone https://github.com/RihabFattani/ITCare.git
cd ITCare
cp .env.example .env
nano .env
```
A renseigner dans `.env` :
- `DB_PASSWORD` : un mot de passe MySQL (non vide).
- `JWT_SECRET` : 32 caracteres minimum (`openssl rand -hex 32`).
- `PUBLIC_URL` : `http://IP-DE-LA-VM` (sans `/` final).
- `MAIL_USERNAME` / `MAIL_PASSWORD` : compte SMTP et mot de passe d'application (sans espaces) pour les e-mails.

## 5. Lancer
```bash
docker compose up -d --build
docker compose ps          # db, back, front doivent etre "Up"
docker compose logs -f back
```
Attendre `Started ItcareApplication` (1 a 2 minutes), puis ouvrir `http://IP-DE-LA-VM` : c'est le lien a donner a l'enseignante.

## 6. Securite avant de partager
- Comptes de demo crees par `DataLoader` : `admin@itcare.tn / Admin123!`, `collab1@itcare.tn` et `collab2@itcare.tn / Collab123!`. Pour une demonstration c'est pratique (donner ces identifiants a l'enseignante) ; sinon changer les mots de passe.
- Ne jamais mettre de mot de passe ou de `.env` sur GitHub.

## 7. Commandes utiles
```bash
docker compose logs -f back      # journaux du backend
docker compose restart back      # redemarrer le backend
git pull && docker compose up -d --build   # mettre a jour apres un changement
docker compose down              # arreter (les donnees restent dans les volumes)
```
Les donnees MySQL et les fichiers uploades sont dans les volumes Docker `db_data` et `uploads` : ils survivent aux redemarrages.

## 8. HTTPS (optionnel)
Pour un lien en `https://`, creer un sous-domaine gratuit sur https://www.duckdns.org vers l'IP de la VM, puis placer Caddy devant le conteneur `front` (certificat Let's Encrypt automatique) et mettre `PUBLIC_URL=https://monsite.duckdns.org`.
