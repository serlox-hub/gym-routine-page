import {
  HeroSection,
  FeaturesSection,
  ShowcaseSection,
  StepsSection,
  CTASection,
  Footer,
} from '../components/Landing'

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0d1117' }}>
      <HeroSection />
      <FeaturesSection />
      <ShowcaseSection />
      <StepsSection />
      <CTASection />
      <Footer />
    </div>
  )
}
