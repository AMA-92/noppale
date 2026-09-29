const writeIntentPattern =
  /(?<![\p{L}\p{N}_])(?:ajoute(?:r|z)?|crée(?:r|z)?|modifie(?:r|z)?|change(?:r|z)?|supprime(?:r|z)?|efface(?:r|z)?|augmente(?:r|z)?|diminue(?:r|z)?|retire(?:r|z)?|mets?|mettre|vends?|vendre|enregistre(?:r|z)?)(?![\p{L}\p{N}_])/iu;
const completedWritePattern =
  /(?<![\p{L}\p{N}_])(?:ajouté|créé|modifié|mis(?:e)? à jour|supprimé|effacé|enregistré|vendu|retiré|effectué)(?:e|s|es)?(?![\p{L}\p{N}_])/iu;
const negatedCompletionPattern =
  /(?<![\p{L}\p{N}_])(?:pas|jamais|aucun|aucune|impossible|échoué|échouée|refusé|refusée|non)(?![\p{L}\p{N}_])/iu;

export function isUnconfirmedWriteClaim(history, reply) {
  const recentMessages = [
    ...(Array.isArray(history) ? history.slice(-8) : []),
    { role: "user", content: "" },
  ];
  const hasRecentWriteIntent = recentMessages.some(
    (item) =>
      item?.role === "user" &&
      writeIntentPattern.test(String(item.content || "")),
  );
  if (!hasRecentWriteIntent || typeof reply !== "string") return false;

  const claim = completedWritePattern.exec(reply);
  if (!claim) return false;
  const precedingText = reply.slice(Math.max(0, claim.index - 55), claim.index);
  return !negatedCompletionPattern.test(precedingText);
}

export function assertNoUnconfirmedWriteClaim(history, reply) {
  if (isUnconfirmedWriteClaim(history, reply)) {
    throw new Error(
      "La base n’a pas confirmé l’exécution de cette modification. Aucune réussite ne peut être annoncée.",
    );
  }
  return reply;
}

export function makePendingConfirmationResponse(pendingConfirmation) {
  if (!pendingConfirmation?.id || !pendingConfirmation?.summary) {
    throw new Error("La confirmation préparée par le serveur est incomplète.");
  }
  const isSale = /^Créer la vente pour /i.test(pendingConfirmation.summary);
  return {
    reply: isSale
      ? `${pendingConfirmation.summary} Confirmez-vous cette vente ?`
      : "Action préparée. Elle attend votre confirmation.",
    pending_confirmation: pendingConfirmation,
    ok: true,
  };
}

export async function runMounaTool(execute, name, input, context) {
  try {
    const result = await execute(name, input, context);
    if (result?.ok === false || result?.error) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "L’action n’a pas abouti.",
      );
    }
    if (
      result?.needsInfo &&
      (typeof result.question !== "string" || !result.question.trim())
    ) {
      throw new Error("La question nécessaire à la demande est absente.");
    }
    if (
      result?.pendingConfirmation &&
      (!result.pendingConfirmation.id || !result.pendingConfirmation.summary)
    ) {
      throw new Error(
        "La confirmation préparée par le serveur est incomplète.",
      );
    }
    return result;
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : String(error || "erreur inconnue");
    throw new Error(`L’outil ${name} a échoué : ${reason}`, { cause: error });
  }
}
