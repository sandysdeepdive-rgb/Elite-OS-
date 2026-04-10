"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      let parsedError = null;
      let isFirestoreError = false;
      
      try {
        if (this.state.error?.message) {
          parsedError = JSON.parse(this.state.error.message);
          if (parsedError.operationType && parsedError.authInfo) {
            isFirestoreError = true;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
              Something went wrong
            </h2>
            
            {isFirestoreError ? (
              <div className="text-sm text-gray-600 space-y-4">
                <p className="text-center text-red-600 font-medium">
                  Database Permission Denied
                </p>
                <p>
                  You do not have permission to perform this action. This usually means your account role does not allow access to this specific data.
                </p>
                <div className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                  <p><strong>Operation:</strong> {parsedError.operationType}</p>
                  <p><strong>Path:</strong> {parsedError.path}</p>
                  <p><strong>User ID:</strong> {parsedError.authInfo?.userId || 'Not logged in'}</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 space-y-4">
                <p className="text-center">
                  An unexpected error occurred in the application.
                </p>
                <div className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                  <p className="text-red-600 font-mono">{this.state.error?.message}</p>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
