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
  theme?: 'light' | 'dark';
}

export default function CoachScreen({ stepId, onBack, onStepComplete, theme = 'dark' }: CoachScreenProps) {
  const step = DRILL_STEPS.find((s) => s.id === stepId) || DRILL_STEPS[0];
  const isLight = theme === 'light';

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
    <View style={[styles.container, isLight && styles.containerLight]}>
      <StatusBar 
        barStyle={isLight ? "dark-content" : "light-content"} 
        backgroundColor={isLight ? "#FFFFFF" : "#000000"} 
        hidden={true} 
      />

      {/* Background (simulation mode — no live camera). The real vision-camera
          feed gets plugged back in here when on-device inference is restored. */}
      <View style={[styles.simBackground, isLight && styles.simBackgroundLight]} />

      {/* Tint Overlay */}
      <View style={[styles.cameraTint, isLight && styles.cameraTintLight]} />

      {/* Simulation-mode badge */}
      <View style={[styles.simModeBadge, isLight && styles.simModeBadgeLight]} pointerEvents="none">
        <Text style={[styles.simModeBadgeText, isLight && styles.simModeBadgeTextLight]}>SIMULATION MODE</Text>
      </View>

      {/* Custom HUD Overlay */}
      <SafeAreaView style={styles.hudOverlay}>
        
        {/* HUD Header */}
        <View style={styles.hudHeader}>
          <TouchableOpacity style={[styles.backBtn, isLight && styles.backBtnLight]} onPress={onBack}>
            <Text style={[styles.backBtnText, isLight && styles.backBtnTextLight]}>← PATHWAY</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.hudSubtitle, isLight && styles.hudSubtitleLight]}>{step.subtitle}</Text>
            <Text style={[styles.hudTitle, isLight && styles.hudTitleLight]}>{step.name}</Text>
          </View>
        </View>

        {/* Live Metrics Grid */}
        <View style={styles.metricsContainer}>
          
          <View style={styles.metricRow}>
            {/* Timer Card */}
            <View style={[styles.metricCard, isLight && styles.metricCardLight]}>
              <Text style={[styles.metricLabel, isLight && styles.metricLabelLight]}>{step.type === 'reps' ? 'REPS' : 'HOLD TIME'}</Text>
              <Text style={[styles.metricValue, isLight && styles.metricValueLight]}>
                {feedback ? feedback.holdTime : 0}{step.type === 'reps' ? '' : 's'}
              </Text>
              <Text style={[styles.metricSubText, isLight && styles.metricSubTextLight]}>Goal: {step.targetPRSeconds}{step.type === 'reps' ? ' reps' : 's'}</Text>
            </View>

            {/* Score/Alignment Card */}
            <View style={[styles.metricCard, isLight && styles.metricCardLight]}>
              <Text style={[styles.metricLabel, isLight && styles.metricLabelLight]}>ALIGNMENT</Text>
              <Text style={[styles.metricValue, isLight && styles.metricValueLight]}>
                {feedback && (feedback.isInverted || stepId === 0 || stepId === 1)
                  ? `${Math.round(feedback.alignmentScore * 100)}%`
                  : '—'}
              </Text>
              <Text style={[styles.metricSubText, isLight && styles.metricSubTextLight]}>Best PR: {personalRecord}{step.type === 'reps' ? ' reps' : 's'}</Text>
            </View>
          </View>

          {/* Success Indicator Badge */}
          {feedback && feedback.holdTime >= step.targetPRSeconds && (
            <View style={[styles.successBadge, isLight && styles.successBadgeLight]}>
              <Text style={[styles.successBadgeText, isLight && styles.successBadgeTextLight]}>✓ DRILL OBJECTIVE ACHIEVED</Text>
            </View>
          )}

        </View>

        {/* Coach Feedback Box */}
        <View style={styles.feedbackSection}>
          <View style={[styles.feedbackCard, isLight && styles.feedbackCardLight]}>
            <Text style={[styles.feedbackLabel, isLight && styles.feedbackLabelLight]}>LIVE COACH</Text>
            <Text style={[styles.feedbackMessage, isLight && styles.feedbackMessageLight]}>
              {feedback ? feedback.message : 'Positioning camera...'}
            </Text>
          </View>
        </View>

        {/* Simulation Control Panel */}
        <View style={[styles.simPanel, isLight && styles.simPanelLight]}>
          <Text style={[styles.simPanelLabel, isLight && styles.simPanelLabelLight]}>CALIBRATION / SIMULATOR CONTROLS</Text>
          
          {simulationState === 'standing' ? (
            <TouchableOpacity style={[styles.simActionBtn, isLight && styles.simActionBtnLight]} onPress={triggerKickUp}>
              <Text style={[styles.simActionBtnText, isLight && styles.simActionBtnTextLight]}>
                {stepId === 0 || stepId === 1 ? 'START DRILL' : 'KICK UP (START DRILL)'}
              </Text>
            </TouchableOpacity>
          ) : simulationState === 'kicking_up' ? (
            <View style={styles.simLoadingBox}>
              <ActivityIndicator size="small" color={isLight ? "#000000" : "#FFFFFF"} />
              <Text style={[styles.simLoadingText, isLight && styles.simLoadingTextLight]}>
                {stepId === 0 || stepId === 1 ? 'GETTING READY...' : 'KICKING UP...'}
              </Text>
            </View>
          ) : (
            <View>
              {/* Form Quality Selector */}
              {stepId !== 0 && stepId !== 8 && (
                <>
                  <Text style={[styles.simQualityLabel, isLight && styles.simQualityLabelLight]}>Simulated Body Posture:</Text>
                  <View style={styles.qualityRow}>
                    <TouchableOpacity
                      style={[
                        styles.qualityBtn,
                        isLight && styles.qualityBtnLight,
                        formQuality === 'perfect' && (isLight ? styles.qualityBtnActiveLight : styles.qualityBtnActive)
                      ]}
                      onPress={() => setFormQuality('perfect')}
                    >
                      <Text style={[
                        styles.qualityText,
                        isLight && styles.qualityTextLight,
                        formQuality === 'perfect' && (isLight ? styles.qualityTextActiveLight : styles.qualityTextActive)
                      ]}>
                        Perfect
                      </Text>
                    </TouchableOpacity>

                    {stepId === 1 ? (
                      <TouchableOpacity
                        style={[
                          styles.qualityBtn,
                          isLight && styles.qualityBtnLight,
                          formQuality === 'banana_back' && (isLight ? styles.qualityBtnActiveLight : styles.qualityBtnActive)
                        ]}
                        onPress={() => setFormQuality('banana_back')}
                      >
                        <Text style={[
                          styles.qualityText,
                          isLight && styles.qualityTextLight,
                          formQuality === 'banana_back' && (isLight ? styles.qualityTextActiveLight : styles.qualityTextActive)
                        ]}>
                          Banana Back
                        </Text>
                      </TouchableOpacity>
                    ) : (stepId === 4 || stepId === 5 || stepId === 9) ? (
                      <TouchableOpacity
                        style={[
                          styles.qualityBtn,
                          isLight && styles.qualityBtnLight,
                          formQuality === 'plunging' && (isLight ? styles.qualityBtnActiveLight : styles.qualityBtnActive)
                        ]}
                        onPress={() => setFormQuality('plunging')}
                      >
                        <Text style={[
                          styles.qualityText,
                          isLight && styles.qualityTextLight,
                          formQuality === 'plunging' && (isLight ? styles.qualityTextActiveLight : styles.qualityTextActive)
                        ]}>
                          Plunging
                        </Text>
                      </TouchableOpacity>
                    ) : stepId === 10 ? (
                      <TouchableOpacity
                        style={[
                          styles.qualityBtn,
                          isLight && styles.qualityBtnLight,
                          formQuality === 'wall_rest' && (isLight ? styles.qualityBtnActiveLight : styles.qualityBtnActive)
                        ]}
                        onPress={() => setFormQuality('wall_rest')}
                      >
                        <Text style={[
                          styles.qualityText,
                          isLight && styles.qualityTextLight,
                          formQuality === 'wall_rest' && (isLight ? styles.qualityTextActiveLight : styles.qualityTextActive)
                        ]}>
                          Wall Rest
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.qualityBtn,
                            isLight && styles.qualityBtnLight,
                            formQuality === 'banana_back' && (isLight ? styles.qualityBtnActiveLight : styles.qualityBtnActive)
                          ]}
                          onPress={() => setFormQuality('banana_back')}
                        >
                          <Text style={[
                            styles.qualityText,
                            isLight && styles.qualityTextLight,
                            formQuality === 'banana_back' && (isLight ? styles.qualityTextActiveLight : styles.qualityTextActive)
                          ]}>
                            Banana
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.qualityBtn,
                            isLight && styles.qualityBtnLight,
                            formQuality === 'plunging' && (isLight ? styles.qualityBtnActiveLight : styles.qualityBtnActive)
                          ]}
                          onPress={() => setFormQuality('plunging')}
                        >
                          <Text style={[
                            styles.qualityText,
                            isLight && styles.qualityTextLight,
                            formQuality === 'plunging' && (isLight ? styles.qualityTextActiveLight : styles.qualityTextActive)
                          ]}>
                            Plunging
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              )}

              <TouchableOpacity 
                style={[
                  styles.simActionBtn, 
                  isLight && styles.simActionBtnLight,
                  styles.exitDrillBtn,
                  isLight && styles.exitDrillBtnLight
                ]} 
                onPress={triggerFallDown}
              >
                <Text style={[styles.simActionBtnText, isLight && styles.simActionBtnTextLight]}>
                  {stepId === 0 || stepId === 1 ? 'STOP DRILL' : (stepId === 8 ? 'SAFE BAIL (EXIT DRILL)' : 'FALL DOWN (STOP DRILL)')}
                </Text>
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
  containerLight: {
    backgroundColor: '#FFFFFF',
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
  simBackgroundLight: {
    backgroundColor: '#F0F0F0',
  },
  cameraTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // B&W cinematic tint
  },
  cameraTintLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
  simModeBadgeLight: {
    borderColor: '#CCCCCC',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  simModeBadgeText: {
    color: '#666666',
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
  },
  simModeBadgeTextLight: {
    color: '#333333',
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
  backBtnLight: {
    borderColor: '#CCCCCC',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  backBtnTextLight: {
    color: '#000000',
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
  hudSubtitleLight: {
    color: '#666666',
  },
  hudTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Helvetica',
    marginTop: 2,
  },
  hudTitleLight: {
    color: '#000000',
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
  metricCardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: '#EAEAEA',
  },
  metricLabel: {
    color: '#666666',
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
    marginBottom: 4,
  },
  metricLabelLight: {
    color: '#777777',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Helvetica',
  },
  metricValueLight: {
    color: '#000000',
  },
  metricSubText: {
    color: '#555555',
    fontSize: 10,
    fontFamily: 'Helvetica',
    marginTop: 4,
  },
  metricSubTextLight: {
    color: '#777777',
  },
  successBadge: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 4,
  },
  successBadgeLight: {
    backgroundColor: '#000000',
  },
  successBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  successBadgeTextLight: {
    color: '#FFFFFF',
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
  feedbackCardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#000000',
  },
  feedbackLabel: {
    color: '#666666',
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
    marginBottom: 6,
  },
  feedbackLabelLight: {
    color: '#777777',
  },
  feedbackMessage: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    lineHeight: 20,
  },
  feedbackMessageLight: {
    color: '#000000',
  },
  simPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginBottom: 10,
  },
  simPanelLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#EAEAEA',
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
  simPanelLabelLight: {
    color: '#777777',
  },
  simActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    alignItems: 'center',
  },
  simActionBtnLight: {
    backgroundColor: '#000000',
  },
  exitDrillBtn: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
    marginTop: 8,
  },
  exitDrillBtnLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CCCCCC',
  },
  simActionBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  simActionBtnTextLight: {
    color: '#FFFFFF',
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
  simLoadingTextLight: {
    color: '#000000',
  },
  simQualityLabel: {
    color: '#888888',
    fontSize: 10,
    fontFamily: 'Helvetica',
    marginBottom: 8,
  },
  simQualityLabelLight: {
    color: '#666666',
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
  qualityBtnLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEAEA',
  },
  qualityBtnActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  qualityBtnActiveLight: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  qualityText: {
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
  },
  qualityTextLight: {
    color: '#777777',
  },
  qualityTextActive: {
    color: '#000000',
  },
  qualityTextActiveLight: {
    color: '#FFFFFF',
  },
});
