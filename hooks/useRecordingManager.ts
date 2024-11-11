import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Recording } from '../types/recording';
import { RecordingOptionsPresets } from 'expo-av/build/Audio';
import { formatDuration } from '../utils/formatters';

export const useRecordingManager = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [savedRecordings, setSavedRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSavedRecordings();
    return () => {
      if (recording) {
        stopRecording();
      }
      savedRecordings.forEach(async (rec) => {
        if (rec.sound) {
          await rec.sound.unloadAsync();
        }
      });
    };
  }, []);

  const loadSavedRecordings = async () => {
    try {
      setIsLoading(true);
      const recordingsDir = FileSystem.documentDirectory + 'recordings/';

      const dirInfo = await FileSystem.getInfoAsync(recordingsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(recordingsDir, {
          intermediates: true,
        });
        setIsLoading(false);
        return;
      }

      const files = await FileSystem.readDirectoryAsync(recordingsDir);
      const recordings: Recording[] = await Promise.all(
        files.map(async (filename) => {
          const fileInfo = await FileSystem.getInfoAsync(
            recordingsDir + filename
          );
          const { sound } = await Audio.Sound.createAsync({
            uri: fileInfo.uri,
          });
          const status = await sound.getStatusAsync();
          const durationInSeconds =
            status.isLoaded && status.durationMillis
              ? status.durationMillis / 1000
              : 0;
          await sound.unloadAsync();

          return {
            filename,
            showName: filename.split('_')[0],
            uri: fileInfo.uri,
            date: fileInfo.exists
              ? new Date(fileInfo.modificationTime! * 1000)
              : new Date(),
            duration: formatDuration(durationInSeconds),
            isPlaying: false,
            isPaused: false,
          };
        })
      );

      recordings.sort((a, b) => b.date.getTime() - a.date.getTime());
      setSavedRecordings(recordings);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        RecordingOptionsPresets.HIGH_QUALITY
      );
      await newRecording.startAsync();
      setRecording(newRecording);
      setRecordingStatus('recording');
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingStatus === 'recording') {
        await recording?.stopAndUnloadAsync();
        const recordingUri = recording?.getURI();
        const fileName = `New Recording_${new Date().toISOString()}.m4a`;

        await FileSystem.makeDirectoryAsync(
          FileSystem.documentDirectory + 'recordings/',
          { intermediates: true }
        );

        if (recordingUri) {
          await FileSystem.moveAsync({
            from: recordingUri,
            to: FileSystem.documentDirectory + 'recordings/' + fileName,
          });
          await loadSavedRecordings();
        }

        setRecording(null);
        setRecordingStatus('stopped');
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

  return {
    recording,
    recordingStatus,
    savedRecordings,
    isLoading,
    setSavedRecordings,
    startRecording,
    stopRecording,
    loadSavedRecordings,
  };
};
