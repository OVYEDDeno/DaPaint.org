import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

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
    alignItems: 'center',
    backgroundColor: '#6200ee',
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 80,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  disabledTitle: {
    color: '#666666',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderColor: '#6200ee',
    borderWidth: 2,
  },
  outlineTitle: {
    color: '#6200ee',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
