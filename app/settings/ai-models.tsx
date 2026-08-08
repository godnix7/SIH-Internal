import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  createDownloadResumable,
  deleteAsync,
} from 'expo-file-system/legacy';
import { Cpu, Trash2, DownloadCloud, Database, Mic } from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, useAppColors } from '@/src/components/ui';
import { type, space } from '@/src/theme/tokens';

type ModelInfo = {
  name: string;
  type: string;
  filename: string;
  path: string;
  url: string;
  sizeBytes: number;
  exists: boolean;
  isDownloading: boolean;
  progress: number;
};

const MODELS = [
  {
    name: 'Yatri Voice Engine (Whisper)',
    type: 'Speech-to-Text',
    filename: 'ggml-tiny.bin',
    path: `${documentDirectory}ggml-tiny.bin`,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
  },
  {
    name: 'Yatri LLM (Gemma 2B INT4)',
    type: 'Text Generation',
    filename: 'gemma-2b-q4_k_m.gguf',
    path: `${documentDirectory}models/gemma-2b-q4_k_m.gguf`,
    url: 'https://huggingface.co/lmstudio-community/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
  },
];

export default function AIModelsScreen() {
  const c = useAppColors();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkModels();
  }, []);

  const checkModels = async () => {
    try {
      const updatedModels: ModelInfo[] = [];
      for (const m of MODELS) {
        const info = await getInfoAsync(m.path);
        updatedModels.push({
          ...m,
          sizeBytes: info.exists && !info.isDirectory ? info.size : 0,
          exists: info.exists,
          isDownloading: false,
          progress: 0,
        });
      }
      setModels(updatedModels);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = async (index: number) => {
    const m = models[index];
    const newModels = [...models];
    newModels[index].isDownloading = true;
    setModels(newModels);

    try {
      // Ensure directory exists for models folder
      if (m.path.includes('models/')) {
        await makeDirectoryAsync(`${documentDirectory}models/`, { intermediates: true });
      }

      const downloadResumable = createDownloadResumable(m.url, m.path, {}, (downloadProgress) => {
        const progress =
          (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
        setModels((current) => {
          const up = [...current];
          up[index].progress = progress;
          return up;
        });
      });

      await downloadResumable.downloadAsync();
      await checkModels(); // refresh state
    } catch (e) {
      Alert.alert('Download Error', 'Failed to download the model.');
      setModels((current) => {
        const up = [...current];
        up[index].isDownloading = false;
        return up;
      });
    }
  };

  const handleDelete = (index: number) => {
    const m = models[index];
    Alert.alert(
      'Delete Model',
      `Are you sure you want to delete ${m.name}? This will free up storage but disable offline features.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAsync(m.path, { idempotent: true });
              await checkModels();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete model.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: c.surface,
        }}
      >
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const totalSize = models.reduce((acc, curr) => acc + curr.sizeBytes, 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'AI Models & Storage' }} />
      <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
        <View style={{ alignItems: 'center', gap: space.sm, marginVertical: space.md }}>
          <Cpu size={48} color={c.primary} />
          <Text style={[type.title, { color: c.onSurface, textAlign: 'center' }]}>
            On-Device AI Models
          </Text>
          <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
            Yatri Shield runs AI models directly on your device to ensure privacy and functionality
            during network outages.
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surface,
            padding: space.md,
            borderRadius: 12,
            gap: 12,
          }}
        >
          <Database color={c.primary} size={24} />
          <View>
            <Text style={[type.caption, { color: c.onSurfaceVariant }]}>Total AI Storage Used</Text>
            <Text style={[type.title, { color: c.onSurface }]}>{formatBytes(totalSize)}</Text>
          </View>
        </View>

        {models.map((m, i) => (
          <View
            key={m.filename}
            style={{
              backgroundColor: c.surface,
              padding: space.md,
              borderRadius: 12,
              gap: space.sm,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {m.type === 'Speech-to-Text' ? (
                    <Mic size={16} color={c.primary} />
                  ) : (
                    <Cpu size={16} color={c.primary} />
                  )}
                  <Text style={[type.subtitle, { color: c.onSurface }]}>{m.name}</Text>
                </View>
                <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
                  {m.type} • {m.filename}
                </Text>
              </View>
            </View>

            {m.exists ? (
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
                    ● Installed Offline
                  </Text>
                  <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
                    {formatBytes(m.sizeBytes)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(i)}
                  style={{ padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}
                >
                  <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
              </View>
            ) : m.isDownloading ? (
              <View style={{ gap: 8, marginTop: space.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[type.caption, { color: c.onSurface }]}>Downloading...</Text>
                  <Text style={[type.caption, { color: c.primary }]}>{m.progress.toFixed(1)}%</Text>
                </View>
                <View style={{ height: 4, backgroundColor: c.surfaceVariant, borderRadius: 2 }}>
                  <View
                    style={{ height: '100%', width: `${m.progress}%`, backgroundColor: c.primary }}
                  />
                </View>
              </View>
            ) : (
              <View style={{ marginTop: space.sm }}>
                <Button
                  label={`Download Model (~${m.type === 'Text Generation' ? '1380' : '75'} MB)`}
                  onPress={() => handleDownload(i)}
                  icon={<DownloadCloud size={18} color="#fff" />}
                />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
