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
- [x] Formulaire d'entrée de repas (Titre, heure, macros, photo).
- [x] Intégration API Open Food Facts avec recherche en temps réel.
- [x] Système de Cache (`produits_cache.json`) pour éviter les requêtes inutiles.
- [x] Affichage chronologique des entrées du journal.

### Phase 3 : Suivi de Poids & Graphiques
- [x] Formulaire de saisie du poids quotidien.
- [x] Graphique d'évolution (Chart.js ou Sparklines) montrant la tendance.

### Phase 4 : Bibliothèque de Plats Fréquents
- [x] Liste des plats avec recherche/filtre.
- [x] Formulaire d'ajout de plat (Ingrédients, portions, macros).
- [x] **Calculateur de portions dynamiques** lors de l'ajout au journal.
- [x] Bouton "Sauvegarder en plat fréquent" depuis une entrée du journal.

### Phase 5 : Le "Spock Report" (Analytique)
- [x] Algorithme de calcul de moyennes hebdomadaires (Calories, P/L/G).
- [x] Dashboard récapitulatif (Top aliments, progression poids).
- [x] Système de tri des ingrédients préférés (Fréquence + Récence).

### Phase 6 : Explorateur Open Food Facts
- [x] Nouvelle navigation "OFF Explorer".
- [x] Recherche avancée de produits avec pagination.
- [x] Fiche produit détaillée (Macros, Nutriscore, Nova, Additifs).
- [x] Bouton d'ajout rapide au journal depuis la fiche produit.

### Phase 7 : Refonte du Formulaire de Repas (Standard Pro)
- [ ] **Changement de paradigme** : Passage d'une "entrée simple" à un "panier de repas" (Meal Basket).
- [ ] **Métadonnées de repas** : Ajout du champ Date (date picker) et Type de repas (Midi / Soir / Encas).
- [ ] **Système de Basket** : Possibilité d'ajouter plusieurs aliments/plats à un seul repas avant validation.
- [ ] **Bouton Favoris Dédiés** : Accès rapide séparé pour "Mes Plats" et "Mes Aliments".
- [ ] **Calculateur de repas** : Somme automatique en temps réel des macros de tous les items du panier.
- [ ] **Affichage structuré** : Mise à jour du Journal pour afficher les repas avec le détail des items (façon Yazio).

---
*Statut actuel : Projet Spock V1.1 opérationnel. Phase 7 en cours de développement.*
