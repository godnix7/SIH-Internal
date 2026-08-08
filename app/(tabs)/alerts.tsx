import React, { useState, useCallback } from 'react';
import { router } from 'expo-router';
import {
  BellRing,
  MapPinned,
  ShieldAlert,
  CloudLightning,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react-native';
import { Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Card, EmptyState, ListRow, useAppColors } from '@/src/components/ui';
import { useAppStore } from '@/src/stores/useAppStore';
import { space, type } from '@/src/theme/tokens';

export default function AlertsScreen() {
  const alerts = useAppStore((state) => state.alerts);
  const c = useAppColors();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  return (
    <Screen
      title="Alerts"
      subtitle="A local, reverse-chronological record of safety events and notices."
    >
      <View style={{ flexDirection: 'row', gap: space.xs, marginBottom: space.xs }}>
        <Text style={[type.caption, { color: c.primary }]}>All</Text>
        <Text style={[type.caption, { color: c.onSurfaceVariant }]}>Zones</Text>
        <Text style={[type.caption, { color: c.onSurfaceVariant }]}>Check-ins</Text>
        <Text style={[type.caption, { color: c.onSurfaceVariant }]}>Incidents</Text>
      </View>

      {alerts.length ? (
        <Card>
          {alerts.map((alert) => (
            <ListRow
              key={alert.id}
              icon={
                alert.severity === 'critical' ? (
                  <ShieldAlert color={c.critical} />
                ) : alert.kind === 'zone' ? (
                  <MapPinned color={c.warning} />
                ) : (
                  <BellRing color={c.primary} />
                )
              }
              title={alert.title}
              sub={alert.body}
              onPress={() =>
                alert.kind === 'incident' ? router.push('/incident/current') : undefined
              }
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          title="Nothing needs your attention"
          body="Zone notices, check-ins and incident updates will appear here."
        />
      )}

      {/* Disasters in India Section */}
      <View style={{ marginTop: space.lg, gap: space.sm }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={[type.title, { color: c.onSurface }]}>Disasters in India</Text>
          <TouchableOpacity onPress={handleRefresh} style={{ padding: 4 }}>
            {refreshing ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <RefreshCw size={20} color={c.primary} />
            )}
          </TouchableOpacity>
        </View>

        <Card style={{ borderColor: c.critical, borderWidth: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.xs,
              marginBottom: space.sm,
            }}
          >
            <AlertTriangle size={20} color={c.critical} />
            <Text style={[type.caption, { color: c.critical, fontWeight: 'bold' }]}>
              ACTIVE MONITORING
            </Text>
          </View>
          <Text style={[type.body, { color: c.onSurfaceVariant, marginBottom: space.md }]}>
            You will be automatically notified if a new disaster takes place in your area via
            real-time satellite and meteorological alerts.
          </Text>

          <View style={{ gap: space.sm }}>
            <ListRow
              icon={<CloudLightning color={c.warning} />}
              title="Severe Cyclone Warning (Biparjoy)"
              sub="Gujarat Coast · Valid till 15 Aug"
            />
            <ListRow
              icon={<CloudLightning color={c.primary} />}
              title="Heavy Rainfall Alert"
              sub="Bengaluru Urban · IMD Yellow Alert"
            />
            <ListRow
              icon={<CloudLightning color={c.error} />}
              title="Flash Flood Advisory"
              sub="Himachal Pradesh · Avoid travel"
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
