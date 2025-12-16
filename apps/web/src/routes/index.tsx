import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import Header from '@/components/nav/header';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const benefits = [
    'Simple playlist management',
    'Easy to use interface',
    'Modern design',
    'Secure authentication',
  ];

  return (
    <div className='min-h-screen bg-background'>
      <Header />
      {/* Hero Section */}
      <section className='relative px-6 py-24 lg:py-32 overflow-hidden'>
        <div className='relative max-w-7xl mx-auto'>
          <div className='text-center max-w-4xl mx-auto'>
            <Badge className='mb-6'>
              <Sparkles className='w-3 h-3 mr-2' />
              Music Playlist Manager
            </Badge>
            <h1 className='text-5xl md:text-7xl font-bold mb-6 leading-tight'>
              Manage Your
              <span className='block text-primary'>Music Playlists</span>
            </h1>
            <p className='text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto'>
              Create, organize, and share your favorite music playlists with ease.
            </p>
            <div className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-12'>
              <Button
                size='lg'
                className='text-lg px-8 py-6'
                asChild
              >
                <Link to='/auth/signup'>
                  Get Started
                  <ArrowRight className='ml-2 w-5 h-5' />
                </Link>
              </Button>
            </div>
            <div className='flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground mb-8'>
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className='flex items-center gap-2'
                >
                  <CheckCircle2 className='w-4 h-4 text-primary' />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className='px-6 py-24 relative'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-bold mb-4'>Simple & Powerful</h2>
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
              Everything you need to manage your music playlists
            </p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <Card>
              <CardHeader>
                <div className='size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4'>
                  <Music className='size-6 text-primary' />
                </div>
                <CardTitle className='text-xl'>Playlist Management</CardTitle>
                <CardDescription className='text-base leading-relaxed'>
                  Create and organize your music playlists with an intuitive interface.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
