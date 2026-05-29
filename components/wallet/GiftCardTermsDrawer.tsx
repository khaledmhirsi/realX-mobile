import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import React from 'react';
import {
    I18nManager,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../context/AppThemeContext';
import { Typography } from '../../constants/Typography';
import PhonkText from '../PhonkText';

type GiftCardTermsDrawerProps = {
    visible: boolean;
    onClose: () => void;
};

export default function GiftCardTermsDrawer({
    visible,
    onClose,
}: GiftCardTermsDrawerProps) {
    const insets = useSafeAreaInsets();
    const { isDark, theme } = useAppTheme();
    const { t } = useTranslation();
    const isRTL = I18nManager.isRTL;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <GlassView
                    style={StyleSheet.absoluteFill}
                    glassEffectStyle="regular"
                    colorScheme={isDark ? 'dark' : 'light'}
                    tintColor="rgba(0,0,0,0.3)"
                />
                <Pressable
                    style={[
                        styles.drawerContainer,
                        {
                            backgroundColor: theme.card,
                            paddingBottom: insets.bottom + 20,
                        },
                    ]}
                    onPress={(e) => e.stopPropagation()}
                    >
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />
                    </View>

                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <PhonkText style={[styles.modalTitleText, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                                {t('terms_and_conditions_caps')}
                            </PhonkText>
                            <TouchableOpacity
                                onPress={onClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close-circle" size={28} color={theme.icon} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={styles.modalBody}
                            contentContainerStyle={styles.modalBodyContent}
                        >
                            <Text style={[styles.descriptionText, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                                {t('no_specific_terms')}
                            </Text>

                            <View style={[styles.commonTerms, { borderTopColor: theme.border }]}>
                                <View style={styles.termRow}>
                                    <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                                    <Text style={[styles.termText, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t('in_store_only')}
                                    </Text>
                                </View>
                                <View style={styles.termRow}>
                                    <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                                    <Text style={[styles.termText, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t('cannot_be_combined')}
                                    </Text>
                                </View>
                                <View style={styles.termRow}>
                                    <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                                    <Text style={[styles.termText, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t('xp_promotional_reward')}
                                    </Text>
                                </View>
                                <View style={styles.termRow}>
                                    <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                                    <Text style={[styles.termText, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t('xp_no_cash_withdrawal')}
                                    </Text>
                                </View>
                                <View style={styles.termRow}>
                                    <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                                    <Text style={[styles.termText, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t('xp_in_app_only')}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    drawerContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '80%',
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
    },
    modalContent: {
        paddingHorizontal: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitleText: {
        fontSize: 20,
        letterSpacing: 0.5,
    },
    modalBody: {
        marginBottom: 20,
    },
    modalBodyContent: {
        paddingBottom: 20,
    },
    descriptionText: {
        fontSize: 16,
        fontFamily: Typography.poppins.medium,
        lineHeight: 24,
    },
    commonTerms: {
        marginTop: 4,
        gap: 12,
        paddingTop: 24,
        borderTopWidth: 1,
    },
    termRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    termText: {
        fontSize: 14,
        fontFamily: Typography.poppins.medium,
        flex: 1,
    },
});
