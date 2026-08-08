import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { Map, Trash2, DownloadCloud, CheckCircle2 } from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, useAppColors } from '@/src/components/ui';
import { type, space } from '@/src/theme/tokens';
import { preferences } from '@/src/services/preferences';

const OFFLINE_MAP_KEY = 'yatri-shield.offline-map-status';

export default function OfflineMapsScreen() {
  const c = useAppColors();
  const [hasMap, setHasMap] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check if the user downloaded maps during onboarding
    const status = preferences.getString(OFFLINE_MAP_KEY) === 'downloaded';
    setHasMap(status);
  }, []);

  const handleDownload = () => {
    if (downloading) return;
    setDownloading(true);
    setProgress(0);

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;

      if (currentProgress >= 100) {
        clearInterval(interval);
        setProgress(100);
        setDownloading(false);
        setHasMap(true);
        preferences.set(OFFLINE_MAP_KEY, 'downloaded');
        Alert.alert('Success', 'Offline Map Pack downloaded successfully.');
      } else {
        setProgress(currentProgress);
      }
    }, 300);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Map Pack',
      'Are you sure you want to delete the offline map pack? You will not be able to see streets or terrain when offline.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            preferences.delete(OFFLINE_MAP_KEY);
            setHasMap(false);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Offline Maps' }} />
      <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
        <View style={{ alignItems: 'center', gap: space.sm, marginVertical: space.md }}>
          {hasMap ? (
            <CheckCircle2 size={48} color={c.success} />
          ) : (
            <Map size={48} color={c.primary} />
          )}
          <Text style={[type.title, { color: c.onSurface, textAlign: 'center' }]}>
            Offline Map Packs
          </Text>
          <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
            Download map tiles so Yatri Shield can render street and terrain data when you have no
            internet.
          </Text>
        </View>

        <View
          style={{ backgroundColor: c.surface, padding: space.md, borderRadius: 12, gap: space.sm }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[type.subtitle, { color: c.onSurface }]}>Himalayan Region (Demo)</Text>
              <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
                Terrain, Streets, Emergency POIs
              </Text>
            </View>
          </View>

          {hasMap ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: space.sm,
              }}
            >
              <View>
                <Text style={[type.caption, { color: '#16a34a', fontWeight: 'bold' }]}>
                  ● Downloaded
                </Text>
                <Text style={[type.caption, { color: c.onSurfaceVariant }]}>10.5 MB</Text>
              </View>
              <TouchableOpacity
                onPress={handleDelete}
                style={{ padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}
              >
                <Trash2 color="#ef4444" size={20} />
              </TouchableOpacity>
            </View>
          ) : downloading ? (
            <View style={{ gap: 8, marginTop: space.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[type.caption, { color: c.onSurface }]}>Downloading...</Text>
                <Text style={[type.caption, { color: c.primary }]}>{progress.toFixed(0)}%</Text>
              </View>
              <View style={{ height: 4, backgroundColor: c.surfaceVariant, borderRadius: 2 }}>
                <View
                  style={{ height: '100%', width: `${progress}%`, backgroundColor: c.primary }}
                />
              </View>
            </View>
          ) : (
            <View style={{ marginTop: space.sm }}>
              <Button
                label="Download Region (~10 MB)"
                onPress={handleDownload}
                icon={<DownloadCloud size={18} color="#fff" />}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
