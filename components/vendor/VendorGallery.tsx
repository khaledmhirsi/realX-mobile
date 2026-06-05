import { PagerView } from "@expo/ui/community/pager-view";
import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Typography } from "../../constants/Typography";
import { useAppTheme } from "../../context/AppThemeContext";

type VendorGalleryProps = {
  images?: unknown;
  isArabic: boolean;
};

const GALLERY_LIMIT = 12;

export function VendorGallery({ images, isArabic }: VendorGalleryProps) {
  const { theme } = useAppTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const prefetchedGalleryRef = useRef("");
  const galleryImages = useMemo(
    () =>
      Array.isArray(images)
        ? images
            .filter(
              (imageUrl): imageUrl is string =>
                typeof imageUrl === "string" && imageUrl.trim().length > 0,
            )
            .slice(0, GALLERY_LIMIT)
        : [],
    [images],
  );

  useEffect(() => {
    if (selectedIndex == null) return;
    const galleryKey = galleryImages.join("|");
    if (prefetchedGalleryRef.current === galleryKey) return;

    prefetchedGalleryRef.current = galleryKey;
    void Image.prefetch(galleryImages, "memory-disk");
  }, [galleryImages, selectedIndex]);

  if (galleryImages.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: theme.text }]}>
          {isArabic ? "الصور" : "GALLERY"}
        </Text>
        <Text style={[styles.count, { color: theme.subtleText }]}>
          {galleryImages.length}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.thumbnailList}
      >
        {galleryImages.map((imageUrl, index) => (
          <Pressable
            key={imageUrl}
            onPress={() => setSelectedIndex(index)}
            style={({ pressed }) => [
              styles.thumbnailButton,
              { borderColor: theme.border },
              pressed && styles.thumbnailPressed,
            ]}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          </Pressable>
        ))}
      </ScrollView>

      {selectedIndex != null && (
        <Modal
          visible
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => setSelectedIndex(null)}
        >
          <View style={styles.viewerBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedIndex(null)}
              accessibilityRole="button"
              accessibilityLabel="Close gallery"
            />

            <View style={styles.viewer}>
              <PagerView
                style={styles.pager}
                initialPage={selectedIndex}
                layoutDirection={isArabic ? "rtl" : "ltr"}
                offscreenPageLimit={1}
                onPageSelected={(event) => {
                  const position = event.nativeEvent.position;
                  setSelectedIndex((currentIndex) =>
                    currentIndex == null ? null : position,
                  );
                }}
              >
                {galleryImages.map((imageUrl, index) => (
                  <View key={imageUrl} style={styles.page}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.fullImage}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      priority={index === selectedIndex ? "high" : "normal"}
                      transition={150}
                    />
                  </View>
                ))}
              </PagerView>

              <View style={styles.viewerFooter}>
                <Text style={styles.counterText}>
                  {selectedIndex + 1} / {galleryImages.length}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 22,
    gap: 10,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heading: {
    fontFamily: Typography.poppins.semiBold,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  count: {
    fontFamily: Typography.poppins.medium,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  thumbnailList: {
    gap: 10,
    paddingRight: 20,
  },
  thumbnailButton: {
    width: 132,
    height: 96,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumbnailPressed: {
    opacity: 0.75,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  viewerBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.48)",
    padding: 16,
  },
  viewer: {
    width: "100%",
    maxWidth: 620,
    height: "50%",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,100)",
  },
  viewerFooter: {
    alignItems: "center",
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  counterText: {
    color: "#FFFFFF",
    fontFamily: Typography.poppins.semiBold,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
});
