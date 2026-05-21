# 🚀 Guide Complet - Système d'Abonnement Noppale

## 📋 Étapes d'Installation

### 1. ⚙️ Configuration Base de Données

**Exécutez le script SQL complet :**
```bash
# Copiez le contenu de subscription-setup-complete.sql
# Allez dans Supabase Dashboard > SQL Editor
# Collez et exécutez
```

**Ce script crée :**
- ✅ Table `profiles` avec tous les champs nécessaires
- ✅ Fonction `handle_new_user` pour les nouveaux inscrits
- ✅ Trigger automatique pour créer les profils
- ✅ Policies RLS pour la sécurité
- ✅ Votre compte admin (365 jours d'accès)

---

## 🎯 Scénarios de Test

### Scénario 1: Nouvel Utilisateur (30 jours gratuits)

1. **Créez un nouveau compte** sur https://noppale-desktop.vercel.app
2. **Vérifiez dans Supabase Dashboard:**
   ```sql
   SELECT * FROM profiles WHERE is_admin = false;
   ```
3. **Résultat attendu:**
   - `subscription_end`: aujourd'hui + 30 jours
   - `grace_period_end`: aujourd'hui + 35 jours
   - `account_status`: 'active'

### Scénario 2: Test Période de Grâce (J+35)

1. **Modifiez manuellement dans Supabase:**
   ```sql
   UPDATE profiles 
   SET subscription_end = NOW() - INTERVAL '2 days'
   WHERE id = 'votre-user-id';
   ```
2. **Résultat attendu:**
   - ✅ Accès toujours autorisé
   - ⚠️ Notification rouge "Période de grâce"
   - 🔔 Message: "2 jours restants"

### Scénario 3: Test Expiration Complète (J+36)

1. **Modifiez manuellement dans Supabase:**
   ```sql
   UPDATE profiles 
   SET grace_period_end = NOW() - INTERVAL '1 day'
   WHERE id = 'votre-user-id';
   ```
2. **Résultat attendu:**
   - ❌ Accès bloqué sur toutes les pages protégées
   - 🚫 Redirection vers `/subscription-blocked`
   - 📄 Page "Accès Suspendu" affichée

### Scénario 4: Test Suspension Admin

1. **Suspendez un utilisateur:**
   ```sql
   UPDATE profiles 
   SET account_status = 'paused'
   WHERE id = 'votre-user-id';
   ```
2. **Résultat attendu:**
   - ❌ Accès bloqué immédiatement
   - 📄 Page "Compte Suspendu" affichée

### Scénario 5: Test Réactivation

1. **Réactivez un utilisateur:**
   ```sql
   UPDATE profiles 
   SET 
     account_status = 'active',
     subscription_end = NOW() + INTERVAL '30 days',
     grace_period_end = NOW() + INTERVAL '35 days'
   WHERE id = 'votre-user-id';
   ```
2. **Résultat attendu:**
   - ✅ Accès entièrement rétabli
   - 🎉 Plus de notifications d'avertissement

---

## 🔧 Gestion Admin (Supabase Dashboard)

### Ajouter du temps à un utilisateur:
```sql
UPDATE profiles 
SET 
  subscription_end = NOW() + INTERVAL '60 days',
  grace_period_end = NOW() + INTERVAL '65 days',
  subscription_note = 'Paiement Wave reçu'
WHERE id = 'user-id';
```

### Suspendre un utilisateur:
```sql
UPDATE profiles 
SET 
  account_status = 'paused',
  subscription_note = 'Non-paiement'
WHERE id = 'user-id';
```

### Voir tous les utilisateurs actifs:
```sql
SELECT * FROM active_users ORDER BY created_at DESC;
```

---

## 📊 États Possibles

| Statut | Condition | Accès | Notification |
|--------|-----------|--------|--------------|
| **Actif** | `now <= subscription_end` | ✅ Oui | 🟢 Aucune |
| **Bientôt expiré** | `subscription_end - now <= 5 days` | ✅ Oui | 🟠 J-5 warning |
| **Période de grâce** | `now > subscription_end && now <= grace_period_end` | ✅ Oui | 🔴 Grâce warning |
| **Expiré** | `now > grace_period_end` | ❌ Non | 🚫 Page bloquée |
| **Suspendu** | `account_status = 'paused'` | ❌ Non | 🚫 Page suspendue |

---

## 🛡️ Sécurité Implémentée

### ✅ RLS Policies:
- Utilisateurs ne voient que leur profil
- Admins voient tous les profils
- Modification limitée (seulement `full_name`)

### ✅ Protection Frontend:
- `SubscriptionGate` sur chaque route sensible
- Vérification automatique à chaque chargement
- Notifications en temps réel

### ✅ Protection Backend:
- Fonction SQL `is_user_allowed()` disponible
- Vue `active_users` pour les admins
- Trigger automatique pour nouveaux utilisateurs

---

## 🚨 Dépannage

### Problème: "Profil introuvable"
**Solution:** Vérifiez que le trigger s'est bien exécuté
```sql
SELECT * FROM profiles WHERE id = 'votre-user-id';
```

### Problème: "Accès refusé"
**Solution:** Vérifiez les dates et le statut
```sql
SELECT 
  account_status,
  subscription_end,
  grace_period_end,
  NOW() as current_time
FROM profiles WHERE id = 'votre-user-id';
```

### Problème: "Erreur RLS"
**Solution:** Vérifiez les policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

## 📱 Test Mobile

1. **Ouvrez sur mobile** https://noppale-desktop.vercel.app
2. **Testez toutes les pages** (Products, Sales, Reports, Expenses)
3. **Vérifiez les notifications** sur écran petit
4. **Testez la page bloquée** en mode mobile

---

## ✅ Checklist de Validation

- [ ] Nouvel utilisateur obtient 30 jours
- [ ] Notification J-5 fonctionne
- [ ] Période de grâce (5 jours) fonctionne
- [ ] Blocage après expiration fonctionne
- [ ] Suspension admin fonctionne
- [ ] Réactivation fonctionne
- [ ] Notifications mobile responsives
- [ ] Page bloquée responsive
- [ ] Admin a accès illimité
- [ ] RLS policies fonctionnent

---

## 🎉 Résultat Final

Votre application Noppale dispose maintenant d'un **vrai système SaaS** capable de:

✅ **Gérer des abonnements**  
✅ **Suspendre des utilisateurs**  
✅ **Période de grâce automatique**  
✅ **Notifications intelligentes**  
✅ **Gestion 100% via Supabase**  
✅ **Sécurité multi-niveaux**  
✅ **Interface de blocage professionnelle**  

**Félicitations ! 🎊**
