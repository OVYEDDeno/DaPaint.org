import { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef } from "react";
import { theme } from "../../constants/theme";
import { getKeyboardDismissHandler, stopEventOnWeb } from "../../lib/webFocusGuard";

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
  const [newMessage, setNewMessage] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const dismissKeyboard = getKeyboardDismissHandler();

  useEffect(() => {
    const showEvent = Platform.OS === "android" ? "keyboardDidShow" : "keyboardWillShow";
    const hideEvent = Platform.OS === "android" ? "keyboardDidHide" : "keyboardWillHide";

    const onShow = (e: any) => setKeyboardOffset(e?.endCoordinates?.height ?? 0);
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
    setNewMessage("");
  };

  const bottomPadding =
    (Platform.OS === "ios" ? theme.space.xxl : theme.space.md) + insets.bottom + keyboardOffset;

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [sorted]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <Pressable onPress={dismissKeyboard} accessible={false} style={styles.touchGuard}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
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
            {sorted.map((msg) => {
              const mine = msg.user_id === userId;
              const name = msg.user?.display_name || "User";
              return (
                <View key={msg.id} style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {!mine && <Text style={styles.author}>{name}</Text>}
                    <Text style={styles.message}>{msg.message}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <BlurView intensity={28} tint="light" style={[styles.bottomBar, { paddingBottom: bottomPadding }]}>
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
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.space.lg,
    paddingTop: Platform.OS === "ios" ? theme.space.xxl : theme.space.lg,
    paddingBottom: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  title: {
    ...theme.type.displaySmall,
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  touchGuard: { flex: 1 },

  scroll: { flex: 1 },
  scrollContent: {
    padding: theme.space.lg,
    paddingBottom: 20,
    gap: theme.space.sm,
  },

  bubbleRow: {
    flexDirection: "row",
  },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },

  bubble: {
    maxWidth: "82%",
    borderRadius: theme.radius.lg,
    padding: theme.space.sm,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: "rgba(46,196,255,0.14)",
    borderColor: "rgba(46,196,255,0.25)",
  },
  bubbleTheirs: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },

  author: {
    ...theme.type.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.space.xxxs,
  },
  message: {
    ...theme.type.bodyLarge,
    color: theme.colors.textPrimary,
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  inputRow: {
    flexDirection: "row",
    gap: theme.space.sm,
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    ...theme.type.bodyLarge,
  },
  sendBtn: {
    paddingHorizontal: theme.space.lg,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primaryDeep,
    ...theme.shadow.glowPrimary,
  },
  sendText: {
    ...theme.type.labelMedium,
    color: "#FFFFFF",
  },
});

