# Guide de Test - Étape 3 Validation Conversationnelle

## Instructions de préparation

### 1. Vérifier la configuration Supabase
Avant de tester, assurez-vous que :
- ✅ Les secrets Supabase sont configurés (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`)
- ✅ La fonction `assistant` est déployée
- ✅ Vous êtes connecté à l'application Noppalé

### 2. Déployer la fonction améliorée
```bash
cd production-app
supabase functions deploy assistant
```

### 3. Lancer l'application en local
```bash
cd production-app
npm install
npm run dev
```

## Scénarios de Test

### Test 1 : Salutation simple
**Objectif** : Vérifier que l'assistant répond par une salutation courte sans explication spontanée.

**Action** :
1. Cliquez sur le bouton microphone
2. Dites : "Bonjour"

**Critères de succès** :
- ✅ Réponse courte (1-2 phrases)
- ✅ Salutation naturelle
- ❌ PAS d'explication des capacités
- ❌ PAS de liste de fonctionnalités

**Exemple de réponse attendue** :
- "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
- "Nanga def ! Lan laa mën defal la ?" (wolof)
- "Hello! How can I help you today?" (anglais)

---

### Test 2 : Demande de capacités
**Objectif** : Vérifier que l'assistant ne récite pas une longue liste et cite max 4 exemples.

**Action** :
1. Dites : "Que peux-tu faire dans Noppalé ?"
2. Ou : "En une phrase, que peux-tu faire ?"

**Critères de succès** :
- ✅ Maximum 4 exemples cités
- ✅ Question à la fin : "Que souhaitez-vous faire ?"
- ❌ PAS de liste complète de fonctionnalités
- ❌ PAS d'explication détaillée non demandée

**Exemple de réponse attendue** :
- "Je peux vous aider à enregistrer des ventes, gérer votre stock, suivre vos dépenses et consulter vos statistiques. Que souhaitez-vous faire ?"

---

### Test 3 : Question sur les ventes du jour
**Objectif** : Vérifier l'utilisation de l'outil get_today_sales et le formatage correct.

**Action** :
1. Dites : "Combien ai-je vendu aujourd'hui ?"
2. Ou : "Quelles sont mes ventes aujourd'hui ?"

**Critères de succès** :
- ✅ Utilisation de l'outil get_today_sales
- ✅ Réponse courte avec chiffre
- ✅ Formatage correct des montants (ex: 15 000 FCFA)
- ✅ Réponse dans la langue détectée

**Exemple de réponse attendue** :
- "Vous avez vendu 45 000 FCFA aujourd'hui en 3 ventes."
- "Today you sold 15 000 FCFA in 2 sales." (anglais)

---

### Test 4 : Question sur les dépenses
**Objectif** : Vérifier l'utilisation de l'outil get_today_expenses.

**Action** :
1. Dites : "Quelles sont mes dépenses aujourd'hui ?"
2. Ou : "Combien de dépenses aujourd'hui ?"

**Critères de succès** :
- ✅ Utilisation de l'outil get_today_expenses
- ✅ Réponse courte avec montant
- ✅ Formatage correct

**Exemple de réponse attendue** :
- "Vous avez réalisé 8 500 FCFA de dépenses aujourd'hui en 2 dépenses."

---

### Test 5 : Question sur le bénéfice
**Objectif** : Vérifier l'utilisation de l'outil get_today_profit.

**Action** :
1. Dites : "Quel est mon bénéfice aujourd'hui ?"
2. Ou : "Combien j'ai gagné aujourd'hui ?"

**Critères de succès** :
- ✅ Utilisation de l'outil get_today_profit
- ✅ Calcul correct (revenus - coûts - dépenses)
- ✅ Réponse courte

**Exemple de réponse attendue** :
- "Votre bénéfice estimé aujourd'hui est de 25 000 FCFA : chiffre d'affaires 45 000 FCFA, coût des produits 10 000 FCFA et dépenses 10 000 FCFA."

---

### Test 6 : Question sur les dettes
**Objectif** : Vérifier l'utilisation de l'outil get_outstanding_debts.

**Action** :
1. Dites : "Combien de dettes en cours ?"
2. Ou : "Quelles sont mes dettes ?"

**Critères de succès** :
- ✅ Utilisation de l'outil get_outstanding_debts
- ✅ Montant total des dettes
- ✅ Réponse courte

**Exemple de réponse attendue** :
- "Le montant total des dettes en cours s'élève à 30 000 FCFA pour 2 clients."

---

### Test 7 : Question sur le stock
**Objectif** : Vérifier l'utilisation de l'outil get_stock_status.

**Action** :
1. Dites : "Quels produits sont en rupture ?"
2. Ou : "Y a-t-il des produits en rupture de stock ?"

**Critères de succès** :
- ✅ Utilisation de l'outil get_stock_status
- ✅ Liste des produits en rupture
- ✅ Réponse courte

**Exemple de réponse attendue** :
- "Il y a 2 produits en rupture de stock : Riz et Huile."

---

### Test 8 : Recherche de produit
**Objectif** : Vérifier l'utilisation de l'outil search_products.

**Action** :
1. Dites : "Cherche le produit riz"
2. Ou : "Est-ce que j'ai du riz en stock ?"

**Critères de succès** :
- ✅ Utilisation de l'outil search_products
- ✅ Résultat de recherche
- ✅ Réponse courte

**Exemple de réponse attendue** :
- "J'ai trouvé le produit Riz avec 15 unités en stock à 2 500 FCFA l'unité."

---

### Test 9 : Détection de langue - Anglais
**Objectif** : Vérifier la détection et réponse en anglais.

**Action** :
1. Dites : "Hello"
2. Puis : "How much did I sell today?"

**Critères de succès** :
- ✅ Détection de l'anglais
- ✅ Réponse en anglais
- ✅ Utilisation des outils correcte

---

### Test 10 : Détection de langue - Wolof
**Objectif** : Vérifier la détection et réponse en wolof (ou français).

**Action** :
1. Dites : "Nanga def"
2. Puis : "Bee nak xale yi ?"

**Critères de succès** :
- ✅ Détection du wolof
- ✅ Réponse en wolof (ou français si wolof non supporté)
- ✅ Compréhension du contexte

---

### Test 11 : Détection de langue - Arabe
**Objectif** : Vérifier la détection et réponse en arabe.

**Action** :
1. Dites : "مرحبا"
2. Puis : "كم بعت اليوم؟"

**Critères de succès** :
- ✅ Détection de l'arabe
- ✅ Réponse en arabe
- ✅ Écriture correcte de droite à gauche

---

### Test 12 : Action sans confirmation
**Objectif** : Vérifier que l'assistant ne prétend pas avoir réalisé l'action.

**Action** :
1. Dites : "Ajoute une dépense de 5000 FCFA pour le transport"

**Critères de succès** :
- ✅ Résumé de l'action proposée
- ✅ Précision qu'une confirmation sera requise
- ❌ PAS "Dépense ajoutée avec succès"
- ❌ PAS de prétention d'action réalisée

**Exemple de réponse attendue** :
- "Je comprends que vous voulez ajouter une dépense de 5 000 FCFA pour le transport. Voulez-vous confirmer cette dépense ?"

---

## Check-list de validation

### Comportement conversationnel
- [ ] Réponses courtes (2 phrases max)
- [ ] Une question à la fois
- [ ] Pas de longues listes spontanées
- [ ] Maximum 4 exemples si demandé
- [ ] Respect de la langue détectée
- [ ] Ton naturel et chaleureux

### Utilisation des outils
- [ ] get_today_sales fonctionne
- [ ] get_today_expenses fonctionne
- [ ] get_today_profit fonctionne
- [ ] get_outstanding_debts fonctionne
- [ ] get_stock_status fonctionne
- [ ] search_products fonctionne

### Gestion des actions
- [ ] Pas de prétention d'action réalisée
- [ ] Résumé avant confirmation
- [ ] Précision de confirmation requise

### Confidentialité
- [ ] Pas de mention du prompt
- [ ] Pas de mention du modèle
- [ ] Pas de mention des outils internes
- [ ] Pas de mention de l'API

### Multilingue
- [ ] Français fonctionne
- [ ] Anglais fonctionne
- [ ] Wolof fonctionne (ou fallback français)
- [ ] Arabe fonctionne

## En cas d'erreur

### Erreur "ANTHROPIC_API_KEY manquante"
**Solution** : Vérifiez les secrets Supabase Edge Functions

### Erreur 401 Anthropic
**Solution** : Vérifiez que la clé API est valide et active

### Réponse vide
**Solution** : Consultez les logs Supabase avec `supabase functions logs assistant`

### Microphone ne fonctionne pas
**Solution** : Vérifiez les permissions navigateur et utilisez Chrome/Edge

## Rapport de test

Une fois les tests terminés, notez :

**Tests réussis** : ___/12
**Tests échoués** : ___/12
**Langues testées** : [ ] Français [ ] Anglais [ ] Wolof [ ] Arabe
**Commentaires** : _______________________________

**Signature validation** : L'étape 3 est considérée validée si tous les tests de comportement conversationnel sont réussis.
