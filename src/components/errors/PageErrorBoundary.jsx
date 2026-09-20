import React from "react";
import LoadError from "@/components/errors/LoadError";

// Page-level error boundary: if a single page's content crashes at render
// time, show the component-level LoadError fallback (with an in-place retry)
// instead of tearing down the whole application shell.
export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, resetKey: 0 };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("StudyOS page error:", error, info);
  }

  handleRetry = () => {
    this.setState((prev) => ({ hasError: false, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return <LoadError onRetry={this.handleRetry} />;
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}