"use client";

import dynamic from "next/dynamic";

const DualWaveBackground = dynamic(
  () =>
    import("@/components/ui/DualWaveBackground").then(
      (mod) => mod.DualWaveBackground
    ),
  { ssr: false }
);

const FeatureSection = dynamic(
  () =>
    import("@/components/landing/FeatureSection").then(
      (mod) => mod.FeatureSection
    ),
  { ssr: false }
);

const FAQSection = dynamic(
  () =>
    import("@/components/landing/FAQSection").then((mod) => mod.FAQSection),
  { ssr: false }
);

const ApiSection = dynamic(
  () =>
    import("@/components/landing/ApiSection").then((mod) => mod.ApiSection),
  { ssr: false }
);

export function LandingScrollingSides() {
  return <DualWaveBackground />;
}

export function LandingMainSections() {
  return (
    <>
      <FeatureSection />
      <ApiSection />
      <FAQSection />
    </>
  );
}
