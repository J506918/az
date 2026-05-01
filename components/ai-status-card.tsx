import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

type AIStatus = 'checking' | 'available' | 'error' | 'network_error' | 'unknown';

interface AIStatusCardProps {
  providers: Record<AIProvider, AIProviderConfig>;
  defaultProvider: AIProvider;
  onUpdateProvider: (provider: AIProvider, config: AIProviderConfig) => void;
  onSetDefaultProvider: (provider: AIProvider) => void;
}

export function AIStatusCard({
  providers,
  defaultProvider,
  onUpdateProvider,
  onSetDefaultProvider,
}: AIStatusCardProps) {
  const { t } = useTranslation();
  const colors = useColors();

  // State management
  const [status, setStatus] = useState<AIStatus>('unknown');
  const [displayStatus, setDisplayStatus] = useState<AIStatus>('unknown');
  const [providerModalVisible, setProviderModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [isManualCheck, setIsManualCheck] = useState(false); // Track if check is manual or periodic

  // Animation values
  const breathingAnimRef = useRef(new Animated.Value(1));
  const breathingAnim = breathingAnimRef.current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  
  // Type-safe listener ID tracking
  const listenerIdRef = useRef<string | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');

  // All providers available for selection
  const providerList: AIProvider[] = ['builtin', 'openai', 'deepseek', 'claude', 'aliyun', 'baidu'];
  const enabledProviders = providerList.filter((p) => providers[p]?.enabled && p !== 'builtin');
  const defaultProviderMetadata = PROVIDER_METADATA[defaultProvider];

  // Validate that providers is properly initialized
  if (!providers || Object.keys(providers).length === 0) {
    console.error('[AIStatusCard] Invalid providers prop');
    return (
      <View style={{ padding: 16, backgroundColor: '#fee2e2', borderRadius: 8 }}>
        <Text style={{ color: '#dc2626' }}>AI Status Card: Invalid configuration</Text>
      </View>
    );
  }

  if (!defaultProvider || !PROVIDER_METADATA[defaultProvider]) {
    console.error('[AIStatusCard] Invalid defaultProvider:', defaultProvider);
    return (
      <View style={{ padding: 16, backgroundColor: '#fee2e2', borderRadius: 8 }}>
        <Text style={{ color: '#dc2626' }}>AI Status Card: Invalid provider</Text>
      </View>
    );
  }

  // Breathing light animation with candle effect
  const smoothEasing = Easing.bezier(0.25, 0.1, 0.25, 1.0);

  useEffect(() => {
    // Clean up any existing listener before starting new animation
    if (listenerIdRef.current !== null) {
      (breathingAnim as any).removeListener(listenerIdRef.current);
      listenerIdRef.current = null;
    }
    
    // Only animate breathing for 'checking' status (yellow)
    // For other statuses, keep the light at full opacity (1)
    if (displayStatus === 'checking') {
      const breathing = Animated.loop(
        Animated.sequence([
          // Fade out: 1 -> 0 (缓慢熄灭)
          Animated.timing(breathingAnim, {
            toValue: 0,
            duration: 800,
            easing: smoothEasing,
            useNativeDriver: false,
          }),
          // Fade in: 0 -> 1 (缓慢点亮)
          Animated.timing(breathingAnim, {
            toValue: 1,
            duration: 800,
            easing: smoothEasing,
            useNativeDriver: false,
          }),
        ])
      );
      breathing.start();
      return () => breathing.stop();
    } else {
      // For non-checking statuses, keep light fully visible
      Animated.timing(breathingAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: false,
      }).start();
    }
  }, [displayStatus]);

  // Update display status when actual status changes
  // Always switch immediately to show the new status
  // This ensures: gray→yellow (checking) → green/red (result)
  useEffect(() => {
    setDisplayStatus(status);
  }, [status]);

  // Check AI status on mount and every 5 seconds
  useEffect(() => {
    // Initial check is manual (show yellow)
    checkAIStatus(true);
    // Periodic checks are not manual (don't show yellow)
    const interval = setInterval(() => checkAIStatus(false), 5000); // Check every 5 seconds
    return () => {
      clearInterval(interval);
    };
  }, [defaultProvider, providers]);

  const checkAIStatus = async (isManual: boolean = false) => {
    try {
      const config = providers[defaultProvider];
      
      // 无网络 -> 灰色
      if (!config) {
        setStatus('network_error');
        return;
      }

      // 未启用 -> 灰色
      if (!config.enabled) {
        setStatus('network_error');
        return;
      }

      // 只在手动切换时显示黄色（checking）
      // 定时检查时直接检查，不显示黄色
      if (isManual) {
        setStatus('checking');
      }

      // 对所有提供商进行验证（包括内置 AI）
      // 验证包括：配置检查 + 网络连接检查
      if (defaultProvider !== 'builtin' && !config.apiKey) {
        // 外置 AI 必须有 API Key
        setStatus('error');
        return;
      }

      // 测试连接（验证网络和后端可用性）
      const result = await testAiProviderConnection(defaultProvider, config);
      if (result.success) {
        setStatus('available');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('[AIStatusCard] Error checking AI status:', error);
      setStatus('network_error');
    }
  };

  const getStatusColor = (status: AIStatus): string => {
    switch (status) {
      case 'available':
        return '#22C55E'; // Bright green
      case 'checking':
        return '#EAB308'; // Bright yellow
      case 'error':
        return '#EF4444'; // Bright red
      case 'network_error':
        return '#999999'; // Medium gray
      case 'unknown':
      default:
        return '#999999'; // Medium gray
    }
  };

  const getStatusLabel = () => {
    switch (displayStatus) {
      case 'available':
        return t('settings.aiStatusNormal');
      case 'checking':
        return t('settings.aiStatusChecking') || 'Checking...';
      case 'error':
        return t('settings.aiStatusError');
      case 'network_error':
        return t('settings.aiStatusNetworkError');
      default:
        return t('settings.aiStatusUnknown');
    }
  };

  const handlePressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 0.97,
      duration: 80,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 80,
      useNativeDriver: false,
    }).start();
  };

  const handleSelectProvider = (provider: AIProvider) => {
    try {
      setSelectedProvider(provider);
      const config = providers[provider];
      if (!config) {
        console.warn('[AIStatusCard] No config found for provider:', provider);
        return;
      }
      setApiKey(config.apiKey || '');
      setBaseUrl(config.baseUrl || DEFAULT_PROVIDER_CONFIGS[provider]?.baseUrl || '');
      setModel(config.model || DEFAULT_PROVIDER_CONFIGS[provider]?.model || '');
      setTestResult(null);
      setProviderModalVisible(false);
      setConfigModalVisible(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('[AIStatusCard] Error selecting provider:', error);
      Alert.alert('Error', 'Failed to select provider');
    }
  };

  const handleSetDefaultProvider = async (provider: AIProvider) => {
    try {
      // Set the default provider first
      onSetDefaultProvider(provider);
      
      // Immediately trigger status check for the new provider
      // This ensures the status light reflects the actual state, not just UI state
      const config = providers[provider];
      if (config) {
        // Start checking animation
        setStatus('checking');
        
        // Test connection for ALL providers (including built-in)
        // This validates both configuration and network connectivity
        const result = await testAiProviderConnection(provider, config);
        setStatus(result.success ? 'available' : 'error');
      }
    } catch (error) {
      console.error('[AIStatusCard] Error setting default provider:', error);
      setStatus('error');
    }
  };

  const handleSaveConfig = () => {
    try {
      if (!selectedProvider) {
        Alert.alert('Error', 'No provider selected');
        return;
      }

      if (selectedProvider === 'builtin') {
      onSetDefaultProvider(selectedProvider);
      setConfigModalVisible(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
      }

      if (!apiKey.trim()) {
        Alert.alert(t('common.error'), 'Please enter API Key');
        return;
      }

      const defaults = DEFAULT_PROVIDER_CONFIGS[selectedProvider];
      const newConfig: AIProviderConfig = {
        provider: selectedProvider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || defaults?.baseUrl || '',
        model: model.trim() || defaults?.model || '',
        enabled: true,
      };
      
      onUpdateProvider(selectedProvider, newConfig);
      handleSetDefaultProvider(selectedProvider);
      setConfigModalVisible(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[AIStatusCard] Error saving config:', error);
      Alert.alert('Error', 'Failed to save configuration');
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProvider) {
      Alert.alert('Error', 'No provider selected');
      return;
    }

    setTesting(true);
    try {
      const defaults = DEFAULT_PROVIDER_CONFIGS[selectedProvider];
      const testConfig: AIProviderConfig = {
        provider: selectedProvider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || defaults?.baseUrl || '',
        model: model.trim() || defaults?.model || '',
        enabled: true,
      };
      
      const result = await testAiProviderConnection(selectedProvider, testConfig);

      setTestResult(result);
      Haptics.notificationAsync(
        result.success
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    } catch (error) {
      console.error('[AIStatusCard] Error testing connection:', error);
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTesting(false);
    }
  };

  // Color interpolation: only breathe for 'checking' status
  // For other statuses, always show full opacity
  const statusColor = displayStatus === 'checking' 
    ? breathingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [getStatusColor(displayStatus) + '0D', getStatusColor(displayStatus) + 'FF'],
      }) as any
    : getStatusColor(displayStatus) + 'FF';

  const statusBorderColor = displayStatus === 'checking'
    ? breathingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [getStatusColor(displayStatus) + '1A', getStatusColor(displayStatus) + 'FF'],
      }) as any
    : getStatusColor(displayStatus) + 'FF';

  // Breathing light border width - reduced by 1/3 from 4px to 2.7px
  const breathingLightBorderWidth = 2.7;

  const styles = StyleSheet.create({
    cardContainer: {
      marginBottom: 16,
      overflow: 'hidden',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    breathingLight: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginLeft: 12,
      marginRight: 0,
      borderWidth: breathingLightBorderWidth,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      color: colors.muted,
    },
    chevron: {
      marginLeft: 8,
      display: 'none',
    },

    // Modal styles
    modal: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    modalBtn: {
      fontSize: 14,
      fontWeight: '500',
    },

    // Provider selection
    providerSelectContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    providerSelectItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 8,
      marginBottom: 12,
      borderWidth: 1,
    },
    providerSelectIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    providerSelectName: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
    },
    providerSelectDesc: {
      fontSize: 12,
      marginBottom: 4,
    },
    enabledTag: {
      fontSize: 11,
      fontWeight: '500',
    },
    builtinTag: {
      fontSize: 11,
    },

    // Configuration
    configContent: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    builtInInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 16,
    },
    builtInInfoTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    builtInInfoDesc: {
      fontSize: 12,
      lineHeight: 18,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      marginBottom: 4,
    },
    testButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
      gap: 8,
    },
    testButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    testResult: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 12,
    },
    testResultText: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    testResultMessage: {
      fontSize: 12,
      lineHeight: 18,
    },
    setDefaultButton: {
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 32,
    },
    setDefaultButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <>
      {/* AI Status Card */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [{ scale: pressAnim }] as any,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => setProviderModalVisible(true)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
        >
          <View style={styles.content}>
            <Text style={styles.title}>{defaultProviderMetadata?.name || 'AI'}</Text>
            <Text style={styles.subtitle}>{getStatusLabel()}</Text>
          </View>
          <Animated.View
            style={[
              styles.breathingLight,
              {
                backgroundColor: statusColor,
                borderColor: statusBorderColor,
              },
            ]}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Provider Selection Modal */}
      <Modal
        visible={providerModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProviderModalVisible(false)}
      >
        <SafeAreaView style={[styles.modal]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setProviderModalVisible(false)}>
              <Text style={[styles.modalBtn, { color: colors.muted }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {t('settings.selectAiProvider')}
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <FlatList
            data={providerList}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.providerSelectContainer}
            renderItem={({ item: provider }) => {
              const metadata = PROVIDER_METADATA[provider];
              const isEnabled = provider === defaultProvider;

              return (
                <TouchableOpacity
                  style={[
                    styles.providerSelectItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isEnabled ? colors.primary : colors.border,
                      borderWidth: isEnabled ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleSelectProvider(provider)}
                >
                  <View
                    style={[
                      styles.providerSelectIcon,
                      { backgroundColor: colors.primary + '22' },
                    ]}
                  >
                    <IconSymbol name="ai" size={20} color={colors.primary} />
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
                    {provider === 'builtin' && (
                      <Text style={[styles.builtinTag, { color: colors.muted }]}>
                        {t('settings.aiBuiltIn')}
                      </Text>
                    )}
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.muted} />
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Configuration Modal */}
      {selectedProvider && (
        <Modal
          visible={configModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setConfigModalVisible(false)}
        >
          <SafeAreaView style={[styles.modal]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setConfigModalVisible(false)}>
                <Text style={[styles.modalBtn, { color: colors.muted }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {selectedProvider && PROVIDER_METADATA[selectedProvider]
                  ? PROVIDER_METADATA[selectedProvider].name
                  : 'Configuration'}
              </Text>
              {selectedProvider !== 'builtin' && (
                <TouchableOpacity onPress={handleSaveConfig}>
                  <Text style={[styles.modalBtn, { color: colors.primary }]}>{t('common.save')}</Text>
                </TouchableOpacity>
              )}
              {selectedProvider === 'builtin' && (
                <View style={{ width: 50 }} />
              )}
            </View>

            <ScrollView contentContainerStyle={styles.configContent}>
              {selectedProvider === 'builtin' ? (
                // Built-in AI: Show info only (no configuration needed)
                <View
                  style={[
                    styles.builtInInfo,
                    { backgroundColor: colors.primary + '22', borderColor: colors.primary },
                  ]}
                >
                  <IconSymbol name="info" size={20} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.builtInInfoTitle, { color: colors.primary }]}>
                      {t('settings.builtInAi')}
                    </Text>
                    <Text style={[styles.builtInInfoDesc, { color: colors.muted }]}>
                      {t('settings.builtInAiDesc')}
                    </Text>
                  </View>
                </View>
              ) : null}
              {selectedProvider !== 'builtin' ? (
                // External AI: Show configuration fields
                <>
                  <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 0 }]}>
                    {t('settings.apiKey')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { borderColor: colors.border, color: colors.foreground },
                    ]}
                    placeholder="Enter API Key"
                    placeholderTextColor={colors.muted}
                    value={apiKey}
                    onChangeText={setApiKey}
                    secureTextEntry
                  />

                  <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>
                    {t('settings.baseUrl')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { borderColor: colors.border, color: colors.foreground },
                    ]}
                    placeholder="Enter Base URL (optional)"
                    placeholderTextColor={colors.muted}
                    value={baseUrl}
                    onChangeText={setBaseUrl}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>
                    {t('settings.model')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { borderColor: colors.border, color: colors.foreground },
                    ]}
                    placeholder="Enter Model (optional)"
                    placeholderTextColor={colors.muted}
                    value={model}
                    onChangeText={setModel}
                  />

                  <TouchableOpacity
                    style={[styles.testButton, { backgroundColor: colors.primary }]}
                    onPress={handleTestConnection}
                    disabled={testing}
                  >
                    {testing ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.testButtonText}>{t('settings.testing') || 'Testing...'}</Text>
                      </>
                    ) : (
                      <>
                        <IconSymbol name="check" size={16} color="#fff" />
                        <Text style={styles.testButtonText}>{t('settings.testConnection') || 'Test Connection'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.setDefaultButton,
                      { backgroundColor: colors.primary, marginTop: 12 },
                    ]}
                    onPress={handleSaveConfig}
                  >
                    <Text style={[styles.setDefaultButtonText, { color: colors.background }]}>
                      {t('settings.enableProvider') || 'Enable Provider'}
                    </Text>
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
                          {
                            color: testResult.success ? colors.success : colors.error,
                          },
                        ]}
                      >
                        {testResult.success ? t('settings.testSuccess') : t('settings.testFailed')}
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
              ) : null}
              {selectedProvider === 'builtin' && (
                // Built-in AI: Show enable button at bottom
                <TouchableOpacity
                  style={[styles.setDefaultButton, { backgroundColor: colors.primary, marginTop: 16 }]}
                  onPress={() => {
                    handleSetDefaultProvider('builtin');
                    setConfigModalVisible(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                >
                  <Text style={[styles.setDefaultButtonText, { color: colors.background }]}>
                    {t('common.enable') || 'Enable'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}
