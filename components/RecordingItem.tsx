import React from 'react';
import { TouchableOpacity, View, useColorScheme } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Recording } from '../types/recording';
import { formatDate } from '../utils/formatters';
import styles from '@/styles/common';

interface RecordingItemProps {
  recording: Recording;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onRename: () => void;
}

export const RecordingItem: React.FC<RecordingItemProps> = ({
  recording,
  onPlay,
  onPause,
  onResume,
  onDelete,
  onRename,
}) => {
  const colorScheme = useColorScheme();

  return (
    <ThemedView style={styles.recordingItem} colorName="backgroundSecondary">
      <ThemedView style={styles.recordingInfo} colorName="backgroundSecondary">
        <TouchableOpacity onPress={onRename}>
          <ThemedText type="title" style={styles.recordingName}>
            {recording.showName}
          </ThemedText>
        </TouchableOpacity>
        <View style={styles.recordingMetadata}>
          <ThemedText type="default" style={styles.recordingMetadataItem}>
            {formatDate(recording.date)}
          </ThemedText>
          <ThemedText type="default" style={styles.recordingMetadataItem}>
            {recording.duration}
          </ThemedText>
        </View>
      </ThemedView>
      <ThemedView
        style={styles.recordingControls}
        colorName="backgroundSecondary"
      >
        <TouchableOpacity
          onPress={() => {
            if (recording.isPlaying) {
              onPause();
            } else if (recording.isPaused) {
              onResume();
            } else {
              onPlay();
            }
          }}
          style={styles.playButton}
        >
          <FontAwesome
            name={recording.isPlaying ? 'pause' : 'play'}
            size={24}
            color={
              colorScheme === 'dark'
                ? Colors.dark.backgroundSecondary
                : Colors.light.backgroundSecondary
            }
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <FontAwesome
            name="trash"
            size={24}
            color={
              colorScheme === 'dark'
                ? Colors.dark.backgroundSecondary
                : Colors.light.backgroundSecondary
            }
          />
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
};
