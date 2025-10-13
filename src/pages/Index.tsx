import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { HowItWorks } from "@/components/HowItWorks";
import { Impact } from "@/components/Impact";
import { Team } from "@/components/Team";
import { Footer } from "@/components/Footer";
import { SecuraBot } from "@/components/SecuraBot";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <About />
      <HowItWorks />
      <Impact />
      <Team />
      <Footer />
      <SecuraBot />
    </div>
  );
};

export default Index;
