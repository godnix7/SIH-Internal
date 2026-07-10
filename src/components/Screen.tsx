import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppColors } from './ui';
import { space, type } from '@/src/theme/tokens';

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  const c = useAppColors();
  const content = (
    <View style={[styles.content, !scroll && styles.fill]}>
      {title && (
        <View style={styles.heading}>
          <Text style={[type.display, { color: c.ink }]}>{title}</Text>
          {subtitle && <Text style={[type.body, { color: c.slate }]}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: c.paper }]}>
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
  heading: { gap: space.xs, marginBottom: space.xs },
});
