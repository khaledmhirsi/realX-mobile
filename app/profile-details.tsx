import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { deleteUser, getAuth, signOut, updateProfile } from '@react-native-firebase/auth';
import { doc, getDoc, getFirestore, updateDoc } from '@react-native-firebase/firestore';
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
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import PhonkText from '../components/PhonkText';
import UserAvatar from '../components/UserAvatar';

export default function ProfileDetailsScreen() {
    const router = useRouter();
    const BRAND_GREEN = Colors.brandGreen;
    const { t } = useTranslation();
    const isRTL = I18nManager.isRTL;
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

    useEffect(() => {
        const authInstance = getAuth();
        const user = authInstance.currentUser;
        if (!user) {
            router.replace('/(onboarding)');
            return;
        }

        const fetchUserData = async () => {
            try {
                const db = getFirestore();
                const studentDocRef = doc(db, 'students', user.uid);
                const docSnap = await getDoc(studentDocRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFirstName(data?.firstName || '');
                    setLastName(data?.lastName || '');
                    setEmail(data?.email || user.email || '');
                    setPhotoURL(data?.photoURL || user.photoURL || null);
                    setRole(data?.role || null);
                    if (data?.dob) {
                        try {
                            if (data.dob.includes('-')) {
                                const [year, month, day] = data.dob.split('-').map(Number);
                                setDob(new Date(year, month - 1, day));
                            } else if (data.dob.includes('/')) {
                                const [day, month, year] = data.dob.split('/').map(Number);
                                setDob(new Date(year, month - 1, day));
                            }
                        } catch (e) {
                            logger.error('Date parsing error:', e);
                        }
                    }
                }
            } catch (error) {
                logger.error('Error fetching user data:', error);
            Alert.alert(t('error'), t('profile_load_failed'));
            } finally {
                setIsLoading(false);
            }
    };

    fetchUserData();
}, [router, t]);

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
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.light.background }]} edges={['top']}>
        <View style={[styles.header, isRTL && styles.rowReverse]}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name={backIconName} size={24} color={Colors.light.text} />
            </TouchableOpacity>
                <PhonkText style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'center' }]}>
                    {t('profile_details_title')}
                </PhonkText>
            <TouchableOpacity onPress={handleToggleEdit} style={styles.editButton}>
                <PhonkText style={[styles.editButtonText, isEditing && { color: BRAND_GREEN }]}>
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
                            <ActivityIndicator size="large" color={BRAND_GREEN} style={{ marginTop: 20 }} />
                        ) : (
                            <>
                                {/* First Name Field */}
                                <View style={styles.inputGroup}>
                                    <PhonkText style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t('first_name')}
                                    </PhonkText>
                                    <View style={[styles.inputWrapper, !isEditing && styles.disabledInput]}>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                !isEditing && styles.disabledText,
                                                { color: Colors.light.text, textAlign: isRTL ? 'right' : 'left' },
                                            ]}
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            editable={isEditing}
                                            placeholder={t('first_name_placeholder')}
                                            placeholderTextColor="#999"
                                        />
                                    </View>
                                </View>

                                {/* Last Name Field */}
                                <View style={styles.inputGroup}>
                                    <PhonkText style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t('last_name')}
                                    </PhonkText>
                                    <View style={[styles.inputWrapper, !isEditing && styles.disabledInput]}>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                !isEditing && styles.disabledText,
                                                { color: Colors.light.text, textAlign: isRTL ? 'right' : 'left' },
                                            ]}
                                            value={lastName}
                                            onChangeText={setLastName}
                                            editable={isEditing}
                                            placeholder={t('last_name_placeholder')}
                                            placeholderTextColor="#999"
                                        />
                                    </View>
                                </View>

                                {/* Email Field */}
                                <View style={styles.inputGroup}>
                                    <PhonkText style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t('email_address')}
                                    </PhonkText>
                                    <View style={[styles.inputWrapper, styles.disabledInput]}>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                styles.disabledText,
                                                { color: Colors.light.text, textAlign: isRTL ? 'right' : 'left' },
                                            ]}
                                            value={email}
                                            editable={false}
                                            placeholder={t('email_address_placeholder')}
                                            placeholderTextColor="#999"
                                        />
                                    </View>
                                </View>

                                {/* Date of Birth Field */}
                                <View style={styles.inputGroup}>
                                    <PhonkText style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t('date_of_birth')}
                                    </PhonkText>
                                    <TouchableOpacity
                                        style={[styles.inputWrapper, !isEditing && styles.disabledInput]}
                                        onPress={() => isEditing && setShowDatePicker(true)}
                                        disabled={!isEditing}
                                    >
                                        <Text
                                            style={[
                                                styles.input,
                                                !isEditing && styles.disabledText,
                                                !dob && { color: '#999' },
                                                { textAlign: isRTL ? 'right' : 'left' },
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
                                        textColor="black"
                                    />
                                )}
                            </>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={styles.deleteAccountPill} 
                            onPress={handleDeleteAccount}
                            activeOpacity={0.7}
                        >
                    <View style={[styles.deleteContent, isRTL && styles.rowReverse]}>
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
    rowReverse: {
        flexDirection: 'row-reverse',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F5F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        flex: 1,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    editButton: {
        backgroundColor: '#F5F5F7',
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
        borderColor: '#F5F5F7',
    },
    form: {
        gap: 24,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 12,
        color: '#8E8E93',
        paddingLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F7',
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
        color: '#8E8E93',
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
