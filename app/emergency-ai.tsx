import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Mic, X, Activity, AlertCircle, ShieldAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { VoiceOrchestrator, type VoiceState } from '@/src/services/ai/VoiceOrchestrator';
import { useAppColors } from '@/src/components/ui';

export default function VoiceAssistantScreen() {
  const { t } = useTranslation();
  const c = useAppColors();

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Pulse animation for the central orb
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    VoiceOrchestrator.setOnStateChange((newState) => {
      setVoiceState(newState);

      // Handle animations based on state
      if (newState === 'listening') {
        startPulse(1.5, 800);
      } else if (newState === 'processing') {
        startPulse(1.2, 400); // Faster pulse
      } else if (newState === 'speaking') {
        startPulse(1.3, 1000); // Smooth pulse
      } else {
        Animated.spring(pulseAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }
    });

    // Start listening automatically on mount
    startVoiceInteraction();

    return () => {
      VoiceOrchestrator.stop();
      VoiceOrchestrator.setOnStateChange(() => {}); // Clear listener
    };
  }, []);

  const startPulse = (scaleTo: number, duration: number) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: scaleTo,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const startVoiceInteraction = async () => {
    setError(null);
    setTranscription('');
    try {
      const response = await VoiceOrchestrator.listenAndRespond(
        (partialUserText) => setTranscription(partialUserText),
        (partialAiText) => setTranscription(partialAiText), // Show AI response text while speaking
      );

      // If the AI says it prepared an SOS, we should show the SOS confirmation screen
      if (response.actionTriggered === 'SOS_CONFIRMATION_REQUIRED') {
        router.push('/sos/active');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to initialize voice engine.');
    }
  };

  const handleStop = () => {
    VoiceOrchestrator.stop();
    router.back();
  };

  const getOrbColor = () => {
    switch (voiceState) {
      case 'listening':
        return '#ef4444'; // Red
      case 'processing':
        return '#3b82f6'; // Blue
      case 'speaking':
        return '#10b981'; // Green
      default:
        return c.surfaceVariant;
    }
  };

  const getStateText = () => {
    switch (voiceState) {
      case 'listening':
        return t('ai.voice.listening', 'Listening...');
      case 'processing':
        return t('ai.voice.processing', 'Processing offline...');
      case 'speaking':
        return t('ai.voice.speaking', 'Speaking...');
      default:
        return t('ai.voice.idle', 'Tap to speak');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0f172a' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleStop} style={styles.closeBtn}>
          <X color="#fff" size={24} />
        </TouchableOpacity>
        <View style={styles.badge}>
          <Activity color="#10b981" size={12} />
          <Text style={styles.badgeText}>On-Device AI</Text>
        </View>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      {/* Main Content */}
      <View style={styles.centerContainer}>
        {/* Animated Orb */}
        <Animated.View
          style={[
            styles.orbOuter,
            {
              backgroundColor: getOrbColor(),
              transform: [{ scale: pulseAnim }],
              opacity: voiceState === 'idle' ? 0.3 : 0.2,
            },
          ]}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (voiceState === 'idle') startVoiceInteraction();
            else VoiceOrchestrator.stop();
          }}
          style={[styles.orbInner, { backgroundColor: getOrbColor() }]}
        >
          {voiceState === 'idle' ? (
            <Mic color="#fff" size={48} />
          ) : (
            <Activity color="#fff" size={48} />
          )}
        </TouchableOpacity>

        {/* State and Transcription */}
        <View style={styles.textContainer}>
          <Text style={styles.stateText}>{getStateText()}</Text>
          <Text style={styles.transcriptionText} numberOfLines={3}>
            {transcription}
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <AlertCircle color="#ef4444" size={20} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Footer Instructions */}
      <View style={styles.footer}>
        <ShieldAlert color="#94a3b8" size={16} />
        <Text style={styles.footerText}>
          {t(
            'ai.voice.disclaimer',
            'AI runs completely offline on your device for strict privacy.',
          )}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  closeBtn: {
    padding: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbOuter: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  orbInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  textContainer: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  stateText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  transcriptionText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 32,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
});
