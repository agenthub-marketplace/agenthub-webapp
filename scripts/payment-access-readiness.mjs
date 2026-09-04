// Un accès arrêté ou expiré conserve son paiement historique : ne pas le réactiver.
export function hasMissingPaidAccess(payment, rental) {
  return payment.status === "paid" && (!rental || !["active", "stopped", "expired"].includes(rental.status));
}
