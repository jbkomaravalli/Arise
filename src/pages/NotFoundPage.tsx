import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { AriseWordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="arcane-bg grid min-h-dvh place-items-center bg-void px-4">
      <div className="text-center">
        <AriseWordmark markSize={40} textSize="text-xl" />
        <p className="mt-8 font-mono text-7xl font-bold text-gradient">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">
          This sector of the system does not exist
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          The page you requested lies outside the mapped area of ARISE. Return to your dashboard
          and pick a known quest.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/">
            <Button variant="secondary">
              <Compass className="h-4 w-4" aria-hidden /> Landing page
            </Button>
          </Link>
          <Link to="/app">
            <Button>Open dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
