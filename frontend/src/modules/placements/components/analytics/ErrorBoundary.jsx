import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

export class AnalyticsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Analytics error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-brand-teal mb-2">Something went wrong</h3>
          <p className="text-brand-teal/60 text-sm max-w-sm mb-6">
            An error occurred while loading the analytics dashboard. Please try refreshing the page.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
