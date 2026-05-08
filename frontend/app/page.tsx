import { GeekLandingHero } from "@/components/landing/GeekLandingHero";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingMainSections, LandingScrollingSides } from "@/components/landing/LandingDynamicIsland";

export default function Home() {
  return (
    <>
      <LandingScrollingSides />

      <LandingNav />

      <main className="relative mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <GeekLandingHero />
        <LandingMainSections />
      </main>
    </>
  );
}
