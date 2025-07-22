export const LIVEWALL_CONSTANTS = {
  // Animation durations
  CROSSFADE_DURATION: 1000, // ms
  MESSAGE_DISPLAY_DURATION: 31000, // ms
  REFRESH_DEBOUNCE_DELAY: 300, // ms
  
  // Default values
  DEFAULT_IMAGE_DISPLAY_DURATION: 10, // seconds
  DEFAULT_BACKGROUND_GRADIENT: 'from-purple-900 via-blue-900 to-indigo-900',
  QR_CODE_SIZE: 120,
  
  // Z-index layers
  Z_INDEX_BASE_MESSAGE: 20,
  Z_INDEX_QR_CODE: 50,
} as const