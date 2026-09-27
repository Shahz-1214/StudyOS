import React from "react";
import ServerError from "@/pages/errors/ServerError";

// Global error boundary — catches render-time crashes anywhere in the app
// and shows a calm recovery screen instead of a blank white page.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Production error details are intentionally not written to the browser console.
  }

  render() {
    if (this.state.hasError) {
      return <ServerError />;
    }
    return this.props.children;
  }
}