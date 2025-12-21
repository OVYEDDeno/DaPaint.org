// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import { userDataManager } from '../../lib/UserDataManager';
import { daPaintDataManager } from '../../lib/DaPaintDataManager';

const palette = {
  ink: '#005c82',
  inkSoft: 'rgba(0,92,130,0.65)',
  border: 'rgba(0,92,130,0.14)',
};

export default function TabsLayout() {
  const router = useRouter();
  const [hasActiveDaPaint, setHasActiveDaPaint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hideTabBar, setHideTabBar] = useState(false);

  useEffect(() => {
    // @ts-ignore
    global.setTabBarVisibility = setHideTabBar;

    return () => {
      // @ts-ignore
      delete global.setTabBarVisibility;
    };
  }, []);

  const checkActiveDaPaint = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasActiveDaPaint(false);
        return;
      }

      userDataManager.preloadUserData();
      daPaintDataManager.preloadActiveDaPaint();
      daPaintDataManager.preloadFeedData();

      const activeDaPaint = await daPaintDataManager.getActiveDaPaint();
      setHasActiveDaPaint(!!activeDaPaint);
    } catch (error) {
      logger.error('Error checking active DaPaint:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkActiveDaPaint();

    const channel = supabase
      .channel('active-dapaint-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dapaints',
          filter: `status=in.(scheduled,pending_balance,live)`
        },
        () => {
          checkActiveDaPaint();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dapaints',
          filter: `status=in.(scheduled,pending_balance,live)`
        },
        () => {
          checkActiveDaPaint();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'dapaints',
          filter: `status=in.(scheduled,pending_balance,live)`
        },
        () => {
          checkActiveDaPaint();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkActiveDaPaint]);

  // Redirect to landing on sign out
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/');
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    // @ts-ignore
    const globalAny: any = global;
    if (typeof globalAny !== 'undefined') {
      globalAny.checkActiveDaPaint = checkActiveDaPaint;
    }

    return () => {
      if (typeof globalAny !== 'undefined') {
        delete globalAny.checkActiveDaPaint;
      }
    };
  }, [checkActiveDaPaint]);

  if (loading) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: palette.ink,
        tabBarInactiveTintColor: palette.inkSoft,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: hideTabBar ? [styles.tabBar, styles.tabBarHidden] : styles.tabBar,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: 'Active',
          tabBarIcon: ({ focused }) => (
            <Text
                style={[
                  styles.iconText,
                  focused ? styles.iconTextActive : styles.iconTextInactive,
                ]}
              >
                🔥
              </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Logout',
          tabBarIcon: ({ focused }) => (
            <Text
              style={[
                styles.iconText,
                focused ? styles.iconTextActive : styles.iconTextInactive,
              ]}
            >
              ←
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
    borderTopWidth: 0,
    height: 60,
    paddingBottom: 5,
    paddingTop: 0,
    paddingHorizontal: 8,
    borderRadius: 0,
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  tabBarHidden: {
    display: 'none',
  },
  tabItem: {
    paddingVertical: 0,
    marginTop: -8,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  iconText: {
    fontSize: 20,
    fontWeight: '700',
  },
  iconTextActive: {
    color: palette.ink,
  },
  iconTextInactive: {
    color: palette.ink,
  },
  logoIcon: {
    width: 24,
    height: 24,
  },
});
