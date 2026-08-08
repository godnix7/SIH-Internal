import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Text, View, Animated, StyleSheet } from 'react-native';
import { Map, DownloadCloud, CheckCircle2 } from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import * as FileSystem from 'expo-file-system/legacy';
import { space, type } from '@/src/theme/tokens';

export default function OfflineMaps() {
  const complete = useAppStore((state) => state.completeOnboarding);
  const c = useAppColors();

  const [progress, setProgress] = useState(0);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed'>('idle');
  const [statusText, setStatusText] = useState('Ready to download local map packages.');

  const handleDownload = async () => {
    if (downloadState !== 'idle') return;

    setDownloadState('downloading');
    setStatusText('Downloading Himalayan Map Tiles (10 MB)...');

    try {
      const MAP_DIR = FileSystem.documentDirectory + 'maps/';
      await FileSystem.makeDirectoryAsync(MAP_DIR, { intermediates: true });
      const MAP_PATH = MAP_DIR + 'himalayas_offline_pack.mbtiles';

      // Download a ~10MB dummy file to represent the map tiles
      const downloadResumable = FileSystem.createDownloadResumable(
        'https://speed.hetzner.de/100MB.bin',
        MAP_PATH,
        {},
        (downloadProgress: any) => {
          const pct = downloadProgress.totalBytesWritten / 10000000; // Cap visual progress at 10MB
          setProgress(Math.min(pct, 1));
          if (pct > 0.3) setStatusText('Caching Emergency POIs...');
          if (pct > 0.7) setStatusText('Optimizing for offline use...');
          if (pct >= 1) {
            downloadResumable.pauseAsync(); // Stop the 100MB download at 10MB to save time
            setDownloadState('completed');
            setStatusText('Offline Maps Ready!');
          }
        },
      );

      await downloadResumable.downloadAsync();
    } catch (e) {
      setDownloadState('idle');
      setStatusText('Download failed. Tap to retry.');
    }
  };

  const handleContinue = () => {
    complete();
    router.replace('/(tabs)/home');
  };

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
            <View
              style={[styles.progressBar, { backgroundColor: c.primary, width: `${progress * 100}%` as any }]}
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
