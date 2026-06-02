import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { getAuth } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    Alert,
    I18nManager,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAppTheme } from '../../context/AppThemeContext';
import { Typography } from '../../constants/Typography';
import PhonkText from '../../components/PhonkText';
import {
    OnboardingButtonMotion,
    OnboardingCardMotion,
    OnboardingScreenMotion,
    OnboardingStaggerItem,
} from '../../components/onboarding/OnboardingMotion';
import { logger } from '../../utils/logger';
import { useTranslation } from 'react-i18next';





export default function DetailsOnboarding() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email?: string; role?: string }>();
    const { t } = useTranslation();
    const { theme } = useAppTheme();
    const isRTL = I18nManager.isRTL;
    const arrowIconName = isRTL ? 'arrow-forward' : 'arrow-back';
    const inputTextAlign: 'left' | 'right' = isRTL ? 'right' : 'left';
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [gender, setGender] = useState<'Male' | 'Female' | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleContinue = async () => {
        if (!isFormValid || isLoading) return;

        setIsLoading(true);
        try {
            const authInstance = getAuth();
            const user = authInstance.currentUser;
            if (!user) {
                throw new Error(t('onboarding_no_authenticated_user_message'));
            }

            const role = params.role || 'student';
            const functions = getFunctions(undefined, 'me-central1');
            const completeSignup = httpsCallable(functions, 'completeSignup');

            await completeSignup({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                dob: dob ? dob.toISOString().split('T')[0] : '', // Format: YYYY-MM-DD
                gender,
                email: params.email || user.email,
                role: role,
            });

            logger.log('Student details saved successfully!');
            router.replace('/(tabs)');
        } catch (error: any) {
            logger.error('Error saving student details:', error);
            Alert.alert(t('error'), error.message || t('onboarding_generic_error_message'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDob(selectedDate);
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return t('onboarding_date_of_birth_placeholder');
        return date.toLocaleDateString('en-GB');
    };

    const isFormValid = firstName.trim() && lastName.trim() && dob && gender && !isLoading;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style="light" />

            {/* Header / Background Section */}
            <OnboardingScreenMotion style={styles.headerBackground}>
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.topButtons}>
                        <TouchableOpacity
                            onPress={handleBack}
                            style={[styles.iconButton, { opacity: 0 }]}
                            disabled={true}
                        >
                            <Ionicons name={arrowIconName} size={24} color="black" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.replace('/')}
                            style={[styles.iconButton, { opacity: 0 }]}
                            disabled={true}
                        >
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </OnboardingScreenMotion>

            {/* Main Content Card */}
            <OnboardingCardMotion style={[styles.cardContainer, { backgroundColor: theme.background }]}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.card}>
                            <OnboardingStaggerItem delay={120}>
                            <View style={[styles.iconCircle, { backgroundColor: theme.brandSoft }]}>
                                <Ionicons name="create-outline" size={32} color={theme.brand} />
                            </View>
                            </OnboardingStaggerItem>

                            <OnboardingStaggerItem delay={170}>
                            <View style={styles.textContainer}>
                                <Text style={[styles.titleSmall, { color: theme.mutedText }]}>{t('onboarding_details_title_prefix')}</Text>
                                <PhonkText style={styles.titleLarge}>
                                    <Text style={[styles.greenText, { color: theme.brand }]}>{t('onboarding_details_title_suffix')}</Text>
                                </PhonkText>
                            </View>
                            </OnboardingStaggerItem>

                            <OnboardingStaggerItem delay={220} style={styles.formContainer}>
                                <View style={[styles.row, isRTL && styles.rowRTL]}>
                                    <View
                                        style={[
                                            styles.inputContainer,
                                            { flex: 1 },
                                            isRTL ? styles.inputMarginRTL : styles.inputMarginLTR,
                                            { backgroundColor: firstName ? theme.brandSoft : theme.cardMuted, borderColor: firstName ? theme.brand : 'transparent' },
                                        ]}
                                    >
                                        <TextInput
                                            style={[styles.input, { color: theme.text, textAlign: inputTextAlign }]}
                                            placeholder={t('first_name_placeholder')}
                                            placeholderTextColor={theme.inputPlaceholder}
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            editable={!isLoading}
                                        />
                                    </View>
                                    <View style={[
                                        styles.inputContainer,
                                        { flex: 1 },
                                        { backgroundColor: lastName ? theme.brandSoft : theme.cardMuted, borderColor: lastName ? theme.brand : 'transparent' },
                                    ]}>
                                        <TextInput
                                            style={[styles.input, { color: theme.text, textAlign: inputTextAlign }]}
                                            placeholder={t('last_name_placeholder')}
                                            placeholderTextColor={theme.inputPlaceholder}
                                            value={lastName}
                                            onChangeText={setLastName}
                                            editable={!isLoading}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.inputContainer,
                                        { backgroundColor: dob ? theme.brandSoft : theme.cardMuted, borderColor: dob ? theme.brand : 'transparent' },
                                    ]}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setShowDatePicker(true);
                                    }}
                                    disabled={isLoading}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="calendar-outline" size={20} color={dob ? theme.brand : theme.iconMuted} style={styles.inputIcon} />
                                    <Text
                                        style={[
                                            styles.input,
                                            { textAlign: inputTextAlign, flex: 1 },
                                            { color: dob ? theme.text : theme.inputPlaceholder },
                                        ]}
                                    >
                                        {formatDate(dob)}
                                    </Text>
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <View style={Platform.OS === 'ios' ? styles.iosPickerContainer : null}>
                                        {Platform.OS === 'ios' && (
                                            <View style={styles.pickerHeader}>
                                                <TouchableOpacity
                                                    onPress={() => setShowDatePicker(false)}
                                                    style={styles.doneButtonStyle}
                                                >
                                                <Text style={styles.doneButtonText}>{t('done')}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <DateTimePicker
                                            value={dob || new Date(2000, 0, 1)}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={onDateChange}
                                            maximumDate={new Date()}
                                            textColor={theme.text}
                                        />
                                    </View>
                                )}

                                <View style={styles.genderContainer}>
                                    <Text style={[styles.label, { color: theme.mutedText }, isRTL && styles.labelRTL]}>
                                        {t('onboarding_gender_label')}
                                    </Text>
                                    <View style={[styles.genderOptions, isRTL && styles.genderOptionsRTL]}>
                                        <TouchableOpacity
                                            style={[
                                                styles.genderButton,
                                                {
                                                    backgroundColor: gender === 'Male' ? theme.brandSoft : theme.cardMuted,
                                                    borderColor: gender === 'Male' ? theme.brand : 'transparent',
                                                },
                                            ]}
                                            onPress={() => setGender('Male')}
                                            disabled={isLoading}
                                        >
                                            <Ionicons
                                                name="male-outline"
                                                size={18}
                                                color={gender === 'Male' ? theme.brand : theme.iconMuted}
                                            />
                                            <Text
                                                style={[
                                                    styles.genderText,
                                                    { color: gender === 'Male' ? theme.brandText : theme.mutedText },
                                                    gender === 'Male' && styles.genderTextSelected,
                                                ]}
                                            >
                                                {t('onboarding_gender_male')}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.genderButton,
                                                {
                                                    backgroundColor: gender === 'Female' ? theme.brandSoft : theme.cardMuted,
                                                    borderColor: gender === 'Female' ? theme.brand : 'transparent',
                                                },
                                            ]}
                                            onPress={() => setGender('Female')}
                                            disabled={isLoading}
                                        >
                                            <Ionicons
                                                name="female-outline"
                                                size={18}
                                                color={gender === 'Female' ? theme.brand : theme.iconMuted}
                                            />
                                            <Text
                                                style={[
                                                    styles.genderText,
                                                    { color: gender === 'Female' ? theme.brandText : theme.mutedText },
                                                    gender === 'Female' && styles.genderTextSelected,
                                                ]}
                                            >
                                                {t('onboarding_gender_female')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </OnboardingStaggerItem>
                        </View>
                    </TouchableWithoutFeedback>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={20}
                        style={styles.footer}
                    >
                        <OnboardingButtonMotion enabled={Boolean(isFormValid)}>
                        <TouchableOpacity
                            style={[styles.button, isFormValid && styles.buttonEnabled]}
                            onPress={handleContinue}
                            disabled={!isFormValid}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.buttonText, { color: theme.onActionSolid }]}>
                                {isLoading ? t('onboarding_saving') : t('onboarding_continue')}
                            </Text>
                        </TouchableOpacity>
                        </OnboardingButtonMotion>
                    </KeyboardAvoidingView>
                </ScrollView>
            </OnboardingCardMotion>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerBackground: {
        height: 250,
        backgroundColor: Colors.brandGreen,
    },
    headerContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    topButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
    },
    iconButton: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 1)',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    cardContainer: {
        flex: 1,
        borderTopLeftRadius: 50, borderTopRightRadius: 50,
        marginTop: -80, paddingHorizontal: 28, paddingTop: 36,
    },
    card: {
        flex: 1, alignItems: 'center',
    },
    iconCircle: {
        width: 72, height: 72, borderRadius: 36,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 12, marginTop: 4,
    },
    textContainer: {
        marginBottom: 24,
        alignItems: 'center',
    },
    titleSmall: {
        fontSize: 14, fontFamily: Typography.poppins.medium,
        textTransform: 'uppercase', letterSpacing: 2,
        marginBottom: 4, textAlign: 'center',
    },
    titleLarge: {
        fontSize: 32, textAlign: 'center', lineHeight: 38,
    },
    greenText: {},
    formContainer: {
        marginBottom: 20, width: '100%',
    },
    row: { flexDirection: 'row', marginBottom: 12 },
    rowRTL: { flexDirection: 'row-reverse' },
    inputContainer: {
        borderRadius: 16,
        height: 56, justifyContent: 'center',
        paddingHorizontal: 18, marginBottom: 12,
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 2, borderColor: 'transparent',
    },
    inputFocused: {},
    inputMarginRTL: { marginLeft: 6 },
    inputMarginLTR: { marginRight: 6 },
    inputIcon: { marginRight: 10 },
    input: {
        fontSize: 16, fontFamily: Typography.poppins.medium,
        paddingVertical: 0,
        includeFontPadding: false,
    },
    genderContainer: { marginTop: 8 },
    label: {
        fontSize: 14, fontFamily: Typography.poppins.medium,
        marginBottom: 10, marginLeft: 6,
    },
    labelRTL: { marginLeft: 0, marginRight: 6, textAlign: 'right' },
    genderOptions: { flexDirection: 'row', justifyContent: 'space-between' },
    genderOptionsRTL: { flexDirection: 'row-reverse' },
    genderButton: {
        flex: 1, height: 52, borderRadius: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        marginHorizontal: 6, gap: 8,
        borderWidth: 2, borderColor: 'transparent',
    },
    genderButtonSelected: {
    },
    genderText: {
        fontSize: 15, fontFamily: Typography.poppins.medium,
    },
    genderTextSelected: {
        fontFamily: Typography.poppins.semiBold,
    },
    footer: { paddingBottom: 40 },
    button: {
        backgroundColor: Colors.brandGreen, height: 62, borderRadius: 31,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    buttonEnabled: {
        opacity: 1,
        shadowColor: Colors.brandGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    buttonText: {
        fontSize: 17, fontFamily: Typography.poppins.semiBold,
    },
    iosPickerContainer: {
        borderRadius: 16,
        marginBottom: 12, overflow: 'hidden',
    },
    pickerHeader: {
        flexDirection: 'row', justifyContent: 'flex-end',
        paddingHorizontal: 15, paddingTop: 10,
    },
    doneButtonStyle: { padding: 5 },
    doneButtonText: {
        color: Colors.brandGreen, fontFamily: Typography.poppins.semiBold, fontSize: 16,
    },
});
