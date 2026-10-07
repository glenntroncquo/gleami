import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gleami",
    short_name: "Gleami",
    description:
      "Discover beauty salons and manage your salon with one clear platform.",
    start_url: "/nl-be/",
    display: "standalone",
    background_color: "#FAF8F5",
    theme_color: "#FAF8F5",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
