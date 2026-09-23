# Guide Vidéo Démo - Suppression Utilisateur Supabase

## 🎥 Alternative à la vidéo réelle

Je ne peux pas créer de vidéo réelle, mais voici un guide visuel détaillé qui vous montre exactement quoi faire, étape par étape.

---

## 📱 **ÉTAPE 1: Accéder à Supabase Dashboard**

### **🔍 Ce que vous verrez:**
```
1. Allez sur https://supabase.com/dashboard
2. Connectez-vous avec votre email/mot de passe
3. Cliquez sur votre projet Noppalé
```

### **🖼️ Visuellement:**
- **Page d'accueil** → Vos projets
- **Cliquez** sur le projet Noppalé
- **Interface** du dashboard s'ouvre

---

## 📱 **ÉTAPE 2: Ouvrir l'éditeur SQL**

### **🔍 Navigation:**
```
1. Menu de gauche → "Database"
2. Sous-menu → "SQL Editor" 
3. Bouton "New query" (en haut à droite)
```

### **🖼️ Ce que vous verrez:**
- **Interface SQL** avec zone de texte vide
- **Boutons** "Run", "Save", "Format"
- **Zone** pour coller le script

---

## 📱 **ÉTAPE 3: Coller et exécuter le script**

### **🔍 Actions:**
```
1. Ouvrez le fichier: delete-user-ready-to-run.sql
2. Copiez tout le contenu (Ctrl+A, Ctrl+C)
3. Retournez à Supabase SQL Editor
4. Collez tout (Ctrl+V)
5. Cliquez sur "Run" (bouton vert/bleu)
```

### **🖼️ Résultat attendu:**
```
=== VÉRIFICATION FINALE ===
products_remaining: 0
sales_remaining: 0
expenses_remaining: 0
customers_remaining: 0
shop_info_remaining: 0
preferences_remaining: 0
secret_codes_remaining: 0
```

---

## 📱 **ÉTAPE 4: Supprimer l'utilisateur auth**

### **🔍 Navigation:**
```
1. Menu de gauche → "Authentication" 
2. Sous-menu → "Users"
3. Cherchez l'utilisateur: 4bb480a9-952e-48ee-9936-f8a3e445b5d1
```

### **🔍 Actions:**
```
1. Trouvez la ligne avec l'ID: 4bb480a9-952e-48ee-9936-f8a3e445b5d1
2. Cliquez sur les "3 points" (⋮) à droite de la ligne
3. Cliquez sur "Delete"
4. Confirmez avec "Delete" dans la popup
```

### **🖼️ Ce que vous verrez:**
- **Liste des utilisateurs** avec emails et IDs
- **Menu contextuel** avec "Delete"
- **Popup de confirmation** 
- **Utilisateur disparaît** de la liste

---

## ✅ **VÉRIFICATION FINALE**

### **🔍 Pour confirmer que tout est supprimé:**

**1. Vérifiez les données:**
```sql
-- Exécutez cette requête pour vérifier:
SELECT COUNT(*) as total_remaining FROM (
    SELECT COUNT(*) as count FROM products WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1'
    UNION ALL
    SELECT COUNT(*) FROM sales WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1'
    UNION ALL  
    SELECT COUNT(*) FROM expenses WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1'
) as all_tables;
```

**2. Vérifiez l'utilisateur auth:**
```sql
SELECT COUNT(*) as user_exists FROM auth.users WHERE id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
```

### **🎯 Résultat final attendu:**
```
total_remaining: 0
user_exists: 0
```

---

## 🚨 **DÉPANNAGE**

### **❌ Si vous voyez des erreurs:**

**Erreur "table doesn't exist":**
- Vérifiez que les noms de tables sont corrects
- Adaptez le script si nécessaire

**Erreur "permission denied":**
- Normal pour la suppression auth
- Utilisez le Dashboard Authentication à la place

**Résultats non à 0:**
- Vérifiez que l'UUID est correct
- Réexécutez le script

---

## ⏱️ **TEMPS ESTIMÉ**

- **Étape 1-2:** 2 minutes
- **Étape 3:** 1 minute  
- **Étape 4:** 30 secondes
- **Vérification:** 1 minute

**Total: ~5 minutes**

---

## 🎯 **RÉSUMÉ RAPIDE**

1. **Copiez** le script de `delete-user-ready-to-run.sql`
2. **Exécutez** dans SQL Editor
3. **Supprimez** l'utilisateur via Authentication → Users
4. **Vérifiez** que tout est à 0

---

## 📞 **SI BESOIN D'AIDE**

Si vous êtes bloqué à une étape:
1. **Lisez attentivement** les instructions
2. **Vérifiez** les noms de tables/IDs
3. **Rechargez** la page si nécessaire
4. **Suivez** exactement l'ordre des étapes

---

**Ce guide remplace une vidéo réelle et vous montre exactement quoi faire, étape par étape !** 🚀✨
