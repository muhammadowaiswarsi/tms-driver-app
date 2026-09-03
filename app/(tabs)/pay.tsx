import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from 'react-native-elements';
import DriverLayout from '../../src/components/common/DriverLayout';
import { useDriverPaySummary } from '../../src/hooks/useDriverPay';
import { driverTheme } from '../../src/theme/driverTheme';
import type { DriverPayLoadGroup, DriverPaySummary } from '../../src/types/driver.types';

const formatMoney = (value: number) => {
  const amount = Number(value) || 0;
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatRoute = (fromLocation?: string, toLocation?: string) => {
  const from = (fromLocation || '').trim();
  const to = (toLocation || '').trim();
  if (from && to) return `${from} → ${to}`;
  return from || to || 'Load pay';
};

const splitLineItem = (item: DriverPayLoadGroup['lineItems'][number]) => {
  const raw = String(item.label || 'Pay');
  const paren = raw.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (paren) {
    return { label: paren[1], detail: item.detail || paren[2] };
  }
  if (item.detail) {
    return { label: raw, detail: item.detail };
  }
  return { label: raw, detail: '' };
};

const Pay: React.FC = () => {
  const { data, isLoading, refetch, isRefetching } = useDriverPaySummary();
  const [expandedLoadId, setExpandedLoadId] = useState<string | null>(null);

  const summary: DriverPaySummary = useMemo(() => {
    const payload = data?.data || data || {};
    return {
      netEarnings: Number(payload.netEarnings) || 0,
      gross: Number(payload.gross) || 0,
      miles: Number(payload.miles) || 0,
      loadCount: Number(payload.loadCount) || 0,
      changePercent: Number(payload.changePercent) || 0,
      loadsThisWeek: Number(payload.loadsThisWeek) || 0,
      loads: Array.isArray(payload.loads) ? payload.loads : [],
    };
  }, [data]);

  const toggleLoad = (loadId: string) => {
    setExpandedLoadId((current) => (current === loadId ? null : loadId));
  };

  const changePercent = summary.changePercent;
  const changeIsPositive = changePercent >= 0;

  const renderLoadCard = (load: DriverPayLoadGroup) => {
    const expanded = expandedLoadId === load.loadId;
    const milesLabel = `${Math.round(Number(load.miles) || 0)} mi`;
    const meta = [load.loadNumber, formatDate(load.date), milesLabel].filter(Boolean).join(' · ');

    return (
      <TouchableOpacity
        key={load.loadId}
        style={[styles.loadCard, expanded && styles.loadCardExpanded]}
        onPress={() => toggleLoad(load.loadId)}
        activeOpacity={0.85}
      >
        <View style={styles.loadHeader}>
          <View style={styles.truckIcon}>
            <Icon name="local-shipping" type="material" color={driverTheme.colors.primary.main} size={20} />
          </View>
          <View style={styles.loadInfo}>
            <Text style={styles.loadRoute} numberOfLines={1}>
              {formatRoute(load.fromLocation, load.toLocation)}
            </Text>
            {!!meta && (
              <Text style={styles.loadMeta} numberOfLines={1}>
                {meta}
              </Text>
            )}
          </View>
          <Text style={styles.loadTotal}>{formatMoney(load.total)}</Text>
          <Icon
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            type="material"
            color={driverTheme.colors.text.secondary}
            size={22}
          />
        </View>

        {expanded && (
          <View style={styles.breakdown}>
            <Text style={styles.breakdownTitle}>Driver Pay Breakdown</Text>
            {(load.lineItems || []).map((item) => {
              const { label, detail } = splitLineItem(item);
              const isDeduction = item.amount < 0;
              return (
                <View key={item.id} style={styles.breakdownRow}>
                  <View style={styles.breakdownCopy}>
                    <Text style={styles.breakdownLabel}>{label}</Text>
                    {!!detail && <Text style={styles.breakdownDetail}>{detail}</Text>}
                  </View>
                  <Text style={[styles.breakdownAmount, isDeduction && styles.deductionAmount]}>
                    {formatMoney(item.amount)}
                  </Text>
                </View>
              );
            })}
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Total</Text>
              <Text style={styles.breakdownTotalValue}>{formatMoney(load.total)}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <DriverLayout currentTab="pay">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>NET EARNINGS</Text>
            <View
              style={[
                styles.changeBadge,
                changeIsPositive ? styles.changeBadgeUp : styles.changeBadgeDown,
              ]}
            >
              <Icon
                name={changeIsPositive ? 'trending-up' : 'trending-down'}
                type="material"
                color={changeIsPositive ? '#5AA2FF' : '#F87171'}
                size={14}
              />
              <Text
                style={[
                  styles.changeBadgeText,
                  { color: changeIsPositive ? '#5AA2FF' : '#F87171' },
                ]}
              >
                {changeIsPositive ? '+' : '-'}
                {Math.abs(changePercent).toFixed(1)}%
              </Text>
            </View>
          </View>
          <Text style={styles.summaryValue}>{formatMoney(summary.netEarnings)}</Text>
          <View style={styles.summaryStats}>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Gross</Text>
              <Text style={styles.statValue}>{formatMoney(summary.gross)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Miles</Text>
              <Text style={styles.statValue}>{Math.round(summary.miles)} mi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Loads</Text>
              <Text style={styles.statValue}>{summary.loadCount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LOAD PAY</Text>
          <Text style={styles.sectionSubtitle}>
            {summary.loadsThisWeek > 0
              ? `${summary.loadsThisWeek} loads this week`
              : `${summary.loads.length} loads`}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={driverTheme.colors.primary.main} />
          </View>
        ) : summary.loads.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Icon
                name="account-balance-wallet"
                type="material"
                color={driverTheme.colors.primary.main}
                size={36}
              />
            </View>
            <Text style={styles.emptyTitle}>No pay yet</Text>
            <Text style={styles.emptySubtitle}>
              Completed load pay will show up here with a full driver pay breakdown.
            </Text>
          </View>
        ) : (
          summary.loads.map(renderLoadCard)
        )}
      </ScrollView>
    </DriverLayout>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  content: {
    padding: driverTheme.spacing.md,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: '#1B2430',
    borderRadius: 16,
    padding: driverTheme.spacing.lg,
    marginBottom: driverTheme.spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: '#8FB3E8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  changeBadgeUp: {
    backgroundColor: 'rgba(0, 102, 255, 0.22)',
  },
  changeBadgeDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
  },
  changeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.16)',
    paddingTop: 14,
  },
  statBlock: {
    alignItems: 'flex-start',
    paddingRight: 16,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginRight: 16,
  },
  statLabel: {
    color: '#9AA4B2',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: driverTheme.colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    color: driverTheme.colors.text.disabled,
    fontSize: 12,
  },
  loadCard: {
    backgroundColor: driverTheme.colors.background.paper,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6EAF0',
  },
  loadCardExpanded: {
    borderColor: driverTheme.colors.primary.main,
  },
  loadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  truckIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F1FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  loadInfo: {
    flex: 1,
    marginRight: 8,
  },
  loadRoute: {
    fontSize: 14,
    fontWeight: '700',
    color: driverTheme.colors.text.primary,
  },
  loadMeta: {
    fontSize: 12,
    color: driverTheme.colors.text.secondary,
    marginTop: 2,
  },
  loadTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: driverTheme.colors.text.primary,
    marginRight: 4,
  },
  breakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: driverTheme.colors.divider,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: driverTheme.colors.text.secondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  breakdownCopy: {
    flex: 1,
    paddingRight: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: driverTheme.colors.text.primary,
    fontWeight: '500',
  },
  breakdownDetail: {
    fontSize: 12,
    color: driverTheme.colors.text.secondary,
    marginTop: 2,
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: driverTheme.colors.text.primary,
  },
  deductionAmount: {
    color: driverTheme.colors.error.main,
  },
  breakdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: driverTheme.colors.divider,
    marginBottom: 10,
  },
  breakdownTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: driverTheme.colors.text.primary,
  },
  breakdownTotalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: driverTheme.colors.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F1FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: driverTheme.colors.primary.main,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: driverTheme.colors.text.secondary,
    textAlign: 'center',
  },
});

export default Pay;
