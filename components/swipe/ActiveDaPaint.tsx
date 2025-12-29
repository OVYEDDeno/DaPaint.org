import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../constants/theme';
import {
  DaPaint,
  getTeamComposition,
  switchTeam,
  canEditDaPaint,
} from '../../lib/api/dapaints';
import logger from '../../lib/logger';
import { supabase } from '../../lib/supabase';

import ChatModal from './ChatModal';
import EditDaPaintModal from './EditDaPaintModal';

type ActiveDaPaintProps = {
  dapaint: DaPaint;
  userId: string;
  onLeave: () => void;
};

type ChatMessage = {
  id: string;
  user_id: string;
  message: string;
  image_url: string | null;
  created_at: string;
  user?: { display_name: string };
};

type Submission = {
  user_id: string;
  display_name: string;
  claimed_won: boolean;
  proof_url: string | null;
  submitted_at: string;
};

export default function ActiveDaPaint({
  dapaint,
  userId,
  onLeave,
}: ActiveDaPaintProps) {
  const [now, setNow] = useState(() => new Date());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamInfo, setTeamInfo] = useState<any>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [proofUrl, setProofUrl] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const insets = useSafeAreaInsets();

  const chatInsertChannel = useRef<any>(null);
  const chatUpdateChannel = useRef<any>(null);
  const subsChannel = useRef<any>(null);

  const isHost = dapaint.host_id === userId;
  const startsAt = useMemo(
    () => new Date(dapaint.starts_at),
    [dapaint.starts_at]
  );
  const hasStarted = now >= startsAt;
  const hoursUntilStart =
    (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const leaveButtonInfo = useMemo(() => {
    const isWithin48Hours = hoursUntilStart <= 48;
    const hasFoe = !!dapaint.foe_id;

    if (isHost && hasFoe && isWithin48Hours) {
      return { text: '⚠️ Forfeit', bg: theme.colors.error };
    }
    if (isHost) {
      return { text: '🗑️ Delete', bg: theme.colors.error };
    }
    if (isWithin48Hours && hasFoe) {
      return { text: '⚠️ Forfeit', bg: theme.colors.error };
    }
    return { text: '← Leave', bg: theme.colors.surfaceStrong };
  }, [dapaint.foe_id, hoursUntilStart, isHost]);

  const loadChat = useCallback(async () => {
    const { data } = await supabase
      .from('dapaint_chat')
      .select(`*, user:users(display_name)`)
      .eq('dapaint_id', dapaint.id)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as any);
  }, [dapaint.id]);

  const loadSubmissions = useCallback(async () => {
    if (dapaint.dapaint_type === '1v1') {
      const subs: Submission[] = [];

      const { data: hostData } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', dapaint.host_id)
        .single();

      if (dapaint.host_claimed_winner_id || dapaint.foe_claimed_winner_id) {
        subs.push({
          user_id: dapaint.host_id,
          display_name: hostData?.display_name || 'Host',
          claimed_won: dapaint.host_claimed_winner_id === dapaint.host_id,
          proof_url: null,
          submitted_at: new Date().toISOString(),
        });
      }

      if (dapaint.foe_id) {
        const { data: foeData } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', dapaint.foe_id)
          .single();

        if (dapaint.host_claimed_winner_id || dapaint.foe_claimed_winner_id) {
          subs.push({
            user_id: dapaint.foe_id,
            display_name: foeData?.display_name || 'Foe',
            claimed_won: dapaint.foe_claimed_winner_id === dapaint.foe_id,
            proof_url: null,
            submitted_at: new Date().toISOString(),
          });
        }
      }

      setSubmissions(subs);
      setMySubmission(subs.find(s => s.user_id === userId) || null);
      return;
    }

    const { data: participants } = await supabase
      .from('dapaint_participants')
      .select(
        `
        user_id,
        result_submitted,
        submitted_winner_id,
        proof_url,
        submitted_at,
        user:users(display_name)
      `
      )
      .eq('dapaint_id', dapaint.id)
      .eq('result_submitted', true);

    if (!participants) {
      setSubmissions([]);
      setMySubmission(null);
      return;
    }

    const subs: Submission[] = participants.map((p: any) => {
      const dn = p.user?.display_name || 'User';
      return {
        user_id: p.user_id,
        display_name: dn,
        claimed_won: p.submitted_winner_id === p.user_id, // Note: For team participants, this might still use the old schema
        proof_url: p.proof_url,
        submitted_at: p.submitted_at,
      };
    });

    setSubmissions(subs);
    setMySubmission(subs.find(s => s.user_id === userId) || null);
  }, [dapaint, userId]);

  const loadTeam = useCallback(async () => {
    if (dapaint.dapaint_type !== 'team') return;
    const composition = await getTeamComposition(dapaint.id);
    setTeamInfo(composition);
  }, [dapaint.dapaint_type, dapaint.id]);

  const loadData = useCallback(async () => {
    await Promise.all([loadChat(), loadTeam(), loadSubmissions()]);
  }, [loadChat, loadTeam, loadSubmissions]);

  const subscribeRealtime = useCallback(() => {
    if (chatInsertChannel.current)
      supabase.removeChannel(chatInsertChannel.current);
    if (chatUpdateChannel.current)
      supabase.removeChannel(chatUpdateChannel.current);
    if (subsChannel.current) supabase.removeChannel(subsChannel.current);

    chatInsertChannel.current = supabase
      .channel(`dapaint-chat-insert-${dapaint.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dapaint_chat',
          filter: `dapaint_id=eq.${dapaint.id}`,
        },
        async payload => {
          const newMessage = (payload as any).new;

          // Fetch user data for the new message
          const { data: user } = await supabase
            .from('users')
            .select('display_name')
            .eq('id', newMessage.user_id)
            .single();

          // Create the complete message object with user data
          const messageWithUser: ChatMessage = {
            ...newMessage,
            user: user ? { display_name: user.display_name } : undefined,
          };

          setMessages(prev => [...prev, messageWithUser]);
        }
      )
      .subscribe();

    chatUpdateChannel.current = supabase
      .channel(`dapaint-chat-update-${dapaint.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dapaint_chat',
          filter: `dapaint_id=eq.${dapaint.id}`,
        },
        payload => {
          setMessages(prev =>
            prev.map(m =>
              m.id === (payload as any).new.id
                ? { ...m, ...(payload as any).new }
                : m
            )
          );
        }
      )
      .subscribe();

    if (dapaint.dapaint_type === '1v1') {
      subsChannel.current = supabase
        .channel(`dapaint-subs-1v1-${dapaint.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'dapaints',
            filter: `id=eq.${dapaint.id}`,
          },
          () => loadSubmissions()
        )
        .subscribe();
    } else {
      subsChannel.current = supabase
        .channel(`dapaint-subs-team-${dapaint.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'dapaint_participants',
            filter: `dapaint_id=eq.${dapaint.id}`,
          },
          () => loadSubmissions()
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'dapaint_participants',
            filter: `dapaint_id=eq.${dapaint.id}`,
          },
          () => loadSubmissions()
        )
        .subscribe();
    }
  }, [dapaint.id, dapaint.dapaint_type, loadSubmissions]);

  useEffect(() => {
    loadData();
    subscribeRealtime();

    return () => {
      if (chatInsertChannel.current)
        supabase.removeChannel(chatInsertChannel.current);
      if (chatUpdateChannel.current)
        supabase.removeChannel(chatUpdateChannel.current);
      if (subsChannel.current) supabase.removeChannel(subsChannel.current);
    };
  }, [loadData, subscribeRealtime]);

  const handleSwitchTeam = useCallback(async () => {
    setLoading(true);
    try {
      await switchTeam(dapaint.id);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to switch teams');
    } finally {
      setLoading(false);
    }
  }, [dapaint.id, loadData]);

  const handleSubmitResult = useCallback(
    async (claimedWon: boolean) => {
      const url = proofUrl.trim();
      if (!url) {
        Alert.alert(
          'Proof Required',
          'Please provide a proof link (Instagram, TikTok, YouTube, etc.) in the input field above before submitting your result.'
        );
        return;
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        Alert.alert(
          'Invalid URL',
          'Please enter a valid URL starting with http:// or https://'
        );
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.rpc('process_result_submission', {
          p_dapaint_id: dapaint.id,
          p_user_id: userId,
          p_claimed_won: claimedWon,
          p_proof_url: url,
        });

        if (error) throw error;

        Alert.alert(
          'Result Submitted',
          claimedWon ? 'You claimed the win!' : 'You submitted your result.',
          [{ text: 'OK', onPress: () => loadSubmissions() }]
        );

        setProofUrl('');
      } catch (error: any) {
        logger.error('Error submitting result:', error);
        Alert.alert(
          'Submission Failed',
          error.message || 'Failed to submit result. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    },
    [proofUrl, dapaint.id, userId, loadSubmissions]
  );

  const handleLeave = useCallback(() => {
    const isWithin48Hours = hoursUntilStart <= 48;
    const hasFoe = !!dapaint.foe_id;

    if (Platform.OS === 'web') {
      let message = 'Leave DaPaint?\n\nAre you sure you want to leave?';
      if (isHost && hasFoe && isWithin48Hours) {
        message =
          '⚠️ FORFEIT WARNING\n\nYou are the host and within 48 hours of start time. Leaving now means you forfeit and your foe wins. Continue?';
      } else if (isHost) {
        message =
          'Delete DaPaint?\n\nThis will permanently delete the DaPaint.';
      } else if (isWithin48Hours && hasFoe) {
        message =
          '⚠️ FORFEIT WARNING\n\nYou are within 48 hours of start time. Leaving now means you forfeit and the host wins. Continue?';
      }

      const ok = window.confirm(message);
      if (ok) onLeave();
      return;
    }

    let title = 'Leave DaPaint?';
    let message = 'Are you sure you want to leave?';
    let destructiveText = 'Leave';

    if (isHost && hasFoe && isWithin48Hours) {
      title = '⚠️ Forfeit Warning';
      message =
        'You are the host and within 48 hours of start time. Leaving now means you forfeit and your foe wins.';
      destructiveText = 'Forfeit';
    } else if (isHost) {
      title = 'Delete DaPaint?';
      message = 'This will permanently delete the DaPaint.';
      destructiveText = 'Delete';
    } else if (isWithin48Hours && hasFoe) {
      title = '⚠️ Forfeit Warning';
      message =
        'You are within 48 hours of start time. Leaving now means you forfeit and the host wins.';
      destructiveText = 'Forfeit';
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: destructiveText, style: 'destructive', onPress: onLeave },
    ]);
  }, [dapaint.foe_id, hoursUntilStart, isHost, onLeave]);

  const handleEdit = useCallback(() => {
    if (!isHost) {
      Alert.alert('Permission', 'Only the host can edit this DaPaint.');
      return;
    }

    canEditDaPaint(dapaint.id).then((ok: boolean) => {
      if (!ok) {
        Alert.alert(
          'Cannot Edit',
          'Someone has already joined. Editing is locked.'
        );
        return;
      }
      setShowEditModal(true);
    });
  }, [dapaint.id, isHost]);

  const openUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open link.');
    }
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + theme.space.xl, paddingBottom: 120 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Matchup */}
        <View style={styles.card}>
          <View style={styles.matchRow}>
            <View style={styles.side}>
              <Text style={styles.sideLabel}>HOST</Text>
              <Text style={styles.sideName}>{dapaint.host_display_name}</Text>
            </View>

            <Text style={styles.vs}>VS</Text>

            <View style={styles.side}>
              <Text style={styles.sideLabel}>
                {dapaint.dapaint_type === '1v1' ? 'FOE' : 'FOE TEAM'}
              </Text>
              <Text style={styles.sideName}>
                {dapaint.dapaint_type === '1v1'
                  ? dapaint.foe_display_name || 'Waiting...'
                  : 'Multiple'}
              </Text>
            </View>
          </View>
        </View>

        {/* Team roster */}
        {dapaint.dapaint_type === 'team' && teamInfo && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Teams</Text>

            <View style={styles.teamBlock}>
              <Text style={styles.teamTitle}>
                Host Team ({teamInfo.hostTeam.length})
              </Text>
              {teamInfo.hostTeam.map((m: any) => (
                <Text key={m.id} style={styles.teamMember}>
                  • {m.user?.display_name || 'Member'}
                </Text>
              ))}
            </View>

            <View style={styles.teamBlock}>
              <Text style={styles.teamTitle}>
                Foe Team ({teamInfo.foeTeam.length})
              </Text>
              {teamInfo.foeTeam.map((m: any) => (
                <Text key={m.id} style={styles.teamMember}>
                  • {m.user?.display_name || 'Member'}
                </Text>
              ))}
            </View>

            {!teamInfo.isEven && (
              <Text style={styles.warnText}>Teams are uneven</Text>
            )}
          </View>
        )}

        {/* Details */}
        <View style={styles.card}>
          {/* Title */}
          <Text style={styles.title}>{dapaint.dapaint}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📍 Location</Text>
            <Text style={styles.detailValue}>
              {dapaint.location}, {dapaint.city}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⏰ Starts</Text>
            <Text style={styles.detailValue}>{startsAt.toLocaleString()}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⏳ Countdown</Text>
            <Text style={styles.detailValue}>
              {hasStarted
                ? (() => {
                    // Calculate time remaining for submissions (24 hours after start)
                    const startTime = new Date(dapaint.starts_at).getTime();
                    const submissionDeadline = startTime + 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                    const timeLeftMs = submissionDeadline - now.getTime();

                    if (timeLeftMs <= 0) {
                      return 'Submission deadline passed';
                    }

                    const totalHours = timeLeftMs / (1000 * 60 * 60);
                    const days = Math.floor(totalHours / 24);
                    const hours = Math.floor(totalHours % 24);
                    const minutes = Math.floor((totalHours * 60) % 60);

                    if (days > 0) {
                      return `${days}d ${hours}h left to submit`;
                    } else if (totalHours >= 1) {
                      return `${hours}h ${minutes}m left to submit`;
                    } else {
                      return `${Math.floor(totalHours * 60)}m left to submit`;
                    }
                  })()
                : (() => {
                    const totalHours = Math.max(0, hoursUntilStart);
                    const days = Math.floor(totalHours / 24);
                    const hours = Math.floor(totalHours % 24);
                    const minutes = Math.floor((totalHours * 60) % 60);

                    if (days > 0) {
                      return `${days}d ${hours}h left`;
                    } else if (totalHours >= 1) {
                      return `${hours}h ${minutes}m left`;
                    } else {
                      return `${Math.floor(totalHours * 60)}m left`;
                    }
                  })()}
            </Text>
          </View>

          {/* Warning for host DaPaints without foes */}
          {isHost && !dapaint.foe_id && !hasStarted && (
            <View
              style={[
                styles.detailRow,
                {
                  backgroundColor: 'rgba(255, 100, 100, 0.1)',
                  padding: theme.space.sm,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <Text style={[styles.detailValue, { color: theme.colors.error }]}>
                ⚠️ Heads up: you have {Math.max(0, Math.floor(hoursUntilStart))}{' '}
                hours to find a foe before this DaPaint is deleted
                automatically.
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🏅 Win by</Text>
            <Text style={styles.detailValue}>
              {dapaint.how_winner_is_determined}
            </Text>
          </View>

          {!!dapaint.rules_of_dapaint && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📜 Rules</Text>
              <Text style={styles.detailValue}>{dapaint.rules_of_dapaint}</Text>
            </View>
          )}
        </View>

        {/* Results */}
        {hasStarted && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Results</Text>

            {mySubmission ? (
              <View style={styles.submittedBox}>
                <Text style={styles.submittedText}>
                  You submitted: {mySubmission.claimed_won ? 'I WON' : 'I LOST'}
                </Text>
                {mySubmission.proof_url ? (
                  <Pressable onPress={() => openUrl(mySubmission.proof_url!)}>
                    <Text style={styles.linkText}>View my proof</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={styles.submitBox}>
                <Text style={styles.submitLabel}>Submit your result</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Proof link (Instagram, TikTok, YouTube, etc.)"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={proofUrl}
                  onChangeText={setProofUrl}
                  autoCapitalize="none"
                />
                <Text style={styles.helperText}>
                  🔗 Please provide proof of your result (required)
                </Text>

                <View style={styles.resultRow}>
                  <Pressable
                    style={[
                      styles.resultBtn,
                      { backgroundColor: theme.colors.success },
                      loading && styles.btnDisabled,
                    ]}
                    onPress={() => handleSubmitResult(true)}
                    disabled={loading}
                  >
                    <Text style={styles.resultBtnText}>🏆 I WON</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.resultBtn,
                      { backgroundColor: theme.colors.error },
                      loading && styles.btnDisabled,
                    ]}
                    onPress={() => handleSubmitResult(false)}
                    disabled={loading}
                  >
                    <Text style={styles.resultBtnText}>😞 I LOST</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {submissions.length > 0 && (
              <View style={{ marginTop: theme.space.md }}>
                <Text style={styles.subTitle}>Other submissions</Text>
                {submissions.map(sub => (
                  <View key={sub.user_id} style={styles.otherSub}>
                    <Text style={styles.otherName}>{sub.display_name}</Text>
                    <Text style={styles.otherClaim}>
                      {sub.claimed_won ? 'Claimed win' : 'Claimed loss'}
                    </Text>
                    {sub.proof_url ? (
                      <Pressable onPress={() => openUrl(sub.proof_url!)}>
                        <Text style={styles.linkText}>View proof</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* spacer for bottom bar */}
      </ScrollView>

      {/* Bottom action bar */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom:
              (Platform.OS === 'ios' ? theme.space.xxl : theme.space.md) +
              insets.bottom,
            bottom: Platform.OS === 'web' ? 80 : 20 + insets.bottom,
            backgroundColor: 'transparent',
          },
        ]}
      >
        <View style={styles.bottomInner}>
          {dapaint.dapaint_type === 'team' && !hasStarted && !isHost && (
            <Pressable
              style={[styles.pillBtn, styles.pillBtnAlt]}
              onPress={handleSwitchTeam}
              disabled={loading}
            >
              <Text style={styles.pillTextAlt}>⇄ Switch Team</Text>
            </Pressable>
          )}

          {isHost && (
            <Pressable
              style={[styles.pillBtn, styles.pillBtnAlt]}
              onPress={handleEdit}
            >
              <Text style={styles.pillTextAlt}>✏️ Edit</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.pillBtn, styles.pillBtnAlt]}
            onPress={() => setShowChatModal(true)}
          >
            <Text style={styles.pillTextAlt}>💬 Chat ({messages.length})</Text>
          </Pressable>

          <Pressable
            style={[styles.pillBtn, { backgroundColor: leaveButtonInfo.bg }]}
            onPress={handleLeave}
          >
            <Text style={styles.pillText}>{leaveButtonInfo.text}</Text>
          </Pressable>
        </View>
      </View>
      <EditDaPaintModal
        visible={showEditModal}
        dapaint={dapaint}
        onClose={() => setShowEditModal(false)}
        onSuccess={loadData}
      />

      <ChatModal
        visible={showChatModal}
        messages={messages}
        userId={userId}
        onClose={() => setShowChatModal(false)}
        onSendMessage={async message => {
          try {
            const { error } = await supabase.from('dapaint_chat').insert({
              dapaint_id: dapaint.id,
              user_id: userId,
              message: message.trim(),
            });
            if (error) throw error;
          } catch {
            Alert.alert('Error', 'Failed to send message');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    borderTopColor: 'transparent',
    borderTopWidth: 0,
    bottom: 20,
    left: theme.space.md,
    overflow: 'hidden',
    paddingHorizontal: theme.space.xs,
    paddingTop: theme.space.xs,
    position: 'absolute',
    right: theme.space.md,
    zIndex: 10,
  },
  bottomInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    marginBottom: theme.space.md,
    padding: theme.space.lg,
    ...theme.shadow.small,
  },

  detailLabel: {
    ...theme.type.labelSmall,
    color: theme.colors.textTertiary,
    marginBottom: theme.space.xxxs,
  },

  detailRow: { marginBottom: theme.space.sm },

  detailValue: { ...theme.type.bodyLarge, color: theme.colors.textPrimary },
  helperText: {
    ...theme.type.bodySmall,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: theme.space.sm,
  },
  input: {
    backgroundColor: theme.colors.surfaceStrong,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    ...theme.type.bodyLarge,
    marginBottom: theme.space.xs,
  },
  linkText: {
    ...theme.type.labelSmall,
    color: theme.colors.like,
    marginTop: theme.space.xs,
    textDecorationLine: 'underline',
  },
  matchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  otherClaim: {
    ...theme.type.bodyMedium,
    color: theme.colors.textSecondary,
    marginTop: theme.space.xxxs,
  },
  otherName: { ...theme.type.labelMedium, color: theme.colors.textPrimary },
  otherSub: {
    backgroundColor: theme.colors.surfaceStrong,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.space.xs,
    padding: theme.space.sm,
  },
  pillBtn: {
    backgroundColor: theme.colors.primaryDeep,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
  },

  pillBtnAlt: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  pillText: { ...theme.type.labelMedium, color: '#ffffff' },
  pillTextAlt: { ...theme.type.labelMedium, color: theme.colors.textPrimary },

  resultBtn: {
    alignItems: 'center',
    borderRadius: theme.radius.md,
    flex: 1,
    paddingVertical: theme.space.sm,
  },
  resultBtnText: { ...theme.type.labelMedium, color: '#ffffff' },

  resultRow: { flexDirection: 'row', gap: theme.space.sm },
  screen: { backgroundColor: 'transparent', flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.space.lg,
  },
  sectionTitle: {
    ...theme.type.displaySmall,
    color: theme.colors.textPrimary,
    marginBottom: theme.space.sm,
  },
  side: { alignItems: 'center', flex: 1 },
  sideLabel: {
    ...theme.type.labelSmall,
    color: theme.colors.textTertiary,
    marginBottom: theme.space.xxxs,
  },
  sideName: {
    ...theme.type.labelLarge,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },

  subTitle: {
    ...theme.type.labelLarge,
    color: theme.colors.textSecondary,
    marginBottom: theme.space.sm,
  },
  submitBox: {},
  submitLabel: {
    ...theme.type.labelLarge,
    color: theme.colors.textPrimary,
    marginBottom: theme.space.xs,
  },
  submittedBox: {
    backgroundColor: 'rgba(46,196,255,0.12)',
    borderColor: 'rgba(46,196,255,0.22)',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.space.md,
  },
  submittedText: {
    ...theme.type.labelMedium,
    color: theme.colors.textPrimary,
    marginBottom: theme.space.xs,
  },

  teamBlock: { marginBottom: theme.space.md },
  teamMember: {
    ...theme.type.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.space.xxxs,
  },
  teamTitle: {
    ...theme.type.labelLarge,
    color: theme.colors.textPrimary,
    marginBottom: theme.space.xs,
  },
  title: {
    ...theme.type.displayLarge,
    color: theme.colors.textPrimary,
  },
  vs: {
    ...theme.type.labelLarge,
    color: theme.colors.textTertiary,
    marginHorizontal: theme.space.sm,
  },
  warnText: {
    ...theme.type.labelMedium,
    color: theme.colors.warning,
    textAlign: 'center',
  },
});
