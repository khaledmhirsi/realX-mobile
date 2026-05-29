import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { I18nManager, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/AppThemeContext';
import { Typography } from '../constants/Typography';

export default function TermsScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const isRTL = I18nManager.isRTL;

    const handleBack = () => {
        router.back();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity onPress={handleBack} style={[styles.backButton, { borderColor: theme.border }]}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={theme.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                    {isRTL ? 'الشروط والأحكام' : 'Terms and Conditions'}
                </Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={[styles.lastUpdated, { color: theme.subtleText }, isRTL && styles.textRTL]}>
                    {isRTL ? 'آخر تحديث: أبريل 2026' : 'Last updated: April 2026'}
                </Text>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                        {isRTL ? '1. المقدمة' : '1. Introduction'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'مرحبًا بك في realX. تنظم هذه الشروط والأحكام استخدامك لتطبيقنا وخدماتنا. ومن خلال الوصول إلى realX أو استخدامه، فإنك توافق على الالتزام بهذه الشروط.'
                            : 'Welcome to realX. These Terms and Conditions govern your use of our application and services. By accessing or using realX, you agree to be bound by these terms.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                        {isRTL ? '2. استخدام الخدمات' : '2. Use of Services'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'يجب أن يكون عمرك 18 عامًا على الأقل لاستخدام هذه الخدمة. كما توافق على استخدام realX فقط للأغراض القانونية وبما لا ينتهك حقوق الآخرين أو يقيّد أو يمنع استخدامهم واستفادتهم من realX.'
                            : 'You must be at least 18 years old to use this service. You agree to use realX only for lawful purposes and in a way that does not infringe the rights of, restrict or inhibit anyone else&apos;s use and enjoyment of realX.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                        {isRTL ? '3. تسجيل الحساب' : '3. Account Registration'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'للوصول إلى بعض الميزات، قد يُطلب منك إنشاء حساب. وأنت تقرّ وتضمن أن جميع معلومات التسجيل التي تقدمها صحيحة ودقيقة.'
                            : 'To access certain features, you may be required to register for an account. You represent and warrant that all registration information you submit is truthful and accurate.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                        {isRTL ? '4. الملكية الفكرية' : '4. Intellectual Property'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'إن المحتوى والتنظيم والرسومات والتصميم وغير ذلك من المواد المتعلقة بـ realX محمية بموجب قوانين حقوق النشر وغيرها من القوانين ذات الصلة بالملكية.'
                            : 'The content, organization, graphics, design, and other matters related to realX are protected under applicable copyrights and other proprietary laws.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                        {isRTL ? '5. تحديد المسؤولية' : '5. Limitation of Liability'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'لن تكون realX مسؤولة عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية، أو عن أي خسارة في الأرباح أو الإيرادات.'
                            : 'realX shall not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                        {isRTL ? '6. التعديلات على الشروط' : '6. Changes to Terms'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'نحتفظ بالحق في تعديل هذه الشروط في أي وقت. ويُعد استمرارك في استخدام realX بعد أي تغييرات من هذا النوع بمثابة موافقة منك على الشروط والأحكام الجديدة.'
                            : 'We reserve the right to modify these terms at any time. Your continued use of realX after any such changes constitutes your acceptance of the new Terms and Conditions.'}
                    </Text>
                </View>
            </ScrollView>
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
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 20,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: Typography.poppins.semiBold,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 40,
    },
    lastUpdated: {
        fontSize: 14,
        fontFamily: Typography.poppins.medium,
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Typography.poppins.semiBold,
        marginBottom: 12,
    },
    paragraph: {
        fontSize: 16,
        fontFamily: Typography.poppins.medium,
        lineHeight: 28,
    },
    textRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
});
