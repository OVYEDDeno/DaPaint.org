import { decode } from 'base64-arraybuffer';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthSection from '../../components/auth/AuthSection';
import BackgroundLayer from '../../components/ui/BackgroundLayer';
import FeedbackButton from '../../components/ui/FeedbackButton';
import {
  DaPaintButtons,
  DaPaintColors,
  DaPaintRadius,
  DaPaintShadows,
  DaPaintSpacing,
  DaPaintTypography,
} from '../../constants/DaPaintDesign';
import { signOut, getSession } from '../../lib/api/auth';
import { getProfilePicUrl } from '../../lib/profilePics';
import { supabase } from '../../lib/supabase';
import { userDataManager } from '../../lib/UserDataManager';
import { getKeyboardDismissHandler } from '../../lib/webFocusGuard';

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<{
    new_follower: boolean;
    dapaint_invite: boolean;
    dapaint_joined: boolean;
    dapaint_starting: boolean;
    dapaint_result: boolean;
    messages: boolean;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    display_name: '',
    username: '',
    phone: '',
    birthday: '',
    city: '',
    zipcode: '',
  });
  const [accountForm, setAccountForm] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [supportMessage, setSupportMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [privacyMessage, setPrivacyMessage] = useState('');
  const dismissKeyboard = getKeyboardDismissHandler();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const applyUserData = async (data: any, loadRelated: boolean) => {
          if (!data) return;
          setUserData(data);
          setEditForm({
            display_name: data?.display_name || '',
            username: data?.username || '',
            phone: data?.phone || '',
            birthday: data?.birthday || '',
            city: data?.city || '',
            zipcode: data?.zipcode || '',
          });
          setAccountForm(prev => ({
            ...prev,
            email: data?.email || '',
          }));
          if (loadRelated) {
            await loadSubscriberCount(data?.id);
            await ensureNotificationSettings(data?.id);
          }
        };

        const cachedUserData = await userDataManager.getUserData();
        if (cachedUserData) {
          await applyUserData(cachedUserData, true);
        }

        const freshUserData = await userDataManager.getUserData(true);
        if (freshUserData) {
          await applyUserData(freshUserData, !cachedUserData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
      setHasAttemptedLoad(true);
    };

    fetchUserData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const globalAny: any = global;
      if (typeof globalAny !== 'undefined' && globalAny.setTabBarVisibility) {
        globalAny.setTabBarVisibility(true);
      }
    }, [])
  );

  const loadSubscriberCount = async (userId?: string) => {
    if (!userId) return;
    const { count, error } = await supabase
      .from('user_subscriptions')
      .select('subscribed_to_id', { count: 'exact', head: true })
      .eq('subscribed_to_id', userId);
    if (error && error.code === 'PGRST205') {
      return;
    }
    setSubscriberCount(count || 0);
  };

  const ensureNotificationSettings = async (userId?: string) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('notification_settings')
      .select(
        'new_follower, dapaint_invite, dapaint_joined, dapaint_starting, dapaint_result, messages'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205') {
        return;
      }
      console.error('Error loading notification settings:', error);
      return;
    }

    if (!data) {
      const { data: created, error: createError } = await supabase
        .from('notification_settings')
        .insert({
          user_id: userId,
          new_follower: true,
          dapaint_invite: true,
          dapaint_joined: true,
          dapaint_starting: true,
          dapaint_result: true,
          messages: true,
        })
        .select(
          'new_follower, dapaint_invite, dapaint_joined, dapaint_starting, dapaint_result, messages'
        )
        .single();

      if (createError) {
        if (createError.code === 'PGRST205') {
          return;
        }
        console.error('Error creating notification settings:', createError);
        return;
      }
      setNotificationSettings(created);
      return;
    }

    setNotificationSettings(data);
  };

  const userStats = [
    { label: 'Subscribers', value: subscriberCount.toString() },
    { label: 'Win Streak', value: userData?.current_winstreak || '0' },
    { label: 'Highest Win Streak', value: userData?.highest_winstreak || '0' },
    { label: 'Wins', value: userData?.wins || '0' },
    { label: 'Losses', value: userData?.losses || '0' },
    {
      label: 'Win Rate',
      value:
        userData?.wins !== undefined &&
        userData?.losses !== undefined &&
        userData.wins + userData.losses > 0
          ? `${Math.round((userData.wins / (userData.wins + userData.losses)) * 100)}%`
          : '0%',
    },
    { label: 'Disqualifications', value: userData?.disqualifications || '0' },
  ];

  const handleUploadPicture = async () => {
    try {
      // Request permission to access media library
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Permission to access media library is required to upload a profile picture.'
        );
        return;
      }

      // Launch image library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4], // Cover-friendly aspect ratio
        quality: 0.85,
      });

      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri;
        if (!uri) {
          throw new Error('No image URI returned from picker');
        }

        // Generate a unique filename
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;

        // Compress and convert image to format suitable for upload
        const imageData = await prepareImageForUpload(uri);

        // Upload image to Supabase storage
        const { data: _data, error } = await supabase.storage
          .from('profile_pics')
          .upload(filename, imageData, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        // Update user's image_path in the database using authenticated user's ID
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const { error: updateError } = await supabase
          .from('users')
          .update({ image_path: filename })
          .eq('id', user.id);

        if (updateError) throw updateError;

        // Update local state and force refresh
        setUserData((prev: any) => ({ ...prev, image_path: filename }));
        setAvatarError(false);
        setRefreshTrigger(prev => prev + 1); // Increment to force re-render

        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert(
        'Error',
        'Failed to upload profile picture. Please try again.'
      );
    }
  };

  const goToPublicProfile = () => {
    if (userData?.username) {
      router.push(`/${userData.username}`);
    }
  };

  const handleLogout = async () => {
    const signOutResult = await signOut();
    await userDataManager.clearCache();

    if (!signOutResult.success) {
      Alert.alert(
        'Error',
        signOutResult.error?.message || 'Failed to sign out. Please try again.'
      );
      return;
    }

    const session = await getSession();
    if (session) {
      Alert.alert('Error', 'Session did not clear. Please try again.');
      return;
    }

    router.replace('/');
  };

  const prepareImageForUpload = async (uri: string): Promise<ArrayBuffer> => {
    // Use expo-image-manipulator to compress and resize the image
    const manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: 1200, height: 1600 } }], // Resize for cover quality
      { compress: 0.75, format: SaveFormat.JPEG, base64: true } // Get base64 output
    );

    // Convert base64 to ArrayBuffer for Supabase upload
    if (!manipResult.base64) {
      throw new Error('Failed to convert image to base64');
    }

    const arrayBuffer = decode(manipResult.base64);
    return arrayBuffer;
  };

  const updateEditField = (field: keyof typeof editForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const updateAccountField = (
    field: keyof typeof accountForm,
    value: string
  ) => {
    setAccountForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!userData?.id) return;
    if (!editForm.username.trim()) {
      Alert.alert('Try Again', 'Username is required');
      return;
    }

    const normalizedUsername = editForm.username.trim().toLowerCase();
    const birthdayValue = editForm.birthday ? editForm.birthday.trim() : '';
    const birthdayRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (birthdayValue && !birthdayRegex.test(birthdayValue)) {
      Alert.alert('Try Again', 'Birthday must be in YYYY-MM-DD format');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: editForm.display_name || normalizedUsername,
          username: normalizedUsername,
          phone: editForm.phone || null,
          birthday: birthdayValue || null,
          city: editForm.city || null,
          zipcode: editForm.zipcode || null,
        })
        .eq('id', userData.id);

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Try Again', 'That username is already taken.');
        } else {
          Alert.alert('Error', 'Failed to update profile. Please try again.');
        }
        return;
      }

      setUserData((prev: any) => ({
        ...prev,
        display_name: editForm.display_name || normalizedUsername,
        username: normalizedUsername,
        phone: editForm.phone,
        birthday: birthdayValue,
        city: editForm.city,
        zipcode: editForm.zipcode,
      }));
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!userData?.id) return;
    const email = accountForm.email.trim().toLowerCase();
    const password = accountForm.newPassword.trim();
    const confirmPassword = accountForm.confirmPassword.trim();

    if (password && password !== confirmPassword) {
      Alert.alert('Try Again', 'Passwords do not match.');
      return;
    }

    if (!password && email === userData.email) {
      setSettingsModalVisible(false);
      return;
    }

    setSaving(true);
    try {
      if (email && email !== userData.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) {
          Alert.alert('Error', emailError.message || 'Failed to update email.');
          return;
        }
        await supabase.from('users').update({ email }).eq('id', userData.id);
        setUserData((prev: any) => ({ ...prev, email }));
      }

      if (password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password,
        });
        if (passwordError) {
          Alert.alert(
            'Error',
            passwordError.message || 'Failed to update password.'
          );
          return;
        }
        setAccountForm(prev => ({
          ...prev,
          newPassword: '',
          confirmPassword: '',
        }));
      }

      setSettingsModalVisible(false);
    } catch (error) {
      console.error('Error updating account settings:', error);
      Alert.alert('Error', 'Failed to update account settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('delete_user');
              if (error) {
                Alert.alert(
                  'Error',
                  error.message || 'Failed to delete account.'
                );
                return;
              }
              await userDataManager.clearCache();
              await supabase.auth.signOut();
              router.replace('/');
            } catch (err) {
              console.error('Error deleting account:', err);
              Alert.alert('Error', 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  const handleToggleNotification = async (
    key: keyof NonNullable<typeof notificationSettings>,
    value: boolean
  ) => {
    if (!userData?.id) return;
    setNotificationSettings(prev => (prev ? { ...prev, [key]: value } : prev));
    const { error } = await supabase
      .from('notification_settings')
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq('user_id', userData.id);
    if (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  const submitSupport = async () => {
    if (!supportMessage.trim()) {
      Alert.alert('Try Again', 'Please enter a message.');
      return;
    }
    if (!userData?.id) return;
    const { error } = await supabase
      .from('support_requests')
      .insert({ user_id: userData.id, message: supportMessage.trim() });
    if (error) {
      if (error.code === 'PGRST205') {
        Alert.alert('Unavailable', 'Support requests are not set up yet.');
        return;
      }
      Alert.alert('Error', 'Failed to submit support request.');
      return;
    }
    setSupportMessage('');
    setSupportVisible(false);
    Alert.alert('Sent', 'Support request sent.');
  };

  const submitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      Alert.alert('Try Again', 'Please enter a message.');
      return;
    }
    if (!userData?.id) return;
    const { error } = await supabase
      .from('feedback')
      .insert({ user_id: userData.id, message: feedbackMessage.trim() });
    if (error) {
      if (error.code === 'PGRST205') {
        Alert.alert('Unavailable', 'Feedback is not set up yet.');
        return;
      }
      Alert.alert('Error', 'Failed to submit feedback.');
      return;
    }
    setFeedbackMessage('');
    setFeedbackVisible(false);
    Alert.alert('Sent', 'Feedback submitted.');
  };

  const submitPrivacy = async () => {
    if (!privacyMessage.trim()) {
      Alert.alert('Try Again', 'Please enter a message.');
      return;
    }
    if (!userData?.id) return;
    const { error } = await supabase
      .from('privacy_requests')
      .insert({ user_id: userData.id, message: privacyMessage.trim() });
    if (error) {
      if (error.code === 'PGRST205') {
        Alert.alert('Unavailable', 'Privacy requests are not set up yet.');
        return;
      }
      Alert.alert('Error', 'Failed to submit privacy request.');
      return;
    }
    setPrivacyMessage('');
    setPrivacyVisible(false);
    Alert.alert('Sent', 'Privacy request submitted.');
  };

  if (!userData && hasAttemptedLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundLayer />
        <AuthSection keyboardOffset={0} />
      </SafeAreaView>
    );
  }

  const FALLBACK_AVATAR = require('../../assets/logo.png');

  // Get avatar URI with cache busting enabled
  const avatarUri = userData?.image_path
    ? getProfilePicUrl(userData.image_path, true)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundLayer />
      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Profile Header */}
          <View style={styles.headerContainer}>
            <View style={styles.avatarContainer}>
              <Image
                key={`avatar-${refreshTrigger}`}
                source={
                  !avatarUri || avatarError
                    ? FALLBACK_AVATAR
                    : { uri: avatarUri }
                }
                style={styles.avatar}
                resizeMode="cover"
                onError={() => setAvatarError(true)}
              />
              <Pressable
                style={styles.changePictureButton}
                onPress={handleUploadPicture}
              >
                <Text style={styles.changePictureText}>+</Text>
              </Pressable>
            </View>

            <View style={styles.userInfoContainer}>
              <Text style={styles.displayName}>
                {userData?.display_name || 'User'}
              </Text>
              <Text style={styles.username}>
                @{userData?.username || 'username'}
              </Text>
              {(userData?.city || userData?.zipcode) && (
                <Text style={styles.location}>
                  {[userData?.city, userData?.zipcode]
                    .filter(Boolean)
                    .join(' - ')}
                </Text>
              )}
              <Text style={styles.subscriberCount}>
                {subscriberCount} subscribers
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.actionButton}
              onPress={() => setEditModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => setSettingsModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>Account</Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => setNotificationsVisible(true)}
            >
              <Text style={styles.actionButtonText}>Notifications</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={goToPublicProfile}>
              <Text style={styles.actionButtonText}>Public Profile</Text>
            </Pressable>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Stats</Text>
            <View style={styles.statsGrid}>
              {userStats.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Settings */}
          <View style={styles.settingsContainer}>
            <Pressable
              style={styles.settingButton}
              onPress={() => setSupportVisible(true)}
            >
              <Text style={styles.settingButtonText}>Help & Support</Text>
            </Pressable>
            <Pressable
              style={styles.settingButton}
              onPress={() => setFeedbackVisible(true)}
            >
              <Text style={styles.settingButtonText}>Feedback</Text>
            </Pressable>
            <Pressable
              style={styles.settingButton}
              onPress={() => setPrivacyVisible(true)}
            >
              <Text style={styles.settingButtonText}>Privacy</Text>
            </Pressable>
            <Pressable
              style={[styles.settingButton, styles.settingButtonLast]}
              onPress={handleLogout}
            >
              <Text style={styles.settingButtonText}>Log Out</Text>
            </Pressable>
          </View>
        </ScrollView>

        <Modal
          visible={editModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <Pressable
            onPress={dismissKeyboard}
            accessible={false}
            style={styles.sheetTouchGuard}
          >
            <KeyboardAvoidingView
              style={styles.sheetContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Edit Profile</Text>
                <Pressable onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.sheetClose}>X</Text>
                </Pressable>
              </View>
              <ScrollView
                style={styles.sheetContent}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sheetLabel}>Display Name</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={editForm.display_name}
                  onChangeText={text => updateEditField('display_name', text)}
                  placeholder="Display name"
                  placeholderTextColor={DaPaintColors.textTertiary}
                />

                <Text style={styles.sheetLabel}>Username</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={editForm.username}
                  onChangeText={text =>
                    updateEditField('username', text.toLowerCase())
                  }
                  placeholder="username"
                  autoCapitalize="none"
                  placeholderTextColor={DaPaintColors.textTertiary}
                />

                <Text style={styles.sheetLabel}>Phone</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={editForm.phone}
                  onChangeText={text => updateEditField('phone', text)}
                  placeholder="(123) 456-7890"
                  keyboardType="phone-pad"
                  placeholderTextColor={DaPaintColors.textTertiary}
                />

                <Text style={styles.sheetLabel}>Birthday (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={editForm.birthday}
                  onChangeText={text => updateEditField('birthday', text)}
                  placeholder="2000-01-01"
                  placeholderTextColor={DaPaintColors.textTertiary}
                />

                <Text style={styles.sheetLabel}>City</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={editForm.city}
                  onChangeText={text => updateEditField('city', text)}
                  placeholder="City"
                  placeholderTextColor={DaPaintColors.textTertiary}
                />

                <Text style={styles.sheetLabel}>Zip Code</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={editForm.zipcode}
                  onChangeText={text => updateEditField('zipcode', text)}
                  placeholder="Zip code"
                  autoCapitalize="characters"
                  placeholderTextColor={DaPaintColors.textTertiary}
                />
              </ScrollView>
              <View style={styles.sheetFooter}>
                <Pressable
                  style={styles.sheetSecondaryButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.sheetSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.sheetPrimaryButton}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  <Text style={styles.sheetPrimaryText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        <Modal
          visible={settingsModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <Pressable
            onPress={dismissKeyboard}
            accessible={false}
            style={styles.sheetTouchGuard}
          >
            <KeyboardAvoidingView
              style={styles.sheetContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Account Settings</Text>
                <Pressable onPress={() => setSettingsModalVisible(false)}>
                  <Text style={styles.sheetClose}>X</Text>
                </Pressable>
              </View>
              <ScrollView
                style={styles.sheetContent}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sheetLabel}>Email</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={accountForm.email}
                  onChangeText={text => updateAccountField('email', text)}
                  placeholder="you@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={DaPaintColors.textTertiary}
                />

                <Text style={styles.sheetLabel}>New Password</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={accountForm.newPassword}
                  onChangeText={text => updateAccountField('newPassword', text)}
                  placeholder="New password"
                  secureTextEntry
                  placeholderTextColor={DaPaintColors.textTertiary}
                />

                <Text style={styles.sheetLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={accountForm.confirmPassword}
                  onChangeText={text =>
                    updateAccountField('confirmPassword', text)
                  }
                  placeholder="Confirm password"
                  secureTextEntry
                  placeholderTextColor={DaPaintColors.textTertiary}
                />

                <Pressable
                  style={styles.sheetDangerButton}
                  onPress={handleDeleteAccount}
                >
                  <Text style={styles.sheetDangerText}>Delete Account</Text>
                </Pressable>
              </ScrollView>
              <View style={styles.sheetFooter}>
                <Pressable
                  style={styles.sheetSecondaryButton}
                  onPress={() => setSettingsModalVisible(false)}
                >
                  <Text style={styles.sheetSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.sheetPrimaryButton}
                  onPress={handleSaveAccount}
                  disabled={saving}
                >
                  <Text style={styles.sheetPrimaryText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        <Modal
          visible={notificationsVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setNotificationsVisible(false)}
        >
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Notifications</Text>
              <Pressable onPress={() => setNotificationsVisible(false)}>
                <Text style={styles.sheetClose}>X</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.sheetContent}
              contentContainerStyle={styles.sheetScrollContent}
            >
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>New Followers</Text>
                <Switch
                  value={notificationSettings?.new_follower ?? true}
                  onValueChange={value =>
                    handleToggleNotification('new_follower', value)
                  }
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>DaPaint Invites</Text>
                <Switch
                  value={notificationSettings?.dapaint_invite ?? true}
                  onValueChange={value =>
                    handleToggleNotification('dapaint_invite', value)
                  }
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>DaPaint Joined</Text>
                <Switch
                  value={notificationSettings?.dapaint_joined ?? true}
                  onValueChange={value =>
                    handleToggleNotification('dapaint_joined', value)
                  }
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>DaPaint Starting</Text>
                <Switch
                  value={notificationSettings?.dapaint_starting ?? true}
                  onValueChange={value =>
                    handleToggleNotification('dapaint_starting', value)
                  }
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>DaPaint Results</Text>
                <Switch
                  value={notificationSettings?.dapaint_result ?? true}
                  onValueChange={value =>
                    handleToggleNotification('dapaint_result', value)
                  }
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Messages</Text>
                <Switch
                  value={notificationSettings?.messages ?? true}
                  onValueChange={value =>
                    handleToggleNotification('messages', value)
                  }
                />
              </View>
            </ScrollView>
            <View style={styles.sheetFooter}>
              <Pressable
                style={styles.sheetPrimaryButton}
                onPress={() => setNotificationsVisible(false)}
              >
                <Text style={styles.sheetPrimaryText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={supportVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSupportVisible(false)}
        >
          <Pressable
            onPress={dismissKeyboard}
            accessible={false}
            style={styles.sheetTouchGuard}
          >
            <KeyboardAvoidingView
              style={styles.sheetContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Help & Support</Text>
                <Pressable onPress={() => setSupportVisible(false)}>
                  <Text style={styles.sheetClose}>X</Text>
                </Pressable>
              </View>
              <ScrollView
                style={styles.sheetContent}
                contentContainerStyle={styles.sheetScrollContent}
              >
                <TextInput
                  style={[styles.sheetInput, styles.sheetTextArea]}
                  value={supportMessage}
                  onChangeText={setSupportMessage}
                  placeholder="How can we help?"
                  multiline
                  placeholderTextColor={DaPaintColors.textTertiary}
                />
              </ScrollView>
              <View style={styles.sheetFooter}>
                <Pressable
                  style={styles.sheetSecondaryButton}
                  onPress={() => setSupportVisible(false)}
                >
                  <Text style={styles.sheetSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.sheetPrimaryButton}
                  onPress={submitSupport}
                >
                  <Text style={styles.sheetPrimaryText}>Send</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        <Modal
          visible={feedbackVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setFeedbackVisible(false)}
        >
          <Pressable
            onPress={dismissKeyboard}
            accessible={false}
            style={styles.sheetTouchGuard}
          >
            <KeyboardAvoidingView
              style={styles.sheetContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Feedback</Text>
                <Pressable onPress={() => setFeedbackVisible(false)}>
                  <Text style={styles.sheetClose}>X</Text>
                </Pressable>
              </View>
              <ScrollView
                style={styles.sheetContent}
                contentContainerStyle={styles.sheetScrollContent}
              >
                <TextInput
                  style={[styles.sheetInput, styles.sheetTextArea]}
                  value={feedbackMessage}
                  onChangeText={setFeedbackMessage}
                  placeholder="Share your thoughts"
                  multiline
                  placeholderTextColor={DaPaintColors.textTertiary}
                />
              </ScrollView>
              <View style={styles.sheetFooter}>
                <Pressable
                  style={styles.sheetSecondaryButton}
                  onPress={() => setFeedbackVisible(false)}
                >
                  <Text style={styles.sheetSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.sheetPrimaryButton}
                  onPress={submitFeedback}
                >
                  <Text style={styles.sheetPrimaryText}>Send</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        <Modal
          visible={privacyVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setPrivacyVisible(false)}
        >
          <Pressable
            onPress={dismissKeyboard}
            accessible={false}
            style={styles.sheetTouchGuard}
          >
            <KeyboardAvoidingView
              style={styles.sheetContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Privacy</Text>
                <Pressable onPress={() => setPrivacyVisible(false)}>
                  <Text style={styles.sheetClose}>X</Text>
                </Pressable>
              </View>
              <ScrollView
                style={styles.sheetContent}
                contentContainerStyle={styles.sheetScrollContent}
              >
                <TextInput
                  style={[styles.sheetInput, styles.sheetTextArea]}
                  value={privacyMessage}
                  onChangeText={setPrivacyMessage}
                  placeholder="Tell us your privacy request"
                  multiline
                  placeholderTextColor={DaPaintColors.textTertiary}
                />
              </ScrollView>
              <View style={styles.sheetFooter}>
                <Pressable
                  style={styles.sheetSecondaryButton}
                  onPress={() => setPrivacyVisible(false)}
                >
                  <Text style={styles.sheetSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.sheetPrimaryButton}
                  onPress={submitPrivacy}
                >
                  <Text style={styles.sheetPrimaryText}>Send</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>
      </View>

      {/* Feedback Button */}
      <FeedbackButton visible />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: DaPaintButtons.faq.background,
    borderColor: DaPaintButtons.faq.border,
    borderRadius: DaPaintRadius.sm,
    borderWidth: 1,
    flex: 1,
    minWidth: 140,
    paddingVertical: DaPaintSpacing.sm,
  },
  actionButtonText: {
    color: DaPaintButtons.faq.text,
    ...DaPaintTypography.labelSmall,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DaPaintSpacing.sm,
    justifyContent: 'space-between',
    marginBottom: DaPaintSpacing.xl,
  },
  avatar: {
    height: '100%',
    width: '100%',
  },
  avatarContainer: {
    borderColor: DaPaintColors.primaryDeep,
    borderRadius: DaPaintRadius.full,
    borderWidth: 3,
    height: 120,
    marginBottom: DaPaintSpacing.md,
    overflow: 'hidden',
    width: 120,
    ...DaPaintShadows.medium,
    position: 'relative',
  },
  changePictureButton: {
    backgroundColor: DaPaintColors.primaryDeep,
    borderColor: DaPaintColors.bg0,
    borderRadius: DaPaintRadius.full,
    borderWidth: 2,
    bottom: -8,
    padding: DaPaintSpacing.xs,
    position: 'absolute',
    right: -8,
    zIndex: 10,
  },
  changePictureText: {
    color: '#FFFFFF',
    ...DaPaintTypography.labelSmall,
    fontSize: 10,
  },
  container: {
    backgroundColor: DaPaintColors.bg0,
    flex: 1,
  },
  contentContainer: {
    paddingBottom: DaPaintSpacing.xxxl, // Extra padding to account for bottom tab bar
    padding: DaPaintSpacing.lg,
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 680, // Limit width on web
    alignSelf: 'center',
    width: '100%',
  },
  displayName: {
    color: DaPaintColors.textPrimary,
    ...DaPaintTypography.displayMedium,
    marginBottom: DaPaintSpacing.xxs,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: DaPaintSpacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: DaPaintColors.textPrimary,
    ...DaPaintTypography.bodyLarge,
  },
  location: {
    color: DaPaintColors.textTertiary,
    ...DaPaintTypography.bodySmall,
    marginBottom: DaPaintSpacing.xxs,
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    ...DaPaintTypography.displaySmall,
    color: DaPaintColors.textPrimary,
    marginBottom: DaPaintSpacing.md,
    textAlign: 'center',
  },
  settingButton: {
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    borderBottomColor: DaPaintButtons.faq.border,
    borderBottomWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: DaPaintSpacing.md,
    width: '100%',
  },
  settingButtonLast: {
    borderBottomWidth: 0,
  },
  settingButtonText: {
    ...DaPaintTypography.bodyMedium,
    color: DaPaintButtons.faq.text,
  },
  settingsContainer: {
    backgroundColor: DaPaintButtons.faq.background,
    borderColor: DaPaintButtons.faq.border,
    borderRadius: DaPaintRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetClose: {
    color: DaPaintColors.textPrimary,
    fontSize: 22,
    fontWeight: '400',
  },
  sheetContainer: {
    backgroundColor: DaPaintColors.bg0,
    flex: 1,
  },
  sheetContent: {
    flex: 1,
  },
  sheetDangerButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,69,58,0.1)',
    borderColor: DaPaintColors.error,
    borderRadius: DaPaintRadius.sm,
    borderWidth: 1,
    marginTop: DaPaintSpacing.md,
    paddingVertical: DaPaintSpacing.sm,
  },
  sheetDangerText: {
    color: DaPaintColors.error,
    ...DaPaintTypography.labelMedium,
  },
  sheetFooter: {
    backgroundColor: DaPaintColors.surface,
    borderTopColor: DaPaintButtons.faq.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: DaPaintSpacing.sm,
    paddingHorizontal: DaPaintSpacing.lg,
    paddingVertical: DaPaintSpacing.md,
  },
  sheetHeader: {
    alignItems: 'center',
    backgroundColor: DaPaintColors.surface,
    borderBottomColor: DaPaintButtons.faq.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: DaPaintSpacing.headerBottom,
    paddingHorizontal: DaPaintSpacing.lg,
    paddingTop: DaPaintSpacing.headerTop,
  },
  sheetInput: {
    backgroundColor: DaPaintButtons.faq.background,
    borderColor: DaPaintButtons.faq.border,
    borderRadius: DaPaintRadius.sm,
    borderWidth: 1,
    color: DaPaintColors.textPrimary,
    padding: DaPaintSpacing.sm,
  },
  sheetLabel: {
    ...DaPaintTypography.labelSmall,
    color: DaPaintColors.textPrimary,
    marginBottom: DaPaintSpacing.xxs,
    marginTop: DaPaintSpacing.sm,
  },
  sheetPrimaryButton: {
    alignItems: 'center',
    backgroundColor: DaPaintColors.primaryDeep,
    borderRadius: DaPaintRadius.sm,
    flex: 1,
    paddingVertical: DaPaintSpacing.sm,
  },
  sheetPrimaryText: {
    color: '#FFFFFF',
    ...DaPaintTypography.labelMedium,
  },
  sheetScrollContent: {
    paddingBottom: DaPaintSpacing.xxl,
    paddingHorizontal: DaPaintSpacing.lg,
    paddingTop: DaPaintSpacing.md,
  },
  sheetSecondaryButton: {
    alignItems: 'center',
    backgroundColor: DaPaintButtons.faq.background,
    borderColor: DaPaintButtons.faq.border,
    borderRadius: DaPaintRadius.sm,
    borderWidth: 1,
    flex: 1,
    paddingVertical: DaPaintSpacing.sm,
  },
  sheetSecondaryText: {
    color: DaPaintButtons.faq.text,
    ...DaPaintTypography.labelMedium,
  },
  sheetTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  sheetTitle: {
    ...DaPaintTypography.displayMedium,
    color: DaPaintColors.textPrimary,
  },
  sheetTouchGuard: {
    flex: 1,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: DaPaintButtons.faq.background,
    borderColor: DaPaintButtons.faq.border,
    borderRadius: DaPaintRadius.md,
    borderWidth: 1,
    flex: 1,
    minWidth: '48%',
    paddingHorizontal: DaPaintSpacing.md,
    paddingVertical: DaPaintSpacing.md,
  },
  statLabel: {
    ...DaPaintTypography.bodySmall,
    color: DaPaintColors.textTertiary,
    textAlign: 'center',
  },
  statValue: {
    ...DaPaintTypography.displaySmall,
    color: DaPaintColors.textPrimary,
    marginBottom: DaPaintSpacing.xxs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DaPaintSpacing.sm,
    justifyContent: 'space-between',
  },
  statsSection: {
    marginBottom: DaPaintSpacing.xl,
  },
  subscriberCount: {
    color: DaPaintColors.textTertiary,
    ...DaPaintTypography.bodySmall,
  },
  toggleLabel: {
    color: DaPaintColors.textPrimary,
    ...DaPaintTypography.bodyMedium,
  },
  toggleRow: {
    alignItems: 'center',
    borderBottomColor: DaPaintButtons.faq.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: DaPaintSpacing.sm,
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: DaPaintSpacing.md,
  },
  username: {
    color: DaPaintColors.textSecondary,
    ...DaPaintTypography.bodyMedium,
    marginBottom: DaPaintSpacing.xxs,
  },
});
