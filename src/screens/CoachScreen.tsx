import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { usePoseCoach } from '../coaching/usePoseCoach';
import { DRILL_STEPS, DrillStep } from '../coaching/poseTypes';
import { completeStep } from '../coaching/userStore';

interface CoachScreenProps {
  stepId: number;
  onBack: () => void;
  onStepComplete: (stepId: number) => void;
}

export default function CoachScreen({ stepId, onBack, onStepComplete }: CoachScreenProps) {
  const step = DRILL_STEPS.find((s) => s.id === stepId) || DRILL_STEPS[0];

  const {
    feedback,
    modelReady,
    activePose,
    simulationState,
    formQuality,
    setFormQuality,
    triggerKickUp,
    triggerFallDown,
    personalRecord,
  } = usePoseCoach(stepId);

  // Auto-complete step in storage when target hold time is achieved
  useEffect(() => {
    if (feedback && feedback.holdTime >= step.targetPRSeconds && feedback.isSuccess) {
      completeStep(stepId).then(() => {
        onStepComplete(stepId);
      });
    }
  }, [feedback?.holdTime, feedback?.isSuccess, stepId, step.targetPRSeconds]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" hidden={true} />

      {/* Background (simulation mode — no live camera). The real vision-camera
          feed gets plugged back in here when on-device inference is restored. */}
      <View style={styles.simBackground} />

      {/* Dark Overlay Tint */}
      <View style={styles.cameraTint} />

      {/* Simulation-mode badge */}
      <View style={styles.simModeBadge} pointerEvents="none">
        <Text style={styles.simModeBadgeText}>SIMULATION MODE</Text>
      </View>

      {/* Custom B&W HUD Overlay */}
      <SafeAreaView style={styles.hudOverlay}>
        
        {/* HUD Header */}
        <View style={styles.hudHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← PATHWAY</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.hudSubtitle}>{step.subtitle}</Text>
            <Text style={styles.hudTitle}>{step.name}</Text>
          </View>
        </View>

        {/* Live Metrics Grid */}
        <View style={styles.metricsContainer}>
          
          <View style={styles.metricRow}>
            {/* Timer Card */}
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>HOLD TIME</Text>
              <Text style={styles.metricValue}>
                {feedback ? feedback.holdTime : 0}s
              </Text>
              <Text style={styles.metricSubText}>Goal: {step.targetPRSeconds}s</Text>
            </View>

            {/* Score/Alignment Card */}
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>ALIGNMENT</Text>
              <Text style={styles.metricValue}>
                {feedback && feedback.isInverted
                  ? `${Math.round(feedback.alignmentScore * 100)}%`
                  : '—'}
              </Text>
              <Text style={styles.metricSubText}>Best PR: {personalRecord}s</Text>
            </View>
          </View>

          {/* Success Indicator Badge */}
          {feedback && feedback.holdTime >= step.targetPRSeconds && (
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>✓ DRILL OBJECTIVE ACHIEVED</Text>
            </View>
          )}

        </View>

        {/* Coach Feedback Box */}
        <View style={styles.feedbackSection}>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackLabel}>LIVE COACH</Text>
            <Text style={styles.feedbackMessage}>
              {feedback ? feedback.message : 'Positioning camera...'}
            </Text>
          </View>
        </View>

        {/* Simulation Control Panel */}
        <View style={styles.simPanel}>
          <Text style={styles.simPanelLabel}>CALIBRATION / SIMULATOR CONTROLS</Text>
          
          {simulationState === 'standing' ? (
            <TouchableOpacity style={styles.simActionBtn} onPress={triggerKickUp}>
              <Text style={styles.simActionBtnText}>KICK UP (START DRILL)</Text>
            </TouchableOpacity>
          ) : simulationState === 'kicking_up' ? (
            <View style={styles.simLoadingBox}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.simLoadingText}>KICKING UP...</Text>
            </View>
          ) : (
            <View>
              {/* Form Quality Selector */}
              <Text style={styles.simQualityLabel}>Simulated Body Posture:</Text>
              <View style={styles.qualityRow}>
                <TouchableOpacity
                  style={[styles.qualityBtn, formQuality === 'perfect' && styles.qualityBtnActive]}
                  onPress={() => setFormQuality('perfect')}
                >
                  <Text style={[styles.qualityText, formQuality === 'perfect' && styles.qualityTextActive]}>
                    Perfect
                  </Text>
                </TouchableOpacity>

                {stepId === 1 ? (
                  // Step 1 specific simulation (shoulders shifting out of stack)
                  <TouchableOpacity
                    style={[styles.qualityBtn, formQuality === 'plunging' && styles.qualityBtnActive]}
                    onPress={() => setFormQuality('plunging')}
                  >
                    <Text style={[styles.qualityText, formQuality === 'plunging' && styles.qualityTextActive]}>
                      Unstacked
                    </Text>
                  </TouchableOpacity>
                ) : stepId === 4 ? (
                  // Step 4 specific simulation (floating vs resting on wall)
                  <TouchableOpacity
                    style={[styles.qualityBtn, formQuality === 'wall_rest' && styles.qualityBtnActive]}
                    onPress={() => setFormQuality('wall_rest')}
                  >
                    <Text style={[styles.qualityText, formQuality === 'wall_rest' && styles.qualityTextActive]}>
                      Wall Rest
                    </Text>
                  </TouchableOpacity>
                ) : (
                  // Standard handstand errors
                  <>
                    <TouchableOpacity
                      style={[styles.qualityBtn, formQuality === 'banana_back' && styles.qualityBtnActive]}
                      onPress={() => setFormQuality('banana_back')}
                    >
                      <Text style={[styles.qualityText, formQuality === 'banana_back' && styles.qualityTextActive]}>
                        Banana Back
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.qualityBtn, formQuality === 'plunging' && styles.qualityBtnActive]}
                      onPress={() => setFormQuality('plunging')}
                    >
                      <Text style={[styles.qualityText, formQuality === 'plunging' && styles.qualityTextActive]}>
                        Plunging
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <TouchableOpacity style={[styles.simActionBtn, styles.exitDrillBtn]} onPress={triggerFallDown}>
                <Text style={styles.simActionBtnText}>FALL DOWN (STOP DRILL)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 30,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'Helvetica',
    marginBottom: 10,
  },
  simBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0a0a0a',
  },
  cameraTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // B&W cinematic tint
  },
  simModeBadge: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  simModeBadgeText: {
    color: '#666666',
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
  },
  text: {
    color: '#888888',
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Helvetica',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  btn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 0,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
  },
  backBtnTextOnly: {
    marginTop: 20,
    padding: 10,
  },
  cancelText: {
    color: '#555555',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1,
  },
  hudOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  headerTitleGroup: {
    flex: 1,
  },
  hudSubtitle: {
    color: '#888888',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  hudTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Helvetica',
    marginTop: 2,
  },
  metricsContainer: {
    marginVertical: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 1,
    borderColor: '#222222',
    padding: 16,
    marginHorizontal: 4,
  },
  metricLabel: {
    color: '#666666',
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
    marginBottom: 4,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Helvetica',
  },
  metricSubText: {
    color: '#555555',
    fontSize: 10,
    fontFamily: 'Helvetica',
    marginTop: 4,
  },
  successBadge: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 4,
  },
  successBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  feedbackSection: {
    marginVertical: 10,
  },
  feedbackCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: 20,
  },
  feedbackLabel: {
    color: '#666666',
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
    marginBottom: 6,
  },
  feedbackMessage: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    lineHeight: 20,
  },
  simPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginBottom: 10,
  },
  simPanelLabel: {
    color: '#444444',
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  simActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    alignItems: 'center',
  },
  exitDrillBtn: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
    marginTop: 8,
  },
  simActionBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  simLoadingBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  simLoadingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    marginLeft: 10,
    letterSpacing: 1,
  },
  simQualityLabel: {
    color: '#888888',
    fontSize: 10,
    fontFamily: 'Helvetica',
    marginBottom: 8,
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  qualityBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#222222',
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 3,
    backgroundColor: '#000000',
  },
  qualityBtnActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  qualityText: {
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
  },
  qualityTextActive: {
    color: '#000000',
  },
});
