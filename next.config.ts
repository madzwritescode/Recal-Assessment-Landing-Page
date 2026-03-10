import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect old slug to new one (in case anyone bookmarked it)
      {
        source: "/summit-timeline-calculator",
        destination: "/training-timeline-calculator",
        permanent: true,
      },
      {
        source: "/summit-timeline-calculator/",
        destination: "/training-timeline-calculator",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/training-timeline-calculator",
        destination: "/training-timeline-calculator/index.html",
      },
      {
        source: "/training-timeline-calculator/",
        destination: "/training-timeline-calculator/index.html",
      },
    ];
  },
};

export default nextConfig;
