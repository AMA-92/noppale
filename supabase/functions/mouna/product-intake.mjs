// Champs obligatoires de la fenêtre d'ajout de produit, dans l'ordre de collecte
// demandé. Les champs facultatifs restent à leur valeur par défaut.
export const PRODUCT_REQUIRED_FIELDS = Object.freeze([
  {
    key: "name",
    label: "nom du produit",
    question: "Quel est le nom du produit ?",
  },
  {
    key: "buying_price",
    label: "prix d’achat",
    question: "Quel est son prix d’achat ?",
  },
  {
    key: "selling_price",
    label: "prix de vente",
    question: "Quel est son prix de vente ?",
  },
  {
    key: "stock",
    label: "stock initial",
    question: "Quel est son stock initial ?",
  },
  {
    key: "min_stock",
    label: "seuil de stock minimal",
    question: "Quel est son seuil de stock minimal ?",
  },
]);

export function getFirstMissingProductField(input) {
  return (
    PRODUCT_REQUIRED_FIELDS.find(({ key }) => {
      const value = input?.[key];
      return (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      );
    }) || null
  );
}

export function getProductIntakeNextStep(input) {
  const field = getFirstMissingProductField(input);
  return field
    ? { kind: "question", field: field.key, question: field.question }
    : { kind: "ready" };
}
