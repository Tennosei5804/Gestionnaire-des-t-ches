# Configuration Email

## Configuration Gmail (Recommandé)

1. **Activez la validation en 2 étapes** sur votre compte Google
   - Allez sur https://myaccount.google.com/security
   - Activez la validation en 2 étapes

2. **Générez un mot de passe d'application**
   - Allez sur https://myaccount.google.com/apppasswords
   - Sélectionnez "Autre (nom personnalisé)"
   - Nommez-le "Gestionnaire de Tâches"
   - Copiez le mot de passe généré (16 caractères)

3. **Modifiez server.js**
   - Ligne 13: Remplacez `votre.email@gmail.com` par votre email Gmail
   - Ligne 14: Remplacez `votre_mot_de_passe_app` par le mot de passe d'application
   - Ligne 21: Remplacez aussi l'email dans le champ `from`

## Autres services email

### Outlook/Hotmail
```javascript
const transporter = nodemailer.createTransport({
  service: 'hotmail',
  auth: {
    user: 'votre.email@outlook.com',
    pass: 'votre_mot_de_passe'
  }
});
```

### Yahoo
```javascript
const transporter = nodemailer.createTransport({
  service: 'yahoo',
  auth: {
    user: 'votre.email@yahoo.com',
    pass: 'votre_mot_de_passe_app'
  }
});
```

### SMTP personnalisé
```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: 'votre.email@example.com',
    pass: 'votre_mot_de_passe'
  }
});
```

## Test de l'envoi d'email

Les emails sont envoyés automatiquement lors de:
- Création d'un nouveau compte (email de bienvenue)
- Changement de grade par un admin (notification)

Si l'envoi échoue, l'application continue de fonctionner normalement.
