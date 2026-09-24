import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

type MediaCarouselProps = {
  images: string[];
  height?: number;
  label: string;
};

export function MediaCarousel({ images, height = 210, label }: MediaCarouselProps) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const frames = images.filter(Boolean);

  if (frames.length === 0) {
    return <View style={{ height }} className="bg-surface" accessibilityLabel={label} />;
  }

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} accessibilityLabel={label}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={frames.length > 1}
        onMomentumScrollEnd={(event) => {
          if (width <= 0) return;
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
        }}>
        {frames.map((uri) => (
          <Image
            key={uri}
            source={{ uri }}
            style={{ width: width || 1, height }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ))}
      </ScrollView>
      {frames.length > 1 ? (
        <View className="absolute bottom-3 w-full flex-row items-center justify-center gap-1.5">
          {frames.map((uri, dot) => (
            <View
              key={uri}
              className={dot === index ? 'h-1.5 w-4 rounded-full bg-white' : 'h-1.5 w-1.5 rounded-full bg-white/70'}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
