import { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Vibration } from 'react-native';
import { router } from 'expo-router';
import {
  Sparkles,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Volume2,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, useAppColors } from '@/src/components/ui';
import { edgeAiGuidance, EmergencyProtocol } from '@/src/services/edgeAiGuidance';
import { space, type } from '@/src/theme/tokens';

export default function EmergencyAIScreen() {
  const c = useAppColors();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeProtocolId, setActiveProtocolId] = useState<string | null>(null);
  const [voicePlayingId, setVoicePlayingId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const categories = edgeAiGuidance.getAllCategories();

  const allMatched = edgeAiGuidance.searchProtocols(query);
  const protocols =
    selectedCategory === 'All'
      ? allMatched
      : allMatched.filter((p) => p.category === selectedCategory);

  const handleStartVoiceAssist = (protocol: EmergencyProtocol) => {
    if (voicePlayingId === protocol.id) {
      setVoicePlayingId(null);
      Vibration.cancel();
      return;
    }
    setVoicePlayingId(protocol.id);
    setCurrentStepIndex(0);
    Vibration.vibrate(100);
  };

  const handleNextStep = (protocol: EmergencyProtocol) => {
    if (currentStepIndex < protocol.immediateSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      Vibration.vibrate([100, 100], false);
    } else {
      setVoicePlayingId(null);
    }
  };

  return (
    <Screen scroll={false} hideBack={true}>
      <View style={{ flex: 1, paddingVertical: space.md, gap: space.md }}>
        {/* Header */}
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: space.xs, marginRight: space.sm }}
            accessibilityLabel="Back to Safety Shield"
          >
            <ArrowLeft color={c.onSurface} size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Sparkles color={c.primary} size={22} />
              <Text style={[type.title, { color: c.onSurface, fontWeight: '800' }]}>
                Offline Edge AI Guidance
              </Text>
            </View>
            <Text style={[type.caption, { color: '#16a34a', fontWeight: 'bold' }]}>
              ● ZERO-CONNECTIVITY READY (ON-DEVICE TRIAGE)
            </Text>
          </View>
        </View>

        {/* Search Input Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surfaceVariant,
            borderRadius: 12,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderWidth: 1,
            borderColor: 'rgba(156, 163, 175, 0.3)',
          }}
        >
          <Search color={c.onSurfaceVariant} size={20} style={{ marginRight: space.sm }} />
          <TextInput
            placeholder="Search symptoms (e.g. bleeding, snake, fall, cough)..."
            placeholderTextColor={c.onSurfaceVariant}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setVoicePlayingId(null);
            }}
            style={[type.body, { color: c.onSurface, flex: 1 }]}
            clearButtonMode="always"
          />
        </View>

        {/* Category Tabs */}
        <View style={{ height: 44 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.xs }}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  setSelectedCategory(cat);
                  setVoicePlayingId(null);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selectedCategory === cat ? c.primary : c.surfaceVariant,
                  borderWidth: 1,
                  borderColor: selectedCategory === cat ? c.primary : 'rgba(156, 163, 175, 0.3)',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={[
                    type.caption,
                    {
                      color: selectedCategory === cat ? '#ffffff' : c.onSurfaceVariant,
                      fontWeight: selectedCategory === cat ? 'bold' : '600',
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Protocols List */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl }}
        >
          {protocols.length === 0 ? (
            <Card style={{ alignItems: 'center', padding: space.xl, gap: space.sm }}>
              <ShieldAlert color={c.onSurfaceVariant} size={40} />
              <Text style={[type.subtitle, { color: c.onSurface, textAlign: 'center' }]}>
                No exact offline protocol match
              </Text>
              <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
                We could not find an offline triage protocol matching your query. If you or someone
                else is in life-threatening distress, press the SOS emergency button immediately.
              </Text>
              <Button
                label="Trigger Active SOS"
                variant="destructive"
                onPress={() => router.push('/sos/active')}
              />
            </Card>
          ) : (
            protocols.map((p) => {
              const isExpanded = activeProtocolId === p.id;
              const isVoicePlaying = voicePlayingId === p.id;

              return (
                <Card
                  key={p.id}
                  style={{
                    borderWidth: isExpanded ? 2 : 1,
                    borderColor: isExpanded ? c.primary : 'rgba(156, 163, 175, 0.3)',
                    backgroundColor: c.surface,
                    gap: space.sm,
                  }}
                >
                  {/* Card Title & Badges */}
                  <TouchableOpacity
                    onPress={() => setActiveProtocolId(isExpanded ? null : p.id)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={[
                          type.caption,
                          { color: c.primary, fontWeight: '700', textTransform: 'uppercase' },
                        ]}
                      >
                        {p.category}
                      </Text>
                      <View
                        style={{
                          backgroundColor: p.severity === 'CRITICAL' ? '#fee2e2' : '#fef3c7',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={[
                            type.caption,
                            {
                              color: p.severity === 'CRITICAL' ? '#dc2626' : '#d97706',
                              fontWeight: 'bold',
                              fontSize: 10,
                            },
                          ]}
                        >
                          {p.severity} PRIORITY
                        </Text>
                      </View>
                    </View>

                    <Text style={[type.subtitle, { color: c.onSurface, fontWeight: '700' }]}>
                      {p.title}
                    </Text>

                    <Text style={[type.caption, { color: c.onSurfaceVariant, marginTop: 4 }]}>
                      Tap to view diagnostic criteria & step-by-step first-aid protocol →
                    </Text>
                  </TouchableOpacity>

                  {/* Expanded Protocol Details */}
                  {isExpanded && (
                    <View
                      style={{
                        gap: space.md,
                        marginTop: space.sm,
                        borderTopWidth: 1,
                        borderTopColor: 'rgba(156, 163, 175, 0.3)',
                        paddingTop: space.sm,
                      }}
                    >
                      {/* Voice Guidance Bar */}
                      <View
                        style={{
                          backgroundColor: c.surfaceVariant,
                          padding: space.sm,
                          borderRadius: 8,
                          gap: space.xs,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Volume2 color={isVoicePlaying ? c.primary : c.onSurface} size={20} />
                            <Text style={[type.body, { color: c.onSurface, fontWeight: '700' }]}>
                              Hands-Free Audio & Haptic Assist
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleStartVoiceAssist(p)}
                            style={{
                              backgroundColor: isVoicePlaying ? '#dc2626' : c.primary,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={[type.caption, { color: '#ffffff', fontWeight: 'bold' }]}>
                              {isVoicePlaying ? 'Stop Mode' : 'Start Guide'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {isVoicePlaying && (
                          <View
                            style={{
                              backgroundColor: '#1e293b',
                              padding: space.md,
                              borderRadius: 8,
                              marginTop: space.xs,
                            }}
                          >
                            <Text
                              style={[
                                type.caption,
                                {
                                  color: '#38bdf8',
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase',
                                  marginBottom: 4,
                                },
                              ]}
                            >
                              Step {currentStepIndex + 1} of {p.immediateSteps.length} (Haptic Sync
                              Active)
                            </Text>
                            <Text style={[type.subtitle, { color: '#ffffff', lineHeight: 24 }]}>
                              {p.immediateSteps[currentStepIndex]}
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleNextStep(p)}
                              style={{
                                backgroundColor: '#3b82f6',
                                padding: 12,
                                borderRadius: 6,
                                alignItems: 'center',
                                marginTop: space.md,
                              }}
                            >
                              <Text style={[type.body, { color: '#ffffff', fontWeight: 'bold' }]}>
                                {currentStepIndex < p.immediateSteps.length - 1
                                  ? 'Next Step →'
                                  : 'Finish Guidance ✓'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {/* Symptoms Diagnostic Checklist */}
                      <View style={{ gap: 6 }}>
                        <Text style={[type.body, { color: c.onSurface, fontWeight: '700' }]}>
                          🔍 Diagnostic Symptoms Checklist:
                        </Text>
                        {p.symptoms.map((sym, i) => (
                          <View
                            key={i}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'flex-start',
                              gap: 8,
                              paddingLeft: 4,
                            }}
                          >
                            <Text style={{ color: c.primary }}>▪</Text>
                            <Text
                              style={[
                                type.body,
                                { color: c.onSurfaceVariant, flex: 1, lineHeight: 20 },
                              ]}
                            >
                              {sym}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Immediate Steps */}
                      <View style={{ gap: 8 }}>
                        <Text style={[type.body, { color: c.onSurface, fontWeight: '700' }]}>
                          🚨 Immediate Emergency Action Steps:
                        </Text>
                        {p.immediateSteps.map((step, idx) => (
                          <View
                            key={idx}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'flex-start',
                              gap: 10,
                              backgroundColor:
                                isVoicePlaying && currentStepIndex === idx
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : 'transparent',
                              padding: isVoicePlaying && currentStepIndex === idx ? 8 : 0,
                              borderRadius: 6,
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: c.primary,
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: 2,
                              }}
                            >
                              <Text
                                style={[type.caption, { color: '#ffffff', fontWeight: 'bold' }]}
                              >
                                {idx + 1}
                              </Text>
                            </View>
                            <Text
                              style={[type.body, { color: c.onSurface, flex: 1, lineHeight: 22 }]}
                            >
                              {step}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Do's and Don'ts */}
                      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
                        <View
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(22, 163, 74, 0.08)',
                            padding: space.sm,
                            borderRadius: 8,
                            gap: 6,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <CheckCircle color="#16a34a" size={16} />
                            <Text style={[type.caption, { color: '#16a34a', fontWeight: 'bold' }]}>
                              CRITICAL DO&apos;S
                            </Text>
                          </View>
                          {p.dos.map((d, i) => (
                            <Text
                              key={i}
                              style={[type.caption, { color: c.onSurface, lineHeight: 18 }]}
                            >
                              ✓ {d}
                            </Text>
                          ))}
                        </View>
                        <View
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(220, 38, 38, 0.08)',
                            padding: space.sm,
                            borderRadius: 8,
                            gap: 6,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <XCircle color="#dc2626" size={16} />
                            <Text style={[type.caption, { color: '#dc2626', fontWeight: 'bold' }]}>
                              DANGEROUS DON&apos;TS
                            </Text>
                          </View>
                          {p.donts.map((d, i) => (
                            <Text
                              key={i}
                              style={[type.caption, { color: c.onSurface, lineHeight: 18 }]}
                            >
                              ✕ {d}
                            </Text>
                          ))}
                        </View>
                      </View>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}
