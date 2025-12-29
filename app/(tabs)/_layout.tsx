// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { Text, StyleSheet, Image, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
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
  // const [hasActiveDaPaint, setHasActiveDaPaint] = useState(false); // Commented out as it's not being used directly in the render
  const [hideTabBar, setHideTabBar] = useState(false);

  useEffect(() => {
    // @ts-ignore
    global.setTabBarVisibility = (visible: boolean) => setHideTabBar(!visible);

    return () => {
      // @ts-ignore
      delete global.setTabBarVisibility;
    };
  }, []);

  const checkActiveDaPaint = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // setHasActiveDaPaint(false); // Not used but may be needed in future
        return;
      }

      userDataManager.preloadUserData();
      daPaintDataManager.preloadActiveDaPaint();
      daPaintDataManager.preloadFeedData();

      // @ts-ignore - intentionally unused variable for future use
      const _activeDaPaint = await daPaintDataManager.getActiveDaPaint();
      // setHasActiveDaPaint(!!_activeDaPaint); // Not used but may be needed in future
    } catch (error) {
      logger.error('Error checking active DaPaint:', error);
    } finally {
      // No blocking render; preloads happen in background.
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

  return (
    <Tabs
      screenOptions={{
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: palette.ink,
        tabBarInactiveTintColor: palette.inkSoft,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: hideTabBar ? [styles.tabBar, styles.tabBarHidden] : styles.tabBar,
        tabBarBackground: () => (
          Platform.OS === 'web' ? (
            <View style={styles.tabBarBackdropWeb} />
          ) : (
            <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFillObject}>
              <View style={styles.tabBarBackdropNative} />
            </BlurView>
          )
        ),
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="feed"
        options={() => ({
          title: 'Feed',
          tabBarIcon: ({ focused }) => (
            <View style={focused ? [styles.iconContainer, styles.iconContainerActive] : styles.iconContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={focused ? [styles.logoIcon, styles.iconActive] : styles.logoIcon}
                resizeMode="contain"
              />
            </View>
          ),
        })}
      />
      <Tabs.Screen
        name="active"
        options={() => ({
          title: 'Active',
          tabBarIcon: ({ focused }) => (
            <View style={focused ? [styles.iconContainer, styles.iconContainerActive] : styles.iconContainer}>
              <Text
                  style={focused ? [styles.iconText, styles.iconTextActive] : [styles.iconText, styles.iconTextInactive]}
                >
                  🔥
              </Text>
            </View>
          ),
        })}
      />
      <Tabs.Screen
        name="profile"
        options={() => ({
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View style={focused ? [styles.iconContainer, styles.iconContainerActive] : styles.iconContainer}>
              <Text
                  style={focused ? [styles.iconText, styles.iconTextActive] : [styles.iconText, styles.iconTextInactive]}
                >
                  👤
              </Text>
            </View>
          ),
        })}
      />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
    borderTopWidth: 0,
    height: 60,
    paddingBottom: 8,
    paddingTop: 0,
    paddingHorizontal: 16,
    borderRadius: 28,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 500,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 15,
      },
      web: {
        boxShadow: '0px 8px 20px rgba(0,0,0,0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 15,
      },
    }),
  },
  tabBarBackdropNative: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 28,
  },
  tabBarBackdropWeb: ({
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 28,
  } as any),
  tabBarHidden: {
    display: 'none',
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
  },
  iconTextActive: {
    color: palette.ink,
  },
  iconTextInactive: {
    color: palette.inkSoft,
  },
  logoIcon: {
    width: 26,
    height: 26,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 16,
  },
  iconContainerActive: {
    backgroundColor: palette.inkSoft,
  },
  iconActive: {
    transform: [{ scale: 1.1 }],
  },
});
