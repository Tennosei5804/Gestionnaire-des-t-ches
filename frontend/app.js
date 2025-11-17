let categories = [];
let tasks = [];
let users = [];
let allGrades = [];

async function loadBoard() {
    await loadUsers();
    await loadGrades();
    await loadStatuses();
    await loadCategories();
    await loadTasks();
    renderBoard();
}

async function loadGrades() {
    const response = await fetch(`${API_URL}/grades`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    allGrades = await response.json();
}

async function loadUsers() {
    const response = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    users = await response.json();
}

async function loadCategories() {
    const response = await fetch(`${API_URL}/categories`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    categories = await response.json();
}

async function loadTasks() {
    const response = await fetch(`${API_URL}/tasks`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    tasks = await response.json();
}

function renderBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';

    categories.forEach(category => {
        const categoryTasks = tasks.filter(t => t.category_id === category.id);
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        
        const categoryHeaderContent = category.image 
            ? `<div class="category-header-with-image">
                   <img src="${category.image}" class="category-header-image" alt="${category.name}">
                   <span>${category.name}</span>
               </div>`
            : `<span>${category.name}</span>`;
        
        categoryDiv.innerHTML = `
            <div class="category-header" style="background-color: ${category.color}">
                ${categoryHeaderContent}
                <button onclick="deleteCategory(${category.id})">🗑️</button>
            </div>
            <div class="tasks" id="tasks-${category.id}">
                ${categoryTasks.map(task => {
                    const dateStatus = getDateStatus(task.due_date);
                    const daysUntil = getDaysUntilDue(task.due_date);
                    const creator = users.find(u => u.id === task.created_by);
                    
                    return `
                    <div class="task" style="border-left-color: ${task.color}" onclick="editTask(${task.id})">
                        ${task.image ? `<img src="${task.image}" class="task-image" alt="${task.title}">` : ''}
                        <div class="task-header-row">
                            <div class="task-title">${task.title}</div>
                            ${creator ? `<div class="task-creator" title="Créé par ${creator.username}">👤 ${creator.username}</div>` : ''}
                        </div>
                        <div class="task-description">${task.description || ''}</div>
                        
                        ${(task.start_date || task.due_date) ? `
                            <div class="task-dates">
                                ${task.start_date ? `
                                    <div class="task-date-item">
                                        📅 Début: ${formatDate(task.start_date)}
                                    </div>
                                ` : ''}
                                ${task.due_date ? `
                                    <div class="task-date-item ${dateStatus || ''}">
                                        ⏰ Échéance: ${formatDate(task.due_date)}
                                        ${daysUntil !== null ? `(${daysUntil === 0 ? "Aujourd'hui" : daysUntil > 0 ? `dans ${daysUntil}j` : `en retard de ${Math.abs(daysUntil)}j`})` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        ${dateStatus ? `
                            <div class="date-badge ${dateStatus}">
                                ${dateStatus === 'overdue' ? '🚨 En retard' : dateStatus === 'today' ? '⚡ Aujourd\'hui' : '📌 Bientôt'}
                            </div>
                        ` : ''}
                        
                        <div class="task-meta">
                            <div class="task-meta-left">
                                <span class="task-status status-${task.status}">${getStatusLabel(task.status)}</span>
                                ${(currentUser.grade === 'admin' || currentUser.grade === 'manager') ? 
                                    `<button class="task-delete" onclick="event.stopPropagation(); deleteTask(${task.id})">Supprimer</button>` : 
                                    ''}
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
        board.appendChild(categoryDiv);
    });
}

function getStatusLabel(status) {
    const labels = {
        'a_faire': 'À faire',
        'en_cours': 'En cours',
        'termine': 'Terminé',
        'bloque': 'Bloqué',
        'todo': 'À faire',
        'in_progress': 'En cours',
        'done': 'Terminé',
        'blocked': 'Bloqué'
    };
    return labels[status] || status.replace(/_/g, ' ');
}

// Gestion des modals
function showCategoryModal() {
    document.getElementById('category-modal').style.display = 'block';
}

function closeCategoryModal() {
    document.getElementById('category-modal').style.display = 'none';
    document.getElementById('category-name').value = '';
    document.getElementById('category-image').value = '';
    document.getElementById('category-preview').innerHTML = '';
    document.getElementById('category-preview').classList.remove('active');
}

function showTaskModal() {
    document.getElementById('task-modal-title').textContent = 'Nouvelle Tâche';
    document.getElementById('task-id').value = '';
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-color').value = '#ffffff';
    document.getElementById('task-start-date').value = '';
    document.getElementById('task-due-date').value = '';
    document.getElementById('task-image').value = '';
    document.getElementById('task-preview').innerHTML = '';
    document.getElementById('task-preview').classList.remove('active');
    
    // Masquer la section commentaires pour les nouvelles tâches
    document.getElementById('comments-section').style.display = 'none';
    
    // Réinitialiser la visibilité
    setSelectedVisibility('task-visibility', 'all');
    
    // Remplir les sélecteurs
    const categorySelect = document.getElementById('task-category');
    categorySelect.innerHTML = '<option value="">Sélectionner une catégorie</option>' +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    const assignedSelect = document.getElementById('task-assigned');
    assignedSelect.innerHTML = '<option value="">Non assigné</option>' +
        users.map(u => `<option value="${u.id}">${u.username} (${u.grade})</option>`).join('');
    
    // Remplir le sélecteur de statuts
    const statusSelect = document.getElementById('task-status');
    statusSelect.innerHTML = allStatuses.map(s => 
        `<option value="${s.name}">${s.emoji} ${getStatusLabel(s.name)}</option>`
    ).join('');
    statusSelect.value = 'a_faire';
    
    document.getElementById('task-modal').style.display = 'block';
}

function closeTaskModal() {
    document.getElementById('task-modal').style.display = 'none';
}

async function createCategory() {
    const name = document.getElementById('category-name').value;
    const color = document.getElementById('category-color').value;
    const visible_to = getSelectedVisibility('category-visibility');
    const imageInput = document.getElementById('category-image');

    if (!name) {
        alert('Veuillez entrer un nom de catégorie');
        return;
    }

    let imageData = null;
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        imageData = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(imageInput.files[0]);
        });
    }

    await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ name, color, visible_to, image: imageData })
    });

    closeCategoryModal();
    loadBoard();
}

async function deleteCategory(id) {
    if (!confirm('Supprimer cette catégorie et toutes ses tâches?')) return;

    await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
    });

    loadBoard();
}

async function saveTask() {
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const category_id = document.getElementById('task-category').value;
    const assigned_to = document.getElementById('task-assigned').value || null;
    const status = document.getElementById('task-status').value;
    const color = document.getElementById('task-color').value;
    const start_date = document.getElementById('task-start-date').value || null;
    const due_date = document.getElementById('task-due-date').value || null;
    const visible_to = getSelectedVisibility('task-visibility');
    const imageInput = document.getElementById('task-image');

    if (!title || !category_id) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }

    let imageData = null;
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        imageData = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(imageInput.files[0]);
        });
    }

    const taskData = { title, description, category_id, assigned_to, status, color, start_date, due_date, visible_to, image: imageData };

    if (id) {
        await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(taskData)
        });
    } else {
        await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(taskData)
        });
    }

    closeTaskModal();
    loadBoard();
    if (currentView === 'calendar') {
        renderCalendar();
    }
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Vérifier les permissions
    if (currentUser.grade !== 'admin' && currentUser.grade !== 'manager') {
        alert('Seuls les admins et managers peuvent modifier les tâches.');
        return;
    }

    document.getElementById('task-modal-title').textContent = 'Modifier la Tâche';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-color').value = task.color;
    document.getElementById('task-start-date').value = task.start_date || '';
    document.getElementById('task-due-date').value = task.due_date || '';

    const categorySelect = document.getElementById('task-category');
    categorySelect.innerHTML = categories.map(c => 
        `<option value="${c.id}" ${c.id === task.category_id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    const assignedSelect = document.getElementById('task-assigned');
    assignedSelect.innerHTML = '<option value="">Non assigné</option>' +
        users.map(u => 
            `<option value="${u.id}" ${u.id === task.assigned_to ? 'selected' : ''}>${u.username} (${u.grade})</option>`
        ).join('');

    // Remplir le sélecteur de statuts
    const statusSelect = document.getElementById('task-status');
    statusSelect.innerHTML = allStatuses.map(s => 
        `<option value="${s.name}" ${s.name === task.status ? 'selected' : ''}>${s.emoji} ${getStatusLabel(s.name)}</option>`
    ).join('');

    // Définir la visibilité
    setSelectedVisibility('task-visibility', task.visible_to);
    
    // Afficher l'image si elle existe
    if (task.image) {
        document.getElementById('task-preview').innerHTML = `
            <img src="${task.image}" alt="Task image">
            <button type="button" class="image-preview-remove" onclick="removeImage('task-image', 'task-preview')">
                🗑️ Supprimer l'image
            </button>
        `;
        document.getElementById('task-preview').classList.add('active');
    }
    
    // Afficher la section commentaires et charger les commentaires
    document.getElementById('comments-section').style.display = 'block';
    document.getElementById('comment-input').value = '';
    loadComments(task.id);

    document.getElementById('task-modal').style.display = 'block';
}

async function deleteTask(id) {
    // Vérifier les permissions
    if (currentUser.grade !== 'admin' && currentUser.grade !== 'manager') {
        alert('Seuls les admins et managers peuvent supprimer les tâches.');
        return;
    }

    if (!confirm('Supprimer cette tâche?')) return;

    await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
    });

    loadBoard();
}

// Fermer les modals en cliquant à l'extérieur
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}


// Panel Admin
async function showAdminPanel() {
    if (currentUser.grade !== 'admin') {
        alert('Accès refusé. Admin uniquement.');
        return;
    }

    await loadUsers();
    await loadGrades();
    renderAdminPanel();
    document.getElementById('admin-modal').style.display = 'block';
}

function closeAdminPanel() {
    document.getElementById('admin-modal').style.display = 'none';
}

function renderAdminPanel() {
    const container = document.getElementById('admin-users-list');
    
    container.innerHTML = users.map(user => `
        <div class="admin-user-card">
            <div class="admin-user-info">
                <h3>
                    ${user.username}
                    <span class="grade-badge grade-${user.grade}">${user.grade}</span>
                </h3>
                <p>🆔 ID: ${user.id}</p>
            </div>
            <div class="admin-user-actions">
                ${user.id !== currentUser.id ? `
                    <div class="grade-selector-container">
                        <label class="grade-selector-label">Grade:</label>
                        <select id="grade-select-${user.id}" class="grade-select-modern">
                            ${allGrades.map(grade => 
                                `<option value="${grade}" ${user.grade === grade ? 'selected' : ''}>${grade}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-save" onclick="changeUserGrade(${user.id})" title="Sauvegarder le grade">💾</button>
                        <button class="btn-edit" onclick="editUserProfile(${user.id})" title="Modifier le profil">✏️</button>
                        <button class="btn-delete" onclick="deleteUser(${user.id})" title="Supprimer l'utilisateur">🗑️</button>
                    </div>
                ` : '<span style="color: #999; font-style: italic;">Votre compte</span>'}
            </div>
        </div>
    `).join('');
}

// Éditer le profil d'un utilisateur
function editUserProfile(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-username').value = user.username;
    document.getElementById('edit-user-modal').style.display = 'block';
}

function closeEditUserModal() {
    document.getElementById('edit-user-modal').style.display = 'none';
}

async function saveUserProfile() {
    const userId = document.getElementById('edit-user-id').value;
    const username = document.getElementById('edit-user-username').value.trim();
    const newPassword = document.getElementById('edit-user-password').value;
    
    if (!username) {
        alert('Le pseudo est requis');
        return;
    }
    
    const updateData = { username };
    if (newPassword && newPassword.trim() !== '') {
        if (newPassword.length < 6) {
            alert('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        updateData.password = newPassword;
    }
    
    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Profil modifié avec succès!');
            await loadUsers();
            renderAdminPanel();
            closeEditUserModal();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erreur lors de la modification du profil');
    }
}

async function createNewGrade() {
    const gradeName = document.getElementById('new-grade-name').value.trim();
    
    if (!gradeName) {
        alert('Veuillez entrer un nom de grade');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/grades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name: gradeName })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert(`Grade "${gradeName}" créé avec succès!`);
            document.getElementById('new-grade-name').value = '';
            await loadGrades();
            renderAdminPanel();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erreur lors de la création du grade');
    }
}

async function changeUserGrade(userId) {
    const newGrade = document.getElementById(`grade-select-${userId}`).value;
    const user = users.find(u => u.id === userId);
    
    if (!confirm(`Changer le grade de "${user.username}" en "${newGrade}"?`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/grade`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ grade: newGrade })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert(`✅ Grade de "${user.username}" modifié en "${newGrade}" avec succès!`);
            await loadUsers();
            renderAdminPanel();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erreur lors de la modification du grade');
    }
}

async function deleteUser(userId) {
    if (!confirm('Supprimer définitivement cet utilisateur et toutes ses données?')) return;

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Utilisateur supprimé avec succès!');
            await loadUsers();
            renderAdminPanel();
            loadBoard(); // Recharger le board au cas où
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erreur lors de la suppression');
    }
}


// Gestion de la visibilité avec boutons
function toggleVisibility(button, type) {
    const container = button.parentElement;
    const allButton = container.querySelector('[data-value="all"]');
    const value = button.dataset.value;
    
    if (value === 'all') {
        // Si on clique sur "Tous", désactiver les autres
        container.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
    } else {
        // Si on clique sur un grade spécifique, désactiver "Tous"
        allButton.classList.remove('active');
        button.classList.toggle('active');
        
        // Si aucun bouton n'est actif, réactiver "Tous"
        const activeButtons = container.querySelectorAll('.toggle-btn.active');
        if (activeButtons.length === 0) {
            allButton.classList.add('active');
        }
    }
}

// Prévisualisation d'image
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="image-preview-remove" onclick="removeImage('${input.id}', '${previewId}')">
                    🗑️ Supprimer l'image
                </button>
            `;
            preview.classList.add('active');
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

function removeImage(inputId, previewId) {
    document.getElementById(inputId).value = '';
    const preview = document.getElementById(previewId);
    preview.innerHTML = '';
    preview.classList.remove('active');
}

// Obtenir les grades sélectionnés
function getSelectedVisibility(containerId) {
    const container = document.getElementById(containerId);
    const activeButtons = container.querySelectorAll('.toggle-btn.active');
    return Array.from(activeButtons).map(btn => btn.dataset.value).join(',');
}

// Définir les grades sélectionnés
function setSelectedVisibility(containerId, values) {
    const container = document.getElementById(containerId);
    const valueArray = values.split(',');
    
    container.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
        if (valueArray.includes(btn.dataset.value)) {
            btn.classList.add('active');
        }
    });
}


// Gestion des vues
let currentView = 'board';
let currentCalendarDate = new Date();

function switchView(view) {
    currentView = view;
    
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (view === 'board') {
        document.getElementById('board').style.display = 'flex';
        document.getElementById('calendar').classList.remove('active');
    } else {
        document.getElementById('board').style.display = 'none';
        document.getElementById('calendar').classList.add('active');
        renderCalendar();
    }
}

// Fonctions de date
function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
}

function getDateStatus(dueDate) {
    if (!dueDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 7) return 'upcoming';
    return null;
}

function getDaysUntilDue(dueDate) {
    if (!dueDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

// Rendu du calendrier
function renderCalendar() {
    const container = document.getElementById('calendar');
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();
    
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    let calendarHTML = `
        <div class="calendar-header">
            <div class="calendar-nav">
                <button onclick="changeMonth(-1)">◀ Précédent</button>
                <span class="calendar-month">${monthNames[month]} ${year}</span>
                <button onclick="changeMonth(1)">Suivant ▶</button>
            </div>
            <button onclick="currentCalendarDate = new Date(); renderCalendar()">Aujourd'hui</button>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-header">Lun</div>
            <div class="calendar-day-header">Mar</div>
            <div class="calendar-day-header">Mer</div>
            <div class="calendar-day-header">Jeu</div>
            <div class="calendar-day-header">Ven</div>
            <div class="calendar-day-header">Sam</div>
            <div class="calendar-day-header">Dim</div>
    `;
    
    // Jours du mois précédent
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        calendarHTML += `<div class="calendar-day other-month">
            <div class="calendar-day-number">${day}</div>
        </div>`;
    }
    
    // Jours du mois actuel
    const today = new Date();
    for (let day = 1; day <= lastDate; day++) {
        const currentDate = new Date(year, month, day);
        const dateString = currentDate.toISOString().split('T')[0];
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        
        const dayTasks = tasks.filter(task => {
            if (!task.due_date && !task.start_date) return false;
            const taskDue = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : null;
            const taskStart = task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : null;
            return taskDue === dateString || taskStart === dateString;
        });
        
        calendarHTML += `<div class="calendar-day ${isToday ? 'today' : ''}">
            <div class="calendar-day-number">${day}</div>
            ${dayTasks.map(task => `
                <div class="calendar-task" style="background-color: ${task.color}; color: ${getContrastColor(task.color)}" 
                     onclick="editTask(${task.id})" title="${task.title}">
                    ${task.title}
                </div>
            `).join('')}
        </div>`;
    }
    
    // Jours du mois suivant
    const remainingDays = 42 - (firstDayOfWeek + lastDate);
    for (let day = 1; day <= remainingDays; day++) {
        calendarHTML += `<div class="calendar-day other-month">
            <div class="calendar-day-number">${day}</div>
        </div>`;
    }
    
    calendarHTML += '</div>';
    container.innerHTML = calendarHTML;
}

function changeMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendar();
}

function getContrastColor(hexcolor) {
    if (!hexcolor) return '#000000';
    const r = parseInt(hexcolor.substr(1,2), 16);
    const g = parseInt(hexcolor.substr(3,2), 16);
    const b = parseInt(hexcolor.substr(5,2), 16);
    const yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}


// Gestion des commentaires
let currentTaskComments = [];

async function loadComments(taskId) {
    if (!taskId) return;
    
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}/comments`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        currentTaskComments = await response.json();
        renderComments();
    } catch (error) {
        console.error('Erreur lors du chargement des commentaires:', error);
    }
}

function renderComments() {
    const commentsList = document.getElementById('comments-list');
    const commentsCount = document.getElementById('comments-count');
    
    commentsCount.textContent = currentTaskComments.length;
    
    if (currentTaskComments.length === 0) {
        commentsList.innerHTML = '<div class="no-comments">💭 Aucun commentaire pour le moment. Soyez le premier à commenter !</div>';
        return;
    }
    
    commentsList.innerHTML = currentTaskComments.map(comment => {
        const date = new Date(comment.created_at);
        const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formattedDate = `${time} - ${dateStr}`;
        
        const canDelete = comment.user_id === currentUser.id || currentUser.grade === 'admin';
        
        return `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${comment.username}</span>
                    <div class="comment-meta">
                        <span class="comment-date">${formattedDate} ${canDelete ? `<button class="comment-delete" onclick="deleteComment(${comment.id})" title="Supprimer">×</button>` : ''}</span>
                    </div>
                </div>
                <div class="comment-text">${escapeHtml(comment.comment)}</div>
            </div>
        `;
    }).join('');
}

async function addComment() {
    const taskId = document.getElementById('task-id').value;
    const commentInput = document.getElementById('comment-input');
    const comment = commentInput.value.trim();
    
    if (!taskId) {
        alert('Veuillez d\'abord enregistrer la tâche avant d\'ajouter des commentaires');
        return;
    }
    
    if (!comment) {
        alert('Veuillez entrer un commentaire');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ comment })
        });
        
        if (response.ok) {
            commentInput.value = '';
            await loadComments(taskId);
        } else {
            const data = await response.json();
            alert(data.error);
        }
    } catch (error) {
        alert('Erreur lors de l\'ajout du commentaire');
    }
}

async function deleteComment(commentId) {
    if (!confirm('Supprimer ce commentaire?')) return;
    
    try {
        const response = await fetch(`${API_URL}/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const taskId = document.getElementById('task-id').value;
            await loadComments(taskId);
        } else {
            const data = await response.json();
            alert(data.error);
        }
    } catch (error) {
        alert('Erreur lors de la suppression du commentaire');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// Gestion des statuts personnalisés
let allStatuses = [];

async function loadStatuses() {
    const response = await fetch(`${API_URL}/statuses`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    allStatuses = await response.json();
}

async function createNewStatus() {
    const name = document.getElementById('new-status-name').value.trim();
    const emoji = document.getElementById('new-status-emoji').value.trim();
    const color = document.getElementById('new-status-color').value;
    
    if (!name || !emoji) {
        alert('Veuillez entrer un nom et un emoji pour le statut');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/statuses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, emoji, color })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert(`Statut "${name}" créé avec succès!`);
            document.getElementById('new-status-name').value = '';
            document.getElementById('new-status-emoji').value = '';
            document.getElementById('new-status-color').value = '#3498db';
            await loadStatuses();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erreur lors de la création du statut');
    }
}

// Gestion Discord
async function showDiscordModal() {
    try {
        const response = await fetch(`${API_URL}/user/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const userData = await response.json();
        
        if (userData.discord_id) {
            document.getElementById('discord-not-linked').style.display = 'none';
            document.getElementById('discord-linked').style.display = 'block';
            document.getElementById('discord-id-display').textContent = userData.discord_id;
            document.getElementById('discord-status').textContent = '✅ Discord';
        } else {
            document.getElementById('discord-not-linked').style.display = 'block';
            document.getElementById('discord-linked').style.display = 'none';
            document.getElementById('discord-status').textContent = '💬 Discord';
        }
        
        document.getElementById('discord-modal').style.display = 'block';
    } catch (error) {
        alert('Erreur lors du chargement des informations Discord');
    }
}

function closeDiscordModal() {
    document.getElementById('discord-modal').style.display = 'none';
}

async function linkDiscord() {
    const discordId = document.getElementById('discord-id-input').value.trim();
    
    if (!discordId) {
        alert('Veuillez entrer votre ID Discord');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user/discord`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ discord_id: discordId })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Compte Discord lié avec succès! Vous recevrez des notifications pour les tâches assignées.');
            document.getElementById('discord-status').textContent = '✅ Discord';
            closeDiscordModal();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erreur lors de la liaison du compte Discord');
    }
}

async function unlinkDiscord() {
    if (!confirm('Délier votre compte Discord? Vous ne recevrez plus de notifications.')) return;

    try {
        const response = await fetch(`${API_URL}/user/discord`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Compte Discord délié avec succès.');
            document.getElementById('discord-status').textContent = '💬 Discord';
            closeDiscordModal();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erreur lors de la déliaison du compte Discord');
    }
}

// Charger les statuts au démarrage
async function initApp() {
    await loadStatuses();
}

// Appeler au chargement
if (authToken && currentUser) {
    initApp();
}


// Gestion des documents
let documents = [];
let currentDocument = null;

function switchView(view) {
    currentView = view;
    
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('board').style.display = 'none';
    document.getElementById('calendar').classList.remove('active');
    document.getElementById('documents').classList.remove('active');
    
    if (view === 'board') {
        document.getElementById('board').style.display = 'flex';
    } else if (view === 'calendar') {
        document.getElementById('calendar').classList.add('active');
        renderCalendar();
    } else if (view === 'documents') {
        document.getElementById('documents').classList.add('active');
        loadDocuments();
    }
}

async function loadDocuments() {
    try {
        const response = await fetch(`${API_URL}/documents`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        documents = await response.json();
        renderDocuments();
    } catch (error) {
        console.error('Erreur chargement documents:', error);
        renderDocuments();
    }
}

function renderDocuments() {
    const container = document.getElementById('documents');
    
    container.innerHTML = `
        <div class="documents-header">
            <div class="documents-title">📄 Documents</div>
            <div class="documents-subtitle">Créez et organisez vos documents</div>
        </div>
        <div class="documents-actions">
            <button class="doc-action-btn" onclick="createNewDocument()">
                ➕ Nouveau document
            </button>
        </div>
        <div class="documents-grid" id="documents-grid">
            ${documents.length === 0 ? `
                <div class="empty-documents">
                    <div class="empty-documents-icon">📄</div>
                    <div class="empty-documents-text">Aucun document pour le moment</div>
                    <button class="doc-action-btn" onclick="createNewDocument()">
                        Créer votre premier document
                    </button>
                </div>
            ` : documents.map(doc => `
                <div class="document-card" onclick="openDocument(${doc.id})">
                    <div class="document-icon">${doc.icon || '📄'}</div>
                    <div class="document-title">${doc.title || 'Sans titre'}</div>
                    <div class="document-meta">
                        <span>${new Date(doc.updated_at).toLocaleDateString('fr-FR')}</span>
                        <span>${doc.author}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function createNewDocument() {
    alert('Fonctionnalité Documents en cours de développement!\n\nBientôt disponible:\n- Éditeur de texte riche\n- Markdown support\n- Collaboration en temps réel\n- Export PDF');
}

function openDocument(id) {
    const doc = documents.find(d => d.id === id);
    if (doc) {
        alert(`Ouverture du document: ${doc.title}\n\nÉditeur en cours de développement...`);
    }
}
