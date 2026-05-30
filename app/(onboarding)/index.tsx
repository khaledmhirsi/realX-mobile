import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, I18nManager, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhonkText from '../../components/PhonkText';
import {
    OnboardingButtonMotion,
    OnboardingGlowMotion,
    OnboardingIntroFooterMotion,
    OnboardingIntroHeadlineMotion,
    OnboardingIntroLogoMotion,
    OnboardingIntroMascotMotion,
    OnboardingScreenMotion,
    OnboardingStaggerItem,
} from '../../components/onboarding/OnboardingMotion';
import StaggeredHeadingText from '../../components/onboarding/StaggeredHeadingText';
import { useAppTheme } from '../../context/AppThemeContext';
import { Typography } from '../../constants/Typography';
import { setStoredLanguage } from '../../src/localization/i18n';
import { applyRTL } from '../../src/localization/rtl';

const { width, height } = Dimensions.get('window');
const TAJAWAL_BLACK = 'TajawalBlack';

export default function OnboardingScreen() {
    const router = useRouter();
    const [step, setStep] = useState(0);

    const { t, i18n } = useTranslation();
    const { theme } = useAppTheme();
    const isRTL = I18nManager.isRTL;

    const changeLanguage = async (lang: 'en' | 'ar') => {
        if (i18n.language === lang) return;
        await setStoredLanguage(lang);
        await i18n.changeLanguage(lang);
        applyRTL(lang);
        await Updates.reloadAsync();
    };

    const handleGetStarted = () => {
        setStep(1);
    };

    const handleSelectRole = (role: 'student' | 'creator') => {
        router.push({
            pathname: '/(onboarding)/email',
            params: { role, mode: 'signup' }
        } as any);
    };

    const handleLogin = () => {
        router.push('/(onboarding)/login' as any);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.brand }]}>
            <StatusBar style="light" />

            <SafeAreaView style={styles.safeArea}>
                {step === 0 ? (
                    <OnboardingScreenMotion key="intro" style={styles.motionFill}>
                    <View style={styles.content}>
                        {/* Logo */}
                        <OnboardingIntroLogoMotion style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/images/logo.png')}
                                style={styles.logo}
                                contentFit="contain"
                            />
                        </OnboardingIntroLogoMotion>

                        {/* Headline */}
                        <View style={styles.headlineContainer}>
                            <OnboardingIntroHeadlineMotion delay={180}>
                                <StaggeredHeadingText
                                    text={t('onboarding_headline_broke')}
                                    textStyle={[styles.headlineBroke, isRTL && styles.arHeadline]}
                                    fontHeight={isRTL ? 56 : 34}
                                    delay={980}
                                />
                            </OnboardingIntroHeadlineMotion>
                            <OnboardingIntroHeadlineMotion delay={260}>
                                <StaggeredHeadingText
                                    text={t('onboarding_headline_not_anymore')}
                                    textStyle={[styles.headlineNotAnymore, isRTL && styles.arHeadline]}
                                    fontHeight={isRTL ? 56 : 34}
                                    delay={1120}
                                />
                            </OnboardingIntroHeadlineMotion>
                        </View>

                        {/* Character Graphic */}
                        <OnboardingIntroMascotMotion style={[styles.graphicContainer, isRTL && styles.graphicContainerRTL]}>
                            <View style={isRTL ? styles.mascotFlip : undefined}>
                                <Image
                                    source={require('../../assets/images/onboarding.png')}
                                    style={[styles.characterImage, isRTL && styles.characterImageRTL]}
                                    contentFit="contain"
                                    contentPosition="left"
                                />
                            </View>
                        </OnboardingIntroMascotMotion>

                        {/* Footer */}
                        <OnboardingIntroFooterMotion style={styles.footer}>
                            <Text style={[styles.subtext, isRTL && styles.arSubtext]}>
                                {t('onboarding_student_subtext')}
                            </Text>

                            <View style={styles.languageSwitcher}>
                                <TouchableOpacity onPress={() => changeLanguage('en')}>
                                    <Text style={[styles.langText, i18n.language === 'en' && styles.langTextActive]}>English</Text>
                                </TouchableOpacity>
                                <Text style={styles.langSeparator}> | </Text>
                                <TouchableOpacity onPress={() => changeLanguage('ar')}>
                                    <Text style={[styles.langText, i18n.language === 'ar' && styles.langTextActive]}>العربية</Text>
                                </TouchableOpacity>
                            </View>
                            <OnboardingButtonMotion enabled>
                                <OnboardingGlowMotion
                                    style={styles.buttonGlowWrapper}
                                    glowStyle={[styles.buttonGlow, { backgroundColor: theme.logoTile, borderColor: theme.logoTile }]}
                                >
                                    <TouchableOpacity
                                        style={[styles.button, { backgroundColor: theme.logoTile }]}
                                        onPress={handleGetStarted}
                                        activeOpacity={0.9}
                                    >
                                        <PhonkText style={[styles.buttonText, { color: theme.brand }, isRTL && styles.arButtonText]}>
                                            {t('onboarding_get_started')}
                                        </PhonkText>
                                        <View style={[styles.arrowCircle, { backgroundColor: theme.brand }]}>
                                            <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={24} color="white" />
                                        </View>
                                    </TouchableOpacity>
                                </OnboardingGlowMotion>
                            </OnboardingButtonMotion>
                        </OnboardingIntroFooterMotion>
                    </View>
                    </OnboardingScreenMotion>
                ) : (
                    <OnboardingScreenMotion key="roles" style={styles.motionFill}>
                    <View style={styles.roleSelectionContent}>
                        {/* Logo */}
                        <View style={styles.roleLogoContainer}>
                            <Image
                                source={require('../../assets/images/logo.png')}
                                style={styles.roleLogo}
                                contentFit="contain"
                            />
                        </View>

                        {/* Role Cards */}
                        <View style={styles.cardsWrapper}>
                            <OnboardingStaggerItem delay={80}>
                            <TouchableOpacity
                                style={[styles.roleCard, { backgroundColor: theme.logoTile }]}
                                activeOpacity={0.9}
                                onPress={() => handleSelectRole('student')}
                            >
                                <View style={[styles.roleImageCircle]}>
                                    <Image
                                        source={require('../../assets/images/join-student.png')}
                                        style={styles.roleImage}
                                        contentFit="contain"
                                    />
                                </View>
                                <View style={[styles.roleTextContainer, isRTL && styles.roleTextContainerRTL]}>
                                    <PhonkText style={[styles.roleTitle, { color: theme.logoTileText }]}>{t('onboarding_join_as_student')}</PhonkText>
                                    <Text style={[styles.roleDescription, { color: theme.logoTileText }, isRTL && styles.subtextRTL]}>
                                        {t('onboarding_student_role_description')}
                                    </Text>
                                </View>
                                <Ionicons name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'} size={32} color={theme.iconMuted} />
                            </TouchableOpacity>
                            </OnboardingStaggerItem>

                            <OnboardingStaggerItem delay={150}>
                            <TouchableOpacity
                                style={[styles.roleCard, { backgroundColor: theme.logoTile }]}
                                activeOpacity={0.9}
                                onPress={() => handleSelectRole('creator')}
                            >
                                <View style={[styles.roleImageCircle]}>
                                    <Image
                                        source={require('../../assets/images/join-creator.png')}
                                        style={styles.roleImage}
                                        contentFit="contain"
                                    />
                                </View>
                                <View style={[styles.roleTextContainer, isRTL && styles.roleTextContainerRTL]}>
                                    <PhonkText style={[styles.roleTitle, { color: theme.logoTileText }]}>{t('onboarding_join_as_creator')}</PhonkText>
                                    <Text style={[styles.roleDescription, { color: theme.logoTileText }, isRTL && styles.subtextRTL]}>
                                        {t('onboarding_creator_role_description')}
                                    </Text>
                                </View>
                                <Ionicons name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'} size={32} color={theme.iconMuted} />
                            </TouchableOpacity>
                            </OnboardingStaggerItem>
                        </View>

                        {/* Login Pill */}
                        <OnboardingStaggerItem delay={220}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={handleLogin}
                            style={[styles.loginPill, { backgroundColor: theme.logoTile }]}
                        >
                            <Text style={[styles.loginText, { color: theme.logoTileText }, isRTL && styles.subtextRTL]}>
                                {t('onboarding_login_prompt')} <Text style={[styles.loginBold, { color: theme.brand }]}>{t('onboarding_login_action')}</Text>
                            </Text>
                        </TouchableOpacity>
                        </OnboardingStaggerItem>
                    </View>
                    </OnboardingScreenMotion>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    motionFill: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    logoContainer: {
        marginTop: 20,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        height: 48,
        width: 150,
    },
    headlineContainer: {
        marginTop: 40,
        alignSelf: 'flex-start',
        paddingStart: 10,
    },
    headlineBroke: {
        fontSize: 32,
        color: '#FFFFFF',
        fontStyle: 'italic',
        lineHeight: 44,
    },
    headlineNotAnymore: {
        fontSize: 32,
        color: '#FFFFFF',
        lineHeight: 44,
    },
    graphicContainer: {
        flex: 1,
        width: width,
        justifyContent: 'center',
        alignItems: 'flex-start',
        alignSelf: 'flex-start',
        marginStart: -24,
        marginTop: 50,
    },
    characterImage: {
        width: width * 0.85,
        height: height * 0.45,
    },
    characterImageRTL: {
        width: width * 0.92,
    },
    mascotFlip: {
        transform: [{ scaleX: -1 }],
    },
    footer: {
        width: '100%',
        paddingBottom: 8,
        paddingHorizontal: 10,
    },
    subtext: {
        fontFamily: Typography.poppins.medium,
        fontSize: 18,
        color: '#FFFFFF',
        textAlign: 'left',
        width: '100%',
        marginBottom: 32,
        lineHeight: 24,
    },
    button: {
        width: '100%',
        height: 72,
        borderRadius: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingStart: 30,
        paddingEnd: 10,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        // Elevation for Android
        elevation: 5,
    },
    buttonGlowWrapper: {
        position: 'relative',
    },
    buttonGlow: {
        position: 'absolute',
        top: -8,
        right: -8,
        bottom: -8,
        left: -8,
        borderRadius: 48,
        borderWidth: 1,
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.85,
        shadowRadius: 18,
        elevation: 2,
    },
    buttonText: {
        fontSize: 18,
        color: '#18B852',
    },
    arrowCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
    },
    languageSwitcher: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    langText: {
        fontFamily: Typography.poppins.medium,
        fontSize: 20,
      color: '#FFFFFF',
      opacity: 0.75,
    },
    langTextActive: {
        opacity: 1,
        fontFamily: Typography.poppins.semiBold,
    },
    langSeparator: {
        fontSize: 16,
        color: '#FFFFFF',
        marginHorizontal: 15,
    },
    // Role selection styles
    roleSelectionContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center', // Center content vertically as in screenshot
        paddingHorizontal: 16,
    },
    roleLogoContainer: {
        marginBottom: 60,
    },
    roleLogo: {
        height: 80,
        width: 240,
    },
    cardsWrapper: {
        width: '100%',
        gap: 16,
    },
    roleCard: {
        borderRadius: 45,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 6,
    },
    roleImageCircle: {
        width: 100,
        height: 100,
    },
    roleImage: {
        width: '100%',
        height: '100%',
    },
    roleTextContainer: {
        flex: 1
    },
    roleTitle: {
        fontSize: 20,
        marginBottom: 8,
    },
    roleDescription: {
        fontFamily: Typography.poppins.medium,
        fontSize: 12,
        lineHeight: 16,
        paddingRight: 10,
    },
    arHeadline: {
        fontFamily: TAJAWAL_BLACK,
        fontSize: 42,
        lineHeight: 56,
        fontStyle: 'normal',
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    graphicContainerRTL: {
        marginTop: 24,
    },
    subtextRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    arSubtext: {
        fontSize: 21,
        lineHeight: 30,
        writingDirection: 'rtl',
    },
    roleTextContainerRTL: {
        marginLeft: 0,
        marginRight: 4,
    },
    arButtonText: {
        fontFamily: TAJAWAL_BLACK,
        fontSize: 24,
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    loginPill: {
        paddingVertical: 15,
        paddingHorizontal: 35,
        borderRadius: 100,
        marginTop: 50,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    loginText: {
        fontFamily: Typography.poppins.medium,
        fontSize: 16,
    },
    loginBold: {
        fontFamily: Typography.poppins.semiBold,
    },
});
