import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/summit-timeline-calculator",
        destination: "/summit-timeline-calculator/index.html",
      },
      {
        source: "/summit-timeline-calculator/",
        destination: "/summit-timeline-calculator/index.html",
      },
    ];
  },
};

export default nextConfig;
