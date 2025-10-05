import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClayButton } from '../ui/ClayButton';
import { ClayCard } from '../ui/ClayCard';
import { ClayColors, ClayTheme } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ClayCard style={styles.errorCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={48} color={ClayColors.error} />
            </View>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              The app encountered an unexpected error. Please try restarting the app.
            </Text>
            
            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>{this.state.error.message}</Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.debugText}>{this.state.errorInfo.componentStack}</Text>
                )}
              </View>
            )}

            <ClayButton
              title="Try Again"
              variant="primary"
              onPress={this.handleRetry}
              style={styles.retryButton}
            />
          </ClayCard>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ClayTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ClayTheme.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: ClayTheme.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  debugInfo: {
    backgroundColor: ClayColors.lightGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: ClayColors.error,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 10,
    color: ClayTheme.text.secondary,
    fontFamily: 'monospace',
  },
  retryButton: {
    minWidth: 120,
  },
});