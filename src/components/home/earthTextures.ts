import * as THREE from 'three';

export interface EarthTextureBundle {
  dayMap: THREE.Texture;
  nightMap: THREE.Texture;
  bumpMap: THREE.Texture;
  roughnessMaskMap: THREE.Texture;
}

let cachedBundlePromise: Promise<EarthTextureBundle> | null = null;
let resolvedBundle: EarthTextureBundle | null = null;

export function getResolvedEarthTextures(): EarthTextureBundle | null {
  return resolvedBundle;
}

function loadImage(src: string, retries = 3): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const attempt = (remaining: number) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          resolve(img);
        } else if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), 150);
        } else {
          reject(new Error(`Loaded empty image for ${src}`));
        }
      };
      img.onerror = (err) => {
        if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), 150);
        } else {
          reject(err);
        }
      };
      img.src = src;
    };
    attempt(retries);
  });
}

function createPowerOfTwoTexture(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  maxAnisotropy: number
): THREE.Texture {
  let tex: THREE.Texture;

  if (img.naturalWidth === targetWidth && img.naturalHeight === targetHeight) {
    tex = new THREE.Texture(img);
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      tex = new THREE.CanvasTexture(canvas);
    } else {
      tex = new THREE.Texture(img);
    }
  }

  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  // Use NoColorSpace so WebGL2 does not apply hardware sRGB->Linear gamma darkening
  // prior to our custom satellite ShaderMaterial fragment pipeline.
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

function createProceduralFallbackBundle(maxAnisotropy: number): EarthTextureBundle {
  const createSolidCanvas = (r: number, g: number, b: number) => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 32;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, 64, 32);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = maxAnisotropy;
    t.needsUpdate = true;
    return t;
  };

  return {
    dayMap: createSolidCanvas(28, 92, 168),
    nightMap: createSolidCanvas(10, 28, 62),
    bumpMap: createSolidCanvas(0, 0, 0),
    roughnessMaskMap: createSolidCanvas(255, 255, 255),
  };
}

/**
 * Loads the high-resolution NASA Blue Marble & Black Marble satellite textures
 * from /assets/earth/ with zero blocking CPU pixel loops and zero artificial cloud overlays.
 * All color grading, bathymetric ocean depth, and city light extraction run in real time
 * on the GPU inside EARTH_FRAGMENT_SHADER.
 */
export function loadOrGenerateEarthTextures(maxAnisotropy = 8): Promise<EarthTextureBundle> {
  if (resolvedBundle) return Promise.resolve(resolvedBundle);
  if (cachedBundlePromise) return cachedBundlePromise;

  cachedBundlePromise = (async () => {
    try {
      const [dayImg, nightImg, topoImg, waterImg] = await Promise.all([
        loadImage('/assets/earth/earth-day.jpg'),
        loadImage('/assets/earth/earth-night.jpg'),
        loadImage('/assets/earth/earth-topology.png'),
        loadImage('/assets/earth/earth-water.png'),
      ]);

      const isMobileViewport =
        typeof window !== 'undefined' &&
        (window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

      const primaryWidth = isMobileViewport ? 2048 : 4096;
      const primaryHeight = isMobileViewport ? 1024 : 2048;
      const secondaryWidth = isMobileViewport ? 1024 : 2048;
      const secondaryHeight = isMobileViewport ? 512 : 1024;

      const bundle: EarthTextureBundle = {
        dayMap: createPowerOfTwoTexture(dayImg, primaryWidth, primaryHeight, maxAnisotropy),
        nightMap: createPowerOfTwoTexture(nightImg, secondaryWidth, secondaryHeight, maxAnisotropy),
        bumpMap: createPowerOfTwoTexture(topoImg, secondaryWidth, secondaryHeight, maxAnisotropy),
        roughnessMaskMap: createPowerOfTwoTexture(
          waterImg,
          secondaryWidth,
          secondaryHeight,
          maxAnisotropy
        ),
      };

      resolvedBundle = bundle;
      return bundle;
    } catch (err) {
      console.warn('Retrying Earth satellite texture load via TextureLoader:', err);
      try {
        const loader = new THREE.TextureLoader();
        const [dayTex, nightTex, bumpTex, waterTex] = await Promise.all([
          loader.loadAsync('/assets/earth/earth-day.jpg'),
          loader.loadAsync('/assets/earth/earth-night.jpg'),
          loader.loadAsync('/assets/earth/earth-topology.png'),
          loader.loadAsync('/assets/earth/earth-water.png'),
        ]);

        for (const tex of [dayTex, nightTex, bumpTex, waterTex]) {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.NoColorSpace;
          tex.anisotropy = maxAnisotropy;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = true;
          tex.needsUpdate = true;
        }

        const fallbackBundle: EarthTextureBundle = {
          dayMap: dayTex,
          nightMap: nightTex,
          bumpMap: bumpTex,
          roughnessMaskMap: waterTex,
        };
        resolvedBundle = fallbackBundle;
        return fallbackBundle;
      } catch {
        cachedBundlePromise = null;
        return createProceduralFallbackBundle(maxAnisotropy);
      }
    }
  })();

  return cachedBundlePromise;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  void loadOrGenerateEarthTextures().catch(() => {
    // Will retry on component mount if initial eager preload fails
  });
}

