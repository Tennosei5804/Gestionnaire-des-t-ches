const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('./database');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'votre_cle_secrete_changez_moi';

// Configuration email (Gmail exemple)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'votre.email@gmail.com', // Changez avec votre email
    pass: 'votre_mot_de_passe_app' // Mot de passe d'application Gmail
  }
});

// Fonction pour envoyer un email
async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: '"Gestionnaire de Tâches" <votre.email@gmail.com>',
      to,
      subject,
      html
    });
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
}

app.use(cors());
app.use(bodyParser.json());

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalide' });
    req.user = user;
    next();
  });
};

// Routes d'authentification
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run('INSERT INTO users (username, password, grade) VALUES (?, ?, ?)',
    [username, hashedPassword, 'user'],
    async function(err) {
      if (err) return res.status(400).json({ error: 'Utilisateur existe déjà' });
      
      res.json({ 
        id: this.lastID, 
        username,
        grade: 'user'
      });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Utilisateur non trouvé' });
    
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: 'Mot de passe incorrect' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, grade: user.grade }, SECRET_KEY);
    res.json({ token, user: { id: user.id, username: user.username, grade: user.grade } });
  });
});

// Routes utilisateurs
app.get('/api/users', authenticateToken, (req, res) => {
  db.all('SELECT id, username, grade FROM users', [], (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users);
  });
});

// Route admin pour changer le grade d'un utilisateur
app.put('/api/admin/users/:id/grade', authenticateToken, async (req, res) => {
  if (req.user.grade !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé. Admin uniquement.' });
  }

  const { grade } = req.body;
  const userId = req.params.id;

  db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    db.run('UPDATE users SET grade = ? WHERE id = ?', [grade, userId], async (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Notification Discord si l'utilisateur a lié son compte
      if (user.discord_id) {
        await sendDiscordNotification(user.discord_id, 
          `🎖️ **Changement de grade**\n\n` +
          `Bonjour ${user.username},\n` +
          `Votre grade a été modifié en: **${grade}**\n` +
          `Ce changement a été effectué par un administrateur.`
        );
      }

      res.json({ success: true, userId, newGrade: grade });
    });
  });
});

// Route admin pour supprimer un utilisateur
app.delete('/api/admin/users/:id', authenticateToken, (req, res) => {
  if (req.user.grade !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé. Admin uniquement.' });
  }

  const userId = req.params.id;
  
  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Routes pour les grades personnalisés
app.get('/api/grades', authenticateToken, (req, res) => {
  db.all('SELECT * FROM custom_grades', [], (err, grades) => {
    if (err) return res.status(500).json({ error: err.message });
    // Ajouter les grades par défaut
    const defaultGrades = ['admin', 'manager', 'user'];
    const allGrades = [...defaultGrades, ...grades.map(g => g.name)];
    res.json(allGrades);
  });
});

app.post('/api/admin/grades', authenticateToken, (req, res) => {
  if (req.user.grade !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé. Admin uniquement.' });
  }

  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Le nom du grade est requis' });
  }

  db.run('INSERT INTO custom_grades (name) VALUES (?)', [name.toLowerCase()], function(err) {
    if (err) return res.status(400).json({ error: 'Ce grade existe déjà' });
    res.json({ id: this.lastID, name: name.toLowerCase() });
  });
});

// Routes catégories
app.get('/api/categories', authenticateToken, (req, res) => {
  const userGrade = req.user.grade;
  
  db.all('SELECT * FROM categories', [], (err, categories) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const filtered = categories.filter(cat => {
      const visibleGrades = cat.visible_to.split(',');
      return visibleGrades.includes(userGrade) || visibleGrades.includes('all');
    });
    
    res.json(filtered);
  });
});

app.post('/api/categories', authenticateToken, (req, res) => {
  const { name, color, visible_to, image } = req.body;
  
  db.run('INSERT INTO categories (name, color, image, visible_to, created_by) VALUES (?, ?, ?, ?, ?)',
    [name, color, image, visible_to, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, color, image, visible_to });
    }
  );
});

app.delete('/api/categories/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM categories WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Routes tâches
app.get('/api/tasks', authenticateToken, (req, res) => {
  const userGrade = req.user.grade;
  
  db.all(`SELECT tasks.*, users.username as assigned_username, categories.name as category_name
          FROM tasks 
          LEFT JOIN users ON tasks.assigned_to = users.id
          LEFT JOIN categories ON tasks.category_id = categories.id`,
    [], (err, tasks) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const filtered = tasks.filter(task => {
        const visibleGrades = task.visible_to.split(',');
        return visibleGrades.includes(userGrade) || visibleGrades.includes('all');
      });
      
      res.json(filtered);
    }
  );
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  const { title, description, category_id, assigned_to, status, color, image, start_date, due_date, visible_to } = req.body;
  
  db.run(`INSERT INTO tasks (title, description, category_id, assigned_to, status, color, image, start_date, due_date, visible_to, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, category_id, assigned_to, status || 'todo', color, image, start_date, due_date, visible_to, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, title, status });
    }
  );
});

app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  // Vérifier les permissions
  if (req.user.grade !== 'admin' && req.user.grade !== 'manager') {
    return res.status(403).json({ error: 'Seuls les admins et managers peuvent modifier les tâches' });
  }

  const { title, description, assigned_to, status, color, image, start_date, due_date } = req.body;
  
  db.run(`UPDATE tasks SET title = ?, description = ?, assigned_to = ?, status = ?, color = ?, image = ?, start_date = ?, due_date = ?
          WHERE id = ?`,
    [title, description, assigned_to, status, color, image, start_date, due_date, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  // Vérifier les permissions
  if (req.user.grade !== 'admin' && req.user.grade !== 'manager') {
    return res.status(403).json({ error: 'Seuls les admins et managers peuvent supprimer les tâches' });
  }

  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});


// Routes commentaires
app.get('/api/tasks/:taskId/comments', authenticateToken, (req, res) => {
  db.all(`SELECT comments.*, users.username 
          FROM comments 
          LEFT JOIN users ON comments.user_id = users.id
          WHERE task_id = ?
          ORDER BY created_at DESC`,
    [req.params.taskId],
    (err, comments) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(comments);
    }
  );
});

app.post('/api/tasks/:taskId/comments', authenticateToken, (req, res) => {
  const { comment } = req.body;
  const taskId = req.params.taskId;
  
  if (!comment || comment.trim() === '') {
    return res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });
  }
  
  db.run('INSERT INTO comments (task_id, user_id, comment) VALUES (?, ?, ?)',
    [taskId, req.user.id, comment],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Récupérer le commentaire créé avec le nom d'utilisateur
      db.get(`SELECT comments.*, users.username 
              FROM comments 
              LEFT JOIN users ON comments.user_id = users.id
              WHERE comments.id = ?`,
        [this.lastID],
        (err, newComment) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(newComment);
        }
      );
    }
  );
});

app.delete('/api/comments/:id', authenticateToken, (req, res) => {
  const commentId = req.params.id;
  
  // Vérifier que l'utilisateur est le propriétaire du commentaire ou admin
  db.get('SELECT * FROM comments WHERE id = ?', [commentId], (err, comment) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!comment) return res.status(404).json({ error: 'Commentaire non trouvé' });
    
    if (comment.user_id !== req.user.id && req.user.grade !== 'admin') {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres commentaires' });
    }
    
    db.run('DELETE FROM comments WHERE id = ?', [commentId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});


// Routes pour les statuts personnalisés
app.get('/api/statuses', authenticateToken, (req, res) => {
  db.all('SELECT * FROM custom_statuses', [], (err, statuses) => {
    if (err) return res.status(500).json({ error: err.message });
    // Ajouter les statuts par défaut
    const defaultStatuses = [
      { name: 'a_faire', emoji: '📋', color: '#3498db' },
      { name: 'en_cours', emoji: '⚙️', color: '#f39c12' },
      { name: 'termine', emoji: '✅', color: '#2ecc71' },
      { name: 'bloque', emoji: '🚫', color: '#e74c3c' }
    ];
    const allStatuses = [...defaultStatuses, ...statuses];
    res.json(allStatuses);
  });
});

app.post('/api/admin/statuses', authenticateToken, (req, res) => {
  if (req.user.grade !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé. Admin uniquement.' });
  }

  const { name, emoji, color } = req.body;
  
  if (!name || !emoji) {
    return res.status(400).json({ error: 'Le nom et l\'emoji sont requis' });
  }

  db.run('INSERT INTO custom_statuses (name, emoji, color) VALUES (?, ?, ?)', 
    [name.toLowerCase().replace(/\s+/g, '_'), emoji, color || '#3498db'], 
    function(err) {
      if (err) return res.status(400).json({ error: 'Ce statut existe déjà' });
      res.json({ id: this.lastID, name: name.toLowerCase().replace(/\s+/g, '_'), emoji, color });
    }
  );
});

// Route pour lier Discord
app.put('/api/user/discord', authenticateToken, (req, res) => {
  const { discord_id } = req.body;
  
  if (!discord_id || discord_id.trim() === '') {
    return res.status(400).json({ error: 'L\'ID Discord est requis' });
  }

  db.run('UPDATE users SET discord_id = ? WHERE id = ?', [discord_id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, discord_id });
  });
});

// Route pour délier Discord
app.delete('/api/user/discord', authenticateToken, (req, res) => {
  db.run('UPDATE users SET discord_id = NULL WHERE id = ?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Route pour obtenir les infos utilisateur avec Discord
app.get('/api/user/me', authenticateToken, (req, res) => {
  db.get('SELECT id, username, grade, discord_id FROM users WHERE id = ?', 
    [req.user.id], 
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(user);
    }
  );
});

// Webhook Discord pour envoyer des notifications
const axios = require('axios');

async function sendDiscordNotification(discordId, message) {
  // Cette fonction sera appelée par votre bot Discord
  // Le bot doit écouter sur un endpoint et envoyer des DM
  try {
    // Vous devrez configurer votre bot Discord pour écouter cet endpoint
    const response = await axios.post('http://localhost:3001/send-dm', {
      userId: discordId,
      message: message
    });
    return response.data;
  } catch (error) {
    console.error('Erreur envoi Discord:', error.message);
    return null;
  }
}

// Modifier la route de création de tâche pour envoyer une notification Discord
const originalTaskPost = app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { title, description, category_id, assigned_to, status, color, image, start_date, due_date, visible_to } = req.body;
  
  db.run(`INSERT INTO tasks (title, description, category_id, assigned_to, status, color, image, start_date, due_date, visible_to, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, category_id, assigned_to, status || 'todo', color, image, start_date, due_date, visible_to, req.user.id],
    async function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Envoyer notification Discord si assigné
      if (assigned_to) {
        db.get('SELECT discord_id, username FROM users WHERE id = ?', [assigned_to], async (err, user) => {
          if (!err && user && user.discord_id) {
            await sendDiscordNotification(user.discord_id, 
              `🎯 **Nouvelle tâche assignée!**\n\n` +
              `**Titre:** ${title}\n` +
              `**Description:** ${description || 'Aucune description'}\n` +
              `**Statut:** ${status || 'todo'}\n` +
              `${due_date ? `**Échéance:** ${due_date}` : ''}`
            );
          }
        });
      }
      
      res.json({ id: this.lastID, title, status });
    }
  );
});


// Route admin pour modifier le profil d'un utilisateur
app.put('/api/admin/users/:id/profile', authenticateToken, (req, res) => {
  if (req.user.grade !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé. Admin uniquement.' });
  }

  const { username, password } = req.body;
  const userId = req.params.id;

  if (!username) {
    return res.status(400).json({ error: 'Le pseudo est requis' });
  }

  // Si un nouveau mot de passe est fourni, le hasher
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run('UPDATE users SET username = ?, password = ? WHERE id = ?', 
      [username, hashedPassword, userId], 
      (err) => {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Ce pseudo est déjà utilisé' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, userId, username });
      }
    );
  } else {
    // Mise à jour sans changer le mot de passe
    db.run('UPDATE users SET username = ? WHERE id = ?', 
      [username, userId], 
      (err) => {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Ce pseudo est déjà utilisé' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, userId, username });
      }
    );
  }
});
