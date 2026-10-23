import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../theme';
import { moderateScale, scaleFont } from '../../../utils/responsive';

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'center',
    paddingHorizontal: moderateScale(20, 0.2),
    paddingVertical: Platform.OS === 'ios' ? moderateScale(20, 0.2) : moderateScale(10, 0.2),
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: moderateScale(RADIUS.full, 0.2),
    marginBottom: moderateScale(10, 0.2),
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        paddingHorizontal: moderateScale(14, 0.2),
        paddingVertical: moderateScale(6, 0.2),
      },
      android: {
        paddingHorizontal: moderateScale(16, 0.2),
        paddingVertical: moderateScale(8, 0.2),
      },
    }),
    ...SHADOW.button,
  },
  badgeText: {
    fontSize: scaleFont(FONTS.small),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: Platform.OS === 'ios' ? 0.3 : moderateScale(0.5, 0.1),
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
    }),
  },
  heading: {
    fontSize: scaleFont(FONTS.heading) + 4,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  subheading: {
    fontSize: scaleFont(FONTS.body - 1),
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    lineHeight: moderateScale(19, 0.2),
    marginTop: moderateScale(3, 0.2),
    marginBottom: moderateScale(16, 0.2),
  },
  label: {
    fontSize: scaleFont(FONTS.label - 1),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: moderateScale(5, 0.2),
    letterSpacing: moderateScale(0.2, 0.1),
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(5, 0.2),
    marginTop: moderateScale(10, 0.2),
  },
  forgotLink: {
    fontSize: scaleFont(FONTS.link) - 1,
    fontWeight: FONTS.weightSemiBold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingHorizontal: moderateScale(14, 0.2),
    paddingVertical: moderateScale(10, 0.2),
    minHeight: moderateScale(46, 0.2),
    borderWidth: moderateScale(1, 0.2),
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  inputRowFocused: { borderColor: COLORS.primary },
  gradientBorder: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    padding: 2,
    backgroundColor: 'transparent',
    ...SHADOW.card,
  },
  gradientBorderFocused: {
    padding: 3,
  },
  inputInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.lg - 2, 0.2),
    paddingHorizontal: moderateScale(14, 0.2),
    paddingVertical: moderateScale(10, 0.2),
    minHeight: moderateScale(46, 0.2),
  },
  input: {
    flex: 1,
    fontSize: scaleFont(FONTS.input),
    color: COLORS.textPrimary,
    padding: 0,
  },
  btnWrapper: {
    marginTop: moderateScale(16, 0.2),
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    ...SHADOW.button,
  },
  btn: {
    borderRadius: moderateScale(RADIUS.lg, 0.2),
    paddingVertical: moderateScale(15, 0.2),
    paddingHorizontal: moderateScale(20, 0.2),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: moderateScale(50, 0.2),
    overflow: 'hidden',
  },
  btnText: {
    fontSize: scaleFont(FONTS.button) + 1,
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    letterSpacing: moderateScale(0.3, 0.1),
    includeFontPadding: false,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: moderateScale(16, 0.2),
    marginBottom: moderateScale(20, 0.2),
  },
  footerText: {
    fontSize: scaleFont(FONTS.link),
    color: COLORS.textSecondary,
  },
  footerLink: {
    fontSize: scaleFont(FONTS.link),
    fontWeight: FONTS.weightSemiBold,
    paddingLeft: moderateScale(2, 0.2),
    paddingRight: moderateScale(8, 0.2),
  },
  phonePrefix: {
    fontSize: scaleFont(FONTS.input),
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightSemiBold,
    marginRight: moderateScale(8, 0.2),
  },
  phoneDivider: {
    width: moderateScale(1, 0.2),
    height: moderateScale(18, 0.2),
    backgroundColor: COLORS.border,
    marginRight: moderateScale(10, 0.2),
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: moderateScale(8, 0.2),
  },
  otpActionLink: {
    fontSize: scaleFont(FONTS.link) - 1,
    fontWeight: FONTS.weightSemiBold,
  },
  otpActionDisabled: {
    fontSize: scaleFont(FONTS.link) - 1,
    fontWeight: FONTS.weightMedium,
    color: COLORS.textMuted,
  },
  toggleMethodBtn: {
    alignSelf: 'center',
    marginTop: moderateScale(12, 0.2),
  },
  toggleMethodText: {
    fontSize: scaleFont(FONTS.link) - 1,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textMuted,
  },
});

export default styles;
