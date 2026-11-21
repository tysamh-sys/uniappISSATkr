import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle: string;
  colors: any;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'calendar',
  title,
  subtitle,
  colors,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const renderIcon = () => {
    switch (icon) {
      case 'calendar':
        return <Feather name="calendar" size={32} color={colors.accent} />;
      case 'checkCircle':
        return <Feather name="check-circle" size={32} color={colors.success} />;
      case 'bell':
        return <Feather name="bell" size={32} color={colors.accent} />;
      case 'users':
        return <Feather name="users" size={32} color={colors.accent} />;
      case 'wifiOff':
        return <Feather name="wifi-off" size={32} color={colors.warning} />;
      case 'file':
        return <Feather name="file-text" size={32} color={colors.accent} />;
      default:
        return <Feather name="inbox" size={32} color={colors.accent} />;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.text,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
        {renderIcon()}
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.actionBtn, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
