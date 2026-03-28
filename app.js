document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSettings();
    initApp();
});

/**
 * Handles tab navigation between sections
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');

            // Update nav active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show current section and hide others
            sections.forEach(section => {
                const isTarget = section.id === `view-${targetId}`;
                section.classList.toggle('active', isTarget);
            });

            console.log(`Navigation: switched to ${targetId}`);
        });
    });
}

/**
 * Handle Settings initialization and saving
 */
function initSettings() {
    const userField = document.getElementById('gh-user');
    const repoField = document.getElementById('gh-repo');
    const tokenField = document.getElementById('gh-token');
    const saveBtn = document.getElementById('btn-save-settings');
    const statusMsg = document.getElementById('settings-status');

    // Load existing settings
    if (userField) userField.value = localStorage.getItem('gh_user') || '';
    if (repoField) repoField.value = localStorage.getItem('gh_repo') || '';
    if (tokenField) tokenField.value = localStorage.getItem('gh_token') || '';

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const user = userField.value.trim();
            const repo = repoField.value.trim();
            const token = tokenField.value.trim();

            if (!user || !repo || !token) {
                showStatus("Veuillez remplir tous les champs.", "error");
                return;
            }

            localStorage.setItem('gh_user', user);
            localStorage.setItem('gh_repo', repo);
            localStorage.setItem('gh_token', token);

            showStatus("Configuration enregistrée avec succès !", "success");
            
            // Reload app data
            initApp();
        });
    }

    function showStatus(text, type) {
        statusMsg.innerText = text;
        statusMsg.className = `status-msg active ${type}`;
        setTimeout(() => {
            statusMsg.classList.remove('active');
        }, 3000);
    }
}

/**
 * Initialize Application data
 */
async function initApp() {
    if (!GitHubAPI.isConfigured()) {
        console.warn("GitHub not configured. Please go to Settings.");
        const summary = document.getElementById('today-summary');
        if (summary) summary.innerText = "Veuillez configurer GitHub dans les paramètres.";
        return;
    }

    try {
        const todaySummary = document.getElementById('today-summary');
        if (todaySummary) todaySummary.innerText = "Synchronisation en cours...";
        
        // Load various JSON files
        const [journalRes, weightRes, mealsRes] = await Promise.all([
            GitHubAPI.getFile('journal.json').catch(() => ({ content: [] })),
            GitHubAPI.getFile('poids.json').catch(() => ({ content: [] })),
            GitHubAPI.getFile('plats_frequents.json').catch(() => ({ content: [] }))
        ]);

        AppState.journal = Array.isArray(journalRes.content) ? journalRes.content : [];
        AppState.weightHistory = Array.isArray(weightRes.content) ? weightRes.content : [];
        AppState.meals = Array.isArray(mealsRes.content) ? mealsRes.content : [];

        updateDashboard();
        console.log("App data loaded successfully");
    } catch (error) {
        console.error("Error loading app data:", error);
        const summary = document.getElementById('today-summary');
        if (summary) summary.innerText = "Erreur de synchronisation. Vérifiez vos paramètres.";
    }
}

/**
 * Update Dashboard metrics
 */
function updateDashboard() {
    // Basic calculator for today's summary
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = AppState.journal.filter(entry => entry.date === today);
    const totalCals = todayEntries.reduce((sum, entry) => sum + (entry.calories || 0), 0);

    // Update UI
    const calCount = document.getElementById('cal-count');
    const calFill = document.getElementById('cal-fill');
    
    if (calCount) calCount.innerText = `${totalCals} / ${AppState.user.goal} kcal`;
    if (calFill) {
        const percentage = Math.min((totalCals / AppState.user.goal) * 100, 100);
        calFill.style.width = `${percentage}%`;
    }

    const summary = document.getElementById('today-summary');
    if (summary) {
        summary.innerText = 
            todayEntries.length > 0 
            ? `${todayEntries.length} repas enregistrés aujourd'hui.` 
            : "Aucun repas enregistré aujourd'hui. Live long and prosper.";
    }
        
    // Update weight
    if (AppState.weightHistory.length > 0) {
        const lastWeightObj = AppState.weightHistory[AppState.weightHistory.length - 1];
        const lastWeightEl = document.getElementById('last-weight');
        if (lastWeightEl) lastWeightEl.innerText = `${lastWeightObj.value} kg`;
    }
}
const AppState = {
    user: {
        name: "Frugman",
        goal: 1600,
        mealGoal: 800,
        mealCategories: ["Déjeuner", "Dîner"],
        currentWeight: null
    },
    journal: [],
    meals: [],
    weightHistory: [],
    offCache: {}
};

/**
 * Utility: Compress Image using Logic Canvas
 * @param {File} file - The image file from input
 * @param {number} maxWidth - Maximum width for output
 * @returns {Promise<string>} - Base64 string of compressed jpeg
 */
async function compressImage(file, maxWidth = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Use JPEG with 0.7 quality for good balance size/quality
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl.split(',')[1]); // Return only the base64 part
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}
