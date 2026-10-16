import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AriseWordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ARISE crashed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-dvh place-items-center bg-void px-4">
        <div className="panel w-full max-w-md rounded-2xl p-7 text-center">
          <AriseWordmark markSize={34} textSize="text-lg" />
          <h1 className="mt-5 font-display text-xl font-bold text-ink">System interruption</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            An unexpected error interrupted the interface. Your records are safe — reload to
            reconnect.
          </p>
          <pre className="mt-4 max-h-24 overflow-auto rounded-lg border border-line bg-abyss/70 p-3 text-left font-mono text-[0.7rem] text-faint">
            {error.message}
          </pre>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button variant="ghost" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
