import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../constants/theme';
import {
  getKeyboardDismissHandler,
  stopEventOnWeb,
} from '../../lib/webFocusGuard';

type ChatModalProps = {
  visible: boolean;
  messages: any[];
  userId: string;
  onClose: () => void;
  onSendMessage: (message: string) => void;
};

export default function ChatModal({
  visible,
  messages,
  userId,
  onClose,
  onSendMessage,
}: ChatModalProps) {
  const [newMessage, setNewMessage] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const dismissKeyboard = getKeyboardDismissHandler();

  useEffect(() => {
    const showEvent =
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent =
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const onShow = (e: any) =>
      setKeyboardOffset(e?.endCoordinates?.height ?? 0);
    const onHide = () => setKeyboardOffset(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sorted = useMemo(() => {
    return [...(messages || [])].sort((a, b) => {
      const at = new Date(a.created_at || 0).getTime();
      const bt = new Date(b.created_at || 0).getTime();
      return at - bt;
    });
  }, [messages]);

  const handleSend = () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setNewMessage('');
  };

  const bottomPadding =
    (Platform.OS === 'ios' ? theme.space.xxl : theme.space.md) +
    insets.bottom +
    keyboardOffset;

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true })
      );
    }
  }, [sorted]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <Pressable
        onPress={dismissKeyboard}
        accessible={false}
        style={styles.touchGuard}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Chat</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {sorted.map(msg => {
              const mine = msg.user_id === userId;
              const name = msg.user?.display_name || 'User';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.bubbleRow,
                    mine ? styles.rowMine : styles.rowTheirs,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleTheirs,
                    ]}
                  >
                    {!mine && <Text style={styles.author}>{name}</Text>}
                    <Text style={styles.message}>{msg.message}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <BlurView
            intensity={28}
            tint="light"
            style={[styles.bottomBar, { paddingBottom: bottomPadding }]}
          >
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Type a message"
                placeholderTextColor={theme.colors.textTertiary}
                value={newMessage}
                onChangeText={setNewMessage}
                onSubmitEditing={handleSend}
                onPressIn={stopEventOnWeb}
                returnKeyType="send"
              />
              <Pressable style={styles.sendBtn} onPress={handleSend}>
                <Text style={styles.sendText}>Send</Text>
              </Pressable>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  author: {
    ...theme.type.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.space.xxxs,
  },
  bottomBar: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
    position: 'absolute',
    right: 0,
  },
  bubble: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    maxWidth: '82%',
    padding: theme.space.sm,
  },
  bubbleMine: {
    backgroundColor: 'rgba(46,196,255,0.14)',
    borderColor: 'rgba(46,196,255,0.25)',
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleTheirs: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },

  closeBtn: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closeText: {
    color: theme.colors.textPrimary,
    fontSize: 18,
  },

  container: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingTop: Platform.OS === 'ios' ? theme.space.xxl : theme.space.lg,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    flex: 1,
    minHeight: 48,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    ...theme.type.bodyLarge,
  },

  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.space.sm,
  },
  message: {
    ...theme.type.bodyLarge,
    color: theme.colors.textPrimary,
  },
  rowMine: { justifyContent: 'flex-end' },

  rowTheirs: { justifyContent: 'flex-start' },
  scroll: { flex: 1 },

  scrollContent: {
    gap: theme.space.sm,
    padding: theme.space.lg,
    paddingBottom: 20,
  },
  sendBtn: {
    alignItems: 'center',
    backgroundColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.md,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: theme.space.lg,
    ...theme.shadow.glowPrimary,
  },
  sendText: {
    ...theme.type.labelMedium,
    color: '#FFFFFF',
  },
  title: {
    ...theme.type.displaySmall,
    color: theme.colors.textPrimary,
  },
  touchGuard: { flex: 1 },
});
