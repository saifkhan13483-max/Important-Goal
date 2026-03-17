import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-5 h-5 rounded gradient-brand flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="font-bold text-sm">SystemForge</span>
            </div>
            <h1 className="text-2xl font-bold mb-3 mt-4">Something went wrong</h1>
            <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
              An unexpected error occurred. Your data is safe — this is a display problem, not a data problem.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded-lg mb-6 break-all">
                {this.state.error.message}
              </p>
            )}
            <Button onClick={this.handleReset} className="gap-2" data-testid="button-error-boundary-reset">
              <RefreshCw className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
