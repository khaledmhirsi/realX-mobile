import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { ModifierConfig as JetpackModifierConfig } from '@expo/ui/jetpack-compose/modifiers';
import type { ModifierConfig as SwiftUIModifierConfig } from '@expo/ui/swift-ui/modifiers';

type SwiftUIModifiers = typeof import('@expo/ui/swift-ui/modifiers');
type JetpackModifiers = typeof import('@expo/ui/jetpack-compose/modifiers');
type BottomSheetModifierConfig = SwiftUIModifierConfig | JetpackModifierConfig;

type BottomSheetOverscanBackgroundProps = {
    backgroundColor: string;
    horizontalOverscan?: number;
    verticalOverscan?: number;
};

export function getBottomSheetBackgroundModifiers(backgroundColor: string): BottomSheetModifierConfig[] | undefined {
    if (Platform.OS === 'ios') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { presentationBackground } = require('@expo/ui/swift-ui/modifiers') as SwiftUIModifiers;
        return [presentationBackground(backgroundColor)];
    }

    if (Platform.OS === 'android') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { background } = require('@expo/ui/jetpack-compose/modifiers') as JetpackModifiers;
        return [background(backgroundColor)];
    }

    return undefined;
}

export function BottomSheetOverscanBackground({
    backgroundColor,
    horizontalOverscan = 96,
    verticalOverscan = 360,
}: BottomSheetOverscanBackgroundProps) {
    const { height, width } = useWindowDimensions();

    return (
        <View
            pointerEvents="none"
            style={[
                styles.overscanBackground,
                {
                    backgroundColor,
                    height: height + verticalOverscan * 2,
                    left: -horizontalOverscan,
                    top: -verticalOverscan,
                    width: width + horizontalOverscan * 2,
                },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    overscanBackground: {
        position: 'absolute',
    },
});
