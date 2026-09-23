# Guide de Test - Étape 4 Parcours Métier Guidés

## Instructions de préparation

### 1. Vérifier le déploiement
- ✅ Fonction assistant déployée avec les nouveaux outils
- ✅ Frontend reconstruit avec le support multilingue
- ✅ Application accessible et fonctionnelle

### 2. Préparer les données de test
- Créer quelques produits dans le catalogue
- Avoir des données de ventes/dépenses pour les tests
- Vérifier que le stock est suffisant pour les tests

## Scénarios de Test

### Test 1 : Parcours Vente Complet (Français)
**Objectif** : Valider le parcours de vente complet question par question.

**Actions** :
1. Cliquez sur le bouton microphone
2. Sélectionnez "Français"
3. Dites : "Je veux vendre un produit"
4. Dites : "Riz" (ou un produit existant)
5. Dites : "5" (quantité)
6. Dites : "Espèces" (méthode de paiement)
7. Dites : "Client anonyme" (nom du client)
8. Dites : "Oui" (confirmation)

**Critères de succès** :
- ✅ Questions posées une par une
- ✅ Résumé complet avant confirmation
- ✅ Question de confirmation explicite
- ✅ Vente enregistrée après confirmation
- ✅ Message de succès en français

**Exemple de dialogue attendu** :
- Assistant : "Très bien. Quel produit voulez-vous vendre ?"
- Utilisateur : "Riz"
- Assistant : "Combien d'unités voulez-vous vendre ?"
- Utilisateur : "5"
- Assistant : "Le paiement est-il en espèces, par Mobile Money, par carte ou à crédit ?"
- Utilisateur : "Espèces"
- Assistant : "Quel est le nom du client ? Dites anonyme si nécessaire."
- Utilisateur : "Client anonyme"
- Assistant : "Je vais enregistrer une vente de 5 Riz pour X FCFA, au nom de Client anonyme. Veuillez confirmer par oui ou non."
- Utilisateur : "Oui"
- Assistant : "La vente de 5 Riz a été enregistrée."

---

### Test 2 : Parcours Dépense Complet (Anglais)
**Objectif** : Valider le parcours de dépense complet en anglais.

**Actions** :
1. Cliquez sur le bouton microphone
2. Sélectionnez "English"
3. Dites : "I want to add an expense"
4. Dites : "Transport"
5. Dites : "5000"
6. Dites : "General"
7. Dites : "Yes"

**Critères de succès** :
- ✅ Toutes les questions en anglais
- ✅ Résumé en anglais
- ✅ Confirmation en anglais
- ✅ Dépense enregistrée avec succès
- ✅ Message de succès en anglais

---

### Test 3 : Parcours Ajout Produit (Wolof)
**Objectif** : Valider le parcours d'ajout de produit en wolof.

**Actions** :
1. Cliquez sur le bouton microphone
2. Sélectionnez "Wolof"
3. Dites : "Dama di togge noppal"
4. Dites : "Sucre"
5. Dites : "500"
6. Dites : "300"
7. Dites : "100"
8. Dites : "10"
9. Dites : "Waaw"

**Critères de succès** :
- ✅ Questions en wolof (ou français si wolof non supporté)
- ✅ Résumé adapté
- ✅ Confirmation fonctionnelle
- ✅ Produit ajouté avec succès

---

### Test 4 : Parcours Modification Produit (Arabe)
**Objectif** : Valider le parcours de modification de produit en arabe.

**Actions** :
1. Cliquez sur le bouton microphone
2. Sélectionnez "العربية"
3. Dites : "أريد تعديل منتج"
4. Dites : "Riz" (nom du produit)
5. Dites : "السعر" (prix)
6. Dites : "600"
7. Dites : "نعم"

**Critères de succès** :
- ✅ Questions en arabe
- ✅ Écriture de droite à gauche correcte
- ✅ Modification enregistrée avec succès

---

### Test 5 : Annulation de Confirmation
**Objectif** : Valider que l'annulation fonctionne correctement.

**Actions** :
1. Dites : "Je veux vendre un produit"
2. Dites : "Riz"
3. Dites : "5"
4. Dites : "Espèces"
5. Dites : "Client anonyme"
6. Dites : "Non" (au lieu de Oui)

**Critères de succès** :
- ✅ Message d'annulation affiché
- ✅ Aucune vente enregistrée
- ✅ Retour à l'état initial
- ✅ Possibilité de recommencer

---

### Test 6 : Validation Stock Insuffisant
**Objectif** : Valider la détection de stock insuffisant.

**Actions** :
1. Vérifiez le stock d'un produit (ex: Riz = 10 unités)
2. Dites : "Je veux vendre un produit"
3. Dites : "Riz"
4. Dites : "1000" (quantité supérieure au stock)

**Critères de succès** :
- ✅ Détection de stock insuffisant
- ✅ Message d'erreur clair
- ✅ Aucune vente enregistrée
- ✅ Possibilité de corriger

---

### Test 7 : Produit Introuvable
**Objectif** : Valider la gestion des produits inexistants.

**Actions** :
1. Dites : "Je veux vendre un produit"
2. Dites : "ProduitInexistant123"

**Critères de succès** :
- ✅ Détection de produit introuvable
- ✅ Message d'erreur clair
- ✅ Possibilité de réessayer avec un autre produit

---

### Test 8 : Montant Invalide
**Objectif** : Valider la validation des montants.

**Actions** :
1. Dites : "Ajouter une dépense"
2. Dites : "Test"
3. Dites : "-500" (montant négatif)

**Critères de succès** :
- ✅ Détection de montant invalide
- ✅ Message d'erreur explicite
- ✅ Possibilité de corriger

---

### Test 9 : Modification de Stock
**Objectif** : Valider le parcours de modification de stock.

**Actions** :
1. Dites : "Je veux modifier un produit"
2. Dites : "Riz"
3. Dites : "Le stock"
4. Dites : "20"
5. Dites : "Oui"

**Critères de succès** :
- ✅ Questions appropriées
- ✅ Résumé correct
- ✅ Stock modifié avec succès

---

### Test 10 : Parcours Complet avec Mobile Money
**Objectif** : Valider les différentes méthodes de paiement.

**Actions** :
1. Dites : "Je veux vendre un produit"
2. Dites : "Riz"
3. Dites : "3"
4. Dites : "Mobile Money"
5. Dites : "Client Test"
6. Dites : "Oui"

**Critères de succès** :
- ✅ Reconnaissance de "Mobile Money"
- ✅ Méthode de paiement correcte
- ✅ Vente enregistrée avec bon paiement

---

### Test 11 : Vente à Crédit
**Objectif** : Valider les ventes à crédit.

**Actions** :
1. Dites : "Je veux vendre un produit"
2. Dites : "Riz"
3. Dites : "2"
4. Dites : "Crédit"
5. Dites : "Client Crédit"
6. Dites : "Oui"

**Critères de succès** :
- ✅ Reconnaissance de "crédit"
- ✅ Vente enregistrée comme crédit
- ✅ Gestion correcte des dettes

---

### Test 12 : Détection Automatique de Langue
**Objectif** : Valider la détection automatique pendant les parcours.

**Actions** :
1. Commencez en français
2. Dites : "Hello" (devrait détecter l'anglais)
3. Continuez le parcours en anglais

**Critères de succès** :
- ✅ Détection automatique de la langue
- ✅ Adaptation des questions
- ✅ Cohérence du parcours

---

## Check-list de validation

### Parcours Vente
- [ ] Questions posées dans l'ordre correct
- [ ] Validation du produit
- [ ] Validation de la quantité
- [ ] Reconnaissance des méthodes de paiement
- [ ] Résumé complet avant confirmation
- [ ] Confirmation explicite
- [ ] Exécution après confirmation
- [ ] Annulation fonctionnelle

### Parcours Dépense
- [ ] Questions posées dans l'ordre correct
- [ ] Validation du montant
- [ ] Gestion des catégories
- [ ] Résumé complet
- [ ] Confirmation et exécution

### Parcours Ajout Produit
- [ ] Questions posées dans l'ordre correct
- [ ] Validation des prix
- [ ] Validation du stock
- [ ] Résumé complet
- [ ] Confirmation et exécution

### Parcours Modification Produit
- [ ] Questions posées dans l'ordre correct
- [ ] Sélection du champ à modifier
- [ ] Validation de la nouvelle valeur
- [ ] Résumé complet
- [ ] Confirmation et exécution

### Validations
- [ ] Stock insuffisant détecté
- [ ] Produit introuvable géré
- [ ] Montants invalides rejetés
- [ ] Messages d'erreur clairs

### Multilingue
- [ ] Français fonctionne correctement
- [ ] Anglais fonctionne correctement
- [ ] Wolof fonctionne (ou fallback)
- [ ] Arabe fonctionne correctement
- [ ] Détection automatique fonctionne

### Expérience Utilisateur
- [ ] Questions claires et précises
- [ ] Résumés compréhensibles
- [ ] Confirmation explicite
- [ ] Annulation facile
- [ ] Messages de succès clairs

## En cas d'erreur

### Questions non posées
**Solution** : Vérifiez que l'état du flow est correct et que les steps sont bien définis

### Résumé incorrect
**Solution** : Vérifiez la concaténation des données dans le résumé

### Confirmation non détectée
**Solution** : Vérifiez les fonctions isYes() et isNo()

### Action exécutée sans confirmation
**Solution** : Vérifiez que la fonction execute() n'est appelée qu'après confirmation

### Langue incorrecte
**Solution** : Vérifiez la détection de langue et les traductions

## Rapport de test

Une fois les tests terminés, notez :

**Tests réussis** : ___/12
**Tests échoués** : ___/12
**Langues testées** : [ ] Français [ ] Anglais [ ] Wolof [ ] Arabe
**Parcours testés** : [ ] Vente [ ] Dépense [ ] Ajout Produit [ ] Modification Produit
**Commentaires** : _______________________________

**Signature validation** : L'étape 4 est considérée validée si tous les parcours métier fonctionnent correctement avec confirmation explicite dans les 4 langues.
