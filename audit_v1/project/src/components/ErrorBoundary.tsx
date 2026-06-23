import React from "react";

/* Demo insurance: if any single panel throws (e.g. the live Mappls map on bad
 * wifi), this catches it and renders a calm fallback instead of white-screening
 * the whole app on stage. Resets when `resetKey` changes (i.e. on tab switch). */
type Props = { children: React.ReactNode; resetKey?: string; label?: string };
type State = { error: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // surfaced to the console for debugging; the UI degrades gracefully.
    console.error("[SmartPatrol] panel error caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-line bg-panel/80 p-6 text-center"
        >
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-brass/10 text-brass">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 className="mt-3 font-display text-[15px] font-semibold text-ink">
            {this.props.label ? `${this.props.label} hit a snag` : "This view hit a snag"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-mid">
            The rest of SmartPatrol is unaffected — switch tabs to continue. All figures are precomputed
            and stored, so nothing is lost.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-3 rounded-lg border border-line bg-white/5 px-3 py-1.5 text-[12px] font-medium text-mid transition-colors hover:border-struct/40 hover:text-struct"
          >
            Retry this view
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
