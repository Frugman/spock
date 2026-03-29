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
    editingJournalId: null,
    editingMealId: null,
    editingAlimentId: null
};

/* -------------------------------------------------------------------------- */
/*                                GLOBAL ACTIONS                               */
/* -------------------------------------------------------------------------- */

window.editJournalEntry = function(id) {
    console.log("✏️ Editing Journal Entry:", id);
    const entry = AppState.journal.find(e => e.id == id);
    if (!entry) return;
    AppState.editingJournalId = id;
    AppState.currentBasket = [...(entry.items || [])];
    const modal = document.getElementById('entry-modal');
    if (modal) {
        document.getElementById('meal-date').value = entry.date;
        document.getElementById('meal-type').value = entry.type;
        renderBasket();
        modal.classList.add('active');
    }
};

window.editFrequentMeal = function(id) {
    console.log("✏️ Editing Frequent Meal:", id);
    const meal = AppState.meals.find(m => m.id == id);
    if (!meal) return;
    const modal = document.getElementById('meal-modal');
    if (!modal) return;
    AppState.editingMealId = id;
    document.getElementById('f-meal-title').value = meal.title || "";
    document.getElementById('f-meal-calories').value = meal.calories || 0;
    document.getElementById('f-meal-proteins').value = meal.proteins || 0;
    document.getElementById('f-meal-carbs').value = meal.carbs || 0;
    document.getElementById('f-meal-fats').value = meal.fats || 0;
    document.getElementById('f-meal-unit').value = meal.unit || 'unité';
    document.getElementById('f-meal-weight').value = meal.weight || 0;
    toggleMealWeightInput();
    modal.classList.add('active');
};

window.editAliment = function(id) {
    console.log("✏️ Editing Aliment:", id);
    const ali = AppState.aliments.find(a => a.id == id);
    if (!ali) return;
    const modal = document.getElementById('aliment-modal');
    if (!modal) return;
    AppState.editingAlimentId = id;
    document.getElementById('a-title').value = ali.title || "";
    document.getElementById('a-calories').value = ali.calories || 0;
    document.getElementById('a-proteins').value = ali.proteins || 0;
    document.getElementById('a-carbs').value = ali.carbs || 0;
    document.getElementById('a-fats').value = ali.fats || 0;
    document.getElementById('a-unit').value = ali.unit || '100g';
    document.getElementById('a-weight').value = ali.weight || 0;
    toggleWeightInput();
    modal.classList.add('active');
};

window.toggleWeightInput = function() {
    const unit = document.getElementById('a-unit').value;
    const group = document.getElementById('a-weight-group');
    if (group) group.style.display = (unit === 'unité' || unit === 'portion') ? 'block' : 'none';
};

window.toggleMealWeightInput = function() {
    const unit = document.getElementById('f-meal-unit').value;
    const group = document.getElementById('f-meal-weight-group');
    if (group) group.style.display = (unit === 'unité' || unit === 'portion') ? 'block' : 'none';
};

window.removeFrequentMeal = async function(id) {
    if (!confirm("Supprimer ce plat favori ?")) return;
    AppState.meals = AppState.meals.filter(m => m.id != id);
    await GitHubAPI.saveFile('plats_frequents.json', AppState.meals, null, "Remove Meal");
    renderMealsLibrary();
};

window.removeAliment = async function(id) {
    if (!confirm("Supprimer cet ingrédient favori ?")) return;
    AppState.aliments = AppState.aliments.filter(a => a.id != id);
    await GitHubAPI.saveFile('aliments_frequents.json', AppState.aliments, null, "Remove Aliment");
    renderAlimentsLibrary();
};

const UnitConversions = {
    'g': 1,
    '100g': 100,
    'kg': 1000,
    'ml': 1,
    'cl': 10,
    'l': 1000,
    'cs': 15,
    'cuillère à soupe': 15,
    'cc': 5,
    'cuillère à café': 5,
    'tasse': 250,
    'verre': 200,
    'bol': 500,
    'unité': 1,
    'portion': 1,
    'sachet': 1,
    'pot': 1,
    'tranche': 1,
    'oeuf': 1,
    'boule': 1
};

function getDivisor(unitStr, item = null) {
    if (!unitStr) return 1;
    const u = unitStr.toLowerCase().trim();
    
    // Priority 1: Item-specific weight
    if (item && item.weight) return item.weight;
    
    // Priority 2: Standard conversions
    if (UnitConversions[u]) return UnitConversions[u];
    
    // Priority 3: Extract numeric g (ex: "210g")
    const gMatch = u.match(/^(\d+(?:\.\d+)?)\s*g$/);
    if (gMatch) return parseFloat(gMatch[1]);

    // Priority 4: Partial matches
    if (u.includes('cs')) return 15;
    if (u.includes('cc')) return 5;
    if (u.includes('100g')) return 100;
    
    return 1;
}

document.addEventListener('DOMContentLoaded', () => {
    // Load Goals from LocalStorage immediately
    const savedGoal = localStorage.getItem('target_cal');
    if (savedGoal) AppState.user.goal = parseInt(savedGoal);

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
        const href = item.getAttribute('href');
        if (href === currentPath) item.classList.add('active');
        else item.classList.remove('active');
    });
}

async function initApp() {
    // 1. Load Local CIQUAL Database
    try {
        const ciqualRes = await fetch('./ciqual.json').then(r => r.json()).catch(() => []);
        AppState.ciqual = Array.isArray(ciqualRes) ? ciqualRes : [];
        console.log("🍏 CIQUAL Loaded:", AppState.ciqual.length, "items");
    } catch (e) {
        console.error("CIQUAL Fetch Error:", e);
    }

    // Initial UI Render (even with empty/local data)
    updateDashboard();
    renderJournalTimeline();
    renderWeightChart();
    renderWeightHistory();
    renderMealsLibrary();
    renderAlimentsLibrary();
    renderReport();

    // 2. Load GitHub Data
    if (!GitHubAPI.isConfigured()) {
        console.log("⚠️ GitHub not configured. Offline mode.");
        return;
    }

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

        // Update UI with remote data
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
    const summary = document.getElementById('today-summary');
    if (summary) {
        summary.innerText = GitHubAPI.isConfigured() ? "Session synchronisée" : "Mode Local (Config GitHub requise)";
    }

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

    const totalGluc = Math.round(todayEntries.reduce((s, e) => s + (e.carbs || 0), 0));
    const glucFill = document.getElementById('gluc-fill');
    if (glucFill) {
        const goal = 240; // Gluc target
        const countEl = document.getElementById('gluc-count');
        if (countEl) countEl.innerText = `${totalGluc} / ${goal}g`;
        glucFill.style.width = `${Math.min((totalGluc / goal) * 100, 100)}%`;
    }

    const totalLip = Math.round(todayEntries.reduce((s, e) => s + (e.fats || 0), 0));
    const lipFill = document.getElementById('lip-fill');
    if (lipFill) {
        const goal = 70; // Lip target
        const countEl = document.getElementById('lip-count');
        if (countEl) countEl.innerText = `${totalLip} / ${goal}g`;
        lipFill.style.width = `${Math.min((totalLip / goal) * 100, 100)}%`;
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
        container.innerHTML = "<div class='empty-state'>Aucun log pour le moment.</div>";
        return;
    }

    const grouped = {};
    AppState.journal.forEach(e => {
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e);
    });

    container.innerHTML = Object.keys(grouped).sort().reverse().map(date => `
        <div class="day-group">
            <h3 class="day-title">${date === new Date().toISOString().split('T')[0] ? "Aujourd'hui" : date}</h3>
            ${grouped[date].map(e => {
                const totalMacros = (e.proteins || 0) + (e.carbs || 0) + (e.fats || 0) || 1;
                const pPct = Math.round(((e.proteins || 0) / totalMacros) * 100);
                const gPct = Math.round(((e.carbs || 0) / totalMacros) * 100);
                const lPct = Math.round(((e.fats || 0) / totalMacros) * 100);

                return `
                <div class="timeline-entry">
                    <div class="entry-header">
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-size:0.7rem; color:var(--accent-color); font-weight:700; text-transform:uppercase;">${e.type || 'Repas'}</span>
                            <strong>${e.title || 'Sans titre'}</strong>
                        </div>
                        <div style="display:flex; gap: 8px; align-self: flex-start;">
                            <button onclick="editJournalEntry('${e.id}')" class="btn-icon">✏️</button>
                            <button onclick="deleteJournalEntry('${e.id}')" class="btn-icon">🗑️</button>
                        </div>
                    </div>
                    
                    <div class="entry-items" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 0.8rem; color: var(--text-secondary);">
                        <ul style="list-style: none; padding-left: 5px;">
                            ${(e.items || []).map(it => `<li>• ${it.title} <span style="opacity:0.6;">(${it.quantity}${it.unit === '100g' ? 'g' : ''})</span></li>`).join('')}
                        </ul>
                    </div>

                    <div class="entry-macros" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                        <span class="macro-tag" style="background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:6px; font-size:0.75rem;">🔥 ${Math.round(e.calories)} <small>kcal</small></span>
                        <span class="macro-tag" style="background:rgba(255,165,0,0.1); padding:4px 8px; border-radius:6px; font-size:0.75rem;">🥩 ${Math.round(e.proteins)}g <small>(${pPct}%)</small></span>
                        <span class="macro-tag" style="background:rgba(0,191,255,0.1); padding:4px 8px; border-radius:6px; font-size:0.75rem;">🍞 ${Math.round(e.carbs || 0)}g <small>(${gPct}%)</small></span>
                        <span class="macro-tag" style="background:rgba(144,238,144,0.1); padding:4px 8px; border-radius:6px; font-size:0.75rem;">🥑 ${Math.round(e.fats || 0)}g <small>(${lPct}%)</small></span>
                    </div>
                </div>
            `;}).join('')}
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

    if (openBtn) {
        openBtn.onclick = () => {
            resetBasket();
            modal.classList.add('active');
        };
    }
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');

    function resetBasket() {
        AppState.currentBasket = [];
        AppState.editingJournalId = null;
        document.getElementById('meal-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('meal-type').value = "Déjeuner";
        renderBasket();
    }

    window.renderBasket = function() {
        const list = document.getElementById('meal-basket-list');
        if (!list) return;

        let html = "";
        let totCal = 0, totProt = 0, totCarb = 0, totFat = 0;

        AppState.currentBasket.forEach((item, index) => {
            const divisor = getDivisor(item.unit, item);
            const itemCal = (item.calories * item.quantity) / divisor;
            const itemProt = (item.proteins * item.quantity) / divisor;
            const itemCarb = (item.carbs * item.quantity) / divisor;
            const itemFat = (item.fats * item.quantity) / divisor;

            totCal += itemCal;
            totProt += itemProt;
            totCarb += itemCarb;
            totFat += itemFat;

            html += `
                <div class="basket-item" style="display:flex; flex-direction:column; background:rgba(255,255,255,0.05); padding:12px; border-radius:12px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <strong style="font-size:1rem; color:var(--accent-color);">${item.title}</strong>
                        <button onclick="removeFromBasket(${index})" style="background:none; border:none; color:var(--danger-color); font-size:1.2rem; cursor:pointer;">🗑️</button>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <input type="number" value="${item.quantity}" onchange="updateBasketQty(${index}, this.value)" style="flex:1; text-align:center; padding:8px; height:40px; border-radius:8px;">
                        <select onchange="updateBasketUnit(${index}, this.value)" style="flex:2; height:40px; border-radius:8px; padding:0 8px;">
                            <option value="g" ${item.unit === 'g' ? 'selected' : ''}>grammes (g)</option>
                            <option value="100g" ${item.unit === '100g' ? 'selected' : ''}>x 100g</option>
                            <option value="unité" ${item.unit === 'unité' || item.unit === 'portion' ? 'selected' : ''}>portion / unité</option>
                            <option value="cs" ${item.unit === 'cs' ? 'selected' : ''}>cuillère à soupe (CS)</option>
                            <option value="cc" ${item.unit === 'cc' ? 'selected' : ''}>cuillère à café (cc)</option>
                            <option value="verre" ${item.unit === 'verre' ? 'selected' : ''}>verre</option>
                            <option value="bol" ${item.unit === 'bol' ? 'selected' : ''}>bol</option>
                        </select>
                    </div>
                    <div style="margin-top:10px; font-size:0.85rem; color:var(--text-secondary); display:flex; justify-content:space-between;">
                        <span>${Math.round(itemCal)} kcal</span>
                        <span>P:${Math.round(itemProt)}g • G:${Math.round(itemCarb)}g • L:${Math.round(itemFat)}g</span>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html || "<div class='empty-state'>Panier vide</div>";
        document.getElementById('total-cal').innerText = Math.round(totCal);
        document.getElementById('total-prot').innerText = Math.round(totProt);
        document.getElementById('total-gluc').innerText = Math.round(totCarb);
        document.getElementById('total-lip').innerText = Math.round(totFat);

        const totalMacros = totProt + totCarb + totFat || 1;
        document.getElementById('prot-pct').innerText = `(${Math.round((totProt/totalMacros)*100)}%)`;
        document.getElementById('gluc-pct').innerText = `(${Math.round((totCarb/totalMacros)*100)}%)`;
        document.getElementById('lip-pct').innerText = `(${Math.round((totFat/totalMacros)*100)}%)`;
    };

    window.updateBasketQty = function(idx, val) {
        AppState.currentBasket[idx].quantity = parseFloat(val) || 0;
        renderBasket();
    };

    window.updateBasketUnit = function(idx, unit) {
        AppState.currentBasket[idx].unit = unit;
        renderBasket();
    };

    window.removeFromBasket = (index) => {
        AppState.currentBasket.splice(index, 1);
        renderBasket();
    };

    const favInput = document.getElementById('fav-aliments-search');
    const favResults = document.getElementById('fav-aliments-results');
    const mealInput = document.getElementById('fav-meals-search');
    const mealResults = document.getElementById('fav-meals-results');
    const offInput = document.getElementById('off-search');
    const offResults = document.getElementById('off-results');

    if (favInput) {
        favInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query.length < 2) { if (favResults) favResults.classList.add('hidden'); return; }
            const matches = AppState.aliments.filter(it => it.title.toLowerCase().includes(query));
            if (matches.length > 0 && favResults) {
                favResults.innerHTML = matches.map(it => `
                    <li onclick='addToBasket(${JSON.stringify(it).replace(/'/g, "&apos;")}, "fav")' style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;">
                        <strong>${it.title}</strong><br>
                        <small>${it.calories} kcal • ${it.unit || 'portion'}</small>
                    </li>
                `).join('');
                favResults.classList.remove('hidden');
            } else if (favResults) { favResults.classList.add('hidden'); }
        });
    }

    if (mealInput) {
        mealInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query.length < 2) { if (mealResults) mealResults.classList.add('hidden'); return; }
            const matches = AppState.meals.filter(it => it.title.toLowerCase().includes(query));
            if (matches.length > 0 && mealResults) {
                mealResults.innerHTML = matches.map(it => `
                    <li onclick='addToBasket(${JSON.stringify(it).replace(/'/g, "&apos;")}, "meal")' style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;">
                        <strong>${it.title}</strong><br>
                        <small>${it.calories} kcal / portion</small>
                    </li>
                `).join('');
                mealResults.classList.remove('hidden');
            } else if (mealResults) { mealResults.classList.add('hidden'); }
        });
    }

    window.addToBasket = (item, source = "off") => {
        AppState.currentBasket.push({ ...item, quantity: (item.unit === 'portion' || item.unit === 'unité' ? 1 : 100) });
        renderBasket();
        if (source === "fav") {
            if (favInput) favInput.value = "";
            if (favResults) favResults.classList.add('hidden');
        } else if (source === "meal") {
            if (mealInput) mealInput.value = "";
            if (mealResults) mealResults.classList.add('hidden');
        } else {
            if (offInput) offInput.value = "";
            if (offResults) offResults.classList.add('hidden');
        }
    };

    if (offInput) {
        offInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) { offResults.classList.add('hidden'); return; }
            const prods = await searchCIQUAL(query);
            if (offResults) {
                offResults.innerHTML = prods.map(p => {
                    const item = { ...p, unit: '100g' };
                    return `<li onclick='addToBasket(${JSON.stringify(item).replace(/'/g, "&apos;")}, "off")' style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;">
                        <strong>${item.title}</strong><br>
                        <small>${item.calories} kcal • Prot: ${item.proteins}g</small>
                    </li>`;
                }).join('');
                offResults.classList.remove('hidden');
            }
        }, 300));
    }

    if (saveBtn) {
        saveBtn.onclick = async () => {
            if (AppState.currentBasket.length === 0) { alert("Panier vide !"); return; }
            
            let totalCal = 0, totalProt = 0, totalCarb = 0, totalFat = 0;
            AppState.currentBasket.forEach(it => {
                const div = getDivisor(it.unit, it);
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
                fats: totalFat
            };

            if (AppState.editingJournalId) {
                const idx = AppState.journal.findIndex(e => e.id == AppState.editingJournalId);
                if (idx !== -1) AppState.journal[idx] = entry;
            } else {
                AppState.journal.unshift(entry);
            }

            saveBtn.disabled = true;
            saveBtn.innerText = "⏳...";
            await GitHubAPI.saveFile('journal.json', AppState.journal, null, "Save meal");
            modal.classList.remove('active');
            saveBtn.disabled = false;
            saveBtn.innerText = "ENREGISTRER";
            updateDashboard();
            renderJournalTimeline();
        };
    }
}

/* -------------------------------------------------------------------------- */
/*                                LIBRARY logic                               */
/* -------------------------------------------------------------------------- */

function renderMealsLibrary(searchTerm = "") {
    const list = document.getElementById('meals-list');
    if (!list) return;
    if (AppState.meals.length === 0) {
        list.innerHTML = "<div class='empty-state'>Aucun plat.</div>";
        return;
    }
    list.innerHTML = AppState.meals.map(m => `
        <div class="card" style="padding:15px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <strong>${m.title}</strong>
                <div>
                    <button onclick="editFrequentMeal('${m.id}')" class="btn-icon">✏️</button>
                    <button onclick="removeFrequentMeal('${m.id}')" class="btn-icon">🗑️</button>
                </div>
            </div>
            <div style="color:var(--accent-color); font-weight:700;">${m.calories} kcal / portion</div>
            <button onclick="addMealToJournalLibrary('${m.id}')" class="btn-primary" style="margin-top:10px; height:40px;">Ajouter</button>
        </div>
    `).join('');
}

window.addMealToJournalLibrary = async function(id) {
    const meal = AppState.meals.find(m => m.id == id);
    if (!meal) return;
    
    const div = getDivisor(meal.unit, meal);
    const entry = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        type: "Déjeuner",
        title: meal.title,
        items: [{...meal, quantity: 1, unit: meal.unit || 'portion'}],
        calories: meal.calories / div,
        proteins: (meal.proteins || 0) / div,
        carbs: (meal.carbs || 0) / div,
        fats: (meal.fats || 0) / div
    };
    
    AppState.journal.unshift(entry);
    await GitHubAPI.saveFile('journal.json', AppState.journal, null, "Add meal from library");
    renderJournalTimeline();
    updateDashboard();
    alert("Plat ajouté au journal !");
};

function renderAlimentsLibrary(searchTerm = "") {
    const list = document.getElementById('aliments-list');
    if (!list) return;
    if (AppState.aliments.length === 0) {
        list.innerHTML = "<div class='empty-state'>Aucun ingrédient.</div>";
        return;
    }
    list.innerHTML = AppState.aliments.map(a => `
        <div class="card" style="padding:15px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <strong>${a.title}</strong>
                <div>
                    <button onclick="editAliment('${a.id}')" class="btn-icon">✏️</button>
                    <button onclick="removeAliment('${a.id}')" class="btn-icon">🗑️</button>
                </div>
            </div>
            <div style="color:var(--text-secondary);">${a.calories} kcal / ${a.unit || '100g'} ${a.weight ? '('+a.weight+'g)' : ''}</div>
            <button onclick="addAlimentToJournalLibrary('${a.id}')" class="btn-primary" style="margin-top:10px; height:40px; background:var(--card-border);">Ajouter</button>
        </div>
    `).join('');
}

window.addAlimentToJournalLibrary = async function(id) {
    const ali = AppState.aliments.find(a => a.id == id);
    if (!ali) return;
    
    const div = getDivisor(ali.unit, ali);
    const qty = (div === 100) ? 100 : 1;
    const entry = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        type: "En-cas",
        title: ali.title,
        items: [{...ali, quantity: qty, unit: ali.unit || '100g'}],
        calories: (ali.calories * qty) / div,
        proteins: ((ali.proteins || 0) * qty) / div,
        carbs: ((ali.carbs || 0) * qty) / div,
        fats: ((ali.fats || 0) * qty) / div
    };
    
    AppState.journal.unshift(entry);
    await GitHubAPI.saveFile('journal.json', AppState.journal, null, "Add aliment from library");
    renderJournalTimeline();
    updateDashboard();
    alert("Ingrédient ajouté au journal !");
};

function initFrequentMealModal() {
    const modal = document.getElementById('meal-modal');
    const form = document.getElementById('frequent-meal-form');
    const openBtn = document.getElementById('btn-add-meal');

    if (openBtn) openBtn.onclick = () => { 
        AppState.editingMealId = null; 
        if (form) form.reset(); 
        document.getElementById('f-meal-unit').value = 'unité';
        toggleMealWeightInput();
        modal.classList.add('active'); 
    };
    if (form) form.onsubmit = async (e) => {
        e.preventDefault();
        const data = { 
            id: AppState.editingMealId || Date.now(), 
            title: document.getElementById('f-meal-title').value, 
            calories: parseFloat(document.getElementById('f-meal-calories').value), 
            proteins: parseFloat(document.getElementById('f-meal-proteins').value), 
            carbs: parseFloat(document.getElementById('f-meal-carbs').value), 
            fats: parseFloat(document.getElementById('f-meal-fats').value), 
            unit: document.getElementById('f-meal-unit').value,
            weight: parseFloat(document.getElementById('f-meal-weight').value) || 0
        };
        if (AppState.editingMealId) { const idx = AppState.meals.findIndex(m => m.id == AppState.editingMealId); if (idx !== -1) AppState.meals[idx] = data; }
        else AppState.meals.push(data);
        await GitHubAPI.saveFile('plats_frequents.json', AppState.meals, null, "Update Meals");
        modal.classList.remove('active'); renderMealsLibrary();
    };
    const closeBtn = document.getElementById('btn-close-meal-modal');
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
}

function initAlimentModal() {
    const modal = document.getElementById('aliment-modal');
    const form = document.getElementById('aliment-form');
    const openBtn = document.getElementById('btn-add-aliment');

    if (openBtn) openBtn.onclick = () => { 
        AppState.editingAlimentId = null; 
        if (form) form.reset(); 
        document.getElementById('a-unit').value = '100g';
        toggleWeightInput();
        modal.classList.add('active'); 
    };
    if (form) form.onsubmit = async (e) => {
        e.preventDefault();
        const data = { 
            id: AppState.editingAlimentId || Date.now(), 
            title: document.getElementById('a-title').value, 
            calories: parseFloat(document.getElementById('a-calories').value), 
            proteins: parseFloat(document.getElementById('a-proteins').value), 
            carbs: parseFloat(document.getElementById('a-carbs').value), 
            fats: parseFloat(document.getElementById('a-fats').value), 
            unit: document.getElementById('a-unit').value,
            weight: parseFloat(document.getElementById('a-weight').value) || 0
        };
        if (AppState.editingAlimentId) { const idx = AppState.aliments.findIndex(a => a.id == AppState.editingAlimentId); if (idx !== -1) AppState.aliments[idx] = data; }
        else AppState.aliments.push(data);
        await GitHubAPI.saveFile('aliments_frequents.json', AppState.aliments, null, "Update Aliments");
        modal.classList.remove('active'); renderAlimentsLibrary();
    };
    const closeBtn = document.getElementById('btn-close-aliment-modal');
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
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
            if (isNaN(val)) { alert("Poids invalide"); return; }
            const w = { date: new Date().toISOString().split('T')[0], value: val };
            const idx = AppState.weightHistory.findIndex(wh => wh.date === w.date);
            if (idx !== -1) AppState.weightHistory[idx] = w; else AppState.weightHistory.push(w);
            await GitHubAPI.saveFile('poids.json', AppState.weightHistory, null, "Log Weight");
            renderWeightChart(); renderWeightHistory(); updateDashboard(); inputWeight.value = "";
        };
    }
}

function renderWeightHistory() {
    const list = document.getElementById('weight-list');
    if (!list) return;
    if (AppState.weightHistory.length === 0) {
        list.innerHTML = "<div class='empty-state'>Aucun historique</div>";
        return;
    }
    list.innerHTML = AppState.weightHistory.slice().reverse().map(w => `
        <div style="display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>${w.date}</span>
            <strong>${w.value} kg</strong>
        </div>
    `).join('');
}

function renderWeightChart() {
    const canvas = document.getElementById('weightChart');
    if (!canvas || AppState.weightHistory.length === 0) return;
    const labels = AppState.weightHistory.slice(-10).map(w => w.date);
    const data = AppState.weightHistory.slice(-10).map(w => w.value);
    
    if (window.weightChartInstance) window.weightChartInstance.destroy();
    window.weightChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'kg',
                data,
                borderColor: '#238636',
                tension: 0.3,
                fill: true,
                backgroundColor: 'rgba(35, 134, 54, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { display: false }, y: { ticks: { color: '#848d97' } } },
            plugins: { legend: { display: false } }
        }
    });
}

function initOFFExplorer() {
    const searchInput = document.getElementById('off-explorer-search');
    const resultsGrid = document.getElementById('off-explorer-results');
    
    if (searchInput && resultsGrid) {
        searchInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) return;
            const res = await searchCIQUAL(query);
            AppState.lastOFFSearchResults = res;
            resultsGrid.innerHTML = res.map((p, i) => `
                <div class="card" onclick="showProductDetail(${i})" style="padding:15px; margin-bottom:12px; cursor:pointer;">
                    <strong>${p.title}</strong><br>
                    <small style="color:var(--accent-color);">${p.calories} kcal / 100g</small>
                </div>
            `).join('');
        }, 300));
    }
}

async function searchCIQUAL(query) {
    if (!query) return [];
    const normalize = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const q = normalize(query);
    return AppState.ciqual.filter(it => normalize(it.title).includes(q)).slice(0, 50);
}

window.showProductDetail = function(i) {
    const p = AppState.lastOFFSearchResults[i]; if (!p) return;
    const modal = document.getElementById('product-detail-panel');
    const content = document.getElementById('detail-content');
    if (modal && content) {
        modal.classList.add('active');
        content.innerHTML = `
            <h2>${p.title}</h2>
            <div class="macro-grid" style="margin:20px 0;">
                <div class="card" style="text-align:center;"><strong>Calories</strong><br>${p.calories}</div>
                <div class="card" style="text-align:center;"><strong>Protéines</strong><br>${p.proteins}g</div>
                <div class="card" style="text-align:center;"><strong>Glucides</strong><br>${p.carbs}g</div>
                <div class="card" style="text-align:center;"><strong>Lipides</strong><br>${p.fats}g</div>
            </div>
            <button onclick="addToOFFCacheFast(${i})" class="btn-primary">⭐ AJOUTER À MES INGRÉDIENTS</button>
        `;
        const closeBtn = document.getElementById('btn-close-detail');
        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
    }
};

window.addToOFFCacheFast = async function(i) {
    const p = AppState.lastOFFSearchResults[i]; if (!p) return;
    AppState.aliments.push({ ...p, id: Date.now(), unit: '100g' });
    await GitHubAPI.saveFile('aliments_frequents.json', AppState.aliments, null, "Add from BASE");
    const modal = document.getElementById('product-detail-panel');
    if (modal) modal.classList.remove('active');
    alert("Ajouté aux ingrédients !");
};

function initSettings() {
    const saveBtn = document.getElementById('btn-save-settings');
    if (saveBtn) {
        ['gh-user', 'gh-repo', 'gh-token'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = localStorage.getItem(id.replace('-', '_')) || '';
        });
        saveBtn.onclick = async () => {
            saveBtn.disabled = true;
            localStorage.setItem('gh_user', document.getElementById('gh-user').value.trim());
            localStorage.setItem('gh_repo', document.getElementById('gh-repo').value.trim());
            localStorage.setItem('gh_token', document.getElementById('gh-token').value.trim());
            alert("Configuration enregistrée !");
            await initApp();
            saveBtn.disabled = false;
        };
    }

    const saveObjBtn = document.getElementById('btn-save-objectifs');
    if (saveObjBtn) {
        const input = document.getElementById('target-cal');
        input.value = localStorage.getItem('target_cal') || 1600;
        saveObjBtn.onclick = () => {
            localStorage.setItem('target_cal', input.value);
            AppState.user.goal = parseInt(input.value);
            alert("Objectif mis à jour !");
            updateDashboard();
        };
    }
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
