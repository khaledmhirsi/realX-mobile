import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

type BottomSheetModifierConfig = {
    $type: string;
    [key: string]: unknown;
};

type BottomSheetOverscanBackgroundProps = {
    backgroundColor: string;
    horizontalOverscan?: number;
    verticalOverscan?: number;
};

export function getBottomSheetBackgroundModifiers(backgroundColor: string): BottomSheetModifierConfig[] | undefined {
    if (Platform.OS === 'ios') {
        return [{ $type: 'presentationBackground', color: backgroundColor }];
    }

    if (Platform.OS === 'android') {
        return [{ $type: 'background', color: backgroundColor }];
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
