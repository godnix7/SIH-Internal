import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { Card, useAppColors } from '@/src/components/ui';
import { space, type } from '@/src/theme/tokens';
import { Search, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react-native';
import faqsData from '@/src/data/faqs.json';
import { api } from '@/src/services/api';

export default function FAQScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [faqs, setFaqs] = useState(faqsData);
  const [loading, setLoading] = useState(true);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/faqs');
      if (response.data && response.data.length > 0) {
        setFaqs(response.data);
      }
    } catch (e) {
      console.log('Failed to fetch FAQs, using local fallback data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const filteredFaqs = faqs.filter((faq) => {
    const q = t(faq.question).toLowerCase();
    const a = t(faq.answer).toLowerCase();
    const term = searchQuery.toLowerCase();
    return q.includes(term) || a.includes(term);
  });

  const categories = Array.from(new Set(filteredFaqs.map((f) => f.category)));

  return (
    <Screen
      title={t('settings.faq.title', 'Frequently Asked Questions')}
      subtitle={t('settings.faq.subtitle', 'Find quick answers to common emergencies')}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: space.md,
        }}
      >
        <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
          {loading
            ? t('settings.faq.syncing', 'Syncing with cloud...')
            : t('settings.faq.synced', 'Up to date')}
        </Text>
        <TouchableOpacity onPress={fetchFaqs} disabled={loading}>
          <RefreshCw size={16} color={loading ? c.onSurfaceVariant : c.primary} />
        </TouchableOpacity>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.surface,
          borderRadius: 12,
          paddingHorizontal: 16,
          marginBottom: space.lg,
          borderWidth: 1,
          borderColor: c.onSurfaceVariant,
        }}
      >
        <Search color={c.onSurfaceVariant} size={20} />
        <TextInput
          style={[type.body, { flex: 1, padding: 12, color: c.onSurface }]}
          placeholder={t('settings.faq.searchPlaceholder', 'Search FAQs...')}
          placeholderTextColor={c.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {categories.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: space.xxl }}>
          <Text style={[type.body, { color: c.onSurfaceVariant }]}>
            {t('settings.faq.noResults', 'No matching FAQs found.')}
          </Text>
        </View>
      ) : (
        categories.map((category) => (
          <View key={category} style={{ marginBottom: space.lg }}>
            <Text
              style={[type.subtitle, { color: c.primary, marginBottom: space.sm, marginLeft: 4 }]}
            >
              {t(`settings.faq.category.${category}`, category)}
            </Text>
            {filteredFaqs
              .filter((f) => f.category === category)
              .map((faq) => {
                const isExpanded = expandedId === faq.id;
                return (
                  <Card key={faq.id} style={{ marginBottom: space.xs, padding: 0 }}>
                    <TouchableOpacity
                      onPress={() => setExpandedId(isExpanded ? null : faq.id)}
                      style={{
                        padding: space.md,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={[type.body, { color: c.onSurface, flex: 1, fontWeight: '600' }]}>
                        {t(faq.question)}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp color={c.onSurfaceVariant} size={20} />
                      ) : (
                        <ChevronDown color={c.onSurfaceVariant} size={20} />
                      )}
                    </TouchableOpacity>
                    {isExpanded && (
                      <View
                        style={{
                          padding: space.md,
                          paddingTop: 0,
                          borderTopWidth: 1,
                          borderColor: c.surfaceVariant,
                        }}
                      >
                        <Text style={[type.body, { color: c.onSurfaceVariant, lineHeight: 22 }]}>
                          {t(faq.answer)}
                        </Text>
                      </View>
                    )}
                  </Card>
                );
              })}
          </View>
        ))
      )}
    </Screen>
  );
}
