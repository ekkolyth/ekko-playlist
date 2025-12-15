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
    <div className='min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950'>
      <Header />
      {/* Hero Section */}
      <section className='relative px-6 py-24 lg:py-32 overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-r from-blue-600/20 via-primary/20 to-cyan-600/20 blur-3xl' />
        <div className='relative max-w-7xl mx-auto'>
          <div className='text-center max-w-4xl mx-auto'>
            <Badge className='mb-6 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'>
              <Sparkles className='w-3 h-3 mr-2' />
              Music Playlist Manager
            </Badge>
            <h1 className='text-5xl md:text-7xl font-bold text-white mb-6 leading-tight'>
              Manage Your
              <span className='block bg-gradient-to-r from-blue-400 via-primary to-cyan-400 bg-clip-text text-transparent'>
                Music Playlists
              </span>
            </h1>
            <p className='text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed max-w-2xl mx-auto'>
              Create, organize, and share your favorite music playlists with ease.
            </p>
            <div className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-12'>
              <Button
                size='lg'
                className='text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-primary hover:from-blue-500 hover:to-primary/90 text-white shadow-lg shadow-blue-500/50'
                asChild
              >
                <Link to='/register'>
                  Get Started
                  <ArrowRight className='ml-2 w-5 h-5' />
                </Link>
              </Button>
            </div>
            <div className='flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400 mb-8'>
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className='flex items-center gap-2'
                >
                  <CheckCircle2 className='w-4 h-4 text-green-500' />
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
            <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>Simple & Powerful</h2>
            <p className='text-xl text-slate-400 max-w-2xl mx-auto'>
              Everything you need to manage your music playlists
            </p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <Card className='bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-[0_25px_45px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]'>
              <CardHeader>
                <div className='size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4'>
                  <Music className='size-6 text-primary' />
                </div>
                <CardTitle className='text-white text-xl'>Playlist Management</CardTitle>
                <CardDescription className='text-slate-400 text-base leading-relaxed'>
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
