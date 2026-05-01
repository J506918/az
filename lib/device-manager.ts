/**
 * Device Manager - Identify and manage comma devices
 * Maps device architecture to device type and metadata
 */

export type DeviceArchitecture = 'tici' | 'tizi' | 'mici' | 'neo' | 'unknown';

export interface DeviceInfo {
  architecture: DeviceArchitecture;
  modelName: string;
  displayName: string;
  imageName: string;
  screenAspectRatio: number; // width / height
  screenOffsetX: number; // percentage from left
  screenOffsetY: number; // percentage from top
  screenWidth: number; // percentage of device width
  screenHeight: number; // percentage of device height
}

const DEVICE_MAP: Record<DeviceArchitecture, DeviceInfo> = {
  tici: {
    architecture: 'tici',
    modelName: 'comma 3',
    displayName: 'Comma 3',
    imageName: 'comma3.jpg',
    screenAspectRatio: 9 / 16, // portrait
    screenOffsetX: 0.15,
    screenOffsetY: 0.2,
    screenWidth: 0.7,
    screenHeight: 0.5,
  },
  tizi: {
    architecture: 'tizi',
    modelName: 'comma 3x',
    displayName: 'Comma 3X',
    imageName: 'comma3.jpg', // Same appearance as 3
    screenAspectRatio: 9 / 16, // portrait
    screenOffsetX: 0.15,
    screenOffsetY: 0.2,
    screenWidth: 0.7,
    screenHeight: 0.5,
  },
  mici: {
    architecture: 'mici',
    modelName: 'comma 4',
    displayName: 'Comma 4',
    imageName: 'comma4.jpg',
    screenAspectRatio: 16 / 9, // landscape
    screenOffsetX: 0.25,
    screenOffsetY: 0.3,
    screenWidth: 0.5,
    screenHeight: 0.4,
  },
  neo: {
    architecture: 'neo',
    modelName: 'comma 2',
    displayName: 'Comma 2',
    imageName: 'comma2.jpg',
    screenAspectRatio: 16 / 9, // landscape
    screenOffsetX: 0.2,
    screenOffsetY: 0.25,
    screenWidth: 0.6,
    screenHeight: 0.5,
  },
  unknown: {
    architecture: 'unknown',
    modelName: 'unknown',
    displayName: '未知设备',
    imageName: '', // No image for unknown devices
    screenAspectRatio: 16 / 9,
    screenOffsetX: 0,
    screenOffsetY: 0,
    screenWidth: 0,
    screenHeight: 0,
  },
};

/**
 * Get device info by architecture
 */
export function getDeviceInfo(architecture: DeviceArchitecture): DeviceInfo {
  return DEVICE_MAP[architecture] || DEVICE_MAP.unknown;
}

/**
 * Parse device architecture from model string
 * Example: "comma tici" -> "tici"
 */
export function parseDeviceArchitecture(modelString: string): DeviceArchitecture {
  if (!modelString) return 'unknown';

  const lower = modelString.toLowerCase().trim();

  // Handle exact matches first (from getprop ro.hardware or device-tree/model)
  if (lower === 'tici') return 'tici';
  if (lower === 'tizi') return 'tizi';
  if (lower === 'mici') return 'mici';
  if (lower === 'neo') return 'neo';

  // Handle partial matches (from Python API or other sources)
  if (lower.includes('tici') && !lower.includes('tizi')) return 'tici';
  if (lower.includes('tizi')) return 'tizi';
  if (lower.includes('mici')) return 'mici';
  if (lower.includes('neo')) return 'neo';

  return 'unknown';
}

/**
 * Get device image URL (S3 storage path)
 */
export function getDeviceImageUrl(architecture: DeviceArchitecture): string {
  const info = getDeviceInfo(architecture);
  // Device images from user-provided real device photos
  const imageMap: Record<string, string> = {
    'comma2.jpg': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663555307199/FpeykwzbrDzQJcmd.jpg',
    'comma3.jpg': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663555307199/pAIrqNlkBhAEDXYY.jpg',
    'comma4.jpg': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663555307199/nCsTzSccpkMpraVz.jpg',
  };
  return imageMap[info.imageName] || '';
}
