import { decode } from 'base64-arraybuffer';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthSection from '../../components/auth/AuthSection';
import BackgroundLayer from '../../components/ui/BackgroundLayer';
import FeedbackButton from '../../components/ui/FeedbackButton';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileActions from '../../components/profile/ProfileActions';
import ProfileStats from '../../components/profile/ProfileStats';
import ProfileSettings from '../../components/profile/ProfileSettings';
import EditProfileModal from '../../components/profile/modals/EditProfileModal';
import AccountSettingsModal from '../../components/profile/modals/AccountSettingsModal';
import NotificationsModal from '../../components/profile/modals/NotificationsModal';
import SupportModal from '../../components/profile/modals/SupportModal';

import {
  DaPaintColors,
  DaPaintSpacing,
} from '../../constants/DaPaintDesign';
import { signOut, getSession } from '../../lib/api/auth';
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

    router.push('/');
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
          <ProfileHeader
            userData={userData}
            subscriberCount={subscriberCount}
            avatarError={avatarError}
            setAvatarError={setAvatarError}
            refreshTrigger={refreshTrigger}
            onUploadPicture={handleUploadPicture}
          />

          <ProfileActions
            onEditPress={() => setEditModalVisible(true)}
            onAccountPress={() => setSettingsModalVisible(true)}
            onNotificationsPress={() => setNotificationsVisible(true)}
            onPublicProfilePress={goToPublicProfile}
          />

          <ProfileStats
            userData={userData}
            subscriberCount={subscriberCount}
          />

          <ProfileSettings
            onSupportPress={() => setSupportVisible(true)}
            onFeedbackPress={() => setFeedbackVisible(true)}
            onPrivacyPress={() => setPrivacyVisible(true)}
            onLogoutPress={handleLogout}
          />
        </ScrollView>

        <EditProfileModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          editForm={editForm}
          onUpdateField={updateEditField}
          onSave={handleSaveProfile}
          saving={saving}
          dismissKeyboard={dismissKeyboard}
        />

        <AccountSettingsModal
          visible={settingsModalVisible}
          onClose={() => setSettingsModalVisible(false)}
          accountForm={accountForm}
          onUpdateField={updateAccountField}
          onSave={handleSaveAccount}
          onDeleteAccount={handleDeleteAccount}
          saving={saving}
          dismissKeyboard={dismissKeyboard}
        />

        <NotificationsModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
          notificationSettings={notificationSettings}
          onToggleNotification={handleToggleNotification}
        />

        <SupportModal
          visible={supportVisible}
          onClose={() => setSupportVisible(false)}
          message={supportMessage}
          onUpdateMessage={setSupportMessage}
          onSubmit={submitSupport}
          dismissKeyboard={dismissKeyboard}
          title="Help & Support"
          placeholder="How can we help?"
        />

        <SupportModal
          visible={feedbackVisible}
          onClose={() => setFeedbackVisible(false)}
          message={feedbackMessage}
          onUpdateMessage={setFeedbackMessage}
          onSubmit={submitFeedback}
          dismissKeyboard={dismissKeyboard}
          title="Feedback"
          placeholder="Share your thoughts"
        />

        <SupportModal
          visible={privacyVisible}
          onClose={() => setPrivacyVisible(false)}
          message={privacyMessage}
          onUpdateMessage={setPrivacyMessage}
          onSubmit={submitPrivacy}
          dismissKeyboard={dismissKeyboard}
          title="Privacy"
          placeholder="Tell us your privacy request"
        />
      </View>

      <FeedbackButton visible />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: DaPaintColors.bg0,
    flex: 1,
  },
  contentContainer: {
    paddingBottom: DaPaintSpacing.xxxl,
    padding: DaPaintSpacing.lg,
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
});
