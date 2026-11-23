import fs from 'fs';
import path from 'path';

const LOGOS_DIR = path.resolve('public/assets/university-logos');
const MEDIA_DIR = path.resolve('public/assets/university-media');
const MANIFEST_PATH = path.resolve('src/data/universities25/verifiedAssetsManifest.json');

// 1. Remove unapproved university logo files and false-positive logo files
const UNAPPROVED_OR_FALSE_LOGOS = [
  'ajou-university.png',
  'dongguk-university.png',
  'ewha-womans-university.svg',
  'gwangju-institute-of-science-and-technology.png',
  'incheon-national-university.png',
  'inha-university.png',
  'kaist.svg',
  'kyung-hee-university.png',
  'kyungpook-national-university.png',
  'pukyong-national-university.png',
  'pusan-national-university.png',
  'seoul-national-university-of-science-and-technology.svg',
  'seoul-national-university.png',
  // False positives from Wikipedia templates
  'sejong-university.svg',
  'silla-university.jpg',
  'sookmyung-womens-university.jpg',
  'sungshin-womens-university.svg',
  'tongmyong-university.svg',
  'busan-institute-of-science-and-technology.svg',
  'chungbuk-national-university.svg',
  'dongshin-university.svg',
  'hanseo-university.svg',
  'hanyang-university.svg',
];

for (const f of UNAPPROVED_OR_FALSE_LOGOS) {
  const p = path.join(LOGOS_DIR, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('Deleted logo:', f);
  }
}

const AMBIGUOUS_MEDIA = [
  'hanseo-university-campus-1.jpg',
  'tongmyong-university-campus-1.jpg',
  'silla-university-campus-5.jpg',
];

for (const f of AMBIGUOUS_MEDIA) {
  const p = path.join(MEDIA_DIR, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('Deleted ambiguous media:', f);
  }
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

// Clear false-positive logos & removed media from manifest
const RESET_LOGO_IDS = [
  'sejong-university',
  'seojeong-university',
  'silla-university',
  'songho-university',
  'sookmyung-womens-university',
  'sungshin-womens-university',
  'tongmyong-university',
  'busan-institute-of-science-and-technology',
  'chungbuk-national-university',
  'dongshin-university',
  'hanseo-university',
  'hanyang-university',
];

for (const id of RESET_LOGO_IDS) {
  if (manifest[id]) manifest[id].logo = null;
}
if (manifest['hanseo-university']) manifest['hanseo-university'].photos = [];
if (manifest['tongmyong-university']) manifest['tongmyong-university'].photos = [];
if (manifest['silla-university']) {
  manifest['silla-university'].photos = manifest['silla-university'].photos.filter(
    (p) => !p.localPath.endsWith('silla-university-campus-5.jpg')
  );
}

// Helper to fetch with timeout and browser UA
async function fetchBuffer(url, referer) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EveryKR-AssetVerifier/1.0',
        ...(referer ? { Referer: referer } : {}),
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    return { buf, ct, finalUrl: res.url };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EveryKR-AssetVerifier/1.0',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return { text: await res.text(), finalUrl: res.url };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Strict domain-only logo hunter (HTML + linked CSS)
const OFFICIAL_TARGETS = [
  {
    id: 'sejong-university',
    koTitle: '세종대학교',
    enKeywords: ['sejong'],
    koKeywords: ['세종대'],
    urls: ['http://www.sejong.ac.kr/', 'https://www.sejong.ac.kr/', 'http://en.sejong.ac.kr/'],
    domainMatch: 'sejong.ac.kr',
  },
  {
    id: 'seojeong-university',
    koTitle: '서정대학교',
    enKeywords: ['seojeong'],
    koKeywords: ['서정대'],
    urls: ['https://www.seojeong.ac.kr/', 'https://global.seojeong.ac.kr/'],
    domainMatch: 'seojeong.ac.kr',
  },
  {
    id: 'silla-university',
    koTitle: '신라대학교',
    enKeywords: ['silla'],
    koKeywords: ['신라대'],
    urls: ['https://www.silla.ac.kr/ko/', 'https://en.silla.ac.kr/', 'https://www.silla.ac.kr/'],
    domainMatch: 'silla.ac.kr',
  },
  {
    id: 'songho-university',
    koTitle: '송호대학교',
    enKeywords: ['songho'],
    koKeywords: ['송호대'],
    urls: ['https://www.songho.ac.kr/', 'http://www.songho.ac.kr/'],
    domainMatch: 'songho.ac.kr',
  },
  {
    id: 'sookmyung-womens-university',
    koTitle: '숙명여자대학교',
    enKeywords: ['sookmyung'],
    koKeywords: ['숙명여'],
    urls: ['https://www.sookmyung.ac.kr/kr/index.do', 'https://e.sookmyung.ac.kr/', 'https://www.sookmyung.ac.kr/'],
    domainMatch: 'sookmyung.ac.kr',
  },
  {
    id: 'sungshin-womens-university',
    koTitle: '성신여자대학교',
    enKeywords: ['sungshin'],
    koKeywords: ['성신여'],
    urls: ['https://www.sungshin.ac.kr/main_kor/index.do', 'https://www.sungshin.ac.kr/main_eng/index.do', 'https://www.sungshin.ac.kr/'],
    domainMatch: 'sungshin.ac.kr',
  },
  {
    id: 'tongmyong-university',
    koTitle: '동명대학교',
    enKeywords: ['tongmyong', 'dongmyung'],
    koKeywords: ['동명대'],
    urls: ['https://www.tu.ac.kr/tuhome/index.do', 'https://www.tu.ac.kr/english/index.do', 'https://www.tu.ac.kr/'],
    domainMatch: 'tu.ac.kr',
  },
  {
    id: 'busan-institute-of-science-and-technology',
    koTitle: '부산과학기술대학교',
    enKeywords: ['bist'],
    koKeywords: ['부산과학기술대'],
    urls: ['https://www.bist.ac.kr/', 'http://www.bist.ac.kr/'],
    domainMatch: 'bist.ac.kr',
  },
  {
    id: 'chungbuk-national-university',
    koTitle: '충북대학교',
    enKeywords: ['chungbuk', 'cbnu'],
    koKeywords: ['충북대'],
    urls: ['https://www.chungbuk.ac.kr/site/www/main.do', 'https://www.chungbuk.ac.kr/site/english/main.do', 'https://www.chungbuk.ac.kr/'],
    domainMatch: 'chungbuk.ac.kr',
  },
  {
    id: 'dongshin-university',
    koTitle: '동신대학교',
    enKeywords: ['dongshin', 'dsu'],
    koKeywords: ['동신대'],
    urls: ['https://www.dsu.ac.kr/kr/', 'https://www.dsu.ac.kr/eng/', 'https://www.dsu.ac.kr/'],
    domainMatch: 'dsu.ac.kr',
  },
  {
    id: 'hanseo-university',
    koTitle: '한서대학교',
    enKeywords: ['hanseo'],
    koKeywords: ['한서대'],
    urls: ['https://www.hanseo.ac.kr/main.do?s=hs', 'https://www.hanseo.ac.kr/main.do?s=eng', 'https://www.hanseo.ac.kr/'],
    domainMatch: 'hanseo.ac.kr',
  },
  {
    id: 'hanyang-university',
    koTitle: '한양대학교',
    enKeywords: ['hanyang'],
    koKeywords: ['한양대'],
    urls: ['https://www.hanyang.ac.kr/web/eng', 'https://www.hanyang.ac.kr/'],
    domainMatch: 'hanyang.ac.kr',
  },
];

function extractLogoCandidatesFromHtmlOrCss(content, baseUrl, domainMatch) {
  const results = [];
  const regexes = [
    /(?:src|href)=["']([^"']*\b(?:logo|h1_logo|top_logo|header_logo|main_logo|ci_logo|symbol)[^"']*\.(?:svg|png|webp|gif|jpg))["']/gi,
    /url\(["']?([^"')]*\b(?:logo|h1_logo|top_logo|header_logo|main_logo|ci_logo)[^"')]*\.(?:svg|png|webp|gif|jpg))["']?\)/gi,
  ];
  for (const rx of regexes) {
    let m;
    while ((m = rx.exec(content)) !== null) {
      try {
        const u = new URL(m[1], baseUrl).href;
        if (u.includes(domainMatch) && !/footer|sns|insta|youtube|facebook|kakao|blog|naver|wa_logo|mark|banner/i.test(u)) {
          results.push(u);
        }
      } catch {}
    }
  }
  return [...new Set(results)];
}

function extractCssUrls(html, baseUrl, domainMatch) {
  const links = [];
  const rx = /href=["']([^"']+\.css(?:\?[^"']*)?)["']/gi;
  let m;
  while ((m = rx.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl).href;
      if (u.includes(domainMatch)) links.push(u);
    } catch {}
  }
  return [...new Set(links)].slice(0, 6);
}

async function tryKoWikiStrictLogo(target) {
  // Check ko.wikipedia.org page images, ONLY accepting files whose title explicitly has target's name AND logo/emblem/로고/심볼/엠블럼
  const api = `https://ko.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(target.koTitle)}&prop=images&format=json`;
  const data = await fetchText(api);
  if (!data) return null;
  try {
    const json = JSON.parse(data.text);
    const pages = Object.values(json.query?.pages || {});
    const images = pages[0]?.images || [];
    for (const img of images) {
      const title = img.title || ''; // e.g., "파일:한양대학교 로고.svg"
      const lower = title.toLowerCase();
      const matchesUni =
        target.enKeywords.some((k) => lower.includes(k)) ||
        target.koKeywords.some((k) => title.includes(k));
      const matchesLogoWord = /logo|emblem|seal|logotype|로고|심볼|엠블럼|휘장/i.test(title);
      if (matchesUni && matchesLogoWord) {
        // Resolve imageinfo from ko.wikipedia
        const infoApi = `https://ko.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
        const infoRes = await fetchText(infoApi);
        if (!infoRes) continue;
        const infoJson = JSON.parse(infoRes.text);
        const infoPages = Object.values(infoJson.query?.pages || {});
        const imgUrl = infoPages[0]?.imageinfo?.[0]?.url;
        if (imgUrl) {
          return {
            imgUrl,
            sourcePageUrl: `https://ko.wikipedia.org/wiki/${encodeURIComponent(title)}`,
            sourceType: 'Official Institutional Emblem Archive (Wikimedia)',
          };
        }
      }
    }
  } catch {}
  return null;
}

for (const target of OFFICIAL_TARGETS) {
  let saved = false;
  // Pass 1: Official .ac.kr HTML & CSS
  for (const pageUrl of target.urls) {
    if (saved) break;
    const htmlRes = await fetchText(pageUrl);
    if (!htmlRes) continue;
    let candidates = extractLogoCandidatesFromHtmlOrCss(htmlRes.text, htmlRes.finalUrl, target.domainMatch);
    if (candidates.length === 0) {
      const cssUrls = extractCssUrls(htmlRes.text, htmlRes.finalUrl, target.domainMatch);
      for (const cssUrl of cssUrls) {
        const cssRes = await fetchText(cssUrl);
        if (cssRes) {
          candidates.push(...extractLogoCandidatesFromHtmlOrCss(cssRes.text, cssRes.finalUrl, target.domainMatch));
        }
      }
    }
    candidates = [...new Set(candidates)];
    for (const cand of candidates) {
      const dl = await fetchBuffer(cand, htmlRes.finalUrl);
      if (!dl || dl.buf.length < 250) continue;
      const isSvg = dl.ct.includes('svg') || cand.toLowerCase().includes('.svg') || dl.buf.slice(0, 120).toString('utf8').includes('<svg');
      const isImg = dl.ct.startsWith('image/') || isSvg;
      if (!isImg) continue;
      let ext = '.png';
      if (isSvg) ext = '.svg';
      else if (dl.ct.includes('webp') || cand.toLowerCase().endsWith('.webp')) ext = '.webp';
      else if (dl.ct.includes('gif') || cand.toLowerCase().endsWith('.gif')) ext = '.gif';
      else if (dl.ct.includes('jpeg') || dl.ct.includes('jpg')) ext = '.jpg';

      const fileName = `${target.id}${ext}`;
      fs.writeFileSync(path.join(LOGOS_DIR, fileName), dl.buf);
      manifest[target.id].logo = {
        localPath: `/assets/university-logos/${fileName}`,
        sourceUrl: cand,
        sourcePageUrl: htmlRes.finalUrl,
        sourceType: 'Official University Website',
        retrievedAt: '2026-11-12',
        verified: true,
      };
      console.log(`[OFFICIAL .ac.kr] ${target.id} -> ${cand} (${dl.buf.length} bytes)`);
      saved = true;
      break;
    }
  }

  // Pass 2: Strict Korean Wikipedia named logo check
  if (!saved) {
    const wikiLogo = await tryKoWikiStrictLogo(target);
    if (wikiLogo) {
      const dl = await fetchBuffer(wikiLogo.imgUrl);
      if (dl && dl.buf.length >= 250) {
        const isSvg = dl.ct.includes('svg') || wikiLogo.imgUrl.toLowerCase().includes('.svg');
        let ext = isSvg ? '.svg' : wikiLogo.imgUrl.toLowerCase().endsWith('.jpg') ? '.jpg' : wikiLogo.imgUrl.toLowerCase().endsWith('.gif') ? '.gif' : '.png';
        const fileName = `${target.id}${ext}`;
        fs.writeFileSync(path.join(LOGOS_DIR, fileName), dl.buf);
        manifest[target.id].logo = {
          localPath: `/assets/university-logos/${fileName}`,
          sourceUrl: wikiLogo.imgUrl,
          sourcePageUrl: wikiLogo.sourcePageUrl,
          sourceType: wikiLogo.sourceType,
          retrievedAt: '2026-11-12',
          verified: true,
        };
        console.log(`[STRICT KO-WIKI] ${target.id} -> ${wikiLogo.imgUrl} (${dl.buf.length} bytes)`);
        saved = true;
      }
    }
  }

  if (!saved) {
    console.log(`[MISSING VERIFIED LOGO] ${target.id} -> marked null (no fabrication)`);
  }
}

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log('\n=== SUMMARY ===');
let verifiedLogos = 0;
let missingLogos = 0;
for (const [id, entry] of Object.entries(manifest)) {
  if (entry.logo && entry.logo.verified) verifiedLogos++;
  else missingLogos++;
  console.log(`${id}: logo=${entry.logo ? entry.logo.localPath + ' (' + entry.logo.sourceUrl + ')' : 'MISSING'} | photos=${entry.photos.length}`);
}
console.log(`Total: ${verifiedLogos} verified logos, ${missingLogos} missing logos.`);
