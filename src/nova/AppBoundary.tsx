import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Keeps a render/runtime failure inside NOVA Studio from blanking the whole
 * page. Offers a reload and a "reset workspace" escape hatch that clears the
 * persisted layout, which is the only client state that can wedge the shell.
 */
export class AppBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[NOVA Studio] render error:", error);
  }

  private reset = () => {
    try {
      window.localStorage.removeItem("nova_studio.layout.v2");
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0B0F19] px-6 text-center">
        <h1 className="text-lg font-semibold text-zinc-100">NOVA Studio hit a snag</h1>
        <p className="max-w-md text-sm text-zinc-400">
          The editor stopped rendering. Reloading usually fixes it; resetting the workspace
          restores the default panel layout.
        </p>
        <pre className="max-w-md overflow-hidden text-ellipsis whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-left text-[11px] text-zinc-500">
          {error.message}
        </pre>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-black transition hover:bg-cyan-400"
          >
            Reload
          </button>
          <button
            onClick={this.reset}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Reset workspace
          </button>
        </div>
      </div>
    );
  }
}

export default AppBoundary;
