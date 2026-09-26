import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Animated, Easing, Keyboard, Modal,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  useWindowDimensions, type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SuggestItem } from '@/src/api/types';
import { useCategories, useSuggestions } from '@/src/hooks/use-marketplace';
import { useOnline } from '@/src/lib/online';
import { useDiscovery } from '@/src/store/discovery';
import { brandColors as colors } from '@/src/theme/colors';

type Anchor = 'home' | 'results';
type Rect = { x: number; y: number; width: number; height: number };
type Session = { origin: Rect; source: Anchor };
type SearchContextValue = {
  open: (source: Anchor) => void;
  register: (name: Anchor, node: View | null) => void;
};
const SearchContext = createContext<SearchContextValue | null>(null);

/** Survives the tab change so the expanded card can collapse into the results pill. */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const anchors = useRef<Partial<Record<Anchor, View>>>({});
  const [session, setSession] = useState<Session | null>(null);
  const register = useCallback((name: Anchor, node: View | null) => {
    if (node) anchors.current[name] = node;
    else delete anchors.current[name];
  }, []);
  const open = useCallback((source: Anchor) => {
    anchors.current[source]?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        // A modal must not restore focus to a home control after switching tabs.
        anchors.current[source]?.blur();
        setSession({ origin: { x, y, width, height }, source });
      }
    });
  }, []);
  const measureResults = useCallback((done: (rect: Rect | null) => void) => {
    const node = anchors.current.results;
    if (!node) { done(null); return; }
    node.measureInWindow((x, y, width, height) => done(width > 0 && height > 0 ? { x, y, width, height } : null));
  }, []);
  const onClosed = useCallback(() => setSession(null), []);
  return (
    <SearchContext.Provider value={{ open, register }}>
      {children}
      {session ? <SearchOverlay session={session} measureResults={measureResults} onClosed={onClosed} /> : null}
    </SearchContext.Provider>
  );
}

function useSearchContext() {
  const context = useContext(SearchContext);
  if (!context) throw new Error('SearchBar requires SearchProvider');
  return context;
}

export function SearchBar({ variant, summary, autoExpand = false }: { variant: Anchor; summary?: string; autoExpand?: boolean }) {
  const { open, register } = useSearchContext();
  const prompted = useRef(false);
  const [laidOut, setLaidOut] = useState(false);
  const ref = useCallback((node: View | null) => register(variant, node), [register, variant]);
  useEffect(() => {
    if (autoExpand && laidOut && !prompted.current) {
      prompted.current = true;
      open(variant);
    }
  }, [autoExpand, laidOut, open, variant]);
  return (
    <View style={styles.barHost} onLayout={() => setLaidOut(true)}>
      <Pressable ref={ref} collapsable={false} onPress={() => open(variant)} accessibilityRole="button" accessibilityLabel="Zoek locaties en behandelingen" style={styles.bar}>
        <Ionicons name="search-outline" size={20} color={colors.navy} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.barLabel, summary ? styles.barQuery : null]}>{summary || 'Zoek locaties, behandelingen'}</Text>
          {variant === 'results' ? <Text style={styles.barSubtitle}>Pas je zoekopdracht aan</Text> : null}
        </View>
        {variant === 'home' ? <View style={styles.smallButton}><Text style={styles.buttonText}>Zoek</Text></View> : <Ionicons name="options-outline" size={20} color={colors.navy} />}
      </Pressable>
    </View>
  );
}

function SearchOverlay({ session, measureResults, onClosed }: {
  session: Session;
  measureResults: (done: (rect: Rect | null) => void) => void;
  onClosed: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const initialQuery = useDiscovery((s) => s.q);
  const initialCategory = useDiscovery((s) => s.categoryIds[0] ?? null);
  const applySearch = useDiscovery((s) => s.setSearch);
  const categories = useCategories();
  const [text, setText] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState<string | null>(initialCategory);
  const [debounced, setDebounced] = useState(initialQuery);
  const [phase, setPhase] = useState<'editing' | 'submitting'>('editing');
  const [keyboardTop, setKeyboardTop] = useState(height);
  const [shown, setShown] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const input = useRef<TextInput>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const online = useOnline();
  const suggestions = useSuggestions(debounced);
  const [box] = useState(() => ({
    x: new Animated.Value(session.origin.x), y: new Animated.Value(session.origin.y),
    width: new Animated.Value(session.origin.width), height: new Animated.Value(session.origin.height),
    radius: new Animated.Value(28), body: new Animated.Value(0), scrim: new Animated.Value(0),
  }));

  useEffect(() => {
    alive.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (alive.current) setReduceMotion(value); }).catch(() => undefined);
    const change = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { alive.current = false; change.remove(); Object.values(box).forEach((value) => value.stopAnimation()); };
  }, [box]);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), 250);
    return () => clearTimeout(timer);
  }, [text]);
  useEffect(() => {
    const show = (event: KeyboardEvent) => setKeyboardTop(event.endCoordinates.screenY);
    const hide = () => setKeyboardTop(height);
    const showing = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow', show);
    const hiding = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', hide);
    return () => { showing.remove(); hiding.remove(); };
  }, [height]);

  const animate = useCallback((rect: Rect, expanded: boolean, done?: () => void) => {
    Animated.parallel([
      ...(['x', 'y', 'width', 'height'] as const).map((key) => Animated.timing(box[key], {
        toValue: rect[key], duration: reduceMotion ? 0 : 300, easing: Easing.inOut(Easing.cubic), useNativeDriver: false,
      })),
      Animated.timing(box.radius, { toValue: expanded ? 26 : 28, duration: reduceMotion ? 0 : 300, useNativeDriver: false }),
      Animated.timing(box.body, { toValue: expanded ? 1 : 0, duration: reduceMotion ? 0 : 160, useNativeDriver: false }),
      Animated.timing(box.scrim, { toValue: expanded ? 1 : 0, duration: reduceMotion ? 0 : 300, useNativeDriver: false }),
    ]).start(({ finished }) => { if (finished && alive.current) done?.(); });
  }, [box, reduceMotion]);

  // Leave the underlying screen visible, even with the keyboard open.
  const panelTop = insets.top + 14;
  const panelHeight = Math.max(190, Math.min(420, height * 0.55, keyboardTop - panelTop - 16));
  useEffect(() => {
    if (!shown || phase !== 'editing' || busy.current) return;
    animate({ x: 16, y: panelTop, width: width - 32, height: panelHeight }, true);
  }, [animate, shown, phase, panelTop, panelHeight, width]);

  // Wait for the destination tab to mount before measuring its real search pill.
  useEffect(() => {
    if (phase !== 'submitting' || !pathname.endsWith('/discover')) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const measure = () => measureResults((rect) => {
      if (cancelled) return;
      if (!rect && ++attempts < 8) { timer = setTimeout(measure, 40); return; }
      animate(rect ?? { x: 20, y: insets.top + 8, width: width - 40, height: 58 }, false, onClosed);
    });
    timer = setTimeout(measure, 60);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [phase, pathname, measureResults, animate, onClosed, insets.top, width]);

  const close = () => {
    if (busy.current) return;
    busy.current = true;
    Keyboard.dismiss();
    animate(session.origin, false, onClosed);
  };
  const submit = () => {
    if (busy.current) return;
    busy.current = true;
    input.current?.blur();
    Keyboard.dismiss();
    applySearch(categoryId ? '' : text.trim(), categoryId);
    setPhase('submitting');
    router.navigate('/discover');
  };
  const choose = (item: SuggestItem) => {
    setText(item.name);
    setCategoryId(item.type === 'category' ? item.id : null);
    input.current?.blur();
    Keyboard.dismiss();
  };
  const changeText = (value: string) => { setText(value); setCategoryId(null); };
  const categoryName = categories.data?.find((item) => item.id === categoryId)?.name;
  const displayValue = categoryName || text;
  const options = !debounced.trim()
    ? (categories.data ?? []).slice(0, 6).map((item): SuggestItem => ({ id: item.id, name: item.name, type: 'category' }))
    : suggestions.data?.items ?? [];
  const loading = text.trim() !== debounced.trim() || (Boolean(debounced.trim()) && suggestions.isLoading);
  const failed = debounced.trim() ? suggestions.isError : categories.isError;
  const retry = () => { if (debounced.trim()) void suggestions.refetch(); else void categories.refetch(); };

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close} onShow={() => { setShown(true); input.current?.focus(); }}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: box.scrim, backgroundColor: 'rgba(7,29,67,0.20)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Sluit zoeken" />
        </Animated.View>
        <Animated.View accessibilityViewIsModal style={[styles.panel, { left: box.x, top: box.y, width: box.width, height: box.height, borderRadius: box.radius }]}>
          {phase === 'submitting' ? <View pointerEvents="none" style={styles.arrivingPill}>
            <Ionicons name="search-outline" size={20} color={colors.navy} />
            <View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.barQuery}>{displayValue || 'Alle behandelingen'}</Text><Text style={styles.barSubtitle}>Pas je zoekopdracht aan</Text></View>
            <Ionicons name="options-outline" size={20} color={colors.navy} />
          </View> : <>
            <Animated.View style={[styles.headingRow, { opacity: box.body }]}>
              <Text accessibilityRole="header" style={styles.heading}>Wat zoek je?</Text>
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Sluit zoeken" style={styles.closeButton}><Ionicons name="close" size={20} color={colors.navy} /></Pressable>
            </Animated.View>
            <View style={styles.inputRow}>
              <Ionicons name="search-outline" size={20} color={colors.navy} />
              <TextInput ref={input} value={displayValue} onChangeText={changeText} onSubmitEditing={submit} returnKeyType="search" autoCorrect={false} autoCapitalize="none" accessibilityLabel="Zoeken" placeholder="Salon of behandeling zoeken" placeholderTextColor={colors.muted} style={styles.input} />
              {displayValue ? <Pressable onPress={() => { changeText(''); input.current?.focus(); }} accessibilityRole="button" accessibilityLabel="Wis zoekopdracht" style={styles.clearButton}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
            </View>
            <Animated.View style={[styles.body, { opacity: box.body }]}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
                <Text style={styles.eyebrow}>{debounced.trim() ? 'Suggesties' : 'Ontdek behandelingen'}</Text>
                {!online ? <Text style={styles.message}>Je bent offline. Je kunt je zoekopdracht alvast invullen.</Text> : loading ? <ActivityIndicator accessibilityLabel="Suggesties laden" color={colors.blue} style={{ marginVertical: 18 }} /> : failed ? <Pressable onPress={retry} accessibilityRole="button" style={styles.option}><Text style={styles.message}>Suggesties laden lukt niet. Tik om opnieuw te proberen.</Text></Pressable> : options.length === 0 ? <Text style={styles.message}>Geen suggesties. Tik op Zoek om alle salons te doorzoeken.</Text> : options.map((item) => <Pressable key={`${item.type}-${item.id}`} accessibilityRole="button" accessibilityLabel={item.name} onPress={() => choose(item)} style={styles.option}>
                  <View style={styles.optionIcon}><Ionicons name={item.type === 'location' ? 'location-outline' : 'sparkles-outline'} size={19} color={colors.blue} /></View>
                  <View style={{ flex: 1 }}><Text style={styles.optionName}>{item.name}</Text><Text style={styles.optionType}>{item.type === 'location' ? 'Salon' : item.type === 'category' ? 'Categorie' : 'Behandeling'}</Text></View>
                  <Ionicons name="arrow-up-outline" size={16} color={colors.muted} style={{ transform: [{ rotate: '-45deg' }] }} />
                </Pressable>)}
              </ScrollView>
              <View style={styles.footer}>
                <Pressable onPress={() => changeText('')} accessibilityRole="button" style={styles.reset}><Text style={styles.resetText}>Alles wissen</Text></Pressable>
                <Pressable onPress={submit} accessibilityRole="button" accessibilityLabel="Zoek" style={styles.submit}><Ionicons name="search-outline" size={18} color="#fff" /><Text style={styles.buttonText}>Zoek</Text></Pressable>
              </View>
            </Animated.View>
          </>}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  barHost: { marginHorizontal: 20 },
  bar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 30, paddingLeft: 18, paddingRight: 8, paddingVertical: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, boxShadow: '0 3px 14px #071D4312' },
  barLabel: { color: colors.muted, fontSize: 12 },
  barQuery: { color: colors.navy, fontSize: 14, fontWeight: '600' },
  barSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  smallButton: { borderRadius: 24, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: colors.navy },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  panel: { position: 'absolute', backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: colors.line, boxShadow: '0 12px 40px #071D4326' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 10, paddingTop: 8 },
  heading: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: colors.navy },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 6, marginBottom: 12, paddingLeft: 14, paddingRight: 6, minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.blue, backgroundColor: colors.surface },
  input: { flex: 1, minWidth: 0, paddingVertical: 12, color: colors.navy, fontSize: 15 },
  clearButton: { width: 36, height: 44, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1, minHeight: 0 },
  suggestions: { paddingHorizontal: 18, paddingBottom: 8 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 58 },
  optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueTint },
  optionName: { fontSize: 14, color: colors.navy, fontWeight: '500' },
  optionType: { fontSize: 11, color: colors.muted, marginTop: 3 },
  message: { fontSize: 13, lineHeight: 19, color: colors.muted, paddingVertical: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: '#fff' },
  reset: { minHeight: 44, justifyContent: 'center' },
  resetText: { color: colors.navy, textDecorationLine: 'underline', fontSize: 13, fontWeight: '500' },
  submit: { minHeight: 46, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, borderRadius: 14, paddingHorizontal: 24 },
  arrivingPill: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 },
});
