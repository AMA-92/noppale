/**
 * SYSTÈME DE VÉRIFICATION D'ACCÈS - ÉTAPE 8
 * Vérifie si un utilisateur a accès à l'application selon son abonnement
 */

export function checkAccess(profile) {
  // Si l'utilisateur est admin, accès toujours autorisé
  if (profile?.is_admin) {
    return {
      allowed: true,
      status: 'admin',
      message: null,
      daysLeft: null,
      graceDaysLeft: null
    };
  }

  // Si le profil n'existe pas, accès refusé
  if (!profile) {
    return {
      allowed: false,
      status: 'no_profile',
      message: "Profil utilisateur introuvable.",
      daysLeft: null,
      graceDaysLeft: null
    };
  }

  // Si le compte est suspendu
  if (profile.account_status === "paused") {
    return {
      allowed: false,
      status: 'paused',
      message: "Compte suspendu par l'administrateur.",
      daysLeft: null,
      graceDaysLeft: null
    };
  }

  const now = new Date();
  const subscriptionEnd = profile.subscription_end ? new Date(profile.subscription_end) : null;
  const graceEnd = profile.grace_period_end ? new Date(profile.grace_period_end) : null;

  // Si pas de date d'abonnement, accès refusé
  if (!subscriptionEnd) {
    return {
      allowed: false,
      status: 'no_subscription',
      message: "Aucun abonnement configuré.",
      daysLeft: null,
      graceDaysLeft: null
    };
  }

  // Calculer les jours restants
  const daysLeft = Math.ceil((subscriptionEnd - now) / (1000 * 60 * 60 * 24));
  const graceDaysLeft = graceEnd ? Math.ceil((graceEnd - now) / (1000 * 60 * 60 * 24)) : 0;

  // Abonnement valide
  if (now <= subscriptionEnd) {
    return {
      allowed: true,
      status: 'active',
      message: null,
      daysLeft: Math.max(0, daysLeft),
      graceDaysLeft: graceDaysLeft
    };
  }

  // Période de grâce
  if (graceEnd && now > subscriptionEnd && now <= graceEnd) {
    return {
      allowed: true,
      status: 'grace_period',
      message: `Votre abonnement a expiré. Vous êtes en période de grâce (${graceDaysLeft} jour${graceDaysLeft > 1 ? 's' : ''} restant${graceDaysLeft > 1 ? 's' : ''}).`,
      daysLeft: Math.max(0, daysLeft),
      graceDaysLeft: Math.max(0, graceDaysLeft)
    };
  }

  // Expiré totalement
  return {
    allowed: false,
    status: 'expired',
    message: "Abonnement expiré. Veuillez contacter l'administrateur.",
    daysLeft: Math.max(0, daysLeft),
    graceDaysLeft: Math.max(0, graceDaysLeft)
  };
}

/**
 * Vérifie si l'abonnement expire bientôt (dans les 5 jours)
 */
export function isExpiringSoon(profile) {
  if (!profile?.subscription_end || profile?.is_admin) return false;
  
  const now = new Date();
  const subscriptionEnd = new Date(profile.subscription_end);
  const daysLeft = Math.ceil((subscriptionEnd - now) / (1000 * 60 * 60 * 24));
  
  return daysLeft <= 5 && daysLeft > 0;
}

/**
 * Retourne le nombre de jours avant expiration
 */
export function getDaysUntilExpiry(profile) {
  if (!profile?.subscription_end || profile?.is_admin) return null;
  
  const now = new Date();
  const subscriptionEnd = new Date(profile.subscription_end);
  return Math.ceil((subscriptionEnd - now) / (1000 * 60 * 60 * 24));
}

/**
 * Formate la date d'expiration en français
 */
export function formatExpiryDate(dateString) {
  if (!dateString) return 'Non défini';
  
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Retourne le statut formaté pour l'affichage
 */
export function getFormattedStatus(profile) {
  if (!profile) return 'Inconnu';
  
  if (profile.is_admin) return 'Administrateur';
  
  const access = checkAccess(profile);
  
  switch (access.status) {
    case 'active':
      return 'Actif';
    case 'grace_period':
      return 'Période de grâce';
    case 'paused':
      return 'Suspendu';
    case 'expired':
      return 'Expiré';
    case 'no_subscription':
      return 'Aucun abonnement';
    default:
      return 'Inconnu';
  }
}
