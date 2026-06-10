import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { deleteUser, getAuth, signOut, updateProfile } from '@react-native-firebase/auth';
import { doc, getFirestore, updateDoc } from '@react-native-firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    I18nManager,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';
import { unregisterExpoPushTokenForCurrentUser } from '../utils/pushNotifications';
import { useAppTheme } from '../context/AppThemeContext';
import { Typography } from '../constants/Typography';
import PhonkText from '../components/PhonkText';
import UserAvatar from '../components/UserAvatar';
import { fetchStudentProfile } from '../utils/firebaseQueries';
import { queryClient, queryKeys } from '../utils/queryClient';

export default function ProfileDetailsScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar' || I18nManager.isRTL;
    const backIconName: keyof typeof Ionicons.glyphMap = isRTL ? 'arrow-forward' : 'arrow-back';

    // Form states
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [photoURL, setPhotoURL] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const user = getAuth().currentUser;
    const userId = user?.uid ?? null;

    const {
        data: studentProfile,
        error: studentProfileError,
        isLoading: isStudentProfileLoading,
    } = useQuery({
        queryKey: userId ? queryKeys.studentProfile(userId) : ['studentProfile', 'anonymous'],
        queryFn: () => userId ? fetchStudentProfile(userId) : Promise.resolve(null),
        enabled: !!userId,
    });

    useEffect(() => {
        if (!user) {
            router.replace('/(onboarding)');
            return;
        }

        setIsLoading(isStudentProfileLoading);
    }, [isStudentProfileLoading, router, user]);

    useEffect(() => {
        if (studentProfileError) {
            logger.error('Error fetching user data:', studentProfileError);
            Alert.alert(t('error'), t('profile_load_failed'));
        }
    }, [studentProfileError, t]);

    useEffect(() => {
        if (!user || !studentProfile) return;

        setFirstName(studentProfile.firstName || '');
        setLastName(studentProfile.lastName || '');
        setEmail(studentProfile.email || user.email || '');
        setPhotoURL(studentProfile.photoURL || user.photoURL || null);
        setRole(studentProfile.role || null);
        if (studentProfile.dob) {
            try {
                if (studentProfile.dob.includes('-')) {
                    const [year, month, day] = studentProfile.dob.split('-').map(Number);
                    setDob(new Date(year, month - 1, day));
                } else if (studentProfile.dob.includes('/')) {
                    const [day, month, year] = studentProfile.dob.split('/').map(Number);
                    setDob(new Date(year, month - 1, day));
                }
            } catch (error) {
                logger.error('Date parsing error:', error);
            }
        }
    }, [studentProfile, user]);

    const handleBack = () => {
        router.back();
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'DD/MM/YYYY';
        return date.toLocaleDateString('en-GB');
    };

    const handleToggleEdit = () => {
        if (isEditing) {
            handleSave();
        } else {
            setIsEditing(true);
        }
    };

    const handleSave = async () => {
        const authInstance = getAuth();
        const user = authInstance.currentUser;
        if (!user) return;

        setIsSaving(true);
        try {
            const db = getFirestore();
            const studentDocRef = doc(db, 'students', user.uid);

            const updatedData = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                dob: dob ? dob.toISOString().split('T')[0] : '',
                updatedAt: new Date(),
            };

            await updateDoc(studentDocRef, updatedData);
            queryClient.setQueryData(queryKeys.studentProfile(user.uid), (previous: any) => ({
                ...(previous || {}),
                ...updatedData,
            }));

            await updateProfile(user, {
                displayName: `${firstName.trim()} ${lastName.trim()}`
            });

            setIsEditing(false);
            Alert.alert(t('success'), t('profile_update_success'));
        } catch (error) {
            logger.error('Error updating profile:', error);
            Alert.alert(t('error'), t('profile_update_failure'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('delete_account'),
            t('delete_account_confirmation'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete_account_permanently'),
                    style: 'destructive',
                    onPress: async () => {
                        const authInstance = getAuth();
                        const user = authInstance.currentUser;
                        if (!user) return;

                        setIsLoading(true);
                        try {
                            await unregisterExpoPushTokenForCurrentUser();
                            // The "Delete User Data" extension is triggered by the Auth user deletion
                            await deleteUser(user);
                            
                            // Explicitly sign out to clear any local session data
                            // This may throw if the user is already deleted, which is expected
                            try {
                                await signOut(authInstance);
                            } catch {
                                // User already deleted, sign out is a no-op
                            }
                            
                            Alert.alert(t('delete_account_success_title'), t('delete_account_success_message'));
                            router.replace('/(onboarding)');
                        } catch (error: any) {
                            logger.error('Error deleting account:', error);
                            if (error.code === 'auth/requires-recent-login') {
                                Alert.alert(t('security_reauth_required'), t('security_reauth_message'), [
                                    { text: t('ok') },
                                ]);
                            } else {
                                Alert.alert(t('error'), t('delete_account_failure'));
                            }
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDob(selectedDate);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
            <TouchableOpacity
                onPress={handleBack}
                style={[styles.backButton, { backgroundColor: theme.cardMuted }]}
            >
                <Ionicons name={backIconName} size={24} color={theme.icon} />
            </TouchableOpacity>
                <PhonkText style={[styles.headerTitle, { color: theme.text }, isRTL && styles.headerTitleRTL]}>
                    {t('profile_details_title')}
                </PhonkText>
            <TouchableOpacity
                onPress={handleToggleEdit}
                style={[styles.editButton, { backgroundColor: theme.cardMuted }]}
            >
                <PhonkText style={[styles.editButtonText, { color: isEditing ? theme.brand : theme.text }]}>
                    {isEditing ? t('save') : t('edit')}
                </PhonkText>
            </TouchableOpacity>
        </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Profile Image Section */}
                    <View style={styles.avatarContainer}>
                        <UserAvatar
                            firstName={firstName}
                            lastName={lastName}
                            email={email}
                            photoURL={photoURL}
                            role={role}
                            seed={getAuth().currentUser?.uid}
                            size={120}
                            style={styles.avatarMain}
                        />
                    </View>

                    {/* Form Fields */}
                    <View style={styles.form}>
                        {isLoading || isSaving ? (
                            <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 20 }} />
                        ) : (
                            <>
                                {/* First Name Field */}
                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}>
                                        <PhonkText style={[styles.label, { color: theme.subtleText }, isRTL && styles.textRTL]}>
                                            {t('first_name')}
                                        </PhonkText>
                                    </View>
                                    <View style={[styles.inputWrapper, { backgroundColor: theme.cardMuted }, !isEditing && styles.disabledInput]}>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                { color: isEditing ? theme.text : theme.subtleText, textAlign: isRTL ? 'right' : 'left' },
                                            ]}
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            editable={isEditing}
                                            placeholder={t('first_name_placeholder')}
                                            placeholderTextColor={theme.inputPlaceholder}
                                        />
                                    </View>
                                </View>

                                {/* Last Name Field */}
                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}>
                                        <PhonkText style={[styles.label, { color: theme.subtleText }, isRTL && styles.textRTL]}>
                                            {t('last_name')}
                                        </PhonkText>
                                    </View>
                                    <View style={[styles.inputWrapper, { backgroundColor: theme.cardMuted }, !isEditing && styles.disabledInput]}>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                { color: isEditing ? theme.text : theme.subtleText, textAlign: isRTL ? 'right' : 'left' },
                                            ]}
                                            value={lastName}
                                            onChangeText={setLastName}
                                            editable={isEditing}
                                            placeholder={t('last_name_placeholder')}
                                            placeholderTextColor={theme.inputPlaceholder}
                                        />
                                    </View>
                                </View>

                                {/* Email Field */}
                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}>
                                        <PhonkText style={[styles.label, { color: theme.subtleText }, isRTL && styles.textRTL]}>
                                            {t('email_address')}
                                        </PhonkText>
                                    </View>
                                    <View style={[styles.inputWrapper, { backgroundColor: theme.cardMuted }, styles.disabledInput]}>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                { color: theme.subtleText, textAlign: isRTL ? 'right' : 'left' },
                                            ]}
                                            value={email}
                                            editable={false}
                                            placeholder={t('email_address_placeholder')}
                                            placeholderTextColor={theme.inputPlaceholder}
                                        />
                                    </View>
                                </View>

                                {/* Date of Birth Field */}
                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}>
                                        <PhonkText style={[styles.label, { color: theme.subtleText }, isRTL && styles.textRTL]}>
                                            {t('date_of_birth')}
                                        </PhonkText>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.inputWrapper, { backgroundColor: theme.cardMuted }, !isEditing && styles.disabledInput]}
                                        onPress={() => isEditing && setShowDatePicker(true)}
                                        disabled={!isEditing}
                                    >
                                        <Text
                                            style={[
                                                styles.input,
                                                { color: !dob || !isEditing ? theme.subtleText : theme.text, textAlign: isRTL ? 'right' : 'left' },
                                            ]}
                                        >
                                            {formatDate(dob)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={dob || new Date(2000, 0, 1)}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onDateChange}
                                        maximumDate={new Date()}
                                        textColor={theme.text}
                                    />
                                )}
                            </>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={[styles.deleteAccountPill, { backgroundColor: '#FFF1F0', borderColor: '#FFD5D2' }]}
                            onPress={handleDeleteAccount}
                            activeOpacity={0.7}
                        >
                            <View style={styles.deleteContent}>
                                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                <PhonkText style={styles.deleteAccountText}>{t('delete_account')}</PhonkText>
                            </View>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        flex: 1,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    headerTitleRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    editButton: {
        borderRadius: 24,
        paddingVertical: 10,
        paddingHorizontal: 20,
        
    },
    editButtonText: {
        fontSize: 14,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarMain: {
        borderWidth: 4,
    },
    form: {
        gap: 24,
    },
    inputGroup: {
        gap: 8,
    },
    labelRow: {
        width: '100%',
        alignItems: 'flex-start',
    },
    label: {
        fontSize: 12,
        paddingStart: 4,
    },
    textRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 20,
        height: 60,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: Typography.poppins.semiBold,
    },
    disabledInput: {
        opacity: 0.8,
    },
    disabledText: {
    },
    actions: {
        marginTop: 24,
    },
    deleteAccountPill: {
        backgroundColor: '#FFF1F0',
        borderRadius: 30,
        paddingVertical: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFD5D2',
    },
    deleteContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteAccountText: {
        fontSize: 14,
        color: '#FF3B30',
    },
});
