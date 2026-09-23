# Guide Abonnement Noppale

## Architecture actuelle

Le système d'abonnement utilise une table dédiée :

```txt
public.user_subscriptions
```

Cette table est liée à `auth.users` avec `user_id`.

Une vue admin permet de consulter rapidement les utilisateurs :

```txt
public.admin_users_subscriptions
```

## Règles principales

- Un nouvel utilisateur reçoit automatiquement 10 jours d'essai.
- Il n'y a pas de période de grâce.
- Après expiration, les pages sensibles sont bloquées.
- Un compte suspendu est bloqué immédiatement.
- Un admin a accès sans limite.
- La prolongation se fait depuis Supabase en modifiant `subscription_end`.

## Colonnes importantes

```txt
user_id
full_name
email
phone
subscription_type
account_status
trial_start
subscription_end
is_admin
admin_note
created_at
updated_at
```

## Valeurs utilisées

### subscription_type

```txt
trial
paid
manual
```

### account_status

```txt
active
suspended
```

## Voir tous les utilisateurs

```sql
SELECT
  email,
  full_name,
  phone,
  subscription_type,
  account_status,
  subscription_end,
  is_admin,
  access_status,
  days_remaining,
  admin_note
FROM public.admin_users_subscriptions
ORDER BY auth_created_at DESC;
```

## Prolonger un utilisateur

### Prolonger de 30 jours à partir d'aujourd'hui

```sql
UPDATE public.user_subscriptions
SET
  subscription_type = 'paid',
  account_status = 'active',
  subscription_end = NOW() + INTERVAL '30 days',
  admin_note = 'Abonnement prolongé 30 jours'
WHERE email = 'email_utilisateur@example.com';
```

### Ajouter 30 jours à la date actuelle de fin

```sql
UPDATE public.user_subscriptions
SET
  subscription_type = 'paid',
  account_status = 'active',
  subscription_end = subscription_end + INTERVAL '30 days',
  admin_note = 'Ajout de 30 jours'
WHERE email = 'email_utilisateur@example.com';
```

## Suspendre un utilisateur

```sql
UPDATE public.user_subscriptions
SET
  account_status = 'suspended',
  admin_note = 'Compte suspendu par admin'
WHERE email = 'email_utilisateur@example.com';
```

## Réactiver un utilisateur

```sql
UPDATE public.user_subscriptions
SET
  account_status = 'active',
  subscription_type = 'paid',
  subscription_end = NOW() + INTERVAL '30 days',
  admin_note = 'Compte réactivé'
WHERE email = 'email_utilisateur@example.com';
```

## Rendre un utilisateur admin

```sql
UPDATE public.user_subscriptions
SET
  is_admin = true,
  subscription_type = 'manual',
  account_status = 'active',
  admin_note = 'Accès admin illimité'
WHERE email = 'email_utilisateur@example.com';
```

## Retirer l'accès admin

```sql
UPDATE public.user_subscriptions
SET
  is_admin = false,
  admin_note = 'Accès admin retiré'
WHERE email = 'email_utilisateur@example.com';
```

## Voir les utilisateurs proches de l'expiration

```sql
SELECT
  email,
  full_name,
  phone,
  subscription_type,
  subscription_end,
  days_remaining,
  access_status
FROM public.admin_users_subscriptions
WHERE access_status = 'expiring_soon'
ORDER BY subscription_end ASC;
```

## Voir les utilisateurs expirés

```sql
SELECT
  email,
  full_name,
  phone,
  subscription_type,
  subscription_end,
  access_status
FROM public.admin_users_subscriptions
WHERE access_status = 'expired'
ORDER BY subscription_end ASC;
```

## Vérifier un utilisateur précis

```sql
SELECT
  email,
  full_name,
  phone,
  subscription_type,
  account_status,
  subscription_end,
  is_admin,
  access_status,
  days_remaining,
  admin_note
FROM public.admin_users_subscriptions
WHERE email = 'email_utilisateur@example.com';
```

## Comportement dans l'application

### Essai

Si `subscription_type = 'trial'`, l'utilisateur voit un badge indiquant qu'il est en phase d'essai.

### J-5

Quand `subscription_end` est à 5 jours ou moins, l'utilisateur voit un badge d'alerte.

Ce badge J-5 fonctionne pour :

```txt
trial
paid
manual
```

### Expiration

Si `subscription_end` est dépassée, les pages sensibles sont bloquées.

Pages protégées :

```txt
/products
/sales
/reports
/expenses
```

Pages accessibles :

```txt
/
/settings
/contact
/subscription-blocked
```

### Suspension

Si `account_status = 'suspended'`, l'utilisateur est bloqué immédiatement sur les pages sensibles.

## Tests recommandés

### Test essai

Créer un nouvel utilisateur depuis l'application.

Résultat attendu :

```txt
subscription_type = trial
account_status = active
days_remaining = 10
access_status = active
```

### Test J-5

```sql
UPDATE public.user_subscriptions
SET subscription_end = NOW() + INTERVAL '5 days'
WHERE email = 'email_utilisateur@example.com';
```

Résultat attendu :

```txt
Badge J-5 affiché
Accès autorisé
```

### Test expiration

```sql
UPDATE public.user_subscriptions
SET subscription_end = NOW() - INTERVAL '1 day'
WHERE email = 'email_utilisateur@example.com';
```

Résultat attendu :

```txt
Pages sensibles bloquées
Redirection vers /subscription-blocked
```

### Test réactivation

```sql
UPDATE public.user_subscriptions
SET
  subscription_type = 'paid',
  account_status = 'active',
  subscription_end = NOW() + INTERVAL '30 days'
WHERE email = 'email_utilisateur@example.com';
```

Résultat attendu :

```txt
Accès rétabli
Plus de badge essai
Badge J-5 seulement quand la date approche
```

### Test suspension

```sql
UPDATE public.user_subscriptions
SET account_status = 'suspended'
WHERE email = 'email_utilisateur@example.com';
```

Résultat attendu :

```txt
Pages sensibles bloquées
Message compte suspendu
```

## Notes importantes

- Pour prolonger un utilisateur après contact, mettre `subscription_type = 'paid'`.
- Modifier seulement `subscription_end` prolonge l'accès, mais garde le type actuel.
- Si l'utilisateur reste en `trial`, le badge d'essai reste visible.
- Pour enlever le badge d'essai, utiliser `paid` ou `manual`.
- L'email automatique à l'admin après inscription n'est pas encore implanté.
