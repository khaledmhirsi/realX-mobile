import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { I18nManager, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/AppThemeContext';
import { Typography } from '../constants/Typography';

export default function PrivacyScreen() {
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
                    {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
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
                        {isRTL ? '1. جمع البيانات' : '1. Data Collection'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'نقوم بجمع المعلومات التي تقدمها لنا مباشرة عند إنشاء حساب أو تحديث ملفك الشخصي أو استخدام خدماتنا. وقد تشمل هذه المعلومات اسمك، بريدك الإلكتروني، رقم هاتفك، وتاريخ ميلادك.'
                            : 'We collect information that you provide directly to us when you create an account, update your profile, or use our services. This may include your name, email address, phone number, and date of birth.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                        {isRTL ? '2. كيفية استخدام البيانات' : '2. How We Use Your Data'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'نستخدم المعلومات التي نجمعها لتقديم خدماتنا وصيانتها وتحسينها، ومعالجة معاملاتك، والتواصل معك بشأن تحديثات وعروض realX.'
                            : 'We use the information we collect to provide, maintain, and improve our services, to process your transactions, and to communicate with you about realX updates and promotions.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                        {isRTL ? '3. مشاركة البيانات' : '3. Data Sharing'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'لا نقوم بمشاركة معلوماتك الشخصية مع أي أطراف خارجية إلا وفق ما هو موضح في هذه السياسة، أو بموافقتك، أو للامتثال للمتطلبات القانونية.'
                            : 'We do not share your personal information with third parties except as described in this policy, such as with your consent or to comply with legal obligations.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                        {isRTL ? '4. حماية البيانات' : '4. Data Security'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'نتخذ إجراءات مناسبة لحماية معلوماتك من الفقدان أو السرقة أو سوء الاستخدام أو الوصول غير المصرح به أو الإفصاح أو التعديل أو الإتلاف.'
                            : 'We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                        {isRTL ? '5. خياراتك' : '5. Your Choices'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'يمكنك تحديث أو تعديل معلومات حسابك في أي وقت من خلال تسجيل الدخول إلى حسابك أو التواصل معنا. كما يمكنك طلب حذف حسابك.'
                            : 'You may update or correct your account information at any time by logging into your account or contacting us. You can also request the deletion of your account.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.textRTL]}>
                        {isRTL ? '6. تواصل معنا' : '6. Contact Us'}
                    </Text>
                    <Text style={[styles.paragraph, { color: theme.mutedText }, isRTL && styles.textRTL]}>
                        {isRTL
                            ? 'إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى التواصل معنا عبر support@realx.qa.'
                            : 'If you have any questions about this Privacy Policy, please contact us at support@realx.qa.'}
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
