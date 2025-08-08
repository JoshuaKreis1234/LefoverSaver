import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Display notifications when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions and register the device for push
 * notifications. The expo push token is saved in Firestore so that the
 * backend can send targeted messages later on.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    const token = tokenData.data;

    // Store the token either under the user document or in a tokens collection
    const uid = auth.currentUser?.uid;
    if (uid) {
      await setDoc(doc(db, 'users', uid), { pushToken: token }, { merge: true });
    }
    await setDoc(doc(db, 'tokens', uid || token), { token }, { merge: true });

    return token;
  } catch {
    return null;
  }
}

/**
 * Schedule a local reminder to pick up the booked meal. Currently this simply
 * fires an alert one hour from now with the provided pickup window text.
 */
export async function scheduleBookingReminder(pickupUntil: string) {
  const trigger = new Date(Date.now() + 60 * 60 * 1000); // one hour from now
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Meal pickup reminder',
      body: `Remember to pick up your meal. ${pickupUntil}`,
    },
    trigger,
  });
}

/**
 * Notify all registered devices about a newly created offer.
 */
export async function notifyNewOffer(offerName: string) {
  const snap = await getDocs(collection(db, 'tokens'));
  const tokens = snap.docs
    .map((d) => d.data().token as string | undefined)
    .filter((t): t is string => !!t);

  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: 'New offer available',
    body: `${offerName} just dropped!`,
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
}

