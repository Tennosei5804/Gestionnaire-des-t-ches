// Gestion des thèmes
let currentTheme = localStorage.getItem('theme') || 'normal';

// Appliquer le thème au chargement
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
});

function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    applyTheme(theme);
}

function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    
    // Mettre à jour les boutons de thème
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        }
    });
}
