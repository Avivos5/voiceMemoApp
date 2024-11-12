import React from 'react';
import { TouchableOpacity, Text, useColorScheme } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import styles from '@/styles/common';

interface RecordButtonProps {
  recordingStatus: string;
  onPress: () => void;
}

export const RecordButton = ({
  recordingStatus,
  onPress,
}: RecordButtonProps) => {
  const colorScheme = useColorScheme();

  return (
    <ThemedView
      style={[
        styles.recordButtonContainer,
        {
          shadowColor:
            colorScheme === 'dark' ? Colors.dark.text : Colors.light.text,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.recordButton,
          recordingStatus === 'recording' && styles.recordingActive,
        ]}
        onPress={onPress}
      >
        <FontAwesome
          name={recordingStatus === 'recording' ? 'stop-circle' : 'circle'}
          size={64}
          color={
            colorScheme === 'dark'
              ? Colors.dark.background
              : Colors.light.background
          }
        />
      </TouchableOpacity>
      <Text style={styles.recordingStatusText}>
        {recordingStatus === 'recording' ? 'Recording...' : 'Tap to Record'}
      </Text>
    </ThemedView>
  );
};
