import { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Vibration,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import {
  Sparkles,
  Send,
  ShieldAlert,
  Cpu,
  Trash2,
  ArrowLeft,
  Volume2,
  Copy,
  Share2,
  RefreshCw,
  Mic,
} from 'lucide-react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-native-markdown-display';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '@/src/components/Screen';
import { OfflineModelManager } from '@/src/services/ai/OfflineModelManager';
import { Button, useAppColors } from '@/src/components/ui';
import {
  emergencyChatbot,
  ChatMessage,
  QUICK_PROMPTS,
  OfflineModelInfo,
} from '@/src/services/emergencyChatbot';
import { space, type } from '@/src/theme/tokens';
import { llamaEngine, type GenerationDiagnostics } from '@/src/services/llamaEngine';

// Memoized message component for performance
const MessageBubble = memo(
  ({
    msg,
    isStream,
    streamedText,
    c,
    t,
  }: {
    msg: ChatMessage | { isStreaming: boolean; role?: string; content?: string };
    isStream: boolean;
    streamedText: string;
    c: any;
    t: any;
  }) => {
    const isUser = !isStream && msg.role === 'user';
    const isSystem = !isStream && msg.role === 'system';
    const content = isStream ? streamedText : msg.content;

    // Type guards for non-streaming message properties
    const severity = !isStream && 'severity' in msg ? msg.severity : undefined;
    const action = !isStream && 'action' in msg ? msg.action : undefined;
    const modelMeta = !isStream && 'modelMeta' in msg ? msg.modelMeta : undefined;

    const handleCopy = async () => {
      if (content) {
        await Clipboard.setStringAsync(content);
        Vibration.vibrate(50);
      }
    };

    const handleShare = async () => {
      if (content) {
        await Share.share({ message: content });
      }
    };

    const handleSpeak = () => {
      if (content) {
        Speech.isSpeakingAsync().then((isSpeaking) => {
          if (isSpeaking) {
            Speech.stop();
          } else {
            Speech.speak(content, { rate: 0.9, pitch: 1.1 });
          }
        });
      }
    };

    if (isSystem) {
      return (
        <Animated.View
          entering={FadeIn}
          style={{ marginVertical: space.md, paddingHorizontal: space.lg, alignItems: 'center' }}
        >
          <Text
            style={[
              type.caption,
              { color: c.onSurfaceVariant, textAlign: 'center', fontStyle: 'italic' },
            ]}
          >
            {content}
          </Text>
        </Animated.View>
      );
    }

    const markdownStyles = {
      body: { color: isUser ? c.onPrimary : c.onSurface, fontSize: 15, lineHeight: 22 },
      heading1: {
        fontSize: 20,
        fontWeight: 'bold' as const,
        marginBottom: 8,
        color: isUser ? '#fff' : c.primary,
      },
      heading2: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        marginBottom: 6,
        color: isUser ? '#fff' : c.primary,
      },
      strong: { fontWeight: 'bold' as const },
      em: { fontStyle: 'italic' as const },
      list_item: { marginBottom: 4 },
      bullet_list: { marginBottom: 8 },
      ordered_list: { marginBottom: 8 },
    };

    return (
      <Animated.View
        entering={FadeInUp}
        style={{
          marginVertical: space.xs,
          paddingHorizontal: space.md,
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            maxWidth: '88%',
            backgroundColor: isUser ? c.primary : c.surfaceVariant,
            padding: space.md,
            borderRadius: 16,
            borderBottomRightRadius: isUser ? 4 : 16,
            borderBottomLeftRadius: !isUser ? 4 : 16,
          }}
        >
          {!isUser && severity && (
            <View
              style={{
                backgroundColor:
                  severity === 'CRITICAL'
                    ? c.critical
                    : severity === 'HIGH'
                      ? '#f97316'
                      : c.primary,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                alignSelf: 'flex-start',
                marginBottom: 6,
              }}
            >
              <Text style={[type.caption, { color: '#fff', fontSize: 10, fontWeight: 'bold' }]}>
                {severity}
              </Text>
            </View>
          )}

          <Markdown style={markdownStyles}>{content + (isStream ? ' ▋' : '')}</Markdown>

          {!isUser && action && (
            <TouchableOpacity
              onPress={() =>
                action.type === 'navigate_sos'
                  ? router.push('/sos/active')
                  : Alert.alert('Action', action.label)
              }
              style={{
                marginTop: 12,
                backgroundColor: c.critical,
                padding: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'center',
              }}
            >
              <ShieldAlert color="#fff" size={16} />
              <Text style={[type.body, { color: '#fff', fontWeight: 'bold' }]}>{action.label}</Text>
            </TouchableOpacity>
          )}

          {!isUser && !isStream && (
            <View
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTopWidth: 0.5,
                borderColor: 'rgba(150,150,150,0.2)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity onPress={handleSpeak} hitSlop={10}>
                  <Volume2 size={16} color={c.onSurfaceVariant} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCopy} hitSlop={10}>
                  <Copy size={16} color={c.onSurfaceVariant} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} hitSlop={10}>
                  <Share2 size={16} color={c.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              {modelMeta && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.6 }}>
                  <Cpu size={10} color={c.onSurface} />
                  <Text style={[type.caption, { fontSize: 9, color: c.onSurface }]}>
                    {modelMeta}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    );
  },
);

/** Diagnostics panel for developer debugging — shows model info, runtime params, and allows test generation */
const DiagnosticsPanel = memo(({ c }: { c: any }) => {
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [lastDiag, setLastDiag] = useState<GenerationDiagnostics | null>(null);

  const modelInfo = llamaEngine.getModelInfo();

  const handleDiagnosticTest = async () => {
    if (diagnosticRunning) return;
    setDiagnosticRunning(true);
    setDiagnosticResult(null);
    try {
      const result = await llamaEngine.diagnosticGenerate('What is 2 + 2?');
      setDiagnosticResult(
        `OUTPUT: "${result.output}"\n\n` +
          `Tokens: in=${result.inputTokenCount} out=${result.outputTokenCount}\n` +
          `Input IDs: [${result.tokenIds.slice(0, 10).join(', ')}${result.tokenIds.length > 10 ? '...' : ''}]\n` +
          `Decoded: "${result.decodedTokens}"\n` +
          `Speed: ${result.timings?.predicted_per_second?.toFixed(1) || 'N/A'} tok/s`,
      );
      setLastDiag(llamaEngine.getLastDiagnostics());
    } catch (e: any) {
      setDiagnosticResult(`ERROR: ${e?.message || 'Unknown error'}`);
    } finally {
      setDiagnosticRunning(false);
    }
  };

  const DiagRow = ({
    label,
    value,
  }: {
    label: string;
    value: string | number | boolean | undefined | null;
  }) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
        borderBottomWidth: 0.5,
        borderColor: 'rgba(150,150,150,0.15)',
      }}
    >
      <Text style={[type.caption, { color: c.onSurfaceVariant, fontSize: 11 }]}>{label}</Text>
      <Text
        style={[
          type.caption,
          {
            color: c.onSurface,
            fontWeight: 'bold',
            fontSize: 11,
            maxWidth: '60%',
            textAlign: 'right',
          },
        ]}
        numberOfLines={2}
      >
        {String(value ?? 'N/A')}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: c.surface,
        padding: space.lg,
        borderRadius: 16,
        gap: space.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 165, 0, 0.3)',
      }}
    >
      <Text style={[type.subtitle, { color: '#f97316', fontWeight: 'bold' }]}>
        🔧 Developer Diagnostics
      </Text>

      {/* Model Info */}
      <Text style={[type.caption, { color: c.onSurfaceVariant, fontWeight: 'bold', marginTop: 4 }]}>
        MODEL
      </Text>
      <DiagRow label="Description" value={modelInfo?.desc} />
      <DiagRow
        label="Parameters"
        value={modelInfo?.nParams ? `${(modelInfo.nParams / 1e9).toFixed(1)}B` : 'N/A'}
      />
      <DiagRow
        label="Size"
        value={modelInfo?.size ? `${(modelInfo.size / 1e9).toFixed(2)} GB` : 'N/A'}
      />
      <DiagRow label="Chat Template (llamaChat)" value={modelInfo?.chatTemplates.llamaChat} />
      <DiagRow label="Chat Template (Jinja)" value={modelInfo?.chatTemplates.jinjaDefault} />
      <DiagRow label="Tool Use" value={modelInfo?.chatTemplates.jinjaToolUse} />

      {/* Generation Config */}
      <Text style={[type.caption, { color: c.onSurfaceVariant, fontWeight: 'bold', marginTop: 8 }]}>
        GENERATION CONFIG
      </Text>
      <DiagRow label="Context Length" value="4096" />
      <DiagRow label="Temperature" value="0.2" />
      <DiagRow label="Top-K" value="30" />
      <DiagRow label="Top-P" value="0.9" />
      <DiagRow label="Min-P" value="0.05" />
      <DiagRow label="Seed" value="42" />
      <DiagRow label="Max Predict" value="512" />
      <DiagRow label="Repeat Penalty" value="1.1" />
      <DiagRow label="Streaming" value="true" />
      <DiagRow label="KV Cache Clear" value="Before each gen" />

      {/* Last Generation Stats */}
      {lastDiag && (
        <>
          <Text
            style={[type.caption, { color: c.onSurfaceVariant, fontWeight: 'bold', marginTop: 8 }]}
          >
            LAST GENERATION
          </Text>
          <DiagRow label="Input Tokens" value={lastDiag.inputTokenCount} />
          <DiagRow label="Output Tokens" value={lastDiag.outputTokenCount} />
          <DiagRow label="Stopped EOS" value={lastDiag.stoppedEos} />
          <DiagRow label="Stopped Word" value={lastDiag.stoppedWord || 'none'} />
          <DiagRow
            label="Speed"
            value={
              lastDiag.timings?.predicted_per_second
                ? `${lastDiag.timings.predicted_per_second.toFixed(1)} tok/s`
                : 'N/A'
            }
          />
          <DiagRow
            label="Prompt Speed"
            value={
              lastDiag.timings?.prompt_per_second
                ? `${lastDiag.timings.prompt_per_second.toFixed(0)} tok/s`
                : 'N/A'
            }
          />
        </>
      )}

      {/* Diagnostic Test */}
      <View style={{ marginTop: space.md }}>
        <Button
          label={diagnosticRunning ? 'Running Test...' : 'Run Diagnostic: "What is 2 + 2?"'}
          onPress={handleDiagnosticTest}
          disabled={diagnosticRunning}
          loading={diagnosticRunning}
        />
      </View>

      {diagnosticResult && (
        <View
          style={{
            backgroundColor: 'rgba(0,0,0,0.05)',
            padding: 10,
            borderRadius: 8,
            marginTop: 4,
          }}
        >
          <Text
            style={[type.caption, { color: c.onSurface, fontFamily: 'monospace', fontSize: 10 }]}
            selectable
          >
            {diagnosticResult}
          </Text>
        </View>
      )}
    </View>
  );
});

export default function EmergencyAIScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'chat' | 'model'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>(() => emergencyChatbot.getHistory());
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [modelInfo, setModelInfo] = useState<OfflineModelInfo>(() =>
    emergencyChatbot.getModelInfo(),
  );
  const [downloading, setDownloading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Scroll slightly delayed to ensure layout passes
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
  }, [messages, isThinking, streamedText]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handleMicPress = async () => {
    const stt = OfflineModelManager.getSTTProvider();

    if (isListening) {
      setIsListening(false);
      try {
        await stt.stopListening();
      } catch (e) {
        console.log('Stopped listening manually', e);
      }
    } else {
      try {
        setIsListening(true);
        Speech.stop();
        await OfflineModelManager.loadSTT();

        const result = await stt.startListening((partial) => {
          setInputText(partial);
        });

        setIsListening(false);
        if (result && result.text.trim()) {
          handleSend(result.text);
        }
      } catch (e) {
        console.error(e);
        setIsListening(false);
      }
    }
  };

  const handleSend = async (customQuery?: string) => {
    const query = (customQuery !== undefined ? customQuery : inputText).trim();
    if (!query || isThinking) return;
    if (!customQuery) setInputText('');
    Speech.stop(); // Stop speaking if they send a new message

    Vibration.vibrate(50);
    setIsThinking(true);
    setStreamedText('');

    // Optimistically update memory
    setMessages([
      ...emergencyChatbot.getHistory(),
      { id: 'temp', role: 'user', content: query, timestamp: Date.now() },
    ]);

    try {
      await emergencyChatbot.sendMessage(query, (partial) => {
        setStreamedText(partial);
      });

      // Update the complete messages list
      const history = emergencyChatbot.getHistory();
      setMessages([...history]);

      // Auto-speak the response
      const lastMsg = history[history.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        Speech.speak(lastMsg.content, { rate: 0.9, pitch: 1.1 });
      }

      Vibration.vibrate([80, 80], false);
    } catch (error) {
      Alert.alert(
        t('ai.error.title', 'Inference Error'),
        t('ai.error.desc', 'Unable to synthesize response.'),
      );
      setMessages([...emergencyChatbot.getHistory()]);
    } finally {
      setIsThinking(false);
      setStreamedText('');
    }
  };

  const handleDownloadModel = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await emergencyChatbot.downloadOfflineModel((pct) => {
        setModelInfo((prev) => ({ ...prev, progress: pct, status: 'downloading' }));
      });
      setModelInfo(emergencyChatbot.getModelInfo());
      setMessages([...emergencyChatbot.getHistory()]);
    } catch (e: any) {
      Alert.alert(
        t('ai.model.downloadError', 'Download Failed'),
        e?.message ||
          t(
            'ai.model.downloadErrorDesc',
            'Unable to download the AI model. Check your internet connection.',
          ),
      );
      setModelInfo(emergencyChatbot.getModelInfo()); // reset status to not_downloaded
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteModel = async () => {
    Alert.alert(
      t('ai.model.deleteTitle', 'Remove Offline Model'),
      t(
        'ai.model.deleteDesc',
        'This will delete the local AI weights and switch back to the heuristic fallback engine. Proceed?',
      ),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            await emergencyChatbot.deleteOfflineModel();
            setModelInfo(emergencyChatbot.getModelInfo());
            setMessages([...emergencyChatbot.getHistory()]);
          },
        },
      ],
    );
  };

  const renderFollowUps = () => {
    // Dynamically show followups if the last message is from the assistant
    if (messages.length === 0 || messages[messages.length - 1].role !== 'assistant') return null;

    // Very basic heuristic followups based on recent chat (could be parsed from LLM output)
    const content = messages[messages.length - 1].content.toLowerCase();
    const suggestions = [];

    if (content.includes('bleed') || content.includes('tourniquet')) {
      suggestions.push('How tight should the tourniquet be?');
      suggestions.push("What if the bleeding won't stop?");
    } else if (content.includes('burn')) {
      suggestions.push('Should I pop the blisters?');
    } else if (content.includes('cpr') || content.includes('breath')) {
      suggestions.push('What is the compression ratio?');
    } else {
      suggestions.push(t('ai.followup.safe', 'How do I secure the area?'));
      suggestions.push(t('ai.followup.help', 'When should I call for help?'));
    }

    return (
      <Animated.View
        entering={FadeInUp}
        style={{
          paddingHorizontal: space.md,
          marginBottom: space.lg,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {suggestions.map((s, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => handleSend(s)}
            style={{
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.primary,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 16,
            }}
          >
            <Text style={[type.caption, { color: c.primary }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.surfaceVariant }}>
      {/* HEADER */}
      <View
        style={{
          paddingTop: 50,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: c.surface,
          borderBottomWidth: 1,
          borderColor: c.onSurfaceVariant,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <ArrowLeft color={c.onSurface} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[type.subtitle, { color: c.onSurface, fontWeight: 'bold' }]}>
            {t('ai.title', 'Yatri AI Engine')}
          </Text>
          <Text
            style={[
              type.caption,
              {
                color:
                  modelInfo.status === 'ready' && llamaEngine.isReady()
                    ? '#16a34a'
                    : c.onSurfaceVariant,
              },
            ]}
          >
            {modelInfo.status === 'ready' && llamaEngine.isReady()
              ? '🟢 ' + t('ai.status.offline', 'Offline LLM Active')
              : '☁️ ' + t('ai.status.cloud', 'Heuristic Fallback')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setActiveTab(activeTab === 'chat' ? 'model' : 'chat')}
          style={{ padding: 8 }}
        >
          {activeTab === 'chat' ? <Cpu color={c.primary} /> : <Sparkles color={c.primary} />}
        </TouchableOpacity>
      </View>

      {activeTab === 'chat' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView ref={scrollViewRef} contentContainerStyle={{ paddingVertical: space.md }}>
            {messages.map((m, idx) => (
              <MessageBubble
                key={m.id || idx}
                msg={m}
                isStream={false}
                streamedText=""
                c={c}
                t={t}
              />
            ))}
            {isThinking && (
              <MessageBubble
                msg={{ isStreaming: true }}
                isStream={true}
                streamedText={streamedText}
                c={c}
                t={t}
              />
            )}
            {!isThinking && renderFollowUps()}
          </ScrollView>

          <View
            style={{
              padding: space.md,
              backgroundColor: c.surface,
              borderTopWidth: 1,
              borderColor: c.onSurfaceVariant,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: space.sm }}
            >
              {QUICK_PROMPTS.map((qp) => (
                <TouchableOpacity
                  key={qp.id}
                  onPress={() => handleSend(qp.query)}
                  style={{
                    backgroundColor: c.surfaceVariant,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text>{qp.icon}</Text>
                  <Text style={[type.caption, { color: c.onSurface }]}>
                    {t(`ai.quick.${qp.id}`, qp.label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.surfaceVariant,
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: Platform.OS === 'ios' ? 12 : 4,
              }}
            >
              <TouchableOpacity
                onPressIn={handleMicPress}
                onPressOut={handleMicPress}
                style={{ marginRight: 8 }}
              >
                {isListening ? (
                  <ActivityIndicator size="small" color={c.critical} />
                ) : (
                  <Mic color={c.onSurfaceVariant} size={20} />
                )}
              </TouchableOpacity>
              <TextInput
                style={[type.body, { flex: 1, color: c.onSurface, maxHeight: 100 }]}
                placeholder={t('ai.input.placeholder', 'Describe your emergency...')}
                placeholderTextColor={c.onSurfaceVariant}
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!isThinking}
              />
              <TouchableOpacity
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isThinking}
                style={{
                  backgroundColor: inputText.trim() && !isThinking ? c.primary : 'transparent',
                  padding: 10,
                  borderRadius: 20,
                  marginLeft: 8,
                }}
              >
                {isThinking ? (
                  <ActivityIndicator size="small" color={c.primary} />
                ) : (
                  <Send color={inputText.trim() ? '#fff' : c.onSurfaceVariant} size={18} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xl }}>
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <Cpu size={48} color={c.primary} />
            <Text style={[type.title, { color: c.onSurface, textAlign: 'center' }]}>
              {t('ai.model.title', 'Offline LLM Manager')}
            </Text>
            <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
              {modelInfo.description}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: c.surface,
              padding: space.lg,
              borderRadius: 16,
              gap: space.md,
            }}
          >
            <Text style={[type.subtitle, { color: c.onSurface }]}>{modelInfo.modelName}</Text>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: c.surfaceVariant,
              }}
            >
              <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
                {t('ai.model.size', 'Download Size')}
              </Text>
              <Text style={[type.caption, { color: c.onSurface, fontWeight: 'bold' }]}>
                {modelInfo.size}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: c.surfaceVariant,
              }}
            >
              <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
                {t('ai.model.ram', 'Estimated RAM Usage')}
              </Text>
              <Text style={[type.caption, { color: c.onSurface, fontWeight: 'bold' }]}>
                ~1.8 GB
              </Text>
            </View>

            {modelInfo.status === 'downloading' && (
              <View style={{ gap: 8, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[type.caption, { color: c.onSurface }]}>
                    {t('ai.model.downloading', 'Downloading weights...')}
                  </Text>
                  <Text style={[type.caption, { color: c.primary }]}>
                    {modelInfo.progress.toFixed(1)}%
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: c.surfaceVariant,
                    borderRadius: 3,
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

            {modelInfo.status === 'not_downloaded' && (
              <Button
                label={t('ai.model.downloadBtn', 'Download Weights')}
                onPress={handleDownloadModel}
              />
            )}

            {modelInfo.status === 'ready' && (
              <>
                <View
                  style={{
                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <Text style={[type.caption, { color: '#16a34a', fontWeight: 'bold' }]}>
                    🟢{' '}
                    {t(
                      'ai.model.ready',
                      'Model is installed and ready for zero-latency inference.',
                    )}
                  </Text>
                </View>
                <Button
                  label={t('ai.model.deleteBtn', 'Delete Model (Free Space)')}
                  variant="secondary"
                  onPress={handleDeleteModel}
                />
              </>
            )}
          </View>

          {/* Developer Diagnostics Panel */}
          {modelInfo.status === 'ready' && llamaEngine.isReady() && <DiagnosticsPanel c={c} />}
        </ScrollView>
      )}
    </View>
  );
}
