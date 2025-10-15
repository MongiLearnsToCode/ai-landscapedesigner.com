// Generate a device fingerprint based on browser and system characteristics
export const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.cookieEnabled,
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 0,
    navigator.maxTouchPoints || 0
  ].join('|');

  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

// Get or create persistent device ID
export const getDeviceId = (): string => {
  // Try multiple storage methods for persistence
  const storageKeys = ['device_id', 'app_device_id', 'user_device_id'];
  
  // Check existing storage
  for (const key of storageKeys) {
    const stored = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (stored) {
      // Store in all locations for redundancy
      storageKeys.forEach(k => {
        localStorage.setItem(k, stored);
        sessionStorage.setItem(k, stored);
      });
      return stored;
    }
  }
  
  // Generate new device ID combining fingerprint with timestamp
  const fingerprint = generateDeviceFingerprint();
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  const deviceId = `${fingerprint}_${timestamp}_${random}`;
  
  // Store in multiple locations
  storageKeys.forEach(key => {
    try {
      localStorage.setItem(key, deviceId);
      sessionStorage.setItem(key, deviceId);
    } catch (e) {
      // Storage might be disabled
    }
  });
  
  return deviceId;
};

// Additional fingerprint for server verification
export const getExtendedFingerprint = (): string => {
  return [
    generateDeviceFingerprint(),
    navigator.userAgent.length,
    screen.availWidth + 'x' + screen.availHeight,
    window.devicePixelRatio || 1,
    navigator.languages?.join(',') || navigator.language
  ].join('::');
};
