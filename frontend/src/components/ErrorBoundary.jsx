/* Catches a render-time crash in any page and shows a scoped fallback
   instead of a full white screen — the app went white-screen once this
   session (a null-safety gap in derived.js) with no way to recover
   short of a hard refresh. No telemetry backend exists yet, so the
   error just goes to the console for now. */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 px-6">
          <div className="max-w-md text-center">
            <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1.5">Something went wrong</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              {this.state.error.message || 'An unexpected error occurred.'}
            </div>
            <a
              href="/command"
              onClick={() => this.setState({ error: null })}
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
            >
              Back to Command Centre
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
