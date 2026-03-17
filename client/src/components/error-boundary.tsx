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

const CHUNK_RELOAD_KEY = "sf_chunk_reload_attempted";

function isChunkLoadError(error: Error): boolean {
  const msg = error.message ?? "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Unable to preload CSS") ||
    error.name === "ChunkLoadError"
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    // Clear the reload flag on successful boot so future chunk errors
    // can trigger exactly one more auto-reload.
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);

    if (isChunkLoadError(error)) {
      const alreadyRetried = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      if (!alreadyRetried) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isChunk = this.state.error ? isChunkLoadError(this.state.error) : false;

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
            <h1 className="text-2xl font-bold mb-3 mt-4">
              {isChunk ? "Update available" : "Something went wrong"}
            </h1>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              {isChunk
                ? "A new version of SystemForge was deployed. Please reload the page to get the latest version."
                : "An unexpected error occurred. Your data is safe — this is a display problem, not a data problem."}
            </p>
            {!isChunk && this.state.error && (
              <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded-lg mb-6 break-all">
                {this.state.error.message}
              </p>
            )}
            <Button
              onClick={isChunk ? () => window.location.reload() : this.handleReset}
              className="gap-2"
              data-testid="button-error-boundary-reset"
            >
              <RefreshCw className="w-4 h-4" />
              {isChunk ? "Reload page" : "Back to Home"}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
