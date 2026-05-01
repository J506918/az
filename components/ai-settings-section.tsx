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
  FlatList,
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

interface AISettingsSectionProps {
  providers: Record<AIProvider, AIProviderConfig>;
  defaultProvider: AIProvider;
  onUpdateProvider: (provider: AIProvider, config: AIProviderConfig) => void;
  onSetDefaultProvider: (provider: AIProvider) => void;
}

export function AISettingsSection({
  providers,
  defaultProvider,
  onUpdateProvider,
  onSetDefaultProvider,
}: AISettingsSectionProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const [providerModalVisible, setProviderModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [enabled, setEnabled] = useState(false);

  const providerList: AIProvider[] = ['builtin', 'openai', 'deepseek', 'claude', 'aliyun', 'baidu'];
  const enabledProviders = providerList.filter((p) => providers[p].enabled);
  const defaultProviderMetadata = PROVIDER_METADATA[defaultProvider];

  const handleSelectProvider = (provider: AIProvider) => {
    setSelectedProvider(provider);
    const config = providers[provider];
    const defaults = DEFAULT_PROVIDER_CONFIGS[provider];
    
    setApiKey(config.apiKey || '');
    setBaseUrl(config.baseUrl || defaults?.baseUrl || '');
    setModel(config.model || defaults?.model || '');
    setEnabled(config.enabled || false);
    setTestResult(null);
    
    setProviderModalVisible(false);
    setConfigModalVisible(true);
  };

  const handleSaveConfig = () => {
    if (!selectedProvider) return;

    // Validate required fields
    if (selectedProvider !== 'builtin' && !apiKey.trim()) {
      Alert.alert(t('common.error'), 'Please enter API Key');
      return;
    }

    const defaults = DEFAULT_PROVIDER_CONFIGS[selectedProvider];
    onUpdateProvider(selectedProvider, {
      provider: selectedProvider,
      apiKey: apiKey.trim() || undefined,
      baseUrl: baseUrl.trim() || defaults?.baseUrl,
      model: model.trim() || defaults?.model,
      enabled,
    });

    setConfigModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleTestConnection = async () => {
    if (!selectedProvider) return;

    setTesting(true);
    setTestResult(null);

    try {
      const defaults = DEFAULT_PROVIDER_CONFIGS[selectedProvider];
      const result = await testAiProviderConnection(selectedProvider, {
        provider: selectedProvider,
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
      {/* Default Provider Display */}
      <View
        style={[
          styles.defaultProviderCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
          },
        ]}
      >
        <View style={styles.defaultProviderContent}>
          <Text style={[styles.defaultLabel, { color: colors.muted }]}>
            {t('common.default')}
          </Text>
          <Text style={[styles.defaultProviderName, { color: colors.foreground }]}>
            {defaultProviderMetadata.name}
          </Text>
          <Text style={[styles.defaultProviderDesc, { color: colors.muted }]}>
            {defaultProviderMetadata.description}
          </Text>
        </View>
        <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
      </View>

      {/* Enabled Providers List */}
      {enabledProviders.length > 0 && (
        <View style={styles.enabledProvidersSection}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>
            {t('settings.aiEnabled')} ({enabledProviders.length})
          </Text>
          {enabledProviders.map((provider) => {
            const metadata = PROVIDER_METADATA[provider];
            const isDefault = provider === defaultProvider;

            return (
              <TouchableOpacity
                key={provider}
                style={[
                  styles.providerRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDefault ? colors.primary : colors.border,
                    borderWidth: isDefault ? 2 : 1,
                  },
                ]}
                onPress={() => handleSelectProvider(provider)}
              >
                <View style={styles.providerRowContent}>
                  <Text style={[styles.providerRowName, { color: colors.foreground }]}>
                    {metadata.name}
                  </Text>
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
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.muted} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Configure Button */}
      <TouchableOpacity
        style={[styles.configureBtn, { backgroundColor: colors.primary }]}
        onPress={() => setProviderModalVisible(true)}
      >
        <IconSymbol name="plus" size={20} color="#fff" />
        <Text style={styles.configureBtnText}>{t('settings.aiConfigureProvider')}</Text>
      </TouchableOpacity>

      {/* Provider Selection Modal */}
      <Modal visible={providerModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[{ flex: 1, backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setProviderModalVisible(false)}>
              <Text style={[styles.modalBtn, { color: colors.muted }]}>{t('common.close')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {t('settings.selectProvider')}
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <FlatList
            data={providerList}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.providerListContent}
            renderItem={({ item: provider }) => {
              const metadata = PROVIDER_METADATA[provider];
              const isEnabled = providers[provider].enabled;

              return (
                <TouchableOpacity
                  style={[
                    styles.providerSelectItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleSelectProvider(provider)}
                >
                  <View style={styles.providerSelectContent}>
                    <View
                      style={[
                        styles.providerSelectIcon,
                        { backgroundColor: colors.primary + '22' },
                      ]}
                    >
                      <IconSymbol
                        name={provider === 'openai' ? 'ai' : 'settings'}
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.providerSelectName, { color: colors.foreground }]}>
                        {metadata.name}
                      </Text>
                      <Text style={[styles.providerSelectDesc, { color: colors.muted }]}>
                        {metadata.description}
                      </Text>
                      {isEnabled && (
                        <Text style={[styles.enabledTag, { color: colors.success }]}>
                          ✓ {t('settings.aiEnabled')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.muted} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* Configuration Modal */}
      {selectedProvider && (
        <Modal visible={configModalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={[{ flex: 1, backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setConfigModalVisible(false)}>
                <Text style={[styles.modalBtn, { color: colors.muted }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {PROVIDER_METADATA[selectedProvider].name}
              </Text>
              <TouchableOpacity onPress={handleSaveConfig}>
                <Text style={[styles.modalBtn, { color: colors.primary }]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.configContent}>
              {/* Enable Toggle */}
              <View style={styles.toggleRow}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>
                  {t('settings.aiEnabled')}
                </Text>
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
              {selectedProvider !== 'builtin' && (
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
                editable={selectedProvider !== 'builtin'}
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

              {/* Test Connection */}
              {selectedProvider !== 'builtin' && (
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

              {/* Set as Default */}
              {defaultProvider !== selectedProvider && (
                <TouchableOpacity
                  style={[
                    styles.setDefaultButton,
                    { backgroundColor: colors.primary + '22', borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    onSetDefaultProvider(selectedProvider);
                    setConfigModalVisible(false);
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
      )}
    </>
  );
}

const styles = StyleSheet.create({
  defaultProviderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  defaultProviderContent: {
    flex: 1,
  },
  defaultLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  defaultProviderName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  defaultProviderDesc: {
    fontSize: 12,
  },
  enabledProvidersSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  providerRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerRowName: {
    fontSize: 14,
    fontWeight: '600',
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
  configureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 16,
  },
  configureBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  providerListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  providerSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  providerSelectContent: {
    flex: 1,
    gap: 4,
  },
  providerSelectIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerSelectName: {
    fontSize: 14,
    fontWeight: '600',
  },
  providerSelectDesc: {
    fontSize: 12,
  },
  enabledTag: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  configContent: {
    padding: 16,
    paddingBottom: 40,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
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
