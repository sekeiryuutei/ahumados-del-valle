import { Component, Suspense, type ReactNode } from "react";
import { Loading, ErrorBox } from "@/components/app/ui-bits";
import { errorMessage } from "@/services";
class OperationsBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  override state: { error: unknown } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  override render() {
    return this.state.error ? (
      <ErrorBox
        message={errorMessage(this.state.error)}
        onRetry={() => this.setState({ error: null })}
      />
    ) : (
      this.props.children
    );
  }
}
export function OperationsScreen({ children }: { children: ReactNode }) {
  return (
    <OperationsBoundary>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </OperationsBoundary>
  );
}
