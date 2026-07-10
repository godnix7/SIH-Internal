import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, ChevronRight, CircleHelp, ShieldAlert } from 'lucide-react-native';

import { formatCountdown } from '@/src/lib/formatters';
import type { ConsentTier, IncidentEvent } from '@/src/lib/types';
import { dark, elevation, light, radius, space, type } from '@/src/theme/tokens';
import { useAppStore } from '@/src/stores/useAppStore';

export function useAppColors() {
  const preference = useAppStore((state) => state.theme);
  const systemScheme = useColorScheme();
  const scheme = preference === 'system' ? systemScheme : preference;
  return scheme === 'dark' ? dark : light;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
};
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const c = useAppColors();
  const background =
    variant === 'primary'
      ? c.primary
      : variant === 'destructive'
        ? c.critical
        : variant === 'secondary'
          ? c.surface
          : 'transparent';
  const color =
    variant === 'secondary' || variant === 'ghost'
      ? variant === 'ghost'
        ? c.primary
        : c.onSurface
      : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: variant === 'secondary' ? c.surfaceVariant : 'transparent',
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[type.subtitle, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const c = useAppColors();
  return (
    <View
      style={[
        styles.card,
        elevation,
        { backgroundColor: c.surface, borderColor: c.surfaceVariant },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function ListRow({
  icon,
  title,
  sub,
  onPress,
  trailing,
}: {
  icon?: ReactNode;
  title: string;
  sub?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const c = useAppColors();
  const content = (
    <View style={[styles.row, { borderBottomColor: c.surfaceVariant }]}>
      {icon && <View style={styles.leading}>{icon}</View>}
      <View style={styles.rowText}>
        <Text style={[type.subtitle, { color: c.onSurface }]}>{title}</Text>
        {sub && <Text style={[type.body, { color: c.onSurfaceVariant }]}>{sub}</Text>}
      </View>
      {trailing ?? (onPress ? <ChevronRight color={c.onSurfaceVariant} size={20} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

export function MonitoringStatusPill({
  state,
  onPress,
}: {
  state: 'live' | 'offline' | 'limited' | 'paused' | 'emergency';
  onPress?: () => void;
}) {
  const c = useAppColors();
  const { t } = useTranslation();
  const colors = {
    live: c.primary,
    offline: c.warning,
    limited: c.warning,
    paused: c.onSurfaceVariant,
    emergency: c.critical,
  } as const;
  const label = t(`status.${state}`);
  const color = colors[state];
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={t('status.label', { label })}
      onPress={onPress}
      style={[styles.pill, { backgroundColor: `${color}18`, borderColor: `${color}50` }]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[type.caption, { color }]}>{label}</Text>
    </Pressable>
  );
}

const TIER_ORDER: ConsentTier[] = ['off', 'checkins', 'zones', 'full'];

export function TierSelector({
  value,
  onChange,
}: {
  value: ConsentTier;
  onChange: (tier: ConsentTier) => void;
}) {
  const c = useAppColors();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<ConsentTier>(value);
  return (
    <View style={styles.stack}>
      {TIER_ORDER.map((tier) => {
        const item = {
          title: t(`tiers.${tier}.title`),
          copy: t(`tiers.${tier}.copy`),
          leaves: t(`tiers.${tier}.leaves`, { returnObjects: true }) as string[],
        };
        const selected = tier === value;
        const open = tier === expanded;
        return (
          <Pressable
            key={tier}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(tier);
              setExpanded(tier);
            }}
            style={[
              styles.tier,
              {
                backgroundColor: selected ? `${c.primary}12` : c.surface,
                borderColor: selected ? c.primary : c.surfaceVariant,
              },
            ]}
          >
            <View style={styles.tierHead}>
              <View
                style={[styles.radio, { borderColor: selected ? c.primary : c.onSurfaceVariant }]}
              >
                {selected && <View style={[styles.radioInner, { backgroundColor: c.primary }]} />}
              </View>
              <View style={styles.rowText}>
                <Text style={[type.subtitle, { color: c.onSurface }]}>
                  {item.title}
                  {tier === 'checkins' ? t('tiers.defaultSuffix') : ''}
                </Text>
                <Text style={[type.body, { color: c.onSurfaceVariant }]}>{item.copy}</Text>
              </View>
            </View>
            {open && (
              <View style={[styles.tierDetail, { borderTopColor: c.surfaceVariant }]}>
                {item.leaves.map((line) => (
                  <Text key={line} style={[type.caption, { color: c.onSurfaceVariant }]}>
                    {line}
                  </Text>
                ))}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SOSButton({ onComplete }: { onComplete: () => void }) {
  const c = useAppColors();
  const { t } = useTranslation();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [holding, setHolding] = useState(false);
  const start = () => {
    setHolding(true);
    timer.current = setTimeout(() => {
      setHolding(false);
      onComplete();
    }, 1500);
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  };
  useEffect(() => stop, []);
  return (
    <View style={styles.sosWrap}>
      <MotiView
        animate={{ scale: holding ? 1.08 : 1 }}
        transition={{ type: 'timing', duration: 180 }}
        style={[styles.sos, { backgroundColor: c.critical }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('shield.hold')}
          accessibilityHint={t('shield.holdHint')}
          onPressIn={start}
          onPressOut={stop}
          style={styles.sosPress}
        >
          <ShieldAlert color="#FFFFFF" size={38} />
          <Text style={[type.subtitle, { color: '#FFFFFF', textAlign: 'center' }]}>
            {holding ? t('shield.keepHolding') : 'SOS'}
          </Text>
        </Pressable>
      </MotiView>
      <Text style={[type.caption, { color: c.onSurfaceVariant }]}>{t('shield.hold')}</Text>
    </View>
  );
}

export function CheckInCountdown({ target, onPress }: { target: number; onPress?: () => void }) {
  const c = useAppColors();
  const [now, setNow] = useState<number | undefined>();
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={[styles.countdown, { borderColor: c.primary }]}
    >
      <Text style={[type.caption, { color: c.onSurfaceVariant }]}>Next check-in</Text>
      <Text style={[type.title, { color: c.onSurface }]}>
        {formatCountdown(target, now ?? target)}
      </Text>
    </Pressable>
  );
}

export function ZoneBanner({
  type: bannerType,
  children,
  onDismiss,
}: {
  type: 'advisory' | 'restricted' | 'uncertain';
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const c = useAppColors();
  const color = bannerType === 'advisory' ? c.warning : c.critical;
  return (
    <View style={[styles.banner, { backgroundColor: `${color}12`, borderColor: `${color}55` }]}>
      <AlertTriangle color={color} size={22} />
      <View style={styles.rowText}>
        <Text style={[type.subtitle, { color }]}>
          {bannerType === 'uncertain'
            ? 'GPS is imprecise here'
            : bannerType === 'restricted'
              ? 'Restricted-area alert'
              : 'Heads up'}
        </Text>
        <Text style={[type.body, { color: c.onSurface }]}>{children}</Text>
      </View>
      {onDismiss && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss zone notice"
          onPress={onDismiss}
        >
          <Text style={[type.caption, { color }]}>Dismiss</Text>
        </Pressable>
      )}
    </View>
  );
}

export function TimelineItem({ event }: { event: IncidentEvent }) {
  const c = useAppColors();
  const { t } = useTranslation();
  return (
    <View style={styles.timeline}>
      <View
        style={[
          styles.timelineDot,
          {
            backgroundColor:
              event.actor === 'you'
                ? c.primary
                : event.actor === 'operator'
                  ? c.primary
                  : c.critical,
          },
        ]}
      />
      <View style={styles.rowText}>
        <Text style={[type.subtitle, { color: c.onSurface }]}>
          {t(`sos.events.${event.type}`, { defaultValue: event.type.replaceAll('.', ' ') })}
        </Text>
        <Text style={[type.caption, { color: c.onSurfaceVariant }]}>
          {t(`sos.actors.${event.actor}`, { defaultValue: event.actor })} ·{' '}
          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

export function OfflineBar() {
  const c = useAppColors();
  const { t } = useTranslation();
  return (
    <View style={[styles.offline, { backgroundColor: `${c.warning}1A` }]}>
      <CircleHelp color={c.warning} size={18} />
      <Text style={[type.caption, { color: c.onSurface, flex: 1 }]}>{t('offline.bar')}</Text>
    </View>
  );
}

export function PermissionPrimer({
  tier,
  onContinue,
  onBack,
  loading = false,
  notice,
}: {
  tier: ConsentTier;
  onContinue: () => void;
  onBack: () => void;
  loading?: boolean;
  notice?: string;
}) {
  const c = useAppColors();
  const { t } = useTranslation();
  return (
    <Card>
      <Text style={[type.title, { color: c.onSurface }]}>
        {t('primer.title', { tier: t(`tiers.${tier}.title`) })}
      </Text>
      <Text style={[type.body, { color: c.onSurfaceVariant, marginTop: space.sm }]}>
        {t('primer.body')}
      </Text>
      <Text style={[type.caption, { color: c.onSurfaceVariant, marginTop: space.sm }]}>
        {t('primer.note')}
      </Text>
      {notice && (
        <View style={[styles.permissionNotice, { backgroundColor: `${c.warning}14` }]}>
          <Text style={[type.caption, { color: c.onSurface }]}>{notice}</Text>
        </View>
      )}
      <View style={styles.actions}>
        <Button label={t('primer.notNow')} variant="ghost" disabled={loading} onPress={onBack} />
        <Button
          label={t('primer.continue')}
          loading={loading}
          onPress={onContinue}
          accessibilityHint="Android will ask for location permission. You can continue with limited monitoring if you decline."
        />
      </View>
    </Card>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const c = useAppColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.mountain, { borderColor: c.primary }]}>
        <View style={[styles.mountainPeak, { borderColor: c.primary }]} />
      </View>
      <Text style={[type.title, { color: c.onSurface, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: 'center' }]}>{body}</Text>
      {action}
    </View>
  );
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
}) {
  const c = useAppColors();
  return (
    <View style={styles.inputWrap}>
      <Text style={[type.caption, { color: c.onSurface }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.onSurfaceVariant}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        style={[
          styles.input,
          type.body,
          { color: c.onSurface, borderColor: c.surfaceVariant, backgroundColor: c.surface },
        ]}
      />
    </View>
  );
}

export function OTPInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      label="6-digit code"
      value={value}
      onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad"
      placeholder="000000"
    />
  );
}

export function PinPad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Input
      label="4-digit cancellation PIN"
      value={value}
      onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 4))}
      keyboardType="number-pad"
      secureTextEntry
      placeholder="••••"
    />
  );
}

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  const c = useAppColors();
  if (!visible) return null;
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      style={[styles.toast, { backgroundColor: c.onSurface }]}
    >
      <Check color="#FFFFFF" size={18} />
      <Text style={[type.caption, { color: '#FFFFFF', flex: 1 }]}>{message}</Text>
    </MotiView>
  );
}

export function Skeleton({
  width = '100%',
  height = 16,
}: {
  width?: number | `${number}%`;
  height?: number;
}) {
  const c = useAppColors();
  return (
    <MotiView
      from={{ opacity: 0.35 }}
      animate={{ opacity: 0.8 }}
      transition={{ type: 'timing', loop: true, duration: 700 }}
      style={{ width, height, backgroundColor: c.surfaceVariant, borderRadius: 4 }}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.small,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  card: { borderWidth: 1, borderRadius: radius.medium, padding: space.md, gap: space.xs },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  leading: { width: 32, alignItems: 'center' },
  pill: {
    alignSelf: 'flex-start',
    minHeight: 32,
    borderWidth: 1,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stack: { gap: space.sm },
  tier: { borderWidth: 1, borderRadius: radius.medium, padding: space.md, gap: space.sm },
  tierHead: { flexDirection: 'row', gap: space.sm },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  tierDetail: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm, gap: 4 },
  sosWrap: { alignItems: 'center', gap: space.sm },
  sos: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden' },
  sosPress: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  countdown: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  banner: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: space.sm,
    gap: space.sm,
    borderRadius: radius.medium,
    alignItems: 'flex-start',
  },
  offline: {
    minHeight: 40,
    padding: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  actions: { flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end', marginTop: space.sm },
  permissionNotice: { borderRadius: radius.small, padding: space.sm, marginTop: space.sm },
  timeline: { flexDirection: 'row', gap: space.sm, minHeight: 56 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 5 },
  empty: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
  },
  mountain: {
    width: 100,
    height: 58,
    borderWidth: 2,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
    borderBottomWidth: 0,
  },
  mountainPeak: {
    width: 32,
    height: 32,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginTop: 11,
  },
  inputWrap: { gap: 6 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.small,
    paddingHorizontal: space.sm,
  },
  toast: {
    position: 'absolute',
    bottom: 28,
    left: 16,
    right: 16,
    minHeight: 48,
    borderRadius: radius.small,
    padding: space.sm,
    flexDirection: 'row',
    gap: space.xs,
    alignItems: 'center',
  },
});
