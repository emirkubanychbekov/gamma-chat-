import { createClient } from '@/lib/supabase/client'

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications.');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

export async function savePushToken(token: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id: user.id,
      token: token,
      platform: 'web'
    }, { onConflict: 'token' })

  if (error) console.error('Error saving push token:', error)
}

// In a real FCM setup, you would use getToken from firebase/messaging
// For this simple implementation, we'll assume the token comes from your push provider
export async function subscribeToPush(registration: ServiceWorkerRegistration, vapidPublicKey: string) {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey
    });
    
    const token = JSON.stringify(subscription);
    await savePushToken(token);
    return token;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
  }
}
