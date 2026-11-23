import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType, Link } from 'react-router-dom';
import {
  requestPasswordResetClient,
  verifyPasswordResetTokenClient,
  confirmPasswordResetClient,
  captureInitialResetLinkFromSearch,
  clearStoredPendingResetCode,
  getLastRequestedResetEmailFromSession,
  saveLastRequestedResetEmailInSession,
  FIREBASE_RESET_VERIFY_TIMEOUT_MS,
} from '../services/firebaseService';
import {
  OFFICIAL_EVERYKR_LOGIN_URL,
  OFFICIAL_PASSWORD_RESET_ACTION_URL,
  isNonCanonicalProductionHostname,
} from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { EveryKrAnimatedLogo } from './common/EveryKrAnimatedLogo';
import { LanguageCode } from '../types';
import {
  KeyRound,
  Lock,
  Mail,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  Circle,
  RefreshCw,
} from 'lucide-react';

interface ResetPasswordCopy {
  portalLabel: string;
  backToSignIn: string;
  resetHeading: string;
  requestSubtitle: string;
  validSubtitle: string;
  validSubtitleWithEmail: (maskedEmail: string) => string;
  verifyingMessage: string;
  verifiedAccountLabel: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  showPasswordAria: string;
  hidePasswordAria: string;
  ruleMinLength: string;
  ruleComplexity: string;
  rulePasswordsMatch: string;
  rulePasswordsMismatch: string;
  strengthLabel: string;
  strengthWeak: string;
  strengthGood: string;
  strengthStrong: string;
  resetPasswordButton: string;
  resettingPasswordButton: string;
  successHeading: string;
  successDescription: string;
  returnToSignInButton: string;
  expiredLinkError: string;
  invalidLinkOnlyError: string;
  alreadyUsedLinkOnlyError: string;
  invalidOrUsedLinkError: string;
  disabledAccountError: string;
  networkVerifyError: string;
  timeoutVerifyError: string;
  retryVerificationButton: string;
  requestNewLinkInsteadLabel: string;
  minLengthValidationError: string;
  mismatchValidationError: string;
  missingCodeValidationError: string;
  registeredEmailLabel: string;
  registeredEmailPlaceholder: string;
  sendResetEmailButton: string;
  sendingResetEmailButton: string;
  resendInSeconds: (sec: number) => string;
  checkEmailTitle: string;
  checkEmailMessage: string;
  invalidEmailError: string;
  securityNote: string;
}

const RESET_PASSWORD_COPY: Record<LanguageCode, ResetPasswordCopy> = {
  en: {
    portalLabel: 'Account Security',
    backToSignIn: 'Sign In',
    resetHeading: 'Reset Your Password',
    requestSubtitle:
      'Enter your registered EveryKR email address to receive a secure, one-time password reset link.',
    validSubtitle: 'Enter and confirm a strong new password for your EveryKR account.',
    validSubtitleWithEmail: (email) =>
      `Enter and confirm a strong new password for your verified EveryKR account (${email}).`,
    verifyingMessage: 'Verifying your secure password reset link...',
    verifiedAccountLabel: 'Verified Account',
    newPasswordLabel: 'New Password',
    newPasswordPlaceholder: 'Enter at least 8 characters',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your new password',
    showPasswordAria: 'Show password',
    hidePasswordAria: 'Hide password',
    ruleMinLength: 'At least 8 characters',
    ruleComplexity: 'Includes letters and a number or symbol (recommended)',
    rulePasswordsMatch: 'Both passwords match',
    rulePasswordsMismatch: 'Passwords do not match yet',
    strengthLabel: 'Password strength',
    strengthWeak: 'Too short',
    strengthGood: 'Good',
    strengthStrong: 'Strong',
    resetPasswordButton: 'Reset Password',
    resettingPasswordButton: 'Resetting Password...',
    successHeading: 'Password Reset Successful',
    successDescription:
      'Your EveryKR account password has been securely updated. This one-time reset link is now deactivated, and you can sign in using your new password.',
    returnToSignInButton: 'Return to Sign In',
    expiredLinkError:
      'This password reset link has expired (reset links are valid for 1 hour). Request a new reset email below.',
    invalidLinkOnlyError:
      'This password reset link is invalid or incomplete. Please open the Reset Password button directly from your latest EveryKR email, or request a new reset email below.',
    alreadyUsedLinkOnlyError:
      'This password reset link has already been used. For your security, each reset link works only once — request a new reset email below if you need to change your password again.',
    invalidOrUsedLinkError:
      'This password reset link is invalid or has already been used. Each reset link works only once — request a new reset email below.',
    disabledAccountError:
      'This EveryKR account has been disabled. Please contact support@everykr.com for assistance.',
    networkVerifyError:
      'Network error while verifying your password reset link. Your reset link has not been invalidated — check your internet connection and click Retry Verification.',
    timeoutVerifyError:
      'Verification took longer than 15 seconds due to a slow connection. Your reset link is still valid — click Retry Verification below.',
    retryVerificationButton: 'Retry Verification',
    requestNewLinkInsteadLabel: 'Or request a new password reset email instead',
    minLengthValidationError: 'Your new password must be at least 8 characters long.',
    mismatchValidationError: 'New Password and Confirm Password do not match.',
    missingCodeValidationError:
      'A valid password reset code is required. Please open the link from your EveryKR password reset email.',
    registeredEmailLabel: 'Registered Email Address',
    registeredEmailPlaceholder: 'name@university.ac.kr',
    sendResetEmailButton: 'Send Password Reset Email',
    sendingResetEmailButton: 'Sending Reset Email...',
    resendInSeconds: (sec) => `Resend Reset Email in ${sec}s`,
    checkEmailTitle: 'Check Your Email',
    checkEmailMessage:
      'If an account is registered with this email, password reset instructions have been sent. Please check your inbox and spam folder.',
    invalidEmailError: 'Please enter a valid email address.',
    securityNote:
      'One-time reset links expire after 1 hour and never expose your password.',
  },
  ko: {
    portalLabel: '계정 보안 센터',
    backToSignIn: '로그인',
    resetHeading: '비밀번호 재설정',
    requestSubtitle:
      '가입하신 EveryKR 이메일 주소를 입력하시면 1회용 보안 비밀번호 재설정 링크를 보내드립니다.',
    validSubtitle: 'EveryKR 계정에서 사용할 안전한 새 비밀번호를 입력하고 확인해 주세요.',
    validSubtitleWithEmail: (email) =>
      `확인된 EveryKR 계정(${email})의 새 비밀번호를 입력하고 확인해 주세요.`,
    verifyingMessage: '비밀번호 재설정 링크의 유효성을 확인하는 중입니다...',
    verifiedAccountLabel: '확인된 계정',
    newPasswordLabel: '새 비밀번호',
    newPasswordPlaceholder: '최소 8자 이상 입력',
    confirmPasswordLabel: '새 비밀번호 확인',
    confirmPasswordPlaceholder: '새 비밀번호를 다시 입력',
    showPasswordAria: '비밀번호 표시',
    hidePasswordAria: '비밀번호 숨기기',
    ruleMinLength: '최소 8자 이상',
    ruleComplexity: '영문과 숫자 또는 특수문자 포함 권장',
    rulePasswordsMatch: '비밀번호가 일치합니다',
    rulePasswordsMismatch: '비밀번호가 일치하지 않습니다',
    strengthLabel: '비밀번호 보안 강도',
    strengthWeak: '너무 짧음',
    strengthGood: '양호',
    strengthStrong: '강력함',
    resetPasswordButton: '비밀번호 재설정',
    resettingPasswordButton: '비밀번호 변경 중...',
    successHeading: '비밀번호 재설정 완료',
    successDescription:
      'EveryKR 계정 비밀번호가 안전하게 변경되었습니다. 이제 새 비밀번호로 로그인하실 수 있습니다.',
    returnToSignInButton: '로그인 페이지로 이동',
    expiredLinkError:
      '비밀번호 재설정 링크가 만료되었습니다(유효시간 1시간). 아래에서 새 재설정 이메일을 요청해 주세요.',
    invalidLinkOnlyError:
      '유효하지 않거나 손상된 비밀번호 재설정 링크입니다. 최신 이메일의 버튼을 다시 클릭하거나 아래에서 새 재설정 이메일을 요청해 주세요.',
    alreadyUsedLinkOnlyError:
      '이미 사용된 비밀번호 재설정 링크입니다. 각 재설정 링크는 1회만 사용할 수 있으므로 아래에서 새 재설정 이메일을 요청해 주세요.',
    invalidOrUsedLinkError:
      '유효하지 않거나 이미 사용된 비밀번호 재설정 링크입니다. 아래에서 새 재설정 이메일을 요청해 주세요.',
    disabledAccountError:
      '비활성화된 계정입니다. 도움이 필요하시면 support@everykr.com으로 문의해 주세요.',
    networkVerifyError:
      '재설정 링크 확인 중 네트워크 오류가 발생했습니다. 링크는 유지되어 있으니 인터넷 연결을 확인한 후 다시 시도해 주세요.',
    timeoutVerifyError:
      '네트워크 지연으로 확인 시간이 15초를 초과했습니다. 재설정 링크는 계속 유효하니 아래 버튼을 눌러 다시 확인해 주세요.',
    retryVerificationButton: '다시 확인하기',
    requestNewLinkInsteadLabel: '또는 새 비밀번호 재설정 이메일 요청',
    minLengthValidationError: '새 비밀번호는 최소 8자 이상이어야 합니다.',
    mismatchValidationError: '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.',
    missingCodeValidationError:
      '유효한 비밀번호 재설정 코드가 필요합니다. 이메일의 비밀번호 재설정 버튼을 통해 접속해 주세요.',
    registeredEmailLabel: '가입한 이메일 주소',
    registeredEmailPlaceholder: 'name@university.ac.kr',
    sendResetEmailButton: '비밀번호 재설정 이메일 보내기',
    sendingResetEmailButton: '재설정 이메일 전송 중...',
    resendInSeconds: (sec) => `${sec}초 후 재전송 가능`,
    checkEmailTitle: '이메일을 확인해 주세요',
    checkEmailMessage:
      '해당 이메일로 등록된 계정이 있는 경우 비밀번호 재설정 안내 메일이 발송되었습니다. 받은편지함과 스팸함을 확인해 주세요.',
    invalidEmailError: '올바른 이메일 주소를 입력해 주세요.',
    securityNote: '일회용 재설정 링크는 1시간 후 만료되며 사용 즉시 비활성화됩니다.',
  },
  bn: {
    portalLabel: 'অ্যাকাউন্ট নিরাপত্তা',
    backToSignIn: 'সাইন ইন',
    resetHeading: 'পাসওয়ার্ড রিসেট করুন',
    requestSubtitle:
      'নিরাপদ ওয়ান-টাইম পাসওয়ার্ড রিসেট লিংক পেতে আপনার নিবন্ধিত EveryKR ইমেইল ঠিকানা লিখুন।',
    validSubtitle: 'আপনার EveryKR অ্যাকাউন্টের জন্য একটি শক্তিশালী নতুন পাসওয়ার্ড লিখুন ও নিশ্চিত করুন।',
    validSubtitleWithEmail: (email) =>
      `আপনার যাচাইকৃত EveryKR অ্যাকাউন্টের (${email}) জন্য নতুন পাসওয়ার্ড লিখুন ও নিশ্চিত করুন।`,
    verifyingMessage: 'আপনার পাসওয়ার্ড রিসেট লিংক যাচাই করা হচ্ছে...',
    verifiedAccountLabel: 'যাচাইকৃত অ্যাকাউন্ট',
    newPasswordLabel: 'নতুন পাসওয়ার্ড',
    newPasswordPlaceholder: 'কমপক্ষে ৮টি অক্ষর দিন',
    confirmPasswordLabel: 'পাসওয়ার্ড নিশ্চিত করুন',
    confirmPasswordPlaceholder: 'নতুন পাসওয়ার্ডটি আবার লিখুন',
    showPasswordAria: 'পাসওয়ার্ড দেখুন',
    hidePasswordAria: 'পাসওয়ার্ড লুকান',
    ruleMinLength: 'কমপক্ষে ৮টি অক্ষর',
    ruleComplexity: 'অক্ষর এবং সংখ্যা বা চিহ্ন থাকা উত্তম',
    rulePasswordsMatch: 'দুটি পাসওয়ার্ড মিলেছে',
    rulePasswordsMismatch: 'পাসওয়ার্ড দুটি এখনো মেলেনি',
    strengthLabel: 'পাসওয়ার্ডের শক্তি',
    strengthWeak: 'ছোট',
    strengthGood: 'ভালো',
    strengthStrong: 'শক্তিশালী',
    resetPasswordButton: 'পাসওয়ার্ড রিসেট করুন',
    resettingPasswordButton: 'পাসওয়ার্ড আপডেট হচ্ছে...',
    successHeading: 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে',
    successDescription:
      'আপনার EveryKR অ্যাকাউন্টের পাসওয়ার্ড নিরাপদে আপডেট করা হয়েছে। এখন আপনি নতুন পাসওয়ার্ড দিয়ে সাইন ইন করতে পারবেন।',
    returnToSignInButton: 'সাইন ইন পেজে ফিরে যান',
    expiredLinkError:
      'এই পাসওয়ার্ড রিসেট লিংকের মেয়াদ শেষ হয়ে গেছে (লিংক ১ ঘণ্টা কার্যকর থাকে)। নিচে নতুন রিসেট ইমেইলের অনুরোধ করুন।',
    invalidLinkOnlyError:
      'এই পাসওয়ার্ড রিসেট লিংকটি অবৈধ বা অসম্পূর্ণ। অনুগ্রহ করে সর্বশেষ ইমেইলের বাটনে ক্লিক করুন অথবা নিচে নতুন ইমেইলের অনুরোধ করুন।',
    alreadyUsedLinkOnlyError:
      'এই পাসওয়ার্ড রিসেট লিংকটি ইতিমধ্যে ব্যবহৃত হয়েছে। প্রতিটি লিংক কেবল একবার কাজ করে — নিচে নতুন রিসেট ইমেইলের অনুরোধ করুন।',
    invalidOrUsedLinkError:
      'এই পাসওয়ার্ড রিসেট লিংকটি অবৈধ বা ইতিমধ্যে ব্যবহৃত হয়েছে। নিচে নতুন রিসেট ইমেইলের অনুরোধ করুন।',
    disabledAccountError:
      'এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। সহায়তার জন্য support@everykr.com-এ যোগাযোগ করুন।',
    networkVerifyError:
      'রিসেট লিংক যাচাই করার সময় নেটওয়ার্ক ত্রুটি হয়েছে। লিংকটি এখনো বৈধ আছে — সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
    timeoutVerifyError:
      'ধীরগতির সংযোগের কারণে যাচাইয়ে ১৫ সেকেন্ডের বেশি সময় লেগেছে। আপনার লিংকটি এখনো বৈধ আছে — নিচে পুনরায় চেষ্টা করুন।',
    retryVerificationButton: 'আবার যাচাই করুন',
    requestNewLinkInsteadLabel: 'অথবা নতুন পাসওয়ার্ড রিসেট ইমেইলের অনুরোধ করুন',
    minLengthValidationError: 'নতুন পাসওয়ার্ড কমপক্ষে ৮টি অক্ষরের হতে হবে।',
    mismatchValidationError: 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মেলেনি।',
    missingCodeValidationError:
      'একটি বৈধ রিসেট কোড প্রয়োজন। অনুগ্রহ করে ইমেইলের Reset Password বোতাম থেকে খুলুন।',
    registeredEmailLabel: 'নিবন্ধিত ইমেইল ঠিকানা',
    registeredEmailPlaceholder: 'name@university.ac.kr',
    sendResetEmailButton: 'পাসওয়ার্ড রিসেট ইমেইল পাঠান',
    sendingResetEmailButton: 'রিসেট ইমেইল পাঠানো হচ্ছে...',
    resendInSeconds: (sec) => `${sec} সেকেন্ড পরে আবার পাঠান`,
    checkEmailTitle: 'আপনার ইমেইল চেক করুন',
    checkEmailMessage:
      'এই ইমেইলে অ্যাকাউন্ট নিবন্ধিত থাকলে পাসওয়ার্ড রিসেটের নির্দেশনা পাঠানো হয়েছে। ইনবক্স এবং স্প্যাম ফোল্ডার দেখুন।',
    invalidEmailError: 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।',
    securityNote: 'ওয়ান-টাইম রিসেট লিংক ১ ঘণ্টা পর মেয়াদোত্তীর্ণ হয়।',
  },
  ne: {
    portalLabel: 'खाता सुरक्षा',
    backToSignIn: 'साइन इन',
    resetHeading: 'पासवर्ड रिसेट गर्नुहोस्',
    requestSubtitle:
      'सुरक्षित पासवर्ड रिसेट लिङ्क प्राप्त गर्न आफ्नो दर्ता गरिएको EveryKR इमेल ठेगाना प्रविष्ट गर्नुहोस्।',
    validSubtitle: 'आफ्नो EveryKR खाताका लागि नयाँ पासवर्ड प्रविष्ट गरी पुष्टि गर्नुहोस्।',
    validSubtitleWithEmail: (email) =>
      `आफ्नो प्रमाणित EveryKR खाता (${email}) का लागि नयाँ पासवर्ड प्रविष्ट गरी पुष्टि गर्नुहोस्।`,
    verifyingMessage: 'तपाईंको पासवर्ड रिसेट लिङ्क प्रमाणित हुँदैछ...',
    verifiedAccountLabel: 'प्रमाणित खाता',
    newPasswordLabel: 'नयाँ पासवर्ड',
    newPasswordPlaceholder: 'कम्तीमा ८ अक्षरहरू',
    confirmPasswordLabel: 'पासवर्ड पुष्टि गर्नुहोस्',
    confirmPasswordPlaceholder: 'नयाँ पासवर्ड पुनः प्रविष्ट गर्नुहोस्',
    showPasswordAria: 'पासवर्ड देखाउनुहोस्',
    hidePasswordAria: 'पासवर्ड लुकाउनुहोस्',
    ruleMinLength: 'कम्तीमा ८ अक्षरहरू',
    ruleComplexity: 'अक्षर र अंक वा चिन्ह समावेश (सिफारिस)',
    rulePasswordsMatch: 'दुवै पासवर्ड मिलेका छन्',
    rulePasswordsMismatch: 'पासवर्डहरू मिलेका छैनन्',
    strengthLabel: 'पासवर्ड मजबुती',
    strengthWeak: 'छोटो',
    strengthGood: 'राम्रो',
    strengthStrong: 'बलियो',
    resetPasswordButton: 'पासवर्ड रिसेट गर्नुहोस्',
    resettingPasswordButton: 'पासवर्ड अपडेट हुँदैछ...',
    successHeading: 'पासवर्ड सफलतापूर्वक रिसेट भयो',
    successDescription:
      'तपाईंको EveryKR खाताको पासवर्ड सुरक्षित रूपमा अपडेट गरिएको छ। अब तपाईं नयाँ पासवर्ड प्रयोग गरी साइन इन गर्न सक्नुहुन्छ।',
    returnToSignInButton: 'साइन इन पेजमा फर्कनुहोस्',
    expiredLinkError:
      'यो पासवर्ड रिसेट लिङ्कको म्याद सकिएको छ (१ घण्टा मान्य)। तल नयाँ रिसेट इमेल अनुरोध गर्नुहोस्।',
    invalidLinkOnlyError:
      'यो पासवर्ड रिसेट लिङ्क अमान्य वा अपूर्ण छ। कृपया आफ्नो इमेलको बटनबाट पुनः खोल्नुहोस् वा तल नयाँ रिसेट इमेल अनुरोध गर्नुहोस्।',
    alreadyUsedLinkOnlyError:
      'यो पासवर्ड रिसेट लिङ्क पहिले नै प्रयोग भइसकेको छ। प्रत्येक लिङ्क एक पटक मात्र चल्छ — तल नयाँ रिसेट इमेल अनुरोध गर्नुहोस्।',
    invalidOrUsedLinkError:
      'यो पासवर्ड रिसेट लिङ्क अमान्य छ वा पहिले नै प्रयोग भइसकेको छ। तल नयाँ रिसेट इमेल अनुरोध गर्नुहोस्।',
    disabledAccountError:
      'यो खाता निष्क्रिय गरिएको छ। सहायताका लागि support@everykr.com मा सम्पर्क गर्नुहोस्।',
    networkVerifyError:
      'रिसेट लिङ्क प्रमाणित गर्दा नेटवर्क समस्या भयो। तपाईंको लिङ्क अझै मान्य छ — जडान जाँच गरी पुनः प्रयास गर्नुहोस्।',
    timeoutVerifyError:
      'ढिलो जडानका कारण प्रमाणीकरणमा १५ सेकेन्डभन्दा बढी समय लाग्यो। तपाईंको लिङ्क अझै मान्य छ — तल पुनः प्रयास गर्नुहोस्।',
    retryVerificationButton: 'पुनः प्रमाणित गर्नुहोस्',
    requestNewLinkInsteadLabel: 'वा नयाँ पासवर्ड रिसेट इमेल अनुरोध गर्नुहोस्',
    minLengthValidationError: 'तपाईंको नयाँ पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ।',
    mismatchValidationError: 'नयाँ पासवर्ड र पुष्टि पासवर्ड मेल खाँदैनन्।',
    missingCodeValidationError:
      'मान्य पासवर्ड रिसेट कोड आवश्यक छ। कृपया आफ्नो इमेलमा आएको लिङ्क खोल्नुहोस्।',
    registeredEmailLabel: 'दर्ता गरिएको इमेल ठेगाना',
    registeredEmailPlaceholder: 'name@university.ac.kr',
    sendResetEmailButton: 'पासवर्ड रिसेट इमेल पठाउनुहोस्',
    sendingResetEmailButton: 'रिसेट इमेल पठाउँदै...',
    resendInSeconds: (sec) => `${sec} सेकेन्ड पछि पुनः पठाउनुहोस्`,
    checkEmailTitle: 'आफ्नो इमेल जाँच गर्नुहोस्',
    checkEmailMessage:
      'यदि यस इमेलमा खाता दर्ता छ भने पासवर्ड रिसेट निर्देशन पठाइएको छ। कृपया इनबक्स र स्प्याम फोल्डर जाँच गर्नुहोस्।',
    invalidEmailError: 'कृपया मान्य इमेल ठेगाना प्रविष्ट गर्नुहोस्।',
    securityNote: 'एक-पटक प्रयोग हुने रिसेट लिङ्क १ घण्टामा समाप्त हुन्छ।',
  },
  hi: {
    portalLabel: 'खाता सुरक्षा',
    backToSignIn: 'साइन इन',
    resetHeading: 'अपना पासवर्ड रीसेट करें',
    requestSubtitle:
      'सुरक्षित पासवर्ड रीसेट लिंक प्राप्त करने के लिए अपना पंजीकृत EveryKR ईमेल पता दर्ज करें।',
    validSubtitle: 'अपने EveryKR खाते के लिए एक नया मजबूत पासवर्ड दर्ज करें और पुष्टि करें।',
    validSubtitleWithEmail: (email) =>
      `अपने सत्यापित EveryKR खाते (${email}) के लिए नया पासवर्ड दर्ज करें और पुष्टि करें।`,
    verifyingMessage: 'आपके पासवर्ड रीसेट लिंक की जांच की जा रही है...',
    verifiedAccountLabel: 'सत्यापित खाता',
    newPasswordLabel: 'नया पासवर्ड',
    newPasswordPlaceholder: 'कम से कम 8 अक्षर दर्ज करें',
    confirmPasswordLabel: 'पासवर्ड की पुष्टि करें',
    confirmPasswordPlaceholder: 'नया पासवर्ड दोबारा दर्ज करें',
    showPasswordAria: 'पासवर्ड दिखाएं',
    hidePasswordAria: 'पासवर्ड छिपाएं',
    ruleMinLength: 'कम से कम 8 अक्षर',
    ruleComplexity: 'अक्षर और संख्या या चिह्न शामिल (अनुशंसित)',
    rulePasswordsMatch: 'दोनों पासवर्ड मेल खाते हैं',
    rulePasswordsMismatch: 'पासवर्ड मेल नहीं खाते',
    strengthLabel: 'पासवर्ड मजबूती',
    strengthWeak: 'छोटा',
    strengthGood: 'अच्छा',
    strengthStrong: 'मजबूत',
    resetPasswordButton: 'पासवर्ड रीसेट करें',
    resettingPasswordButton: 'पासवर्ड रीसेट हो रहा है...',
    successHeading: 'पासवर्ड सफलतापूर्वक रीसेट हो गया',
    successDescription:
      'आपका EveryKR पासवर्ड सुरक्षित रूप से अपडेट कर दिया गया है। अब आप अपने नए पासवर्ड से साइन इन कर सकते हैं।',
    returnToSignInButton: 'साइन इन पेज पर लौटें',
    expiredLinkError:
      'यह पासवर्ड रीसेट लिंक समाप्त हो गया है (लिंक 1 घंटे के लिए मान्य होता है)। नीचे नया रीसेट ईमेल अनुरोध करें।',
    invalidLinkOnlyError:
      'यह पासवर्ड रीसेट लिंक अमान्य या अधूरा है। कृपया अपने ईमेल के बटन से लिंक खोलें या नीचे नया रीसेट ईमेल अनुरोध करें।',
    alreadyUsedLinkOnlyError:
      'यह पासवर्ड रीसेट लिंक पहले ही उपयोग किया जा चुका है। प्रत्येक लिंक केवल एक बार काम करता है — नीचे नया रीसेट ईमेल अनुरोध करें।',
    invalidOrUsedLinkError:
      'यह पासवर्ड रीसेट लिंक अमान्य है या पहले ही उपयोग किया जा चुका है। नीचे नया रीसेट ईमेल अनुरोध करें।',
    disabledAccountError:
      'यह खाता निष्क्रिय कर दिया गया है। सहायता के लिए support@everykr.com पर संपर्क करें।',
    networkVerifyError:
      'रीसेट लिंक सत्यापित करते समय नेटवर्क त्रुटि हुई। आपका लिंक अभी भी मान्य है — कनेक्शन जांचें और पुनः प्रयास करें।',
    timeoutVerifyError:
      'धीमे कनेक्शन के कारण सत्यापन में 15 सेकंड से अधिक समय लगा। आपका रीसेट लिंक अभी भी मान्य है — नीचे पुनः प्रयास करें।',
    retryVerificationButton: 'पुनः सत्यापित करें',
    requestNewLinkInsteadLabel: 'या नया पासवर्ड रीसेट ईमेल अनुरोध करें',
    minLengthValidationError: 'आपका नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।',
    mismatchValidationError: 'नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते।',
    missingCodeValidationError:
      'मान्य पासवर्ड रीसेट कोड आवश्यक है। कृपया अपने ईमेल में दिए गए रीसेट लिंक को खोलें।',
    registeredEmailLabel: 'पंजीकृत ईमेल पता',
    registeredEmailPlaceholder: 'name@university.ac.kr',
    sendResetEmailButton: 'पासवर्ड रीसेट ईमेल भेजें',
    sendingResetEmailButton: 'रीसेट ईमेल भेजा जा रहा है...',
    resendInSeconds: (sec) => `${sec} सेकंड में पुनः भेजें`,
    checkEmailTitle: 'अपना ईमेल जांचें',
    checkEmailMessage:
      'यदि इस ईमेल से कोई खाता पंजीकृत है, तो पासवर्ड रीसेट निर्देश भेज दिए गए हैं। कृपया अपना इनबॉक्स और स्पैम फ़ोल्डर जांचें।',
    invalidEmailError: 'कृपया एक मान्य ईमेल पता दर्ज करें।',
    securityNote: 'वन-टाइम रीसेट लिंक 1 घंटे के बाद समाप्त हो जाता है।',
  },
  ur: {
    portalLabel: 'اکاؤنٹ سیکیورٹی',
    backToSignIn: 'سائن ان',
    resetHeading: 'اپنا پاس ورڈ ری سیٹ کریں',
    requestSubtitle:
      'محفوظ ون ٹائم پاس ورڈ ری سیٹ لنک حاصل کرنے کے لیے اپنا رجسٹرڈ EveryKR ای میل درج کریں۔',
    validSubtitle: 'اپنے EveryKR اکاؤنٹ کے لیے نیا مضبوط پاس ورڈ درج کریں اور تصدیق کریں۔',
    validSubtitleWithEmail: (email) =>
      `اپنے تصدیق شدہ EveryKR اکاؤنٹ (${email}) کے لیے نیا پاس ورڈ درج کریں اور تصدیق کریں۔`,
    verifyingMessage: 'آپ کے پاس ورڈ ری سیٹ لنک کی تصدیق کی جا رہی ہے...',
    verifiedAccountLabel: 'تصدیق شدہ اکاؤنٹ',
    newPasswordLabel: 'نیا پاس ورڈ',
    newPasswordPlaceholder: 'کم از کم 8 حروف درج کریں',
    confirmPasswordLabel: 'پاس ورڈ کی تصدیق کریں',
    confirmPasswordPlaceholder: 'نیا پاس ورڈ دوبارہ درج کریں',
    showPasswordAria: 'پاس ورڈ دکھائیں',
    hidePasswordAria: 'پاس ورڈ چھپائیں',
    ruleMinLength: 'کم از کم 8 حروف',
    ruleComplexity: 'حروف اور نمبر یا علامت شامل کریں (تجویز کردہ)',
    rulePasswordsMatch: 'دونوں پاس ورڈ یکساں ہیں',
    rulePasswordsMismatch: 'پاس ورڈ یکساں نہیں ہیں',
    strengthLabel: 'پاس ورڈ کی مضبوطی',
    strengthWeak: 'مختصر',
    strengthGood: 'مناسب',
    strengthStrong: 'مضبوط',
    resetPasswordButton: 'پاس ورڈ ری سیٹ کریں',
    resettingPasswordButton: 'پاس ورڈ اپ ڈیٹ ہو رہا ہے...',
    successHeading: 'پاس ورڈ کامیابی سے ری سیٹ ہو گیا',
    successDescription:
      'آپ کے EveryKR اکاؤنٹ کا پاس ورڈ محفوظ طریقے سے اپ ڈیٹ کر دیا گیا ہے۔ اب آپ اپنے نئے پاس ورڈ کے ساتھ سائن ان کر سکتے ہیں۔',
    returnToSignInButton: 'سائن ان صفحے پر واپس جائیں',
    expiredLinkError:
      'اس پاس ورڈ ری سیٹ لنک کی میعاد ختم ہو چکی ہے (لنک 1 گھنٹے کے لیے کارآمد ہوتا ہے)۔ نیچے نیا ای میل طلب کریں۔',
    invalidLinkOnlyError:
      'یہ پاس ورڈ ری سیٹ لنک غلط یا نامکمل ہے۔ براہ کرم اپنی ای میل کے بٹن سے دوبارہ کھولیں یا نیچے نیا ای میل طلب کریں۔',
    alreadyUsedLinkOnlyError:
      'یہ پاس ورڈ ری سیٹ لنک پہلے ہی استعمال ہو چکا ہے۔ ہر لنک صرف ایک بار کام کرتا ہے — نیچے نیا ری سیٹ ای میل طلب کریں۔',
    invalidOrUsedLinkError:
      'یہ پاس ورڈ ری سیٹ لنک غلط ہے یا پہلے ہی استعمال ہو چکا ہے۔ نیچے نیا ری سیٹ ای میل طلب کریں۔',
    disabledAccountError:
      'یہ اکاؤنٹ غیر فعال کر دیا گیا ہے۔ مدد کے لیے support@everykr.com پر رابطہ کریں۔',
    networkVerifyError:
      'ری سیٹ لنک کی تصدیق کے دوران نیٹ ورک کی خرابی پیش آئی۔ آپ کا لنک اب بھی درست ہے — انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔',
    timeoutVerifyError:
      'سست کنکشن کی وجہ سے تصدیق میں 15 سیکنڈ سے زیادہ وقت لگا۔ آپ کا ری سیٹ لنک اب بھی کارآمد ہے — نیچے دوبارہ کوشش کریں۔',
    retryVerificationButton: 'دوبارہ تصدیق کریں',
    requestNewLinkInsteadLabel: 'یا نیا پاس ورڈ ری سیٹ ای میل طلب کریں',
    minLengthValidationError: 'نیا پاس ورڈ کم از کم 8 حروف پر مشتمل ہونا چاہیے۔',
    mismatchValidationError: 'نیا پاس ورڈ اور تصدیقی پاس ورڈ یکساں نہیں ہیں۔',
    missingCodeValidationError:
      'درست ری سیٹ کوڈ درکار ہے۔ براہ کرم اپنی ای میل میں موجود Reset Password بٹن پر کلک کریں۔',
    registeredEmailLabel: 'رجسٹرڈ ای میل ایڈریس',
    registeredEmailPlaceholder: 'name@university.ac.kr',
    sendResetEmailButton: 'پاس ورڈ ری سیٹ ای میل بھیجیں',
    sendingResetEmailButton: 'ای میل بھیجی جا رہی ہے...',
    resendInSeconds: (sec) => `${sec} سیکنڈ بعد دوبارہ بھیجیں`,
    checkEmailTitle: 'اپنی ای میل چیک کریں',
    checkEmailMessage:
      'اگر اس ای میل پر اکاؤنٹ موجود ہے تو پاس ورڈ ری سیٹ ہدایات بھیج دی گئی ہیں۔ اپنا ان باکس اور اسپام فولڈر چیک کریں۔',
    invalidEmailError: 'براہ کرم درست ای میل ایڈریس درج کریں۔',
    securityNote: 'ون ٹائم ری سیٹ لنک 1 گھنٹے بعد ختم ہو جاتا ہے۔',
  },
  ar: {
    portalLabel: 'أمان الحساب',
    backToSignIn: 'تسجيل الدخول',
    resetHeading: 'إعادة تعيين كلمة المرور',
    requestSubtitle:
      'أدخل بريدك الإلكتروني المسجّل في EveryKR للحصول على رابط آمن لمرة واحدة لإعادة تعيين كلمة المرور.',
    validSubtitle: 'أدخل كلمة مرور جديدة قوية لحسابك في EveryKR وقم بتأكيدها.',
    validSubtitleWithEmail: (email) =>
      `أدخل كلمة مرور جديدة قوية لحسابك الموثّق في EveryKR (${email}) وقم بتأكيدها.`,
    verifyingMessage: 'جارٍ التحقق من رابط إعادة تعيين كلمة المرور...',
    verifiedAccountLabel: 'الحساب الموثّق',
    newPasswordLabel: 'كلمة المرور الجديدة',
    newPasswordPlaceholder: '8 أحرف على الأقل',
    confirmPasswordLabel: 'تأكيد كلمة المرور',
    confirmPasswordPlaceholder: 'أعد إدخال كلمة المرور الجديدة',
    showPasswordAria: 'إظهار كلمة المرور',
    hidePasswordAria: 'إخفاء كلمة المرور',
    ruleMinLength: '8 أحرف على الأقل',
    ruleComplexity: 'تتضمن حروفاً ورقماً أو رمزاً (موصى به)',
    rulePasswordsMatch: 'كلمتا المرور متطابقتان',
    rulePasswordsMismatch: 'كلمتا المرور غير متطابقتين',
    strengthLabel: 'قوة كلمة المرور',
    strengthWeak: 'قصيرة جداً',
    strengthGood: 'جيدة',
    strengthStrong: 'قوية',
    resetPasswordButton: 'إعادة تعيين كلمة المرور',
    resettingPasswordButton: 'جارٍ تحديث كلمة المرور...',
    successHeading: 'تمت إعادة تعيين كلمة المرور بنجاح',
    successDescription:
      'تم تحديث كلمة مرور حسابك في EveryKR بأمان. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.',
    returnToSignInButton: 'العودة إلى تسجيل الدخول',
    expiredLinkError:
      'انتهت صلاحية رابط إعادة تعيين كلمة المرور (الرابط صالح لمدة ساعة واحدة). اطلب رسالة جديدة أدناه.',
    invalidLinkOnlyError:
      'رابط إعادة تعيين كلمة المرور غير صالح أو غير مكتمل. يرجى فتح الزر من رسالتك الأخيرة أو طلب رسالة جديدة أدناه.',
    alreadyUsedLinkOnlyError:
      'تم استخدام رابط إعادة تعيين كلمة المرور هذا مسبقاً. يعمل كل رابط مرة واحدة فقط — اطلب رسالة جديدة أدناه.',
    invalidOrUsedLinkError:
      'رابط إعادة تعيين كلمة المرور غير صالح أو تم استخدامه مسبقاً. اطلب رسالة جديدة أدناه.',
    disabledAccountError:
      'تم تعطيل هذا الحساب. يرجى التواصل مع support@everykr.com للمساعدة.',
    networkVerifyError:
      'حدث خطأ في الشبكة أثناء التحقق من الرابط. الرابط لا يزال صالحاً — تحقق من اتصالك وأعد المحاولة.',
    timeoutVerifyError:
      'استغرق التحقق أكثر من 15 ثانية بسبب بطء الاتصال. الرابط لا يزال صالحاً — اضغط على إعادة المحاولة أدناه.',
    retryVerificationButton: 'إعادة التحقق',
    requestNewLinkInsteadLabel: 'أو اطلب رسالة جديدة لإعادة تعيين كلمة المرور',
    minLengthValidationError: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.',
    mismatchValidationError: 'كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقتين.',
    missingCodeValidationError:
      'مطلوب رمز إعادة تعيين صالح. يرجى فتح الرابط من رسالة البريد الإلكتروني الخاصة بـ EveryKR.',
    registeredEmailLabel: 'البريد الإلكتروني المسجّل',
    registeredEmailPlaceholder: 'name@university.ac.kr',
    sendResetEmailButton: 'إرسال بريد إعادة تعيين كلمة المرور',
    sendingResetEmailButton: 'جارٍ إرسال الرسالة...',
    resendInSeconds: (sec) => `إعادة الإرسال خلال ${sec} ثانية`,
    checkEmailTitle: 'تحقق من بريدك الإلكتروني',
    checkEmailMessage:
      'إذا كان هناك حساب مسجّل بهذا البريد الإلكتروني، فقد تم إرسال تعليمات إعادة تعيين كلمة المرور. يرجى التحقق من البريد الوارد والرسائل غير المرغوب فيها.',
    invalidEmailError: 'يرجى إدخال عنوان بريد إلكتروني صالح.',
    securityNote: 'تنتهي صلاحية روابط إعادة التعيين لمرة واحدة بعد ساعة واحدة.',
  },
  zh: {
    portalLabel: '账户安全中心',
    backToSignIn: '返回登录',
    resetHeading: '重置您的密码',
    requestSubtitle: '输入您注册的 EveryKR 电子邮箱地址，获取一次性安全密码重置链接。',
    validSubtitle: '请为您的 EveryKR 账户输入并确认新密码。',
    validSubtitleWithEmail: (email) => `请为您已验证的 EveryKR 账户 (${email}) 输入并确认新密码。`,
    verifyingMessage: '正在验证您的密码重置链接...',
    verifiedAccountLabel: '已验证账户',
    newPasswordLabel: '新密码',
    newPasswordPlaceholder: '至少输入 8 个字符',
    confirmPasswordLabel: '确认新密码',
    confirmPasswordPlaceholder: '再次输入您的新密码',
    showPasswordAria: '显示密码',
    hidePasswordAria: '隐藏密码',
    ruleMinLength: '至少 8 个字符',
    ruleComplexity: '包含字母与数字或符号（推荐）',
    rulePasswordsMatch: '两次输入的密码一致',
    rulePasswordsMismatch: '两次输入的密码不一致',
    strengthLabel: '密码强度',
    strengthWeak: '过短',
    strengthGood: '良好',
    strengthStrong: '强',
    resetPasswordButton: '重置密码',
    resettingPasswordButton: '正在重置密码...',
    successHeading: '密码重置成功',
    successDescription:
      '您的 EveryKR 账户密码已安全更新。此一次性重置链接现已失效，您可以使用新密码登录。',
    returnToSignInButton: '返回登录页面',
    expiredLinkError: '此密码重置链接已过期（链接有效期为 1 小时）。请在下方重新申请重置邮件。',
    invalidLinkOnlyError:
      '此密码重置链接无效或不完整。请直接点击最新邮件中的按钮，或在下方重新申请重置邮件。',
    alreadyUsedLinkOnlyError:
      '此密码重置链接已被使用。每个重置链接仅可使用一次，请在下方重新申请重置邮件。',
    invalidOrUsedLinkError: '此密码重置链接无效或已被使用。请在下方重新申请新的重置邮件。',
    disabledAccountError: '此账户已被停用。如需帮助，请联系 support@everykr.com。',
    networkVerifyError: '验证密码重置链接时发生网络错误。您的链接仍然有效，请检查网络后点击重试。',
    timeoutVerifyError: '由于网络连接较慢，验证超过 15 秒。您的重置链接仍然有效，请点击下方按钮重试。',
    retryVerificationButton: '重新验证',
    requestNewLinkInsteadLabel: '或重新申请密码重置邮件',
    minLengthValidationError: '新密码长度至少为 8 个字符。',
    mismatchValidationError: '新密码与确认密码不一致。',
    missingCodeValidationError: '需要有效的密码重置代码。请点击重置邮件中的“Reset Password”按钮打开。',
    registeredEmailLabel: '注册邮箱地址',
    registeredEmailPlaceholder: 'name@university.ac.kr',
    sendResetEmailButton: '发送密码重置邮件',
    sendingResetEmailButton: '正在发送重置邮件...',
    resendInSeconds: (sec) => `${sec} 秒后可重新发送`,
    checkEmailTitle: '请查收您的邮箱',
    checkEmailMessage:
      '如果该邮箱已注册账户，我们已发送密码重置说明。请检查收件箱及垃圾邮件文件夹。',
    invalidEmailError: '请输入有效的电子邮箱地址。',
    securityNote: '一次性重置链接将在 1 小时后过期，使用后立即失效。',
  },
  ja: {
    portalLabel: 'アカウントセキュリティ',
    backToSignIn: 'ログイン',
    resetHeading: 'パスワードの再設定',
    requestSubtitle:
      'ご登録の EveryKR メールアドレスを入力すると、1回限りの安全なパスワード再設定リンクをお送りします。',
    validSubtitle: 'EveryKR アカウントの新しいパスワードを入力して確認してください。',
    validSubtitleWithEmail: (email) =>
      `確認済み EveryKR アカウント（${email}）の新しいパスワードを入力して確認してください。`,
    verifyingMessage: 'パスワード再設定リンクを確認しています...',
    verifiedAccountLabel: '確認済みアカウント',
    newPasswordLabel: '新しいパスワード',
    newPasswordPlaceholder: '8文字以上で入力してください',
    confirmPasswordLabel: 'パスワードの確認',
    confirmPasswordPlaceholder: '新しいパスワードを再入力してください',
    showPasswordAria: 'パスワードを表示',
    hidePasswordAria: 'パスワードを隠す',
    ruleMinLength: '8文字以上',
    ruleComplexity: '英字と数字または記号を含む（推奨）',
    rulePasswordsMatch: 'パスワードが一致しています',
    rulePasswordsMismatch: 'パスワードが一致していません',
    strengthLabel: 'パスワード強度',
    strengthWeak: '短すぎます',
    strengthGood: '良好',
    strengthStrong: '強力',
    resetPasswordButton: 'パスワードを再設定',
    resettingPasswordButton: '再設定中...',
    successHeading: 'パスワードの再設定が完了しました',
    successDescription:
      'EveryKR アカウントのパスワードが安全に更新されました。新しいパスワードでログインできます。',
    returnToSignInButton: 'ログインページへ戻る',
    expiredLinkError:
      'このパスワード再設定リンクは有効期限（1時間）が切れています。下から新しい再設定メールをリクエストしてください。',
    invalidLinkOnlyError:
      'このパスワード再設定リンクは無効か不完全です。最新メールのボタンから再度開くか、下から新しいメールをリクエストしてください。',
    alreadyUsedLinkOnlyError:
      'このパスワード再設定リンクはすでに使用されています。各リンクは1回のみ有効です。下から新しい再設定メールをリクエストしてください。',
    invalidOrUsedLinkError:
      'このパスワード再設定リンクは無効か、すでに使用されています。下から新しい再設定メールをリクエストしてください。',
    disabledAccountError:
      'このアカウントは無効化されています。support@everykr.com までお問い合わせください。',
    networkVerifyError:
      'リンクの確認中にネットワークエラーが発生しました。リンクはまだ有効ですので接続をご確認のうえ再試行してください。',
    timeoutVerifyError:
      '通信環境の影響で確認に15秒以上かかりました。再設定リンクはまだ有効ですので下のボタンから再試行してください。',
    retryVerificationButton: 'もう一度確認する',
    requestNewLinkInsteadLabel: 'または新しいパスワード再設定メールをリクエスト',
    minLengthValidationError: '新しいパスワードは8文字以上で入力してください。',
    mismatchValidationError: '新しいパスワードと確認用パスワードが一致しません。',
    missingCodeValidationError:
      '有効な再設定コードが必要です。メール内の「Reset Password」ボタンから開いてください。',
    registeredEmailLabel: '登録メールアドレス',
    registeredEmailPlaceholder: 'name@university.ac.kr',
    sendResetEmailButton: 'パスワード再設定メールを送信',
    sendingResetEmailButton: '送信中...',
    resendInSeconds: (sec) => `あと ${sec} 秒で再送信可能`,
    checkEmailTitle: 'メールをご確認ください',
    checkEmailMessage:
      '該当するアカウントが存在する場合、パスワード再設定のご案内を送信しました。受信トレイと迷惑メールフォルダをご確認ください。',
    invalidEmailError: '有効なメールアドレスを入力してください。',
    securityNote: 'ワンタイム再設定リンクは1時間で有効期限が切れ、使用後は無効になります。',
  },
};

export type VerificationUiState =
  | 'request_mode'
  | 'verifying'
  | 'valid'
  | 'expired_code'
  | 'already_used_code'
  | 'invalid_code'
  | 'disabled_account'
  | 'retryable_error'
  | 'completed';

const VERIFICATION_UI_SAFETY_TIMEOUT_MS = FIREBASE_RESET_VERIFY_TIMEOUT_MS; // 15 seconds

export const ResetPasswordView: React.FC = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const { language, showToast, setAuthModalMode, setIsAuthModalOpen } = useApp();

  const copy = RESET_PASSWORD_COPY[language] || RESET_PASSWORD_COPY.en;
  const isRtl = language === 'ar' || language === 'ur';

  // CRITICAL: Read and preserve the original `oobCode` from `window.location.search` BEFORE any URL scrubbing.
  // Never rely on React Router's `useSearchParams()` here because `window.history.replaceState` scrubs
  // `window.location.search` without updating React Router's cached `searchParams`, which previously caused
  // stale query params to re-inject a rejected `oobCode` in an infinite verification loop.
  const [initialCapture] = useState(() => {
    const liveBrowserSearch =
      typeof window !== 'undefined' ? window.location.search : location.search;
    return captureInitialResetLinkFromSearch(liveBrowserSearch, {
      isInternalPushWithoutSearch: navigationType === 'PUSH' && !liveBrowserSearch,
    });
  });

  const initialUiState: VerificationUiState =
    initialCapture.kind === 'captured_code' || initialCapture.kind === 'restored_from_session'
      ? 'verifying'
      : initialCapture.kind === 'missing_code' || initialCapture.kind === 'malformed_code'
      ? 'invalid_code'
      : 'request_mode';

  const [activeOobCode, setActiveOobCode] = useState<string>(initialCapture.oobCode);
  const oobCodeRef = useRef<string>(initialCapture.oobCode);

  const [uiState, setUiState] = useState<VerificationUiState>(initialUiState);
  const uiStateRef = useRef<VerificationUiState>(initialUiState);

  const setVerificationState = (next: VerificationUiState) => {
    uiStateRef.current = next;
    setUiState(next);
  };

  const [verificationAttempt, setVerificationAttempt] = useState<number>(0);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const [email, setEmail] = useState('');
  const [accountEmail, setAccountEmail] = useState<string>(
    () => getLastRequestedResetEmailFromSession() || ''
  );
  const [isAccountEmailVerifiedReadOnly, setIsAccountEmailVerifiedReadOnly] =
    useState<boolean>(false);
  const [maskedAccountEmail, setMaskedAccountEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(() =>
    initialCapture.kind === 'missing_code' || initialCapture.kind === 'malformed_code'
      ? initialCapture.errorCode || 'auth/invalid-action-code'
      : null
  );
  const [errorBanner, setErrorBanner] = useState<string | null>(() => {
    if (initialCapture.kind === 'missing_code') {
      return copy.missingCodeValidationError;
    }
    if (initialCapture.kind === 'malformed_code') {
      return copy.invalidLinkOnlyError;
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [honeypot, setHoneypot] = useState('');
  const submittingRef = useRef<boolean>(false);
  const copyRef = useRef<ResetPasswordCopy>(copy);
  copyRef.current = copy;

  // Scrub `oobCode` from the browser address bar ONLY AFTER `initialCapture` has safely stored it in state/ref/sessionStorage,
  // and enforce `meta[name="referrer"] = no-referrer` so action codes never leak via browser history or Referer headers.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(window.history.state, document.title, '/reset-password');
    }
    if (typeof document !== 'undefined') {
      let metaReferrer = document.querySelector('meta[name="referrer"]') as HTMLMetaElement | null;
      const previousContent = metaReferrer?.getAttribute('content') || null;
      if (!metaReferrer) {
        metaReferrer = document.createElement('meta');
        metaReferrer.name = 'referrer';
        document.head.appendChild(metaReferrer);
      }
      metaReferrer.content = 'no-referrer';
      return () => {
        if (metaReferrer) {
          metaReferrer.content = previousContent || 'strict-origin-when-cross-origin';
        }
      };
    }
  }, []);

  // Support in-app navigation to `/reset-password?oobCode=...` if `ResetPasswordView` was already mounted
  // (checks live `window.location.search` and scrubs immediately so stale router state can never re-trigger).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.search) {
      return;
    }
    const nextCapture = captureInitialResetLinkFromSearch(window.location.search, {
      isInternalPushWithoutSearch: false,
    });
    if (nextCapture.shouldScrubUrl) {
      window.history.replaceState(window.history.state, document.title, '/reset-password');
    }
    if (nextCapture.kind === 'captured_code' && nextCapture.oobCode !== oobCodeRef.current) {
      oobCodeRef.current = nextCapture.oobCode;
      setActiveOobCode(nextCapture.oobCode);
      setMaskedAccountEmail(null);
      setStatusMessage(null);
      setErrorBanner(null);
      setErrorCode(null);
      setVerificationState('verifying');
      setVerificationAttempt((prev) => prev + 1);
    } else if (nextCapture.kind === 'missing_code' || nextCapture.kind === 'malformed_code') {
      oobCodeRef.current = '';
      setActiveOobCode('');
      setVerificationState('invalid_code');
      setErrorCode(nextCapture.errorCode || 'auth/invalid-action-code');
      setErrorBanner(
        nextCapture.kind === 'missing_code'
          ? copyRef.current.missingCodeValidationError
          : copyRef.current.invalidLinkOnlyError
      );
    }
  }, [location.search]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const mapLocalizedErrorByCodeAndState = (
    state: VerificationUiState,
    code?: string | null,
    fallback?: string | null
  ): string => {
    if (state === 'expired_code' || code === 'auth/expired-action-code') {
      return copy.expiredLinkError;
    }
    if (state === 'already_used_code' || code === 'auth/already-used-action-code') {
      return copy.alreadyUsedLinkOnlyError;
    }
    if (state === 'disabled_account' || code === 'auth/user-disabled') {
      return copy.disabledAccountError;
    }
    if (state === 'retryable_error') {
      if (code === 'auth/verification-timeout') {
        return copy.timeoutVerifyError;
      }
      return copy.networkVerifyError;
    }
    if (code === 'auth/missing-action-code') {
      return copy.missingCodeValidationError;
    }
    if (state === 'invalid_code' || code === 'auth/invalid-action-code') {
      return copy.invalidLinkOnlyError;
    }
    return fallback || copy.invalidOrUsedLinkError;
  };

  // Single deterministic Firebase `verifyPasswordResetCode(auth, oobCode)` lifecycle with a strict 15s UI timeout guard.
  // Never discards `oobCode` on timeout or network failure, and never enters a state re-verification loop.
  useEffect(() => {
    const codeToVerify = oobCodeRef.current;
    if (!codeToVerify || uiStateRef.current !== 'verifying') {
      return;
    }

    let cancelled = false;
    let settled = false;

    const uiSafetyTimer = setTimeout(() => {
      if (cancelled || settled) return;
      settled = true;
      // Preserve `oobCodeRef.current`, `activeOobCode`, and `sessionStorage` so Retry works cleanly!
      setVerificationState('retryable_error');
      setErrorCode('auth/verification-timeout');
      setErrorBanner(copyRef.current.timeoutVerifyError);
    }, VERIFICATION_UI_SAFETY_TIMEOUT_MS);

    verifyPasswordResetTokenClient({
      oobCode: codeToVerify,
    })
      .then((res) => {
        if (cancelled || settled) return;
        settled = true;
        clearTimeout(uiSafetyTimer);

        if (res.ok) {
          setVerificationState('valid');
          setErrorBanner(null);
          setErrorCode(null);
          if (res.email) {
            const cleanFullEmail = res.email.trim().toLowerCase();
            setAccountEmail(cleanFullEmail);
            setIsAccountEmailVerifiedReadOnly(true);
            setMaskedAccountEmail(cleanFullEmail);
          } else if (res.maskedEmail) {
            setMaskedAccountEmail(res.maskedEmail);
          }
          return;
        }

        // Non-terminal retryable states (15s timeout or transient network failure):
        // Keep `oobCode` intact and present the Retry Verification button without falsely marking the link invalid.
        if (res.status === 'timeout' || res.status === 'network_error' || res.retryable) {
          const retryErrCode =
            res.code ||
            (res.status === 'timeout' ? 'auth/verification-timeout' : 'auth/network-request-failed');
          setVerificationState('retryable_error');
          setErrorCode(retryErrCode);
          setErrorBanner(
            res.status === 'timeout'
              ? copyRef.current.timeoutVerifyError
              : copyRef.current.networkVerifyError
          );
          return;
        }

        // Terminal action-code states (expired, already-used, invalid, or disabled account):
        // Clear pending code from storage/state cleanly without triggering any re-verification effect.
        clearStoredPendingResetCode();
        oobCodeRef.current = '';
        setActiveOobCode('');

        if (res.status === 'expired_token' || res.code === 'auth/expired-action-code') {
          setVerificationState('expired_code');
          setErrorCode('auth/expired-action-code');
          setErrorBanner(copyRef.current.expiredLinkError);
          return;
        }

        if (res.status === 'already_used' || res.code === 'auth/already-used-action-code') {
          setVerificationState('already_used_code');
          setErrorCode('auth/already-used-action-code');
          setErrorBanner(copyRef.current.alreadyUsedLinkOnlyError);
          return;
        }

        if (res.status === 'user_disabled' || res.code === 'auth/user-disabled') {
          setVerificationState('disabled_account');
          setErrorCode('auth/user-disabled');
          setErrorBanner(copyRef.current.disabledAccountError);
          return;
        }

        setVerificationState('invalid_code');
        const nextCode = res.code || 'auth/invalid-action-code';
        setErrorCode(nextCode);
        setErrorBanner(
          res.status === 'configuration_error'
            ? res.message
            : res.status === 'missing_token'
            ? copyRef.current.missingCodeValidationError
            : copyRef.current.invalidLinkOnlyError
        );
      })
      .catch(() => {
        if (cancelled || settled) return;
        settled = true;
        clearTimeout(uiSafetyTimer);
        // Preserve `oobCode` so the user can retry without losing their reset link
        setVerificationState('retryable_error');
        setErrorCode('auth/network-request-failed');
        setErrorBanner(copyRef.current.networkVerifyError);
      });

    return () => {
      cancelled = true;
      clearTimeout(uiSafetyTimer);
    };
  }, [verificationAttempt]);

  // Re-localize active error/status banner cleanly if the user switches website language
  useEffect(() => {
    if (
      (uiState === 'expired_code' ||
        uiState === 'already_used_code' ||
        uiState === 'invalid_code' ||
        uiState === 'disabled_account' ||
        uiState === 'retryable_error') &&
      errorCode
    ) {
      setErrorBanner(mapLocalizedErrorByCodeAndState(uiState, errorCode));
    } else if (uiState === 'completed') {
      setStatusMessage(copy.successDescription);
    }
  }, [language]);

  const handleRetryVerification = () => {
    const preservedCode = oobCodeRef.current || activeOobCode;
    if (!preservedCode) {
      setVerificationState('invalid_code');
      setErrorCode('auth/missing-action-code');
      setErrorBanner(copy.missingCodeValidationError);
      return;
    }
    setErrorBanner(null);
    setErrorCode(null);
    setStatusMessage(null);
    setVerificationState('verifying');
    setVerificationAttempt((prev) => prev + 1);
  };

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const hasRecommendedComplexity = hasLetter && hasNumberOrSymbol;
  const hasTypedConfirm = confirmPassword.length > 0;
  const passwordsMatch = hasMinLength && newPassword === confirmPassword;

  const passwordStrengthLevel: 0 | 1 | 2 | 3 =
    newPassword.length === 0
      ? 0
      : !hasMinLength
      ? 1
      : hasRecommendedComplexity && newPassword.length >= 10
      ? 3
      : hasRecommendedComplexity
      ? 3
      : 2;

  const handleReturnToLogin = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    clearStoredPendingResetCode();
    oobCodeRef.current = '';
    setActiveOobCode('');
    setNewPassword('');
    setConfirmPassword('');
    if (
      typeof window !== 'undefined' &&
      isNonCanonicalProductionHostname(window.location.hostname)
    ) {
      window.location.assign(OFFICIAL_EVERYKR_LOGIN_URL);
      return;
    }
    setAuthModalMode('login');
    setIsAuthModalOpen(false);
    navigate('/login');
  };

  const handleRequestResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isSubmitting || cooldown > 0) {
      return;
    }

    setErrorBanner(null);
    setErrorCode(null);
    setStatusMessage(null);

    if (honeypot.trim().length > 0) {
      setErrorBanner('Automated submission blocked.');
      return;
    }

    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(normalized)) {
      setErrorCode('auth/invalid-email');
      setErrorBanner(copy.invalidEmailError);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await requestPasswordResetClient(normalized);
      if (!res.ok) {
        if (res.cooldownSeconds) setCooldown(res.cooldownSeconds);
        setStatusMessage(null);
        setErrorCode(res.code || null);
        setErrorBanner(res.message);
      } else {
        saveLastRequestedResetEmailInSession(normalized);
        setAccountEmail(normalized);
        clearStoredPendingResetCode();
        oobCodeRef.current = '';
        setActiveOobCode('');
        setVerificationState('request_mode');
        setStatusMessage(copy.checkEmailMessage);
        setCooldown(res.cooldownSeconds || 60);
        showToast(copy.checkEmailTitle);
      }
    } catch (err: any) {
      setStatusMessage(null);
      setErrorCode(err?.code || 'auth/network-request-failed');
      setErrorBanner(err?.message || copy.networkVerifyError);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isSubmitting) {
      return;
    }

    setErrorBanner(null);
    setErrorCode(null);

    const codeToConfirm = oobCodeRef.current || activeOobCode;
    if (!codeToConfirm) {
      setErrorCode('auth/missing-action-code');
      setErrorBanner(copy.missingCodeValidationError);
      setVerificationState('invalid_code');
      return;
    }

    if (newPassword.length < 8) {
      setErrorCode('auth/weak-password');
      setErrorBanner(copy.minLengthValidationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorCode('auth/password-mismatch');
      setErrorBanner(copy.mismatchValidationError);
      return;
    }

    // Ensure both password fields have type="password" during form submission so Chrome Password Manager
    // reliably detects the password update for https://everykr.com
    setShowNewPassword(false);
    setShowConfirmPassword(false);

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await confirmPasswordResetClient({
        oobCode: codeToConfirm,
        newPassword,
      });

      if (!res.ok) {
        if (res.retryable || res.status === 'network_error') {
          // Keep `codeToConfirm` and password fields intact so the user can retry immediately
          setErrorCode(res.code || 'auth/network-request-failed');
          setErrorBanner(res.message || copy.networkVerifyError);
          return;
        }

        if (
          res.status === 'expired_token' ||
          res.status === 'already_used' ||
          res.status === 'invalid_token' ||
          res.status === 'user_disabled' ||
          res.code === 'auth/expired-action-code' ||
          res.code === 'auth/already-used-action-code' ||
          res.code === 'auth/invalid-action-code' ||
          res.code === 'auth/user-disabled'
        ) {
          clearStoredPendingResetCode();
          oobCodeRef.current = '';
          setActiveOobCode('');
          setNewPassword('');
          setConfirmPassword('');

          if (res.status === 'expired_token' || res.code === 'auth/expired-action-code') {
            setVerificationState('expired_code');
            setErrorCode('auth/expired-action-code');
            setErrorBanner(copy.expiredLinkError);
          } else if (res.status === 'already_used' || res.code === 'auth/already-used-action-code') {
            setVerificationState('already_used_code');
            setErrorCode('auth/already-used-action-code');
            setErrorBanner(copy.alreadyUsedLinkOnlyError);
          } else if (res.status === 'user_disabled' || res.code === 'auth/user-disabled') {
            setVerificationState('disabled_account');
            setErrorCode('auth/user-disabled');
            setErrorBanner(copy.disabledAccountError);
          } else {
            setVerificationState('invalid_code');
            setErrorCode(res.code || 'auth/invalid-action-code');
            setErrorBanner(copy.invalidOrUsedLinkError);
          }
          return;
        }

        setErrorCode(res.code || null);
        setErrorBanner(res.message);
        return;
      }

      // Clear one-time action code from storage and transition directly to 'completed'
      // while preserving the form's username + new-password values during unmount so
      // Google Chrome Password Manager prompts: "Update password for everykr.com?"
      clearStoredPendingResetCode();
      oobCodeRef.current = '';
      setActiveOobCode('');
      setVerificationState('completed');
      setStatusMessage(copy.successDescription);
      showToast(copy.successHeading);
    } catch {
      // Preserve action code so transient network failures can be retried cleanly
      setErrorCode('auth/network-request-failed');
      setErrorBanner(copy.networkVerifyError);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const showRequestAnotherEmailForm =
    uiState === 'request_mode' ||
    uiState === 'expired_code' ||
    uiState === 'already_used_code' ||
    uiState === 'invalid_code' ||
    uiState === 'retryable_error';

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      data-no-translate="true"
      className="py-10 sm:py-16 bg-[#F5F7FA] dark:bg-[#050B18] min-h-[82vh] flex flex-col items-center justify-center px-4"
    >
      <div className="max-w-md w-full bg-white dark:bg-[#081426] rounded-2xl border border-slate-200 dark:border-[#DCE5F0]/14 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Top Brand & Back to Sign In Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              to="/"
              aria-label="EveryKR — Everything Korea, One Platform"
              className="inline-flex items-center rounded-xl py-0.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
            >
              <EveryKrAnimatedLogo variant="compact" imgClassName="h-7 sm:h-8" />
            </Link>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              {copy.portalLabel}
            </span>
          </div>

          <Link
            to="/login"
            onClick={() => {
              clearStoredPendingResetCode();
              oobCodeRef.current = '';
            }}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#10243A] hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            <span>{copy.backToSignIn}</span>
          </Link>
        </div>

        {/* Heading & Contextual Subtitle */}
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#10243A] dark:text-white tracking-tight flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#1769AA] dark:text-[#D6B875] shrink-0" />
            <span>
              {uiState === 'completed' ? copy.successHeading : copy.resetHeading}
            </span>
          </h1>
          {uiState !== 'completed' && uiState !== 'verifying' && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {uiState === 'valid'
                ? maskedAccountEmail
                  ? copy.validSubtitleWithEmail(maskedAccountEmail)
                  : copy.validSubtitle
                : copy.requestSubtitle}
            </p>
          )}
        </div>

        {/* Validation / Expiration / Already-Used / Timeout Alert */}
        {errorBanner && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-200 text-xs space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorBanner}</div>
            </div>

            {uiState === 'retryable_error' && Boolean(oobCodeRef.current || activeOobCode) && (
              <button
                type="button"
                id="everykr-retry-reset-verification"
                onClick={handleRetryVerification}
                className="w-full min-h-[40px] py-2 px-3.5 text-xs font-bold text-white bg-[#1769AA] hover:bg-[#10243A] dark:bg-[#2563EB] dark:hover:bg-blue-500 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                <span>{copy.retryVerificationButton}</span>
              </button>
            )}
          </div>
        )}

        {/* STATE 1: Verifying Firebase oobCode on Page Load */}
        {uiState === 'verifying' && (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-7 h-7 text-[#1769AA] dark:text-[#D6B875] animate-spin" />
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
              {copy.verifyingMessage}
            </p>
          </div>
        )}

        {/* STATE 2: Password Successfully Updated */}
        {uiState === 'completed' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-200 text-xs sm:text-sm space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{copy.successHeading}</span>
              </div>
              <p className="leading-relaxed text-xs text-emerald-900/90 dark:text-emerald-200/90">
                {statusMessage || copy.successDescription}
              </p>
            </div>

            <a
              id="everykr-post-reset-login-link"
              href={OFFICIAL_EVERYKR_LOGIN_URL}
              onClick={handleReturnToLogin}
              className="w-full min-h-[44px] py-3 px-4 text-xs sm:text-sm font-bold text-white bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#2563EB] dark:hover:bg-blue-500 rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap inline-flex items-center justify-center text-center"
            >
              {copy.returnToSignInButton}
            </a>
          </div>
        )}

        {/* STATE 3: Verified Firebase Action Code -> Custom EveryKR Reset Password Form */}
        {uiState === 'valid' && (
          <form
            id="everykr-reset-password-form"
            name="everykr-reset-password"
            action={OFFICIAL_PASSWORD_RESET_ACTION_URL}
            method="post"
            onSubmit={handleConfirmNewPassword}
            className="space-y-4"
            noValidate
          >
            <div>
              <label
                htmlFor="everykr-reset-account-username"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {isAccountEmailVerifiedReadOnly
                  ? copy.verifiedAccountLabel
                  : copy.registeredEmailLabel}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="everykr-reset-account-username"
                  name="username"
                  type="email"
                  autoComplete="username"
                  value={accountEmail}
                  onChange={(e) => {
                    if (!isAccountEmailVerifiedReadOnly) {
                      setAccountEmail(e.target.value);
                    }
                  }}
                  readOnly={isAccountEmailVerifiedReadOnly}
                  placeholder={copy.registeredEmailPlaceholder}
                  className={`w-full min-h-[44px] ps-10 pe-3.5 py-2.5 text-xs sm:text-sm rounded-xl border ${
                    isAccountEmailVerifiedReadOnly
                      ? 'bg-slate-100 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium cursor-not-allowed'
                      : 'bg-slate-50 dark:bg-slate-900/70 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/25 focus:border-[#1769AA]'
                  }`}
                />
              </div>
            </div>

            {/* New Password Field with Show/Hide Toggle */}
            <div>
              <label
                htmlFor="everykr-reset-new-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {copy.newPasswordLabel}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="everykr-reset-new-password"
                  name="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={copy.newPasswordPlaceholder}
                  className="w-full min-h-[44px] ps-10 pe-11 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/25 focus:border-[#1769AA] dark:focus:border-blue-400 disabled:opacity-60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  aria-label={showNewPassword ? copy.hidePasswordAria : copy.showPasswordAria}
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field with Independent Show/Hide Toggle */}
            <div>
              <label
                htmlFor="everykr-reset-confirm-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {copy.confirmPasswordLabel}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="everykr-reset-confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={copy.confirmPasswordPlaceholder}
                  className="w-full min-h-[44px] ps-10 pe-11 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/25 focus:border-[#1769AA] dark:focus:border-blue-400 disabled:opacity-60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  aria-label={showConfirmPassword ? copy.hidePasswordAria : copy.showPasswordAria}
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Live Password Strength & Validation Feedback */}
            <div className="pt-1 space-y-2.5 text-xs">
              {newPassword.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">{copy.strengthLabel}</span>
                    <span
                      className={`font-semibold ${
                        passwordStrengthLevel === 3
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : passwordStrengthLevel === 2
                          ? 'text-[#1769AA] dark:text-blue-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {passwordStrengthLevel === 3
                        ? copy.strengthStrong
                        : passwordStrengthLevel === 2
                        ? copy.strengthGood
                        : copy.strengthWeak}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 rounded-full transition-colors ${
                          passwordStrengthLevel >= step
                            ? passwordStrengthLevel === 3
                              ? 'bg-emerald-500'
                              : passwordStrengthLevel === 2
                              ? 'bg-[#1769AA] dark:bg-blue-500'
                              : 'bg-amber-500'
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <ul className="space-y-1.5 text-[11px] sm:text-xs">
                <li
                  className={`flex items-center gap-2 ${
                    hasMinLength
                      ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {hasMinLength ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  )}
                  <span>{copy.ruleMinLength}</span>
                </li>

                <li
                  className={`flex items-center gap-2 ${
                    hasRecommendedComplexity
                      ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {hasRecommendedComplexity ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  )}
                  <span>{copy.ruleComplexity}</span>
                </li>

                {hasTypedConfirm && (
                  <li
                    className={`flex items-center gap-2 font-medium ${
                      newPassword === confirmPassword
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {newPassword === confirmPassword ? (
                      <Check className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>
                      {newPassword === confirmPassword
                        ? copy.rulePasswordsMatch
                        : copy.rulePasswordsMismatch}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Primary CTA: Reset Password */}
            <button
              type="submit"
              disabled={isSubmitting || !hasMinLength || !passwordsMatch}
              className="w-full min-h-[44px] py-3 px-4 text-xs sm:text-sm font-bold text-white bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#2563EB] dark:hover:bg-blue-500 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{copy.resettingPasswordButton}</span>
                </>
              ) : (
                <span>{copy.resetPasswordButton}</span>
              )}
            </button>
          </form>
        )}

        {/* STATE 4: Request Reset Email (or Request Fresh Link After Expired / Already-Used / Invalid / Retryable Error) */}
        {showRequestAnotherEmailForm && (
          <form onSubmit={handleRequestResetLink} className="space-y-4" noValidate>
            {uiState === 'retryable_error' && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {copy.requestNewLinkInsteadLabel}
              </div>
            )}

            <div>
              <label
                htmlFor="everykr-reset-request-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {copy.registeredEmailLabel}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="everykr-reset-request-email"
                  name="username"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={copy.registeredEmailPlaceholder}
                  className="w-full min-h-[44px] ps-10 pe-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/25 focus:border-[#1769AA] dark:focus:border-blue-400 disabled:opacity-60"
                  required
                />
              </div>
            </div>

            <input
              type="text"
              name="website_hp"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            {statusMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{copy.checkEmailTitle}</span>
                </div>
                <p className="leading-relaxed">{statusMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || cooldown > 0}
              className="w-full min-h-[44px] py-3 px-4 text-xs sm:text-sm font-bold text-white bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#2563EB] dark:hover:bg-blue-500 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{copy.sendingResetEmailButton}</span>
                </>
              ) : cooldown > 0 ? (
                <span className="tabular-nums">{copy.resendInSeconds(cooldown)}</span>
              ) : (
                <span>{copy.sendResetEmailButton}</span>
              )}
            </button>
          </form>
        )}

        {/* Quiet Security Footer Note */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1769AA] dark:text-[#D6B875] shrink-0" />
          <span>{copy.securityNote}</span>
        </div>
      </div>
    </section>
  );
};
