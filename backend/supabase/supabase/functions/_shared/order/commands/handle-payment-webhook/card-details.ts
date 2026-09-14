type ChargeCardDetails = {
  last4?: string | null;
  brand?: string | null;
};

type ChargeLike = {
  payment_method_details?: {
    card?: ChargeCardDetails | null;
    card_present?: ChargeCardDetails | null;
  } | null;
} | null | undefined;

/** Online Elements uses `card`; leftover Terminal PIs use `card_present`. */
export function cardDetailsFromCharge(charge: ChargeLike): {
  lastFourDigits: string | null;
  cardType: string | null;
  cardBrand: string | null;
} {
  const details = charge?.payment_method_details;
  const card = details?.card ?? details?.card_present ?? null;
  return {
    lastFourDigits: card?.last4 ?? null,
    cardType: card?.brand ?? null,
    cardBrand: card?.brand ?? null,
  };
}
