import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Maillume",
    short_name: "Maillume",
    description:
      "Shine a light on suspicious email with an explainable risk assessment.",
    start_url: "/app",
    display: "standalone",
    background_color: "#eef1eb",
    theme_color: "#111711",
    icons: [
      {
        src: "/icon",
        sizes: "64x64",
        type: "image/png",
      },
    ],
  };
}
