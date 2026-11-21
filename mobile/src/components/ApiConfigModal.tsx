import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getApiBaseUrl, setApiBaseUrl, resetApiBaseUrl, api } from '../services/api';

export interface ApiConfigModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  isDark?: boolean;
}

export function ApiConfigModal({ visible, onClose, colors, isDark }: ApiConfigModalProps) {
  const [url, setUrl] = useState('');
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pingMsg, setPingMsg] = useState('');

  useEffect(() => {
    if (visible) {
      getApiBaseUrl().then((u) => setUrl(u));
      setPingStatus('idle');
      setPingMsg('');
    }
  }, [visible]);

  const handleTest = async () => {
    if (!url.trim()) {
      setPingStatus('error');
      setPingMsg('Veuillez entrer une URL valide.');
      return;
    }
    setPingStatus('testing');
    setPingMsg('Test du tunnel ngrok en cours…');
    try {
      await setApiBaseUrl(url.trim());
      const result = await api.ping();
      if (result.ok) {
        setPingStatus('success');
        setPingMsg(result.message);
      } else {
        setPingStatus('error');
        setPingMsg(result.message);
      }
    } catch (err: any) {
      setPingStatus('error');
      setPingMsg(err.message || 'Impossible de joindre cette URL ngrok.');
    }
  };

  const handleSave = async () => {
    if (!url.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une URL valide.');
      return;
    }
    await setApiBaseUrl(url.trim());
    Alert.alert('Configuration enregistrée', `L'URL API utilisée par l'application est maintenant :\n${url.trim()}`);
    onClose();
  };

  const handleReset = async () => {
    await resetApiBaseUrl();
    const defaultUrl = await getApiBaseUrl();
    setUrl(defaultUrl);
    setPingStatus('idle');
    setPingMsg('URL réinitialisée à sa valeur par défaut.');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
              <Feather name="server" size={20} color={colors.accentText || colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.title, { color: colors.text }]}>Configuration API & ngrok</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Connexion directe au backend Express local
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <Text style={[styles.instructions, { color: colors.textSecondary }]}>
            Entrez l'URL HTTPS publique fournie par ngrok sur votre machine. Le header{' '}
            <Text style={{ fontWeight: '700', color: colors.text }}>ngrok-skip-browser-warning</Text> est injecté
            automatiquement.
          </Text>

          {/* URL Input */}
          <View style={styles.inputWrap}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={url}
              onChangeText={setUrl}
              placeholder="https://xxxx-xx.ngrok-free.app/api"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Live Ping Status Indicator */}
          {pingStatus !== 'idle' && (
            <View
              style={[
                styles.pingBox,
                {
                  backgroundColor:
                    pingStatus === 'testing'
                      ? colors.surfaceMuted
                      : pingStatus === 'success'
                      ? colors.successSoft
                      : colors.dangerSoft,
                  borderColor:
                    pingStatus === 'testing'
                      ? colors.border
                      : pingStatus === 'success'
                      ? colors.success
                      : colors.danger,
                },
              ]}
            >
              {pingStatus === 'testing' ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
              ) : (
                <Feather
                  name={pingStatus === 'success' ? 'check-circle' : 'alert-circle'}
                  size={16}
                  color={pingStatus === 'success' ? colors.success : colors.danger}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                style={[
                  styles.pingText,
                  {
                    color:
                      pingStatus === 'testing'
                        ? colors.text
                        : pingStatus === 'success'
                        ? colors.success
                        : colors.danger,
                  },
                ]}
              >
                {pingMsg}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handleTest}
              style={[styles.btnSecondary, { borderColor: colors.border }]}
              disabled={pingStatus === 'testing'}
            >
              <Feather name="activity" size={14} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={[styles.btnSecondaryText, { color: colors.text }]}>Tester</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleReset}
              style={[styles.btnSecondary, { borderColor: colors.border }]}
            >
              <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>Réinit.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.btnPrimary, { backgroundColor: colors.primaryStrong }]}
            >
              <Text style={styles.btnPrimaryText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  instructions: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  inputWrap: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  pingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  pingText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
