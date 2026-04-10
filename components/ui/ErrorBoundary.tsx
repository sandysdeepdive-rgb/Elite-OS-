'use client';
import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary
  extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen mesh-gradient-bg
                        flex items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-full bg-error/10
                            flex items-center justify-center
                            mx-auto mb-6">
              <span className="material-symbols-outlined
                               text-[32px] text-error">
                error
              </span>
            </div>
            <h2 className="font-headline text-3xl font-light
                           italic text-primary mb-3">
              Something went wrong
            </h2>
            <p className="font-body text-sm text-on-surface-variant
                          font-light leading-relaxed mb-8">
              The app encountered an unexpected error.
              Please refresh and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full h-12 bg-primary-container
                         text-white rounded-full font-body
                         font-medium text-sm mb-4">
              Refresh Page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError:false, message:"" });
              }}
              className="font-body text-sm text-outline
                         hover:text-on-surface transition-colors">
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
