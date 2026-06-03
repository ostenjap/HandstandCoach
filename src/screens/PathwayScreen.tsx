import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { DRILL_STEPS, DrillStep } from '../coaching/poseTypes';
import { UserProfile } from '../coaching/userStore';

const { width } = Dimensions.get('window');

interface PathwayScreenProps {
  profile: UserProfile;
  onSelectStep: (step: DrillStep) => void;
  onResetOnboarding: () => void;
}

export default function PathwayScreen({
  profile,
  onSelectStep,
  onResetOnboarding,
}: PathwayScreenProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [fearPopupDismissed, setFearPopupDismissed] = useState(false);

  const showFearPopup = profile.biggestStruggle === 'fear' && !fearPopupDismissed && !profile.completedSteps.includes(8);

  // Pulsing animation for the recommended step node
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Determine if a step is unlocked
  const isStepUnlocked = (stepId: number) => {
    if (stepId <= profile.recommendedStepId) return true;
    if (stepId === 0) return true;
    // Unlocked if previous step is completed
    return profile.completedSteps.includes(stepId - 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>COACHING PATHWAY</Text>
          <Text style={styles.mainTitle}>Master Gravity</Text>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={onResetOnboarding}>
          <Text style={styles.resetText}>RECALIBRATE</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pathIntro}>
          Complete each drill to unlock the next level. Tap any step to inspect details and start coaching.
        </Text>

        <View style={styles.pathContainer}>
          {/* Central spine line */}
          <View style={styles.spineLine} />

          {DRILL_STEPS.map((step, index) => {
            const unlocked = isStepUnlocked(step.id);
            const completed = profile.completedSteps.includes(step.id);
            const isRecommended = profile.recommendedStepId === step.id && !completed;
            
            // Alternating offsets: Step 1 left, Step 2 right, etc.
            const alignmentStyle = index % 2 === 0 ? styles.alignLeft : styles.alignRight;
            
            return (
              <View key={step.id} style={[styles.nodeWrapper, alignmentStyle]}>
                
                {/* Node Button */}
                <View style={styles.nodeWithIndicator}>
                  {isRecommended && (
                    <Animated.View 
                      style={[
                        styles.pulseRing, 
                        { transform: [{ scale: pulseAnim }] }
                      ]} 
                    />
                  )}
                  
                  {isRecommended && (
                    <View style={styles.tooltipBubble}>
                      <Text style={styles.tooltipText}>Based on your answers, start here.</Text>
                      <View style={styles.tooltipArrow} />
                    </View>
                  )}
                  
                  <TouchableOpacity
                    style={[
                      styles.nodeCircle,
                      completed ? styles.nodeCompleted : (unlocked ? styles.nodeUnlocked : styles.nodeLocked)
                    ]}
                    onPress={() => onSelectStep(step)}
                    activeOpacity={0.8}
                  >
                    {completed ? (
                      <Text style={styles.nodeIconText}>✓</Text>
                    ) : !unlocked ? (
                      <Text style={styles.nodeIconText}>🔒</Text>
                    ) : (
                      <Text style={[styles.nodeNumberText, isRecommended && styles.nodeNumberTextRecommended]}>
                        {step.id}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Step Metadata Card */}
                <TouchableOpacity
                  style={[styles.metaCard, !unlocked && styles.metaCardLocked]}
                  onPress={() => onSelectStep(step)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                  <Text style={styles.stepName}>{step.name}</Text>
                  <Text style={styles.stepGoal}>
                    {step.type === 'reps' ? `Target: ${step.targetPRSeconds} reps` : `Target: ${step.targetPRSeconds}s hold`}
                  </Text>
                  {profile.personalRecords[step.id] > 0 && (
                    <Text style={styles.stepPR}>
                      {step.type === 'reps' ? `Best Set: ${profile.personalRecords[step.id]} reps` : `PR: ${profile.personalRecords[step.id]}s`}
                    </Text>
                  )}
                </TouchableOpacity>

              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Fear Superpower Modal */}
      <Modal
        visible={showFearPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFearPopupDismissed(true)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>⚡</Text>
            <Text style={styles.modalTitle}>FEAR IS YOUR SUPERPOWER</Text>
            <Text style={styles.modalDescription}>
              You mentioned a fear of falling over. That's completely normal, and it's the number one roadblock for beginners.
              {"\n\n"}
              We have unlocked <Text style={styles.modalHighlight}>Step 8: The Safety Bail</Text> for you immediately. Learning how to bail safely is your superpower because once you know how to fall, the fear disappears.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setFearPopupDismissed(true)}
            >
              <Text style={styles.modalButtonText}>I AM READY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: '#111111',
  },
  brandTitle: {
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 4,
    fontFamily: 'Helvetica',
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Helvetica',
    marginTop: 4,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resetText: {
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  pathIntro: {
    color: '#666666',
    fontSize: 13,
    fontFamily: 'Helvetica',
    lineHeight: 18,
    textAlign: 'center',
    marginVertical: 24,
    paddingHorizontal: 10,
  },
  pathContainer: {
    position: 'relative',
    marginTop: 20,
  },
  spineLine: {
    position: 'absolute',
    left: '50%',
    top: 20,
    bottom: 20,
    width: 1,
    backgroundColor: '#222222',
    transform: [{ translateX: -0.5 }],
    zIndex: 1,
  },
  nodeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
    width: '100%',
    zIndex: 2,
  },
  alignLeft: {
    flexDirection: 'row',
  },
  alignRight: {
    flexDirection: 'row-reverse',
  },
  nodeWithIndicator: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  pulseRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    opacity: 0.35,
  },
  nodeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeLocked: {
    backgroundColor: '#000000',
    borderColor: '#222222',
  },
  nodeUnlocked: {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
  },
  nodeCompleted: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  nodeIconText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nodeNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
  },
  nodeNumberTextRecommended: {
    fontWeight: '900',
  },
  tooltipBubble: {
    position: 'absolute',
    top: -55,
    left: '50%',
    marginLeft: -70,
    width: 140,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  tooltipText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  metaCard: {
    flex: 1,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#181818',
    padding: 16,
    marginHorizontal: 12,
  },
  metaCardLocked: {
    opacity: 0.4,
  },
  stepSubtitle: {
    color: '#666666',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1,
    marginBottom: 4,
  },
  stepName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    marginBottom: 6,
  },
  stepGoal: {
    color: '#888888',
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  stepPR: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: 30,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 32,
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Helvetica',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalHighlight: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
  },
});
