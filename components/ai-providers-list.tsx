import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from './ui/icon-symbol';
import { AIProviderConfigComponent } from './ai-provider-config';
import { useColors } from '@/hooks/use-colors';
import {
  AIProvider,
  AIProviderConfig,
  PROVIDER_METADATA,
} from '@/lib/ai-providers';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AIProvidersListProps {
  providers: Record<AIProvider, AIProviderConfig>;
  defaultProvider: AIProvider;
  onUpdateProvider: (provider: AIProvider, config: AIProviderConfig) => void;
  onSetDefaultProvider: (provider: AIProvider) => void;
}

export function AIProvidersList({
  providers,
  defaultProvider,
  onUpdateProvider,
  onSetDefaultProvider,
}: AIProvidersListProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>(null);

  const handleToggleExpand = (provider: AIProvider) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedProvider(expandedProvider === provider ? null : provider);
  };

  const providerList: AIProvider[] = ['builtin', 'openai', 'deepseek', 'claude', 'aliyun', 'baidu'];

  return (
    <View>
      {providerList.map((provider) => {
        const config = providers[provider];
        const metadata = PROVIDER_METADATA[provider];
        const isExpanded = expandedProvider === provider;
        const isDefault = defaultProvider === provider;
        const isEnabled = config.enabled;

        return (
          <View key={provider} style={styles.providerContainer}>
            {/* Collapsed Header */}
            <TouchableOpacity
              style={[
                styles.collapsedHeader,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDefault ? colors.primary : colors.border,
                  borderWidth: isDefault ? 2 : 1,
                },
              ]}
              onPress={() => handleToggleExpand(provider)}
            >
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.providerIcon,
                    { backgroundColor: colors.primary + '22' },
                  ]}
                >
                  <IconSymbol
                    name={provider === 'openai' ? 'ai' : 'settings'}
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.providerName, { color: colors.foreground }]}>
                    {metadata.name}
                  </Text>
                  <Text style={[styles.providerStatus, { color: colors.muted }]}>
                    {isEnabled ? t('settings.aiEnabled') : t('settings.aiDisabled')}
                    {isDefault && ` • ${t('common.default')}`}
                  </Text>
                </View>
              </View>

              <View style={styles.headerRight}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isEnabled ? colors.success : colors.muted },
                  ]}
                />
                <IconSymbol
                  name={isExpanded ? 'chevron.up' : 'chevron.down'}
                  size={20}
                  color={colors.muted}
                />
              </View>
            </TouchableOpacity>

            {/* Expanded Content */}
            {isExpanded && (
              <View
                style={[
                  styles.expandedContent,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <AIProviderConfigComponent
                  provider={provider}
                  config={config}
                  onUpdate={(newConfig) => onUpdateProvider(provider, newConfig)}
                  onSetDefault={() => onSetDefaultProvider(provider)}
                  isDefault={isDefault}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  providerContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  providerStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: 12,
    marginTop: -1,
  },
});
