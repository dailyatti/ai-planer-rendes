import { useState, useEffect, useCallback } from 'react';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [supported]);

  const showNotification = useCallback(
    (options: NotificationOptions) => {
      if (!supported || permission !== 'granted') {
        console.warn('Notifications not supported or permission not granted');
        return null;
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/image.png',
          tag: options.tag,
          requireInteraction: options.requireInteraction || false,
        });

        return notification;
      } catch (error) {
        console.error('Error showing notification:', error);
        return null;
      }
    },
    [supported, permission]
  );

  const scheduleNotification = useCallback(
    (options: NotificationOptions, delay: number) => {
      if (!supported || permission !== 'granted') {
        return null;
      }

      const timeoutId = setTimeout(() => {
        showNotification(options);
      }, delay);

      return timeoutId;
    },
    [supported, permission, showNotification]
  );

  return {
    supported,
    permission,
    requestPermission,
    showNotification,
    scheduleNotification,
  };
};

