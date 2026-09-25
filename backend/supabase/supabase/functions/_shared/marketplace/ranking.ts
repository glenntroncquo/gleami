/**
 * Marketplace search score (plan section A4).
 *
 * Plan A4 names the factors and does not give coefficients: distance,
 * text rank, rating, review_count, like_count. Text rank is the FTS term
 * plus the trigram term (plan C3: FTS with a trigram fallback). These
 * weights are the ones this API ships. Tune them here.
 *
 *   score =
 *       W_TEXT    * ts_rank_cd(search_vector, plainto_tsquery('simple', q))
 *     + W_TRIGRAM * word_similarity(q, search_text)
 *     + W_GEO     * (1 / (1 + distance_km))
 *     + W_RATING  * (coalesce(rating, 0) / 5)
 *     + W_REVIEWS * ln(1 + review_count)
 *     + W_LIKES   * ln(1 + like_count)
 *
 * Absent q: the text terms are 0.
 * Absent center: the geo term is 0 (a bbox does not invent a distance).
 * rating null counts as 0. review_count is 0 until a reviews table exists;
 * the term stays in the formula so the column is not a dead field.
 *
 * Scale notes: ts_rank_cd is often ~0.05–0.3, so W_TEXT = 10 keeps a real
 * full-text hit visible. word_similarity is 0..1 and is what makes a salon
 * or service name beat a merely popular neighbour. ln(1+likes) grows slowly;
 * W_LIKES = 0.35 means 100 likes add about 1.6, less than a strong name match
 * (W_TRIGRAM) and less than standing on top of the pin (W_GEO = 3).
 *
 * Keyset order is score DESC, location_id ASC. The cursor stores the rounded
 * score (6 decimal places) and the location id.
 */
export const RANKING = {
  text: 10,
  trigram: 6,
  geo: 3,
  rating: 2,
  reviews: 0.25,
  likes: 0.35,
} as const;

export const DEFAULT_RADIUS_KM = 25;
export const MAX_RADIUS_KM = 200;
export const DEFAULT_SEARCH_LIMIT = 20;
export const MAX_SEARCH_LIMIT = 50;
export const DEFAULT_SUGGEST_LIMIT = 8;
export const MAX_SUGGEST_LIMIT = 20;
