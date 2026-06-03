import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { DrillStep } from '../coaching/poseTypes';
import { UserProfile } from '../coaching/userStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DrillBottomSheetProps {
  step: DrillStep | null;
  visible: boolean;
  onClose: () => void;
  onStartCamera: () => void;
  profile: UserProfile | null;
}

export default function DrillBottomSheet({
  step,
  visible,
  onClose,
  onStartCamera,
  profile,
}: DrillBottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Stick figure breathing/wobble animation
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide up bottom sheet
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // Start looping stick figure form animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(formAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(formAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Slide down bottom sheet
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim, formAnim]);

  if (!step) return null;

  // Interpolations for stick figure lines depending on active step
  const angleInterpolation = formAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2deg', '2deg'], // micro-wobble
  });

  const rockInterpolation = formAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  const pushUpInterpolation = formAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 16], // push up height transition
  });

  const wallTapInterpolation = formAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '0deg'], // leg tapping off wall
  });

  const bailRotationInterpolation = formAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: ['0deg', '-45deg', '-90deg'], // bailing spin
  });

  const bailYInterpolation = formAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0, 20, 45], // falling down
  });

  const renderVisualGuide = () => {
    switch (step.id) {
      case 0: // Wrist Protocol (on hands and knees, rocking)
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            <Animated.View style={{ transform: [{ translateX: rockInterpolation }] }}>
              {/* Hands & knees figure */}
              <View style={styles.quadrupedContainer}>
                <View style={[styles.guideLine, styles.quadrupedArm]} />
                <View style={[styles.guideLine, styles.quadrupedTorso]} />
                <View style={[styles.guideLine, styles.quadrupedThigh]} />
                <View style={styles.headNodeQuadruped} />
              </View>
            </Animated.View>
          </View>
        );

      case 1: // Hollow Body Hold
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            <View style={styles.hollowBodyContainer}>
              <View style={[styles.guideLine, styles.hollowBackLine]} />
              <Animated.View style={[styles.hollowLegs, { transform: [{ rotate: '-10deg' }] }]} />
              <Animated.View style={[styles.hollowArms, { transform: [{ rotate: '10deg' }] }]} />
              <View style={styles.headNodeHollow} />
            </View>
          </View>
        );

      case 2: // Ground Pike Hold (V-shape)
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            <View style={styles.pikeFigureContainer}>
              <View style={[styles.guideLine, styles.armLineVertical, { height: 40 }]} />
              <View style={styles.torsoLinePike} />
              <View style={styles.legLinePike} />
              <View style={styles.headNodeVerticalPike} />
            </View>
          </View>
        );

      case 3: // Ground Pike Push-Up
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            <View style={styles.pikeFigureContainer}>
              <Animated.View style={[styles.guideLine, styles.armLineVertical, { 
                height: 40,
                transform: [{ scaleY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }]
              }]} />
              <Animated.View style={[styles.torsoLinePike, {
                transform: [
                  { translateY: pushUpInterpolation },
                  { rotate: '45deg' }
                ]
              }]} />
              <Animated.View style={[styles.legLinePike, {
                transform: [
                  { translateY: pushUpInterpolation },
                  { rotate: '-45deg' }
                ]
              }]} />
              <Animated.View style={[styles.headNodeVerticalPike, {
                transform: [{ translateY: pushUpInterpolation }]
              }]} />
            </View>
          </View>
        );

      case 4: // Box Pike Hold (elevated feet)
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            <View style={styles.boxGuide} />
            
            <View style={[styles.pikeFigureContainer, { left: 100 }]}>
              <View style={[styles.guideLine, styles.armLineVertical, { height: 45 }]} />
              <View style={[styles.guideLine, styles.torsoLineVertical, { bottom: 45, height: 35 }]} />
              <View style={[styles.guideLine, styles.legLineHorizontal, { bottom: 80, left: -30, width: 30 }]} />
              <View style={[styles.headNodeVertical, { bottom: 38 }]} />
            </View>
          </View>
        );

      case 5: // Box Pike Push-Up
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            <View style={styles.boxGuide} />
            
            <View style={[styles.pikeFigureContainer, { left: 100 }]}>
              <Animated.View style={[styles.guideLine, styles.armLineVertical, { 
                height: 45,
                transform: [{ scaleY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }]
              }]} />
              <Animated.View style={[styles.guideLine, styles.torsoLineVertical, { 
                bottom: 45, 
                height: 35,
                transform: [{ translateY: pushUpInterpolation }]
              }]} />
              <Animated.View style={[styles.guideLine, styles.legLineHorizontal, { 
                bottom: 80, 
                left: -30, 
                width: 30,
                transform: [{ translateY: pushUpInterpolation }]
              }]} />
              <Animated.View style={[styles.headNodeVertical, { 
                bottom: 38,
                transform: [{ translateY: pushUpInterpolation }]
              }]} />
            </View>
          </View>
        );

      case 6: // Partial Wall Walk (45 deg)
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            <View style={[styles.guideLine, styles.wallLineLeft]} />
            <View style={[styles.invertedFigureContainer, { left: 60, bottom: 10 }]}>
              <View style={[styles.guideLine, styles.fullBodyLine, { transform: [{ rotate: '45deg' }] }]} />
              <View style={[styles.headNodeInverted, { top: 60, left: 12 }]} />
            </View>
          </View>
        );

      case 7: // Full Wall Walk
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            <View style={[styles.guideLine, styles.wallLineLeft]} />
            
            <Animated.View 
              style={[
                styles.invertedFigureContainer, 
                { left: 35 },
                { transform: [{ rotate: angleInterpolation }] }
              ]}
            >
              <View style={styles.headNodeInverted} />
              <View style={[styles.guideLine, styles.fullBodyLine]} />
            </Animated.View>
          </View>
        );

      case 8: // Safety Bail
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            <View style={[styles.guideLine, styles.wallLineLeft]} />
            
            <Animated.View 
              style={[
                styles.invertedFigureContainer, 
                { left: 80 },
                { 
                  transform: [
                    { translateY: bailYInterpolation },
                    { rotate: bailRotationInterpolation }
                  ] 
                }
              ]}
            >
              <View style={styles.headNodeInverted} />
              <View style={[styles.guideLine, styles.fullBodyLine]} />
            </Animated.View>
          </View>
        );

      case 9: // Wall Kick-Up
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            <View style={[styles.guideLine, styles.wallLineLeft]} />
            
            <View style={[styles.invertedFigureContainer, styles.backToWallPosition]}>
              <View style={styles.headNodeInverted} />
              <Animated.View 
                style={[
                  styles.guideLine, 
                  styles.fullBodyLine, 
                  { transform: [{ rotate: angleInterpolation }] }
                ]} 
              />
            </View>
          </View>
        );

      case 10: // Wall Taps
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            <View style={[styles.guideLine, styles.wallLineLeft]} />
            
            <View style={[styles.invertedFigureContainer, styles.freestandingCenter]}>
              <View style={styles.headNodeInverted} />
              <View style={[styles.guideLine, styles.torsoOnlyLine]} />
              
              <Animated.View 
                style={[
                  styles.guideLine, 
                  styles.tappingLegLine,
                  { transform: [{ rotate: wallTapInterpolation }] }
                ]} 
              />
              <View style={[styles.guideLine, styles.balanceLegLine]} />
            </View>
          </View>
        );

      case 11: // Antigravity
      default:
        return (
          <View style={styles.guideContainer}>
            <View style={[styles.guideLine, styles.floorLine]} />
            
            <Animated.View 
              style={[
                styles.invertedFigureContainer, 
                styles.freestandingCenter,
                { transform: [{ rotate: angleInterpolation }] }
              ]}
            >
              <View style={styles.headNodeInverted} />
              <View style={[styles.guideLine, styles.fullBodyLine]} />
              <View style={styles.handBaseLeft} />
              <View style={styles.handBaseRight} />
            </Animated.View>
          </View>
        );
    }
  };

  const handleStart = () => {
    // Close first, then navigate
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      onStartCamera();
    });
  };

  const showOutdoorsWarning =
    profile?.practiceEnvironment === 'outdoors' &&
    step.id >= 6 &&
    step.id <= 10;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sheet Content */}
      <Animated.View 
        style={[
          styles.sheet, 
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View style={styles.dragIndicatorContainer}>
          <View style={styles.dragIndicator} />
        </View>

        {/* Drill Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
            <Text style={styles.stepTitle}>{step.name}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>CLOSE</Text>
          </TouchableOpacity>
        </View>

        {/* Visual Line Guide */}
        <View style={styles.visualSection}>
          <Text style={styles.visualLabel}>ALIGNMENT MODEL</Text>
          {renderVisualGuide()}
        </View>

        {/* Description & Targets */}
        <View style={styles.detailsContainer}>
          <Text style={styles.descriptionText}>{step.description}</Text>
          
          {showOutdoorsWarning && (
            <View style={styles.warningBox}>
              <Text style={styles.warningLabel}>⚠️ OUTDOORS WARNING</Text>
              <Text style={styles.warningText}>
                This drill requires a wall. Consider finding a sturdy tree or fence, or shift practice indoors.
              </Text>
            </View>
          )}

          <View style={styles.goalBox}>
            <Text style={styles.goalLabel}>DRILL OBJECTIVE</Text>
            <Text style={styles.goalText}>{step.goalDescription}</Text>
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
          <Text style={styles.startBtnText}>START CAMERA COACH</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderColor: '#222222',
    paddingBottom: 40,
    paddingHorizontal: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#222222',
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitleGroup: {
    flex: 1,
  },
  stepSubtitle: {
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
    marginBottom: 4,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Helvetica',
  },
  closeButton: {
    borderWidth: 1,
    borderColor: '#222222',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeButtonText: {
    color: '#666666',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1,
  },
  visualSection: {
    height: 180,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  visualLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    color: '#333333',
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
  },
  detailsContainer: {
    marginBottom: 24,
  },
  descriptionText: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Helvetica',
    lineHeight: 20,
    marginBottom: 20,
  },
  goalBox: {
    borderWidth: 1,
    borderColor: '#1f1f1f',
    padding: 16,
    backgroundColor: '#020202',
  },
  goalLabel: {
    color: '#666666',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  goalText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Helvetica',
    lineHeight: 18,
  },
  startBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 0,
  },
  startBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
  },
  
  // Custom Stick Figure Animation Styles
  guideContainer: {
    width: 200,
    height: 120,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  guideLine: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  floorLine: {
    bottom: 10,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#333333',
  },
  wallLineLeft: {
    top: 0,
    bottom: 10,
    left: 30,
    width: 1,
    backgroundColor: '#333333',
  },
  wallLineRight: {
    top: 0,
    bottom: 10,
    right: 30,
    width: 1,
    backgroundColor: '#333333',
  },

  // Pike Figure
  pikeFigureContainer: {
    position: 'absolute',
    left: 80,
    bottom: 10,
    width: 80,
    height: 80,
  },
  armLineVertical: {
    left: 40,
    bottom: 0,
    height: 35,
    width: 1.5,
  },
  torsoLineVertical: {
    left: 40,
    bottom: 35,
    height: 35,
    width: 1.5,
  },
  headNodeVertical: {
    position: 'absolute',
    left: 36,
    bottom: 28,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFFFFF',
  },
  legLineHorizontal: {
    left: 0,
    bottom: 70,
    width: 40,
    height: 1.5,
  },

  // Inverted Figure
  invertedFigureContainer: {
    position: 'absolute',
    bottom: 10,
    width: 40,
    height: 90,
    alignItems: 'center',
  },
  closeToRightWall: {
    right: 35,
  },
  backToWallPosition: {
    left: 40,
  },
  freestandingCenter: {
    alignSelf: 'center',
  },
  headNodeInverted: {
    position: 'absolute',
    top: 74,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFFFFF',
  },
  fullBodyLine: {
    top: 0,
    bottom: 15,
    width: 1.5,
  },
  handBaseLeft: {
    position: 'absolute',
    bottom: 8,
    left: 14,
    width: 3,
    height: 3,
    backgroundColor: '#FFFFFF',
  },
  handBaseRight: {
    position: 'absolute',
    bottom: 8,
    right: 14,
    width: 3,
    height: 3,
    backgroundColor: '#FFFFFF',
  },

  // Wall Taps Figure
  torsoOnlyLine: {
    top: 40,
    bottom: 15,
    width: 1.5,
  },
  tappingLegLine: {
    top: 5,
    left: 10,
    height: 40,
    width: 1.5,
    transformOrigin: 'bottom',
  },
  balanceLegLine: {
    top: 5,
    left: 19,
    height: 40,
    width: 1.5,
  },

  // New Guide Styles
  quadrupedContainer: {
    position: 'absolute',
    left: 60,
    bottom: 10,
    width: 80,
    height: 50,
  },
  quadrupedArm: {
    left: 60,
    bottom: 0,
    height: 30,
    width: 1.5,
    backgroundColor: '#FFFFFF',
  },
  quadrupedTorso: {
    left: 20,
    bottom: 30,
    width: 40,
    height: 1.5,
    backgroundColor: '#FFFFFF',
  },
  quadrupedThigh: {
    left: 20,
    bottom: 0,
    height: 30,
    width: 1.5,
    backgroundColor: '#FFFFFF',
  },
  headNodeQuadruped: {
    position: 'absolute',
    left: 56,
    bottom: 26,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFFFFF',
  },
  hollowBodyContainer: {
    position: 'absolute',
    left: 50,
    bottom: 20,
    width: 100,
    height: 30,
  },
  hollowBackLine: {
    left: 25,
    bottom: 0,
    width: 50,
    height: 1.5,
    backgroundColor: '#FFFFFF',
  },
  hollowLegs: {
    position: 'absolute',
    left: 75,
    bottom: 0,
    width: 30,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    transformOrigin: 'left',
  },
  hollowArms: {
    position: 'absolute',
    right: 75,
    bottom: 0,
    width: 30,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    transformOrigin: 'right',
  },
  headNodeHollow: {
    position: 'absolute',
    left: 20,
    bottom: -2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFFFFF',
  },
  torsoLinePike: {
    position: 'absolute',
    left: 40,
    bottom: 40,
    width: 30,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    transformOrigin: 'left',
  },
  legLinePike: {
    position: 'absolute',
    left: 10,
    bottom: 40,
    width: 30,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-45deg' }],
    transformOrigin: 'right',
  },
  headNodeVerticalPike: {
    position: 'absolute',
    left: 62,
    bottom: 12,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFFFFF',
  },
  boxGuide: {
    position: 'absolute',
    left: 65,
    bottom: 10,
    width: 35,
    height: 45,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#0a0a0a',
  },
  warningBox: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: 16,
    backgroundColor: '#0a0000',
    marginBottom: 20,
  },
  warningLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  warningText: {
    color: '#888888',
    fontSize: 13,
    fontFamily: 'Helvetica',
    lineHeight: 18,
  },
});
