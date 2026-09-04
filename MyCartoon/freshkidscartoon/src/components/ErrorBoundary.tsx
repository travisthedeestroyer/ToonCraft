import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 bg-red-100/10 border border-red-500/30 rounded-xl text-red-500 flex flex-col items-center justify-center h-full">
          <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
          <p className="text-sm opacity-80 text-center">{this.state.error?.message}</p>
          <button 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
