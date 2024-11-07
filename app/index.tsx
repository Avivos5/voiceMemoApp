import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { FontAwesome } from '@expo/vector-icons';
import { RecordingOptionsPresets } from 'expo-av/build/Audio';

interface Recording {
  uri: string;
  filename: string;
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

        const fileName = `recording-${Date.now()}.m4a`;

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
    <View style={styles.container}>
      {/* Recordings List */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Saved Recordings</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <ScrollView style={styles.scrollView}>
            {savedRecordings.map((recording, index) => (
              <View key={recording.uri} style={styles.recordingItem}>
                <View style={styles.recordingInfo}>
                  <Text style={styles.recordingDate}>
                    {formatDate(recording.date)}
                  </Text>
                  <Text style={styles.recordingName}>{recording.filename}</Text>
                </View>
                <View style={styles.recordingControls}>
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
                      color="white"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteRecording(index)}
                    style={styles.deleteButton}
                  >
                    <FontAwesome name="trash" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recording Button */}
      <View style={styles.recordButtonContainer}>
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
            color="white"
          />
        </TouchableOpacity>
        <Text style={styles.recordingStatusText}>
          {recordingStatus === 'recording' ? 'Recording...' : 'Tap to Record'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
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
    flex: 1,
  },
  recordingItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
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
    fontSize: 14,
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
  deleteButton: {
    backgroundColor: '#FF5252',
    padding: 10,
    borderRadius: 25,
  },
  recordButtonContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
