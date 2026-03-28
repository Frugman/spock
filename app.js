/**
 * SPOCK - Logic Layer
 * Core Application Logic for Nutrition Tracking
 */

const AppState = {
    user: {
        name: "Frugman",
        goal: 1600,
        protGoal: 120,
        mealGoal: 800
    },
    journal: [],
    meals: [],
    aliments: [],
    weightHistory: [],
    offCache: [],
    lastOFFSearchResults: [],
    currentlyViewedProduct: null,
    currentMealBaseMacros: null,
    editingJournalId: null,
    editingMealId: null,
    editingAlimentId: null
};

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSettings();
    initMealModal();
    initFrequentMealModal();
    initAlimentModal();
    initWeightForm();
    initOFFExplorer();
    initApp();
});

/**
 * Highlights active menu item based on current page URL
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    navItems.forEach(item => {
        const link = item.querySelector('a');
        if (!link) return;
        const target = link.getAttribute('href');
        if (target === currentPath) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Initialize Application data from GitHub
 */
async function initApp() {
    if (!GitHubAPI.isConfigured()) {
        const summary = document.getElementById('today-summary');
        if (summary) summary.innerText = "Veuillez configurer GitHub dans les paramètres.";
        return;
    }

    try {
        const todaySummary = document.getElementById('today-summary');
        if (todaySummary) todaySummary.innerText = "Synchronisation...";
        
        const [journalRes, weightRes, mealsRes, cacheRes, alimentsRes] = await Promise.all([
            GitHubAPI.getFile('journal.json').catch(() => ({ content: [] })),
            GitHubAPI.getFile('poids.json').catch(() => ({ content: [] })),
            GitHubAPI.getFile('plats_frequents.json').catch(() => ({ content: [] })),
            GitHubAPI.getFile('produits_cache.json').catch(() => ({ content: [] })),
            GitHubAPI.getFile('aliments_frequents.json').catch(() => ({ content: [] }))
        ]);

        AppState.journal = Array.isArray(journalRes.content) ? journalRes.content : [];
        AppState.weightHistory = Array.isArray(weightRes.content) ? weightRes.content : [];
        AppState.meals = Array.isArray(mealsRes.content) ? mealsRes.content : [];
        AppState.offCache = Array.isArray(cacheRes.content) ? cacheRes.content : [];
        AppState.aliments = Array.isArray(alimentsRes.content) ? alimentsRes.content : [];

        // Distribute to UI
        updateDashboard();
        renderJournalTimeline();
        renderWeightChart();
        renderMealsLibrary();
        renderAlimentsLibrary();
        renderReport();
        
        console.log("System Status: Logic operational.");
    } catch (error) {
        console.error("Critical Sync Error:", error);
        const summary = document.getElementById('today-summary');
        if (summary) summary.innerText = "Erreur de synchronisation.";
    }
}

/* -------------------------------------------------------------------------- */
/*                               DASHBOARD LOGIC                              */
/* -------------------------------------------------------------------------- */

function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = AppState.journal.filter(e => e.date === today);
    const totalCals = Math.round(todayEntries.reduce((s, e) => s + (e.calories || 0), 0));
    const totalProt = Math.round(todayEntries.reduce((s, e) => s + (e.proteins || 0), 0));

    const calCount = document.getElementById('cal-count');
    const calFill = document.getElementById('cal-fill');
    const protCount = document.getElementById('prot-count');
    const protFill = document.getElementById('prot-fill');
    
    if (calCount) calCount.innerText = `${totalCals} / ${AppState.user.goal} kcal`;
    if (calFill) calFill.style.width = `${Math.min((totalCals / AppState.user.goal) * 100, 100)}%`;
    if (protCount) protCount.innerText = `${totalProt} / ${AppState.user.protGoal}g`;
    if (protFill) protFill.style.width = `${Math.min((totalProt / AppState.user.protGoal) * 100, 100)}%`;

    const summary = document.getElementById('today-summary');
    if (summary) {
        summary.innerText = todayEntries.length > 0 ? `${todayEntries.length} repas ce jour.` : "Aucun repas aujourd'hui. Logic requires sustenance.";
    }

    const preview = document.getElementById('latest-entry-preview');
    if (preview && todayEntries.length > 0) {
        const latest = todayEntries[0];
        preview.innerHTML = `<div class='latest-preview'><strong>${latest.title}</strong><p>${latest.calories} kcal | ${latest.time}</p></div>`;
    }

    if (AppState.weightHistory.length > 0) {
        const lastW = AppState.weightHistory[AppState.weightHistory.length - 1];
        const lastWEl = document.getElementById('last-weight');
        if (lastWEl) lastWEl.innerText = `${lastW.value} kg`;
    }
}

/* -------------------------------------------------------------------------- */
/*                                JOURNAL LOGIC                               */
/* -------------------------------------------------------------------------- */

function renderJournalTimeline() {
    const container = document.getElementById('journal-timeline');
    if (!container) return;

    if (AppState.journal.length === 0) {
        container.innerHTML = "<div class='empty-state'>Aucun log aujourd'hui.</div>";
        return;
    }

    container.innerHTML = AppState.journal.map(e => `
        <div class="timeline-entry">
            <div class="entry-header">
                <span class="entry-title">${e.title}</span>
                <div style="display:flex; gap: 8px;">
                    <span class="entry-time">${e.time}</span>
                    <button onclick="editJournalEntry(${e.id})" class="btn-icon">✏️</button>
                    <button onclick="deleteJournalEntry(${e.id})" class="btn-icon">🗑️</button>
                </div>
            </div>
            <div class="entry-content">
                ${e.photo ? `<img src="data:image/jpeg;base64,${e.photo}" class="entry-img">` : '<div class="entry-img-placeholder">🍽️</div>'}
                <div class="entry-details">
                    <div class="entry-macros">
                        <span class="macro-tag">🔥 ${e.calories}</span>
                        <span class="macro-tag">🥩 ${e.proteins}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

window.editJournalEntry = function(id) {
    const entry = AppState.journal.find(e => e.id == id);
    if (!entry) return;

    // Check if we are on journal page
    if (!document.getElementById('entry-modal')) {
        window.location.href = `journal.html?edit=${id}`;
        return;
    }

    AppState.editingJournalId = id;
    const modal = document.getElementById('entry-modal');
    modal.classList.add('active');

    document.getElementById('meal-title').value = entry.title;
    document.getElementById('meal-qty').value = entry.quantity || 100;
    document.getElementById('meal-calories').value = entry.calories;
    document.getElementById('meal-proteins').value = entry.proteins;
    document.getElementById('meal-carbs').value = entry.carbs;
    document.getElementById('meal-fats').value = entry.fats;
    document.getElementById('meal-time').value = entry.time;
    document.getElementById('btn-submit-journal').innerText = "Mettre à jour";

    if (entry.photo) {
        const previewImg = document.getElementById('preview-img');
        previewImg.src = `data:image/jpeg;base64,${entry.photo}`;
        previewImg.classList.add('active');
        document.getElementById('upload-prompt').style.display = 'none';
        document.getElementById('img-zone').classList.add('has-image');
    }
};

window.deleteJournalEntry = async function(id) {
    if (!confirm("Effacer cette entrée ?")) return;
    AppState.journal = AppState.journal.filter(e => e.id != id);
    await GitHubAPI.saveFile('journal.json', AppState.journal, "Delete entry");
    renderJournalTimeline();
    updateDashboard();
};

function initMealModal() {
    const modal = document.getElementById('entry-modal');
    const openBtn = document.getElementById('btn-add-entry');
    const closeBtn = document.getElementById('btn-close-modal');
    const form = document.getElementById('meal-form');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (!modal) { window.location.href = 'journal.html'; return; }
            AppState.editingJournalId = null;
            form.reset();
            document.getElementById('meal-time').value = new Date().toTimeString().slice(0, 5);
            modal.classList.add('active');
        });
    }
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const photoInput = document.getElementById('meal-photo');
            let photoBase64 = null;

            if (photoInput && photoInput.files[0]) {
                photoBase64 = await compressImage(photoInput.files[0]);
            } else if (AppState.editingJournalId) {
                const old = AppState.journal.find(en => en.id == AppState.editingJournalId);
                if (old) photoBase64 = old.photo;
            }

            const entry = {
                id: AppState.editingJournalId || Date.now(),
                date: new Date().toISOString().split('T')[0],
                time: document.getElementById('meal-time').value,
                title: document.getElementById('meal-title').value,
                quantity: document.getElementById('meal-qty').value,
                calories: parseFloat(document.getElementById('meal-calories').value),
                proteins: parseFloat(document.getElementById('meal-proteins').value),
                carbs: parseFloat(document.getElementById('meal-carbs').value),
                fats: parseFloat(document.getElementById('meal-fats').value),
                photo: photoBase64
            };

            if (AppState.editingJournalId) {
                const idx = AppState.journal.findIndex(en => en.id == AppState.editingJournalId);
                if (idx !== -1) AppState.journal[idx] = entry;
            } else {
                AppState.journal.unshift(entry);
            }

            await GitHubAPI.saveFile('journal.json', AppState.journal, "Save meal log");
            modal.classList.remove('active');
            renderJournalTimeline();
            updateDashboard();
        });
    }

    // Photo preview logic
    const imgZone = document.getElementById('img-zone');
    const photoInput = document.getElementById('meal-photo');
    if (imgZone && photoInput) {
        imgZone.addEventListener('click', () => photoInput.click());
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const preview = document.getElementById('preview-img');
                    preview.src = re.target.result;
                    preview.classList.add('active');
                    document.getElementById('upload-prompt').style.display = 'none';
                    imgZone.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // OFF Search in modal
    const offInput = document.getElementById('off-search');
    if (offInput) {
        offInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length < 3) return;
            const results = await searchOFF(query);
            displayOFFResults(results, 'off-results', selectProduct);
        }, 500));
    }
}

/* -------------------------------------------------------------------------- */
/*                                LIBRARY LOGIC                               */
/* -------------------------------------------------------------------------- */

function renderMealsLibrary(searchTerm = "") {
    const container = document.getElementById('meals-grid');
    if (!container) return;
    
    container.innerHTML = AppState.meals
        .filter(m => !searchTerm || m.title.toLowerCase().includes(searchTerm))
        .map(m => `
            <div class="card meal-card">
                <header style="display:flex; justify-content:space-between;">
                    <strong>${m.title}</strong>
                    <div style="display:flex; gap: 4px;">
                        <button onclick="editFrequentMeal(${m.id})" class="btn-icon">✏️</button>
                        <button onclick="removeFrequentMeal(${m.id})" class="btn-icon">🗑️</button>
                    </div>
                </header>
                <div class="entry-macros"><span class="macro-tag">🔥 ${m.calories}</span><span class="macro-tag">🥩 ${m.proteins}</span></div>
                <button onclick="addMealToJournalFromLibrary(${m.id})" class="btn-primary" style="margin-top:10px; width:100%;">Ajouter</button>
            </div>
        `).join('');
}

function renderAlimentsLibrary(searchTerm = "") {
    const container = document.getElementById('aliments-grid');
    if (!container) return;

    container.innerHTML = AppState.aliments
        .filter(a => !searchTerm || a.title.toLowerCase().includes(searchTerm))
        .map(a => `
            <div class="card meal-card">
                <header style="display:flex; justify-content:space-between;">
                    <strong>${a.title}</strong>
                    <div style="display:flex; gap: 4px;">
                        <button onclick="editAliment(${a.id})" class="btn-icon">✏️</button>
                        <button onclick="removeAliment(${a.id})" class="btn-icon">🗑️</button>
                    </div>
                </header>
                <div class="entry-macros"><span class="macro-tag">🔥 ${a.calories}</span><span class="macro-tag">🥩 ${a.proteins}</span></div>
            </div>
        `).join('');
}

window.editFrequentMeal = function(id) {
    const meal = AppState.meals.find(m => m.id === id);
    if (!meal) return;
    AppState.editingMealId = id;
    document.getElementById('meal-modal-title').innerText = "Modifier le Plat";
    document.getElementById('f-meal-title').value = meal.title;
    document.getElementById('f-meal-calories').value = meal.calories;
    document.getElementById('f-meal-proteins').value = meal.proteins;
    document.getElementById('f-meal-carbs').value = meal.carbs;
    document.getElementById('f-meal-fats').value = meal.fats;
    document.getElementById('meal-modal').classList.add('active');
};

window.removeFrequentMeal = async function(id) {
    if (!confirm("Supprimer ?")) return;
    AppState.meals = AppState.meals.filter(m => m.id != id);
    await GitHubAPI.saveFile('plats_frequents.json', AppState.meals, "Remove meal");
    renderMealsLibrary();
};

window.addMealToJournalFromLibrary = function(id) {
    const m = AppState.meals.find(meal => meal.id == id);
    if (!m) return;
    window.location.href = `journal.html?useMeal=${id}`;
};

function initFrequentMealModal() {
    const modal = document.getElementById('meal-modal');
    const form = document.getElementById('frequent-meal-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                id: AppState.editingMealId || Date.now(),
                title: document.getElementById('f-meal-title').value,
                calories: parseFloat(document.getElementById('f-meal-calories').value),
                proteins: parseFloat(document.getElementById('f-meal-proteins').value),
                carbs: parseFloat(document.getElementById('f-meal-carbs').value),
                fats: parseFloat(document.getElementById('f-meal-fats').value)
            };
            if (AppState.editingMealId) {
                const idx = AppState.meals.findIndex(m => m.id === AppState.editingMealId);
                if (idx !== -1) AppState.meals[idx] = data;
            } else {
                AppState.meals.push(data);
            }
            await GitHubAPI.saveFile('plats_frequents.json', AppState.meals, "Update Library");
            modal.classList.remove('active');
            renderMealsLibrary();
        });
    }
    const closeBtn = document.getElementById('btn-close-meal-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    const searchInput = document.getElementById('meals-search');
    if (searchInput) searchInput.addEventListener('input', (e) => renderMealsLibrary(e.target.value.toLowerCase()));
}

function initAlimentModal() {
    const modal = document.getElementById('aliment-modal');
    const form = document.getElementById('aliment-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                id: AppState.editingAlimentId || Date.now(),
                title: document.getElementById('a-title').value,
                calories: parseFloat(document.getElementById('a-calories').value),
                proteins: parseFloat(document.getElementById('a-proteins').value),
                carbs: parseFloat(document.getElementById('a-carbs').value),
                fats: parseFloat(document.getElementById('a-fats').value)
            };
            if (AppState.editingAlimentId) {
                const idx = AppState.aliments.findIndex(a => a.id === AppState.editingAlimentId);
                if (idx !== -1) AppState.aliments[idx] = data;
            } else {
                AppState.aliments.push(data);
            }
            await GitHubAPI.saveFile('aliments_frequents.json', AppState.aliments, "Update Aliments");
            modal.classList.remove('active');
            renderAlimentsLibrary();
        });
    }
    const closeBtn = document.getElementById('btn-close-aliment-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    const searchInput = document.getElementById('aliments-search');
    if (searchInput) searchInput.addEventListener('input', (e) => renderAlimentsLibrary(e.target.value.toLowerCase()));
}

/* -------------------------------------------------------------------------- */
/*                                 WEIGHT LOGIC                               */
/* -------------------------------------------------------------------------- */

function initWeightForm() {
    const form = document.getElementById('weight-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const weight = {
            date: new Date().toISOString().split('T')[0],
            value: parseFloat(document.getElementById('weight-value').value)
        };
        const idx = AppState.weightHistory.findIndex(w => w.date === weight.date);
        if (idx !== -1) AppState.weightHistory[idx] = weight;
        else AppState.weightHistory.push(weight);
        await GitHubAPI.saveFile('poids.json', AppState.weightHistory, "Log Weight");
        renderWeightChart();
        updateDashboard();
    });
}

function renderWeightChart() {
    const ctx = document.getElementById('weight-chart');
    if (!ctx || AppState.weightHistory.length === 0) return;
    const labels = AppState.weightHistory.slice(-10).map(w => w.date);
    const data = AppState.weightHistory.slice(-10).map(w => w.value);
    if (window.weightChartInstance) window.weightChartInstance.destroy();
    window.weightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'kg', data: data, borderColor: '#238636', tension: 0.4, fill: true, backgroundColor: 'rgba(35, 134, 54, 0.1)' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { ticks: { color: '#848d97' } } }, plugins: { legend: { display: false } } }
    });
}

/* -------------------------------------------------------------------------- */
/*                                REPORT LOGIC                                */
/* -------------------------------------------------------------------------- */

function renderReport() {
    const avgCal = document.getElementById('avg-calories');
    if (!avgCal) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = AppState.journal.filter(e => new Date(e.date) >= sevenDaysAgo);
    if (recent.length === 0) return;

    const dayCount = [...new Set(recent.map(e => e.date))].length || 1;
    const totCals = recent.reduce((s, e) => s + (e.calories || 0), 0);
    avgCal.innerText = `${Math.round(totCals / dayCount)} kcal/j`;
    
    const topFoods = document.getElementById('top-foods');
    const counts = {};
    recent.forEach(e => counts[e.title] = (counts[e.title] || 0) + 1);
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    topFoods.innerHTML = sorted.map(([n, c]) => `<li>${n} <span>x${c}</span></li>`).join('');
}

/* -------------------------------------------------------------------------- */
/*                                OFF EXPLORER                                */
/* -------------------------------------------------------------------------- */

function initOFFExplorer() {
    const btn = document.getElementById('btn-search-off');
    if (btn) {
        btn.addEventListener('click', async () => {
            const query = document.getElementById('off-explorer-query').value.trim();
            const results = await searchOFF(query);
            AppState.lastOFFSearchResults = results;
            renderExplorerResults(results);
        });
    }
}

async function searchOFF(query) {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10`;
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    return JSON.parse(data.contents).products || [];
}

function renderExplorerResults(prods) {
    const grid = document.getElementById('explorer-results');
    if (!grid) return;
    grid.innerHTML = prods.map((p, i) => `
        <div class="card product-card" onclick="showProductDetail(${i})">
            <img src="${p.image_front_small_url || ''}" class="product-img">
            <h4>${p.product_name || 'Inconnu'}</h4>
            <p>${p.brands || ''}</p>
        </div>
    `).join('');
}

window.showProductDetail = function(index) {
    const p = AppState.lastOFFSearchResults[index];
    if (!p) return;
    AppState.currentlyViewedProduct = p;
    const panel = document.getElementById('product-detail-panel');
    const content = document.getElementById('detail-content');
    panel.classList.add('active');
    const n = p.nutriments || {};
    content.innerHTML = `
        <h3>${p.product_name}</h3>
        <p>${p.brands}</p>
        <div class="detail-macros">
            <div class="detail-macro"><span>Cal</span><b>${n.calories_100g || 0}</b></div>
            <div class="detail-macro"><span>Prot</span><b>${n.proteins_100g || 0}g</b></div>
        </div>
        <button onclick="addToOFFCache()" class="btn-primary" style="margin-top:20px; width:100%;">Favoris (Cache)</button>
    `;
    const closeBtn = document.getElementById('btn-close-detail');
    if (closeBtn) closeBtn.onclick = () => panel.classList.remove('active');
};

/* -------------------------------------------------------------------------- */
/*                                  SETTINGS                                  */
/* -------------------------------------------------------------------------- */

function initSettings() {
    const saveBtn = document.getElementById('btn-save-settings');
    if (!saveBtn) return;
    document.getElementById('gh-user').value = localStorage.getItem('gh_user') || '';
    document.getElementById('gh-repo').value = localStorage.getItem('gh_repo') || '';
    document.getElementById('gh-token').value = localStorage.getItem('gh_token') || '';

    saveBtn.addEventListener('click', () => {
        localStorage.setItem('gh_user', document.getElementById('gh-user').value.trim());
        localStorage.setItem('gh_repo', document.getElementById('gh-repo').value.trim());
        localStorage.setItem('gh_token', document.getElementById('gh-token').value.trim());
        initApp();
    });

    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (confirm("Reset local data?")) {
                localStorage.removeItem('gh_user'); localStorage.removeItem('gh_repo'); localStorage.removeItem('gh_token');
                window.location.reload();
            }
        };
    }
}

/* -------------------------------------------------------------------------- */
/*                                  UTILITIES                                 */
/* -------------------------------------------------------------------------- */

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = e => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 400; canvas.height = (img.height * 400) / img.width;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6).split(',')[1]);
            };
        };
    });
}
