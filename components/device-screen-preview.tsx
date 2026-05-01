'use client';

import { View, Image, Pressable, ActivityIndicator, Text, Modal, GestureResponderEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { getDeviceInfo, getDeviceImageUrl, type DeviceArchitecture } from '@/lib/device-manager';
import { sshService } from '@/lib/ssh-service';
import { useEffect, useRef, useState } from 'react';

interface DeviceScreenPreviewProps {
  architecture: DeviceArchitecture;
  isConnected: boolean;
  onScreenCapture?: (imageData: string) => void;
}

/**
 * Device Screen Preview Component
 * Shows device image with screen content rendered inside the green screen area
 * Positioned at top-left, small size
 * Tap to enter full-screen mode with touch support
 */
export function DeviceScreenPreview({
  architecture,
  isConnected,
  onScreenCapture,
}: DeviceScreenPreviewProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const deviceInfo = getDeviceInfo(architecture);
  const [screenImage, setScreenImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fullScreenMode, setFullScreenMode] = useState(false);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Fetch low-resolution screen preview from device
  const fetchScreenPreview = async () => {
    if (!isConnected) return;

    try {
      setIsLoading(true);
      // Capture screen from device
      const screenData = await sshService.captureScreen();
      setScreenImage(screenData);
      
      // Call parent callback if provided
      if (onScreenCapture) {
        onScreenCapture(screenData);
      }
    } catch (error) {
      console.error('Failed to fetch screen preview:', error);
      // Don't show error state, just keep trying
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-update screen preview every 500ms
  useEffect(() => {
    if (!isConnected) return;

    void fetchScreenPreview();
    updateIntervalRef.current = setInterval(() => void fetchScreenPreview(), 500);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isConnected]);

  // Handle touch events in full-screen mode
  const handleFullScreenTouch = async (event: GestureResponderEvent) => {
    if (!isConnected) return;

    try {
      const { locationX, locationY } = event.nativeEvent;
      // Send touch event to device
      // Note: coordinates need to be mapped from preview size to actual device resolution
      await sshService.sendTouchEvent(locationX, locationY);
    } catch (error) {
      console.error('Failed to send touch event:', error);
    }
  };

  // Fixed size for device preview (even when unknown)
  const previewWidth = 200;
  const previewHeight = previewWidth / (16 / 9);

  if (architecture === 'unknown' || !deviceInfo.imageName) {
    return (
      <View
        style={{
          width: previewWidth,
          height: previewHeight,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#e5e7eb',
        }}
      >
        <Text className="text-muted text-center text-sm">{t('device.unknown')}</Text>
      </View>
    );
  }

  const deviceImageUrl = getDeviceImageUrl(architecture);

  return (
    <>
      {/* Device Preview - Small, positioned at top-left */}
      <Pressable
        onPress={() => setFullScreenMode(true)}
        className="relative bg-background rounded-lg overflow-hidden"
        style={{
          width: previewWidth,
          height: previewHeight,
          alignSelf: 'flex-start',
        }}
      >
        {/* Device Image Background */}
        {deviceImageUrl && (
          <Image
            source={{ uri: deviceImageUrl }}
            style={{
              width: '100%',
              height: '100%',
              resizeMode: 'contain',
            }}
          />
        )}

        {/* Screen Content - Rendered inside the device's screen area */}
        <View
          style={{
            position: 'absolute',
            left: `${deviceInfo.screenOffsetX * 100}%`,
            top: `${deviceInfo.screenOffsetY * 100}%`,
            width: `${deviceInfo.screenWidth * 100}%`,
            height: `${deviceInfo.screenHeight * 100}%`,
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#000000',
          }}
        >
          {screenImage ? (
            <Image
              source={{ uri: screenImage }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View className="items-center justify-center gap-1">
              {isLoading && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              {!isConnected && (
                <Text className="text-xs text-muted">{t('device.notConnected')}</Text>
              )}
            </View>
          )}
        </View>
      </Pressable>

      {/* Full-Screen Modal */}
      <Modal
        visible={fullScreenMode}
        transparent={false}
        onRequestClose={() => setFullScreenMode(false)}
      >
        <View className="flex-1 bg-black">
          {/* Full-resolution screen display with touch support */}
          <Pressable
            onPress={handleFullScreenTouch}
            className="flex-1 items-center justify-center"
          >
            {screenImage ? (
              <Image
                source={{ uri: screenImage }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            ) : (
              <Text className="text-white text-center">
                {t('device.screenLoading')}
              </Text>
            )}
          </Pressable>

          {/* Close button */}
          <Pressable
            onPress={() => setFullScreenMode(false)}
            className="absolute top-4 right-4 bg-black/50 p-3 rounded-full"
          >
            <Text className="text-white text-lg font-bold">✕</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
