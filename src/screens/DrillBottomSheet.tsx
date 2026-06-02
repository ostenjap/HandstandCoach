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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DrillBottomSheetProps {
  step: DrillStep | null;
  visible: boolean;
  onClose: () => void;
  onStartCamera: () => void;
}

export default function DrillBottomSheet({
  step,
  visible,
  onClose,
  onStartCamera,
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
  // This draws a beautiful, minimal, moving stick figure showing correct alignment.
  const angleInterpolation = formAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2deg', '2deg'], // micro-wobble
  });

  const wallTapInterpolation = formAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '0deg'], // leg tapping off wall
  });

  const renderVisualGuide = () => {
    // Renders custom geometric stick figure layouts based on stepId
    switch (step.id) {
      case 1: // Wall Pike (L-Stand)
        return (
          <View style={styles.guideContainer}>
            {/* Ground */}
            <View style={[styles.guideLine, styles.floorLine]} />
            {/* Wall on Left */}
            <View style={[styles.guideLine, styles.wallLineLeft]} />
            
            {/* Pike Stick Figure */}
            <View style={styles.pikeFigureContainer}>
              {/* Hands/Arms (vertical stack) */}
              <View style={[styles.guideLine, styles.armLineVertical]} />
              {/* Torso/Head (vertical stack) */}
              <View style={[styles.guideLine, styles.torsoLineVertical]} />
              <View style={styles.headNodeVertical} />
              
              {/* Legs (horizontal at 90 deg resting on wall) */}
              <Animated.View 
                style={[
                  styles.guideLine, 
                  styles.legLineHorizontal,
                  { transform: [{ rotate: angleInterpolation }] }
                ]} 
              />
            </View>
          </View>
        );

      case 2: // Stomach-to-Wall
        return (
          <View style={styles.guideContainer}>
            {/* Ground */}
            <View style={[styles.guideLine, styles.floorLine]} />
            {/* Wall on Right */}
            <View style={[styles.guideLine, styles.wallLineRight]} />
            
            {/* Flat Inverted Line (close to wall) */}
            <Animated.View 
              style={[
                styles.invertedFigureContainer, 
                styles.closeToRightWall,
                { transform: [{ rotate: angleInterpolation }] }
              ]}
            >
              {/* Head */}
              <View style={styles.headNodeInverted} />
              {/* Full body line */}
              <View style={[styles.guideLine, styles.fullBodyLine]} />
            </Animated.View>
          </View>
        );

      case 3: // Back-to-Wall Kick-Up
        return (
          <View style={styles.guideContainer}>
            {/* Ground */}
            <View style={[styles.guideLine, styles.floorLine]} />
            {/* Wall on Left */}
            <View style={[styles.guideLine, styles.wallLineLeft]} />
            
            {/* Inverted body leaning, with shoulders stacked and heels touching wall */}
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

      case 4: // Heel/Wall Taps
        return (
          <View style={styles.guideContainer}>
            {/* Ground */}
            <View style={[styles.guideLine, styles.floorLine]} />
            {/* Wall on Left */}
            <View style={[styles.guideLine, styles.wallLineLeft]} />
            
            {/* Split/tap legs */}
            <View style={[styles.invertedFigureContainer, styles.freestandingCenter]}>
              <View style={styles.headNodeInverted} />
              {/* Torso & arms straight */}
              <View style={[styles.guideLine, styles.torsoOnlyLine]} />
              
              {/* Active tapping leg (taps wall on left) */}
              <Animated.View 
                style={[
                  styles.guideLine, 
                  styles.tappingLegLine,
                  { transform: [{ rotate: wallTapInterpolation }] }
                ]} 
              />
              {/* Stable balancing leg */}
              <View style={[styles.guideLine, styles.balanceLegLine]} />
            </View>
          </View>
        );

      case 5: // Bail & Catch
      case 6: // Freestanding
      default:
        return (
          <View style={styles.guideContainer}>
            {/* Ground */}
            <View style={[styles.guideLine, styles.floorLine]} />
            
            {/* Perfectly stacked freestanding line */}
            <Animated.View 
              style={[
                styles.invertedFigureContainer, 
                styles.freestandingCenter,
                { transform: [{ rotate: angleInterpolation }] }
              ]}
            >
              {/* Head */}
              <View style={styles.headNodeInverted} />
              {/* Stacked body */}
              <View style={[styles.guideLine, styles.fullBodyLine]} />
              {/* Mini hand stand base points */}
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
});
