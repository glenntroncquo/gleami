import { NetworkStateType, useNetworkState } from 'expo-network';

/** Unknown or still-resolving network counts as online so the first paint isn't a false offline screen. */
export function useOnline(): boolean {
  const state = useNetworkState();
  if (!state.type || state.type === NetworkStateType.UNKNOWN) return true;
  return state.isConnected !== false;
}
