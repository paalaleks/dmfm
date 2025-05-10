'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div
          style={{
            padding: '10px',
            margin: '10px 0',
            border: '1px solid #ff000030',
            borderRadius: '4px',
            backgroundColor: '#ff000010',
            color: '#a00',
          }}
        >
          <h4>Player Error</h4>
          <p>{this.props.fallbackMessage || 'The music player encountered an issue.'}</p>
          <p>
            <small>Details: {this.state.errorMessage}</small>
          </p>
          {/* Optionally, add a button to try reloading the component or report issue */}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
