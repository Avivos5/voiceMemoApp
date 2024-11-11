import React from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Recording } from '../types/recording';
import { RecordingItem } from './RecordingItem';
import styles from '@/styles/common';

interface RecordingsListProps {
  recordings: Recording[];
  isLoading: boolean;
  onPlayRecording: (index: number) => void;
  onPausePlayback: (index: number) => void;
  onResumePlayback: (index: number) => void;
  onDeleteRecording: (index: number) => void;
  onRenameRecording: (index: number) => void;
}

export const RecordingsList: React.FC<RecordingsListProps> = ({
  recordings,
  isLoading,
  onPlayRecording,
  onPausePlayback,
  onResumePlayback,
  onDeleteRecording,
  onRenameRecording,
}) => {
  if (isLoading) {
    return (
      <ThemedView>
        <ActivityIndicator size="large" color="#0000ff" />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      {recordings.map((recording, index) => (
        <RecordingItem
          key={recording.uri}
          recording={recording}
          onPlay={() => onPlayRecording(index)}
          onPause={() => onPausePlayback(index)}
          onResume={() => onResumePlayback(index)}
          onDelete={() => onDeleteRecording(index)}
          onRename={() => onRenameRecording(index)}
        />
      ))}
    </ScrollView>
  );
};
