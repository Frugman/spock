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

        // Distribute to UI (safely)
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

    if (!document.getElementById('meal-form')) {
        window.location.href = `journal.html?edit=${id}`;
        return;
    }

    AppState.editingJournalId = id;
    const modal = document.getElementById('entry-modal');
    if (modal) modal.classList.add('active');

    if (document.getElementById('meal-title')) document.getElementById('meal-title').value = entry.title;
    if (document.getElementById('meal-qty')) document.getElementById('meal-qty').value = entry.quantity || 100;
    if (document.getElementById('meal-calories')) document.getElementById('meal-calories').value = entry.calories;
    if (document.getElementById('meal-proteins')) document.getElementById('meal-proteins').value = entry.proteins;
    if (document.getElementById('meal-carbs')) document.getElementById('meal-carbs').value = entry.carbs;
    if (document.getElementById('meal-fats')) document.getElementById('meal-fats').value = entry.fats;
    if (document.getElementById('meal-time')) document.getElementById('meal-time').value = entry.time;
    if (document.getElementById('btn-submit-journal')) document.getElementById('btn-submit-journal').innerText = "Mettre à jour";

    if (entry.photo) {
        const previewImg = document.getElementById('preview-img');
        if (previewImg) {
            previewImg.src = `data:image/jpeg;base64,${entry.photo}`;
            previewImg.classList.add('active');
            if (document.getElementById('upload-prompt')) document.getElementById('upload-prompt').style.display = 'none';
            if (document.getElementById('img-zone')) document.getElementById('img-zone').classList.add('has-image');
        }
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
            if (form) form.reset();
            const timeField = document.getElementById('meal-time');
            if (timeField) timeField.value = new Date().toTimeString().slice(0, 5);
            modal.classList.add('active');
        });
    }
    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

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
                    if (preview) {
                        preview.src = re.target.result;
                        preview.classList.add('active');
                    }
                    if (document.getElementById('upload-prompt')) document.getElementById('upload-prompt').style.display = 'none';
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
            const resultsList = document.getElementById('off-results');
            if (resultsList) {
                resultsList.innerHTML = "";
                results.forEach(p => {
                    const li = document.createElement('li');
                    li.innerText = p.product_name || "Inconnu";
                    li.onclick = () => selectProduct(p);
                    resultsList.appendChild(li);
                });
                resultsList.classList.add('active');
            }
        }, 500));
    }
}

/**
 * selectProduct used by OFF Search
 */
window.selectProduct = function(p) {
    const n = p.nutriments || {};
    if (document.getElementById('meal-title')) document.getElementById('meal-title').value = p.product_name || "";
    if (document.getElementById('meal-qty')) document.getElementById('meal-qty').value = 100;
    
    // Fallbacks for macros
    const cal = n.calories_100g || n['energy-kcal_100g'] || 0;
    const prot = n.proteins_100g || 0;
    const carbs = n.carbohydrates_100g || 0;
    const fat = n.fat_100g || 0;

    if (document.getElementById('meal-calories')) document.getElementById('meal-calories').value = cal;
    if (document.getElementById('meal-proteins')) document.getElementById('meal-proteins').value = prot;
    if (document.getElementById('meal-carbs')) document.getElementById('meal-carbs').value = carbs;
    if (document.getElementById('meal-fats')) document.getElementById('meal-fats').value = fat;
    
    const resultsList = document.getElementById('off-results');
    if (resultsList) resultsList.classList.remove('active');
};

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
    if (document.getElementById('meal-modal-title')) document.getElementById('meal-modal-title').innerText = "Modifier le Plat";
    if (document.getElementById('f-meal-title')) document.getElementById('f-meal-title').value = meal.title;
    if (document.getElementById('f-meal-calories')) document.getElementById('f-meal-calories').value = meal.calories;
    if (document.getElementById('f-meal-proteins')) document.getElementById('f-meal-proteins').value = meal.proteins;
    if (document.getElementById('f-meal-carbs')) document.getElementById('f-meal-carbs').value = meal.carbs;
    if (document.getElementById('f-meal-fats')) document.getElementById('f-meal-fats').value = meal.fats;
    const modal = document.getElementById('meal-modal');
    if (modal) modal.classList.add('active');
};

window.removeFrequentMeal = async function(id) {
    if (!confirm("Supprimer ?")) return;
    AppState.meals = AppState.meals.filter(m => m.id != id);
    await GitHubAPI.saveFile('plats_frequents.json', AppState.meals, "Remove meal");
    renderMealsLibrary();
};

window.addMealToJournalFromLibrary = function(id) {
    window.location.href = `journal.html?useMeal=${id}`;
};

window.editAliment = function(id) {
    const a = AppState.aliments.find(al => al.id === id);
    if (!a) return;
    AppState.editingAlimentId = id;
    if (document.getElementById('aliment-modal-title')) document.getElementById('aliment-modal-title').innerText = "Modifier l'Aliment";
    if (document.getElementById('a-title')) document.getElementById('a-title').value = a.title;
    if (document.getElementById('a-calories')) document.getElementById('a-calories').value = a.calories;
    if (document.getElementById('a-proteins')) document.getElementById('a-proteins').value = a.proteins;
    if (document.getElementById('a-carbs')) document.getElementById('a-carbs').value = a.carbs;
    if (document.getElementById('a-fats')) document.getElementById('a-fats').value = a.fats;
    const modal = document.getElementById('aliment-modal');
    if (modal) modal.classList.add('active');
};

window.removeAliment = async function(id) {
    if (!confirm("Supprimer cet aliment ?")) return;
    AppState.aliments = AppState.aliments.filter(a => a.id != id);
    await GitHubAPI.saveFile('aliments_frequents.json', AppState.aliments, "Remove aliment");
    renderAlimentsLibrary();
};

function initFrequentMealModal() {
    const modal = document.getElementById('meal-modal');
    const openBtn = document.getElementById('btn-new-meal');
    const form = document.getElementById('frequent-meal-form');

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            AppState.editingMealId = null;
            if (document.getElementById('meal-modal-title')) document.getElementById('meal-modal-title').innerText = "Nouveau Plat";
            if (form) form.reset();
            modal.classList.add('active');
        });
    }

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
            if (modal) modal.classList.remove('active');
            renderMealsLibrary();
        });
    }
    const closeBtn = document.getElementById('btn-close-meal-modal');
    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    const searchInput = document.getElementById('meals-search');
    if (searchInput) searchInput.addEventListener('input', (e) => renderMealsLibrary(e.target.value.toLowerCase()));
}

function initAlimentModal() {
    const modal = document.getElementById('aliment-modal');
    const openBtn = document.getElementById('btn-new-aliment');
    const form = document.getElementById('aliment-form');

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            AppState.editingAlimentId = null;
            if (document.getElementById('aliment-modal-title')) document.getElementById('aliment-modal-title').innerText = "Nouvel Aliment";
            if (form) form.reset();
            modal.classList.add('active');
        });
    }

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
            if (modal) modal.classList.remove('active');
            renderAlimentsLibrary();
        });
    }
    const closeBtn = document.getElementById('btn-close-aliment-modal');
    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

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
        const weightField = document.getElementById('weight-value');
        if (!weightField) return;
        const weight = {
            date: new Date().toISOString().split('T')[0],
            value: parseFloat(weightField.value)
        };
        const idx = AppState.weightHistory.findIndex(w => w.date === weight.date);
        if (idx !== -1) AppState.weightHistory[idx] = weight;
        else AppState.weightHistory.push(weight);
        await GitHubAPI.saveFile('poids.json', AppState.weightHistory, "Log Weight");
        renderWeightChart();
        updateDashboard();
        form.reset();
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
    if (topFoods) {
        const counts = {};
        recent.forEach(e => counts[e.title] = (counts[e.title] || 0) + 1);
        const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
        topFoods.innerHTML = sorted.length > 0 ? sorted.map(([n, c]) => `<li>${n} <span>x${c}</span></li>`).join('') : "<li>Aucune donnée récente.</li>";
    }
}

/* -------------------------------------------------------------------------- */
/*                                OFF EXPLORER                                */
/* -------------------------------------------------------------------------- */

function initOFFExplorer() {
    const btn = document.getElementById('btn-search-off');
    const input = document.getElementById('off-explorer-query');
    if (btn && input) {
        btn.addEventListener('click', async () => {
            const query = input.value.trim();
            if (!query) return;
            btn.disabled = true;
            btn.innerText = "...";
            const results = await searchOFF(query);
            AppState.lastOFFSearchResults = results;
            renderExplorerResults(results);
            btn.disabled = false;
            btn.innerText = "Rechercher";
        });
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btn.click();
        });
    }
}

async function searchOFF(query) {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10`;
    try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        const parsed = JSON.parse(data.contents);
        return parsed.products || [];
    } catch(e) {
        console.error("OFF Search error", e);
        return [];
    }
}

function renderExplorerResults(prods) {
    const grid = document.getElementById('explorer-results');
    if (!grid) return;
    if (!prods || prods.length === 0) {
        grid.innerHTML = "<div class='empty-state'>Aucun produit trouvé.</div>";
        return;
    }
    grid.innerHTML = prods.map((p, i) => `
        <div class="card product-card" onclick="showProductDetail(${i})">
            <img src="${p.image_front_small_url || 'https://world.openfoodfacts.org/images/icons/dist/packaging.svg'}" class="product-img">
            <div class="product-info">
                <h4>${p.product_name || 'Inconnu'}</h4>
                <p>${p.brands || 'Marque inconnue'}</p>
            </div>
        </div>
    `).join('');
}

window.showProductDetail = function(index) {
    const p = AppState.lastOFFSearchResults[index];
    if (!p) return;
    AppState.currentlyViewedProduct = p;
    const panel = document.getElementById('product-detail-panel');
    const content = document.getElementById('detail-content');
    if (panel && content) {
        panel.classList.add('active');
        const n = p.nutriments || {};
        content.innerHTML = `
            <img src="${p.image_front_url || 'https://world.openfoodfacts.org/images/icons/dist/packaging.svg'}" class="detail-img">
            <h3>${p.product_name || 'Inconnu'}</h3>
            <p>${p.brands || ''}</p>
            <div class="detail-macros">
                <div class="detail-macro"><span>Cal</span><b>${n.calories_100g || n['energy-kcal_100g'] || 0}</b></div>
                <div class="detail-macro"><span>Prot</span><b>${n.proteins_100g || 0}g</b></div>
                <div class="detail-macro"><span>Gluc</span><b>${n.carbohydrates_100g || 0}g</b></div>
                <div class="detail-macro"><span>Lip</span><b>${n.fat_100g || 0}g</b></div>
            </div>
            <button onclick="addToOFFCache()" class="btn-primary" style="margin-top:20px; width:100%;">⭐ Ajouter aux Favoris (Cache)</button>
        `;
        const closeBtn = document.getElementById('btn-close-detail');
        if (closeBtn) closeBtn.onclick = () => panel.classList.remove('active');
    }
};

window.addToOFFCache = async function() {
    const p = AppState.currentlyViewedProduct;
    if (!p) return;
    const n = p.nutriments || {};
    const item = {
        id: p.id || p._id || Date.now(),
        title: p.product_name || "Produit",
        calories: n.calories_100g || n['energy-kcal_100g'] || 0,
        proteins: n.proteins_100g || 0,
        carbs: n.carbohydrates_100g || 0,
        fats: n.fat_100g || 0
    };
    AppState.offCache.push(item);
    await GitHubAPI.saveFile('produits_cache.json', AppState.offCache, "Add to cache");
    alert("Produit ajouté aux favoris.");
};

/* -------------------------------------------------------------------------- */
/*                                  SETTINGS                                  */
/* -------------------------------------------------------------------------- */

function initSettings() {
    const saveBtn = document.getElementById('btn-save-settings');
    const statusMsg = document.getElementById('settings-status');
    if (!saveBtn) return;
    
    if (document.getElementById('gh-user')) document.getElementById('gh-user').value = localStorage.getItem('gh_user') || '';
    if (document.getElementById('gh-repo')) document.getElementById('gh-repo').value = localStorage.getItem('gh_repo') || '';
    if (document.getElementById('gh-token')) document.getElementById('gh-token').value = localStorage.getItem('gh_token') || '';

    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.innerText = "Vérification...";
        
        const user = document.getElementById('gh-user').value.trim();
        const repo = document.getElementById('gh-repo').value.trim();
        const token = document.getElementById('gh-token').value.trim();

        localStorage.setItem('gh_user', user);
        localStorage.setItem('gh_repo', repo);
        localStorage.setItem('gh_token', token);

        // Simple feedback
        if (statusMsg) {
            statusMsg.innerText = "Accès enregistrés ! Synchronisation en cours...";
            statusMsg.classList.add('active', 'success');
            setTimeout(() => statusMsg.classList.remove('active', 'success'), 3000);
        }
        
        await initApp();
        saveBtn.disabled = false;
        saveBtn.innerText = "Enregistrer";
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
