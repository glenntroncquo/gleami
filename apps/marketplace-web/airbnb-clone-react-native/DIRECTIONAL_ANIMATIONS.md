# Directional Fade Animations

## Implementation Overview

The app now features directional fade animations when switching between salon categories. The animation direction is determined by the position of the selected category relative to the current one.

## How It Works

### 1. **Direction Detection**

- When a category is selected, the system compares the new index with the current index
- **Right direction**: `index > previousIndex` → Content fades to the left
- **Left direction**: `index < previousIndex` → Content fades to the right

### 2. **Animation Types**

- **Moving Right** (selecting category to the right):

  - `FadeInRight` - New content enters from the right
  - `FadeOutLeft` - Old content exits to the left

- **Moving Left** (selecting category to the left):
  - `FadeInLeft` - New content enters from the left
  - `FadeOutRight` - Old content exits to the right

### 3. **Component Flow**

```
ExploreHeader → index.tsx → ListingsBottomSheet → Listings
     ↓              ↓              ↓                ↓
Detects        Stores         Passes          Applies
direction      direction      direction       animations
```

## Code Changes

### ExploreHeader.tsx

- Updated `onCategoryChanged` to include direction parameter
- Added direction calculation: `index > previousIndex ? 'right' : 'left'`

### index.tsx

- Added `animationDirection` state
- Updated `onDataChanged` to store direction
- Passes direction to `ListingsBottomSheet`

### ListingsBottomSheet.tsx

- Added `animationDirection` prop
- Passes direction to `Listings` component

### Listings.tsx

- Added `animationDirection` prop
- Dynamic animation selection based on direction
- Uses appropriate `FadeIn`/`FadeOut` animations

## User Experience

- **Smooth transitions** that feel natural and intuitive
- **Visual feedback** that matches the user's navigation direction
- **Professional polish** that enhances the app's perceived quality
- **Consistent behavior** across all category switches

The animations now provide clear visual feedback about the direction of navigation, making the interface feel more responsive and intuitive! 🎨✨
