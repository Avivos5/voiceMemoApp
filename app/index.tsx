import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Alert,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { FontAwesome } from '@expo/vector-icons';
import { RecordingOptionsPresets } from 'expo-av/build/Audio';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

interface Recording {
  uri: string;
  filename: string;
  showName: string;
  date: Date;
  duration?: number;
  isPlaying: boolean;
  isPaused: boolean;
  sound?: Audio.Sound;
}

export default function App() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  const [savedRecordings, setSavedRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    getPermission();
    loadSavedRecordings();

    return () => {
      // Cleanup function
      if (recording) {
        stopRecording();
      }
      // Stop all playing sounds
      savedRecordings.forEach(async (rec) => {
        if (rec.sound) {
          await rec.sound.unloadAsync();
        }
      });
    };
  }, []);

  async function getPermission() {
    await Audio.requestPermissionsAsync()
      .then((permission) => {
        console.log('Permission Granted: ' + permission.granted);
        setAudioPermission(permission.granted);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  async function loadSavedRecordings() {
    try {
      setIsLoading(true);
      const recordingsDir = FileSystem.documentDirectory + 'recordings/';

      // Create directory if it doesn't exist
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
          return {
            filename,
            showName: filename.split('_')[0],
            uri: fileInfo.uri,
            date: fileInfo.exists
              ? new Date(fileInfo.modificationTime! * 1000)
              : new Date(),
            isPlaying: false,
            isPaused: false,
          };
        })
      );

      // Sort by date, newest first
      recordings.sort((a, b) => b.date.getTime() - a.date.getTime());
      setSavedRecordings(recordings);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function renameRecording(index: number) {
    const recording = savedRecordings[index];

    // Prompt for new name
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
            // Rename file in filesystem
            await FileSystem.moveAsync({
              from: recording.uri,
              to: newUri,
            });

            // Update state to reflect the renamed file
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
  }

  async function startRecording() {
    try {
      if (audioPermission) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }

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
  }

  async function stopRecording() {
    try {
      if (recordingStatus === 'recording') {
        console.log('Stopping Recording');
        await recording?.stopAndUnloadAsync();
        const recordingUri = recording?.getURI();

        const timeElapsed = Date.now();
        const today = new Date(timeElapsed).toISOString();

        const fileName = `New Recording_${today}.m4a`;

        await FileSystem.makeDirectoryAsync(
          FileSystem.documentDirectory + 'recordings/',
          { intermediates: true }
        );

        if (recordingUri) {
          await FileSystem.moveAsync({
            from: recordingUri,
            to: FileSystem.documentDirectory + 'recordings/' + fileName,
          });

          // Reload recordings list
          await loadSavedRecordings();
        }

        setRecording(null);
        setRecordingStatus('stopped');
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  }

  async function handleRecordButtonPress() {
    if (recording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }

  async function playRecording(recordingIndex: number) {
    try {
      const recordingToPlay = savedRecordings[recordingIndex];

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

      // Update playing state
      const updatedRecordings = [...savedRecordings];
      updatedRecordings[recordingIndex].isPlaying = true;
      updatedRecordings[recordingIndex].isPaused = false;
      setSavedRecordings(updatedRecordings);

      // Play the sound
      await recordingToPlay.sound.playAsync();

      // When playback finishes
      recordingToPlay.sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            const finalRecordings = [...savedRecordings];
            finalRecordings[recordingIndex].isPlaying = false;
            finalRecordings[recordingIndex].isPaused = false;
            // Reset the playback position to 0 when the recording finishes
            await finalRecordings[recordingIndex].sound?.setPositionAsync(0);
            setSavedRecordings(finalRecordings);
          }
        }
      });
    } catch (error) {
      console.error('Failed to play recording:', error);
    }
  }

  async function pausePlayback(recordingIndex: number) {
    try {
      const recordingToPlay = savedRecordings[recordingIndex];
      if (recordingToPlay.sound && recordingToPlay.isPlaying) {
        await recordingToPlay.sound.pauseAsync();
        const updatedRecordings = [...savedRecordings];
        updatedRecordings[recordingIndex].isPlaying = false;
        updatedRecordings[recordingIndex].isPaused = true;
        setSavedRecordings(updatedRecordings);
      }
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  }

  async function resumePlayback(recordingIndex: number) {
    try {
      const recordingToPlay = savedRecordings[recordingIndex];
      if (recordingToPlay.sound && recordingToPlay.isPaused) {
        await recordingToPlay.sound.playAsync();
        const updatedRecordings = [...savedRecordings];
        updatedRecordings[recordingIndex].isPlaying = true;
        updatedRecordings[recordingIndex].isPaused = false;
        setSavedRecordings(updatedRecordings);
      }
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  }

  async function deleteRecording(index: number) {
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
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={colorScheme == 'dark' ? 'light' : 'dark'} />
      <ThemedView style={styles.topBar}>
        <ThemedText type="title">Saved Recordings</ThemedText>
      </ThemedView>
      {/* Recordings List */}
      <ThemedView style={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <ScrollView style={styles.scrollView}>
            {savedRecordings.map((recording, index) => (
              <ThemedView
                key={recording.uri}
                style={styles.recordingItem}
                colorName="backgroundSecondary"
              >
                <ThemedView
                  style={styles.recordingInfo}
                  colorName="backgroundSecondary"
                >
                  <TouchableOpacity onPress={() => renameRecording(index)}>
                    <ThemedText type="title" style={styles.recordingName}>
                      {recording.showName}
                    </ThemedText>
                  </TouchableOpacity>
                  <ThemedText type="default" style={styles.recordingDate}>
                    {formatDate(recording.date)}
                  </ThemedText>
                </ThemedView>
                <ThemedView
                  style={styles.recordingControls}
                  colorName="backgroundSecondary"
                >
                  <TouchableOpacity
                    onPress={() => {
                      if (recording.isPlaying) {
                        pausePlayback(index);
                      } else if (recording.isPaused) {
                        resumePlayback(index);
                      } else {
                        playRecording(index);
                      }
                    }}
                    style={styles.playButton}
                  >
                    <FontAwesome
                      name={
                        recording.isPlaying
                          ? 'pause'
                          : recording.isPaused
                          ? 'play'
                          : 'play'
                      }
                      size={24}
                      color={
                        colorScheme === 'dark'
                          ? Colors.dark.backgroundSecondary
                          : Colors.light.backgroundSecondary
                      }
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteRecording(index)}
                    style={styles.deleteButton}
                  >
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
            ))}
          </ScrollView>
        )}
      </ThemedView>

      {/* Recording Button */}
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
          onPress={handleRecordButtonPress}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  containerLight: {
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listTitleLight: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  listTitleDark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },

  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  scrollView: {
    marginTop: 5,
    flex: 1,
  },
  recordingItem: {
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingDate: {
    fontSize: 12,
    color: '#666',
  },
  recordingName: {
    fontSize: 20,
    marginTop: 4,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 25,
    marginRight: 10,
  },
  renameButton: {
    backgroundColor: '#FFC107',
    padding: 10,
    borderRadius: 25,
    marginRight: 10,
  },
  deleteButton: {
    backgroundColor: '#FF5252',
    padding: 10,
    borderRadius: 25,
  },
  recordButtonContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.6,
  },
  recordButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#FF4081',
    marginBottom: 10,
  },
  recordingActive: {
    backgroundColor: '#FF1744',
  },
  recordingStatusText: {
    fontSize: 16,
    color: '#666',
  },
});
