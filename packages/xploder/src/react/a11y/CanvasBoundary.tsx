import { Component, type ReactNode } from 'react';

export interface CanvasBoundaryProps {
  readonly fallback: ReactNode;
  readonly children: ReactNode;
}

interface CanvasBoundaryState {
  readonly failed: boolean;
}

export class CanvasBoundary extends Component<CanvasBoundaryProps, CanvasBoundaryState> {
  state: CanvasBoundaryState = { failed: false };

  static getDerivedStateFromError(): CanvasBoundaryState {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
