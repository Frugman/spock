document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
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
 * Basic state for the application
 */
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
