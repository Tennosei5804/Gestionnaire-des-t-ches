# 🎯 Gestionnaire de Tâches - Style Trello

Application web complète de gestion de tâches avec système d'authentification, catégories, et permissions par grade.

## ✨ Fonctionnalités

- **Authentification** : Système de connexion/inscription avec grades (Admin, Manager, User)
- **Catégories** : Créer des colonnes personnalisées avec couleurs
- **Tâches** : Créer, modifier, supprimer des tâches
- **États** : À faire, En cours, Terminé, Bloqué
- **Assignation** : Assigner des tâches à des utilisateurs
- **Permissions** : Contrôler la visibilité par grade
- **Couleurs** : Personnaliser les couleurs des catégories et tâches
- **Base de données** : SQLite pour la persistance

## ✨ Nouvelles Fonctionnalités

- **Panel Admin** : Les admins peuvent gérer les utilisateurs et changer leurs grades
- **Système d'email** : Emails de bienvenue et notifications de changement de grade
- **Validation email** : Adresse email requise lors de l'inscription

## 🚀 Installation

### Backend

```bash
cd backend
npm install
npm start
```

Le serveur démarre sur http://localhost:3000

### Frontend

Ouvrez simplement `frontend/index.html` dans votre navigateur, ou utilisez un serveur local :

```bash
cd frontend
# Avec Python
python -m http.server 8000

# Avec Node.js
npx http-server -p 8000
```

Puis accédez à http://localhost:8000

## 👤 Compte par défaut

- **Utilisateur** : admin
- **Email** : admin@example.com
- **Mot de passe** : admin123
- **Grade** : Admin

## 📧 Configuration Email

Pour activer l'envoi d'emails, consultez le fichier `backend/EMAIL_CONFIG.md` pour les instructions détaillées.

Par défaut, l'application fonctionne sans configuration email (les emails ne seront simplement pas envoyés).

## 📋 Utilisation

1. **Connexion** : Connectez-vous avec le compte admin ou créez un nouveau compte (email requis)
2. **Panel Admin** : Si vous êtes admin, cliquez sur "👑 Panel Admin" pour gérer les utilisateurs
3. **Créer une catégorie** : Cliquez sur "Nouvelle Catégorie", choisissez un nom, une couleur et les grades autorisés
4. **Créer une tâche** : Cliquez sur "Nouvelle Tâche", remplissez les informations et assignez-la
5. **Modifier une tâche** : Cliquez sur une tâche pour la modifier
6. **Changer l'état** : Modifiez le statut d'une tâche (À faire, En cours, Terminé, Bloqué)
7. **Gérer les grades** : Les admins peuvent changer le grade de n'importe quel utilisateur

## 🔐 Grades et Permissions

- **Admin** : Accès complet à toutes les fonctionnalités
- **Manager** : Peut gérer les tâches et voir celles assignées aux managers
- **User** : Peut voir et modifier ses propres tâches

Les catégories et tâches peuvent être configurées pour être visibles par certains grades uniquement.

## 🛠️ Technologies

- **Frontend** : HTML, CSS, JavaScript vanilla
- **Backend** : Node.js, Express
- **Base de données** : SQLite
- **Authentification** : JWT, bcrypt
- **API** : REST

## 📁 Structure

```
project/
├── backend/
│   ├── server.js       # Serveur Express et routes API
│   ├── database.js     # Configuration SQLite
│   └── package.json    # Dépendances backend
├── frontend/
│   ├── index.html      # Interface principale
│   ├── styles.css      # Styles
│   ├── app.js          # Logique de l'application
│   └── auth.js         # Gestion de l'authentification
└── README.md
```

## 🔧 Configuration

Pour changer la clé secrète JWT, modifiez `SECRET_KEY` dans `backend/server.js`.

## 📝 Notes

- La base de données `tasks.db` est créée automatiquement au premier lancement
- Les mots de passe sont hashés avec bcrypt
- Les tokens JWT expirent après la session
