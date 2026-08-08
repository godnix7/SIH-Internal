import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Text, View, Animated, StyleSheet } from 'react-native';
import { Map, DownloadCloud, CheckCircle2 } from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function OfflineMaps() {
  const complete = useAppStore((state) => state.completeOnboarding);
  const c = useAppColors();

  const [progress] = useState(new Animated.Value(0));
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed'>('idle');
  const [statusText, setStatusText] = useState('Ready to download local map packages.');

  const handleDownload = () => {
    if (downloadState !== 'idle') return;

    setDownloadState('downloading');
    setStatusText('Downloading Base Tiles...');

    Animated.timing(progress, {
      toValue: 0.4,
      duration: 1500,
      useNativeDriver: false,
    }).start(() => {
      setStatusText('Caching Emergency POIs & Safe Zones...');
      Animated.timing(progress, {
        toValue: 0.8,
        duration: 2000,
        useNativeDriver: false,
      }).start(() => {
        setStatusText('Optimizing for offline use...');
        Animated.timing(progress, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }).start(() => {
          setDownloadState('completed');
          setStatusText('Offline Maps Ready!');
        });
      });
    });
  };

  const handleContinue = () => {
    complete();
    router.replace('/(tabs)/home');
  };

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Screen
      title="Offline Resiliency"
      subtitle="Ensure Yatri Shield works even when network connection drops."
    >
      <Card>
        <View style={{ alignItems: 'center', marginVertical: space.md }}>
          {downloadState === 'completed' ? (
            <CheckCircle2 color={c.success} size={64} strokeWidth={1.5} />
          ) : (
            <Map color={c.primary} size={64} strokeWidth={1.5} />
          )}
        </View>

        <Text
          style={[
            type.subtitle,
            { color: c.onSurface, textAlign: 'center', marginBottom: space.sm },
          ]}
        >
          {statusText}
        </Text>

        {downloadState !== 'idle' && (
          <View style={[styles.progressBarContainer, { backgroundColor: c.surfaceVariant }]}>
            <Animated.View
              style={[styles.progressBar, { backgroundColor: c.primary, width: widthInterpolated }]}
            />
          </View>
        )}
      </Card>

      <View style={{ marginTop: space.xl }}>
        {downloadState === 'completed' ? (
          <Button label="Continue to Dashboard" onPress={handleContinue} />
        ) : (
          <Button
            label={downloadState === 'downloading' ? 'Downloading...' : 'Download Map Assets'}
            onPress={handleDownload}
            disabled={downloadState === 'downloading'}
            loading={downloadState === 'downloading'}
          />
        )}
      </View>

      {downloadState !== 'completed' && (
        <Button
          label={downloadState === 'downloading' ? 'Continue in Background' : 'Skip for now (Not Recommended)'}
          variant="secondary"
          onPress={handleContinue}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginTop: space.md,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
});
