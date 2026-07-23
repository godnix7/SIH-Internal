import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useAppColors } from '@/src/components/ui';
import { type, space } from '@/src/theme/tokens';

export function CustomSplashScreen() {
  const c = useAppColors();

  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <ShieldCheck size={100} color={c.primary} strokeWidth={1.5} />
        </View>
        <Text style={[type.display, { color: c.onSurface, marginTop: space.lg }]}>
          Yatri Shield
        </Text>
        <Text style={[type.body, { color: c.onSurfaceVariant, marginTop: space.xs }]}>
          Next-Gen Ecosystem Management
        </Text>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator size="large" color={c.primary} style={{ marginBottom: space.md }} />
        <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
          v1.0.0-SIH • DPDP Act Compliant
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    padding: 24,
    borderRadius: 40,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
});
