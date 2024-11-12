import React from 'react';
import { Alert, StyleSheet, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { RecordButton } from '../components/RecordButton';
import { RecordingsList } from '../components/RecordingsList';
import { useAudioPermission } from '../hooks/useAudioPermission';
import { useRecordingManager } from '../hooks/useRecordingManager';
import styles from '@/styles/common';

export const AudioRecorderScreen = () => {
  const colorScheme = useColorScheme();
  useAudioPermission();
  const {
    recording,
    recordingStatus,
    savedRecordings,
    isLoading,
    setSavedRecordings,
    startRecording,
    stopRecording,
    loadSavedRecordings,
  } = useRecordingManager();

  const handleRecordButtonPress = async () => {
    if (recording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const playRecording = async (index: number) => {
    try {
      const recordingToPlay = savedRecordings[index];

      // Stop any currently playing recording
      for (let i = 0; i < savedRecordings.length; i++) {
        if (savedRecordings[i].isPlaying && savedRecordings[i].sound) {
          await savedRecordings[i].sound?.stopAsync();
          savedRecordings[i].isPlaying = false;
          savedRecordings[i].isPaused = false;
        }
      }

      if (!recordingToPlay.sound) {
        const { sound } = await Audio.Sound.createAsync({
          uri: recordingToPlay.uri,
        });
        recordingToPlay.sound = sound;
      }

      const updatedRecordings = [...savedRecordings];
      updatedRecordings[index].isPlaying = true;
      updatedRecordings[index].isPaused = false;
      setSavedRecordings(updatedRecordings);

      await recordingToPlay.sound.playAsync();

      recordingToPlay.sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          const finalRecordings = [...savedRecordings];
          finalRecordings[index].isPlaying = false;
          finalRecordings[index].isPaused = false;
          await finalRecordings[index].sound?.setPositionAsync(0);
          setSavedRecordings(finalRecordings);
        }
      });
    } catch (error) {
      console.error('Failed to play recording:', error);
    }
  };

  const pausePlayback = async (index: number) => {
    try {
      const recordingToPlay = savedRecordings[index];
      if (recordingToPlay.sound && recordingToPlay.isPlaying) {
        await recordingToPlay.sound.pauseAsync();
        const updatedRecordings = [...savedRecordings];
        updatedRecordings[index].isPlaying = false;
        updatedRecordings[index].isPaused = true;
        setSavedRecordings(updatedRecordings);
      }
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  };

  const resumePlayback = async (index: number) => {
    try {
      const recordingToPlay = savedRecordings[index];
      if (recordingToPlay.sound && recordingToPlay.isPaused) {
        await recordingToPlay.sound.playAsync();
        const updatedRecordings = [...savedRecordings];
        updatedRecordings[index].isPlaying = true;
        updatedRecordings[index].isPaused = false;
        setSavedRecordings(updatedRecordings);
      }
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  };

  const deleteRecording = async (index: number) => {
    try {
      const recordingToDelete = savedRecordings[index];
      if (recordingToDelete.sound) {
        await recordingToDelete.sound.unloadAsync();
      }
      await FileSystem.deleteAsync(recordingToDelete.uri);
      await loadSavedRecordings();
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  };

  const renameRecording = (index: number) => {
    const recording = savedRecordings[index];

    Alert.prompt(
      'Rename Recording',
      'Enter a new name for the recording:',
      async (newName) => {
        if (newName && newName.trim()) {
          const newFileName = `${newName.trim()}_${
            recording.filename.split('_')[1]
          }`;
          const newUri = `${FileSystem.documentDirectory}recordings/${newFileName}`;

          try {
            await FileSystem.moveAsync({
              from: recording.uri,
              to: newUri,
            });

            const updatedRecordings = [...savedRecordings];
            updatedRecordings[index] = {
              ...recording,
              uri: newUri,
              filename: newFileName,
              showName: newName.trim(),
            };
            setSavedRecordings(updatedRecordings);
          } catch (error) {
            console.error('Failed to rename recording:', error);
          }
        }
      },
      'plain-text',
      recording.showName
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={colorScheme == 'dark' ? 'light' : 'dark'} />
      <ThemedView style={styles.topBar}>
        <ThemedText type="title">Saved Recordings</ThemedText>
      </ThemedView>
      <ThemedView style={styles.listContainer}>
        <RecordingsList
          recordings={savedRecordings}
          isLoading={isLoading}
          onPlayRecording={playRecording}
          onPausePlayback={pausePlayback}
          onResumePlayback={resumePlayback}
          onDeleteRecording={deleteRecording}
          onRenameRecording={renameRecording}
        />
      </ThemedView>
      <RecordButton
        recordingStatus={recordingStatus}
        onPress={handleRecordButtonPress}
      />
    </ThemedView>
  );
};
