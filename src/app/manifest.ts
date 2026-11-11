import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Control Monetario",
    short_name: "Control Monetario",
    description: "Tus finanzas personales, claras y bajo tu control.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f3",
    theme_color: "#2f6d4f",
    lang: "es",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
