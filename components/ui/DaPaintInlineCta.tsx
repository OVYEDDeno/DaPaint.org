import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface DaPaintInlineCtaProps {
  value: string;
  onChangeText: (text: string) => void;
  prefix?: string;
  placeholder?: string;
  editable?: boolean;
  ctaTitle: string;
  ctaSubtitle?: string;
  onPressCta: () => void;
  ctaDisabled?: boolean;
  loading?: boolean;
  borderColor?: string;
}

export const DaPaintInlineCta: React.FC<DaPaintInlineCtaProps> = ({
  value,
  onChangeText,
  prefix,
  placeholder,
  editable = true,
  ctaTitle,
  ctaSubtitle,
  onPressCta,
  ctaDisabled = false,
  loading = false,
  borderColor = '#e0e0e0',
}) => {
  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, { borderColor }]}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          editable={editable && !loading}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.ctaButton, ctaDisabled && styles.ctaDisabled]}
          onPress={onPressCta}
          disabled={ctaDisabled || loading}
        >
          <Text style={styles.ctaTitle}>
            {loading ? 'Checking...' : ctaTitle}
          </Text>
          {ctaSubtitle ? (
            <Text style={styles.ctaSubtitle}>{ctaSubtitle}</Text>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ctaButton: {
    alignItems: 'center',
    backgroundColor: '#6200ee',
    borderRadius: 12,
    margin: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaSubtitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '400',
  },
  ctaTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    color: '#333',
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 48,
  },
  prefix: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 12,
  },
});
