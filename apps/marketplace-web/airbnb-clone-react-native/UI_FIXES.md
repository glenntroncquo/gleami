# UI Fixes Applied

## 1. Removed White Flash on Company Tap

**Issue**: When tapping on a company card, a white flash would appear.

**Solution**: Added `activeOpacity={1}` to the TouchableOpacity component in `components/Listings.tsx`

```tsx
<TouchableOpacity activeOpacity={1}>
```

This prevents the default opacity change animation when the item is pressed, eliminating the white flash effect.

## 2. Fixed Navbar Overlap with First Company

**Issue**: The navigation/search bar was overlapping the first company card, causing the image to not be fully visible.

**Solution**: Added `contentContainerStyle={{ paddingTop: 10 }}` to the BottomSheetFlatList in `components/Listings.tsx`

```tsx
<BottomSheetFlatList
  renderItem={renderRow}
  data={loading ? [] : items}
  ref={listRef}
  contentContainerStyle={{ paddingTop: 10 }}
  ListHeaderComponent={<Text style={styles.info}>{items.length} salons</Text>}
/>
```

This adds top padding to the FlatList content container, ensuring the first item has proper spacing from the header.

## Additional Updates

- Updated Company interface to use `latitude` and `longitude` fields directly instead of nested `geo_location` object
- Changed imports to use TypeScript `type` imports for better performance
- Added `radius: 500000` parameter to the edge function call for location-based filtering

## Summary

Both UI issues are now resolved:

- ✅ No white flash when tapping companies
- ✅ First company image is fully visible without navbar overlap
