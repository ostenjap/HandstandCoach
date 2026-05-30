import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { usePoseCoach } from '../coaching/usePoseCoach';

export default function CoachScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const { feedback, modelReady, frameProcessor } = usePoseCoach();

  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.text}>Camera permission is required to coach your handstands.</Text>
        <TouchableOpacity style={styles.startButton} onPress={requestPermission}>
          <Text style={styles.startButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00D1FF" />
        <Text style={styles.text}>Looking for a camera…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title}>Handstand Coach</Text>
          {!modelReady && <Text style={styles.text}>Loading pose model…</Text>}
        </View>

        {feedback && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackMessage}>{feedback.message}</Text>
            {feedback.isInverted && (
              <Text style={styles.feedbackScore}>
                Alignment: {Math.round(feedback.alignmentScore * 100)}%
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 30,
  },
  text: { color: 'white', marginTop: 12, fontSize: 16, textAlign: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 30,
    paddingBottom: 50,
    zIndex: 10,
  },
  header: { alignItems: 'center', marginTop: 40 },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  feedbackCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  feedbackMessage: { color: 'white', fontSize: 20, fontWeight: '600', textAlign: 'center' },
  feedbackScore: { color: '#00D1FF', fontSize: 16, marginTop: 8, fontWeight: 'bold' },
  startButton: {
    backgroundColor: '#00D1FF',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  startButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
