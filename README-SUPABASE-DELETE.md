# Guide de suppression d'utilisateur dans Supabase

## Problème
L'erreur `Database error deleting user` se produit car Supabase ne permet pas de supprimer un utilisateur directement avec les permissions client standards.

## Solutions

### Solution 1: Fonction SQL (Recommandée)

1. **Créez la fonction SQL dans Supabase Dashboard:**
   - Allez dans `Database` > `SQL Editor`
   - Copiez-collez le contenu de `supabase/functions/delete-user/index.sql`
   - Exécutez la fonction

2. **La fonction fait:**
   - Vérifie les permissions (un utilisateur ne peut supprimer que son propre compte)
   - Supprime toutes les données dans les tables liées
   - Supprime l'utilisateur auth avec `auth.admin.delete_user()`

### Solution 2: Suppression manuelle via Dashboard

1. **Allez dans Supabase Dashboard**
2. **Authentication** → **Users**
3. **Trouvez l'utilisateur** à supprimer
4. **Cliquez sur les 3 points** → **Delete**
5. **Confirmez la suppression**

### Solution 3: Service Role Key (Admin)

Pour supprimer par programmation avec les permissions admin:

```javascript
import { createClient } from '@supabase/supabase-js'

// Utiliser la SERVICE ROLE KEY (jamais côté client!)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function deleteUser(userId) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) throw error
  return true
}
```

⚠️ **ATTENTION:** La SERVICE ROLE KEY doit être utilisée uniquement côté serveur!

### Solution 4: Edge Function

Créez une Edge Function pour gérer la suppression:

```javascript
// supabase/functions/delete-user/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId } = await req.json()
    
    // Supprimer l'utilisateur
    const { error } = await supabaseClient.auth.admin.deleteUser(userId)
    
    if (error) throw error
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

## Étapes pour résoudre votre problème

### Étape 1: Vérifier les permissions
Assurez-vous que vous avez les permissions nécessaires dans Supabase.

### Étape 2: Utiliser la fonction SQL
1. Exécutez la fonction SQL dans le dashboard
2. Testez avec le code JavaScript fourni

### Étape 3: Alternative manuelle
Si la fonction ne fonctionne pas, supprimez manuellement via le dashboard.

## Code d'utilisation

```javascript
// Pour supprimer l'utilisateur connecté
try {
  const result = await usersStorage.deleteUser()
  console.log(result.message)
} catch (error) {
  console.error(error.message)
}

// Pour supprimer un utilisateur spécifique (admin)
try {
  const result = await usersStorage.deleteUser('user-uuid-here')
  console.log(result.message)
} catch (error) {
  console.error(error.message)
}
```

## Dépannage

Si vous avez encore l'erreur:

1. **Vérifiez que la fonction SQL est bien créée**
2. **Vérifiez les RLS policies** sur vos tables
3. **Assurez-vous d'être connecté** avec les bons droits
4. **Essayez la suppression manuelle** via le dashboard

## Notes importantes

- La suppression est **irréversible**
- Sauvegardez les données importantes avant suppression
- Testez toujours en environnement de développement d'abord
