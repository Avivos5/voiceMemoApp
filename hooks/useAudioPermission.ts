import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';

export const useAudioPermission = () => {
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);

  useEffect(() => {
    getPermission();
  }, []);

  async function getPermission() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      console.log('Permission Granted: ' + permission.granted);
      setAudioPermission(permission.granted);
    } catch (error) {
      console.log(error);
    }
  }

  return audioPermission;
};
