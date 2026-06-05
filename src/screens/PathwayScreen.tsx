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
  onUpdateSettings: (updates: Partial<UserProfile>) => void;
}

export default function PathwayScreen({
  profile,
  onSelectStep,
  onResetOnboarding,
  onUpdateSettings,
}: PathwayScreenProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [settingsVisible, setSettingsVisible] = useState(false);

  const showFearPopup = profile.biggestStruggle === 'fear' && !profile.hasDismissedFearPopup && !profile.completedSteps.includes(8);
  const isLight = profile.theme === 'light';

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
    if (profile.godMode) return true;
    if (stepId <= profile.recommendedStepId) return true;
    if (stepId === 0) return true;
    // Special unlock: if biggestStruggle is fear, unlock Step 8 (Safety Bail) immediately
    if (stepId === 8 && profile.biggestStruggle === 'fear') return true;
    // Unlocked if previous step is completed
    return profile.completedSteps.includes(stepId - 1);
  };

  return (
    <SafeAreaView style={[styles.container, isLight && styles.containerLight]}>
      <StatusBar 
        barStyle={isLight ? "dark-content" : "light-content"} 
        backgroundColor={isLight ? "#FFFFFF" : "#000000"} 
      />
      
      {/* Header */}
      <View style={[styles.header, isLight && styles.headerLight]}>
        <View>
          <Text style={[styles.brandTitle, isLight && styles.brandTitleLight]}>COACHING PATHWAY</Text>
          <Text style={[styles.mainTitle, isLight && styles.mainTitleLight]}>Master Gravity</Text>
        </View>
        <TouchableOpacity style={[styles.settingsButton, isLight && styles.settingsButtonLight]} onPress={() => setSettingsVisible(true)}>
          <Text style={[styles.settingsButtonText, isLight && styles.settingsButtonTextLight]}>SETTINGS ⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pathIntro, isLight && styles.pathIntroLight]}>
          Complete each drill to unlock the next level. Tap any step to inspect details and start coaching.
        </Text>

        <View style={styles.pathContainer}>
          {/* Central spine line */}
          <View style={[styles.spineLine, isLight && styles.spineLineLight]} />

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
                        { borderColor: isLight ? '#000000' : '#FFFFFF' },
                        { transform: [{ scale: pulseAnim }] }
                      ]} 
                    />
                  )}
                  
                  {isRecommended && (
                    <View style={[styles.tooltipBubble, isLight && styles.tooltipBubbleLight]}>
                      <Text style={[styles.tooltipText, isLight && styles.tooltipTextLight]}>Based on your answers, start here.</Text>
                      <View style={[styles.tooltipArrow, isLight && styles.tooltipArrowLight]} />
                    </View>
                  )}
                  
                  <TouchableOpacity
                    style={[
                      styles.nodeCircle,
                      completed 
                        ? (isLight ? styles.nodeCompletedLight : styles.nodeCompleted) 
                        : (unlocked 
                            ? (isLight ? styles.nodeUnlockedLight : styles.nodeUnlocked) 
                            : (isLight ? styles.nodeLockedLight : styles.nodeLocked))
                    ]}
                    onPress={() => onSelectStep(step)}
                    activeOpacity={0.8}
                  >
                    {completed ? (
                      <Text style={[styles.nodeIconText, isLight && styles.nodeIconTextLight]}>✓</Text>
                    ) : !unlocked ? (
                      <Text style={styles.nodeIconText}>🔒</Text>
                    ) : (
                      <Text style={[
                        styles.nodeNumberText, 
                        isLight && styles.nodeNumberTextLight,
                        isRecommended && styles.nodeNumberTextRecommended
                      ]}>
                        {step.id}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Step Metadata Card */}
                <TouchableOpacity
                  style={[
                    styles.metaCard, 
                    isLight && styles.metaCardLight,
                    !unlocked && styles.metaCardLocked
                  ]}
                  onPress={() => onSelectStep(step)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepSubtitle, isLight && styles.stepSubtitleLight]}>{step.subtitle}</Text>
                  <Text style={[styles.stepName, isLight && styles.stepNameLight]}>{step.name}</Text>
                  <Text style={[styles.stepGoal, isLight && styles.stepGoalLight]}>
                    {step.type === 'reps' ? `Target: ${step.targetPRSeconds} reps` : `Target: ${step.targetPRSeconds}s hold`}
                  </Text>
                  {profile.personalRecords[step.id] > 0 && (
                    <Text style={[styles.stepPR, isLight && styles.stepPRLight]}>
                      {step.type === 'reps' ? `Best Set: ${profile.personalRecords[step.id]} reps` : `PR: ${profile.personalRecords[step.id]}s`}
                    </Text>
                  )}
                </TouchableOpacity>

              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isLight && styles.modalContentLight]}>
            <Text style={[styles.modalTitle, isLight && styles.modalTitleLight]}>SETTINGS</Text>
            
            {/* Theme Toggle Option */}
            <View style={styles.settingOptionRow}>
              <Text style={[styles.settingLabel, isLight && styles.settingLabelLight]}>THEME</Text>
              <View style={styles.themeSelectorGroup}>
                <TouchableOpacity 
                  style={[
                    styles.themeSelectorBtn, 
                    isLight && styles.themeSelectorBtnActiveLight,
                    !isLight && styles.themeSelectorBtnInactive
                  ]}
                  onPress={() => onUpdateSettings({ theme: 'light' })}
                >
                  <Text style={[
                    styles.themeSelectorBtnText,
                    isLight ? styles.themeSelectorBtnTextActiveLight : styles.themeSelectorBtnTextInactive
                  ]}>LIGHT</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.themeSelectorBtn, 
                    !isLight && styles.themeSelectorBtnActiveDark,
                    isLight && styles.themeSelectorBtnInactive
                  ]}
                  onPress={() => onUpdateSettings({ theme: 'dark' })}
                >
                  <Text style={[
                    styles.themeSelectorBtnText,
                    !isLight ? styles.themeSelectorBtnTextActiveDark : styles.themeSelectorBtnTextInactive
                  ]}>DARK</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* God Mode Toggle Option */}
            <View style={styles.settingOptionRow}>
              <View style={styles.godModeTextCol}>
                <Text style={[styles.settingLabel, isLight && styles.settingLabelLight]}>GOD MODE</Text>
                <Text style={styles.settingSubtext}>Bypass all level locks immediately</Text>
              </View>
              <TouchableOpacity 
                style={[
                  styles.godModeToggleBtn,
                  profile.godMode 
                    ? (isLight ? styles.godModeToggleBtnActiveLight : styles.godModeToggleBtnActiveDark)
                    : (isLight ? styles.godModeToggleBtnInactiveLight : styles.godModeToggleBtnInactiveDark)
                ]}
                onPress={() => onUpdateSettings({ godMode: !profile.godMode })}
              >
                <Text style={[
                  styles.godModeToggleBtnText,
                  profile.godMode ? styles.godModeToggleActiveText : styles.godModeToggleInactiveText
                ]}>
                  {profile.godMode ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Recalibrate / Reset Button */}
            <TouchableOpacity
              style={[styles.recalibrateBtn, isLight && styles.recalibrateBtnLight]}
              onPress={() => {
                setSettingsVisible(false);
                onResetOnboarding();
              }}
            >
              <Text style={[styles.recalibrateBtnText, isLight && styles.recalibrateBtnTextLight]}>RECALIBRATE PATHWAY</Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.modalButton, isLight && styles.modalButtonLight, { marginTop: 16 }]}
              onPress={() => setSettingsVisible(false)}
            >
              <Text style={[styles.modalButtonText, isLight && styles.modalButtonTextLight]}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fear Superpower Modal */}
      <Modal
        visible={showFearPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => onUpdateSettings({ hasDismissedFearPopup: true })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isLight && styles.modalContentLight]}>
            <Text style={styles.modalEmoji}>⚡</Text>
            <Text style={[styles.modalTitle, isLight && styles.modalTitleLight]}>FEAR IS YOUR SUPERPOWER</Text>
            <Text style={[styles.modalDescription, isLight && styles.modalDescriptionLight]}>
              You mentioned a fear of falling over. That's completely normal, and it's the number one roadblock for beginners.
              {"\n\n"}
              We have unlocked <Text style={[styles.modalHighlight, isLight && styles.modalHighlightLight]}>Step 8: The Safety Bail</Text> for you immediately. Learning how to bail safely is your superpower because once you know how to fall, the fear disappears.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, isLight && styles.modalButtonLight]}
              onPress={() => onUpdateSettings({ hasDismissedFearPopup: true })}
            >
              <Text style={[styles.modalButtonText, isLight && styles.modalButtonTextLight]}>I AM READY</Text>
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
  containerLight: {
    backgroundColor: '#FFFFFF',
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
  headerLight: {
    borderColor: '#EAEAEA',
  },
  brandTitle: {
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 4,
    fontFamily: 'Helvetica',
  },
  brandTitleLight: {
    color: '#666666',
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Helvetica',
    marginTop: 4,
  },
  mainTitleLight: {
    color: '#000000',
  },
  settingsButton: {
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  settingsButtonLight: {
    borderColor: '#CCCCCC',
  },
  settingsButtonText: {
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  settingsButtonTextLight: {
    color: '#555555',
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
  pathIntroLight: {
    color: '#555555',
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
  spineLineLight: {
    backgroundColor: '#E5E5E5',
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
  nodeLockedLight: {
    backgroundColor: '#F9F9F9',
    borderColor: '#E5E5E5',
  },
  nodeUnlocked: {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
  },
  nodeUnlockedLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
  },
  nodeCompleted: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  nodeCompletedLight: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  nodeIconText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nodeIconTextLight: {
    color: '#FFFFFF',
  },
  nodeNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
  },
  nodeNumberTextLight: {
    color: '#000000',
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
  tooltipBubbleLight: {
    backgroundColor: '#000000',
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
  tooltipTextLight: {
    color: '#FFFFFF',
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
  tooltipArrowLight: {
    backgroundColor: '#000000',
  },
  metaCard: {
    flex: 1,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#181818',
    padding: 16,
    marginHorizontal: 12,
  },
  metaCardLight: {
    backgroundColor: '#FAFAFA',
    borderColor: '#EAEAEA',
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
  stepSubtitleLight: {
    color: '#777777',
  },
  stepName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    marginBottom: 6,
  },
  stepNameLight: {
    color: '#000000',
  },
  stepGoal: {
    color: '#888888',
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  stepGoalLight: {
    color: '#666666',
  },
  stepPR: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    marginTop: 4,
  },
  stepPRLight: {
    color: '#000000',
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
  modalContentLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
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
    marginBottom: 24,
  },
  modalTitleLight: {
    color: '#000000',
  },
  modalDescription: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Helvetica',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalDescriptionLight: {
    color: '#555555',
  },
  modalHighlight: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalHighlightLight: {
    color: '#000000',
  },
  modalButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonLight: {
    backgroundColor: '#000000',
  },
  modalButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
  },
  modalButtonTextLight: {
    color: '#FFFFFF',
  },
  
  // Settings Options styles
  settingOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#222222',
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  settingLabelLight: {
    color: '#000000',
  },
  settingSubtext: {
    color: '#666666',
    fontSize: 10,
    fontFamily: 'Helvetica',
    marginTop: 4,
  },
  godModeTextCol: {
    flex: 1,
    marginRight: 12,
  },
  themeSelectorGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#333333',
  },
  themeSelectorBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  themeSelectorBtnActiveLight: {
    backgroundColor: '#000000',
  },
  themeSelectorBtnActiveDark: {
    backgroundColor: '#FFFFFF',
  },
  themeSelectorBtnInactive: {
    backgroundColor: 'transparent',
  },
  themeSelectorBtnText: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  themeSelectorBtnTextActiveLight: {
    color: '#FFFFFF',
  },
  themeSelectorBtnTextActiveDark: {
    color: '#000000',
  },
  themeSelectorBtnTextInactive: {
    color: '#555555',
  },
  godModeToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  godModeToggleBtnActiveDark: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  godModeToggleBtnActiveLight: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  godModeToggleBtnInactiveDark: {
    backgroundColor: 'transparent',
    borderColor: '#333333',
  },
  godModeToggleBtnInactiveLight: {
    backgroundColor: 'transparent',
    borderColor: '#CCCCCC',
  },
  godModeToggleBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1,
  },
  godModeToggleActiveText: {
    color: '#000000',
  },
  godModeToggleInactiveText: {
    color: '#555555',
  },
  recalibrateBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  recalibrateBtnLight: {
    borderColor: '#CCCCCC',
  },
  recalibrateBtnText: {
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
  },
  recalibrateBtnTextLight: {
    color: '#555555',
  },
});
