import React from 'react';

import ErrorBoundary from './ErrorBoundary';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({ children }) => {
  return <ErrorBoundary>{children}</ErrorBoundary>;
};

export default AppErrorBoundary;
