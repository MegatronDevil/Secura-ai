import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, LogIn } from "lucide-react";
import { AuthDialog } from "@/components/AuthDialog";

export const Navbar = () => {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold gradient-text">Secura.AI</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('about')}
                className="text-foreground hover:text-primary transition-colors"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-foreground hover:text-primary transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('impact')}
                className="text-foreground hover:text-primary transition-colors"
              >
                Impact
              </button>
              <button
                onClick={() => scrollToSection('team')}
                className="text-foreground hover:text-primary transition-colors"
              >
                Team
              </button>
            </div>

            {/* Login Button */}
            <Button
              variant="outline"
              className="border-primary/50 hover:bg-primary/10 hover:border-primary"
              onClick={() => setAuthDialogOpen(true)}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Auth Dialog */}
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
};
