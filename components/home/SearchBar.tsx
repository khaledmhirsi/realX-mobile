import Ionicons from "@expo/vector-icons/Ionicons";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";

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
  const useNativeGlass = canUseNativeGlass();
  const [isFocused, setIsFocused] = useState(false);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState<string | null>(null);
  const isActive = isFocused || (value?.length ?? 0) > 0;
  const placeholderText = isActive ? "" : (animatedPlaceholder ?? placeholder);

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
    <View style={styles.searchShell}>
      {useNativeGlass ? (
        <GlassView
          style={[styles.searchSurface, styles.nativeGlass]}
          glassEffectStyle="regular"
          colorScheme="light"
          tintColor="rgba(255,255,255,0.34)"
        >
          <GlassHighlights />
          <SearchBarContent
            placeholder={placeholderText}
            value={value}
            onChangeText={onChangeText}
            onSubmit={onSubmit}
            onClear={handleClear}
            isActive={isActive}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </GlassView>
      ) : (
        <View style={[styles.searchSurface, styles.fallbackGlass]}>
          <GlassHighlights />
          <SearchBarContent
            placeholder={placeholderText}
            value={value}
            onChangeText={onChangeText}
            onSubmit={onSubmit}
            onClear={handleClear}
            isActive={isActive}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>
      )}
    </View>
  );
}

function GlassHighlights() {
  return (
    <>
      <View pointerEvents="none" style={styles.topHighlight} />
      <View pointerEvents="none" style={styles.bottomShade} />
    </>
  );
}

type SearchBarContentProps = Required<Pick<Props, "placeholder">> &
  Omit<Props, "placeholder"> & {
    isActive: boolean;
    onFocus: () => void;
    onBlur: () => void;
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
}: SearchBarContentProps) {
  return (
    <>
      <Ionicons
        name="search"
        size={20}
        color={isActive ? Colors.brandGreen : "#111111"}
        style={styles.icon}
      />
      <TextInput
        style={[styles.input, isActive && styles.inputActive]}
        placeholder={placeholder}
        placeholderTextColor="rgba(0,0,0,0.48)"
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        selectionColor={Colors.brandGreen}
        cursorColor={Colors.brandGreen}
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
        >
          <Ionicons name="close-circle" size={18} color="rgba(0,0,0,0.46)" />
        </TouchableOpacity>
      ) : null}
    </>
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
  searchSurface: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    borderWidth:2,
    overflow: "hidden",
  },
  nativeGlass: {
    borderColor: "rgba(255,255,255,0.84)",
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  fallbackGlass: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: "rgba(255,255,255,0.95)",
  },
  topHighlight: {
    position: "absolute",
    top: 1,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  bottomShade: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: Typography.poppins.medium,
    padding: 0,
    color: "rgba(0,0,0,0.72)",
    textShadowColor: "rgba(255,255,255,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  inputActive: {
    color: Colors.brandGreen,
  },
});
