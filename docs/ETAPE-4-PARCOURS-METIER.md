# Étape 4 - Parcours Métier Guidé

## Date : 23 septembre 2026

## Objectif
Implémenter des parcours métier guidés question par question pour les actions d'écriture (ventes, dépenses, produits), avec confirmation explicite avant toute écriture dans la base de données.

## Améliorations apportées

### 1. Support multilingue complet dans VoiceSaleAssistant
**Fichier** : `src/components/VoiceSaleAssistant.jsx`

**Améliorations** :
- Toutes les questions et réponses sont maintenant traduites en 4 langues
- Français, Anglais, Wolof, Arabe
- Détection automatique de la langue pour chaque réponse

**Exemples de traductions** :
```javascript
// Questions adaptées selon la langue
const questions = {
  'sale': {
    'en-US': 'Great. Which product would you like to sell?',
    'wo-SN': 'Ndax tey. Lu noppal bi ngay yobbe ?',
    'ar-SA': 'ممتاز. ما هو المنتج الذي تريد بيعه؟',
    'fr-FR': 'Très bien. Quel produit voulez-vous vendre ?'
  },
  'expense': {
    'en-US': 'OK. What is the expense description?',
    'wo-SN': 'Dama dow. Loolu benn xaalis bi ?',
    'ar-SA': 'حسنًا. ما هو وصف المصروف؟',
    'fr-FR': 'D\'accord. Quelle est la description de la dépense ?'
  }
}
```

### 2. Messages de confirmation améliorés
**Fichier** : `src/components/VoiceSaleAssistant.jsx`

**Améliorations** :
- Question de confirmation explicite à la fin de chaque résumé
- Messages multilingues pour "oui/non"
- Messages d'annulation multilingues

**Exemple** :
```javascript
const confirmQuestion = languageRef.current === 'en-US' ? 'Please confirm with yes or no.'
                    : languageRef.current === 'wo-SN' ? 'Degalal na waaw walla deedeet.'
                    : languageRef.current === 'ar-SA' ? 'يرجى التأكيد بنعم أو لا.'
                    : 'Veuillez confirmer par oui ou non.'
```

### 3. Messages de succès multilingues
**Fichier** : `src/components/VoiceSaleAssistant.jsx`

**Améliorations** :
- Messages de succès adaptés selon la langue
- Messages d'erreur adaptés selon la langue
- Feedback utilisateur cohérent

**Exemples** :
```javascript
const successMessages = {
  'expense': {
    'en-US': 'Expense recorded successfully.',
    'wo-SN': 'Xaalis bi bind na rek.',
    'ar-SA': 'تم تسجيل المصروف بنجاح.',
    'fr-FR': 'La dépense a été enregistrée avec succès.'
  },
  'addProduct': {
    'en-US': `Product ${data.name} added successfully.`,
    'wo-SN': `Noppal ${data.name} togge na rek.`,
    'ar-SA': `تمت إضافة المنتج ${data.name} بنجاح.`,
    'fr-FR': `Le produit ${data.name} a été ajouté avec succès.`
  }
}
```

### 4. Nouveaux outils de préparation dans la fonction assistant
**Fichier** : `supabase/functions/assistant/index.ts`

**Nouveaux tools ajoutés** :
- `prepare_expense` : Valide et prépare les données d'une dépense
- `prepare_sale` : Valide et prépare les données d'une vente
- `prepare_product` : Valide et prépare les données d'un nouveau produit

**Avantages** :
- Validation des données avant confirmation
- Détection des erreurs (stock insuffisant, produit introuvable, etc.)
- Résumé automatique pour confirmation

**Exemple d'outil prepare_sale** :
```typescript
if (name === 'prepare_sale') {
  const productName = String(args.product_name || '').trim()
  const quantity = Number(args.quantity) || 1
  const paymentMethod = String(args.payment_method || 'especes').trim()
  const customerName = String(args.customer_name || 'Client comptant').trim()
  
  if (!productName) return { valid: false, error: 'Le nom du produit est requis' }
  const product = data.products.find((p) => p.name.toLowerCase() === productName.toLowerCase())
  if (!product) return { valid: false, error: 'Produit non trouvé dans le catalogue' }
  if (quantity <= 0) return { valid: false, error: 'La quantité doit être positive' }
  if (quantity > Number(product.stock || 0)) return { valid: false, error: `Stock insuffisant. Il ne reste que ${product.stock} unités` }
  
  const unitPrice = Number(product.selling_price || 0)
  const total = quantity * unitPrice
  return { valid: true, sale: { product_id: product.id, product_name: product.name, quantity, unit_price: unitPrice, total, payment_method: paymentMethod, customer_name: customerName }, summary: `Vente de ${quantity} ${product.name} pour ${total.toLocaleString('fr-FR')} FCFA, paiement ${paymentMethod}, client ${customerName}` }
}
```

### 5. Instructions système mises à jour pour l'étape 4
**Fichier** : `supabase/functions/assistant/index.ts`

**Nouvelles instructions** :
```typescript
RÈGLES D'ACTION - ÉTAPE 4 :
- Pour toute création, modification, dépense ou vente : ne prétends jamais que l'action est déjà réalisée.
- Recueille les informations nécessaires, résume l'action et précise qu'une confirmation sera requise.
- Guide l'utilisateur question par question pour les actions métier.
- Sois précis dans les questions pour éviter les ambiguïtés.
- Après confirmation explicite, l'action sera exécutée par le système.

PARCOURS MÉTIER GUIDÉS :
- VENTE : produit → quantité → paiement → client → résumé → confirmation
- DÉPENSE : description → montant → catégorie → résumé → confirmation
- AJOUT PRODUIT : nom → prix vente → prix achat → stock → stock min → résumé → confirmation
- MODIFICATION PRODUIT : produit → champ à modifier → nouvelle valeur → résumé → confirmation
```

## Parcours métier implémentés

### 1. Parcours Vente
**Étapes** :
1. Question : "Quel produit voulez-vous vendre ?"
2. Question : "Combien d'unités voulez-vous vendre ?"
3. Question : "Le paiement est-il en espèces, par Mobile Money, par carte ou à crédit ?"
4. Question : "Quel est le nom du client ? (Dites anonyme si nécessaire)"
5. Résumé : "Je vais enregistrer une vente de X produits pour Y FCFA, au nom de Z. Veuillez confirmer par oui ou non."
6. Confirmation : Oui → Exécution / Non → Annulation

### 2. Parcours Dépense
**Étapes** :
1. Question : "Quelle est la description de la dépense ?"
2. Question : "Quel est le montant de la dépense ?"
3. Question : "Quelle est la catégorie ? (Dites générale si vous ne souhaitez pas préciser)"
4. Résumé : "Je vais enregistrer la dépense X de Y FCFA, catégorie Z. Veuillez confirmer par oui ou non."
5. Confirmation : Oui → Exécution / Non → Annulation

### 3. Parcours Ajout Produit
**Étapes** :
1. Question : "Quel est le nom du nouveau produit ?"
2. Question : "Quel est le prix de vente ?"
3. Question : "Quel est le prix d'achat ?"
4. Question : "Combien d'unités sont actuellement en stock ?"
5. Question : "Quel est le seuil minimum de stock ?"
6. Résumé : "Je vais ajouter le produit X, vendu Y FCFA, acheté Z FCFA, avec N unités en stock. Veuillez confirmer par oui ou non."
7. Confirmation : Oui → Exécution / Non → Annulation

### 4. Parcours Modification Produit
**Étapes** :
1. Question : "Quel produit voulez-vous mettre à jour ?"
2. Question : "Que voulez-vous modifier : le stock, le prix de vente ou le prix d'achat ?"
3. Question : "Quelle est la nouvelle valeur ?"
4. Résumé : "Je vais modifier le X de Y à Z. Veuillez confirmer par oui ou non."
5. Confirmation : Oui → Exécution / Non → Annulation

## Validation des règles de l'étape 4

### ✅ Question par question
- Chaque action est décomposée en questions simples
- Une seule question à la fois
- Attente de la réponse avant de continuer

### ✅ Résumé avant confirmation
- Résumé complet de l'action avant confirmation
- Toutes les informations importantes sont mentionnées
- Format clair et compréhensible

### ✅ Confirmation explicite
- Question de confirmation explicite ("oui/non")
- Utilisateur doit confirmer avant exécution
- Possibilité d'annulation à tout moment

### ✅ Validation des données
- Vérification du produit dans le catalogue
- Vérification du stock disponible
- Validation des montants positifs
- Détection des erreurs avant confirmation

### ✅ Multilingue
- Toutes les questions traduites en 4 langues
- Messages de confirmation multilingues
- Messages de succès multilingues
- Détection automatique de la langue

### ✅ Pas de prétention d'action
- L'assistant ne prétend jamais avoir réalisé l'action
- Résumé précise "Je vais enregistrer..." au passé
- Confirmation requise avant écriture

## Tests de validation recommandés

### Test 1 : Parcours vente complet
**Commandes** :
1. "Je veux vendre un produit"
2. "Riz"
3. "5"
4. "Espèces"
5. "Client anonyme"
6. "Oui"

**Résultat attendu** : Vente enregistrée avec succès

### Test 2 : Parcours dépense complet
**Commandes** :
1. "Ajouter une dépense"
2. "Transport"
3. "5000"
4. "Générale"
5. "Oui"

**Résultat attendu** : Dépense enregistrée avec succès

### Test 3 : Parcours ajout produit complet
**Commandes** :
1. "Ajouter un nouveau produit"
2. "Sucre"
3. "500"
4. "300"
5. "100"
6. "10"
7. "Oui"

**Résultat attendu** : Produit ajouté avec succès

### Test 4 : Annulation de confirmation
**Commandes** :
1. "Je veux vendre un produit"
2. "Riz"
3. "5"
4. "Espèces"
5. "Client anonyme"
6. "Non"

**Résultat attendu** : Opération annulée, aucune vente enregistrée

### Test 5 : Validation stock insuffisant
**Commandes** :
1. "Je veux vendre un produit"
2. "Riz"
3. "1000" (quantité supérieure au stock)

**Résultat attendu** : Erreur "Stock insuffisant"

### Test 6 : Test multilingue anglais
**Commandes** :
1. "Hello"
2. "I want to sell a product"
3. "Rice"
4. "3"
5. "Cash"
6. "Anonymous"
7. "Yes"

**Résultat attendu** : Réponses en anglais, vente enregistrée

## Déploiement

### Étapes pour déployer les améliorations :

1. **Déployer la fonction assistant mise à jour** :
   ```bash
   cd production-app
   supabase functions deploy assistant
   ```

2. **Ou utiliser le déploiement manuel** :
   - Suivre le guide `docs/GUIDE-DEPLOIEMENT-MANUEL.md`
   - Copier le code de `production-app/supabase/functions/assistant/index.ts`

3. **Reconstruire le frontend** :
   ```bash
   cd production-app
   npm run build
   ```

4. **Tester les parcours métier** :
   - Suivre le guide de test ci-dessus
   - Tester chaque parcours dans les 4 langues
   - Vérifier les validations et confirmations

## Prochaines étapes

Une fois l'étape 4 validée :
- **Étape 5** : Assistant vocal temps réel (déjà implémenté, à tester)
- **Étape 6** : Tests multilingues complets et mise en production

## Fichiers modifiés

1. `production-app/src/components/VoiceSaleAssistant.jsx` - Support multilingue complet
2. `working-copy/supabase/functions/assistant/index.ts` - Nouveaux outils de préparation
3. `production-app/supabase/functions/assistant/index.ts` - Copie pour déploiement
4. `docs/ETAPE-4-PARCOURS-METIER.md` - Ce fichier de documentation

## Notes importantes

- Les parcours métier sont entièrement guidés question par question
- Chaque confirmation est explicite et nécessite un "oui"
- Les validations empêchent les erreurs (stock insuffisant, produit introuvable, etc.)
- Le support multilingue est complet pour toutes les interactions
- L'assistant ne prétend jamais avoir réalisé une action sans confirmation
