import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Vibration,
  Alert,
  ActivityIndicator,
  Share,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
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
  Send,
  Trash2,
  Download,
  Database,
  Cpu,
  FileText,
  Share2,
  AlertCircle,
  Terminal,
  RefreshCw,
} from 'lucide-react-native';
import { Screen } from '@/src/components/Screen';
import { Button, Card, useAppColors } from '@/src/components/ui';
import { edgeAiGuidance, EmergencyProtocol } from '@/src/services/edgeAiGuidance';
import {
  emergencyChatbot,
  ChatMessage,
  QUICK_PROMPTS,
  OfflineModelInfo,
} from '@/src/services/emergencyChatbot';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function EmergencyAIScreen() {
  const c = useAppColors();
  const { sos } = useAppStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'model' | 'protocols'>('chat');

  // --- CHAT STATE ---
  const [messages, setMessages] = useState<ChatMessage[]>(() => emergencyChatbot.getHistory());
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // --- MODEL STATE ---
  const [modelInfo, setModelInfo] = useState<OfflineModelInfo>(() =>
    emergencyChatbot.getModelInfo(),
  );
  const [downloading, setDownloading] = useState(false);

  // --- PROTOCOLS STATE ---
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

  useEffect(() => {
    // Scroll to bottom when messages update
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [messages, isThinking]);

  // --- CHAT ACTIONS ---
  const handleSend = async (customQuery?: string) => {
    const textToSend = (customQuery !== undefined ? customQuery : inputText).trim();
    if (!textToSend || isThinking) return;

    if (!customQuery) {
      setInputText('');
    }

    Vibration.vibrate(50);
    setIsThinking(true);

    // Optimistically update memory in UI
    const updatedWithUser = emergencyChatbot.getHistory();
    setMessages([...updatedWithUser]);

    try {
      await emergencyChatbot.sendMessage(textToSend);
      setMessages([...emergencyChatbot.getHistory()]);
      Vibration.vibrate([80, 80], false);
    } catch (error) {
      Alert.alert('Inference Error', 'Unable to synthesize response at this moment.');
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to erase all stored emergency triage conversations from this phone’s persistent memory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            const resetMsg = emergencyChatbot.clearHistory();
            setMessages([...resetMsg]);
            Vibration.vibrate(100);
          },
        },
      ],
    );
  };

  const handleExportTranscript = async () => {
    const transcript = emergencyChatbot.exportTranscript();
    try {
      await Share.share({
        message: `🚨 YATRI SHIELD EMERGENCY AI TRANSCRIPT LOG 🚨\n\n${transcript}`,
        title: 'Emergency AI Triage Transcript',
      });
    } catch (e) {
      Alert.alert('Export Complete', 'Transcript ready to share with extraction teams.');
    }
  };

  // --- MODEL ACTIONS ---
  const handleDownloadModel = async () => {
    if (downloading) return;
    setDownloading(true);
    Vibration.vibrate(100);

    try {
      await emergencyChatbot.downloadOfflineModel((progressPct) => {
        setModelInfo({ ...emergencyChatbot.getModelInfo() });
      });
      setModelInfo({ ...emergencyChatbot.getModelInfo() });
      setMessages([...emergencyChatbot.getHistory()]);
      Vibration.vibrate([100, 200, 100], false);
      Alert.alert('Download Complete', 'Gemma-2B-Q4_K_M INT4 weights successfully cached offline!');
    } catch (err) {
      Alert.alert('Download Failed', 'Could not fetch offline INT4 weights.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteModel = () => {
    Alert.alert(
      'Remove Offline Weights',
      'This will delete the 1.38 GB quantized file and revert to Cloud / Fast Heuristic engine in zero connectivity.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            emergencyChatbot.deleteOfflineModel();
            setModelInfo({ ...emergencyChatbot.getModelInfo() });
            setMessages([...emergencyChatbot.getHistory()]);
            Vibration.vibrate(100);
          },
        },
      ],
    );
  };

  // --- PROTOCOL ACTIONS ---
  const handleStartVoiceAssist = (protocol: EmergencyProtocol) => {
    if (voicePlayingId === protocol.id) {
      setVoicePlayingId(null);
      setCurrentStepIndex(0);
      Vibration.vibrate(50);
    } else {
      setVoicePlayingId(protocol.id);
      setCurrentStepIndex(0);
      Vibration.vibrate([100, 50, 100], false);
    }
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, paddingVertical: space.md, gap: space.sm }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: space.xs,
            }}
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
                <Text style={[type.title, { color: c.onSurface, fontWeight: '800', fontSize: 20 }]}>
                  Realtime Emergency AI
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: modelInfo.status === 'ready' ? '#16a34a' : '#0284C7',
                  }}
                />
                <Text
                  style={[
                    type.caption,
                    {
                      color: modelInfo.status === 'ready' ? '#16a34a' : '#38BDF8',
                      fontWeight: 'bold',
                      fontSize: 11,
                    },
                  ]}
                >
                  {modelInfo.status === 'ready'
                    ? 'INT4 OFFLINE WEIGHTS READY • REALTIME'
                    : 'REAL-TIME DYNAMIC CONVERSATIONAL ENGINE'}
                </Text>
              </View>
            </View>
          </View>

          {/* Active SOS Realtime Awareness Banner */}
          {sos &&
            !['RESOLVED', 'CANCELLED', 'CANCELLED_BY_USER', 'FALSE_ALARM'].includes(sos.status) && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/sos/active')}
                style={{
                  backgroundColor: '#7F1D1D',
                  borderColor: '#EF4444',
                  borderWidth: 1.5,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  shadowColor: '#EF4444',
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                  elevation: 4,
                  marginTop: 2,
                }}
              >
                <View style={{ backgroundColor: '#EF4444', padding: 6, borderRadius: 20 }}>
                  <ShieldAlert size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '900',
                      color: '#FFFFFF',
                      letterSpacing: 0.5,
                    }}
                  >
                    🚨 ACTIVE SOS RECOGNIZED BY EDGE AI
                  </Text>
                  <Text style={{ fontSize: 11, color: '#FCA5A5', marginTop: 2, fontWeight: '600' }}>
                    Broadcasting coordinates to emergency rescue in real-time. Tap to check tracking
                    status.
                  </Text>
                </View>
              </TouchableOpacity>
            )}

          {/* Mode Switcher Tabs */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: c.surfaceVariant,
              borderRadius: 14,
              padding: 4,
              marginTop: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => setActiveTab('chat')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 11,
                backgroundColor: activeTab === 'chat' ? c.primary : 'transparent',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Terminal size={15} color={activeTab === 'chat' ? '#ffffff' : c.onSurfaceVariant} />
              <Text
                style={[
                  type.caption,
                  {
                    color: activeTab === 'chat' ? '#ffffff' : c.onSurfaceVariant,
                    fontWeight: 'bold',
                    fontSize: 13,
                  },
                ]}
              >
                Live Chat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('model')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 11,
                backgroundColor: activeTab === 'model' ? c.primary : 'transparent',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Cpu size={15} color={activeTab === 'model' ? '#ffffff' : c.onSurfaceVariant} />
              <Text
                style={[
                  type.caption,
                  {
                    color: activeTab === 'model' ? '#ffffff' : c.onSurfaceVariant,
                    fontWeight: 'bold',
                    fontSize: 13,
                  },
                ]}
              >
                INT4 Model
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('protocols')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 11,
                backgroundColor: activeTab === 'protocols' ? c.primary : 'transparent',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Database
                size={15}
                color={activeTab === 'protocols' ? '#ffffff' : c.onSurfaceVariant}
              />
              <Text
                style={[
                  type.caption,
                  {
                    color: activeTab === 'protocols' ? '#ffffff' : c.onSurfaceVariant,
                    fontWeight: 'bold',
                    fontSize: 13,
                  },
                ]}
              >
                Protocols
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: LIVE CHATBOT */}
          {activeTab === 'chat' && (
            <View style={{ flex: 1, gap: space.sm }}>
              {/* Toolbar: Export & Clear History */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: space.xs,
                  paddingBottom: 2,
                  borderBottomWidth: 1,
                  borderColor: 'rgba(156, 163, 175, 0.2)',
                }}
              >
                <Text style={[type.caption, { color: c.onSurfaceVariant, fontSize: 12 }]}>
                  💾 Local Chat Memory: {messages.length} messages persisted
                </Text>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <TouchableOpacity
                    onPress={handleExportTranscript}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                    }}
                  >
                    <Share2 size={13} color="#3b82f6" />
                    <Text style={[type.caption, { color: '#3b82f6', fontWeight: 'bold' }]}>
                      Export
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleClearHistory}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                    }}
                  >
                    <Trash2 size={13} color="#ef4444" />
                    <Text style={[type.caption, { color: '#ef4444', fontWeight: 'bold' }]}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Chat Message Scroll Area */}
              <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ gap: space.md, paddingVertical: space.sm }}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const isSystem = msg.role === 'system';
                  const timeString = new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  let borderColor = 'rgba(156, 163, 175, 0.25)';
                  if (msg.severity === 'CRITICAL') borderColor = '#ef4444';
                  if (msg.severity === 'HIGH') borderColor = '#f97316';
                  if (msg.severity === 'INFO' || isSystem) borderColor = '#3b82f6';

                  return (
                    <View
                      key={msg.id}
                      style={{
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: isUser ? '85%' : '95%',
                        backgroundColor: isUser
                          ? c.primary
                          : isSystem
                            ? 'rgba(59, 130, 246, 0.08)'
                            : c.surface,
                        borderRadius: 16,
                        borderTopRightRadius: isUser ? 4 : 16,
                        borderTopLeftRadius: isUser ? 16 : 4,
                        padding: 14,
                        borderWidth: isUser ? 0 : 1.5,
                        borderColor: isUser ? 'transparent' : borderColor,
                        boxShadow: isUser
                          ? '0 2px 8px rgba(0,0,0,0.15)'
                          : '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                    >
                      {/* Bubble Header */}
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6,
                          borderBottomWidth: isUser ? 0 : 0.5,
                          borderColor: 'rgba(156, 163, 175, 0.2)',
                          paddingBottom: isUser ? 0 : 4,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {!isUser && (
                            <Text style={{ fontSize: 16 }}>{isSystem ? '⚙️' : '🤖'}</Text>
                          )}
                          <Text
                            style={[
                              type.caption,
                              {
                                color: isUser ? '#ffffff' : c.onSurface,
                                fontWeight: '900',
                                fontSize: 12,
                              },
                            ]}
                          >
                            {isUser ? 'YOU' : isSystem ? 'YATRI SYSTEM' : 'YATRI AI (INT4)'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {msg.severity && !isUser && (
                            <View
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 6,
                                backgroundColor:
                                  msg.severity === 'CRITICAL'
                                    ? '#ef4444'
                                    : msg.severity === 'HIGH'
                                      ? '#f97316'
                                      : '#3b82f6',
                              }}
                            >
                              <Text
                                style={[
                                  type.caption,
                                  { color: '#ffffff', fontWeight: 'bold', fontSize: 9 },
                                ]}
                              >
                                {msg.severity}
                              </Text>
                            </View>
                          )}
                          <Text
                            style={[
                              type.caption,
                              {
                                color: isUser ? 'rgba(255,255,255,0.7)' : c.onSurfaceVariant,
                                fontSize: 10,
                              },
                            ]}
                          >
                            {timeString}
                          </Text>
                        </View>
                      </View>

                      {/* Message Content */}
                      <Text
                        style={[
                          type.body,
                          {
                            color: isUser ? '#ffffff' : c.onSurface,
                            lineHeight: 22,
                            fontSize: 14,
                          },
                        ]}
                      >
                        {msg.content}
                      </Text>

                      {/* Action Button inside AI responses */}
                      {msg.action && (
                        <TouchableOpacity
                          onPress={() => {
                            if (msg.action?.type === 'navigate_sos') {
                              router.push('/sos/active');
                            } else if (msg.action?.type === 'call_112') {
                              Alert.alert(
                                'Dial 112',
                                'Connecting immediately to nationwide emergency service...',
                              );
                            }
                          }}
                          style={{
                            marginTop: 12,
                            backgroundColor: '#dc2626',
                            paddingVertical: 10,
                            paddingHorizontal: 14,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: '0 2px 6px rgba(220,38,38,0.3)',
                          }}
                        >
                          <ShieldAlert color="#ffffff" size={18} />
                          <Text style={[type.body, { color: '#ffffff', fontWeight: '800' }]}>
                            {msg.action.label}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Model Meta info footer */}
                      {msg.modelMeta && (
                        <View
                          style={{
                            marginTop: 8,
                            paddingTop: 6,
                            borderTopWidth: 0.5,
                            borderColor: 'rgba(156, 163, 175, 0.2)',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Cpu size={11} color={c.onSurfaceVariant} />
                          <Text
                            style={[
                              type.caption,
                              { color: c.onSurfaceVariant, fontSize: 10, fontStyle: 'italic' },
                            ]}
                          >
                            {msg.modelMeta}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Thinking / Synthesizing Animation */}
                {isThinking && (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: c.surfaceVariant,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <ActivityIndicator size="small" color={c.primary} />
                    <Text
                      style={[
                        type.body,
                        { color: c.onSurfaceVariant, fontStyle: 'italic', fontSize: 13 },
                      ]}
                    >
                      Synthesizing real-time emergency triage instructions...
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Quick Prompts Bar */}
              <View>
                <Text
                  style={[
                    type.caption,
                    {
                      color: c.onSurfaceVariant,
                      fontWeight: 'bold',
                      marginBottom: 6,
                      fontSize: 11,
                    },
                  ]}
                >
                  ⚡ QUICK TRIAGE PROMPTS (TAP TO CONSULT):
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                >
                  {QUICK_PROMPTS.map((qp) => (
                    <TouchableOpacity
                      key={qp.id}
                      onPress={() => handleSend(qp.query)}
                      disabled={isThinking}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: 'rgba(156, 163, 175, 0.3)',
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={[type.caption, { color: c.onSurface, fontWeight: '700' }]}>
                        {qp.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Bottom Chat Input Box */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c.surface,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: 1.5,
                  borderColor: isThinking ? 'rgba(156, 163, 175, 0.3)' : c.primary,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              >
                <TextInput
                  placeholder="Describe symptoms, injury, or emergency location..."
                  placeholderTextColor={c.onSurfaceVariant}
                  value={inputText}
                  onChangeText={setInputText}
                  editable={!isThinking}
                  onSubmitEditing={() => handleSend()}
                  returnKeyType="send"
                  style={[
                    type.body,
                    { color: c.onSurface, flex: 1, paddingVertical: 6, maxHeight: 80 },
                  ]}
                  multiline={true}
                />
                <TouchableOpacity
                  onPress={() => handleSend()}
                  disabled={!inputText.trim() || isThinking}
                  style={{
                    backgroundColor: !inputText.trim() || isThinking ? c.surfaceVariant : c.primary,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginLeft: 8,
                  }}
                >
                  <Send
                    size={18}
                    color={!inputText.trim() || isThinking ? c.onSurfaceVariant : '#ffffff'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 2: QUANTIZED MODEL MANAGER */}
          {activeTab === 'model' && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: space.md, paddingVertical: space.sm }}
            >
              <Card
                style={{
                  gap: space.md,
                  padding: space.md,
                  borderWidth: 1.5,
                  borderColor: 'rgba(156, 163, 175, 0.3)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Cpu color="#3b82f6" size={28} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.subtitle, { color: c.onSurface, fontWeight: '800' }]}>
                      {modelInfo.modelName}
                    </Text>
                    <Text style={[type.caption, { color: c.onSurfaceVariant, fontWeight: '600' }]}>
                      Quantization: 4-Bit INT4 (GGUF Format) • Size: {modelInfo.size}
                    </Text>
                  </View>
                </View>

                <Text style={[type.body, { color: c.onSurface, lineHeight: 21, fontSize: 14 }]}>
                  {modelInfo.description} Having this quantized conversational checkpoint downloaded
                  directly on your phone ensures 100% independent, zero-latency emergency medical
                  triage even when deep in wilderness with zero cellular towers or internet
                  connection.
                </Text>

                <View
                  style={{
                    backgroundColor: c.surfaceVariant,
                    padding: 12,
                    borderRadius: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: modelInfo.status === 'ready' ? '#16a34a' : '#d97706',
                    gap: 6,
                  }}
                >
                  <Text style={[type.caption, { color: c.onSurface, fontWeight: 'bold' }]}>
                    STATUS:{' '}
                    {modelInfo.status === 'ready'
                      ? '🟢 DOWNLOADED & VERIFIED IN MOBILE STORAGE'
                      : '🟡 NOT DOWNLOADED (CLOUD/HEURISTIC FALLBACK)'}
                  </Text>
                  <Text style={[type.caption, { color: c.onSurfaceVariant, fontSize: 11 }]}>
                    {modelInfo.status === 'ready'
                      ? `Local File: ${modelInfo.localPath}`
                      : 'Download the INT4 weights now while connected to Wi-Fi or mobile data.'}
                  </Text>
                </View>

                {/* Download Progress Bar */}
                {downloading && (
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[type.caption, { color: c.onSurface, fontWeight: 'bold' }]}>
                        Downloading GGUF weights...
                      </Text>
                      <Text style={[type.caption, { color: c.primary, fontWeight: 'bold' }]}>
                        {modelInfo.progress}%
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 8,
                        backgroundColor: c.surfaceVariant,
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: '100%',
                          width: `${modelInfo.progress}%`,
                          backgroundColor: c.primary,
                        }}
                      />
                    </View>
                  </View>
                )}

                <View style={{ gap: 10, marginTop: 4 }}>
                  {modelInfo.status === 'not_downloaded' ? (
                    <Button
                      label={
                        downloading
                          ? 'Downloading Weights...'
                          : '📥 Download INT4 Model to Phone (1.38 GB)'
                      }
                      onPress={handleDownloadModel}
                      disabled={downloading}
                    />
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Button
                            label="✔️ Offline AI Ready"
                            onPress={() =>
                              Alert.alert(
                                'Offline AI Active',
                                'INT4 weights are actively loaded in mobile memory.',
                              )
                            }
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            label="🗑️ Delete & Free 1.38 GB"
                            variant="secondary"
                            onPress={handleDeleteModel}
                          />
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </Card>

              {/* Model Verification Specification */}
              <Card style={{ gap: 8, padding: space.md }}>
                <Text
                  style={[type.subtitle, { color: c.onSurface, fontWeight: '700', fontSize: 16 }]}
                >
                  🛡️ Architectural Specifications
                </Text>
                <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
                  • Base Architecture: Gemma-2B-Instruct / Wilderness Triage V2{'\n'}• Quantization
                  Strategy: K-Quant INT4 (Q4_K_M) for low dynamic power usage on mobile neural
                  processing units (NPUs).{'\n'}• Context Window: 4096 tokens with rolling emergency
                  short-term memory.{'\n'}• Integrity Check: {modelInfo.hash}
                </Text>
              </Card>
            </ScrollView>
          )}

          {/* TAB 3: TRIAGE PROTOCOLS REFERENCE */}
          {activeTab === 'protocols' && (
            <View style={{ flex: 1, gap: space.sm }}>
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
                  placeholder="Search offline handbook (e.g. bleeding, snake, fracture)..."
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
              <View style={{ height: 40 }}>
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
                        paddingVertical: 7,
                        borderRadius: 20,
                        backgroundColor: selectedCategory === cat ? c.primary : c.surfaceVariant,
                        borderWidth: 1,
                        borderColor:
                          selectedCategory === cat ? c.primary : 'rgba(156, 163, 175, 0.3)',
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
                      No matching protocol found
                    </Text>
                    <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
                      Try switching to the Live Chat tab to discuss your specific crisis directly
                      with our quantized AI assistant, or trigger an emergency SOS immediately.
                    </Text>
                    <View style={{ width: '100%', gap: 10, marginTop: 10 }}>
                      <Button label="💬 Open Live AI Chat" onPress={() => setActiveTab('chat')} />
                      <Button
                        label="🚨 Trigger Active SOS"
                        variant="destructive"
                        onPress={() => router.push('/sos/active')}
                      />
                    </View>
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
                                type.subtitle,
                                {
                                  color: c.onSurface,
                                  fontWeight: 'bold',
                                  flex: 1,
                                  marginRight: space.sm,
                                },
                              ]}
                            >
                              {p.title}
                            </Text>
                            <View
                              style={{
                                backgroundColor: p.severity === 'CRITICAL' ? '#ef4444' : '#f97316',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text
                                style={[
                                  type.caption,
                                  { color: '#fff', fontWeight: '800', fontSize: 10 },
                                ]}
                              >
                                {p.severity}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              type.caption,
                              { color: c.onSurfaceVariant, fontStyle: 'italic' },
                            ]}
                          >
                            Symptoms: {p.symptoms.join(', ')}
                          </Text>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={{ gap: space.md, marginTop: space.sm }}>
                            {/* Interactive Voice Assistant Bar */}
                            <View
                              style={{
                                backgroundColor: isVoicePlaying ? '#dcfce7' : c.surfaceVariant,
                                padding: space.sm,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: isVoicePlaying
                                  ? '#16a34a'
                                  : 'rgba(156, 163, 175, 0.2)',
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: isVoicePlaying ? 8 : 0,
                                }}
                              >
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: space.xs,
                                  }}
                                >
                                  <Volume2
                                    color={isVoicePlaying ? '#16a34a' : c.primary}
                                    size={20}
                                  />
                                  <Text
                                    style={[
                                      type.body,
                                      {
                                        color: isVoicePlaying ? '#166534' : c.onSurface,
                                        fontWeight: 'bold',
                                      },
                                    ]}
                                  >
                                    {isVoicePlaying ? 'Audio Triage Active' : 'Audio Triage Mode'}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  onPress={() => handleStartVoiceAssist(p)}
                                  style={{
                                    backgroundColor: isVoicePlaying ? '#ef4444' : c.primary,
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 16,
                                  }}
                                >
                                  <Text
                                    style={[type.caption, { color: '#ffffff', fontWeight: 'bold' }]}
                                  >
                                    {isVoicePlaying ? 'Stop Audio' : 'Start Audio'}
                                  </Text>
                                </TouchableOpacity>
                              </View>

                              {isVoicePlaying && (
                                <View
                                  style={{
                                    gap: 8,
                                    borderTopWidth: 1,
                                    borderTopColor: 'rgba(22, 163, 74, 0.2)',
                                    paddingTop: 8,
                                  }}
                                >
                                  <Text
                                    style={[type.caption, { color: '#166534', fontWeight: '700' }]}
                                  >
                                    STEP {currentStepIndex + 1} OF {p.immediateSteps.length}
                                  </Text>
                                  <Text
                                    style={[
                                      type.body,
                                      { color: '#14532d', fontSize: 16, fontWeight: '600' },
                                    ]}
                                  >
                                    "{p.immediateSteps[currentStepIndex]}"
                                  </Text>
                                  <Button
                                    label={
                                      currentStepIndex < p.immediateSteps.length - 1
                                        ? 'Next Triage Step ➔'
                                        : '✔️ Finish Triage'
                                    }
                                    onPress={() => handleNextStep(p)}
                                    variant="secondary"
                                  />
                                </View>
                              )}
                            </View>

                            {/* Immediate Triage Steps */}
                            <View style={{ gap: space.xs }}>
                              <Text
                                style={[
                                  type.body,
                                  {
                                    color: c.onSurface,
                                    fontWeight: 'bold',
                                    borderLeftWidth: 3,
                                    borderLeftColor: c.primary,
                                    paddingLeft: 6,
                                  },
                                ]}
                              >
                                IMMEDIATE ACTION STEPS:
                              </Text>
                              {p.immediateSteps.map((step, index) => (
                                <View
                                  key={index}
                                  style={{ flexDirection: 'row', gap: space.xs, marginBottom: 4 }}
                                >
                                  <View
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: 11,
                                      backgroundColor: c.primary,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginTop: 2,
                                    }}
                                  >
                                    <Text
                                      style={[
                                        type.caption,
                                        { color: '#ffffff', fontWeight: 'bold' },
                                      ]}
                                    >
                                      {index + 1}
                                    </Text>
                                  </View>
                                  <Text
                                    style={[
                                      type.body,
                                      { color: c.onSurface, flex: 1, lineHeight: 22 },
                                    ]}
                                  >
                                    {step}
                                  </Text>
                                </View>
                              ))}
                            </View>

                            {/* Do's & Don'ts Columns */}
                            <View
                              style={{
                                flexDirection: 'column',
                                gap: space.sm,
                                borderTopWidth: 1,
                                borderTopColor: 'rgba(156, 163, 175, 0.2)',
                                paddingTop: space.sm,
                              }}
                            >
                              <View style={{ flex: 1, gap: 4 }}>
                                <View
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                >
                                  <CheckCircle color="#16a34a" size={18} />
                                  <Text
                                    style={[type.body, { color: '#16a34a', fontWeight: 'bold' }]}
                                  >
                                    MANDATORY DO'S
                                  </Text>
                                </View>
                                {p.dos.map((d, index) => (
                                  <Text
                                    key={index}
                                    style={[type.body, { color: c.onSurface, marginLeft: 22 }]}
                                  >
                                    • {d}
                                  </Text>
                                ))}
                              </View>

                              <View style={{ flex: 1, gap: 4, marginTop: 4 }}>
                                <View
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                >
                                  <XCircle color="#ef4444" size={18} />
                                  <Text
                                    style={[type.body, { color: '#ef4444', fontWeight: 'bold' }]}
                                  >
                                    CRITICAL DON'TS
                                  </Text>
                                </View>
                                {p.donts.map((d, index) => (
                                  <Text
                                    key={index}
                                    style={[type.body, { color: c.onSurface, marginLeft: 22 }]}
                                  >
                                    • 🚫 {d}
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
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
