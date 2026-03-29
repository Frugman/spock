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
- [x] Optimisation du repository (Ignorer les XML source volumineux)

## 🔜 Prochaines étapes
- [ ] Gestion des correspondances d'unités (ex: 1 avocat, 1 oeuf, 1 pomme) pour éviter la pesée systématique.
- [ ] Support du scan de code-barres (probablement via caméra en JS)
- [ ] Export PDF du rapport hebdo
