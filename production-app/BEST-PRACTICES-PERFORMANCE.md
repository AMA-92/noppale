# Bonnes Pratiques Performance - Noppalé

## 🚫 À NE PAS FAIRE

### ❌ Créer des objets/arrays dans le rendu
```jsx
// ❌ MAUVAIS - Crée un nouvel objet à chaque rendu
const MyComponent = () => {
  return <Child data={{ id: 1, name: 'test' }} />
}

// ✅ BON - Objet mémorisé
const MyComponent = () => {
  const data = useMemo(() => ({ id: 1, name: 'test' }), [])
  return <Child data={data} />
}
```

### ❌ Passer des fonctions inline
```jsx
// ❌ MAUVAIS - Nouvelle fonction à chaque rendu
<button onClick={() => handleClick(item)}>Click</button>

// ✅ BON - Fonction mémorisée
const handleItemClick = useCallback(() => {
  handleClick(item)
}, [item, handleClick])

<button onClick={handleItemClick}>Click</button>
```

### ❌ Ne pas mémoriser les composants enfants
```jsx
// ❌ MAUVAIS - Child re-rend même si props identiques
export default function Parent({ data }) {
  return <Child data={data} />
}

// ✅ BON - Mémorisé
const Child = React.memo(({ data }) => {
  return <div>{data.name}</div>
})

export default function Parent({ data }) {
  return <Child data={data} />
}
```

### ❌ Faire des appels Supabase sans cache
```jsx
// ❌ MAUVAIS - Rechargement à chaque rendu
const MyComponent = ({ userId }) => {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    supabase.from('table').select('*').then(result => {
      setData(result)
    })
  }, [userId])
}

// ✅ BON - Avec cache
const queryCache = new Map()
const MyComponent = ({ userId }) => {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    if (queryCache.has(userId)) {
      setData(queryCache.get(userId))
      return
    }
    
    supabase.from('table').select('*').then(result => {
      queryCache.set(userId, result)
      setData(result)
    })
  }, [userId])
}
```

### ❌ Laisser StrictMode en production
```jsx
// ❌ MAUVAIS
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// ✅ BON (déjà fait)
ReactDOM.createRoot(root).render(<App />)
```

### ❌ Charger tous les modules au démarrage
```jsx
// ❌ MAUVAIS
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sales from './pages/Sales'

// ✅ BON (déjà fait)
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Products = lazy(() => import('./pages/Products'))
const Sales = lazy(() => import('./pages/Sales'))
```

## ✅ CE QU'IL FAUT FAIRE

### ✅ Utiliser useMemo pour les valeurs complexes
```jsx
const MyComponent = ({ items }) => {
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.name.localeCompare(b.name))
  }, [items])
  
  return <ItemList items={sortedItems} />
}
```

### ✅ Utiliser useCallback pour les fonctions de callback
```jsx
const MyComponent = ({ onItemClick }) => {
  const handleClick = useCallback((item) => {
    onItemClick(item)
  }, [onItemClick])
  
  return <button onClick={() => handleClick(data)}>Click</button>
}
```

### ✅ Wrap les pages lazy dans Suspense
```jsx
<Suspense fallback={<div>Chargement...</div>}>
  <Dashboard />
</Suspense>
```

### ✅ Implémenter un cache avant chaque requête Supabase
```jsx
const cache = new Map()
const CACHE_TTL = 30000 // 30 secondes

const loadData = async (id) => {
  const now = Date.now()
  const cacheKey = `data:${id}`
  
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey)
    if (now - timestamp < CACHE_TTL) {
      return data
    }
  }
  
  const result = await supabase.from('table').select('*')
  cache.set(cacheKey, { data: result, timestamp: now })
  return result
}
```

### ✅ Utiliser React.memo pour les composants stateless
```jsx
const StatsCard = React.memo(({ title, value, icon: Icon }) => {
  return (
    <div className="card">
      <Icon />
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  )
})
```

### ✅ Nettoyer les subscriptions realtime
```jsx
useEffect(() => {
  const subscription = setupRealtimeSubscription()
  
  return () => {
    // Nettoyer le cache et la subscription
    subscriptionCache.delete(key)
    supabase.removeChannel(subscription)
  }
}, [])
```

## 📦 Patterns à Respecter

### Pattern 1: Cache + Timeout
```jsx
const cache = new Map()

const fetchWithCache = async (key, fetcher, ttl) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }
  
  const data = await fetcher()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}
```

### Pattern 2: Debounce pour les changements
```jsx
const debouncedSearch = useCallback(
  debounce((query) => {
    performSearch(query)
  }, 300),
  []
)
```

### Pattern 3: Memoized Selector
```jsx
const selectUserName = useCallback(
  (state) => state.user?.name,
  []
)
```

## 🎯 Checklist pour Nouvelles Features

- [ ] Page lazy-loadée avec `React.lazy()`
- [ ] Wrappée dans `<Suspense>`
- [ ] Composants mémorisés si > 1 prop
- [ ] Fonctions callbacks utilisent `useCallback`
- [ ] Valeurs complexes utilisent `useMemo`
- [ ] Requêtes Supabase ont du cache
- [ ] Pas de console.log en production (build strip)
- [ ] Pas d'objets/arrays créés dans render
- [ ] Pas de fonctions inline (sauf très simple)
- [ ] Cleanup des subscriptions realtime
- [ ] Test perf avec Lighthouse (>90 score)

## 🔧 Debugging Performance

### Identifier les re-rendus inutiles
```jsx
const MyComponent = React.memo(({ data }) => {
  useEffect(() => {
    console.log('MyComponent rendered', data)
  })
  
  return <div>{data}</div>
})
```

### Vérifier le cache
```jsx
console.log('Cache:', subscriptionCache.size, 'entries')
console.log('Cache keys:', Array.from(subscriptionCache.keys()))
```

### Profiler un composant
```jsx
import { unstable_trace as trace } from 'react'

trace('my-interaction', performance.now(), () => {
  // Code à profiler
})
```

## 📈 Métriques à Monitorer

1. **First Contentful Paint (FCP)**: < 1.5s
2. **Largest Contentful Paint (LCP)**: < 2.5s
3. **Cumulative Layout Shift (CLS)**: < 0.1
4. **Time to Interactive (TTI)**: < 3s
5. **Total Blocking Time (TBT)**: < 300ms

Tous ces metrics > 90 dans Lighthouse = ✅ Performance Excellent
