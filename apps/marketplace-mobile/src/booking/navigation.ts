import { router } from 'expo-router';

const SALON = '/salon/[slug]' as const;

export function openBooking(slug: string, variantId?: string) {
  router.push({
    pathname: '/book/[slug]',
    params: variantId ? { slug, variantId } : { slug },
  });
}

/** Leaves the flow from any step, back to the salon the user came from. */
export function closeBooking(slug: string) {
  if (router.canGoBack()) router.dismissTo({ pathname: SALON, params: { slug } });
  else router.replace({ pathname: SALON, params: { slug } });
}
