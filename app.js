/**
 * SPOCK - Logic Layer
 * V1.2 - Professional Meal Form (Basket System)
 */

const AppState = {
    user: { name: "Frugman", goal: 1600, protGoal: 120 },
    journal: [],
    meals: [],
    aliments: [],
    ciqual: [], // Local database
    weightHistory: [],
    offCache: [],
    lastOFFSearchResults: [],
    currentBasket: [], // [{ title, calories, proteins, carbs, fats, quantity, unit }]
    editingJournalId: null
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

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navItems.forEach(item => {
        const link = item.querySelector('a');
        if (link && link.getAttribute('href') === currentPath) item.classList.add('active');
        else item.classList.remove('active');
    });
}

async function initApp() {
    // 1. Load Local CIQUAL Database (Essential for search, regardless of Git)
    try {
        const ciqualRes = await fetch('./ciqual.json').then(r => r.json()).catch(() => []);
        AppState.ciqual = Array.isArray(ciqualRes) ? ciqualRes : [];
        console.log("🍏 CIQUAL Loaded:", AppState.ciqual.length, "items");
    } catch (e) {
        console.error("CIQUAL Fetch Error:", e);
    }

    // 2. Load GitHub Data (Only if configured)
    if (!GitHubAPI.isConfigured()) return;
    try {
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

        updateDashboard();
        renderJournalTimeline();
        renderWeightChart();
        renderWeightHistory();
        renderMealsLibrary();
        renderAlimentsLibrary();
        renderReport();
        
    } catch (error) { console.error("Sync Error:", error); }
}

/* -------------------------------------------------------------------------- */
/*                               DASHBOARD & UI                               */
/* -------------------------------------------------------------------------- */

function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = AppState.journal.filter(e => e.date === today);
    const totalCals = Math.round(todayEntries.reduce((s, e) => s + (e.calories || 0), 0));
    const totalProt = Math.round(todayEntries.reduce((s, e) => s + (e.proteins || 0), 0));

    const calFill = document.getElementById('cal-fill');
    if (calFill) {
        document.getElementById('cal-count').innerText = `${totalCals} / ${AppState.user.goal} kcal`;
        calFill.style.width = `${Math.min((totalCals / AppState.user.goal) * 100, 100)}%`;
    }
    const protFill = document.getElementById('prot-fill');
    if (protFill) {
        document.getElementById('prot-count').innerText = `${totalProt} / ${AppState.user.protGoal}g`;
        protFill.style.width = `${Math.min((totalProt / AppState.user.protGoal) * 100, 100)}%`;
    }

    if (AppState.weightHistory.length > 0) {
        const lastW = AppState.weightHistory[AppState.weightHistory.length - 1];
        const el = document.getElementById('last-weight');
        if (el) el.innerText = `${lastW.value} kg`;
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

    // Group by date
    const grouped = {};
    AppState.journal.forEach(e => {
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e);
    });

    container.innerHTML = Object.keys(grouped).sort().reverse().map(date => `
        <div class="day-group">
            <h3 class="day-title">${date === new Date().toISOString().split('T')[0] ? "Aujourd'hui" : date}</h3>
            ${grouped[date].map(e => `
                <div class="timeline-entry">
                    <div class="entry-header">
                        <span class="entry-title">${e.type || 'Repas'} : ${e.title || 'Sans titre'}</span>
                        <div style="display:flex; gap: 8px;">
                            <button onclick="editJournalEntry(${e.id})" class="btn-icon">✏️</button>
                            <button onclick="deleteJournalEntry(${e.id})" class="btn-icon">🗑️</button>
                        </div>
                    </div>
                    <div class="entry-content">
                        ${e.photo ? `<img src="data:image/jpeg;base64,${e.photo}" class="entry-img">` : '<div class="entry-img-placeholder">🍽️</div>'}
                        <div class="entry-details">
                            <div class="entry-macros">
                                <span class="macro-tag">🔥 ${Math.round(e.calories)} kcal</span>
                                <span class="macro-tag">🥩 ${Math.round(e.proteins)}g Prot</span>
                            </div>
                            <ul class="entry-items-list" style="font-size:0.8rem; color:var(--text-secondary); list-style:none; padding:0; margin-top:8px;">
                                ${(e.items || []).map(it => `<li>- ${it.title} (${it.quantity}${it.unit === 'portion' ? ' port.' : (it.unit||'g')})</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

window.deleteJournalEntry = async function(id) {
    if (!confirm("Effacer ce repas ?")) return;
    AppState.journal = AppState.journal.filter(e => e.id != id);
    await GitHubAPI.saveFile('journal.json', AppState.journal, null, "Delete meal");
    renderJournalTimeline();
    updateDashboard();
};

/* -------------------------------------------------------------------------- */
/*                            MEAL BASKET MODAL                               */
/* -------------------------------------------------------------------------- */

function initMealModal() {
    const modal = document.getElementById('entry-modal');
    if (!modal) return;

    const openBtn = document.getElementById('btn-add-entry');
    const closeBtn = document.getElementById('btn-close-modal');
    const saveBtn = document.getElementById('btn-save-full-meal');
    const btnAddManual = document.getElementById('btn-add-manual');
    if (btnAddManual) {
        btnAddManual.onclick = () => {
            const title = document.getElementById('manual-title').value;
            const cal = parseFloat(document.getElementById('manual-cal').value);
            const prot = parseFloat(document.getElementById('manual-prot').value || 0);
            const qty = parseFloat(document.getElementById('manual-qty').value || 100);
            if (!title || isNaN(cal)) { alert("Nom et Calories requis"); return; }
            AppState.currentBasket.push({ title, calories: cal, proteins: prot, carbs: 0, fats: 0, quantity: qty, unit: 'g' });
            document.getElementById('manual-entry-form').style.display = 'none';
            renderBasket();
        };
    }

    if (openBtn) {
        openBtn.onclick = () => {
            resetBasket();
            modal.classList.add('active');
        };
    }
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');

    // Reset Basket
    function resetBasket() {
        AppState.currentBasket = [];
        AppState.editingJournalId = null;
        document.getElementById('meal-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('meal-type').value = "Déjeuner";
        document.getElementById('preview-img').src = "#";
        document.getElementById('preview-img').classList.remove('active');
        document.getElementById('upload-prompt').style.display = 'block';
        renderBasket();
    }

    // Render Basket
    window.renderBasket = function() {
        const list = document.getElementById('meal-basket-list');
        const empty = list.querySelector('.empty-state');
        
        let html = "";
        let totCal = 0, totProt = 0, totCarb = 0, totFat = 0;

        AppState.currentBasket.forEach((item, index) => {
            const divisor = (item.unit === '100g') ? 100 : 1;
            const itemCal = (item.calories * item.quantity) / divisor;
            const itemProt = (item.proteins * item.quantity) / divisor;
            const itemCarb = (item.carbs * item.quantity) / divisor;
            const itemFat = (item.fats * item.quantity) / divisor;

            totCal += itemCal;
            totProt += itemProt;
            totCarb += itemCarb;
            totFat += itemFat;

            html += `
                <div class="basket-item" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:6px; margin-bottom:5px; font-size:0.9rem;">
                    <div style="flex:1;">
                        <div style="font-weight:600;">${item.title}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">
                            <input type="number" value="${item.quantity}" onchange="updateBasketQty(${index}, this.value)" style="width:50px; background:transparent; border:1px solid var(--card-border); color:white; border-radius:4px; padding:2px; text-align:center;"> 
                            ${item.unit === 'portion' ? 'portion(s)' : (item.unit || 'g')} 
                            • ${Math.round(itemCal)} kcal
                        </div>
                    </div>
                    <button onclick="removeFromBasket(${index})" class="btn-icon" style="color:var(--danger-color); padding:5px;">🗑️</button>
                </div>
            `;
        });

        list.innerHTML = html || "<div class='empty-state' style='font-size: 0.8rem;'>Aucun aliment ajouté.</div>";
        document.getElementById('total-cal').innerText = Math.round(totCal);
        document.getElementById('total-prot').innerText = Math.round(totProt) + "g";
        document.getElementById('total-carbs').innerText = Math.round(totCarb) + "g";
        document.getElementById('total-fats').innerText = Math.round(totFat) + "g";
    };

    window.updateBasketQty = (index, val) => {
        AppState.currentBasket[index].quantity = parseFloat(val) || 0;
        renderBasket();
    };

    window.removeFromBasket = (index) => {
        AppState.currentBasket.splice(index, 1);
        renderBasket();
    };

    // Favorites Selection
    const btnMeals = document.getElementById('btn-fav-meals');
    const btnAliments = document.getElementById('btn-fav-aliments');
    const selectionList = document.getElementById('selection-list');

    function showFavOverlay(type) {
        const items = type === 'meals' ? AppState.meals : AppState.aliments;
        selectionList.innerHTML = items.map(it => `
            <div class="fav-item" onclick='addToBasket(${JSON.stringify(it).replace(/'/g, "&apos;")})'>
                <strong>${it.title}</strong>
                <small>${it.calories} kcal / ${it.unit || 'portion'}</small>
            </div>
        `).join('');
        selectionList.style.display = 'block';
    }

    if (btnMeals) btnMeals.onclick = () => showFavOverlay('meals');
    if (btnAliments) btnAliments.onclick = () => showFavOverlay('aliments');

    window.addToBasket = (item) => {
        AppState.currentBasket.push({ ...item, quantity: (item.unit === 'portion' || item.unit === 'unité' ? 1 : 100) });
        selectionList.style.display = 'none';
        renderBasket();
        const offResults = document.getElementById('off-results');
        if (offResults) offResults.classList.remove('active');
    };

    // Local CIQUAL Search
    const offInput = document.getElementById('off-search');
    if (offInput) {
        offInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) return;
            const prods = await searchCIQUAL(query);
            const resBox = document.getElementById('off-results');
            resBox.innerHTML = prods.map(p => {
                const item = { ...p, unit: '100g' };
                return `<li onclick='addToBasket(${JSON.stringify(item).replace(/'/g, "&apos;")})' style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1); cursor:pointer;">
                    <strong>${item.title}</strong><br>
                    <small style="color:var(--text-secondary);">${item.calories} kcal • P:${item.proteins}g G:${item.carbs}g L:${item.fats}g</small>
                </li>`;
            }).join('');
            resBox.classList.add('active');
        }, 300));
    }

    // Photo Handling
    const imgZone = document.getElementById('img-zone');
    const photoInput = document.getElementById('meal-photo');
    if (imgZone && photoInput) {
        imgZone.onclick = () => photoInput.click();
        photoInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const preview = document.getElementById('preview-img');
                    preview.src = re.target.result;
                    preview.classList.add('active');
                    document.getElementById('upload-prompt').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // Final Save
    if (saveBtn) {
        saveBtn.onclick = async () => {
            if (AppState.currentBasket.length === 0) { alert("Le panier est vide !"); return; }
            
            const photoInput = document.getElementById('meal-photo');
            let photoBase64 = null;
            if (photoInput && photoInput.files[0]) {
                photoBase64 = await compressImage(photoInput.files[0]);
            } else if (AppState.editingJournalId) {
                const old = AppState.journal.find(e => e.id == AppState.editingJournalId);
                if (old) photoBase64 = old.photo;
            }

            // Calculate overall macros
            let totalCal = 0, totalProt = 0, totalCarb = 0, totalFat = 0;
            AppState.currentBasket.forEach(it => {
                const div = (it.unit === '100g') ? 100 : 1;
                totalCal += (it.calories * it.quantity) / div;
                totalProt += (it.proteins * it.quantity) / div;
                totalCarb += (it.carbs * it.quantity) / div;
                totalFat += (it.fats * it.quantity) / div;
            });

            const entry = {
                id: AppState.editingJournalId || Date.now(),
                date: document.getElementById('meal-date').value,
                type: document.getElementById('meal-type').value,
                title: AppState.currentBasket.length > 1 ? `${AppState.currentBasket[0].title} + ${AppState.currentBasket.length-1} items` : AppState.currentBasket[0].title,
                items: [...AppState.currentBasket],
                calories: totalCal,
                proteins: totalProt,
                carbs: totalCarb,
                fats: totalFat,
                photo: photoBase64
            };

            if (AppState.editingJournalId) {
                const idx = AppState.journal.findIndex(e => e.id == AppState.editingJournalId);
                if (idx !== -1) AppState.journal[idx] = entry;
            } else {
                AppState.journal.unshift(entry);
            }

            saveBtn.disabled = true;
            saveBtn.innerText = "Synchronisation...";
            await GitHubAPI.saveFile('journal.json', AppState.journal, null, "Save multi-item meal");
            modal.classList.remove('active');
            saveBtn.disabled = false;
            saveBtn.innerText = "Enregistrer le Repas";
            updateDashboard();
            renderJournalTimeline();
        };
    }
}

window.editJournalEntry = function(id) {
    const e = AppState.journal.find(en => en.id == id);
    if (!e) return;
    
    // Check if on correct page
    if (!document.getElementById('entry-modal')) {
        window.location.href = `journal.html?edit=${id}`;
        return; 
    }

    const modal = document.getElementById('entry-modal');
    modal.classList.add('active');
    
    AppState.editingJournalId = id;
    AppState.currentBasket = [...(e.items || [])];
    
    // Legacy support for single-item entries
    if (AppState.currentBasket.length === 0 && e.calories) {
        AppState.currentBasket = [{ title: e.title, calories: e.calories, proteins: e.proteins, carbs: e.carbs, fats: e.fats, quantity: e.quantity || 100, unit: e.unit || 'g' }];
    }

    document.getElementById('meal-date').value = e.date;
    document.getElementById('meal-type').value = e.type || "Déjeuner";
    
    if (e.photo) {
        const preview = document.getElementById('preview-img');
        preview.src = `data:image/jpeg;base64,${e.photo}`;
        preview.classList.add('active');
        document.getElementById('upload-prompt').style.display = 'none';
    }
    renderBasket();
};

/* -------------------------------------------------------------------------- */
/*                                LIBRARY & OFF                               */
/* -------------------------------------------------------------------------- */

function renderMealsLibrary(searchTerm = "") {
    const container = document.getElementById('meals-grid');
    if (!container) return;
    container.innerHTML = AppState.meals.filter(m => !searchTerm || m.title.toLowerCase().includes(searchTerm)).map(m => `
        <div class="card meal-card">
            <header style="display:flex; justify-content:space-between;"><strong>${m.title}</strong>
            <div style="display:flex; gap: 4px;"><button onclick="editFrequentMeal(${m.id})" class="btn-icon">✏️</button><button onclick="removeFrequentMeal(${m.id})" class="btn-icon">🗑️</button></div></header>
            <div class="entry-macros"><span class="macro-tag">🔥 ${m.calories} (Plat)</span></div>
            <button onclick="addMealToJournalFromLibrary(${m.id})" class="btn-primary" style="margin-top:10px; width:100%;">Ajouter</button>
        </div>
    `).join('');
}

window.addMealToJournalFromLibrary = function(id) {
    const m = AppState.meals.find(ml => ml.id == id);
    if (!m) return;
    if (!document.getElementById('entry-modal')) { window.location.href = `journal.html?useMeal=${id}`; return; }
    document.getElementById('entry-modal').classList.add('active');
    window.addToBasket(m);
};

function renderAlimentsLibrary(searchTerm = "") {
    const container = document.getElementById('aliments-grid');
    if (!container) return;
    container.innerHTML = AppState.aliments.filter(a => !searchTerm || a.title.toLowerCase().includes(searchTerm)).map(a => `
        <div class="card meal-card">
            <header style="display:flex; justify-content:space-between;"><strong>${a.title}</strong>
            <div style="display:flex; gap: 4px;"><button onclick="editAliment(${a.id})" class="btn-icon">✏️</button><button onclick="removeAliment(${a.id})" class="btn-icon">🗑️</button></div></header>
            <div class="entry-macros"><span class="macro-tag">🔥 ${a.calories} / ${a.unit || '100g'}</span></div>
            <button onclick="addAlimentToJournalFromLibrary(${a.id})" class="btn-secondary" style="margin-top:10px; width:100%;">Ajouter</button>
        </div>
    `).join('');
}

window.addAlimentToJournalFromLibrary = function(id) {
    const a = AppState.aliments.find(al => al.id == id);
    if (!a) return;
    if (!document.getElementById('entry-modal')) { window.location.href = `journal.html?useAliment=${id}`; return; }
    document.getElementById('entry-modal').classList.add('active');
    window.addToBasket(a);
};

// ... Rest of Library Modals & OFF logic (identical but updated calls) ...

function initFrequentMealModal() {
    const modal = document.getElementById('meal-modal');
    const form = document.getElementById('frequent-meal-form');
    if (document.getElementById('btn-new-meal')) document.getElementById('btn-new-meal').onclick = () => { AppState.editingMealId = null; form.reset(); modal.classList.add('active'); };
    if (form) form.onsubmit = async (e) => {
        e.preventDefault();
        const data = { id: AppState.editingMealId || Date.now(), title: document.getElementById('f-meal-title').value, calories: parseFloat(document.getElementById('f-meal-calories').value), proteins: parseFloat(document.getElementById('f-meal-proteins').value), carbs: parseFloat(document.getElementById('f-meal-carbs').value), fats: parseFloat(document.getElementById('f-meal-fats').value), unit: 'portion' };
        if (AppState.editingMealId) { const idx = AppState.meals.findIndex(m => m.id === AppState.editingMealId); if (idx !== -1) AppState.meals[idx] = data; }
        else AppState.meals.push(data);
        await GitHubAPI.saveFile('plats_frequents.json', AppState.meals, null, "Update Library");
        modal.classList.remove('active'); renderMealsLibrary();
    };
    if (document.getElementById('btn-close-meal-modal')) document.getElementById('btn-close-meal-modal').onclick = () => modal.classList.remove('active');
}

function initAlimentModal() {
    const modal = document.getElementById('aliment-modal');
    const form = document.getElementById('aliment-form');
    if (document.getElementById('btn-new-aliment')) document.getElementById('btn-new-aliment').onclick = () => { AppState.editingAlimentId = null; form.reset(); modal.classList.add('active'); };
    if (form) form.onsubmit = async (e) => {
        e.preventDefault();
        const data = { id: AppState.editingAlimentId || Date.now(), title: document.getElementById('a-title').value, calories: parseFloat(document.getElementById('a-calories').value), proteins: parseFloat(document.getElementById('a-proteins').value), carbs: parseFloat(document.getElementById('a-carbs').value), fats: parseFloat(document.getElementById('a-fats').value), unit: document.getElementById('a-unit').value };
        if (AppState.editingAlimentId) { const idx = AppState.aliments.findIndex(a => a.id === AppState.editingAlimentId); if (idx !== -1) AppState.aliments[idx] = data; }
        else AppState.aliments.push(data);
        await GitHubAPI.saveFile('aliments_frequents.json', AppState.aliments, null, "Update Aliments");
        modal.classList.remove('active'); renderAlimentsLibrary();
    };
    if (document.getElementById('btn-close-aliment-modal')) document.getElementById('btn-close-aliment-modal').onclick = () => modal.classList.remove('active');
}

/* -------------------------------------------------------------------------- */
/*                                WEIGHT & EXPLORER                           */
/* -------------------------------------------------------------------------- */

function initWeightForm() {
    const btnSave = document.getElementById('btn-save-weight');
    const inputWeight = document.getElementById('new-weight');
    if (btnSave && inputWeight) {
        btnSave.onclick = async () => {
            const val = parseFloat(inputWeight.value);
            if (isNaN(val)) return;
            const w = { date: new Date().toISOString().split('T')[0], value: val };
            const idx = AppState.weightHistory.findIndex(wh => wh.date === w.date);
            if (idx !== -1) AppState.weightHistory[idx] = w; else AppState.weightHistory.push(w);
            await GitHubAPI.saveFile('poids.json', AppState.weightHistory, null, "Log Weight");
            renderWeightChart(); updateDashboard(); inputWeight.value = "";
        };
    }
}

function renderWeightHistory() {
    const list = document.getElementById('weight-list');
    if (!list) return;
    if (AppState.weightHistory.length === 0) {
        list.innerHTML = "<div class='empty-state'>Aucun historique.</div>";
        return;
    }
    list.innerHTML = AppState.weightHistory.slice().reverse().map(w => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>${w.date}</span>
            <strong>${w.value} kg</strong>
        </div>
    `).join('');
}

function renderWeightChart() {
    const ctx = document.getElementById('weightChart');
    if (!ctx || AppState.weightHistory.length === 0) return;
    const labels = AppState.weightHistory.slice(-10).map(w => w.date);
    const data = AppState.weightHistory.slice(-10).map(w => w.value);
    if (window.weightChartInstance) window.weightChartInstance.destroy();
    window.weightChartInstance = new Chart(ctx, { 
        type: 'line', 
        data: { 
            labels, 
            datasets: [{ 
                label: 'kg', 
                data, 
                borderColor: '#238636', 
                tension: 0.4, 
                fill: true, 
                backgroundColor: 'rgba(35, 134, 54, 0.1)' 
            }] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                x: { display: false }, 
                y: { ticks: { color: '#848d97' } } 
            }, 
            plugins: { legend: { display: false } } 
        } 
    });
}

function initOFFExplorer() {
    const input = document.getElementById('off-explorer-search');
    const resultsGrid = document.getElementById('off-explorer-results');
    
    if (input && resultsGrid) {
        input.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) return;
            const res = await searchCIQUAL(query);
            AppState.lastOFFSearchResults = res;
            resultsGrid.innerHTML = (res || []).map((p, i) => `
                <div class="card product-card" onclick="showProductDetail(${i})">
                    <div class="product-info">
                        <strong>${p.title}</strong>
                        <div class="macro-tag" style="margin-top:5px; color:var(--accent-color);">🔥 ${p.calories} kcal / 100g</div>
                    </div>
                </div>
            `).join('');
        }, 300));
    }
}

async function searchCIQUAL(query) {
    if (!query) return [];
    console.log("Searching CIQUAL for:", query);
    
    // Normalization to handle accents (e.g., "pate" matches "Pâté")
    const normalize = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const q = normalize(query);
    
    const results = AppState.ciqual.filter(it => normalize(it.title).includes(q));
    
    return results.sort((a, b) => {
        const aTitle = normalize(a.title);
        const bTitle = normalize(b.title);
        const aStart = aTitle.startsWith(q);
        const bStart = bTitle.startsWith(q);
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        return a.title.length - b.title.length;
    }).slice(0, 50);
}

function renderExplorerResults(prods) {
    const grid = document.getElementById('explorer-results');
    if (!grid) return;
    grid.innerHTML = (prods || []).map((p, i) => `
        <div class="card product-card" onclick="showProductDetail(${i})">
            <div class="product-info">
                <h4>${p.title}</h4>
                <div class="macro-tag" style="margin-top:5px;">🔥 ${p.calories} kcal / 100g</div>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:5px;">
                    P: ${p.proteins}g | G: ${p.carbs}g | L: ${p.fats}g
                </div>
            </div>
        </div>
    `).join('');
}

window.showProductDetail = function(i) {
    const p = AppState.lastOFFSearchResults[i]; if (!p) return;
    const panel = document.getElementById('product-detail-panel');
    const content = document.getElementById('detail-content');
    if (panel && content) {
        panel.classList.add('active');
        content.innerHTML = `
            <h3>${p.title}</h3>
            <p style="color:var(--text-secondary); margin-bottom:15px;">Valeurs nutritionnelles moyennes pour 100g</p>
            <div class="detail-macros">
                <div class="detail-macro"><span>Cal</span><b>${p.calories}</b></div>
                <div class="detail-macro"><span>Prot</span><b>${p.proteins}g</b></div>
                <div class="detail-macro"><span>Gluc</span><b>${p.carbs}g</b></div>
                <div class="detail-macro"><span>Lip</span><b>${p.fats}g</b></div>
            </div>
            <button onclick="addToOFFCacheFast(${i})" class="btn-primary" style="width:100%; margin-top:20px;">⭐ Ajouter aux Favoris</button>
        `;
        document.getElementById('btn-close-detail').onclick = () => panel.classList.remove('active');
    }
};

window.addToOFFCacheFast = async function(i) {
    const p = AppState.lastOFFSearchResults[i]; if (!p) return;
    AppState.aliments.push({ ...p, id: Date.now(), unit: '100g' });
    await GitHubAPI.saveFile('aliments_frequents.json', AppState.aliments, null, "Cache CIQUAL");
    alert("Ajouté à la bibliothèque !");
};

/* -------------------------------------------------------------------------- */
/*                                  SETTINGS                                  */
/* -------------------------------------------------------------------------- */

function initSettings() {
    const saveBtn = document.getElementById('btn-save-settings');
    if (!saveBtn) return;
    ['gh-user', 'gh-repo', 'gh-token'].forEach(id => { const el = document.getElementById(id); if (el) el.value = localStorage.getItem(id.replace('-', '_')) || ''; });
    saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        const u = document.getElementById('gh-user').value.trim();
        const r = document.getElementById('gh-repo').value.trim();
        const t = document.getElementById('gh-token').value.trim();
        localStorage.setItem('gh_user', u); localStorage.setItem('gh_repo', r); localStorage.setItem('gh_token', t);
        const st = document.getElementById('settings-status');
        if (st) { st.innerText = "Enregistré !"; st.classList.add('active', 'success'); setTimeout(() => st.classList.remove('active'), 3000); }
        await initApp(); saveBtn.disabled = false;
    };
}

function renderReport() {
    const ctx = document.getElementById('caloriesChart');
    if (!ctx) return;
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const recentEntries = AppState.journal.filter(e => e.date >= thirtyDaysAgo);
    
    // Group by date
    const dailyCals = {};
    recentEntries.forEach(e => {
        dailyCals[e.date] = (dailyCals[e.date] || 0) + (e.calories || 0);
    });
    
    const labels = Object.keys(dailyCals).sort();
    const data = labels.map(l => dailyCals[l]);
    
    if (window.caloriesChartInstance) window.caloriesChartInstance.destroy();
    window.caloriesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Calories',
                data,
                backgroundColor: 'rgba(35, 134, 54, 0.5)',
                borderColor: '#238636',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { color: '#848d97' } },
                x: { ticks: { color: '#848d97' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    const avg = document.getElementById('avg-calories'); 
    if (avg) {
        const days = labels.length || 1;
        const total = data.reduce((s,v) => s+v, 0);
        avg.innerText = `${Math.round(total / days)} kcal/j`;
    }
}

function debounce(f, w) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), w); }; }
async function compressImage(f) { return new Promise(res => { const r = new FileReader(); r.readAsDataURL(f); r.onload = e => { const i = new Image(); i.src = e.target.result; i.onload = () => { const c = document.createElement('canvas'); const ctx = c.getContext('2d'); c.width = 400; c.height = (i.height*400)/i.width; ctx.drawImage(i, 0, 0, 400, c.height); res(c.toDataURL('image/jpeg', 0.6).split(',')[1]); }; }; }); }
