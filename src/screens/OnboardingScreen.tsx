import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';
import { saveUserProfile, DEFAULT_PROFILE, UserProfile } from '../coaching/userStore';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: (profile: UserProfile) => void;
}

// Custom touchable that scales down slightly on press for a premium feel
const TouchableScale: React.FC<{
  onPress: () => void;
  selected: boolean;
  children: React.ReactNode;
}> = ({ onPress, selected, children }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.card,
          selected ? styles.cardSelected : styles.cardUnselected,
          { transform: [{ scale: scaleValue }] },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [level, setLevel] = useState<'beginner' | 'wall' | 'freestanding' | null>(null);
  const [struggle, setStruggle] = useState<'fear' | 'shoulders' | 'balance' | null>(null);

  const handleSkip = async () => {
    const finalProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      hasCompletedOnboarding: true,
      recommendedStepId: 1, // Default to Step 1
    };
    await saveUserProfile(finalProfile);
    onComplete(finalProfile);
  };

  const handleMapPath = async () => {
    if (!level || !struggle) return;

    // Recommendation logic:
    // Total beginner -> Step 1 (Wall Pike)
    // Against wall + Weak shoulders -> Step 2 (Stomach-to-Wall)
    // Against wall + Fear of falling -> Step 3 (Back-to-Wall Kick-Up)
    // Against wall + Balance struggle -> Step 4 (Wall Taps / Heel Taps)
    // Freestanding briefly -> Step 5 (Bail & Catch)
    let recommendedStepId = 1;

    if (level === 'beginner') {
      recommendedStepId = 1;
    } else if (level === 'wall') {
      if (struggle === 'shoulders') recommendedStepId = 2;
      else if (struggle === 'fear') recommendedStepId = 3;
      else recommendedStepId = 4;
    } else if (level === 'freestanding') {
      recommendedStepId = 5;
    }

    const finalProfile: UserProfile = {
      hasCompletedOnboarding: true,
      startingLevel: level,
      biggestStruggle: struggle,
      recommendedStepId,
      completedSteps: [],
      personalRecords: { ...DEFAULT_PROFILE.personalRecords },
    };

    await saveUserProfile(finalProfile);
    onComplete(finalProfile);
  };

  const canSubmit = level !== null && struggle !== null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header Skip */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introContainer}>
          <Text style={styles.brandTitle}>GRAVITY</Text>
          <Text style={styles.mainTitle}>Let's calibrate your gravity.</Text>
          <Text style={styles.subtitle}>
            A minimalist handstand coach engineered for zero clutter and absolute form.
          </Text>
        </View>

        {/* Question 1 */}
        <View style={styles.questionSection}>
          <Text style={styles.questionNumber}>01</Text>
          <Text style={styles.questionTitle}>Where are you starting?</Text>
          
          <TouchableScale
            onPress={() => setLevel('beginner')}
            selected={level === 'beginner'}
          >
            <Text style={[styles.cardTitle, level === 'beginner' && styles.textSelected]}>
              Total Beginner
            </Text>
            <Text style={[styles.cardDesc, level === 'beginner' && styles.textDescSelected]}>
              I cannot hold a handstand against the wall yet.
            </Text>
          </TouchableScale>

          <TouchableScale
            onPress={() => setLevel('wall')}
            selected={level === 'wall'}
          >
            <Text style={[styles.cardTitle, level === 'wall' && styles.textSelected]}>
              Wall Support
            </Text>
            <Text style={[styles.cardDesc, level === 'wall' && styles.textDescSelected]}>
              I can hold a handstand against the wall, but not freestanding.
            </Text>
          </TouchableScale>

          <TouchableScale
            onPress={() => setLevel('freestanding')}
            selected={level === 'freestanding'}
          >
            <Text style={[styles.cardTitle, level === 'freestanding' && styles.textSelected]}>
              Freestanding
            </Text>
            <Text style={[styles.cardDesc, level === 'freestanding' && styles.textDescSelected]}>
              I can hold freestanding for a few seconds.
            </Text>
          </TouchableScale>
        </View>

        {/* Question 2 */}
        <View style={styles.questionSection}>
          <Text style={styles.questionNumber}>02</Text>
          <Text style={styles.questionTitle}>What is your biggest struggle?</Text>

          <TouchableScale
            onPress={() => setStruggle('fear')}
            selected={struggle === 'fear'}
          >
            <Text style={[styles.cardTitle, struggle === 'fear' && styles.textSelected]}>
              Fear of Falling
            </Text>
            <Text style={[styles.cardDesc, struggle === 'fear' && styles.textDescSelected]}>
              I feel anxious kicking up or exiting the handstand.
            </Text>
          </TouchableScale>

          <TouchableScale
            onPress={() => setStruggle('shoulders')}
            selected={struggle === 'shoulders'}
          >
            <Text style={[styles.cardTitle, struggle === 'shoulders' && styles.textSelected]}>
              Shoulder Endurance
            </Text>
            <Text style={[styles.cardDesc, struggle === 'shoulders' && styles.textDescSelected]}>
              My shoulders collapse, lock out is weak, or back arches badly.
            </Text>
          </TouchableScale>

          <TouchableScale
            onPress={() => setStruggle('balance')}
            selected={struggle === 'balance'}
          >
            <Text style={[styles.cardTitle, struggle === 'balance' && styles.textSelected]}>
              Finding the Balance
            </Text>
            <Text style={[styles.cardDesc, struggle === 'balance' && styles.textDescSelected]}>
              I wobble immediately and cannot stay stacked.
            </Text>
          </TouchableScale>
        </View>

        {/* Action Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleMapPath}
            disabled={!canSubmit}
          >
            <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
              MAP MY PATH
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  introContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  brandTitle: {
    color: '#888888',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 8,
    fontFamily: 'Helvetica',
    marginBottom: 12,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'Helvetica',
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    color: '#888888',
    fontSize: 15,
    fontFamily: 'Helvetica',
    lineHeight: 22,
  },
  questionSection: {
    marginBottom: 48,
  },
  questionNumber: {
    color: '#444444',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
    marginBottom: 8,
  },
  questionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Helvetica',
    marginBottom: 20,
  },
  card: {
    borderRadius: 0, // Zen sharp edges
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  cardUnselected: {
    backgroundColor: '#000000',
    borderColor: '#222222',
  },
  cardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    marginBottom: 6,
  },
  cardDesc: {
    color: '#888888',
    fontSize: 13,
    fontFamily: 'Helvetica',
    lineHeight: 18,
  },
  textSelected: {
    color: '#000000',
  },
  textDescSelected: {
    color: '#444444',
  },
  footerContainer: {
    marginTop: 10,
    alignItems: 'stretch',
  },
  submitButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 0, // Zen sharp edges
  },
  submitButtonDisabled: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#222222',
  },
  submitText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 3,
  },
  submitTextDisabled: {
    color: '#444444',
  },
});
