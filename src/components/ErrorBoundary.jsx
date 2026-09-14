import React from "react";

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
    console.error("StudyOS error:", error, info);
  }
  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center bg-background p-6">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-lg mx-auto mb-4" style={{ fontFamily: "var(--font-display)" }}>S</div>
            <h1 className="text-xl font-bold text-foreground mb-2">Something broke</h1>
            <p className="text-sm text-muted-foreground mb-5">An unexpected error occurred. Your data is safe — head back to the dashboard to continue.</p>
            <button onClick={this.handleReset} className="rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 hover:opacity-90">Back to dashboard</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}