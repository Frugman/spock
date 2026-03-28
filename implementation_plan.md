# Plan d'Implémentation : Projet Spock

## 🎯 Objectif
Créer une application personnelle de suivi de régime, logique et efficace, basée sur des fichiers JSON et l'API Open Food Facts.

## 🗂️ Architecture des Données (JSON)
- `journal.json` : Entrées quotidiennes (repas, macros, photos).
- `poids.json` : Historique des pesées.
- `plats_frequents.json` : Bibliothèque de plats enregistrés avec calcul de portions.
- `produits_cache.json` : Cache local des recherches Open Food Facts.

## 🚀 Phases de Développement

### Phase 1 : Socle Technique & Interface (La Coquille)
- [x] Structure HTML5 sémantique et Navigation.
- [x] Système de design CSS (Sombre, Moderne, "Spock-ish").
- [x] Utilitaires de compression d'images (Logic Canvas).
- [x] Fonctions de lecture/écriture des fichiers JSON locaux via GitHub (même système que Potager).

### Phase 2 : Module Journal & Open Food Facts
- [ ] Formulaire d'entrée de repas (Titre, heure, macros, photo).
- [ ] Intégration API Open Food Facts avec recherche en temps réel.
- [ ] Système de Cache (`produits_cache.json`) pour éviter les requêtes inutiles.
- [ ] Affichage chronologique des entrées du journal.

### Phase 3 : Suivi de Poids & Graphiques
- [ ] Formulaire de saisie du poids quotidien.
- [ ] Graphique d'évolution (Chart.js ou Sparklines) montrant la tendance.

### Phase 4 : Bibliothèque de Plats Fréquents
- [ ] Liste des plats avec recherche/filtre.
- [ ] Formulaire d'ajout de plat (Ingrédients, portions, macros).
- [ ] **Calculateur de portions dynamiques** lors de l'ajout au journal.
- [ ] Bouton "Sauvegarder en plat fréquent" depuis une entrée du journal.

### Phase 5 : Le "Spock Report" (Analytique)
- [ ] Algorithme de calcul de moyennes hebdomadaires (Calories, P/L/G).
- [ ] Dashboard récapitulatif (Top aliments, progression poids).
- [ ] Système de tri des ingrédients préférés (Fréquence + Récence).

---
*Statut actuel : Phase 1 terminée. Prêt pour Phase 2 (Module Journal & Open Food Facts).*
