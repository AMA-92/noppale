import { getProductIntakeNextStep as te } from "./product-intake.mjs";
import {
  calculateSaleSettlement as re,
  nextSaleIntakeQuestion as ne,
  SALE_PAYMENT_METHODS as z,
} from "./sale-intake.mjs";
import { MOUNA_DB_LIMITS, isValidMounaDate } from "./db-contracts.mjs";
const T =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  y = (r, e = []) => ({
    type: "object",
    properties: r,
    required: e,
    additionalProperties: !1,
  }),
  m = (r, e = 200) => ({ type: "string", description: r, maxLength: e }),
  j = (r) => ({ type: "string", description: r, format: "uuid" }),
  A = {
    type: "number",
    minimum: 0,
    description: "Montant positif ou nul en francs CFA.",
  },
  B = {
    type: "integer",
    minimum: 1,
    maximum: MOUNA_DB_LIMITS.maxInteger,
    description: "Quantit\xE9 enti\xE8re positive.",
  },
  ie = {
    type: "array",
    minItems: 1,
    maxItems: 30,
    items: y(
      {
        product_id: j("Identifiant obtenu par list_products."),
        quantity: B,
        unit_price: A,
      },
      ["product_id", "quantity"],
    ),
  },
  ae = {
    type: "array",
    minItems: 1,
    maxItems: 10,
    items: y(
      {
        method: { type: "string", enum: z },
        amount: { type: "number", minimum: 0.01 },
      },
      ["method", "amount"],
    ),
  },
  oe = {
    type: "array",
    minItems: 0,
    maxItems: 30,
    items: y({
      product_id: m(
        "Identifiant retourn\xE9 par list_products, si d\xE9j\xE0 r\xE9solu.",
        80,
      ),
      product_name: m("Nom saisi ou nom propos\xE9 du produit.", 200),
      quantity: B,
    }),
  },
  Y = [
    {
      name: "read_dashboard",
      description:
        "Lire les indicateurs du tableau de bord : ventes et d\xE9penses du jour, du mois, nombre de produits/clients et alertes de stock.",
      input_schema: y({}),
    },
    {
      name: "read_period_summary",
      description:
        "Calculer des totaux complets (ventes, paiements re\xE7us, cr\xE9dits restant dus, d\xE9penses et nombre d\u2019op\xE9rations) sur une p\xE9riode donn\xE9e.",
      input_schema: y(
        {
          from_date: { type: "string", format: "date" },
          to_date: { type: "string", format: "date" },
        },
        ["from_date", "to_date"],
      ),
    },
    {
      name: "list_sales",
      description:
        "Rechercher les ventes avec leurs articles et paiements, optionnellement entre deux dates; utiliser les identifiants retourn\xE9s pour cibler une vente.",
      input_schema: y({
        query: m("Nom de client ou texte \xE0 rechercher.", 100),
        from_date: { type: "string", format: "date" },
        to_date: { type: "string", format: "date" },
        limit: { type: "integer", minimum: 1, maximum: 30 },
      }),
    },
    {
      name: "get_product_stock",
      description:
        "Lire uniquement le stock d\u2019un produit demand\xE9. Utiliser cet outil pour \xAB combien reste-t-il de X ? \xBB, \xAB quel est le stock de X ? \xBB ou toute question cibl\xE9e sur la quantit\xE9 disponible. Ne demande pas l\u2019identifiant : fournis le nom ou le terme exact donn\xE9 par l\u2019utilisateur.",
      input_schema: y(
        { product_name: m("Nom ou terme du produit demand\xE9.", 200) },
        ["product_name"],
      ),
    },
    {
      name: "list_products",
      description:
        "Rechercher/lire les produits du compte, m\xEAme avec accents, apostrophes ou petites fautes. Pour une recherche ressemblante, retourne les candidats proches : pendant une vente, demande \xE0 l\u2019utilisateur de confirmer le nom exact avant de l\u2019ajouter. Les identifiants servent aux outils d\u2019\xE9criture.",
      input_schema: y({
        query: m("Nom, cat\xE9gorie ou texte \xE0 rechercher.", 100),
        low_stock_only: { type: "boolean" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      }),
    },
    {
      name: "list_customers",
      description:
        "Rechercher/lire les clients et leurs coordonn\xE9es commerciales.",
      input_schema: y({
        query: m(
          "Nom, t\xE9l\xE9phone, adresse ou email \xE0 rechercher.",
          100,
        ),
        limit: { type: "integer", minimum: 1, maximum: 50 },
      }),
    },
    {
      name: "list_expenses",
      description:
        "Rechercher/lire les d\xE9penses, optionnellement entre deux dates.",
      input_schema: y({
        query: m("Description ou cat\xE9gorie \xE0 rechercher.", 100),
        from_date: { type: "string", format: "date" },
        to_date: { type: "string", format: "date" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      }),
    },
    {
      name: "read_shop_settings",
      description:
        "Lire le nom, l\u2019adresse, le t\xE9l\xE9phone et l\u2019email de la boutique.",
      input_schema: y({}),
    },
    {
      name: "read_preferences",
      description:
        "Lire les pr\xE9f\xE9rences non sensibles : langue de l\u2019interface, langue de Mouna, devise, th\xE8me sombre et notifications. Ne jamais acc\xE9der au mot de passe ni au code secret.",
      input_schema: y({}),
    },
    {
      name: "create_product",
      description:
        "Utiliser cet outil d\xE8s que l\u2019utilisateur veut ajouter un produit, m\xEAme si des champs manquent. Envoyer seulement les valeurs explicitement connues; le serveur renverra une question unique pour le premier champ manquant, sans rien enregistrer. Ne devine jamais les valeurs absentes et ne les mets pas \xE0 z\xE9ro. Apr\xE8s les cinq champs explicitement recueillis, l\u2019outil pr\xE9pare l\u2019ajout et demande une confirmation.",
      input_schema: y({
        name: m("Nom du produit, uniquement si fourni par l\u2019utilisateur.", MOUNA_DB_LIMITS.productName),
        buying_price: {
          ...A,
          description:
            "Prix d\u2019achat en FCFA, uniquement si explicitement fourni; z\xE9ro n\u2019est accept\xE9 que si l\u2019utilisateur le dit.",
        },
        selling_price: {
          ...A,
          minimum: 0.01,
          description:
            "Prix de vente en FCFA, uniquement si explicitement fourni.",
        },
        stock: {
          type: "integer",
          minimum: 0,
          maximum: MOUNA_DB_LIMITS.maxInteger,
          description:
            "Stock initial entier, uniquement si explicitement fourni; z\xE9ro doit \xEAtre explicite.",
        },
        min_stock: {
          type: "integer",
          minimum: 0,
          maximum: MOUNA_DB_LIMITS.maxInteger,
          description:
            "Seuil minimal entier, uniquement si explicitement fourni; z\xE9ro doit \xEAtre explicite.",
        },
      }),
    },
    {
      name: "update_product",
      description:
        "Pr\xE9parer la modification d\u2019un produit identifi\xE9 par product_id ou par son nom exact lu dans le catalogue. Ne pas modifier le stock avec cet outil : utiliser adjust_stock.",
      input_schema: y({
        product_id: m("Identifiant renvoy\xE9 par list_products.", 80),
        product_name: m("Nom exact lu dans le catalogue.", 200),
        name: m("Nouveau nom.", MOUNA_DB_LIMITS.productName),
        category: m("Nouvelle cat\xE9gorie.", MOUNA_DB_LIMITS.productCategory),
        selling_price: A,
        buying_price: A,
        min_stock: { type: "integer", minimum: 0, maximum: MOUNA_DB_LIMITS.maxInteger },
        barcode: m("Nouveau code-barres ou unit\xE9.", MOUNA_DB_LIMITS.productBarcode),
        description: m("Nouvelle description.", 500),
      }),
    },
    {
      name: "delete_product",
      description:
        "Pr\xE9parer la suppression d\u2019un produit par identifiant ou nom exact lu dans le catalogue; refus si son historique de ventes l\u2019utilise.",
      input_schema: y({
        product_id: m("Identifiant renvoy\xE9 par list_products.", 80),
        product_name: m("Nom exact lu dans le catalogue.", 200),
      }),
    },
    {
      name: "adjust_stock",
      description:
        "Pr\xE9parer un ajustement de stock (delta positif pour ajouter, n\xE9gatif pour retirer); confirmation obligatoire et le stock ne peut pas devenir n\xE9gatif.",
      input_schema: y(
        {
          product_id: m("Identifiant renvoy\xE9 par list_products.", 80),
          product_name: m("Nom exact lu dans le catalogue.", 200),
          delta: {
            type: "integer",
            minimum: -1e6,
            maximum: 1e6,
            description:
              "Variation enti\xE8re de stock, diff\xE9rente de z\xE9ro.",
          },
        },
        ["delta"],
      ),
    },
    {
      name: "create_customer",
      description:
        "Pr\xE9parer l\u2019ajout d\u2019un client; confirmation obligatoire.",
      input_schema: y(
        {
          name: m("Nom du client."),
          phone: m("T\xE9l\xE9phone.", MOUNA_DB_LIMITS.customerPhone),
          email: { type: "string", maxLength: MOUNA_DB_LIMITS.customerEmail },
          address: m("Adresse.", 300),
        },
        ["name"],
      ),
    },
    {
      name: "update_customer",
      description:
        "Pr\xE9parer la modification des coordonn\xE9es d\u2019un client identifi\xE9 exactement.",
      input_schema: y(
        {
          customer_id: j("Identifiant retourn\xE9 par list_customers."),
          name: m("Nouveau nom."),
          phone: m("Nouveau t\xE9l\xE9phone.", MOUNA_DB_LIMITS.customerPhone),
          email: { type: "string", maxLength: MOUNA_DB_LIMITS.customerEmail },
          address: m("Nouvelle adresse.", 300),
        },
        ["customer_id"],
      ),
    },
    {
      name: "delete_customer",
      description:
        "Pr\xE9parer la suppression d\u2019un client; refus si des ventes lui sont encore li\xE9es afin de pr\xE9server l\u2019historique.",
      input_schema: y(
        { customer_id: j("Identifiant retourn\xE9 par list_customers.") },
        ["customer_id"],
      ),
    },
    {
      name: "create_expense",
      description:
        "Pr\xE9parer l\u2019ajout d\u2019une d\xE9pense; confirmation obligatoire.",
      input_schema: y(
        {
          description: m("Description de la d\xE9pense.", 500),
          amount: A,
          category: m("Cat\xE9gorie.", 100),
          date: { type: "string", format: "date" },
          notes: m("Notes.", 500),
        },
        ["description", "amount"],
      ),
    },
    {
      name: "update_expense",
      description:
        "Pr\xE9parer la modification d\u2019une d\xE9pense identifi\xE9e exactement.",
      input_schema: y(
        {
          expense_id: j("Identifiant retourn\xE9 par list_expenses."),
          description: m("Nouvelle description.", 500),
          amount: A,
          category: m("Cat\xE9gorie.", 100),
          date: { type: "string", format: "date" },
          notes: m("Notes.", 500),
        },
        ["expense_id"],
      ),
    },
    {
      name: "delete_expense",
      description:
        "Pr\xE9parer la suppression d\u2019une d\xE9pense identifi\xE9e exactement.",
      input_schema: y(
        { expense_id: j("Identifiant retourn\xE9 par list_expenses.") },
        ["expense_id"],
      ),
    },
    {
      name: "create_sale",
      description:
        "Piloter une vente pas \xE0 pas : client existant exact ou nouveau, articles et quantit\xE9s, demander si le panier est complet puis confirmer son total, recueillir le moyen et les montants encaiss\xE9s (paiements mixtes compris), calculer la monnaie. Appeler avec tous les \xE9l\xE9ments explicites connus, m\xEAme incomplets. La vente attend toujours une confirmation utilisateur avant toute \xE9criture.",
      input_schema: y({
        customer_id: j(
          "Identifiant exact du client retourn\xE9 par list_customers.",
        ),
        customer_name: m("Nom explicite du client.", 200),
        customer_registered: { type: "boolean" },
        register_customer: { type: "boolean" },
        customer_phone: m(
          "Num\xE9ro communiqu\xE9 explicitement, facultatif.",
          MOUNA_DB_LIMITS.customerPhone,
        ),
        items: oe,
        items_complete: { type: "boolean" },
        awaiting_next_product: { type: "boolean" },
        sale_total_confirmed: { type: "boolean" },
        payment_method: {
          type: "string",
          enum: [
            "especes",
            "wave",
            "orange_money",
            "mobile_money",
            "carte_bancaire",
            "credit",
          ],
        },
        payments: ae,
        payment_amount: A,
        cash_received: A,
        advance_paid: { type: "boolean" },
        initial_payment: A,
        initial_payment_method: { type: "string", enum: z },
        credit_balance: { type: "boolean" },
        balance_payment_method: { type: "string", enum: z },
        balance_payment_amount: A,
        due_date: { type: "string", format: "date" },
        notes: m("Notes.", 500),
      }),
    },
    {
      name: "record_sale_payment",
      description:
        "Pr\xE9parer l\u2019enregistrement d\u2019un paiement sur une vente \xE0 cr\xE9dit. Le montant ne peut pas d\xE9passer le solde; confirmation obligatoire.",
      input_schema: y(
        {
          sale_id: j("Identifiant de vente renvoy\xE9 par list_sales."),
          amount: { type: "number", minimum: 0.01 },
          payment_method: { type: "string", enum: z },
          payment_date: { type: "string", format: "date" },
          notes: m("Notes du paiement.", 500),
        },
        ["sale_id", "amount", "payment_method"],
      ),
    },
    {
      name: "delete_sale_payment",
      description:
        "Pr\xE9parer la suppression d\u2019un paiement enregistr\xE9 en ciblant pr\xE9cis\xE9ment la vente et le paiement; confirmation obligatoire.",
      input_schema: y(
        {
          sale_id: j("Identifiant de la vente."),
          payment_id: j("Identifiant de paiement trouv\xE9 dans list_sales."),
        },
        ["sale_id", "payment_id"],
      ),
    },
    {
      name: "update_sale",
      description:
        "Pr\xE9parer une modification compl\xE8te des articles d\u2019une vente, du client et des notes. Les paiements d\xE9j\xE0 re\xE7us ne peuvent \xEAtre effac\xE9s par cet outil; confirmation obligatoire.",
      input_schema: y(
        {
          sale_id: j("Identifiant retourn\xE9 par list_sales."),
          customer_name: m("Nouveau nom du client.", 200),
          notes: m("Nouvelles notes.", 500),
          items: ie,
        },
        ["sale_id", "items"],
      ),
    },
    {
      name: "delete_sale",
      description:
        "Pr\xE9parer la suppression d\xE9finitive d\u2019une vente. La proc\xE9dure atomique retire ses paiements et restaure les quantit\xE9s en stock; confirmation explicite obligatoire.",
      input_schema: y(
        { sale_id: j("Identifiant retourn\xE9 par list_sales.") },
        ["sale_id"],
      ),
    },
    {
      name: "update_shop_settings",
      description:
        "Pr\xE9parer la modification des informations publiques de la boutique (pas du profil, mot de passe ni code secret).",
      input_schema: y({
        name: m("Nom.", 200),
        address: m("Adresse.", 300),
        phone: m("T\xE9l\xE9phone.", 40),
        email: { type: "string", maxLength: 255 },
      }),
    },
    {
      name: "update_preferences",
      description:
        "Pr\xE9parer la modification des pr\xE9f\xE9rences non sensibles de l\u2019utilisateur.",
      input_schema: y({
        language: { type: "string", enum: ["fr", "en", "ar", "wo"] },
        mouna_language: { type: "string", enum: ["fr", "wo", "ar"] },
        currency: { type: "string", maxLength: 20 },
        dark_mode: { type: "boolean" },
        notifications: { type: "boolean" },
      }),
    },
  ],
  H = new Set(Y.map((r) => r.name)),
  V = (r, e, i = "arguments") => {
    if (e.type === "object") {
      if (!r || typeof r != "object" || Array.isArray(r))
        throw new Error(`${i} doit \xEAtre un objet.`);
      for (const d of e.required || [])
        if (r[d] === void 0) throw new Error(`${i}.${d} est obligatoire.`);
      if (e.additionalProperties === !1) {
        for (const d of Object.keys(r))
          if (!Object.prototype.hasOwnProperty.call(e.properties || {}, d))
            throw new Error(`${i}.${d} n\u2019est pas autoris\xE9.`);
      }
      for (const [d, a] of Object.entries(r))
        e.properties?.[d] && V(a, e.properties[d], `${i}.${d}`);
      return;
    }
    if (e.type === "array") {
      if (
        !Array.isArray(r) ||
        (e.minItems !== void 0 && r.length < e.minItems) ||
        (e.maxItems !== void 0 && r.length > e.maxItems)
      )
        throw new Error(
          `${i} n\u2019a pas un nombre d\u2019\xE9l\xE9ments valide.`,
        );
      for (let d = 0; d < r.length; d++) V(r[d], e.items, `${i}[${d}]`);
      return;
    }
    if (e.type === "string") {
      if (typeof r != "string" || r.length > (e.maxLength ?? 1e4))
        throw new Error(`${i} doit \xEAtre un texte valide.`);
      if (e.enum && !e.enum.includes(r))
        throw new Error(`${i} ne fait pas partie des valeurs autoris\xE9es.`);
      if (e.format === "uuid" && !T.test(r))
        throw new Error(`${i} doit \xEAtre un identifiant valide.`);
      if (e.format === "date" && !isValidMounaDate(r))
        throw new Error(`${i} doit \xEAtre une date AAAA-MM-JJ.`);
      return;
    }
    if (e.type === "number" || e.type === "integer") {
      if (
        typeof r != "number" ||
        !Number.isFinite(r) ||
        (e.type === "integer" && !Number.isInteger(r))
      )
        throw new Error(`${i} doit \xEAtre un nombre valide.`);
      if (e.minimum !== void 0 && r < e.minimum)
        throw new Error(`${i} est inf\xE9rieur au minimum autoris\xE9.`);
      if (e.maximum !== void 0 && r > e.maximum)
        throw new Error(`${i} est sup\xE9rieur au maximum autoris\xE9.`);
      return;
    }
    if (e.type === "boolean" && typeof r != "boolean")
      throw new Error(`${i} doit \xEAtre vrai ou faux.`);
  },
  g = (r, e = 500) => (typeof r == "string" ? r.trim().slice(0, e) : ""),
  E = (r, e) => {
    if (typeof r != "string" || !T.test(r)) throw new Error(`${e} invalide.`);
    return r;
  },
  P = (r, e, { integer: i = !1, min: d = 0 } = {}) => {
    const a = Number(r);
    if (!Number.isFinite(a) || a < d || (i && !Number.isInteger(a)))
      throw new Error(`${e} invalide.`);
    return a;
  },
  se = (r) =>
    ({
      FCFA: "franc CFA",
      XOF: "franc CFA",
      EUR: "euro",
      USD: "dollar",
      GBP: "livre sterling",
      JPY: "yen",
      CNY: "yuan",
      CAD: "dollar canadien",
      AUD: "dollar australien",
      CHF: "franc suisse",
      INR: "roupie",
      BRL: "r\xE9al",
      ZAR: "rand",
    })[String(r || "").toUpperCase()] || String(r || "franc CFA"),
  b = (r, e = "FCFA") =>
    `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(r) || 0)} ${se(e)}`,
  D = (r) =>
    String(r)
      .replace(/[\\%_(),]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100),
  U = (r) =>
    String(r || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr-FR")
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  W = (r) =>
    String(r || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr-FR")
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  ce = (r, e) => {
    const i = U(r),
      d = U(e),
      a = Array.from({ length: d.length + 1 }, (s, p) => p);
    for (let s = 1; s <= i.length; s++) {
      let p = a[0];
      a[0] = s;
      for (let t = 1; t <= d.length; t++) {
        const n = a[t];
        ((a[t] =
          i[s - 1] === d[t - 1] ? p : Math.min(p + 1, a[t - 1] + 1, n + 1)),
          (p = n));
      }
    }
    return a[d.length];
  },
  Q = (r, e) => {
    const i = U(r),
      d = U(e.name);
    if (!i || !d) return 0;
    if (i === d) return 100;
    if (d.includes(i) || i.includes(d)) return 80;
    const a = ce(i, d);
    return a <= Math.max(2, Math.floor(Math.max(i.length, d.length) / 5))
      ? 60 - a
      : 0;
  },
  X = async (r, e, i) => {
    const d = g(i, 200);
    if (!d) return { product: null, candidates: [] };
    const s = (
      $(
        await r
          .from("products")
          .select("id,name,stock,selling_price")
          .eq("user_id", e)
          .limit(2e3),
        "Recherche produit",
      ) || []
    )
      .map((p) => ({ product: p, score: Q(d, p) }))
      .filter(({ score: p }) => p > 0)
      .sort((p, t) => t.score - p.score)
      .slice(0, 5);
    return {
      product: s[0]?.score === 100 ? s[0].product : null,
      candidates: s.map(({ product: p }) => p),
    };
  },
  Z = async (r, e, i) => {
    if (i.product_id) return E(i.product_id, "Identifiant produit");
    const d = await X(r, e, i.product_name);
    if (d.product) return d.product.id;
    throw d.candidates.length
      ? new Error(
          `Le produit \xAB ${g(i.product_name, 200)} \xBB n\u2019est pas identifi\xE9 exactement dans la base. Choisissez : ${d.candidates.map((a) => `\xAB ${a.name} \xBB`).join(", ")}.`,
        )
      : new Error(
          `Le produit \xAB ${g(i.product_name, 200)} \xBB est introuvable dans la base.`,
        );
  },
  $ = (r, e) => {
    if (r?.error)
      throw new Error(
        `${e} : ${r.error.message || "erreur de base de donn\xE9es"}`,
      );
    return r?.data;
  },
  I = async (r, e, i, d, a = "*") => {
    const s = await r
        .from(e)
        .select(a)
        .eq("user_id", d)
        .eq("id", i)
        .maybeSingle(),
      p = $(s, `Lecture ${e}`);
    if (!p) throw new Error("Enregistrement introuvable pour ce compte.");
    return p;
  },
  G = async (r, e, i) => {
    if (!Array.isArray(i) || i.length < 1 || i.length > 30)
      throw new Error("Une vente doit contenir de 1 \xE0 30 articles.");
    const d = [];
    for (const a of i) {
      const s = E(a?.product_id, "Identifiant produit"),
        p = P(a?.quantity, "Quantit\xE9", { integer: !0, min: 1 }),
        t = await I(r, "products", s, e, "id,name,stock,selling_price"),
        n = Number(t.selling_price || 0);
      if (n < 0)
        throw new Error("Le prix unitaire doit \xEAtre positif ou nul.");
      d.push({
        product_id: t.id,
        product_name: t.name,
        quantity: p,
        unit_price: n,
        total_price: p * n,
        stock: Number(t.stock || 0),
      });
    }
    return d;
  },
  v = async (r, e, i, d) => {
    if (d.pendingCreated)
      throw new Error(
        "Une action est d\xE9j\xE0 en attente de confirmation. Confirme-la ou annule-la avant d\u2019en pr\xE9parer une autre.",
      );
    const a = crypto.randomUUID(),
      s = new Date(Date.now() + 600 * 1e3).toISOString(),
      p = await d.userClient.rpc("mouna_create_pending_action", {
        p_id: a,
        p_operation: r,
        p_payload: e,
        p_summary: i,
        p_request_id: d.requestId,
        p_expires_at: s,
      });
    if (p?.error)
      throw new Error(
        `Pr\xE9paration de la confirmation : ${p.error.message || "\xE9chec de la base"}`,
      );
    const t =
      p.data && typeof p.data == "object"
        ? p.data
        : { id: a, summary: i, expires_at: s };
    return (
      (d.pendingCreated = t),
      {
        content: JSON.stringify({
          prepared: !0,
          summary: i,
          message:
            "Action NON ex\xE9cut\xE9e. Elle sera appliqu\xE9e uniquement apr\xE8s confirmation explicite : l\u2019utilisateur peut dire \xAB oui, je confirme \xBB \xE0 l\u2019oral ou appuyer sur le bouton Confirmer.",
        }),
        pendingConfirmation: t,
      }
    );
  },
  C = (r) => ({ content: JSON.stringify(r) }),
  de = async (r, e, i, d, a, s, p) => {
    let t = r
      .from(e)
      .select(i)
      .eq("user_id", s)
      .order("created_at", { ascending: !1 })
      .limit(a);
    const n = D(g(d, 100));
    if (n) {
      const c = `%${n}%`;
      t = t.or(p.map((l) => `${l}.ilike.${c}`).join(","));
    }
    const o = $(await t, `Recherche ${e}`);
    return Array.isArray(o) ? o : [];
  };
async function le(r, e, i) {
  if (!H.has(r)) throw new Error("Outil non autoris\xE9.");
  const d = Y.find((t) => t.name === r);
  if ((V(e, d.input_schema), r === "create_product")) {
    const t = te(e);
    if (t.kind === "question")
      return {
        content: JSON.stringify({
          needs_info: !0,
          field: t.field,
          question: t.question,
        }),
        needsInfo: !0,
        question: t.question,
        product_state: Object.fromEntries(
          ["name", "buying_price", "selling_price", "stock", "min_stock"]
            .filter((key) => e[key] !== undefined)
            .map((key) => [key, e[key]]),
        ),
      };
  }
  const a = i.userClient,
    s = i.userId,
    p = (t, n) => Math.min(t, Math.max(1, Math.floor(Number(e.limit) || n)));
  if (r === "read_dashboard") {
    const t = new Date(),
      n = new Date(t);
    n.setHours(0, 0, 0, 0);
    const o = new Date(t.getFullYear(), t.getMonth(), 1),
      [c, l, _, u] = await Promise.all([
        a
          .from("sales")
          .select("total,created_at")
          .eq("user_id", s)
          .gte("created_at", o.toISOString())
          .limit(2e3),
        a
          .from("expenses")
          .select("amount,date")
          .eq("user_id", s)
          .gte("date", o.toISOString().slice(0, 10))
          .limit(2e3),
        a
          .from("products")
          .select("id,name,stock,min_stock")
          .eq("user_id", s)
          .limit(2e3),
        a
          .from("customers")
          .select("id", { count: "exact", head: !0 })
          .eq("user_id", s),
      ]),
      N = $(c, "Lecture tableau de bord") || [],
      w = $(l, "Lecture tableau de bord") || [],
      q = $(_, "Lecture tableau de bord") || [],
      h = (k, L, M, F = "created_at") =>
        k
          .filter((O) => new Date(O[F]) >= M)
          .reduce((O, J) => O + (Number(J[L]) || 0), 0);
    return C({
      date: t.toISOString().slice(0, 10),
      ventes_jour_xof: h(N, "total", n),
      ventes_mois_xof: h(N, "total", o),
      depenses_jour_xof: h(w, "amount", n, "date"),
      depenses_mois_xof: h(w, "amount", o, "date"),
      nombre_produits: q.length,
      nombre_clients: u.count || 0,
      produits_stock_critique: q
        .filter((k) => Number(k.stock || 0) <= Number(k.min_stock || 0))
        .map((k) => ({ name: k.name, stock: k.stock, min_stock: k.min_stock }))
        .slice(0, 30),
    });
  }
  if (r === "read_period_summary") {
    const t = new Date(`${e.from_date}T00:00:00.000Z`),
      n = new Date(`${e.to_date}T23:59:59.999Z`);
    if (!Number.isFinite(t.getTime()) || !Number.isFinite(n.getTime()) || t > n)
      throw new Error("La p\xE9riode de rapport est invalide.");
    const o = async (w, q, h) => {
        const k = [];
        for (let L = 0; L < 1e4; L += 1e3) {
          let M = a
            .from(w)
            .select(q)
            .eq("user_id", s)
            .gte(h, w === "expenses" ? e.from_date : t.toISOString())
            .lte(h, w === "expenses" ? e.to_date : n.toISOString())
            .order(h, { ascending: !0 })
            .range(L, L + 999);
          const F = $(await M, `Rapport ${w}`) || [];
          if ((k.push(...F), F.length < 1e3)) return { rows: k, truncated: !1 };
        }
        return { rows: k, truncated: !0 };
      },
      [c, l] = await Promise.all([
        o(
          "sales",
          "id,total,paid_amount,payment_method,sale_payments(amount)",
          "created_at",
        ),
        o("expenses", "amount,date", "date"),
      ]),
      _ = c.rows.reduce((w, q) => w + (Number(q.total) || 0), 0),
      u = c.rows.reduce((w, q) => {
        const h = Array.isArray(q.sale_payments) ? q.sale_payments : [],
          k = h.length
            ? h.reduce((L, M) => L + (Number(M.amount) || 0), 0)
            : q.payment_method === "credit"
              ? Number(q.paid_amount) || 0
              : Number(q.total) || 0;
        return w + k;
      }, 0),
      N = l.rows.reduce((w, q) => w + (Number(q.amount) || 0), 0);
    return C({
      from_date: e.from_date,
      to_date: e.to_date,
      nombre_ventes: c.rows.length,
      ventes_totales_xof: _,
      paiements_recus_xof: u,
      credits_restants_xof: Math.max(0, _ - u),
      nombre_depenses: l.rows.length,
      depenses_xof: N,
      soldes_net_ventes_moins_depenses_xof: u - N,
      resultat_complet: !c.truncated && !l.truncated,
    });
  }
  if (r === "list_sales") {
    let t = a
      .from("sales")
      .select(
        "id,total,customer_id,customer_name,payment_method,payment_status,paid_amount,remaining_amount,due_date,created_at,notes,sale_items(product_id,product_name,quantity,unit_price,total_price),sale_payments(id,amount,payment_method,payment_date,notes)",
      )
      .eq("user_id", s)
      .order("created_at", { ascending: !1 })
      .limit(p(30, 10));
    const n = D(e.query || "");
    (n && (t = t.or(`customer_name.ilike.%${n}%,notes.ilike.%${n}%`)),
      e.from_date && (t = t.gte("created_at", `${e.from_date}T00:00:00.000Z`)),
      e.to_date && (t = t.lte("created_at", `${e.to_date}T23:59:59.999Z`)));
    const o = $(await t, "Lecture ventes") || [];
    return C(o);
  }
  if (r === "list_products") {
    let t = a
      .from("products")
      .select(
        "id,name,category,stock,min_stock,selling_price,buying_price,barcode,description,created_at",
      )
      .eq("user_id", s)
      .order("created_at", { ascending: !1 })
      .limit(2e3);
    const n = g(e.query, 100),
      o = D(n || "");
    if (o) {
      const l = `%${o}%`;
      t = t.or(
        `name.ilike.${l},category.ilike.${l},description.ilike.${l},barcode.ilike.${l}`,
      );
    }
    let c = $(await t, "Lecture produits") || [];
    return (
      n &&
        !c.length &&
        (c = (
          $(
            await a
              .from("products")
              .select(
                "id,name,category,stock,min_stock,selling_price,buying_price,barcode,description,created_at",
              )
              .eq("user_id", s)
              .order("created_at", { ascending: !1 })
              .limit(2e3),
            "Recherche produits ressemblants",
          ) || []
        )
          .map((_) => ({
            product: _,
            score: Math.max(Q(n, _), Q(n, { name: _.category })),
          }))
          .filter(({ score: _ }) => _ > 0)
          .sort((_, u) => u.score - _.score)
          .slice(0, p(50, 5))
          .map(({ product: _ }) => _)),
      C(
        e.low_stock_only
          ? c.filter((l) => Number(l.stock || 0) <= Number(l.min_stock || 0))
          : c.slice(0, p(50, 20)),
      )
    );
  }
  if (r === "get_product_stock") {
    const t = g(e.product_name, 200);
    if (!t) throw new Error("Le nom du produit est obligatoire.");
    const n =
      $(
        await a
          .from("products")
          .select("id,name,stock")
          .eq("user_id", s)
          .eq("name", t)
          .limit(5),
        "Lecture du stock",
      ) || [];
    if (n.length === 1)
      return C({ name: n[0].name, stock: Number(n[0].stock || 0) });
    if (n.length > 1)
      return C({
        ambiguous: !0,
        products: n.map((c) => ({ name: c.name, stock: Number(c.stock || 0) })),
      });
    const o =
      $(
        await a
          .from("products")
          .select("name")
          .eq("user_id", s)
          .ilike("name", `%${D(t)}%`)
          .limit(5),
        "Recherche du produit",
      ) || [];
    return C(
      o.length
        ? { found: !1, candidates: o.map((c) => c.name) }
        : { found: !1, candidates: [] },
    );
  }
  if (r === "list_customers")
    return C(
      await de(
        a,
        "customers",
        "id,name,phone,email,address,created_at",
        e.query,
        p(50, 20),
        s,
        ["name", "phone", "email", "address"],
      ),
    );
  if (r === "list_expenses") {
    let t = a
      .from("expenses")
      .select("id,description,category,amount,date,notes,created_at")
      .eq("user_id", s)
      .order("created_at", { ascending: !1 })
      .limit(p(50, 20));
    const n = D(e.query || "");
    return (
      n &&
        (t = t.or(
          `description.ilike.%${n}%,category.ilike.%${n}%,notes.ilike.%${n}%`,
        )),
      e.from_date && (t = t.gte("date", e.from_date)),
      e.to_date && (t = t.lte("date", e.to_date)),
      C($(await t, "Lecture d\xE9penses") || [])
    );
  }
  if (r === "read_shop_settings") {
    const t = $(
      await a
        .from("shop_info")
        .select("name,address,phone,email,updated_at")
        .eq("user_id", s)
        .maybeSingle(),
      "Lecture param\xE8tres boutique",
    );
    return C(t || { name: "", address: "", phone: "", email: "" });
  }
  if (r === "read_preferences") {
    const t = $(
      await a
        .from("user_preferences")
        .select(
          "language,mouna_language,currency,dark_mode,notifications,updated_at",
        )
        .eq("user_id", s)
        .maybeSingle(),
      "Lecture pr\xE9f\xE9rences",
    );
    return C(
      t || {
        language: "fr",
        mouna_language: "fr",
        currency: "FCFA",
        dark_mode: !1,
        notifications: !0,
      },
    );
  }
  if (r === "create_product") {
    const t = {
      name: g(e.name, 200),
      category: "",
      selling_price: P(e.selling_price, "Prix de vente", { min: 0.01 }),
      buying_price: P(e.buying_price, "Prix d\u2019achat"),
      stock: P(e.stock, "Stock", { integer: !0 }),
      min_stock: P(e.min_stock, "Stock minimum", { integer: !0 }),
      barcode: "",
      description: "",
    };
    if (!t.name) throw new Error("Le nom du produit est obligatoire.");
    return await v(
      r,
      t,
      `Cr\xE9er le produit \xAB ${t.name} \xBB \u2014 prix de vente ${b(t.selling_price)}, prix d\u2019achat ${b(t.buying_price)}, stock initial ${t.stock}, alerte \xE0 ${t.min_stock}.`,
      i,
    );
  }
  if (r === "update_product") {
    const t = await Z(a, s, e),
      n = await I(
        a,
        "products",
        t,
        s,
        "id,name,category,stock,min_stock,selling_price,buying_price,barcode,description",
      ),
      o = [
        "name",
        "category",
        "selling_price",
        "buying_price",
        "min_stock",
        "barcode",
        "description",
      ],
      c = {};
    for (const u of o)
      e[u] !== void 0 &&
        (c[u] = ["selling_price", "buying_price", "min_stock"].includes(u)
          ? P(e[u], u, { integer: u === "min_stock" })
          : g(e[u], u === "description" ? 500 : u === "category" ? MOUNA_DB_LIMITS.productCategory : u === "barcode" ? MOUNA_DB_LIMITS.productBarcode : MOUNA_DB_LIMITS.productName));
    if (!Object.keys(c).length)
      throw new Error("Aucune modification n\u2019a \xE9t\xE9 fournie.");
    const l = c.name || n.name,
      _ = Object.entries(c)
        .map(([u, N]) => {
          const label = {
            name: "nom",
            category: "catégorie",
            selling_price: "prix de vente",
            buying_price: "prix d’achat",
            min_stock: "stock minimum",
            barcode: "code-barres",
            description: "description",
          }[u] || u;
          const value = ["selling_price", "buying_price"].includes(u)
            ? `${b(N)} FCFA`
            : N;
          return `${label} : ${value}`;
        })
        .join(", ");
    return await v(
      r,
      { product_id: t, changes: c },
      `Modifier le produit \xAB ${n.name} \xBB (${_}).`,
      i,
    );
  }
  if (r === "delete_product") {
    const t = await Z(a, s, e),
      n = await I(a, "products", t, s, "id,name,stock,selling_price"),
      o = await a
        .from("sale_items")
        .select("sale_id")
        .eq("product_id", t)
        .limit(1);
    if (o?.error)
      throw new Error(
        `V\xE9rification historique produit : ${o.error.message || "\xE9chec de lecture"}`,
      );
    if (o?.data?.length)
      throw new Error(
        `Le produit \xAB ${n.name} \xBB figure dans l\u2019historique des ventes et ne peut pas \xEAtre supprim\xE9 par Mouna.`,
      );
    return await v(
      r,
      { product_id: t },
      `Supprimer le produit \xAB ${n.name} \xBB (stock actuel : ${n.stock}, prix : ${b(n.selling_price)}).`,
      i,
    );
  }
  if (r === "adjust_stock") {
    const t = await Z(a, s, e),
      n = P(e.delta, "Variation de stock", { integer: !0, min: -1e6 });
    if (!n)
      throw new Error(
        "La variation de stock doit \xEAtre diff\xE9rente de z\xE9ro.",
      );
    const o = await I(a, "products", t, s, "id,name,stock");
    return await v(
      r,
      { product_id: t, delta: n },
      `${n > 0 ? "Ajouter" : "Retirer"} ${Math.abs(n)} unit\xE9(s) de \xAB ${o.name} \xBB (stock actuel : ${o.stock}).`,
      i,
    );
  }
  if (r === "create_customer") {
    const t = {
      name: g(e.name, 200),
      phone: g(e.phone, MOUNA_DB_LIMITS.customerPhone),
      email: g(e.email, 255),
      address: g(e.address, 300),
    };
    if (!t.name) throw new Error("Le nom du client est obligatoire.");
    return await v(
      r,
      t,
      `Ajouter le client \xAB ${t.name} \xBB${t.phone ? `, t\xE9l\xE9phone ${t.phone}` : ""}${t.email ? `, email ${t.email}` : ""}${t.address ? `, adresse ${t.address}` : ""}.`,
      i,
    );
  }
  if (r === "update_customer") {
    const t = E(e.customer_id, "Identifiant client"),
      n = await I(a, "customers", t, s, "id,name,phone,email,address"),
      o = {};
    for (const c of ["name", "phone", "email", "address"])
      e[c] !== void 0 &&
        (o[c] = g(
          e[c],
          c === "email"
            ? 255
            : c === "address"
              ? 300
              : c === "phone"
                ? MOUNA_DB_LIMITS.customerPhone
                : 200,
        ));
    if (!Object.keys(o).length)
      throw new Error("Aucune modification client n\u2019a \xE9t\xE9 fournie.");
    return await v(
      r,
      { customer_id: t, changes: o },
      `Modifier le client \xAB ${n.name} \xBB (${Object.entries(o)
        .map(([c, l]) => `${c} : ${l}`)
        .join(", ")}).`,
      i,
    );
  }
  if (r === "delete_customer") {
    const t = E(e.customer_id, "Identifiant client"),
      n = await I(a, "customers", t, s, "id,name,phone"),
      o = await a
        .from("sales")
        .select("id")
        .eq("user_id", s)
        .eq("customer_id", t)
        .limit(1);
    if (o?.error)
      throw new Error(
        `V\xE9rification des ventes du client : ${o.error.message || "\xE9chec de lecture"}`,
      );
    if (o?.data?.length)
      throw new Error(
        `Le client \xAB ${n.name} \xBB a au moins une vente li\xE9e; la suppression est bloqu\xE9e pour pr\xE9server l\u2019historique.`,
      );
    return await v(
      r,
      { customer_id: t },
      `Supprimer le client \xAB ${n.name} \xBB${n.phone ? `, t\xE9l\xE9phone ${n.phone}` : ""}.`,
      i,
    );
  }
  if (r === "create_expense") {
    const t = {
      description: g(e.description, 500),
      amount: P(e.amount, "Montant", { min: 0.01 }),
      category: g(e.category, 100) || "g\xE9n\xE9ral",
      date: g(e.date, 10) || new Date().toISOString().slice(0, 10),
      notes: g(e.notes, 500),
    };
    return await v(
      r,
      t,
      `Ajouter la d\xE9pense \xAB ${t.description} \xBB de ${b(t.amount)} (${t.category}, ${t.date}).`,
      i,
    );
  }
  if (r === "update_expense") {
    const t = E(e.expense_id, "Identifiant d\xE9pense"),
      n = await I(
        a,
        "expenses",
        t,
        s,
        "id,description,amount,category,date,notes",
      ),
      o = {};
    for (const c of ["description", "amount", "category", "date", "notes"])
      e[c] !== void 0 &&
        (o[c] =
          c === "amount"
            ? P(e[c], "Montant", { min: 0 })
            : g(e[c], c === "notes" || c === "description" ? 500 : 100));
    if (!Object.keys(o).length)
      throw new Error(
        "Aucune modification de d\xE9pense n\u2019a \xE9t\xE9 fournie.",
      );
    return await v(
      r,
      { expense_id: t, changes: o },
      `Modifier la d\xE9pense \xAB ${n.description} \xBB (${Object.entries(o)
        .map(([c, l]) => `${c} : ${l}`)
        .join(", ")}).`,
      i,
    );
  }
  if (r === "delete_expense") {
    const t = E(e.expense_id, "Identifiant d\xE9pense"),
      n = await I(a, "expenses", t, s, "id,description,amount,date");
    return await v(
      r,
      { expense_id: t },
      `Supprimer la d\xE9pense \xAB ${n.description} \xBB de ${b(n.amount)} dat\xE9e du ${n.date}.`,
      i,
    );
  }
  if (r === "create_sale") {
    let t = g(e.customer_name, 200),
      n = e.customer_id ? E(e.customer_id, "Identifiant client") : null,
      o = e.customer_registered;
    if (
      (!t &&
        n &&
        ((t = (await I(a, "customers", n, s, "id,name")).name), (o = !0)),
      !t)
    )
      return { needsInfo: !0, question: "Quel est le nom du client ?" };
    if (n) ((t = (await I(a, "customers", n, s, "id,name")).name), (o = !0));
    else if (e.register_customer !== !0) {
      const f =
          $(
            await a
              .from("customers")
              .select("id,name")
              .eq("user_id", s)
              .limit(2e3),
            "Recherche client exact",
          ) || [],
        x = W(t),
        S = f.filter((R) => W(R.name) === x).slice(0, 2);
      if (S.length === 1) ((n = S[0].id), (t = S[0].name), (o = !0));
      else {
        if (S.length > 1)
          return {
            needsInfo: !0,
            question: `Plusieurs clients portent le nom \xAB ${t} \xBB. Lequel voulez-vous s\xE9lectionner ?`,
          };
        o = !1;
      }
    }
    const c = Array.isArray(e.items) ? e.items : [],
      l = [];
    for (const f of c) {
      let x = null;
      if (T.test(String(f?.product_id || "")))
        x = await I(
          a,
          "products",
          f.product_id,
          s,
          "id,name,stock,selling_price",
        );
      else {
        const S = await X(a, s, f?.product_name);
        if (!S.product) {
          const R = S.candidates[0],
            ee = R
              ? ` Voulez-vous utiliser le produit \xAB ${R.name} \xBB ?`
              : " V\xE9rifiez son nom dans le catalogue.";
          return {
            needsInfo: !0,
            question: `Je ne peux pas encore identifier \xAB ${g(f?.product_name, 200) || "ce produit"} \xBB.${ee}`,
            sale_state: {
              ...e,
              customer_id: n || void 0,
              customer_name: t,
              customer_registered: o,
              items: [
                ...l,
                {
                  product_name: g(f?.product_name, 200),
                  quantity: f?.quantity,
                },
              ],
            },
          };
        }
        x = S.product;
      }
      l.push({ product_id: x.id, product_name: x.name, quantity: f.quantity });
    }
    let _ = [],
      u = Number(e.total) || 0;
    if (
      l.length &&
      l.every(
        (f) => Number.isInteger(Number(f.quantity)) && Number(f.quantity) > 0,
      )
    ) {
      _ = await G(
        a,
        s,
        l.map((x) => ({
          product_id: x.product_id,
          quantity: Number(x.quantity),
        })),
      );
      const f = _.find((x) => x.quantity > x.stock);
      if (f)
        throw new Error(
          `Stock insuffisant pour \xAB ${f.product_name} \xBB : ${f.stock} disponible(s), ${f.quantity} demand\xE9(s).`,
        );
      u = _.reduce((x, S) => x + S.total_price, 0);
    }
    const N = {
        ...e,
        customer_id: n || void 0,
        customer_name: t,
        customer_registered: o,
        items: l,
        total: u,
      },
      w = ne({
        ...e,
        customer_name: t,
        customer_registered: o,
        items: l,
        total: u,
        currency_code: i.currency_code || "FCFA",
      });
    if (w)
      return {
        needsInfo: !0,
        question: w,
        sale_state: { ...N, currency_code: i.currency_code || "FCFA" },
      };
    if (!_.length)
      throw new Error("Ajoutez au moins un article complet au panier.");
    const q = e.payment_method,
      h = re({
        total: u,
        payment_method: q,
        payments: e.payments,
        payment_amount: e.payment_amount,
        cash_received: e.cash_received,
        advance_paid: e.advance_paid,
        initial_payment: e.initial_payment,
        initial_payment_method: e.initial_payment_method,
        credit_balance: e.credit_balance,
        balance_payment_method: e.balance_payment_method,
        balance_payment_amount: e.balance_payment_amount,
      }),
      k = !n && e.register_customer === !0,
      L = [g(e.notes, 500)];
    h.change > 0 && L.push(`Monnaie rendue : ${b(h.change, i.currency_code)}.`);
    const M = {
        items: _.map(({ product_id: f, quantity: x, unit_price: S }) => ({
          product_id: f,
          quantity: x,
          unit_price: S,
        })),
        customer_id: n,
        customer_name: t,
        create_customer: k,
        customer_phone: g(e.customer_phone, MOUNA_DB_LIMITS.customerPhone),
        payment_method: h.payment_method,
        payments: h.payments,
        initial_payment: q === "credit" ? h.paid_amount : null,
        due_date: g(e.due_date, 10) || null,
        notes: L.filter(Boolean).join(" ").slice(0, 500),
        total: u,
        cash_received: h.cash_received,
        change: h.change,
      },
      F = _.map(
        (f) =>
          `${f.quantity} \xD7 ${f.product_name} \xE0 ${b(f.unit_price, i.currency_code)}`,
      ).join(", "),
      O = {
        especes: "esp\xE8ces",
        wave: "Wave",
        orange_money: "Orange Money",
        mobile_money: "Mobile Money",
        carte_bancaire: "carte bancaire",
      },
      J = h.payments.length
        ? h.payments
            .map(
              (f) =>
                `${b(f.amount, i.currency_code)} par ${O[f.method] || f.method}`,
            )
            .join(" + ")
        : "\xE0 cr\xE9dit, sans avance",
      K = `Cr\xE9er la vente pour ${t}${k ? " (nouveau client \xE0 enregistrer)" : ""}. R\xE9capitulatif : le client ${t} a achet\xE9 ${F}; total ${b(u, i.currency_code)}; paiement ${J}${h.paid_amount < u ? `; reste \xE0 cr\xE9dit ${b(u - h.paid_amount, i.currency_code)}` : ""}${h.change > 0 ? `; monnaie \xE0 rendre ${b(h.change, i.currency_code)}` : ""}.`;
    return await v(r, M, K, i);
  }
  if (r === "record_sale_payment") {
    const t = E(e.sale_id, "Identifiant vente"),
      n = await I(
        a,
        "sales",
        t,
        s,
        "id,total,paid_amount,customer_name,payment_method",
      );
    if (n.payment_method !== "credit")
      throw new Error(
        "Les paiements compl\xE9mentaires sont r\xE9serv\xE9s aux ventes \xE0 cr\xE9dit.",
      );
    const o =
        $(
          await a.from("sale_payments").select("amount").eq("sale_id", t),
          "Lecture paiements",
        ) || [],
      c = o.length
        ? o.reduce((N, w) => N + (Number(w.amount) || 0), 0)
        : Number(n.paid_amount || 0),
      l = P(e.amount, "Montant du paiement", { min: 0.01 }),
      _ = Number(n.total || 0) - c;
    if (l > _)
      throw new Error(
        `Le paiement (${b(l)}) d\xE9passe le solde restant (${b(_)}).`,
      );
    const u = {
      sale_id: t,
      amount: l,
      payment_method: e.payment_method,
      payment_date:
        g(e.payment_date, 10) || new Date().toISOString().slice(0, 10),
      notes: g(e.notes, 500),
    };
    return await v(
      r,
      u,
      `Enregistrer un paiement de ${b(l)} (${u.payment_method}, ${u.payment_date}) sur la vente de ${n.customer_name || "Client"}; solde actuel ${b(_)}.`,
      i,
    );
  }
  if (r === "delete_sale_payment") {
    const t = E(e.sale_id, "Identifiant vente"),
      n = E(e.payment_id, "Identifiant paiement"),
      o = await I(a, "sales", t, s, "id,customer_name"),
      c = $(
        await a
          .from("sale_payments")
          .select("id,amount,payment_method,payment_date")
          .eq("id", n)
          .eq("sale_id", t)
          .maybeSingle(),
        "Lecture paiement",
      );
    if (!c) throw new Error("Paiement introuvable sur cette vente.");
    return await v(
      r,
      { sale_id: t, payment_id: n },
      `Supprimer le paiement de ${b(c.amount)} (${c.payment_method}, ${c.payment_date}) sur la vente de ${o.customer_name || "Client"}.`,
      i,
    );
  }
  if (r === "update_sale") {
    const t = E(e.sale_id, "Identifiant vente"),
      n = await I(
        a,
        "sales",
        t,
        s,
        "id,total,customer_name,created_at,payment_method,notes",
      ),
      o =
        $(
          await a
            .from("sale_items")
            .select("product_name,quantity,unit_price,total_price")
            .eq("sale_id", t),
          "Lecture articles vente",
        ) || [],
      c = await G(a, s, e.items),
      l = c.reduce((u, N) => u + N.total_price, 0),
      _ = {
        sale_id: t,
        customer_name: g(e.customer_name, 200) || n.customer_name || "Client",
        notes: e.notes === void 0 ? n.notes || "" : g(e.notes, 500),
        items: c.map(({ product_id: u, quantity: N, unit_price: w }) => ({
          product_id: u,
          quantity: N,
          unit_price: w,
        })),
        total: l,
      };
    return await v(
      r,
      _,
      `Modifier la vente du ${new Date(n.created_at).toLocaleDateString("fr-FR")} pour ${n.customer_name || "Client"} : remplacer ${o.map((u) => `${u.quantity} \xD7 ${u.product_name}`).join(", ")} (${b(n.total)}) par ${c.map((u) => `${u.quantity} \xD7 ${u.product_name}`).join(", ")} (${b(l)}).`,
      i,
    );
  }
  if (r === "delete_sale") {
    const t = E(e.sale_id, "Identifiant vente"),
      n = await I(a, "sales", t, s, "id,total,customer_name,created_at"),
      o =
        $(
          await a
            .from("sale_items")
            .select("product_name,quantity")
            .eq("sale_id", t),
          "Lecture articles vente",
        ) || [];
    return await v(
      r,
      { sale_id: t },
      `Supprimer d\xE9finitivement la vente du ${new Date(n.created_at).toLocaleDateString("fr-FR")} pour ${n.customer_name || "Client"}, ${b(n.total)} (${o.map((c) => `${c.quantity} \xD7 ${c.product_name}`).join(", ")}). Ses paiements seront supprim\xE9s et les articles restaur\xE9s au stock.`,
      i,
    );
  }
  if (r === "update_shop_settings") {
    const t = {};
    for (const n of ["name", "address", "phone", "email"])
      e[n] !== void 0 &&
        (t[n] = g(
          e[n],
          n === "address"
            ? 300
            : n === "phone"
              ? 40
              : n === "email"
                ? 255
                : 200,
        ));
    if (!Object.keys(t).length)
      throw new Error(
        "Aucune information boutique n\u2019a \xE9t\xE9 fournie.",
      );
    return await v(
      r,
      t,
      `Modifier les param\xE8tres de la boutique : ${Object.entries(t)
        .map(([n, o]) => `${n} = ${o}`)
        .join(", ")}.`,
      i,
    );
  }
  if (r === "update_preferences") {
    const t = {};
    for (const n of [
      "language",
      "mouna_language",
      "currency",
      "dark_mode",
      "notifications",
    ])
      e[n] !== void 0 && (t[n] = e[n]);
    if (!Object.keys(t).length)
      throw new Error("Aucune pr\xE9f\xE9rence n\u2019a \xE9t\xE9 fournie.");
    return await v(
      r,
      t,
      `Modifier les pr\xE9f\xE9rences : ${Object.entries(t)
        .map(([n, o]) => `${n} = ${o}`)
        .join(", ")}.`,
      i,
    );
  }
  throw new Error("Outil non g\xE9r\xE9.");
}
async function pe(r, e) {
  const { data: i, error: d } = await e.userClient.rpc(
    "mouna_execute_confirmed_action",
    { p_action_id: r.id },
  );
  if (d)
    throw new Error(
      d.message || "\xC9chec de l\u2019ex\xE9cution confirm\xE9e.",
    );
  if (!i?.ok)
    throw new Error("L\u2019action n\u2019a pas \xE9t\xE9 ex\xE9cut\xE9e.");
  const a = Number(i.result?.change || 0);
  if (
    [
      "create_product",
      "update_product",
      "adjust_stock",
      "delete_product",
    ].includes(i.operation)
  ) {
    const n = i.result?.entity_id || i.result?.product_id;
    if (!n)
      throw new Error(
        "La base n\u2019a pas renvoy\xE9 l\u2019identifiant du produit modifi\xE9.",
      );
    const { data: o, error: c } = await e.userClient
      .from("products")
      .select("id")
      .eq("id", n)
      .eq("user_id", e.userId)
      .maybeSingle();
    if (c)
      throw new Error(
        `V\xE9rification du produit dans la base impossible : ${c.message}`,
      );
    if (i.operation === "delete_product" ? o : !o)
      throw new Error(
        i.operation === "delete_product"
          ? "Le produit n\u2019a pas \xE9t\xE9 supprim\xE9 de la base."
          : "Le produit n\u2019a pas \xE9t\xE9 retrouv\xE9 dans la base apr\xE8s confirmation.",
      );
  }
  const s = i.operation === "create_sale" ? i.result?.sale : null;
  if (i.operation === "create_sale") {
    if (!s?.id)
      throw new Error(
        "La base n\u2019a pas renvoy\xE9 l\u2019identifiant de la vente cr\xE9\xE9e.",
      );
    const { data: n, error: o } = await e.userClient
      .from("sales")
      .select("id")
      .eq("id", s.id)
      .eq("user_id", e.userId)
      .maybeSingle();
    if (o || !n?.id)
      throw new Error(
        "La vente n\u2019a pas pu \xEAtre v\xE9rifi\xE9e dans la liste des ventes.",
      );
  }
  const p = s?.id
    ? {
        id: s.id,
        customerName: s.customer_name || "Client",
        date: s.created_at,
        total: Number(s.total || 0),
        paymentMethod: s.payment_method || "credit",
        items: Array.isArray(i.result?.items)
          ? i.result.items.map((n) => ({
              name: n.product_name,
              quantity: Number(n.quantity),
              price: Number(n.unit_price),
              total: Number(n.total_price),
            }))
          : [],
      }
    : null;
  return {
    reply:
      i.operation === "create_sale"
        ? `Vente enregistr\xE9e${a > 0 ? `. Monnaie \xE0 rendre : ${b(a, e.currency_code)}` : ""}.`
        : i.summary
          ? `Action effectu\xE9e : ${i.summary}`
          : "Action confirm\xE9e et effectu\xE9e.",
    operation: i.operation,
    invoiceData: p,
  };
}
const _e = (r) => typeof r == "string" && T.test(r),
  fe = (r) => H.has(r);
export {
  Y as MOUNA_TOOLS,
  pe as executeConfirmedMounaAction,
  le as executeMounaTool,
  _e as isAllowedConfirmationId,
  fe as isKnownMounaTool,
};
