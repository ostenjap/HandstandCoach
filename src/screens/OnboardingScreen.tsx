import React, { useState, useRef, useEffect } from 'react';
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

interface QuestionOption {
  key: string;
  title: string;
  description: string;
  emoji: string;
}

interface Question {
  id: number;
  headline: string;
  options: QuestionOption[];
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    headline: "What's your current relationship with being upside down?",
    options: [
      {
        key: 'feet',
        emoji: '🧱',
        title: 'Feet on the ground, please.',
        description: 'Total beginner, maybe some push-ups.',
      },
      {
        key: 'v_shape',
        emoji: '📐',
        title: "I can do the 'V' shape.",
        description: 'Comfortable in a downward dog / pike position.',
      },
      {
        key: 'wall',
        emoji: '🧗',
        title: "I use a wall, but I'm stuck there.",
        description: 'Can do wall walks or kick-ups, but relies on the wall.',
      },
      {
        key: 'air',
        emoji: '🦅',
        title: "I catch air, but it's sloppy.",
        description: 'Freestanding attempts, but inconsistent or bad form.',
      },
    ],
  },
  {
    id: 2,
    headline: 'What is your biggest struggle right now?',
    options: [
      {
        key: 'fear',
        emoji: '😨',
        title: 'Fear of falling over.',
        description: 'Anxiety holding you back from full inversion.',
      },
      {
        key: 'pain',
        emoji: '💥',
        title: 'Wrist or shoulder pain.',
        description: 'Discomfort when loading joints under weight.',
      },
      {
        key: 'banana',
        emoji: '🍌',
        title: "The 'Banana Back'.",
        description: 'Arched spine alignment, losing core control.',
      },
      {
        key: 'new',
        emoji: '🤷',
        title: "I have no idea, I'm brand new.",
        description: 'Just starting out and looking for the fundamentals.',
      },
    ],
  },
  {
    id: 3,
    headline: 'Where will you be practicing most often?',
    options: [
      {
        key: 'home',
        emoji: '🏠',
        title: 'Living Room / Bedroom',
        description: 'Clear wall space and soft flooring at home.',
      },
      {
        key: 'gym',
        emoji: '🏋️',
        title: 'At the Gym',
        description: 'Wall space, plyo boxes, and gym mats available.',
      },
      {
        key: 'outdoors',
        emoji: '🌳',
        title: 'Outdoors / Park',
        description: 'Open grass or concrete, no dedicated wall space.',
      },
    ],
  },
  {
    id: 4,
    headline: 'Handstands require frequency, not hours. How many days a week can you give me 5 minutes?',
    options: [
      {
        key: 'casual',
        emoji: '📅',
        title: '1-2 Days',
        description: 'Casual pace to ease into inversion habits.',
      },
      {
        key: 'consistent',
        emoji: '🔥',
        title: '3-4 Days',
        description: 'Consistent routines for fast adaptation.',
      },
      {
        key: 'obsessed',
        emoji: '🚀',
        title: 'Every Single Day',
        description: 'Obsessed and dedicated to daily alignment practice.',
      },
    ],
  },
];

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isHandoff, setIsHandoff] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState('ANALYZING...');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Determine question keys
  const getQuestionKey = (index: number) => {
    switch (index) {
      case 0: return 'level';
      case 1: return 'struggle';
      case 2: return 'environment';
      case 3: return 'commitment';
      default: return '';
    }
  };

  const currentKey = getQuestionKey(currentQuestionIndex);
  const selectedValue = answers[currentKey] || null;

  const handleSelectOption = (key: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentKey]: key,
    }));
  };

  const handleSkip = async () => {
    const finalProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      hasCompletedOnboarding: true,
      startingLevel: 'feet',
      biggestStruggle: 'new',
      practiceEnvironment: 'home',
      weeklyCommitment: 'consistent',
      recommendedStepId: 0,
    };
    await saveUserProfile(finalProfile);
    onComplete(finalProfile);
  };

  const handleNext = () => {
    if (!selectedValue) return;

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      // Fade out question, change index, fade in
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentQuestionIndex((prev) => prev + 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Start the handoff animation sequence
      startHandoffSequence();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentQuestionIndex((prev) => prev - 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const startHandoffSequence = () => {
    setIsHandoff(true);
    
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: false, // width needs to be layout-driven or animated values interpolated
    }).start();

    // Cycle messages
    setTimeout(() => {
      setHandoffMessage('BUILDING YOUR PATH...');
    }, 800);

    setTimeout(() => {
      setHandoffMessage('WE FOUND YOUR STARTING LINE.');
    }, 1600);

    setTimeout(() => {
      completeOnboarding();
    }, 2400);
  };

  const completeOnboarding = async () => {
    const level = answers.level;
    const struggle = answers.struggle;
    const environment = answers.environment;
    const commitment = answers.commitment;

    let recommendedStepId = 0;

    // Baseline Recommendation
    if (level === 'feet') {
      recommendedStepId = 1; // hollow body hold
    } else if (level === 'v_shape') {
      recommendedStepId = 2; // ground pike hold
    } else if (level === 'wall') {
      recommendedStepId = 8; // safety bail
    } else if (level === 'air') {
      recommendedStepId = 10; // the float
    }

    // Struggle Overrides
    if (struggle === 'pain') {
      recommendedStepId = 0; // enforce wrist protocol
    } else if (struggle === 'banana') {
      recommendedStepId = 1; // hollow body hold
    } else if (struggle === 'fear') {
      if (recommendedStepId > 8) {
        recommendedStepId = 8; // pull back to safety bail
      }
    }

    const finalProfile: UserProfile = {
      hasCompletedOnboarding: true,
      startingLevel: level as any,
      biggestStruggle: struggle as any,
      practiceEnvironment: environment as any,
      weeklyCommitment: commitment as any,
      recommendedStepId,
      completedSteps: [],
      personalRecords: { ...DEFAULT_PROFILE.personalRecords },
    };

    await saveUserProfile(finalProfile);
    onComplete(finalProfile);
  };

  // Render Handoff Loading Screen
  if (isHandoff) {
    return (
      <SafeAreaView style={styles.handoffContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.handoffContent}>
          <Text style={styles.handoffBrand}>GRAVITY</Text>
          
          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <Text style={styles.handoffText}>{handoffMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = QUESTIONS[currentQuestionIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header Back / Skip */}
      <View style={styles.header}>
        {currentQuestionIndex > 0 ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backText}>← BACK</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro only shown on first screen */}
        {currentQuestionIndex === 0 && (
          <View style={styles.introContainer}>
            <Text style={styles.brandTitle}>GRAVITY</Text>
            <Text style={styles.mainTitle}>Let's calibrate your gravity.</Text>
            <Text style={styles.subtitle}>
              A minimalist handstand coach engineered for zero clutter and absolute form.
            </Text>
          </View>
        )}

        <Animated.View style={[styles.questionSection, { opacity: fadeAnim }]}>
          <Text style={styles.questionNumber}>
            {String(currentQuestion.id).padStart(2, '0')} / {String(QUESTIONS.length).padStart(2, '0')}
          </Text>
          <Text style={styles.questionTitle}>{currentQuestion.headline}</Text>

          {currentQuestion.options.map((opt) => {
            const isSelected = selectedValue === opt.key;
            return (
              <TouchableScale
                key={opt.key}
                onPress={() => handleSelectOption(opt.key)}
                selected={isSelected}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardEmoji, isSelected && styles.textSelected]}>
                    {opt.emoji}
                  </Text>
                  <Text style={[styles.cardTitle, isSelected && styles.textSelected]}>
                    {opt.title}
                  </Text>
                </View>
                {opt.description ? (
                  <Text style={[styles.cardDesc, isSelected && styles.textDescSelected]}>
                    {opt.description}
                  </Text>
                ) : null}
              </TouchableScale>
            );
          })}
        </Animated.View>

        {/* Action Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[styles.submitButton, !selectedValue && styles.submitButtonDisabled]}
            onPress={handleNext}
            disabled={!selectedValue}
          >
            <Text style={[styles.submitText, !selectedValue && styles.submitTextDisabled]}>
              {currentQuestionIndex === QUESTIONS.length - 1 ? 'MAP MY PATH' : 'CONTINUE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step dots */}
        <View style={styles.dotsRow}>
          {QUESTIONS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentQuestionIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
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
    marginTop: 10,
    marginBottom: 30,
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
    marginTop: 10,
    marginBottom: 20,
  },
  questionNumber: {
    color: '#444444',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
    marginBottom: 8,
  },
  questionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Helvetica',
    lineHeight: 28,
    marginBottom: 24,
  },
  card: {
    borderRadius: 0,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardEmoji: {
    fontSize: 18,
    marginRight: 10,
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
    flex: 1,
  },
  cardDesc: {
    color: '#888888',
    fontSize: 13,
    fontFamily: 'Helvetica',
    lineHeight: 18,
    paddingLeft: 28, // Offset align with text
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
    borderRadius: 0,
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
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  dot: {
    width: 6,
    height: 6,
    marginHorizontal: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 16,
  },
  dotInactive: {
    backgroundColor: '#333333',
  },
  handoffContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  handoffContent: {
    width: '80%',
    alignItems: 'center',
  },
  handoffBrand: {
    color: '#444444',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 8,
    fontFamily: 'Helvetica',
    marginBottom: 30,
  },
  progressTrack: {
    width: '100%',
    height: 2,
    backgroundColor: '#222222',
    marginBottom: 24,
  },
  progressFill: {
    height: 2,
    backgroundColor: '#FFFFFF',
  },
  handoffText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
    textAlign: 'center',
  },
});
