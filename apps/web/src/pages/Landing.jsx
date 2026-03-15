import {
  HeroSection,
  FeaturesSection,
  ShowcaseSection,
  StepsSection,
  CTASection,
  Footer,
} from '../components/Landing'
import { colors } from '../lib/styles.js'

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bgPrimary }}>
      <HeroSection />
      <FeaturesSection />
      <ShowcaseSection />
      <StepsSection />
      <CTASection />
      <Footer />
    </div>
  )
}
