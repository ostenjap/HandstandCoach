import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PathwayScreen from './src/screens/PathwayScreen';
import CoachScreen from './src/screens/CoachScreen';
import DrillBottomSheet from './src/screens/DrillBottomSheet';
import { loadUserProfile, saveUserProfile, resetStore, UserProfile } from './src/coaching/userStore';
import { DrillStep } from './src/coaching/poseTypes';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStepId, setActiveStepId] = useState<number | null>(null);
  const [selectedStepSheet, setSelectedStepSheet] = useState<DrillStep | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Load profile from storage at startup
  useEffect(() => {
    async function loadData() {
      const data = await loadUserProfile();
      setProfile(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleOnboardingComplete = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
  };

  const handleResetOnboarding = async () => {
    setLoading(true);
    const emptyProfile = await resetStore();
    setProfile(emptyProfile);
    setActiveStepId(null);
    setSelectedStepSheet(null);
    setSheetVisible(false);
    setLoading(false);
  };

  const handleSelectStep = (step: DrillStep) => {
    setSelectedStepSheet(step);
    setSheetVisible(true);
  };

  const handleStartCamera = () => {
    if (selectedStepSheet) {
      setActiveStepId(selectedStepSheet.id);
    }
  };

  const handleStepComplete = async (stepId: number) => {
    // Reload profile to get updated completedSteps and PRs
    const data = await loadUserProfile();
    setProfile(data);
  };

  const handleUpdateSettings = async (updates: Partial<UserProfile>) => {
    if (profile) {
      const updatedProfile = { ...profile, ...updates };
      const success = await saveUserProfile(updatedProfile);
      if (success) {
        setProfile(updatedProfile);
      }
    }
  };

  const handleCoachBack = () => {
    setActiveStepId(null);
  };

  if (loading) {
    const theme = profile?.theme || 'dark';
    return (
      <View style={[styles.center, theme === 'light' && styles.centerLight]}>
        <ActivityIndicator size="large" color={theme === 'light' ? '#000000' : '#FFFFFF'} />
      </View>
    );
  }

  const theme = profile?.theme || 'dark';

  // State-based Routing
  if (profile && !profile.hasCompletedOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} theme={theme} />;
  }

  return (
    <View style={[styles.container, theme === 'light' && styles.containerLight]}>
      {activeStepId !== null ? (
        <CoachScreen
          stepId={activeStepId}
          onBack={handleCoachBack}
          onStepComplete={handleStepComplete}
          theme={theme}
        />
      ) : (
        <PathwayScreen
          profile={profile!}
          onSelectStep={handleSelectStep}
          onResetOnboarding={handleResetOnboarding}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {/* Persistent overlay bottom sheet */}
      <DrillBottomSheet
        step={selectedStepSheet}
        visible={sheetVisible && activeStepId === null}
        onClose={() => setSheetVisible(false)}
        onStartCamera={handleStartCamera}
        profile={profile}
      />
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  centerLight: {
    backgroundColor: '#FFFFFF',
  },
});
