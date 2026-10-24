const origin = (process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "https://gleami.eu").replace(/\/$/, "");

export const marketplace = {
  home: `${origin}/en`,
  business: `${origin}/en/for-salons`,
  salons: `${origin}/en/salons`,
  treatments: `${origin}/en/treatments`,
  blog: `${origin}/en/blog`,
  city: `${origin}/en/salons/merelbeke`,
  account: `${origin}/en/account`,
};
