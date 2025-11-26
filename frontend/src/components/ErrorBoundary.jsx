import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details to console
    console.error('[ERROR] ErrorBoundary: Caught an error:', error);
    console.error('[ERROR] ErrorBoundary: Error info:', errorInfo);
    console.error('[ERROR] ErrorBoundary: Component stack:', errorInfo?.componentStack);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    // Clear localStorage and reload page
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-lg shadow-lg border border-red-200 p-8">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
              </div>
              
              <p className="text-gray-700 mb-4">
                An unexpected error occurred. Please try refreshing the page or logging in again.
              </p>

              {this.state.error && (
                <div className="mb-4 p-4 bg-gray-100 rounded border border-gray-300">
                  <p className="text-sm font-mono text-red-600 mb-2">
                    {this.state.error.toString()}
                  </p>
                  {(import.meta.env.DEV || import.meta.env.MODE === 'development') && this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-sm text-gray-600 cursor-pointer">
                        Stack trace (development only)
                      </summary>
                      <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-64">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Refresh Page
                </button>
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

