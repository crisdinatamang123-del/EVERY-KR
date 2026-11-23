import { LanguageCode } from '../../types';

export interface GlobeCoordinates {
  lat: number;
  lon: number;
}

export interface OriginCountryRoute {
  code: string;
  name: Partial<Record<LanguageCode, string>> & { en: string };
  city: Partial<Record<LanguageCode, string>> & { en: string };
  flag: string;
  coords: GlobeCoordinates;
  defaultForLanguages?: LanguageCode[];
}

export const KOREA_DESTINATION = {
  code: 'KR',
  coords: { lat: 37.5665, lon: 126.978 }, // Seoul / Incheon Gateway
  busanCoords: { lat: 35.1796, lon: 129.0756 },
  daejeonCoords: { lat: 36.3504, lon: 127.3845 },
  name: {
    en: 'South Korea',
    bn: 'দক্ষিণ কোরিয়া',
    ne: 'दक्षिण कोरिया',
    ur: 'جنوبی کوریا',
    ko: '대한민국 (한국)',
    hi: 'दक्षिण कोरिया',
    ar: 'كوريا الجنوبية',
    zh: '韩国',
    ja: '大韓民国（韓国）'
  } as Record<LanguageCode, string>,
  hubLabel: {
    en: 'Seoul · Busan · Daejeon',
    bn: 'সিউল · বুসান · দেজিয়ন',
    ne: 'सियोल · बुसान · देजोन',
    ur: 'سیول · بوسان · ڈایجون',
    ko: '서울 · 부산 · 대전 대학 허브',
    hi: 'सियोल · बुसान · डेजॉन',
    ar: 'سيول · بوسان · دايجون',
    zh: '首尔 · 釜山 · 大田',
    ja: 'ソウル · 釜山 · 大田'
  } as Record<LanguageCode, string>
};

export const DEFAULT_LANGUAGE_TO_COUNTRY_CODE: Record<LanguageCode, string> = {
  en: 'US', // English → United States
  bn: 'BD', // Bangla → Bangladesh
  ko: 'KR', // Korean → South Korea
  ne: 'NP', // Nepali → Nepal
  ur: 'PK', // Urdu → Pakistan
  hi: 'IN', // Hindi → India
  ar: 'SA', // Arabic → Saudi Arabia
  zh: 'CN', // Chinese → China
  ja: 'JP'  // Japanese → Japan
};

export const ORIGIN_COUNTRIES: OriginCountryRoute[] = [
  {
    code: 'BD',
    flag: '🇧🇩',
    coords: { lat: 23.8103, lon: 90.4125 }, // Dhaka
    defaultForLanguages: ['bn'],
    name: {
      en: 'Bangladesh',
      bn: 'বাংলাদেশ',
      ne: 'बंगलादेश',
      ur: 'بنگلہ دیش',
      ko: '방글라데시',
      hi: 'बांग्लादेश',
      zh: 'Bangladesh'
    },
    city: {
      en: 'Dhaka',
      bn: 'ঢাকা',
      ne: 'ढाका',
      ur: 'ڈھاکہ',
      ko: '다카',
      hi: 'ढाका',
      zh: 'Dhaka'
    }
  },
  {
    code: 'NP',
    flag: '🇳🇵',
    coords: { lat: 27.7172, lon: 85.324 }, // Kathmandu
    defaultForLanguages: ['ne'],
    name: {
      en: 'Nepal',
      bn: 'নেপাল',
      ne: 'नेपाल',
      ur: 'نیپال',
      ko: '네팔',
      hi: 'नेपाल',
      zh: 'Nepal'
    },
    city: {
      en: 'Kathmandu',
      bn: 'কাঠমান্ডু',
      ne: 'काठमाडौं',
      ur: 'کھٹمنڈو',
      ko: '카트만두',
      hi: 'काठमांडू',
      zh: 'Kathmandu'
    }
  },
  {
    code: 'PK',
    flag: '🇵🇰',
    coords: { lat: 33.6844, lon: 73.0479 }, // Islamabad
    defaultForLanguages: ['ur'],
    name: {
      en: 'Pakistan',
      bn: 'পাকিস্তান',
      ne: 'पाकिस्तान',
      ur: 'پاکستان',
      ko: '파키스탄',
      hi: 'पाकिस्तान',
      zh: 'Pakistan'
    },
    city: {
      en: 'Islamabad',
      bn: 'ইসলামাবাদ',
      ne: 'इस्लामाबाद',
      ur: 'اسلام آباد',
      ko: '이슬라마바드',
      hi: 'इस्लामाबाद',
      zh: 'Islamabad'
    }
  },
  {
    code: 'KR',
    flag: '🇰🇷',
    // Origin in Southern South Korea (Busan / Jeju corridor) to Seoul/Incheon destination hub
    coords: { lat: 34.65, lon: 128.45 },
    defaultForLanguages: ['ko'],
    name: {
      en: 'South Korea',
      bn: 'দক্ষিণ কোরিয়া',
      ne: 'दक्षिण कोरिया',
      ur: 'جنوبی کوریا',
      ko: '대한민국 (한국)',
      hi: 'दक्षिण कोरिया',
      ar: 'كوريا الجنوبية',
      zh: '韩国',
      ja: '韓国'
    },
    city: {
      en: 'Busan → Seoul',
      bn: 'বুসান → সিউল',
      ne: 'बुसान → सियोल',
      ur: 'بوسان → سیول',
      ko: '부산 → 서울',
      hi: 'बुसान → सियोल',
      ar: 'بوسان ← سيول',
      zh: '釜山 → 首尔',
      ja: '釜山 → ソウル'
    }
  },
  {
    code: 'IN',
    flag: '🇮🇳',
    coords: { lat: 28.6139, lon: 77.209 }, // New Delhi
    defaultForLanguages: ['hi'],
    name: {
      en: 'India',
      bn: 'ভারত',
      ne: 'भारत',
      ur: 'بھارت',
      ko: '인도',
      hi: 'भारत',
      zh: 'India'
    },
    city: {
      en: 'New Delhi',
      bn: 'নয়াদিল্লি',
      ne: 'नयाँ दिल्ली',
      ur: 'نئی دہلی',
      ko: '뉴델리',
      hi: 'नई दिल्ली',
      zh: 'New Delhi'
    }
  },
  {
    code: 'UZ',
    flag: '🇺🇿',
    coords: { lat: 41.2995, lon: 69.2401 }, // Tashkent
    name: {
      en: 'Uzbekistan',
      bn: 'উজবেকিস্তান',
      ne: 'उज्बेकिस्तान',
      ur: 'ازبکستان',
      ko: '우즈베키스탄',
      hi: 'उज़्बेकिस्तान',
      zh: 'Uzbekistan'
    },
    city: {
      en: 'Tashkent',
      bn: 'তাশখন্দ',
      ne: 'ताशकन्द',
      ur: 'تاشقند',
      ko: '타슈켄트',
      hi: 'ताशकंद',
      zh: 'Tashkent'
    }
  },
  {
    code: 'VN',
    flag: '🇻🇳',
    coords: { lat: 21.0285, lon: 105.8542 }, // Hanoi
    name: {
      en: 'Vietnam',
      bn: 'ভিয়েতনাম',
      ne: 'भियतनाम',
      ur: 'ویتنام',
      ko: '베트남',
      hi: 'वियतनाम',
      zh: 'Vietnam'
    },
    city: {
      en: 'Hanoi',
      bn: 'হ্যানয়',
      ne: 'हनोई',
      ur: 'ہنوئی',
      ko: '하노이',
      hi: 'हनोई',
      zh: 'Hanoi'
    }
  },
  {
    code: 'MN',
    flag: '🇲🇳',
    coords: { lat: 47.8864, lon: 106.9057 }, // Ulaanbaatar
    name: {
      en: 'Mongolia',
      bn: 'মঙ্গোলিয়া',
      ne: 'मंगोलिया',
      ur: 'منگولیا',
      ko: '몽골',
      hi: 'मंगोलिया',
      zh: 'Mongolia'
    },
    city: {
      en: 'Ulaanbaatar',
      bn: 'উলানবাতার',
      ne: 'उलानबटार',
      ur: 'اولان باتور',
      ko: '울란바토르',
      hi: 'उलानबटार',
      zh: 'Ulaanbaatar'
    }
  },
  {
    code: 'ID',
    flag: '🇮🇩',
    coords: { lat: -6.2088, lon: 106.8456 }, // Jakarta
    name: {
      en: 'Indonesia',
      bn: 'ইন্দোনেশিয়া',
      ne: 'इन्डोनेसिया',
      ur: 'انڈونیشیا',
      ko: '인도네시아',
      hi: 'इंडोनेशिया',
      zh: 'Indonesia'
    },
    city: {
      en: 'Jakarta',
      bn: 'জাকার্তা',
      ne: 'जकार्ता',
      ur: 'جکارتہ',
      ko: '자카르타',
      hi: 'जकार्ता',
      zh: 'Jakarta'
    }
  },
  {
    code: 'PH',
    flag: '🇵🇭',
    coords: { lat: 14.5995, lon: 120.9842 }, // Manila
    name: {
      en: 'Philippines',
      bn: 'ফিলিপাইন',
      ne: 'फिलिपिन्स',
      ur: 'فلپائن',
      ko: '필리핀',
      hi: 'फिलीपींस',
      zh: 'Philippines'
    },
    city: {
      en: 'Manila',
      bn: 'ম্যানিলা',
      ne: 'मनिला',
      ur: 'منیلا',
      ko: '마닐라',
      hi: 'मनीला',
      zh: 'Manila'
    }
  },
  {
    code: 'MY',
    flag: '🇲🇾',
    coords: { lat: 3.139, lon: 101.6869 }, // Kuala Lumpur
    name: {
      en: 'Malaysia',
      bn: 'মালয়েশিয়া',
      ne: 'मलेसिया',
      ur: 'ملائیشیا',
      ko: '말레이시아',
      hi: 'मलेशिया',
      zh: 'Malaysia'
    },
    city: {
      en: 'Kuala Lumpur',
      bn: 'কুয়ালালামপুর',
      ne: 'क्वालालम्पुर',
      ur: 'کوالالمپور',
      ko: '쿠알라룸푸르',
      hi: 'कुआलालंपुर',
      zh: 'Kuala Lumpur'
    }
  },
  {
    code: 'TH',
    flag: '🇹🇭',
    coords: { lat: 13.7563, lon: 100.5018 }, // Bangkok
    name: {
      en: 'Thailand',
      bn: 'থাইল্যান্ড',
      ne: 'थाइल्याण्ड',
      ur: 'تھائی لینڈ',
      ko: '태국',
      hi: 'थाईलैंड',
      zh: 'Thailand'
    },
    city: {
      en: 'Bangkok',
      bn: 'ব্যাংকক',
      ne: 'बैंकक',
      ur: 'بنکاک',
      ko: '방콕',
      hi: 'बैंकॉक',
      zh: 'Bangkok'
    }
  },
  {
    code: 'LK',
    flag: '🇱🇰',
    coords: { lat: 6.9271, lon: 79.8612 }, // Colombo
    name: {
      en: 'Sri Lanka',
      bn: 'শ্রীলঙ্কা',
      ne: 'श्रीलंका',
      ur: 'سری لنکا',
      ko: '스리랑카',
      hi: 'श्रीलंका',
      zh: 'Sri Lanka'
    },
    city: {
      en: 'Colombo',
      bn: 'কলম্বো',
      ne: 'कोलम्बो',
      ur: 'کولمبو',
      ko: '콜롬보',
      hi: 'कोलंबो',
      zh: 'Colombo'
    }
  },
  {
    code: 'KZ',
    flag: '🇰🇿',
    coords: { lat: 51.1694, lon: 71.4491 }, // Astana
    name: {
      en: 'Kazakhstan',
      bn: 'কাজাখস্তান',
      ne: 'कजाकिस्तान',
      ur: 'قازقستان',
      ko: '카자흐스탄',
      hi: 'कज़ाख़िस्तान',
      zh: 'Kazakhstan'
    },
    city: {
      en: 'Astana',
      bn: 'আস্তানা',
      ne: 'अस्ताना',
      ur: 'آستانہ',
      ko: '아스타나',
      hi: 'अस्ताना',
      zh: 'Astana'
    }
  },
  {
    code: 'SA',
    flag: '🇸🇦',
    coords: { lat: 24.7136, lon: 46.6753 }, // Riyadh, Saudi Arabia
    defaultForLanguages: ['ar'],
    name: {
      en: 'Saudi Arabia',
      bn: 'সৌদি আরব',
      ne: 'साउदी अरेबिया',
      ur: 'سعودی عرب',
      ko: '사우디아라비아',
      hi: 'सऊदी अरब',
      ar: 'المملكة العربية السعودية',
      zh: '沙特阿拉伯',
      ja: 'サウジアラビア'
    },
    city: {
      en: 'Riyadh',
      bn: 'রিয়াদ',
      ne: 'रियाद',
      ur: 'ریاض',
      ko: '리야드',
      hi: 'रियाद',
      ar: 'الرياض',
      zh: '利雅得',
      ja: 'リヤド'
    }
  },
  {
    code: 'CN',
    flag: '🇨🇳',
    coords: { lat: 39.9042, lon: 116.4074 }, // Beijing, China
    defaultForLanguages: ['zh'],
    name: {
      en: 'China',
      bn: 'চীন',
      ne: 'चीन',
      ur: 'چین',
      ko: '중국',
      hi: 'चीन',
      ar: 'الصين',
      zh: '中国',
      ja: '中国'
    },
    city: {
      en: 'Beijing',
      bn: 'বেইজিং',
      ne: 'बेइजिङ',
      ur: 'بیجنگ',
      ko: '베이징',
      hi: 'बीजिंग',
      ar: 'بكين',
      zh: '北京',
      ja: '北京'
    }
  },
  {
    code: 'JP',
    flag: '🇯🇵',
    coords: { lat: 35.6762, lon: 139.6503 }, // Tokyo, Japan
    defaultForLanguages: ['ja'],
    name: {
      en: 'Japan',
      bn: 'জাপান',
      ne: 'जापान',
      ur: 'جاپان',
      ko: '일본',
      hi: 'जापान',
      ar: 'اليابان',
      zh: '日本',
      ja: '日本'
    },
    city: {
      en: 'Tokyo',
      bn: 'টোকিও',
      ne: 'टोकियो',
      ur: 'ٹوکیو',
      ko: '도쿄',
      hi: 'टोक्यो',
      ar: 'طوكيو',
      zh: '东京',
      ja: '東京'
    }
  },
  {
    code: 'US',
    flag: '🇺🇸',
    coords: { lat: 37.7749, lon: -122.4194 }, // San Francisco / US Pacific Gateway
    defaultForLanguages: ['en'],
    name: {
      en: 'United States',
      bn: 'যুক্তরাষ্ট্র',
      ne: 'संयुक्त राज्य अमेरिका',
      ur: 'ریاستہائے متحدہ امریکہ',
      ko: '미국',
      hi: 'संयुक्त राज्य अमेरिका',
      ar: 'الولايات المتحدة',
      zh: '美国',
      ja: 'アメリカ合衆国'
    },
    city: {
      en: 'San Francisco / Los Angeles',
      bn: 'সান ফ্রান্সিসকো / লস অ্যাঞ্জেলেস',
      ne: 'सान फ्रान्सिस्को / लस एन्जलस',
      ur: 'سان فرانسسکو / لاس اینجلس',
      ko: '샌프란시스코 / 로스앤젤레스',
      hi: 'सैन फ्रांसिस्को / लॉस एंजिल्स',
      ar: 'سان فرانسيسكو / لوس أنجلوس',
      zh: '旧金山 / 洛杉矶',
      ja: 'サンフランシスコ / ロサンゼルス'
    }
  },
  {
    code: 'GB',
    flag: '🇬🇧',
    coords: { lat: 51.5072, lon: -0.1276 }, // London
    name: {
      en: 'United Kingdom',
      bn: 'যুক্তরাজ্য',
      ne: 'संयुक्त अधिराज्य',
      ur: 'برطانیہ',
      ko: '영국',
      hi: 'यूनाइटेड किंगडम',
      zh: 'United Kingdom'
    },
    city: {
      en: 'London',
      bn: 'লন্ডন',
      ne: 'लन्डन',
      ur: 'لندن',
      ko: '런던',
      hi: 'लंदन',
      zh: 'London'
    }
  },
  {
    code: 'NG',
    flag: '🇳🇬',
    coords: { lat: 9.0765, lon: 7.3986 }, // Abuja
    name: {
      en: 'Nigeria',
      bn: 'নাইজেরিয়া',
      ne: 'नाइजेरिया',
      ur: 'نائیجیریا',
      ko: '나이지리아',
      hi: 'नाइजीरिया',
      zh: 'Nigeria'
    },
    city: {
      en: 'Abuja / Lagos',
      bn: 'আবুজা / লাগোস',
      ne: 'अबुजा / लागोस',
      ur: 'ابوجا / لاگوس',
      ko: '아부자 / 라고스',
      hi: 'अबुजा / लागोस',
      zh: 'Abuja / Lagos'
    }
  }
];

export function getOriginCountryByCode(code?: string | null): OriginCountryRoute {
  if (!code) return ORIGIN_COUNTRIES[0];
  const normalized = code.trim().toUpperCase();
  const match = ORIGIN_COUNTRIES.find(
    (c) =>
      c.code.toUpperCase() === normalized ||
      c.name.en.toUpperCase() === normalized
  );
  return match || ORIGIN_COUNTRIES[0];
}

export function resolveInitialOriginCountryCode(
  language: LanguageCode,
  userCountryOrNationality?: string | null
): string {
  if (userCountryOrNationality && userCountryOrNationality.trim().length > 0) {
    const q = userCountryOrNationality.trim().toLowerCase();
    const matched = ORIGIN_COUNTRIES.find(
      (c) =>
        c.code.toLowerCase() === q ||
        c.name.en.toLowerCase() === q ||
        Object.values(c.name).some((label) => label.toLowerCase() === q)
    );
    if (matched) return matched.code;
  }

  return DEFAULT_LANGUAGE_TO_COUNTRY_CODE[language] || 'BD';
}

/**
 * Exact 3D Cartesian coordinates on Three.js SphereGeometry(radius, widthSegments, heightSegments).
 * In Three.js SphereGeometry:
 *   phi = (90 - lat) * PI / 180
 *   theta = (lon + 180) * PI / 180
 *   x = -R * sin(phi) * cos(theta) =  R * cos(latRad) * cos(lonRad)
 *   y =  R * cos(phi)              =  R * sin(latRad)
 *   z =  R * sin(phi) * sin(theta) = -R * cos(latRad) * sin(lonRad)
 */
export function sphereLatLonToVec3(
  lat: number,
  lon: number,
  radius: number = 1
): [number, number, number] {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = -radius * Math.cos(latRad) * Math.sin(lonRad);
  return [x, y, z];
}

/**
 * Legacy helper kept for compatibility
 */
export function latLonToVec3(lat: number, lon: number, radius: number = 1): [number, number, number] {
  return sphereLatLonToVec3(lat, lon, radius);
}

/**
 * Generates smooth 3D elevated great-circle flight arc points between two lat/lon coordinates
 * on a Three.js SphereGeometry of radius = 1.
 */
export function buildGreatCircleArcPoints(
  from: GlobeCoordinates,
  to: GlobeCoordinates,
  segments: number = 96,
  peakAltitude: number = 0.048
): [number, number, number][] {
  const vStart = sphereLatLonToVec3(from.lat, from.lon, 1);
  const vEnd = sphereLatLonToVec3(to.lat, to.lon, 1);

  const dot = Math.max(
    -1,
    Math.min(1, vStart[0] * vEnd[0] + vStart[1] * vEnd[1] + vStart[2] * vEnd[2])
  );
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);

  // Keep the flight path hugging the Earth's curvature directly above the surface & cloud layer
  const dynamicAltitude = Math.min(0.075, Math.max(0.034, peakAltitude * (omega / 0.85)));

  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let x: number;
    let y: number;
    let z: number;

    if (sinOmega < 0.0001) {
      x = vStart[0] + (vEnd[0] - vStart[0]) * t;
      y = vStart[1] + (vEnd[1] - vStart[1]) * t;
      z = vStart[2] + (vEnd[2] - vStart[2]) * t;
    } else {
      const a = Math.sin((1 - t) * omega) / sinOmega;
      const b = Math.sin(t * omega) / sinOmega;
      x = a * vStart[0] + b * vEnd[0];
      y = a * vStart[1] + b * vEnd[1];
      z = a * vStart[2] + b * vEnd[2];
    }

    const len = Math.hypot(x, y, z) || 1;
    // Smooth climb, cruise over the surface, and descent into South Korea
    const climbProfile = Math.pow(Math.sin(Math.PI * t), 0.78);
    const elevation = 1.004 + climbProfile * dynamicAltitude;
    points.push([(x / len) * elevation, (y / len) * elevation, (z / len) * elevation]);
  }

  return points;
}

export function samplePolyline(
  points: [number, number, number][],
  t: number
): {
  position: [number, number, number];
  tangent: [number, number, number];
} {
  if (points.length === 0) {
    return { position: [0, 0, 1], tangent: [1, 0, 0] };
  }
  if (points.length === 1) {
    return { position: points[0], tangent: [1, 0, 0] };
  }

  const clamped = Math.max(0, Math.min(0.9999, t));
  const scaled = clamped * (points.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;

  const p0 = points[idx];
  const p1 = points[Math.min(points.length - 1, idx + 1)];

  const position: [number, number, number] = [
    p0[0] + (p1[0] - p0[0]) * frac,
    p0[1] + (p1[1] - p0[1]) * frac,
    p0[2] + (p1[2] - p0[2]) * frac
  ];

  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const dz = p1[2] - p0[2];
  const dLen = Math.hypot(dx, dy, dz) || 1;

  return {
    position,
    tangent: [dx / dLen, dy / dLen, dz / dLen]
  };
}

export const GLOBAL_JOURNEY_COPY: Record<
  LanguageCode,
  {
    originSelectorLabel: string;
    destinationLabel: string;
    routeToLabel: string;
  }
> = {
  en: {
    originSelectorLabel: 'Departure Country',
    destinationLabel: 'Destination: South Korea',
    routeToLabel: 'Flight Route to South Korea'
  },
  bn: {
    originSelectorLabel: 'যাত্রা শুরুর দেশ',
    destinationLabel: 'গন্তব্য: দক্ষিণ কোরিয়া',
    routeToLabel: 'দক্ষিণ কোরিয়া ফ্লাইট রুট'
  },
  ne: {
    originSelectorLabel: 'प्रस्थान देश',
    destinationLabel: 'गन्तव्य: दक्षिण कोरिया',
    routeToLabel: 'दक्षिण कोरिया उडान मार्ग'
  },
  ur: {
    originSelectorLabel: 'روانگی کا ملک',
    destinationLabel: 'منزل: جنوبی کوریا',
    routeToLabel: 'جنوبی کوریا فلائٹ روٹ'
  },
  ko: {
    originSelectorLabel: '출발 국가 선택',
    destinationLabel: '목적지: 대한민국',
    routeToLabel: '대한민국 취항 노선'
  },
  hi: {
    originSelectorLabel: 'प्रस्थान देश',
    destinationLabel: 'गंतव्य: दक्षिण कोरिया',
    routeToLabel: 'दक्षिण कोरिया उड़ान मार्ग'
  },
  ar: {
    originSelectorLabel: 'بلد المغادرة',
    destinationLabel: 'الوجهة: كوريا الجنوبية',
    routeToLabel: 'مسار الرحلة إلى كوريا الجنوبية'
  },
  zh: {
    originSelectorLabel: '出发国家',
    destinationLabel: '目的地：韩国',
    routeToLabel: '飞往韩国的航线'
  },
  ja: {
    originSelectorLabel: '出発国',
    destinationLabel: '目的地：韓国',
    routeToLabel: '韓国へのフライト路線'
  }
};
