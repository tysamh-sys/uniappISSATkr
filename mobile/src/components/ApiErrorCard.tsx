import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface ApiErrorCardProps {
  message: string;
  onRetry?: () => void;
  colors: any;
  isDark?: boolean;
}

export function ApiErrorCard({ message, onRetry, colors }: ApiErrorCardProps) {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.dangerSoft,
          borderColor: colors.danger,
        },
      ]}
    >
      <View style={styles.header}>
        <Feather name="alert-circle" size={18} color={colors.danger} />
        <Text style={[styles.title, { color: colors.danger }]}>Problème de connexion</Text>
      </View>
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={[styles.retryBtn, { backgroundColor: colors.danger }]}
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
