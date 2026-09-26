import * as Haptics from 'expo-haptics';
import { router, useNavigation } from 'expo-router';
import { useCallback } from 'react';

import type { AuthUser } from '@/src/auth/auth-context';

/** How the user got a session. Only email-code sign-ups still need a password. */
export type AuthMethod = 'code' | 'password' | 'social';

/** Closes the whole auth modal, wherever in its stack we are. */
export function useFinishAuth() {
  const navigation = useNavigation();
  return useCallback(() => {
    const root = navigation.getParent();
    if (root?.canGoBack()) root.goBack();
    else router.replace('/(tabs)/profile');
  }, [navigation]);
}

/** Signed in: close, or ask for the missing profile details first. */
export function useAfterSignIn() {
  const finish = useFinishAuth();
  return useCallback(
    (user: AuthUser, method: AuthMethod, prefill?: { firstName?: string; lastName?: string }) => {
      if (user.profileComplete) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        finish();
        return;
      }
      router.replace({
        pathname: '/auth/complete',
        params: {
          method,
          firstName: prefill?.firstName ?? user.firstName,
          lastName: prefill?.lastName ?? user.lastName,
        },
      });
    },
    [finish],
  );
}
