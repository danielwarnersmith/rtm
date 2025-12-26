"use client";

import { Component, type ReactNode } from "react";
import { useMDXComponent } from "next-contentlayer2/hooks";
import { MDXComponents } from "@/components/mdx/MDXComponents";

interface MDXContentProps {
  code: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MDXErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[MDXContent] Error rendering MDX:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-8 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="font-semibold text-red-800 dark:text-red-200">
            Error rendering content
          </p>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">
            {this.state.error?.message ||
              "An unexpected error occurred while rendering this section."}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * MDX content renderer component.
 * Uses the useMDXComponent hook to render compiled MDX.
 */
export function MDXContent({ code }: MDXContentProps): ReactNode {
  const Component = useMDXComponent(code);
  return (
    <MDXErrorBoundary>
      <Component components={MDXComponents} />
    </MDXErrorBoundary>
  );
}

