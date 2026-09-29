export const SALE_PAYMENT_METHODS = [
  "especes",
  "wave",
  "orange_money",
  "mobile_money",
  "carte_bancaire",
];

const money = (value) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    Number(value) || 0,
  );
const currencyLabel = (value) =>
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
    BRL: "réal",
    ZAR: "rand",
  })[String(value || "").toUpperCase()] || String(value || "franc CFA");

export function nextSaleIntakeQuestion(state) {
  const customerName = String(state.customer_name || "").trim();
  if (!customerName) return "Quel est le nom du client ?";
  if (
    state.customer_registered === false &&
    state.register_customer === undefined
  ) {
    return `Le client « ${customerName} » n’est pas enregistré. Voulez-vous l’ajouter à la liste des clients ?`;
  }

  const items = Array.isArray(state.items) ? state.items : [];
  if (!items.length) return "Quel produit voulez-vous vendre ?";
  const incomplete = items.find(
    (item) =>
      !String(item.product_name || "").trim() ||
      !Number.isInteger(Number(item.quantity)) ||
      Number(item.quantity) < 1,
  );
  if (incomplete) {
    if (!String(incomplete.product_name || "").trim())
      return "Quel produit voulez-vous vendre ?";
    return `Combien d’unités de « ${String(incomplete.product_name).trim()} » voulez-vous vendre ?`;
  }
  if (state.awaiting_next_product === true || state.items_complete === false)
    return "Quel autre produit voulez-vous ajouter ?";
  if (state.items_complete !== true) return "Est-ce tout pour cette vente ?";
  if (!state.payment_method)
    return `Total du panier : ${money(state.total)} ${currencyLabel(state.currency_code || state.currency_label)}. Quel mode de paiement : espèces, Wave, Orange Money, Mobile Money, carte bancaire ou crédit ?`;

  const method = state.payment_method;
  const payments = Array.isArray(state.payments) ? state.payments : [];
  if (method === "credit" && state.advance_paid === undefined)
    return "Le client a-t-il versé une avance ?";
  if (method === "credit" && state.advance_paid === false) return null;
  if (
    method === "credit" &&
    state.advance_paid === true &&
    state.initial_payment === undefined
  )
    return "Quel montant a-t-il versé en avance ?";
  if (
    method === "credit" &&
    Number(state.initial_payment) > 0 &&
    !state.initial_payment_method
  )
    return "Par quel moyen a-t-il payé l’avance ?";

  const cashInPayments =
    payments.some((payment) => payment.method === "especes") ||
    state.balance_payment_method === "especes";
  if (
    method === "especes" &&
    !payments.length &&
    state.cash_received === undefined
  )
    return "Combien avez-vous encaissé en espèces ?";
  if (cashInPayments && state.cash_received === undefined)
    return "Combien avez-vous encaissé en espèces ?";
  if (
    method === "credit" &&
    state.initial_payment_method === "especes" &&
    Number(state.initial_payment) > 0 &&
    state.cash_received === undefined
  ) {
    return "Combien avez-vous encaissé en espèces pour cette avance ?";
  }

  let paid = payments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0,
  );
  if (
    !payments.length &&
    method === "especes" &&
    state.cash_received !== undefined
  )
    paid = Math.min(Number(state.cash_received) || 0, Number(state.total) || 0);
  else if (
    !payments.length &&
    method !== "credit" &&
    state.payment_amount !== undefined
  )
    paid = Number(state.payment_amount) || 0;
  if (
    state.credit_balance === false &&
    state.balance_payment_amount !== undefined
  )
    paid += Number(state.balance_payment_amount) || 0;
  const advance =
    method === "credit" && state.advance_paid
      ? Number(state.initial_payment) || 0
      : 0;
  const totalPaid = paid + advance;
  const total = Number(state.total) || 0;
  if (
    method !== "credit" &&
    !payments.length &&
    method !== "especes" &&
    state.payment_amount === undefined
  ) {
    const label =
      method === "wave"
        ? "Wave"
        : method === "orange_money"
          ? "Orange Money"
          : method === "carte_bancaire"
            ? "carte bancaire"
            : "Mobile Money";
    return `Quel montant le client a-t-il réglé par ${label} ?`;
  }
  if (
    totalPaid < total &&
    method !== "credit" &&
    state.credit_balance === undefined
  ) {
    return `Le solde de ${money(total - totalPaid)} ${currencyLabel(state.currency_code || state.currency_label)} sera-t-il laissé à crédit ou réglé autrement ?`;
  }
  if (
    totalPaid < total &&
    state.credit_balance === false &&
    !state.balance_payment_method
  ) {
    return `Par quel moyen le client a-t-il réglé le solde de ${money(total - totalPaid)} ${currencyLabel(state.currency_code || state.currency_label)} ?`;
  }
  if (
    totalPaid < total &&
    state.credit_balance === false &&
    state.balance_payment_method &&
    state.balance_payment_amount === undefined
  ) {
    const label =
      state.balance_payment_method === "wave"
        ? "Wave"
        : state.balance_payment_method === "orange_money"
          ? "Orange Money"
          : state.balance_payment_method === "especes"
            ? "espèces"
            : state.balance_payment_method === "carte_bancaire"
              ? "carte bancaire"
              : "Mobile Money";
    return `Quel montant le client a-t-il réglé par ${label} ?`;
  }
  return null;
}

export function calculateSaleSettlement({
  total,
  payment_method,
  payments = [],
  payment_amount,
  cash_received,
  advance_paid,
  initial_payment,
  initial_payment_method,
  credit_balance,
  balance_payment_method,
  balance_payment_amount,
}) {
  const saleTotal = Number(total);
  if (!Number.isFinite(saleTotal) || saleTotal <= 0)
    throw new Error("Le total de la vente doit être supérieur à zéro.");
  let normalized = Array.isArray(payments)
    ? payments.map((payment) => ({
        method: payment.method,
        amount: Number(payment.amount),
      }))
    : [];
  let cashTendered =
    cash_received === undefined ? undefined : Number(cash_received);

  if (payment_method === "credit") {
    normalized =
      advance_paid && Number(initial_payment) > 0
        ? [{ method: initial_payment_method, amount: Number(initial_payment) }]
        : [];
    if (advance_paid && Number(initial_payment) <= 0)
      throw new Error("Le montant de l’avance doit être supérieur à zéro.");
  } else if (
    !normalized.length &&
    payment_method === "especes" &&
    cashTendered !== undefined
  ) {
    if (!Number.isFinite(cashTendered) || cashTendered <= 0)
      throw new Error(
        "Le montant encaissé en espèces doit être supérieur à zéro.",
      );
    normalized = [
      { method: "especes", amount: Math.min(cashTendered, saleTotal) },
    ];
  } else if (!normalized.length && payment_method !== "especes") {
    const amount =
      payment_amount === undefined ? saleTotal : Number(payment_amount);
    normalized = [{ method: payment_method, amount }];
  }

  if (
    credit_balance === false &&
    balance_payment_method &&
    balance_payment_amount !== undefined
  ) {
    normalized.push({
      method: balance_payment_method,
      amount: Number(balance_payment_amount),
    });
  }

  if (!normalized.length && payment_method !== "credit")
    throw new Error("Le montant du paiement est obligatoire.");
  if (
    normalized.some(
      (payment) =>
        !SALE_PAYMENT_METHODS.includes(payment.method) ||
        !Number.isFinite(payment.amount) ||
        payment.amount <= 0,
    )
  ) {
    throw new Error(
      "Chaque paiement doit avoir un moyen valide et un montant supérieur à zéro.",
    );
  }

  const paid = normalized.reduce((sum, payment) => sum + payment.amount, 0);
  if (paid > saleTotal)
    throw new Error("Les paiements dépassent le total de la vente.");
  if (
    paid < saleTotal &&
    credit_balance !== true &&
    payment_method !== "credit"
  ) {
    throw new Error(
      "Le solde restant doit être confirmé comme crédit ou réglé par un autre moyen.",
    );
  }
  if (payment_method === "credit" && !advance_paid && normalized.length)
    throw new Error(
      "Aucun paiement ne doit être ajouté si aucune avance n’a été versée.",
    );

  const cashApplied = normalized
    .filter((payment) => payment.method === "especes")
    .reduce((sum, payment) => sum + payment.amount, 0);
  if (cashApplied > 0) {
    if (cashTendered === undefined)
      throw new Error("Le montant réellement reçu en espèces est obligatoire.");
    if (!Number.isFinite(cashTendered) || cashTendered < cashApplied)
      throw new Error(
        "Le montant reçu en espèces est inférieur à la part réglée en espèces.",
      );
  }
  const change = Math.max(0, (cashTendered || 0) - cashApplied);
  const finalMethod =
    paid < saleTotal
      ? "credit"
      : normalized.length > 1
        ? "mixte"
        : normalized[0]?.method || "credit";
  return {
    payments: normalized,
    paid_amount: paid,
    payment_method: finalMethod,
    cash_received: cashTendered || 0,
    cash_applied: cashApplied,
    change,
  };
}
