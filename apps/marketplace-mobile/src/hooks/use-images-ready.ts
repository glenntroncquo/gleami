import { Image } from 'expo-image';
import { useEffect, useState } from 'react';

/**
 * True once every URL is in the image cache, or after `maxWaitMs`, whichever
 * comes first. Lets a screen reveal its first visible photos together without
 * one slow image holding the whole screen hostage. Latches: once ready it stays
 * ready, so a refresh with new results never flips back to the skeleton.
 */
export function useImagesReady(urls: string[], maxWaitMs = 1200): boolean {
  const key = urls.join('\n');
  const [readyKey, setReadyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!key || readyKey !== null) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReadyKey(key);
    };
    const timer = setTimeout(finish, maxWaitMs);
    Image.prefetch(key.split('\n'), 'memory-disk').then(finish, finish);
    return () => {
      done = true;
      clearTimeout(timer);
    };
  }, [key, maxWaitMs, readyKey]);

  return !key || readyKey !== null;
}
