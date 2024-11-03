import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { FontAwesome } from '@expo/vector-icons';

export default function App() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);

  useEffect(() => {
    // Simply get recording permission upon first render
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

    // Call function to get permission
    getPermission();
    // Cleanup upon first render
    return () => {
      if (recording) {
        stopRecording();
      }
    };
  }, []);

  async function startRecording() {
    try {
      // needed for IoS
      if (audioPermission) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }

      const newRecording = new Audio.Recording();
      console.log('Starting Recording');
      await newRecording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
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
        let recordingUri: string | null = null;
        if (recording) {
          await recording.stopAndUnloadAsync();
          recordingUri = recording.getURI();
        }

        // Create a file name for the recording
        const fileName = `recording-${Date.now()}.caf`;

        // Move the recording to the new directory with the new file name
        await FileSystem.makeDirectoryAsync(
          FileSystem.documentDirectory + 'recordings/',
          { intermediates: true }
        );
        if (recordingUri) {
          await FileSystem.moveAsync({
            from: recordingUri,
            to: FileSystem.documentDirectory + 'recordings/' + `${fileName}`,
          });
        } else {
          throw new Error('Recording URI is null');
        }

        // This is for simply playing the sound back
        const playbackObject = new Audio.Sound();
        await playbackObject.loadAsync({
          uri: FileSystem.documentDirectory + 'recordings/' + `${fileName}`,
        });
        await playbackObject.playAsync();

        // resert our states to record again
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
      const savedUri = recording?.getURI();
      if (savedUri) {
        console.log('Saved audio file to', savedUri);
      }
    } else {
      await startRecording();
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleRecordButtonPress}>
        <FontAwesome
          name={recording ? 'stop-circle' : 'circle'}
          size={64}
          color="white"
        />
      </TouchableOpacity>
      <Text
        style={styles.recordingStatusText}
      >{`Recording status: ${recordingStatus}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'red',
  },
  recordingStatusText: {
    marginTop: 16,
  },
});
