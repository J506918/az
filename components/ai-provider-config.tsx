import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from './ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import {
  AIProvider,
  AIProviderConfig,
  PROVIDER_METADATA,
  DEFAULT_PROVIDER_CONFIGS,
} from '@/lib/ai-providers';
import { testAiProviderConnection } from '@/lib/ai-client';

interface AIProviderConfigProps {
  provider: AIProvider;
  config: AIProviderConfig;
  onUpdate: (config: AIProviderConfig) => void;
  onSetDefault?: () => void;
  isDefault?: boolean;
}

export function AIProviderConfigComponent({
  provider,
  config,
  onUpdate,
  onSetDefault,
  isDefault,
}: AIProviderConfigProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || '');
  const [model, setModel] = useState(config.model || '');
  const [enabled, setEnabled] = useState(config.enabled || false);

  const metadata = PROVIDER_METADATA[provider];
  const defaults = DEFAULT_PROVIDER_CONFIGS[provider];

  const handleSave = () => {
    // Validate required fields
    if (provider !== 'builtin' && !apiKey.trim()) {
      Alert.alert(t('common.error'), t('settings.apiKeyPlaceholder'));
      return;
    }

    onUpdate({
      provider,
      apiKey: apiKey.trim() || undefined,
      baseUrl: baseUrl.trim() || defaults?.baseUrl,
      model: model.trim() || defaults?.model,
      enabled,
    });

    setModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await testAiProviderConnection(provider, {
        provider,
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || defaults?.baseUrl,
        model: model.trim() || defaults?.model,
        enabled: true,
      });

      setTestResult(result);
      Haptics.notificationAsync(
        result.success
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      {/* Provider Card */}
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isDefault ? colors.primary : colors.border,
            borderWidth: isDefault ? 2 : 1,
          },
        ]}
        onPress={() => {
          setApiKey(config.apiKey || '');
          setBaseUrl(config.baseUrl || defaults?.baseUrl || '');
          setModel(config.model || defaults?.model || '');
          setEnabled(config.enabled || false);
          setTestResult(null);
          setModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.providerIcon, { backgroundColor: colors.primary + '22' }]}>
            <IconSymbol
              name={provider === 'openai' ? 'ai' : 'settings'}
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.providerName, { color: colors.foreground }]}>{metadata.name}</Text>
            <Text style={[styles.providerDesc, { color: colors.muted }]} numberOfLines={1}>
              {metadata.description}
            </Text>
          </View>
          <View style={styles.cardRight}>
            {isDefault && (
              <View
                style={[
                  styles.defaultBadge,
                  { backgroundColor: colors.primary + '22', borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.defaultBadgeText, { color: colors.primary }]}>
                  {t('common.default')}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: enabled ? colors.success : colors.muted },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Configuration Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[{ flex: 1, backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalBtn, { color: colors.muted }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {metadata.name}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalBtn, { color: colors.primary }]}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Provider Info */}
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>{t('settings.aiProvider')}</Text>
            <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.infoText, { color: colors.foreground }]}>{metadata.name}</Text>
              <Text style={[styles.infoDesc, { color: colors.muted }]}>{metadata.description}</Text>
            </View>

            {/* Enable Toggle */}
            <View style={styles.toggleRow}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>{t('settings.aiEnabled')}</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  {
                    backgroundColor: enabled ? colors.success : colors.muted,
                  },
                ]}
                onPress={() => setEnabled(!enabled)}
              >
                <Text style={styles.toggleButtonText}>{enabled ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>

            {/* API Key */}
            {provider !== 'builtin' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>
                  {t('settings.apiKey')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}

            {/* Base URL */}
            <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>
              {t('settings.aiBaseUrl')}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder="https://api.example.com/v1"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              editable={provider !== 'builtin'}
            />

            {/* Model */}
            <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>
              {t('settings.aiModel')}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              value={model}
              onChangeText={setModel}
              placeholder="gpt-4-turbo"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Test Connection Button */}
            {provider !== 'builtin' && (
              <>
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: colors.primary }]}
                  onPress={handleTestConnection}
                  disabled={testing || !apiKey.trim()}
                >
                  {testing ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.testButtonText}>{t('settings.aiTesting')}</Text>
                    </>
                  ) : (
                    <>
                      <IconSymbol name="checkmark" size={16} color="#fff" />
                      <Text style={styles.testButtonText}>{t('settings.aiTestConnection')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Test Result */}
                {testResult && (
                  <View
                    style={[
                      styles.testResult,
                      {
                        backgroundColor: testResult.success
                          ? colors.success + '22'
                          : colors.error + '22',
                        borderColor: testResult.success ? colors.success : colors.error,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.testResultText,
                        { color: testResult.success ? colors.success : colors.error },
                      ]}
                    >
                      {testResult.success
                        ? t('settings.aiConnectionSuccess')
                        : t('settings.aiConnectionFailed')}
                    </Text>
                    {testResult.message && (
                      <Text style={[styles.testResultMessage, { color: colors.muted }]}>
                        {testResult.message}
                      </Text>
                    )}
                    {testResult.error && (
                      <Text style={[styles.testResultMessage, { color: colors.error }]}>
                        {testResult.error}
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Set as Default Button */}
            {!isDefault && onSetDefault && (
              <TouchableOpacity
                style={[styles.setDefaultButton, { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}
                onPress={() => {
                  onSetDefault();
                  setModalVisible(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Text style={[styles.setDefaultButtonText, { color: colors.primary }]}>
                  {t('common.setAsDefault')}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  providerDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalBtn: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 12,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  testResult: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  testResultText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  testResultMessage: {
    fontSize: 12,
    marginTop: 4,
  },
  setDefaultButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  setDefaultButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
