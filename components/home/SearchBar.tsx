import Ionicons from "@expo/vector-icons/Ionicons";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  I18nManager,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Typography } from "../../constants/Typography";
import { useAppTheme } from "../../context/AppThemeContext";

type Props = {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
};

function canUseNativeGlass() {
  if (Platform.OS !== "ios") return false;

  try {
    return isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

export default function SearchBar({
  placeholder = "Search for anything...",
  value,
  onChangeText,
  onSubmit,
  onClear,
}: Props) {
  const navigation = useNavigation();
  const { isDark, theme } = useAppTheme();
  const useNativeGlass = !isDark && canUseNativeGlass();
  const showHighlights = !isDark;
  const [isFocused, setIsFocused] = useState(false);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState<string | null>(null);
  const isRTL = I18nManager.isRTL;
  const isActive = isFocused || (value?.length ?? 0) > 0;
  const placeholderText = isActive ? "" : formatPlaceholder(animatedPlaceholder ?? placeholder, isRTL);

  useEffect(() => {
    if (!onChangeText) return;

    const unsubscribe = navigation.addListener("blur", () => {
      onChangeText("");
    });

    return unsubscribe;
  }, [navigation, onChangeText]);

  useEffect(() => {
    let frame: ReturnType<typeof setTimeout>;
    let index = 0;
    let direction: "typing" | "deleting" = "typing";

    setAnimatedPlaceholder("");

    const tick = () => {
      if (direction === "typing") {
        index += 1;
        setAnimatedPlaceholder(placeholder.slice(0, index));

        if (index >= placeholder.length) {
          direction = "deleting";
          frame = setTimeout(tick, 1400);
          return;
        }

        frame = setTimeout(tick, 80);
        return;
      }

      index -= 1;
      setAnimatedPlaceholder(placeholder.slice(0, index));

      if (index <= 0) {
        direction = "typing";
        frame = setTimeout(tick, 450);
        return;
      }

      frame = setTimeout(tick, 26);
    };

    frame = setTimeout(tick, 350);

    return () => clearTimeout(frame);
  }, [placeholder]);

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }

    onChangeText?.("");
  };

  return (
    <View style={[styles.searchShell, isDark && styles.searchShellDark]}>
      {useNativeGlass ? (
        <GlassView
          style={[styles.searchSurface, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
          glassEffectStyle="regular"
          colorScheme={isDark ? "dark" : "light"}
          tintColor={theme.inputBackground}
        >
          {showHighlights ? <GlassHighlights topColor={theme.inputHighlight} bottomColor={theme.inputShade} /> : null}
          <SearchBarContent
            placeholder={placeholderText}
            value={value}
            onChangeText={onChangeText}
            onSubmit={onSubmit}
            onClear={handleClear}
            isActive={isActive}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            textColor={theme.inputText}
            placeholderColor={theme.inputPlaceholder}
            iconColor={theme.icon}
            activeColor={theme.brand}
            isRTL={isRTL}
          />
        </GlassView>
      ) : (
        <View style={[styles.searchSurface, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
          {showHighlights ? <GlassHighlights topColor={theme.inputHighlight} bottomColor={theme.inputShade} /> : null}
          <SearchBarContent
            placeholder={placeholderText}
            value={value}
            onChangeText={onChangeText}
            onSubmit={onSubmit}
            onClear={handleClear}
            isActive={isActive}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            textColor={theme.inputText}
            placeholderColor={theme.inputPlaceholder}
            iconColor={theme.icon}
            activeColor={theme.brand}
            isRTL={isRTL}
          />
        </View>
      )}
    </View>
  );
}

function formatPlaceholder(placeholder: string, isRTL: boolean) {
  if (!isRTL) return placeholder;

  return placeholder.replace(/[\s.。…]+$/u, "");
}

function GlassHighlights({ topColor, bottomColor }: { topColor: string; bottomColor: string }) {
  return (
    <>
      <View pointerEvents="none" style={[styles.topHighlight, { backgroundColor: topColor }]} />
      <View pointerEvents="none" style={[styles.bottomShade, { backgroundColor: bottomColor }]} />
    </>
  );
}

type SearchBarContentProps = Required<Pick<Props, "placeholder">> &
  Omit<Props, "placeholder"> & {
    isActive: boolean;
    onFocus: () => void;
    onBlur: () => void;
    textColor: string;
    placeholderColor: string;
    iconColor: string;
    activeColor: string;
    isRTL: boolean;
  };

function SearchBarContent({
  placeholder,
  value,
  onChangeText,
  onSubmit,
  onClear,
  isActive,
  onFocus,
  onBlur,
  textColor,
  placeholderColor,
  iconColor,
  activeColor,
  isRTL,
}: SearchBarContentProps) {
  return (
    <View style={styles.searchContent}>
      <Ionicons
        name="search"
        size={20}
        color={isActive ? activeColor : iconColor}
        style={styles.icon}
      />
      <TextInput
        style={[
          styles.input,
          {
            color: textColor,
            textAlign: isRTL ? "right" : "left",
            writingDirection: isRTL ? "rtl" : "ltr",
          },
          isActive && { color: activeColor },
        ]}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        selectionColor={activeColor}
        cursorColor={activeColor}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {(value?.length ?? 0) > 0 ? (
        <TouchableOpacity
          onPress={onClear}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          style={styles.clearButton}
        >
          <Ionicons name="close-circle" size={18} color={placeholderColor} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchShell: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 30,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 8,
  },
  searchShellDark: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  searchSurface: {
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    borderWidth: 1,
    overflow: "hidden",
  },
  searchContent: {
    alignItems: "center",
    flexDirection: "row",
    width: "100%",
  },
  topHighlight: {
    position: "absolute",
    top: 1,
    left: 14,
    right: 14,
    height: 1,
  },
  bottomShade: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0,
    height: 1,
  },
  icon: {
    marginEnd: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: Typography.poppins.medium,
    padding: 0,
  },
  clearButton: {
    marginStart: 8,
  },
});
