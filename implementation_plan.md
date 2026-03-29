# Spock - Plan d'implémentation
V1.2 - Pro Meal Form & Local Database

## ✅ Phase 1 à 6 : Fondations, Dashboard, Logique Journal, OFF, Paramètres, Poids
- [x] Initialisation GitHub & Sync
- [x] Dashboard avec Charts.js (Poids)
- [x] Journal et Macros journalières
- [x] Gestion des Plats & Aliments fréquents
- [x] Paramètres GitHub Token avec feedback
- [x] Fix des boutons et doubling encarts

## 🚀 Phase 7 : Overhaul Nouveau Repas (Basket System)
- [x] Nouveau design de formulaire "Panier" (Modal)
- [x] Prise en charge multi-items par repas
- [x] Calculateur de macros en temps réel (Calories, Prot, Gluc, Lip)
- [x] Métadonnées de repas (Date + Type : Midi, Soir, Encas)
- [x] Intégration des boutons rapides "Mes Plats" / "Mes Aliments"
- [x] Support des unités (portion, 100g, unité, etc.)

## 🔍 Phase 8 : Local Database (CIQUAL 2025)
- [x] Remplacement de OFF par la base officielle CIQUAL 2025
- [x] Conversion XML -> JSON (3395 items optimisés)
- [x] Recherche instantanée en local (Offline-first, Zero latence)
- [x] Support des accents et normalisation (Recherche premium)
- [x] Nettoyage de la UI (Explorateur CIQUAL au lieu de OFF)

## 💎 Phase 9 : UX & Précision (Unités & Macros)
- [x] Simplification des Unités : Menus déroulants normalisés
- [x] Correspondances automatiques (g, ml, cl, CS, cc, Verre, Bol)
- [x] Masquage dynamique des champs techniques (Poids/unité)
- [x] Précision des Macros : Support d'une décimale (0.1g)
- [x] Standardisation des labels (Noms complets + Unités kcal/g) partout

## 🔜 Prochaines étapes
- [ ] **Scan Code-barres** : Intégration caméra pour scanner les produits OFF directement.
- [ ] **Rapports avancés** : Export PDF ou vue détaillée hebdo/mensuelle.
- [ ] **Gestion des icônes** : Icônes d'aliments personnalisées pour le panier.
- [ ] **Importation CIQUAL++** : Ajout de filtres par catégories dans la base CIQUAL.
