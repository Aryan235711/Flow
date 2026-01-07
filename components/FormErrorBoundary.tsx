import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class FormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('LogInput Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="px-5 pb-40 pt-24 md:pt-32 space-y-10">
          <div className="glass rounded-[32px] p-8 border-red-500/20 text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-black font-outfit text-white">Form Error</h2>
              <p className="text-white/60 text-sm">
                Something went wrong with the biometric form. Your data is safe.
              </p>
              {this.state.error && (
                <details className="text-xs text-white/40 mt-4">
                  <summary className="cursor-pointer hover:text-white/60">Technical Details</summary>
                  <pre className="mt-2 p-3 bg-black/20 rounded-lg text-left overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>

            <button
              onClick={this.handleRetry}
              className="w-full py-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-black rounded-2xl transition-colors active:scale-95 flex items-center justify-center gap-3"
            >
              <RefreshCw size={20} />
              Retry Form
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}