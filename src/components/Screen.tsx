import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { useAppColors } from './ui';
import { space, type } from '@/src/theme/tokens';

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  hideBack = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  hideBack?: boolean;
}) {
  const c = useAppColors();
  const content = (
    <View style={[styles.content, !scroll && styles.fill]}>
      {title && (
        <View style={styles.headingRow}>
          {!hideBack && router.canGoBack() && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={c.onSurface} size={28} />
            </TouchableOpacity>
          )}
          <View style={styles.headingText}>
            <Text style={[type.display, { color: c.onSurface }]}>{title}</Text>
            {subtitle && <Text style={[type.body, { color: c.onSurfaceVariant }]}>{subtitle}</Text>}
          </View>
        </View>
      )}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: c.surfaceVariant }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 120 },
  content: { padding: space.md, gap: space.md },
  fill: { flex: 1 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.xs },
  backButton: { marginRight: space.sm, marginTop: 4, padding: 4, marginLeft: -8 },
  headingText: { flex: 1, gap: space.xs },
});
