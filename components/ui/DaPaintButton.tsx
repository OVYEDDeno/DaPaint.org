import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface DaPaintButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export const DaPaintButton: React.FC<DaPaintButtonProps> = ({
  title,
  onPress,
  disabled = false,
  variant = 'solid',
  style,
  titleStyle,
}) => {
  const buttonStyle = [
    styles.button,
    variant === 'outline' && styles.outlineButton,
    disabled && styles.disabledButton,
    style,
  ];

  const textStyle = [
    styles.title,
    variant === 'outline' && styles.outlineTitle,
    disabled && styles.disabledTitle,
    titleStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineTitle: {
    color: '#6200ee',
  },
  disabledTitle: {
    color: '#666666',
  },
});