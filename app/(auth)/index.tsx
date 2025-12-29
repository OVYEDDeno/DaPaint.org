// app/(auth)/index.tsx - Fixed to prevent redirect loop
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';

export default function AuthIndex() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        logger.error('Error checking session in auth index:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Show loading while checking session
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If user is logged in, redirect to feed
  if (session) {
    return <Redirect href="/(tabs)/feed" />;
  }

  // If not logged in, redirect to landing/login page
  return <Redirect href="/" />;
}