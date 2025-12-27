import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DaPaintColors as theme } from '../../constants/DaPaintDesign';
import {
  getKeyboardDismissHandler,
  stopEventOnWeb,
} from '../../lib/webFocusGuard';
import { DaPaintButton } from '../ui/DaPaintButton';
import { DaPaintInlineCta } from '../ui/DaPaintInlineCta';

import { AltSignInPanel } from './AltSignInPanel';
import { AuthActivePanels } from './AuthActivePanels';

const BASE_BOTTOM_PADDING = Platform.OS === 'ios' ? 20 : 16;
const MAX_KEYBOARD_LIFT = 80; // prevent sheet from overshooting the logo

type AuthMode = 'username' | 'password' | 'alt';

type Props = {
  keyboardOffset: number;
  mode: AuthMode;
  username: string;
  password: string;
  loading: boolean;
  isChecking: boolean;
  panelsActive: boolean;
  panelError: string | null;
  panelSuccess: string | null;
  panelHelper: string;
  inputBorderColor: string;
  onFaq: () => void;
  onForgotUsername: () => void;
  onUseAltSignIn: () => void;
  onAltBack: () => void;
  onAltSuccess: () => void;
  onAltLoadingChange: (loading: boolean) => void;
  onUsernameChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  onPressCta: () => void;
  onLogin: () => void;
  setUiError: (msg: string | null) => void;
  setUiSuccess: (msg: string | null) => void;
};

export function AuthSectionView({
  keyboardOffset,
  mode,
  username,
  password,
  loading,
  isChecking,
  panelsActive,
  panelError,
  panelSuccess,
  panelHelper,
  inputBorderColor,
  onFaq,
  onForgotUsername,
  onUseAltSignIn,
  onAltBack,
  onAltSuccess,
  onAltLoadingChange,
  onUsernameChange,
  onPasswordChange,
  onPressCta,
  onLogin,
  setUiError,
  setUiSuccess,
}: Props) {
  const insets = useSafeAreaInsets();
  const keyboardPadding = Math.min(keyboardOffset, MAX_KEYBOARD_LIFT);
  const basePadding = Math.max(insets.bottom, BASE_BOTTOM_PADDING);
  const dismissKeyboard = getKeyboardDismissHandler();

  return (
    <Pressable
      onPress={dismissKeyboard}
      accessible={false}
      style={styles.touchGuard}
    >
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={styles.sheetWrapper}>
          <View
            style={[
              styles.bottomContainer,
              { paddingBottom: basePadding, marginBottom: keyboardPadding },
            ]}
          >
            <AuthActivePanels
              active={panelsActive}
              display_name={null}
              username={username}
              error={panelError}
              success={panelSuccess}
              helper={panelHelper}
              showHope={false}
              onFAQ={onFaq}
              onForgotUsername={onForgotUsername}
              onUseAltSignIn={onUseAltSignIn}
            />

            <View style={styles.formContainer}>
              {mode === 'alt' ? (
                <AltSignInPanel
                  setError={setUiError}
                  setSuccess={setUiSuccess}
                  onSuccess={onAltSuccess}
                  onBack={onAltBack}
                  onLoadingChange={onAltLoadingChange}
                />
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Enter Your Username</Text>
                    <View style={styles.inputRow}>
                      <DaPaintInlineCta
                        value={username}
                        onChangeText={onUsernameChange}
                        prefix="@"
                        placeholder="username"
                        editable={!loading && !isChecking}
                        ctaTitle={
                          isChecking || loading
                            ? 'Checking...'
                            : 'Start my streak'
                        }
                        ctaSubtitle={isChecking || loading ? '' : 'its free!'}
                        onPressCta={onPressCta}
                        ctaDisabled={isChecking || loading || !username.trim()}
                        loading={isChecking || loading}
                        borderColor={inputBorderColor}
                      />
                    </View>
                  </View>

                  {mode === 'password' && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Enter Your Password</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          value={password}
                          onChangeText={onPasswordChange}
                          placeholder="password"
                          placeholderTextColor={theme.textTertiary}
                          secureTextEntry
                          editable={!loading && !isChecking}
                          textContentType="password"
                          returnKeyType="go"
                          onSubmitEditing={onLogin}
                          autoFocus={mode === 'password'}
                          onPressIn={stopEventOnWeb}
                        />
                      </View>
                    </View>
                  )}

                  <View style={styles.ctaContainer}>
                    {mode === 'password' && (
                      <DaPaintButton
                        title={loading ? 'Signing in...' : 'Sign In'}
                        onPress={onLogin}
                        disabled={loading || !password}
                        variant="solid"
                      />
                    )}
                    {mode === 'password' && (
                      <Pressable
                        style={styles.backButton}
                        onPress={onAltBack}
                        disabled={loading}
                      >
                        <Text style={styles.backButtonText}>
                          Wrong username? Try again
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchGuard: { flex: 1 },
  kav: { flex: 1 },
  // Wrapper keeps the form near the bottom but allows the keyboard to lift it like signup
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
    zIndex: 5,
  },
  bottomContainer: {
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: theme.border,
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: Platform.OS === 'web' ? 460 : 420,
    paddingHorizontal: 18,
    paddingTop: 16,
    width: '94%',
    zIndex: 9,
    ...Platform.select({
      web: {
        boxShadow: '0px -4px 12px rgba(0,0,0,0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
    gap: 14,
  },
  formContainer: {
    gap: 12,
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  inputWrapper: {
    alignItems: 'center',
    backgroundColor: theme.surfaceStrong,
    borderColor: theme.border,
    borderRadius: 16,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    minHeight: 48,
  },
  input: {
    backgroundColor: 'transparent',
    color: theme.textPrimary,
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 12,
    textAlign: 'left',
    textAlignVertical: 'center',
  },
  ctaContainer: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
