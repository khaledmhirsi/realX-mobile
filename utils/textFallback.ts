export function pickLocalizedText(
    isArabic: boolean,
    arabicValue?: string | null,
    englishValue?: string | null,
    fallback = '',
) {
    const primary = isArabic ? arabicValue : englishValue;
    const secondary = isArabic ? englishValue : arabicValue;

    return primary?.trim() || secondary?.trim() || fallback;
}
