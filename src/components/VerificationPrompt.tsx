import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useAppStore } from '../stores/useAppStore';
import { escalationManager } from '../services/escalationManager';

export function VerificationPrompt() {
  const prompt = useAppStore((state) => state.verificationPrompt);
  const clearPrompt = useAppStore((state) => state.clearVerificationPrompt);

  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (!prompt) return;

    setTimeLeft(prompt.countdown);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          clearPrompt(); // Prompt goes away, escalationManager handles the trigger
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [prompt, clearPrompt]);

  if (!prompt) return null;

  return (
    <Modal transparent animationType="fade" visible={!!prompt}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Are you safe?</Text>
          <Text style={styles.subtitle}>
            We detected a severe impact. If you do not respond, we will automatically dispatch
            emergency services to your location.
          </Text>

          <Text style={styles.timer}>{timeLeft}s</Text>

          <TouchableOpacity
            style={styles.safeButton}
            onPress={() => {
              escalationManager.cancelVerification();
              clearPrompt();
            }}
          >
            <Text style={styles.safeButtonText}>I'm Safe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 24,
  },
  safeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  safeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
