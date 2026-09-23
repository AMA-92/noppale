# Récapitulatif Rapide - Déploiement Étape 3

## 🚀 Déploiement en 5 minutes

### 1. Accéder au Dashboard Supabase
🔗 [https://supabase.com/dashboard/project/sewgwcxaenssloobnfjk/functions](https://supabase.com/dashboard/project/sewgwcxaenssloobnfjk/functions)

### 2. Mettre à jour la fonction assistant
- Cliquez sur la fonction `assistant`
- Remplacez tout le code par celui de : `production-app/supabase/functions/assistant/index.ts`
- Cliquez sur **Deploy**

### 3. Configurer les secrets
Allez dans **Project Settings → Edge Functions → Secrets** et ajoutez :

```
ANTHROPIC_API_KEY=sk-ant-******** (votre clé)
ANTHROPIC_MODEL=claude-haiku-4-5
```

### 4. Tester localement
```bash
cd production-app
npm install
npm run dev
```

### 5. Valider l'étape 3
Suivez le guide : `docs/TEST-ETAPE-3.md`

---

## 📋 Ce que vous avez besoin

### ✅ Clé API Anthropic
- Créée sur [platform.claude.com/settings/keys](https://platform.claude.com/settings/keys)
- Commence par `sk-ant-...`
- Jamais dans le code frontend

### ✅ Accès Supabase
- Project: Noppale
- Ref: sewgwcxaenssloobnfjk
- URL: https://sewgwcxaenssloobnfjk.supabase.co

---

## 📁 Fichiers utiles

- **Guide complet** : `docs/GUIDE-DEPLOIEMENT-MANUEL.md`
- **Code à déployer** : `production-app/supabase/functions/assistant/index.ts`
- **Guide de test** : `docs/TEST-ETAPE-3.md`
- **Améliorations** : `docs/ETAPE-3-AMELIORATIONS.md`

---

## ⚠️ Points importants

1. **NE JAMAIS** mettre la clé Anthropic dans le code frontend
2. **TOUJOURS** utiliser les secrets Supabase Edge Functions
3. **VÉRIFIER** les logs après déploiement
4. **TESTER** avec les 12 scénarios du guide de test

---

## 🆘 En cas de problème

### Clé API manquante
→ Vérifiez les secrets dans Supabase Dashboard

### Erreur 401
→ Vérifiez que la clé Anthropic est valide

### Fonction ne répond pas
→ Consultez les logs dans Supabase Dashboard

### Microphone ne fonctionne pas
→ Utilisez Chrome/Edge et vérifiez les permissions

---

## ✅ Check-list finale

- [ ] Code amélioré déployé
- [ ] Secrets configurés
- [ ] Déploiement réussi
- [ ] Logs sans erreur
- [ ] Application locale lancée
- [ ] Test "Bonjour" réussi
- [ ] Tests multilingues réussis
- [ ] Étape 3 validée

---

**Prêt à déployer ?** Commencez par l'étape 1 du guide complet ! 🚀
