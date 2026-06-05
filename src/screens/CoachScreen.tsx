import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { usePoseCoach } from '../coaching/usePoseCoach';
import { DRILL_STEPS, KeypointName } from '../coaching/poseTypes';
import { completeStep } from '../coaching/userStore';

const SKELETON_CONNECTIONS = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
] as const;

interface CoachScreenProps {
  stepId: number;
  onBack: () => void;
  onStepComplete: (stepId: number) => void;
  theme?: 'light' | 'dark';
}

export default function CoachScreen({ stepId, onBack, onStepComplete, theme = 'dark' }: CoachScreenProps) {
  const step = DRILL_STEPS.find((s) => s.id === stepId) || DRILL_STEPS[0];
  const isLight = theme === 'light';

  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const {
    feedback,
    modelReady,
    activePose,
    personalRecord,
    device,
    hasPermission,
    requestPermission,
    frameProcessor,
  } = usePoseCoach(stepId);

  // Auto-request camera permission on mount if not yet granted
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Auto-complete step in storage when target hold time is achieved
  useEffect(() => {
    if (feedback && feedback.holdTime >= step.targetPRSeconds && feedback.isSuccess) {
      completeStep(stepId).then(() => {
        onStepComplete(stepId);
      });
    }
  }, [feedback?.holdTime, feedback?.isSuccess, stepId, step.targetPRSeconds]);

  const renderBones = () => {
    if (!activePose || layout.width === 0 || layout.height === 0) return null;
    return SKELETON_CONNECTIONS.map(([jointA, jointB], index) => {
      const kpA = activePose[jointA as KeypointName];
      const kpB = activePose[jointB as KeypointName];
      if (!kpA || !kpB || kpA.score < 0.3 || kpB.score < 0.3) return null;

      const x1 = kpA.x * layout.width;
      const y1 = kpA.y * layout.height;
      const x2 = kpB.x * layout.width;
      const y2 = kpB.y * layout.height;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      return (
        <View
          key={`bone-${index}`}
          style={{
            position: 'absolute',
            left: midX - distance / 2,
            top: midY - 1.5,
            width: distance,
            height: 3,
            backgroundColor: isLight ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 255, 204, 0.45)',
            transform: [{ rotate: `${angle}rad` }],
          }}
          pointerEvents="none"
        />
      );
    });
  };

  const renderJoints = () => {
    if (!activePose || layout.width === 0 || layout.height === 0) return null;
    return Object.keys(activePose).map((jointName) => {
      const kp = activePose[jointName as KeypointName];
      if (!kp || kp.score < 0.3) return null;

      const px = kp.x * layout.width;
      const py = kp.y * layout.height;
      
      const isPrimaryJoint = [
        'leftWrist', 'rightWrist', 
        'leftShoulder', 'rightShoulder', 
        'leftHip', 'rightHip',
        'leftAnkle', 'rightAnkle', 
        'nose'
      ].includes(jointName);

      const neonColor = isLight ? '#0055FF' : '#00FFCC';
      
      return (
        <View
          key={`joint-${jointName}`}
          style={{
            position: 'absolute',
            left: px - (isPrimaryJoint ? 10 : 5),
            top: py - (isPrimaryJoint ? 10 : 5),
            width: isPrimaryJoint ? 20 : 10,
            height: isPrimaryJoint ? 20 : 10,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          pointerEvents="none"
        >
          {isPrimaryJoint && (
            <View
              style={{
                position: 'absolute',
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: neonColor,
                opacity: 0.6,
                borderStyle: 'dashed',
              }}
            />
          )}
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: neonColor,
              shadowColor: neonColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
              elevation: 3,
            }}
          />
        </View>
      );
    });
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={[styles.permissionContainer, isLight && styles.permissionContainerLight]}>
        <View style={[styles.permissionCard, isLight && styles.permissionCardLight]}>
          <Text style={[styles.permissionTitle, isLight && styles.permissionTitleLight]}>CAMERA ACCESS REQUIRED</Text>
          <Text style={[styles.permissionText, isLight && styles.permissionTextLight]}>
            Gravity needs camera access to analyze your pose and provide real-time coaching.
          </Text>
          <TouchableOpacity style={[styles.btn, isLight && styles.btnLight]} onPress={requestPermission}>
            <Text style={[styles.btnText, isLight && styles.btnTextLight]}>GRANT PERMISSION</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtnTextOnly} onPress={onBack}>
            <Text style={[styles.cancelText, isLight && styles.cancelTextLight]}>← GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={[styles.permissionContainer, isLight && styles.permissionContainerLight]}>
        <View style={[styles.permissionCard, isLight && styles.permissionCardLight]}>
          <Text style={[styles.permissionTitle, isLight && styles.permissionTitleLight]}>NO CAMERA FOUND</Text>
          <Text style={[styles.permissionText, isLight && styles.permissionTextLight]}>
            No front-facing camera is available on this device.
          </Text>
          <TouchableOpacity style={styles.backBtnTextOnly} onPress={onBack}>
            <Text style={[styles.cancelText, isLight && styles.cancelTextLight]}>← GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View 
      style={[styles.container, isLight && styles.containerLight]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setLayout({ width, height });
      }}
    >
      <StatusBar 
        barStyle={isLight ? "dark-content" : "light-content"} 
        backgroundColor={isLight ? "#FFFFFF" : "#000000"} 
        hidden={true} 
      />

      {/* Camera Live Background */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        fps={10}
      />

      {/* Tint Overlay */}
      <View style={[styles.cameraTint, isLight && styles.cameraTintLight]} />

      {/* CV Skeleton Overlay */}
      {renderBones()}
      {renderJoints()}

      {/* Live CV status badge */}
      <View style={[styles.simModeBadge, isLight && styles.simModeBadgeLight]} pointerEvents="none">
        <Text style={[styles.simModeBadgeText, isLight && styles.simModeBadgeTextLight]}>
          {modelReady ? (activePose ? 'POSE TRACKING LIVE' : 'SEARCHING FOR BODY…') : 'LOADING POSE MODEL…'}
        </Text>
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

        {/* End Drill */}
        <View style={[styles.simPanel, isLight && styles.simPanelLight]}>
          <TouchableOpacity
            style={[
              styles.simActionBtn,
              isLight && styles.simActionBtnLight,
              styles.exitDrillBtn,
              isLight && styles.exitDrillBtnLight,
            ]}
            onPress={onBack}
          >
            <Text style={[styles.exitDrillBtnText, isLight && styles.exitDrillBtnTextLight]}>
              END DRILL
            </Text>
          </TouchableOpacity>
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
  centerContainerLight: {
    backgroundColor: '#FFFFFF',
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
  btnLight: {
    backgroundColor: '#000000',
  },
  btnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
  },
  btnTextLight: {
    color: '#FFFFFF',
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
  cancelTextLight: {
    color: '#888888',
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
  exitDrillBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
  },
  exitDrillBtnTextLight: {
    color: '#000000',
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 24,
  },
  permissionContainerLight: {
    backgroundColor: '#FFFFFF',
  },
  permissionCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderWidth: 1,
    borderColor: '#222222',
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  permissionCardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#EAEAEA',
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionTitleLight: {
    color: '#000000',
  },
  permissionText: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Helvetica',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  permissionTextLight: {
    color: '#555555',
  },
});
