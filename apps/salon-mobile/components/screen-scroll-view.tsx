import React from 'react';
import { Platform, ScrollView, type ScrollViewProps } from 'react-native';

/** Screens own safe areas; the scroll view owns keyboard occlusion. */
export const ScreenScrollView = React.forwardRef<ScrollView, ScrollViewProps>(
  function ScreenScrollView(props, ref) {
    return <ScrollView ref={ref} contentInsetAdjustmentBehavior="never"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled" {...props} />;
  }
);
