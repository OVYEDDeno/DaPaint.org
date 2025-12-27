// app/_layout.tsx
import * as Sentry from '@sentry/react-native';
import { Redirect, Stack, useSegments } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

import BackgroundLayer from '../components/ui/BackgroundLayer';
import { getSession, signOut } from '../lib/api/auth';
import { reportError } from '../lib/api/dapaints';
import logger from '../lib/logger';
import { supabase } from '../lib/supabase';

const sentryIntegrations =
  Platform.OS === 'web'
    ? []
    : [
        Sentry.mobileReplayIntegration(),
        Sentry.feedbackIntegration({
          // Additional SDK configuration goes in here, for example:
          styles: {
            submitButton: {
              backgroundColor: '#6a1b9a',
            },
          },
          namePlaceholder: 'Fullname',
          isNameRequired: true,
          isEmailRequired: true,
        }),
      ];

Sentry.init({
  dsn: 'https://f0a7bbf487722943592ee9615fc87981@o4510594012807168.ingest.us.sentry.io/4510594012938240',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: sentryIntegrations,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

function RootLayout() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const segments = useSegments();

  useEffect(() => {
    let cancelled = false;
    let themeLink: HTMLLinkElement | null = null;

    // Web-specific: Load theme.css (only when it actually resolves to CSS to avoid MIME errors in dev).
    const loadThemeCss = async () => {
      if (Platform.OS !== 'web') return;

      try {
        const existing = document.querySelector(
          'link[rel="stylesheet"][href="/theme.css"]'
        );
        if (existing) return;

        const isCss = (contentType: string | null) =>
          (contentType || '').toLowerCase().includes('text/css');

        const headRes = await fetch('/theme.css', {
          method: 'HEAD',
          cache: 'no-store',
        });
        if (!headRes.ok || !isCss(headRes.headers.get('content-type'))) {
          const getRes = await fetch('/theme.css', {
            method: 'GET',
            cache: 'no-store',
          });
          if (!getRes.ok || !isCss(getRes.headers.get('content-type'))) return;
        }

        if (cancelled) return;
        themeLink = document.createElement('link');
        themeLink.rel = 'stylesheet';
        themeLink.href = '/theme.css';
        document.head.appendChild(themeLink);
      } catch {
        // If anything goes wrong, skip injecting theme.css on web.
      }
    };

    loadThemeCss();

    // Check for existing session
    const checkSession = async () => {
      try {
        const session = await getSession();

        setIsLoggedIn(!!session);
        logger.debug('Session check complete. Logged in:', !!session);
      } catch (error) {
        logger.error('Unexpected error checking session:', error);
        // Clear any invalid session data
        try {
          await signOut();
        } catch (signOutError) {
          logger.error('Error during sign out:', signOutError);
        }
        setIsLoggedIn(false);
      } finally {
        setSessionChecked(true);
      }
    };

    checkSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      logger.debug('Auth state changed:', _event);
      setIsLoggedIn(!!session);
    });

    return () => {
      cancelled = true;
      themeLink?.remove();
      subscription.unsubscribe();
    };
  }, []);

  // Don't render anything until we've checked the session
  if (!sessionChecked) {
    return null;
  }

  // Protect all routes inside (tabs) when not authenticated.
  // expo-router still registers all routes; hiding Stack.Screens is not access control.
  const inTabsGroup = segments.includes('(tabs)');
  const inAuthGroup = segments.includes('(auth)');

  if (!isLoggedIn && inTabsGroup) {
    return <Redirect href="/" />;
  }

  if (isLoggedIn && inAuthGroup) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return (
    <>
      <GlobalErrorHandler />
      {Platform.OS === 'web' && (
        <Head>
          <title>DaPaint.org - Compete. Win. Get Paid.</title>
          <meta
            name="description"
            content="Create and join competitive challenges. Win streaks earn real money."
          />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
          />
          <meta property="og:title" content="DaPaint.org" />
          <meta property="og:description" content="Compete. Win. Get Paid." />
          <meta property="og:type" content="website" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
      )}
      <View style={styles.root}>
        <BackgroundLayer />
        <Stack screenOptions={{ headerShown: false }}>
          {isLoggedIn ? (
            <Stack.Screen name="(tabs)" />
          ) : (
            <Stack.Screen name="(auth)" />
          )}
        </Stack>
      </View>
    </>
  );
}

// Sentry's `wrap()` currently includes `FeedbackWidgetProvider` even on web, which can crash in RN-web.
// Keep Sentry enabled, but only wrap the root component on native platforms.
const WrappedRootLayout =
  Platform.OS === 'web' ? RootLayout : Sentry.wrap(RootLayout);

export default WrappedRootLayout;

// Add this component to your root layout
export function GlobalErrorHandler() {
  useEffect(() => {
    // Capture unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      reportError(event.reason, 'Unhandled Promise Rejection', 'high');
    };

    // Capture global errors
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      reportError(event.error, 'Global Error: ' + event.message, 'high');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
