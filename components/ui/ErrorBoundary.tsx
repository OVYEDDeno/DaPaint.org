import React from 'react';
import { View, Text, Button, StyleSheet, Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Capture the error with Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

interface FallbackProps {
  error: Error;
  resetError: () => void;
}

const DefaultErrorFallback: React.FC<FallbackProps> = ({ error, resetError }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>We're sorry, but an error occurred.</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <View style={styles.buttonContainer}>
          <Button title="Try Again" onPress={resetError} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0,0,0,0.25)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#e74c3c',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  errorText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 10,
    width: '100%',
  },
});

export default ErrorBoundary;
