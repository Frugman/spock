document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSettings();
    initMealModal();
    initWeightForm();
    initOFFExplorer();
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
 * Handle Meal Entry Modal
 */
function initMealModal() {
    const modal = document.getElementById('entry-modal');
    const openBtn = document.getElementById('btn-add-entry');
    const closeBtn = document.getElementById('btn-close-modal');
    const mealForm = document.getElementById('meal-form');
    const offSearch = document.getElementById('off-search');
    const offResults = document.getElementById('off-results');
    const photoInput = document.getElementById('meal-photo');
    const imgZone = document.getElementById('img-zone');
    const previewImg = document.getElementById('preview-img');
    const uploadPrompt = document.getElementById('upload-prompt');
    const btnBrowse = document.getElementById('btn-browse-meals');
    const selectionList = document.getElementById('meals-selection-list');

    // Open/Close
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            // Set default time to now
            const now = new Date();
            document.getElementById('meal-time').value = now.toTimeString().slice(0, 5);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            mealForm.reset();
            previewImg.classList.remove('active');
            uploadPrompt.style.display = 'block';
            selectionList.classList.remove('active');
            imgZone.classList.remove('has-image');
        });
    }

    // Browse Frequent Meals / Cache
    if (btnBrowse) {
        btnBrowse.addEventListener('click', () => {
            if (selectionList.classList.contains('active')) {
                selectionList.classList.remove('active');
                return;
            }

            let html = "";
            
            if (AppState.meals.length > 0) {
                html += "<li class='list-header'>Mes Plats</li>";
                html += AppState.meals.map(m => `<li class='meal-item' data-type='meal' data-id='${m.id}'><b>${m.title}</b> (${m.calories} kcal)</li>`).join('');
            }

            if (AppState.offCache.length > 0) {
                html += "<li class='list-header'>Favoris OFF</li>";
                html += AppState.offCache.map(p => `<li class='cache-item' data-type='cache' data-id='${p.id}'><b>${p.title}</b> (${p.calories} kcal)</li>`).join('');
            }

            selectionList.innerHTML = html || "<li>Aucun plat ou favori enregistré.</li>";
            selectionList.classList.add('active');

            // Click listener for selection
            selectionList.querySelectorAll('li').forEach(li => {
                const id = li.getAttribute('data-id');
                const type = li.getAttribute('data-type');
                if (!id) return;

                li.addEventListener('click', () => {
                    const item = type === 'meal' 
                        ? AppState.meals.find(m => m.id == id)
                        : AppState.offCache.find(p => p.id == id);

                    if (item) {
                        AppState.currentMealBaseMacros = {
                            calories: item.calories,
                            proteins: item.proteins,
                            carbs: item.carbs,
                            fats: item.fats
                        };
                        document.getElementById('meal-title').value = item.title;
                        document.getElementById('meal-qty').value = 100;
                        document.getElementById('meal-calories').value = item.calories;
                        document.getElementById('meal-proteins').value = item.proteins;
                        document.getElementById('meal-carbs').value = item.carbs;
                        document.getElementById('meal-fats').value = item.fats;
                        selectionList.classList.remove('active');
                    }
                });
            });
        });
    }

    // Photo Preview
    if (imgZone) {
        imgZone.addEventListener('click', () => photoInput.click());
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    previewImg.src = re.target.result;
                    previewImg.classList.add('active');
                    uploadPrompt.style.display = 'none';
                    imgZone.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // OFF Search with Debounce
    let debounceTimer;
    if (offSearch) {
        offSearch.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            if (query.length < 3) {
                offResults.classList.remove('active');
                return;
            }

            debounceTimer = setTimeout(() => searchOpenFoodFacts(query), 500);
        });
    }

    // Dynamic Quantity recalculation
    const qtyInput = document.getElementById('meal-qty');
    if (qtyInput) {
        qtyInput.addEventListener('input', () => {
            if (AppState.currentMealBaseMacros) {
                const ratio = parseFloat(qtyInput.value) / 100;
                document.getElementById('meal-calories').value = (AppState.currentMealBaseMacros.calories * ratio).toFixed(1);
                document.getElementById('meal-proteins').value = (AppState.currentMealBaseMacros.proteins * ratio).toFixed(1);
                document.getElementById('meal-carbs').value = (AppState.currentMealBaseMacros.carbs * ratio).toFixed(1);
                document.getElementById('meal-fats').value = (AppState.currentMealBaseMacros.fats * ratio).toFixed(1);
            }
        });
    }

    // Handle Form Submit
    if (mealForm) {
        mealForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = mealForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = "Compression & Sauvegarde...";

            try {
                const photoFile = photoInput.files[0];
                let photoBase64 = null;
                if (photoFile) {
                    photoBase64 = await compressImage(photoFile);
                }

                const newEntry = {
                    id: Date.now(),
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

                AppState.journal.unshift(newEntry);
                
                // Save to GitHub
                await GitHubAPI.saveFile('journal.json', AppState.journal, "Add new meal entry");

                // Update UI
                updateDashboard();
                renderJournalTimeline();
                
                modal.classList.remove('active');
                mealForm.reset();
                AppState.currentMealBaseMacros = null;
                previewImg.classList.remove('active');
                uploadPrompt.style.display = 'block';
                imgZone.classList.remove('has-image');

                console.log("Meal saved successfully");
            } catch (error) {
                console.error("Save error:", error);
                alert("Erreur lors de la sauvegarde du repas.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Enregistrer dans le Journal";
            }
        });
    }
}

/**
 * Search Open Food Facts API
 */
async function searchOpenFoodFacts(query) {
    const offResults = document.getElementById('off-results');
    offResults.innerHTML = "<li>Recherche en cours...</li>";
    offResults.classList.add('active');

    try {
        const targetUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
        const data = await response.json();

        offResults.innerHTML = "";
        if (data.products && data.products.length > 0) {
            data.products.forEach(product => {
                const name = product.product_name || product.generic_name || "Produit inconnu";
                const brand = product.brands || "";
                const li = document.createElement('li');
                li.innerText = `${name} (${brand})`;
                li.addEventListener('click', () => selectProduct(product));
                offResults.appendChild(li);
            });
        } else {
            offResults.innerHTML = "<li>Aucun résultat trouvé.</li>";
        }
    } catch (error) {
        console.error("OFF search error:", error);
        offResults.innerHTML = "<li>Erreur de recherche.</li>";
    }
}

/**
 * Auto-fill form from selected OFF product
 */
function selectProduct(product) {
    const nutrients = product.nutriments || {};
    const base = {
        calories: nutrients.calories_100g || nutrients['energy-kcal_100g'] || 0,
        proteins: nutrients.proteins_100g || 0,
        carbs: nutrients.carbohydrates_100g || 0,
        fats: nutrients.fat_100g || 0
    };
    AppState.currentMealBaseMacros = base;

    document.getElementById('meal-title').value = product.product_name || "";
    document.getElementById('meal-qty').value = 100;
    document.getElementById('meal-calories').value = base.calories;
    document.getElementById('meal-proteins').value = base.proteins;
    document.getElementById('meal-carbs').value = base.carbs;
    document.getElementById('meal-fats').value = base.fats;

    document.getElementById('off-results').classList.remove('active');
    document.getElementById('off-search').value = "";
}

/**
 * Handle Weight Form
 */
function initWeightForm() {
    const weightForm = document.getElementById('weight-form');
    if (weightForm) {
        weightForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = weightForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            const newWeight = {
                date: new Date().toISOString().split('T')[0],
                value: parseFloat(document.getElementById('weight-value').value)
            };

            // Check if entry for today already exists, if so update it
            const existingIdx = AppState.weightHistory.findIndex(w => w.date === newWeight.date);
            if (existingIdx !== -1) {
                AppState.weightHistory[existingIdx] = newWeight;
            } else {
                AppState.weightHistory.push(newWeight);
            }

            try {
                await GitHubAPI.saveFile('poids.json', AppState.weightHistory, "Update weight tracker");
                updateDashboard();
                renderWeightChart();
                weightForm.reset();
                console.log("Weight saved");
            } catch (error) {
                console.error("Weight save error:", error);
                alert("Erreur lors de la sauvegarde du poids.");
            } finally {
                submitBtn.disabled = false;
            }
        });
    }
}

/**
 * Render Weight Evolution Chart
 */
let weightChartInstance = null;
function renderWeightChart() {
    const ctx = document.getElementById('weight-chart');
    if (!ctx || AppState.weightHistory.length === 0) return;

    // Prepare data
    const labels = AppState.weightHistory.slice(-10).map(w => w.date);
    const dataPoints = AppState.weightHistory.slice(-10).map(w => w.value);

    if (weightChartInstance) {
        weightChartInstance.destroy();
    }

    // Chart.js Configuration
    weightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Poids (kg)',
                data: dataPoints,
                borderColor: '#238636',
                backgroundColor: 'rgba(35, 134, 54, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointBackgroundColor: '#238636',
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#848d97' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#848d97' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
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
        
        const [journalRes, weightRes, mealsRes, cacheRes] = await Promise.all([
            GitHubAPI.getFile('journal.json').catch(() => ({ content: [] })),
            GitHubAPI.getFile('poids.json').catch(() => ({ content: [] })),
            GitHubAPI.getFile('plats_frequents.json').catch(() => ({ content: [] })),
            GitHubAPI.getFile('produits_cache.json').catch(() => ({ content: [] }))
        ]);

        AppState.journal = Array.isArray(journalRes.content) ? journalRes.content : [];
        AppState.weightHistory = Array.isArray(weightRes.content) ? weightRes.content : [];
        AppState.meals = Array.isArray(mealsRes.content) ? mealsRes.content : [];
        AppState.offCache = Array.isArray(cacheRes.content) ? cacheRes.content : [];

        updateDashboard();
        renderJournalTimeline();
        renderWeightChart();
        renderMealsLibrary();
        renderReport();
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
    const totalCals = Math.round(todayEntries.reduce((sum, entry) => sum + (entry.calories || 0), 0));
    const totalProt = Math.round(todayEntries.reduce((sum, entry) => sum + (entry.proteins || 0), 0));

    // Update UI
    const calCount = document.getElementById('cal-count');
    const calFill = document.getElementById('cal-fill');
    const protCount = document.getElementById('prot-count');
    const protFill = document.getElementById('prot-fill');
    
    if (calCount) calCount.innerText = `${totalCals} / ${AppState.user.goal} kcal`;
    if (calFill) {
        const percentage = Math.min((totalCals / AppState.user.goal) * 100, 100);
        calFill.style.width = `${percentage}%`;
    }

    if (protCount) protCount.innerText = `${totalProt} / ${AppState.user.protGoal}g`;
    if (protFill) {
        const percentage = Math.min((totalProt / AppState.user.protGoal) * 100, 100);
        protFill.style.width = `${percentage}%`;
    }

    const summary = document.getElementById('today-summary');
    if (summary) {
        summary.innerText = 
            todayEntries.length > 0 
            ? `${todayEntries.length} repas enregistrés aujourd'hui.` 
            : "Aucun repas enregistré aujourd'hui. Live long and prosper.";
    }

    // Update preview card
    const preview = document.getElementById('latest-entry-preview');
    if (preview && todayEntries.length > 0) {
        const latest = todayEntries[0];
        preview.className = "latest-preview";
        preview.innerHTML = `
            <strong>${latest.title}</strong>
            <p>${latest.calories} kcal | ${latest.time}</p>
        `;
    }
        
    // Update weight
    if (AppState.weightHistory.length > 0) {
        const lastWeightObj = AppState.weightHistory[AppState.weightHistory.length - 1];
        const lastWeightEl = document.getElementById('last-weight');
        if (lastWeightEl) lastWeightEl.innerText = `${lastWeightObj.value} kg`;
    }
}

/**
 * Render Meals Library
 */
function renderMealsLibrary() {
    const container = document.getElementById('meals-grid');
    if (!container) return;

    if (AppState.meals.length === 0) {
        container.innerHTML = "<div class='empty-state'>Aucun plat fréquent.</div>";
        return;
    }

    container.innerHTML = AppState.meals.map(meal => `
        <div class="card meal-card">
            <header style="display:flex; justify-content:space-between; align-items: start;">
                <strong style="color: var(--text-primary); font-size: 1rem;">${meal.title}</strong>
                <button onclick="removeFrequentMeal(${meal.id})" class="btn-close" style="font-size: 1.2rem; line-height: 1;">&times;</button>
            </header>
            <div class="entry-macros" style="margin-top:0.5rem;">
                <span class="macro-tag">🔥 <b>${meal.calories}</b></span>
                <span class="macro-tag">🥩 <b>${meal.proteins}</b></span>
            </div>
            <button onclick="addMealToJournalFromLibrary(${meal.id})" class="btn-primary" style="margin-top:1rem; width:100%; font-size: 0.8rem; padding: 8px;">Ajouter au Journal</button>
        </div>
    `).join('');
}

/**
 * Save current entry as a frequent meal
 */
async function saveAsFrequentMeal(id) {
    const entry = AppState.journal.find(e => e.id == id);
    if (!entry) return;

    if (AppState.meals.some(m => m.title === entry.title)) {
        if (!confirm("Un plat avec ce nom existe déjà. L'ajouter quand même ?")) return;
    }

    const newMeal = {
        id: Date.now(),
        title: entry.title,
        calories: entry.calories,
        proteins: entry.proteins,
        carbs: entry.carbs,
        fats: entry.fats
    };

    AppState.meals.push(newMeal);
    
    try {
        await GitHubAPI.saveFile('plats_frequents.json', AppState.meals, "Save meal from journal");
        renderMealsLibrary();
        alert("Plat enregistré dans la bibliothèque !");
    } catch (error) {
        console.error("Meal save error:", error);
        alert("Erreur lors de l'enregistrement du plat.");
    }
}

async function removeFrequentMeal(id) {
    if (!confirm("Supprimer ce plat ?")) return;
    AppState.meals = AppState.meals.filter(m => m.id != id);
    await GitHubAPI.saveFile('plats_frequents.json', AppState.meals, "Remove meal from library");
    renderMealsLibrary();
}

function addMealToJournalFromLibrary(id) {
    const meal = AppState.meals.find(m => m.id == id);
    if (meal) {
        const modal = document.getElementById('entry-modal');
        modal.classList.add('active');
        document.getElementById('meal-title').value = meal.title;
        document.getElementById('meal-calories').value = meal.calories;
        document.getElementById('meal-proteins').value = meal.proteins;
        document.getElementById('meal-carbs').value = meal.carbs;
        document.getElementById('meal-fats').value = meal.fats;
        
        // Tab over to Journal view if needed
        const journalNavItem = document.querySelector('[data-target="journal"]');
        if (journalNavItem) journalNavItem.click();
    }
}

/**
 * Render Journal Timeline
 */
function renderJournalTimeline() {
    const container = document.getElementById('journal-timeline');
    if (!container) return;

    if (AppState.journal.length === 0) {
        container.innerHTML = "<div class='empty-state'>Aucune entrée dans le journal.</div>";
        return;
    }

    container.innerHTML = AppState.journal.map(entry => `
        <div class="timeline-entry">
            <div class="entry-header">
                <span class="entry-title">${entry.title}</span>
                <span class="entry-time">${entry.date} - ${entry.time}</span>
            </div>
            <div class="entry-content">
                ${entry.photo ? `<img src="data:image/jpeg;base64,${entry.photo}" class="entry-img">` : '<div class="entry-img" style="display:flex;align-items:center;justify-content:center;color:var(--text-secondary)">🚫</div>'}
                <div class="entry-details">
                    <div class="entry-macros">
                        <span class="macro-tag">🔥 <b>${entry.calories}</b> kcal</span>
                        <span class="macro-tag">🥩 <b>${entry.proteins}</b>g</span>
                        <span class="macro-tag">🍞 <b>${entry.carbs}</b>g</span>
                        <span class="macro-tag">🥑 <b>${entry.fats}</b>g</span>
                    </div>
                    <button onclick="saveAsFrequentMeal(${entry.id})" class="btn-secondary" style="font-size: 0.7rem; background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid var(--card-border); padding: 5px 10px; border-radius: 4px; margin-top: 10px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <span>📁</span> Sauvegarder en plat fréquent
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

const AppState = {
    user: {
        name: "Frugman",
        goal: 1600,
        protGoal: 120,
        mealGoal: 800,
        mealCategories: ["Déjeuner", "Dîner"],
        currentWeight: null
    },
    journal: [],
    meals: [],
    weightHistory: [],
    offCache: [],
    lastOFFSearchResults: [],
    currentlyViewedProduct: null,
    currentMealBaseMacros: null
};

/**
 * Handle OFF Explorer
 */
function initOFFExplorer() {
    const searchBtn = document.getElementById('btn-search-off');
    const queryInput = document.getElementById('off-explorer-query');
    const closeDetailBtn = document.getElementById('btn-close-detail');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = queryInput.value.trim();
            if (query) searchExplorerOFF(query);
        });
        
        queryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchExplorerOFF(queryInput.value.trim());
        });
    }

    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', () => {
            document.getElementById('product-detail-panel').classList.remove('active');
        });
    }
}

async function searchExplorerOFF(query) {
    const resultsGrid = document.getElementById('explorer-results');
    resultsGrid.innerHTML = "<div class='card empty-state'>Exploration en cours...</div>";

    AppState.lastOFFSearchResults = [];

    try {
        const targetUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`;
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
        const data = await response.json();

        if (data.products && data.products.length > 0) {
            AppState.lastOFFSearchResults = data.products;
            resultsGrid.innerHTML = data.products.map((p, index) => {
                const nutri = p.nutrition_grades || 'unknown';
                const nova = p.nova_group || '';
                return `
                    <div class="card product-card" onclick="showProductDetail(${index})">
                        <img src="${p.image_front_small_url || 'https://world.openfoodfacts.org/images/icons/dist/packaging.svg'}" class="product-img">
                        <div class="product-info">
                            <h4>${p.product_name || 'Inconnu'}</h4>
                            <p>${p.brands || 'Marque inconnue'}</p>
                            <div class="badges">
                                ${nutri !== 'unknown' ? `<span class="badge badge-nutri-${nutri}">${nutri}</span>` : ''}
                                ${nova ? `<span class="badge badge-nova-${nova}">Nova ${nova}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            resultsGrid.innerHTML = "<div class='card empty-state'>Aucun produit trouvé pour cette recherche.</div>";
        }
    } catch (err) {
        console.error("Explorer search error:", err);
        resultsGrid.innerHTML = "<div class='card empty-state'>Erreur lors de la recherche.</div>";
    }
}

window.showProductDetail = function(index) {
    const product = AppState.lastOFFSearchResults[index];
    if (!product) return;

    const panel = document.getElementById('product-detail-panel');
    const content = document.getElementById('detail-content');
    panel.classList.add('active');

    const nutrients = product.nutriments || {};
    
    // Save to a global variable for quick access in buttons
    AppState.currentlyViewedProduct = product;

    content.innerHTML = `
        <img src="${product.image_front_url || 'https://world.openfoodfacts.org/images/icons/dist/packaging.svg'}" class="detail-img">
        <h3>${product.product_name || 'Produit sans nom'}</h3>
        <p style="color:var(--text-secondary);">${product.brands || ''}</p>
        
        <div class="badges" style="margin: 1rem 0;">
             ${product.nutrition_grades ? `<span class="badge badge-nutri-${product.nutrition_grades}" style="font-size:1rem; padding: 5px 15px;">Nutriscore ${product.nutrition_grades}</span>` : ''}
             ${product.nova_group ? `<span class="badge badge-nova-${product.nova_group}" style="font-size:1rem; padding: 5px 15px;">Nova ${product.nova_group}</span>` : ''}
        </div>

        <div class="detail-macros">
            <div class="detail-macro"><span>Calories</span><b>${nutrients.calories_100g || nutrients['energy-kcal_100g'] || 0}</b></div>
            <div class="detail-macro"><span>Protéines</span><b>${nutrients.proteins_100g || 0}g</b></div>
            <div class="detail-macro"><span>Glucides</span><b>${nutrients.carbohydrates_100g || 0}g</b></div>
            <div class="detail-macro"><span>Lipides</span><b>${nutrients.fat_100g || 0}g</b></div>
        </div>

        <div style="margin-top: 2rem;">
            <h4>Ingrédients</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.4;">
                ${product.ingredients_text_fr || product.ingredients_text || "Aucune information disponible."}
            </p>
        </div>

        <div class="form-actions" style="margin-top: 2rem; display: flex; flex-direction: column; gap: 10px;">
            <button onclick='addToOFFCache()' class="btn-primary" style="width: 100%;">⭐ Ajouter aux Favoris (Cache)</button>
            <button onclick='quickAddFromExplorer()' class="btn-secondary" style="width: 100%; background: transparent; border: 1px solid var(--card-border); color: var(--text-primary); padding: 10px; border-radius: 8px; cursor: pointer;">➕ Créer un repas direct</button>
        </div>
    `;
};

window.addToOFFCache = async function() {
    const product = AppState.currentlyViewedProduct;
    if (!product) return;

    const nutrients = product.nutriments || {};
    const newCachedProduct = {
        id: product.id || product._id || Date.now(),
        title: product.product_name || "Produit sans nom",
        brand: product.brands || "",
        calories: nutrients.calories_100g || nutrients['energy-kcal_100g'] || 0,
        proteins: nutrients.proteins_100g || 0,
        carbs: nutrients.carbohydrates_100g || 0,
        fats: nutrients.fat_100g || 0,
        image: product.image_front_small_url || ""
    };

    // Prevent duplicates
    if (AppState.offCache.some(p => p.id === newCachedProduct.id)) {
        alert("Ce produit est déjà dans votre cache !");
        return;
    }

    AppState.offCache.push(newCachedProduct);
    
    try {
        await GitHubAPI.saveFile('produits_cache.json', AppState.offCache, "Update OFF Cache");
        alert(`${newCachedProduct.title} ajouté au cache local !`);
    } catch (error) {
        console.error("Cache save error:", error);
        alert("Erreur lors de la sauvegarde du cache.");
    }
};

window.quickAddFromExplorer = function() {
    const product = AppState.currentlyViewedProduct;
    if (!product) return;

    const modal = document.getElementById('entry-modal');
    document.getElementById('product-detail-panel').classList.remove('active');
    document.querySelector('[data-target="journal"]').click();
    modal.classList.add('active');
    selectProduct(product);
};

/**
 * Generate Spock Report (Analytical Dashboard)
 */
function renderReport() {
    const avgCalEl = document.getElementById('avg-calories');
    const avgProtEl = document.getElementById('avg-proteins');
    const topFoodsEl = document.getElementById('top-foods');
    const weightDiffEl = document.getElementById('weight-diff');
    
    if (!avgCalEl || !avgProtEl || !topFoodsEl || !weightDiffEl) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentJournal = AppState.journal.filter(e => new Date(e.date) >= sevenDaysAgo);

    if (recentJournal.length === 0) {
        avgCalEl.innerText = "N/D";
        avgProtEl.innerText = "N/D";
        topFoodsEl.innerHTML = "<li>Pas assez de données.</li>";
        return;
    }

    // 1. Averages
    const dayCount = [...new Set(recentJournal.map(e => e.date))].length || 1;
    const totalCals = recentJournal.reduce((s, e) => s + (e.calories || 0), 0);
    const totalProts = recentJournal.reduce((s, e) => s + (e.proteins || 0), 0);

    avgCalEl.innerText = `${Math.round(totalCals / dayCount)} kcal/j`;
    avgProtEl.innerText = `${Math.round(totalProts / dayCount)} g/j`;

    // 2. Top Foods
    const counts = {};
    recentJournal.forEach(e => counts[e.title] = (counts[e.title] || 0) + 1);
    const sortedFoods = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    
    topFoodsEl.innerHTML = sortedFoods.length > 0 
        ? sortedFoods.map(([name, count]) => `<li>${name} <span style="float:right; opacity:0.6;">x${count}</span></li>`).join('')
        : "<li>Pas de données.</li>";

    // 3. Weight Evolution
    const last7jWeight = AppState.weightHistory.filter(w => new Date(w.date) >= sevenDaysAgo);
    if (last7jWeight.length >= 2) {
        const diff = (last7jWeight[last7jWeight.length - 1].value - last7jWeight[0].value).toFixed(1);
        const prefix = diff > 0 ? "+" : "";
        weightDiffEl.innerText = `${prefix}${diff} kg`;
        weightDiffEl.style.color = parseFloat(diff) > 0 ? "var(--danger-color)" : "var(--accent-color)";
    } else {
        weightDiffEl.innerText = "-- kg";
    }
}

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
