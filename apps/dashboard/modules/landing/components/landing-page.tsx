import { HeroSection } from './hero-section'
import { PainPointsSection } from './pain-points-section'
import { FeaturesSection } from './features-section'
import { HowItWorksSection } from './how-it-works-section'
import { MobilePaymentsSection } from './mobile-payments-section'
import { AffordabilityStrip } from './affordability-strip'
import { FinalCtaSection } from './final-cta-section'

export async function LandingPage() {
  return (
    <main>
      <HeroSection />
      <PainPointsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <MobilePaymentsSection />
      <AffordabilityStrip />
      <FinalCtaSection />
    </main>
  )
}
