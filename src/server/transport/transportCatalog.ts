/**
 * Verified Korean Rail (KTX / SRT) Stations, Express & Intercity Bus Terminals,
 * Official External Booking Directories, and Asia/Seoul (KST) Time Utilities.
 *
 * IMPORTANT:
 * - EveryKR does NOT sell tickets, process payments, issue tickets, or fabricate live schedules/fares.
 * - Station/terminal entries contain verified public directory metadata and TAGO Open API lookup names.
 * - Official TAGO nodeId / terminalId values are verified or dynamically resolved against apis.data.go.kr
 *   when DATA_GO_KR_SERVICE_KEY is configured on the server.
 */

export interface KtxStationRecord {
  id: string;
  code: string;
  nameEn: string;
  nameKo: string;
  cityEn: string;
  cityKo: string;
  region: string;
  /** Official TAGO cityCode used by TrainInfoService/getCtyAcctoTrainSttnList */
  tagoCityCode: string;
  /** Official Korean station name used for exact TAGO station resolution */
  tagoLookupName: string;
  /** Verified TAGO nodeId when directly known (e.g., NAT010000 for Seoul) */
  tagoNodeId?: string;
  operators: ('Korail' | 'SRT')[];
  lines: string[];
  popular: boolean;
  aliases: string[];
}

export type BusServiceCategory = 'express' | 'intercity' | 'both';

export interface BusTerminalRecord {
  id: string;
  code: string;
  nameEn: string;
  nameKo: string;
  cityEn: string;
  cityKo: string;
  region: string;
  busModes: BusServiceCategory;
  /** Official TAGO Express Bus terminalId when directly known */
  tagoExpressTerminalId?: string;
  /** Korean search term for TAGO ExpBusInfoService/getExpBusTrminlList */
  tagoExpressLookupName?: string;
  /** Korean search term for TAGO SuberbsBusInfoService/getSuberbsBusTrminlList */
  tagoIntercityLookupName?: string;
  bookingPlatforms: ('kobus' | 'bustago' | 'txbus')[];
  popular: boolean;
  aliases: string[];
}

export interface OfficialExternalBookingUrls {
  korailWebUrl: string;
  korailTalkAndroidUrl: string;
  korailTalkIosUrl: string;
  srtWebUrl: string;
  kobusWebUrl: string;
  bustagoWebUrl: string;
  txbusWebUrl: string;
  kakaoTaxiUrl: string;
}

export const DEFAULT_OFFICIAL_BOOKING_URLS: OfficialExternalBookingUrls = {
  korailWebUrl: 'https://www.letskorail.com',
  korailTalkAndroidUrl: 'https://play.google.com/store/apps/details?id=com.korail.talk',
  korailTalkIosUrl: 'https://apps.apple.com/kr/app/id1000558562',
  srtWebUrl: 'https://etk.srail.kr',
  kobusWebUrl: 'https://www.kobus.co.kr/',
  bustagoWebUrl: 'https://www.bustago.or.kr/',
  txbusWebUrl: 'https://txbus.t-money.co.kr/',
  kakaoTaxiUrl: 'https://www.kakaocorp.com/page/service/service/KakaoT',
};

export const VERIFIED_KTX_STATIONS: KtxStationRecord[] = [
  {
    id: 'seoul',
    code: 'SEL',
    nameEn: 'Seoul Station',
    nameKo: '서울역',
    cityEn: 'Seoul',
    cityKo: '서울',
    region: 'Seoul',
    tagoCityCode: '11',
    tagoLookupName: '서울',
    tagoNodeId: 'NAT010000',
    operators: ['Korail'],
    lines: ['Gyeongbu Line', 'Gangneung Line', 'Gyeongjeon Line', 'Donghae Line'],
    popular: true,
    aliases: ['seoul', 'seoul station', '서울', '서울역'],
  },
  {
    id: 'yongsan',
    code: 'YSN',
    nameEn: 'Yongsan Station',
    nameKo: '용산역',
    cityEn: 'Seoul',
    cityKo: '서울',
    region: 'Seoul',
    tagoCityCode: '11',
    tagoLookupName: '용산',
    tagoNodeId: 'NAT010032',
    operators: ['Korail'],
    lines: ['Honam Line', 'Jeolla Line'],
    popular: true,
    aliases: ['yongsan', 'seoul yongsan', '용산', '용산역'],
  },
  {
    id: 'suseo',
    code: 'SSR',
    nameEn: 'Suseo Station (SRT)',
    nameKo: '수서역 (SRT)',
    cityEn: 'Seoul (Gangnam)',
    cityKo: '서울 수서',
    region: 'Seoul',
    tagoCityCode: '11',
    tagoLookupName: '수서',
    operators: ['SRT'],
    lines: ['SRT Gyeongbu Line', 'SRT Honam Line', 'SRT Jeolla Line', 'SRT Donghae Line'],
    popular: true,
    aliases: ['suseo', 'srt', 'gangnam', '수서', '수서역'],
  },
  {
    id: 'busan',
    code: 'BSN',
    nameEn: 'Busan Station',
    nameKo: '부산역',
    cityEn: 'Busan',
    cityKo: '부산',
    region: 'Busan',
    tagoCityCode: '21',
    tagoLookupName: '부산',
    tagoNodeId: 'NAT014445',
    operators: ['Korail', 'SRT'],
    lines: ['Gyeongbu Line', 'SRT Gyeongbu Line'],
    popular: true,
    aliases: ['busan', 'pusan', '부산', '부산역'],
  },
  {
    id: 'daejeon',
    code: 'DJN',
    nameEn: 'Daejeon Station',
    nameKo: '대전역',
    cityEn: 'Daejeon',
    cityKo: '대전',
    region: 'Daejeon',
    tagoCityCode: '25',
    tagoLookupName: '대전',
    tagoNodeId: 'NAT011668',
    operators: ['Korail', 'SRT'],
    lines: ['Gyeongbu Line', 'SRT Gyeongbu Line'],
    popular: true,
    aliases: ['daejeon', '대전', '대전역'],
  },
  {
    id: 'dongdaegu',
    code: 'DDG',
    nameEn: 'Dongdaegu Station (Daegu)',
    nameKo: '동대구역',
    cityEn: 'Daegu',
    cityKo: '대구',
    region: 'Daegu',
    tagoCityCode: '22',
    tagoLookupName: '동대구',
    tagoNodeId: 'NAT013271',
    operators: ['Korail', 'SRT'],
    lines: ['Gyeongbu Line', 'SRT Gyeongbu Line', 'Donghae Line'],
    popular: true,
    aliases: ['daegu', 'dongdaegu', '대구', '동대구', '동대구역'],
  },
  {
    id: 'gwangju_songjeong',
    code: 'GWJ',
    nameEn: 'Gwangju-Songjeong Station',
    nameKo: '광주송정역',
    cityEn: 'Gwangju',
    cityKo: '광주',
    region: 'Gwangju',
    tagoCityCode: '24',
    tagoLookupName: '광주송정',
    operators: ['Korail', 'SRT'],
    lines: ['Honam Line', 'SRT Honam Line'],
    popular: true,
    aliases: ['gwangju', 'gwangju songjeong', 'songjeong', '광주', '광주송정', '광주송정역'],
  },
  {
    id: 'ulsan',
    code: 'USN',
    nameEn: 'Ulsan Station (Tongdosa)',
    nameKo: '울산(통도사)역',
    cityEn: 'Ulsan',
    cityKo: '울산',
    region: 'Ulsan',
    tagoCityCode: '26',
    tagoLookupName: '울산(통도사)',
    operators: ['Korail', 'SRT'],
    lines: ['Gyeongbu Line', 'SRT Gyeongbu Line'],
    popular: true,
    aliases: ['ulsan', 'tongdosa', '울산', '울산역', '울산(통도사)'],
  },
  {
    id: 'suwon',
    code: 'SWN',
    nameEn: 'Suwon Station',
    nameKo: '수원역',
    cityEn: 'Suwon',
    cityKo: '수원',
    region: 'Gyeonggi',
    tagoCityCode: '31',
    tagoLookupName: '수원',
    operators: ['Korail'],
    lines: ['Gyeongbu Line (via Suwon)'],
    popular: true,
    aliases: ['suwon', '수원', '수원역'],
  },
  {
    id: 'jeonju',
    code: 'JNJ',
    nameEn: 'Jeonju Station',
    nameKo: '전주역',
    cityEn: 'Jeonju',
    cityKo: '전주',
    region: 'Jeonbuk',
    tagoCityCode: '35',
    tagoLookupName: '전주',
    operators: ['Korail', 'SRT'],
    lines: ['Jeolla Line', 'SRT Jeolla Line'],
    popular: true,
    aliases: ['jeonju', '전주', '전주역'],
  },
  {
    id: 'mokpo',
    code: 'MKP',
    nameEn: 'Mokpo Station',
    nameKo: '목포역',
    cityEn: 'Mokpo',
    cityKo: '목포',
    region: 'Jeonnam',
    tagoCityCode: '36',
    tagoLookupName: '목포',
    operators: ['Korail', 'SRT'],
    lines: ['Honam Line', 'SRT Honam Line'],
    popular: false,
    aliases: ['mokpo', '목포', '목포역'],
  },
  {
    id: 'gangneung',
    code: 'GNG',
    nameEn: 'Gangneung Station',
    nameKo: '강릉역',
    cityEn: 'Gangneung',
    cityKo: '강릉',
    region: 'Gangwon',
    tagoCityCode: '32',
    tagoLookupName: '강릉',
    operators: ['Korail'],
    lines: ['Gangneung Line (KTX-Eum)'],
    popular: true,
    aliases: ['gangneung', 'kangnung', '강릉', '강릉역'],
  },
  {
    id: 'pohang',
    code: 'PHG',
    nameEn: 'Pohang Station',
    nameKo: '포항역',
    cityEn: 'Pohang',
    cityKo: '포항',
    region: 'Gyeongbuk',
    tagoCityCode: '37',
    tagoLookupName: '포항',
    operators: ['Korail', 'SRT'],
    lines: ['Donghae Line', 'SRT Donghae Line'],
    popular: false,
    aliases: ['pohang', '포항', '포항역'],
  },
  {
    id: 'cheonan_asan',
    code: 'CAS',
    nameEn: 'Cheonan-Asan Station',
    nameKo: '천안아산역',
    cityEn: 'Cheonan / Asan',
    cityKo: '천안아산',
    region: 'Chungnam',
    tagoCityCode: '34',
    tagoLookupName: '천안아산',
    operators: ['Korail', 'SRT'],
    lines: ['Gyeongbu Line', 'Honam Line', 'SRT'],
    popular: true,
    aliases: ['cheonan', 'asan', 'cheonan-asan', '천안', '아산', '천안아산', '천안아산역'],
  },
  {
    id: 'osong',
    code: 'OSG',
    nameEn: 'Osong Station',
    nameKo: '오송역',
    cityEn: 'Cheongju (Osong)',
    cityKo: '오송',
    region: 'Chungbuk',
    tagoCityCode: '33',
    tagoLookupName: '오송',
    operators: ['Korail', 'SRT'],
    lines: ['Gyeongbu Line', 'Honam Line', 'SRT'],
    popular: false,
    aliases: ['osong', 'cheongju', 'sejong', '오송', '오송역'],
  },
  {
    id: 'iksan',
    code: 'IKS',
    nameEn: 'Iksan Station',
    nameKo: '익산역',
    cityEn: 'Iksan',
    cityKo: '익산',
    region: 'Jeonbuk',
    tagoCityCode: '35',
    tagoLookupName: '익산',
    operators: ['Korail', 'SRT'],
    lines: ['Honam Line', 'Jeolla Line', 'SRT'],
    popular: false,
    aliases: ['iksan', '익산', '익산역'],
  },
  {
    id: 'suncheon',
    code: 'SCH',
    nameEn: 'Suncheon Station',
    nameKo: '순천역',
    cityEn: 'Suncheon',
    cityKo: '순천',
    region: 'Jeonnam',
    tagoCityCode: '36',
    tagoLookupName: '순천',
    operators: ['Korail', 'SRT'],
    lines: ['Jeolla Line', 'SRT Jeolla Line'],
    popular: false,
    aliases: ['suncheon', '순천', '순천역'],
  },
  {
    id: 'yeosu_expo',
    code: 'YSE',
    nameEn: 'Yeosu-EXPO Station',
    nameKo: '여수엑스포역',
    cityEn: 'Yeosu',
    cityKo: '여수',
    region: 'Jeonnam',
    tagoCityCode: '36',
    tagoLookupName: '여수EXPO',
    operators: ['Korail', 'SRT'],
    lines: ['Jeolla Line', 'SRT Jeolla Line'],
    popular: false,
    aliases: ['yeosu', 'yeosu expo', '여수', '여수엑스포'],
  },
];

export const VERIFIED_BUS_TERMINALS: BusTerminalRecord[] = [
  {
    id: 'seoul_gyeongbu',
    code: 'SGB',
    nameEn: 'Seoul Express Bus Terminal (Gyeongbu)',
    nameKo: '서울고속버스터미널 (경부선)',
    cityEn: 'Seoul',
    cityKo: '서울',
    region: 'Seoul',
    busModes: 'express',
    tagoExpressTerminalId: 'NAEK010',
    tagoExpressLookupName: '서울경부',
    bookingPlatforms: ['kobus'],
    popular: true,
    aliases: ['seoul', 'seoul express', 'gyeongbu', 'gangnam terminal', '서울', '서울경부', '고속터미널'],
  },
  {
    id: 'central_city_seoul',
    code: 'CCS',
    nameEn: 'Central City Terminal (Seoul Honam)',
    nameKo: '센트럴시티터미널 (호남선)',
    cityEn: 'Seoul',
    cityKo: '서울',
    region: 'Seoul',
    busModes: 'express',
    tagoExpressTerminalId: 'NAEK020',
    tagoExpressLookupName: '센트럴시티(서울)',
    bookingPlatforms: ['kobus'],
    popular: true,
    aliases: ['central city', 'seoul honam', '센트럴시티', '호남선', '서울'],
  },
  {
    id: 'dong_seoul',
    code: 'DSL',
    nameEn: 'Dong Seoul Bus Terminal',
    nameKo: '동서울종합터미널',
    cityEn: 'Seoul',
    cityKo: '서울',
    region: 'Seoul',
    busModes: 'both',
    tagoExpressTerminalId: 'NAEK032',
    tagoExpressLookupName: '동서울',
    tagoIntercityLookupName: '동서울',
    bookingPlatforms: ['kobus', 'txbus', 'bustago'],
    popular: true,
    aliases: ['dong seoul', 'gangbyeon', '동서울', '동서울터미널', '서울'],
  },
  {
    id: 'seoul_nambu',
    code: 'SNB',
    nameEn: 'Seoul Nambu Bus Terminal',
    nameKo: '서울남부터미널',
    cityEn: 'Seoul',
    cityKo: '서울',
    region: 'Seoul',
    busModes: 'intercity',
    tagoIntercityLookupName: '서울남부',
    bookingPlatforms: ['txbus', 'bustago'],
    popular: false,
    aliases: ['nambu', 'seoul nambu', '남부터미널', '서울남부'],
  },
  {
    id: 'busan_central',
    code: 'BSN',
    nameEn: 'Busan Central Bus Terminal (Nopo)',
    nameKo: '부산종합버스터미널 (노포)',
    cityEn: 'Busan',
    cityKo: '부산',
    region: 'Busan',
    busModes: 'both',
    tagoExpressTerminalId: 'NAEK700',
    tagoExpressLookupName: '부산',
    tagoIntercityLookupName: '부산동부',
    bookingPlatforms: ['kobus', 'bustago', 'txbus'],
    popular: true,
    aliases: ['busan', 'busan central', 'nopo', '부산', '부산종합', '노포'],
  },
  {
    id: 'busan_seobu',
    code: 'BSW',
    nameEn: 'Busan Seobu Bus Terminal (Sasang)',
    nameKo: '부산서부버스터미널 (사상)',
    cityEn: 'Busan',
    cityKo: '부산',
    region: 'Busan',
    busModes: 'both',
    tagoExpressLookupName: '부산사상',
    tagoIntercityLookupName: '부산서부',
    bookingPlatforms: ['kobus', 'bustago', 'txbus'],
    popular: true,
    aliases: ['busan seobu', 'sasang', '부산서부', '사상'],
  },
  {
    id: 'daegu_dongdaegu',
    code: 'DGU',
    nameEn: 'Dongdaegu Terminal (Daegu)',
    nameKo: '동대구터미널',
    cityEn: 'Daegu',
    cityKo: '대구',
    region: 'Daegu',
    busModes: 'both',
    tagoExpressLookupName: '동대구',
    tagoIntercityLookupName: '동대구',
    bookingPlatforms: ['kobus', 'txbus', 'bustago'],
    popular: true,
    aliases: ['daegu', 'dongdaegu', '대구', '동대구'],
  },
  {
    id: 'daejeon_complex',
    code: 'DJN',
    nameEn: 'Daejeon Complex Bus Terminal',
    nameKo: '대전복합터미널',
    cityEn: 'Daejeon',
    cityKo: '대전',
    region: 'Daejeon',
    busModes: 'both',
    tagoExpressLookupName: '대전복합',
    tagoIntercityLookupName: '대전복합',
    bookingPlatforms: ['kobus', 'txbus', 'bustago'],
    popular: true,
    aliases: ['daejeon', '대전', '대전복합'],
  },
  {
    id: 'gwangju_usquare',
    code: 'GWJ',
    nameEn: 'Gwangju Bus Terminal (U-Square)',
    nameKo: '광주종합버스터미널 (유·스퀘어)',
    cityEn: 'Gwangju',
    cityKo: '광주',
    region: 'Gwangju',
    busModes: 'both',
    tagoExpressLookupName: '광주(유·스퀘어)',
    tagoIntercityLookupName: '광주(유·스퀘어)',
    bookingPlatforms: ['kobus', 'txbus', 'bustago'],
    popular: true,
    aliases: ['gwangju', 'u-square', 'usquare', '광주', '유스퀘어'],
  },
  {
    id: 'incheon_terminal',
    code: 'ICN',
    nameEn: 'Incheon Bus Terminal',
    nameKo: '인천종합터미널',
    cityEn: 'Incheon',
    cityKo: '인천',
    region: 'Incheon',
    busModes: 'both',
    tagoExpressLookupName: '인천',
    tagoIntercityLookupName: '인천',
    bookingPlatforms: ['kobus', 'bustago', 'txbus'],
    popular: true,
    aliases: ['incheon', '인천', '인천터미널'],
  },
  {
    id: 'suwon_terminal',
    code: 'SWN',
    nameEn: 'Suwon Bus Terminal',
    nameKo: '수원버스터미널',
    cityEn: 'Suwon',
    cityKo: '수원',
    region: 'Gyeonggi',
    busModes: 'both',
    tagoExpressLookupName: '수원',
    tagoIntercityLookupName: '수원',
    bookingPlatforms: ['kobus', 'bustago', 'txbus'],
    popular: true,
    aliases: ['suwon', '수원', '수원터미널'],
  },
  {
    id: 'jeonju_terminal',
    code: 'JNJ',
    nameEn: 'Jeonju Bus Terminal',
    nameKo: '전주고속·시외버스터미널',
    cityEn: 'Jeonju',
    cityKo: '전주',
    region: 'Jeonbuk',
    busModes: 'both',
    tagoExpressLookupName: '전주',
    tagoIntercityLookupName: '전주',
    bookingPlatforms: ['kobus', 'txbus', 'bustago'],
    popular: true,
    aliases: ['jeonju', '전주', '전주터미널'],
  },
  {
    id: 'ulsan_terminal',
    code: 'USN',
    nameEn: 'Ulsan Bus Terminal',
    nameKo: '울산고속·시외버스터미널',
    cityEn: 'Ulsan',
    cityKo: '울산',
    region: 'Ulsan',
    busModes: 'both',
    tagoExpressLookupName: '울산',
    tagoIntercityLookupName: '울산',
    bookingPlatforms: ['kobus', 'bustago', 'txbus'],
    popular: false,
    aliases: ['ulsan', '울산', '울산터미널'],
  },
  {
    id: 'pohang_terminal',
    code: 'PHG',
    nameEn: 'Pohang Bus Terminal',
    nameKo: '포항고속·시외버스터미널',
    cityEn: 'Pohang',
    cityKo: '포항',
    region: 'Gyeongbuk',
    busModes: 'both',
    tagoExpressLookupName: '포항',
    tagoIntercityLookupName: '포항',
    bookingPlatforms: ['kobus', 'bustago', 'txbus'],
    popular: false,
    aliases: ['pohang', '포항', '포항터미널'],
  },
  {
    id: 'gangneung_terminal',
    code: 'GNG',
    nameEn: 'Gangneung Express & Intercity Terminal',
    nameKo: '강릉고속·시외버스터미널',
    cityEn: 'Gangneung',
    cityKo: '강릉',
    region: 'Gangwon',
    busModes: 'both',
    tagoExpressLookupName: '강릉',
    tagoIntercityLookupName: '강릉',
    bookingPlatforms: ['kobus', 'txbus', 'bustago'],
    popular: false,
    aliases: ['gangneung', '강릉', '강릉터미널'],
  },
];

/**
 * Returns current date & time parts strictly in Asia/Seoul (KST, UTC+9).
 */
export function getKstNowParts(referenceDate = new Date()): {
  dateStr: string;
  compactDate: string;
  timeStr: string;
  hours: number;
  minutes: number;
  totalMinutes: number;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(referenceDate);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const year = pick('year');
  const month = pick('month');
  const day = pick('day');
  let hourNum = Number(pick('hour'));
  if (hourNum === 24) hourNum = 0;
  const minNum = Number(pick('minute'));
  const hh = String(hourNum).padStart(2, '0');
  const mm = String(minNum).padStart(2, '0');

  return {
    dateStr: `${year}-${month}-${day}`,
    compactDate: `${year}${month}${day}`,
    timeStr: `${hh}:${mm}`,
    hours: hourNum,
    minutes: minNum,
    totalMinutes: hourNum * 60 + minNum,
  };
}

export function isValidIsoDateString(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [y, m, d] = val.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTimeHHmm(val: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(val);
}

export function timeHHmmToMinutes(val: string): number {
  const [h, m] = val.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Parses TAGO 14-digit (YYYYMMDDHHmmss) or 12-digit (YYYYMMDDHHmm) KST timestamp into clean fields.
 */
export function parseTagoTimestampKst(raw: string | number | null | undefined): {
  isoKst: string;
  dateStr: string;
  timeHHmm: string;
  epochMs: number;
} | null {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 12) return null;
  const yyyy = digits.slice(0, 4);
  const mm = digits.slice(4, 6);
  const dd = digits.slice(6, 8);
  const hh = digits.slice(8, 10);
  const mi = digits.slice(10, 12);
  const ss = digits.length >= 14 ? digits.slice(12, 14) : '00';
  const isoKst = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+09:00`;
  const ms = Date.parse(isoKst);
  if (Number.isNaN(ms)) return null;
  return {
    isoKst,
    dateStr: `${yyyy}-${mm}-${dd}`,
    timeHHmm: `${hh}:${mi}`,
    epochMs: ms,
  };
}
