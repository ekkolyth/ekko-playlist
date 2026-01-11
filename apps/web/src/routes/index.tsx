import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import Header from "@/components/nav/header";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const benefits = [
    "Organize your Playlists",
    "Tag and Search Videos",
    "Share videos with Friends",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative px-6 py-24 lg:py-32 overflow-hidden">
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6">
              <Sparkles className="w-3 h-3 mr-2" />
              Music Playlist Manager
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Manage Your
              <span className="block text-primary">Music Playlists</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              Create, organize, and share your favorite music playlists with
              ease.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/auth/signup">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
