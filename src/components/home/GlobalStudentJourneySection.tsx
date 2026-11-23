import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useApp } from '../../context/AppContext';
import {
  loadOrGenerateEarthTextures,
  getResolvedEarthTextures,
  EarthTextureBundle,
} from './earthTextures';
import {
  KOREA_DESTINATION,
  buildGreatCircleArcPoints,
  getOriginCountryByCode,
  sphereLatLonToVec3,
} from './globalJourneyData';

// ============================================================================
// CUSTOM GLSL SHADERS — SATELLITE-GRADE DAY/NIGHT EARTH + FEATHERED ATMOSPHERE
// ============================================================================

const EARTH_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vWorldTangent;
  varying vec3 vWorldBitangent;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vec3 wNormal = normalize(mat3(modelMatrix) * normal);
    vWorldNormal = wNormal;

    vec3 localUp = abs(wNormal.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 wTangent = normalize(cross(localUp, wNormal));
    vec3 wBitangent = cross(wNormal, wTangent);
    vWorldTangent = wTangent;
    vWorldBitangent = wBitangent;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const EARTH_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uBumpMap;
  uniform sampler2D uSpecMap;
  uniform vec3 uSunDirection;
  uniform float uNightBlend; // 0.0 = Day Mode, 1.0 = Night Mode
  uniform vec2 uBumpTexel;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vWorldTangent;
  varying vec3 vWorldBitangent;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(uSunDirection);

    // Subtle, clamped topographic normal perturbation from satellite elevation heightmap
    float hC = texture2D(uBumpMap, vUv).r;
    float hR = texture2D(uBumpMap, vUv + vec2(uBumpTexel.x, 0.0)).r;
    float hU = texture2D(uBumpMap, vUv + vec2(0.0, uBumpTexel.y)).r;
    float dHdU = clamp((hR - hC) * 1.15, -0.30, 0.30);
    float dHdV = clamp((hU - hC) * 1.15, -0.30, 0.30);

    vec3 perturbedN = normalize(
      N - dHdU * normalize(vWorldTangent) - dHdV * normalize(vWorldBitangent)
    );

    vec3 rawDay = texture2D(uDayMap, vUv).rgb;
    vec3 rawNight = texture2D(uNightMap, vUv).rgb;

    // In earth-water.png, water/oceans = 1.0 (white) and continents/land = 0.0 (black)
    float waterMask = texture2D(uSpecMap, vUv).r;
    float isOcean = smoothstep(0.28, 0.72, waterMask);

    // Preserve real NASA bathymetric relief (continental shelves, ridges, trenches)
    // while enriching ocean sapphire & coastal turquoise clarity
    float bathyLum = dot(rawDay, vec3(0.20, 0.45, 0.35));
    float shelfBoost = pow(clamp(bathyLum * 2.45, 0.0, 1.0), 0.85);
    float latAngle = (0.5 - vUv.y) * 3.14159265;
    float eqWarmth = max(0.0, cos(latAngle));

    vec3 oceanTarget = vec3(
      (14.0 + shelfBoost * 36.0 + eqWarmth * 6.0) / 255.0,
      (62.0 + shelfBoost * 90.0 + eqWarmth * 16.0) / 255.0,
      (136.0 + shelfBoost * 84.0 + eqWarmth * 18.0) / 255.0
    );
    vec3 gradedOcean = mix(rawDay, oceanTarget, 0.88);

    // Crisp, natural satellite land biomes (forests, mountains, plains, deserts)
    vec3 gradedLand = clamp(
      rawDay * vec3(1.08, 1.12, 1.05) + vec3(0.016, 0.024, 0.012),
      0.0,
      1.0
    );

    vec3 dayAlbedo = mix(gradedLand, gradedOcean, isOcean);

    // Balanced daylight illumination across the entire visible hemisphere
    // so no rotating continent or ocean ever drops into dark gray or black shadow
    float ndotl = dot(perturbedN, L);
    float rawNdotL = dot(N, L);
    float viewLight = max(dot(perturbedN, V), 0.0);

    float dayDiffuse = smoothstep(-0.45, 0.75, ndotl) * 0.24 + viewLight * 0.10 + 0.74;
    vec3 dayLit = clamp(dayAlbedo * dayDiffuse, 0.0, 1.0);

    // Subtle ocean sun glint (specular reflection strictly on water)
    vec3 H = normalize(L + V);
    float specBase = max(dot(perturbedN, H), 0.0);
    float specFactor = pow(specBase, 68.0) * isOcean * max(rawNdotL + 0.15, 0.0);
    vec3 daySpecular = vec3(0.76, 0.90, 1.0) * specFactor * 0.32;

    // Clean atmospheric horizon scattering on the Earth limb
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.4);
    vec3 dayAtmosphere = vec3(0.28, 0.66, 1.0) * fresnel * (0.38 + 0.22 * max(rawNdotL, 0.0));

    vec3 dayComposite = clamp(dayLit + daySpecular + dayAtmosphere, 0.0, 1.0);

    // Night mode: recognizable moonlit satellite terrain + deep sapphire oceans + warm city lights
    vec3 nightOcean = clamp(
      rawNight * vec3(0.70, 0.82, 0.95) + vec3(0.04, 0.11, 0.25) + gradedOcean * 0.22,
      0.0,
      1.0
    );
    vec3 nightLand = clamp(
      rawNight * vec3(1.15, 1.15, 1.22) + gradedLand * 0.28 + vec3(0.04, 0.08, 0.15),
      0.0,
      1.0
    );
    float nightRimLight = smoothstep(-0.60, 0.60, ndotl) * 0.34 + 0.66;
    vec3 nightBase = mix(nightLand, nightOcean, isOcean) * nightRimLight;

    float nightSpec = pow(specBase, 56.0) * isOcean * 0.18;
    vec3 nightOceanGlint = vec3(0.26, 0.54, 0.90) * nightSpec;

    // Extract warm city light emissions on continents from Black Marble
    float citySignal = max(0.0, rawNight.r * 0.55 + rawNight.g * 0.45 - rawNight.b * 0.62) * (1.0 - isOcean);
    float boostedCity = clamp(pow(citySignal * 2.25, 0.90), 0.0, 1.0);
    vec3 warmCityGlow = vec3(1.0, 0.84, 0.52) * boostedCity * 1.45;
    vec3 nightAtmosphere = vec3(0.16, 0.48, 0.92) * fresnel * 0.38;

    vec3 nightComposite = clamp(
      nightBase + nightOceanGlint + warmCityGlow + nightAtmosphere,
      0.0,
      1.0
    );

    vec3 surfaceColor = mix(dayComposite, nightComposite, uNightBlend);
    gl_FragColor = vec4(surfaceColor, 1.0);
  }
`;

const ATMOSPHERE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform float uNightBlend;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(uSunDirection);

    // On a BackSide sphere of radius 1.072 surrounding a radius 1.0 Earth:
    // viewDot is 0.0 at the outer boundary of the atmosphere sphere and ~-0.36 at Earth's limb.
    // Smoothly feather alpha to 0.000 before reaching viewDot = 0.0 so there is NEVER a hard outer edge.
    float viewDot = dot(N, V);
    float outerFade = smoothstep(-0.015, -0.34, viewDot);
    float sunExposure = smoothstep(-0.5, 0.65, dot(N, L)) * 0.55 + 0.45;

    vec3 dayHalo = vec3(0.32, 0.70, 1.0);
    vec3 nightHalo = vec3(0.15, 0.46, 0.90);
    vec3 haloColor = mix(dayHalo, nightHalo, uNightBlend);

    float alpha = pow(outerFade, 1.85) * sunExposure * mix(0.42, 0.34, uNightBlend);
    gl_FragColor = vec4(haloColor, alpha);
  }
`;

// ============================================================================
// ANATOMICALLY ACCURATE 3D WIDE-BODY COMMERCIAL PASSENGER AIRCRAFT (B787/A350)
// Local Coordinate Convention:
//   +Z = Nose (Forward direction of flight)
//   -Z = Tail (Aft)
//   +Y = Dorsal / Roof (Radially outward from Earth's surface)
//   +X / -X = Starboard / Port Wingspan
// ============================================================================

interface CommercialAircraftMeshProps {
  isNight: boolean;
}

const CommercialPassengerAircraft: React.FC<CommercialAircraftMeshProps> = ({ isNight }) => {
  // 1. Contoured Aerodynamic Fuselage (LatheGeometry along local Z axis: nose at +Z, tail at -Z)
  const fuselageGeo = useMemo(() => {
    // LatheGeometry revolves around Y axis; rotating X by +PI/2 maps +Y -> +Z (forward nose)
    const profilePoints: THREE.Vector2[] = [
      new THREE.Vector2(0.0, -1.05),    // Tail tip (-Z)
      new THREE.Vector2(0.036, -0.94),  // Tail cone rear
      new THREE.Vector2(0.082, -0.72),  // Tail cone mid
      new THREE.Vector2(0.122, -0.45),  // Rear cabin taper
      new THREE.Vector2(0.134, -0.15),  // Aft cabin cylinder
      new THREE.Vector2(0.134, 0.48),   // Forward cabin cylinder
      new THREE.Vector2(0.120, 0.70),   // Cockpit section taper
      new THREE.Vector2(0.086, 0.86),   // Nose radome upper
      new THREE.Vector2(0.040, 0.96),   // Nose radome tip taper
      new THREE.Vector2(0.0, 1.03),     // Nose apex (+Z)
    ];
    const geo = new THREE.LatheGeometry(profilePoints, 28);
    geo.rotateX(Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 2. Swept Supercritical Main Wings (Sweeping AFT toward -Z)
  const mainWingGeo = useMemo(() => {
    const shape = new THREE.Shape();
    // With geo.rotateX(+Math.PI / 2), 2D (X, Y) maps directly to 3D (X, +Z)
    // so positive Y is forward (+Z) and negative Y sweeps aft (-Z).
    shape.moveTo(0, 0.30);           // Center leading-edge wing root (forward of mid-cabin)
    shape.lineTo(0.36, 0.16);        // Inner leading edge (engine mount zone)
    shape.lineTo(1.30, -0.32);       // Swept outer leading edge (sweeping aft)
    shape.lineTo(1.40, -0.44);       // Raked wingtip leading edge
    shape.lineTo(1.35, -0.52);       // Wingtip trailing corner
    shape.lineTo(0.45, -0.18);       // Outer trailing edge
    shape.lineTo(0.14, -0.14);       // Yehudi flap kink (inner trailing edge)
    shape.lineTo(-0.14, -0.14);      // Port inner trailing edge
    shape.lineTo(-0.45, -0.18);      // Port outer trailing edge
    shape.lineTo(-1.35, -0.52);      // Port wingtip trailing corner
    shape.lineTo(-1.40, -0.44);      // Port raked wingtip leading edge
    shape.lineTo(-1.30, -0.32);      // Port swept outer leading edge
    shape.lineTo(-0.36, 0.16);       // Port inner leading edge
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.026,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.007,
      bevelThickness: 0.007,
    });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, -0.012, 0);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 3. Swept Horizontal Tail Stabilizers (At rear tailcone -Z, sweeping AFT)
  const tailplaneGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.66);
    shape.lineTo(0.48, -0.92);
    shape.lineTo(0.44, -1.02);
    shape.lineTo(0, -0.88);
    shape.lineTo(-0.44, -1.02);
    shape.lineTo(-0.48, -0.92);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.004,
      bevelThickness: 0.004,
    });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0.015, 0);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 4. Swept Vertical Tail Fin (Stabilizer at rear dorsal tailcone -Z)
  const verticalFinGeo = useMemo(() => {
    const shape = new THREE.Shape();
    // With geo.rotateY(-Math.PI / 2), 2D (X2d, Y2d) maps directly to 3D (Z = +X2d, Y = +Y2d)
    shape.moveTo(-0.52, 0.05);   // Fin leading-edge root on rear dorsal fuselage
    shape.lineTo(-0.92, 0.48);   // Swept leading-edge top tip
    shape.lineTo(-1.05, 0.45);   // Fin top trailing cap
    shape.lineTo(-0.96, 0.04);   // Fin trailing-edge root at tailcone
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.005,
      bevelThickness: 0.005,
    });
    geo.rotateY(-Math.PI / 2);
    geo.translate(0.011, 0, 0);
    geo.computeVertexNormals();
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      fuselageGeo.dispose();
      mainWingGeo.dispose();
      tailplaneGeo.dispose();
      verticalFinGeo.dispose();
    };
  }, [fuselageGeo, mainWingGeo, tailplaneGeo, verticalFinGeo]);

  return (
    <group scale={[0.042, 0.042, 0.042]}>
      {/* Sculpted Wide-Body Passenger Fuselage */}
      <mesh geometry={fuselageGeo}>
        <meshStandardMaterial
          color="#FFFFFF"
          emissive={isNight ? '#38BDF8' : '#1E40AF'}
          emissiveIntensity={isNight ? 0.24 : 0.09}
          roughness={0.16}
          metalness={0.28}
        />
      </mesh>

      {/* Royal Blue Airline Livery Cheatline Stripe Along Fuselage */}
      <mesh position={[0, -0.018, -0.02]} scale={[1.015, 0.32, 0.88]} geometry={fuselageGeo}>
        <meshStandardMaterial
          color="#1D4ED8"
          emissive="#3B82F6"
          emissiveIntensity={isNight ? 0.38 : 0.16}
          roughness={0.22}
          metalness={0.38}
        />
      </mesh>

      {/* Curved Dark Cockpit Windshield Visor at Forward Nose (+Z) */}
      <mesh position={[0, 0.068, 0.76]} rotation={[0.28, 0, 0]}>
        <sphereGeometry args={[0.086, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial
          color="#081428"
          emissive={isNight ? '#38BDF8' : '#000000'}
          emissiveIntensity={isNight ? 0.45 : 0}
          roughness={0.08}
          metalness={0.85}
        />
      </mesh>

      {/* Swept Supercritical Main Wings */}
      <mesh geometry={mainWingGeo}>
        <meshStandardMaterial
          color="#F8FAFC"
          emissive={isNight ? '#38BDF8' : '#1E3A8A'}
          emissiveIntensity={isNight ? 0.18 : 0.06}
          roughness={0.20}
          metalness={0.34}
        />
      </mesh>

      {/* Upturned Blended Winglets at Aft-Swept Wingtips */}
      <mesh position={[-1.36, 0.045, -0.46]} rotation={[-0.18, -0.22, 0.30]}>
        <boxGeometry args={[0.022, 0.14, 0.12]} />
        <meshStandardMaterial
          color="#1D4ED8"
          emissive="#4BA3FF"
          emissiveIntensity={0.38}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[1.36, 0.045, -0.46]} rotation={[-0.18, 0.22, -0.30]}>
        <boxGeometry args={[0.022, 0.14, 0.12]} />
        <meshStandardMaterial
          color="#1D4ED8"
          emissive="#4BA3FF"
          emissiveIntensity={0.38}
          roughness={0.2}
        />
      </mesh>

      {/* Port & Starboard Wingtip Navigation Lights */}
      <mesh position={[-1.38, 0.075, -0.47]}>
        <sphereGeometry args={[0.024, 8, 8]} />
        <meshBasicMaterial color="#F43F5E" />
      </mesh>
      <mesh position={[1.38, 0.075, -0.47]}>
        <sphereGeometry args={[0.024, 8, 8]} />
        <meshBasicMaterial color="#10B981" />
      </mesh>

      {/* Twin High-Bypass Turbofan Engine Nacelles & Pylons Under Main Wings */}
      {[-0.44, 0.44].map((xPos, idx) => (
        <group key={idx} position={[xPos, -0.078, 0.08]}>
          {/* Under-wing aerodynamic engine pylon */}
          <mesh position={[0, 0.042, -0.02]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.024, 0.055, 0.18]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.28} metalness={0.52} />
          </mesh>
          {/* Main turbofan nacelle cowling */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.066, 0.056, 0.27, 20]} />
            <meshStandardMaterial
              color="#FFFFFF"
              emissive={isNight ? '#38BDF8' : '#000000'}
              emissiveIntensity={isNight ? 0.16 : 0}
              roughness={0.16}
              metalness={0.42}
            />
          </mesh>
          {/* Silver metallic engine intake lip (+Z forward) */}
          <mesh position={[0, 0, 0.135]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.060, 0.008, 12, 20]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.12} metalness={0.85} />
          </mesh>
          {/* Dark turbofan intake fan blades */}
          <mesh position={[0, 0, 0.125]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.054, 0.054, 0.02, 16]} />
            <meshStandardMaterial color="#0F172A" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Swept Horizontal Tail Stabilizers at Rear Tailcone (-Z) */}
      <mesh geometry={tailplaneGeo}>
        <meshStandardMaterial color="#F1F5F9" roughness={0.22} metalness={0.32} />
      </mesh>

      {/* Swept Vertical Tail Fin with EVERYKR Royal Blue Livery at Rear Tailcone (-Z) */}
      <mesh geometry={verticalFinGeo}>
        <meshStandardMaterial
          color="#1D4ED8"
          emissive="#4BA3FF"
          emissiveIntensity={isNight ? 0.45 : 0.20}
          roughness={0.18}
          metalness={0.38}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// 3D FLIGHT ROUTE, PROGRESSIVE ROUTE ILLUMINATION & COMMERCIAL AIRCRAFT
// ============================================================================

const ROUTE_TUBULAR_SEGMENTS = 120;
const ROUTE_RADIAL_SEGMENTS = 8;
const INDICES_PER_SEGMENT = ROUTE_RADIAL_SEGMENTS * 6;

/**
 * Smooth takeoff acceleration, steady great-circle cruise, and smooth landing deceleration
 */
function easeFlightProgress(u: number): number {
  const x = Math.max(0, Math.min(1, u));
  // Smoothstep-blended linear cruise so velocity is 0 at departure (x=0) and landing (x=1)
  // while maintaining a natural, steady cruise across the middle of the journey.
  const smooth = x * x * (3 - 2 * x);
  return 0.35 * x + 0.65 * smooth;
}

interface FlightRoute3DProps {
  departureCountryCode: string;
  isNight: boolean;
}

const FlightRouteAndAirplane: React.FC<FlightRoute3DProps> = ({
  departureCountryCode,
  isNight,
}) => {
  const airplaneGroupRef = useRef<THREE.Group>(null);
  const shadowMeshRef = useRef<THREE.Mesh>(null);
  const originPulseRef = useRef<THREE.Mesh>(null);
  const destPulseRef = useRef<THREE.Mesh>(null);
  const destGlowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const cyclePhaseRef = useRef(0.10);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const originCountry = useMemo(
    () => getOriginCountryByCode(departureCountryCode),
    [departureCountryCode]
  );

  const isCompactRoute = originCountry.code === 'KR' || originCountry.code === 'JP';

  // Destination position on sphere surface (South Korea: 37.5665°N, 126.9780°E)
  const koreaSurfacePos = useMemo(() => {
    const [x, y, z] = sphereLatLonToVec3(
      KOREA_DESTINATION.coords.lat,
      KOREA_DESTINATION.coords.lon,
      1.004
    );
    return new THREE.Vector3(x, y, z);
  }, []);

  // Origin position on sphere surface
  const originSurfacePos = useMemo(() => {
    const [x, y, z] = sphereLatLonToVec3(
      originCountry.coords.lat,
      originCountry.coords.lon,
      1.004
    );
    return new THREE.Vector3(x, y, z);
  }, [originCountry.coords.lat, originCountry.coords.lon]);

  // Curved great-circle 3D trajectory from selected departure country to South Korea
  const flightCurve = useMemo(() => {
    const rawPts = buildGreatCircleArcPoints(
      originCountry.coords,
      KOREA_DESTINATION.coords,
      ROUTE_TUBULAR_SEGMENTS,
      originCountry.code === 'KR' ? 0.028 : 0.046
    );
    const vectors = rawPts.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    return new THREE.CatmullRomCurve3(vectors);
  }, [originCountry.code, originCountry.coords]);

  // 1. Subtle full-route guide arc
  const baseRouteTubeGeo = useMemo(() => {
    if (!flightCurve) return null;
    return new THREE.TubeGeometry(
      flightCurve,
      ROUTE_TUBULAR_SEGMENTS,
      0.0022,
      ROUTE_RADIAL_SEGMENTS,
      false
    );
  }, [flightCurve]);

  // 2. Progressively illuminated route arc (lights up from departure -> aircraft position)
  const activeRouteTubeGeo = useMemo(() => {
    if (!flightCurve) return null;
    return new THREE.TubeGeometry(
      flightCurve,
      ROUTE_TUBULAR_SEGMENTS,
      0.0031,
      ROUTE_RADIAL_SEGMENTS,
      false
    );
  }, [flightCurve]);

  // 3. Soft outer halo along the illuminated portion of the route
  const activeRouteGlowGeo = useMemo(() => {
    if (!flightCurve) return null;
    return new THREE.TubeGeometry(
      flightCurve,
      ROUTE_TUBULAR_SEGMENTS,
      0.0064,
      ROUTE_RADIAL_SEGMENTS,
      false
    );
  }, [flightCurve]);

  // 4. Subtle illuminated jet contrail directly behind the aircraft
  const aircraftTrailGeo = useMemo(() => {
    if (!flightCurve) return null;
    return new THREE.TubeGeometry(
      flightCurve,
      ROUTE_TUBULAR_SEGMENTS,
      0.0042,
      ROUTE_RADIAL_SEGMENTS,
      false
    );
  }, [flightCurve]);

  useEffect(() => {
    cyclePhaseRef.current = prefersReducedMotion ? 0.52 : 0.04;
    return () => {
      baseRouteTubeGeo?.dispose();
      activeRouteTubeGeo?.dispose();
      activeRouteGlowGeo?.dispose();
      aircraftTrailGeo?.dispose();
    };
  }, [
    baseRouteTubeGeo,
    activeRouteTubeGeo,
    activeRouteGlowGeo,
    aircraftTrailGeo,
    departureCountryCode,
    prefersReducedMotion,
  ]);

  // Helper quaternions to align surface markers tangent to the globe surface
  const originRingQuaternion = useMemo(() => {
    const normal = originSurfacePos.clone().normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return q;
  }, [originSurfacePos]);

  const koreaRingQuaternion = useMemo(() => {
    const normal = koreaSurfacePos.clone().normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return q;
  }, [koreaSurfacePos]);

  // Pre-allocated math objects for zero-GC animation loop
  const tempPos = useMemo(() => new THREE.Vector3(), []);
  const tempTangent = useMemo(() => new THREE.Vector3(), []);
  const tempNormal = useMemo(() => new THREE.Vector3(), []);
  const tempRight = useMemo(() => new THREE.Vector3(), []);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempShadowPos = useMemo(() => new THREE.Vector3(), []);
  const tempShadowNormal = useMemo(() => new THREE.Vector3(), []);
  const tempShadowQuat = useMemo(() => new THREE.Quaternion(), []);
  const unitZ = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    if (originPulseRef.current) {
      const s = 1 + Math.sin(elapsed * 2.0 + 1.1) * 0.16;
      originPulseRef.current.scale.set(s, s, 1);
    }

    if (
      flightCurve &&
      airplaneGroupRef.current &&
      activeRouteTubeGeo &&
      activeRouteGlowGeo &&
      aircraftTrailGeo
    ) {
      if (!prefersReducedMotion) {
        // Complete journey cycle in ~9.5 seconds (active flight + smooth arrival hold)
        cyclePhaseRef.current = (cyclePhaseRef.current + dt * 0.105) % 1;
      }

      const rawCycle = cyclePhaseRef.current;
      // 0.00 -> 0.92 is the active flight from Departure Country to South Korea;
      // 0.92 -> 1.00 is the smooth landing hold at South Korea before the next flight.
      const flightFraction = Math.min(1, rawCycle / 0.92);
      const t = easeFlightProgress(flightFraction);

      // Update progressive route illumination (0 -> t)
      const activeSegs = Math.max(1, Math.min(ROUTE_TUBULAR_SEGMENTS, Math.floor(t * ROUTE_TUBULAR_SEGMENTS)));
      const activeIndexCount = activeSegs * INDICES_PER_SEGMENT;
      activeRouteTubeGeo.setDrawRange(0, activeIndexCount);
      activeRouteGlowGeo.setDrawRange(0, activeIndexCount);

      // Update subtle illuminated trail behind the aircraft (max(0, t - 0.16) -> t)
      const trailStartT = Math.max(0, t - 0.16);
      const trailStartSeg = Math.floor(trailStartT * ROUTE_TUBULAR_SEGMENTS);
      const trailSegCount = Math.max(0, activeSegs - trailStartSeg);
      aircraftTrailGeo.setDrawRange(
        trailStartSeg * INDICES_PER_SEGMENT,
        trailSegCount * INDICES_PER_SEGMENT
      );

      // Enhance South Korea destination glow as the aircraft approaches (t > 0.62)
      const approachFactor = THREE.MathUtils.smoothstep(t, 0.62, 0.98);
      if (destPulseRef.current) {
        const basePulse = 1 + Math.sin(elapsed * 2.4) * 0.18;
        const s = basePulse + approachFactor * 0.42;
        destPulseRef.current.scale.set(s, s, 1);
      }
      if (destGlowMatRef.current) {
        destGlowMatRef.current.opacity = 0.72 + approachFactor * 0.28;
      }

      // Evaluate position and forward tangent along the great-circle route
      flightCurve.getPointAt(t, tempPos);
      flightCurve.getTangentAt(t, tempTangent).normalize();

      // Right-handed orthonormal basis (det = +1):
      //   Y = outward surface normal
      //   Z = forward flight tangent toward South Korea
      //   X = Y × Z (right-handed lateral axis so nose +Z strictly points along tempTangent)
      tempNormal.copy(tempPos).normalize();
      tempRight.crossVectors(tempNormal, tempTangent).normalize();
      tempNormal.crossVectors(tempTangent, tempRight).normalize();

      tempMatrix.makeBasis(tempRight, tempNormal, tempTangent);
      airplaneGroupRef.current.position.copy(tempPos);
      airplaneGroupRef.current.quaternion.setFromRotationMatrix(tempMatrix);

      // Smooth aircraft scale envelope at takeoff initiation and post-landing hold
      const takeoffScale = THREE.MathUtils.smoothstep(rawCycle, 0.0, 0.035);
      const arrivalScale = 1 - THREE.MathUtils.smoothstep(rawCycle, 0.94, 0.995);
      const routeScaleFactor = originCountry.code === 'KR' ? 0.68 : isCompactRoute ? 0.86 : 1.0;
      const envelope =
        (prefersReducedMotion ? 1 : Math.max(0.001, takeoffScale * arrivalScale)) *
        routeScaleFactor;
      airplaneGroupRef.current.scale.setScalar(envelope);

      // Position subtle surface drop-shadow directly on the Earth surface beneath the aircraft
      if (shadowMeshRef.current) {
        tempShadowNormal.copy(tempPos).normalize();
        tempShadowPos.copy(tempShadowNormal).multiplyScalar(1.002);
        shadowMeshRef.current.position.copy(tempShadowPos);
        tempShadowQuat.setFromUnitVectors(unitZ, tempShadowNormal);
        shadowMeshRef.current.quaternion.copy(tempShadowQuat);
        shadowMeshRef.current.scale.setScalar(envelope);
      }
    } else if (destPulseRef.current) {
      const s = 1 + Math.sin(elapsed * 2.4) * 0.20;
      destPulseRef.current.scale.set(s, s, 1);
    }
  });

  const routeBaseColor = isNight ? '#3B82F6' : '#60A5FA';
  const routeActiveColor = isNight ? '#7CC4FF' : '#2563EB';
  const routeGlowColor = isNight ? '#D6B875' : '#38BDF8';
  const trailColor = isNight ? '#F8FAFC' : '#EFF6FF';

  return (
    <group>
      {/* Geographically Accurate South Korea Destination Hub (37.5665°N, 126.9780°E) */}
      <group position={koreaSurfacePos} quaternion={koreaRingQuaternion}>
        <mesh>
          <circleGeometry args={[0.011, 24]} />
          <meshBasicMaterial color="#D6B875" side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={destPulseRef}>
          <ringGeometry args={[0.016, 0.024, 32]} />
          <meshBasicMaterial
            ref={destGlowMatRef}
            color="#4BA3FF"
            transparent
            opacity={0.82}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* International & Domestic Flight Route, Progressive Illumination, Contrail & 3D Commercial Aircraft */}
      {flightCurve &&
        baseRouteTubeGeo &&
        activeRouteTubeGeo &&
        activeRouteGlowGeo &&
        aircraftTrailGeo && (
          <>
            {/* Departure Country Origin Marker */}
            <group position={originSurfacePos} quaternion={originRingQuaternion}>
              <mesh>
                <circleGeometry args={[0.009, 24]} />
                <meshBasicMaterial color="#4BA3FF" side={THREE.DoubleSide} />
              </mesh>
              <mesh ref={originPulseRef}>
                <ringGeometry args={[0.013, 0.019, 28]} />
                <meshBasicMaterial
                  color="#D6B875"
                  transparent
                  opacity={0.75}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>

            {/* Base Full-Route Guide Line */}
            <mesh geometry={baseRouteTubeGeo}>
              <meshBasicMaterial
                color={routeBaseColor}
                transparent
                opacity={isNight ? 0.28 : 0.30}
                depthWrite={false}
              />
            </mesh>

            {/* Progressively Illuminated Route Line (Departure -> Aircraft) */}
            <mesh geometry={activeRouteTubeGeo}>
              <meshBasicMaterial
                color={routeActiveColor}
                transparent
                opacity={isNight ? 0.92 : 0.86}
              />
            </mesh>

            {/* Soft Illuminated Route Outer Halo */}
            <mesh geometry={activeRouteGlowGeo}>
              <meshBasicMaterial
                color={routeGlowColor}
                transparent
                opacity={isNight ? 0.26 : 0.20}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* Subtle Illuminated Trail Behind the Aircraft */}
            <mesh geometry={aircraftTrailGeo}>
              <meshBasicMaterial
                color={trailColor}
                transparent
                opacity={isNight ? 0.62 : 0.55}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* Soft Aircraft Shadow Projected onto the Earth Surface Below */}
            <mesh ref={shadowMeshRef}>
              <circleGeometry args={[0.022, 20]} />
              <meshBasicMaterial
                color="#020617"
                transparent
                opacity={isNight ? 0.22 : 0.30}
                depthWrite={false}
              />
            </mesh>

            {/* 3D Commercial Passenger Aircraft Flying Directly Above the Earth Surface */}
            <group ref={airplaneGroupRef}>
              <CommercialPassengerAircraft isNight={isNight} />
            </group>
          </>
        )}
    </group>
  );
};

// ============================================================================
// INTERACTIVE 3D EARTH SCENE (SATELLITE EARTH + SMOOTH DRAG + GENTLE DRIFT)
// ============================================================================

interface EarthSceneProps {
  isNight: boolean;
  textures: EarthTextureBundle;
  departureCountryCode: string;
}

const EarthScene: React.FC<EarthSceneProps> = ({
  isNight,
  textures,
  departureCountryCode,
}) => {
  const { gl } = useThree();
  const tiltGroupRef = useRef<THREE.Group>(null);
  const earthSpinRef = useRef<THREE.Group>(null);

  const originCountry = useMemo(
    () => getOriginCountryByCode(departureCountryCode),
    [departureCountryCode]
  );

  // Frame both the departure country and South Korea (126.98°E) prominently on the front hemisphere
  // using shortest-arc spherical longitude interpolation (supports trans-Pacific US -> KR and Middle East SA -> KR)
  const targetFocusLonRad = useMemo(() => {
    const koreaLon = KOREA_DESTINATION.coords.lon;
    if (originCountry.code === 'KR') {
      return -Math.PI / 2 - THREE.MathUtils.degToRad(126.5);
    }
    const depLon = originCountry.coords.lon;
    const shortestDeltaLon = ((depLon - koreaLon + 540) % 360) - 180;
    const midLon = koreaLon + shortestDeltaLon * 0.44;
    return -Math.PI / 2 - THREE.MathUtils.degToRad(midLon);
  }, [originCountry.code, originCountry.coords.lon]);

  const targetTiltX = useMemo(() => {
    if (originCountry.code === 'KR') return 0.26;
    const avgLat = (originCountry.coords.lat + KOREA_DESTINATION.coords.lat) * 0.5;
    return THREE.MathUtils.clamp(THREE.MathUtils.degToRad(avgLat * 0.46), 0.14, 0.34);
  }, [originCountry.code, originCountry.coords.lat]);

  const interactionRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    spinY: targetFocusLonRad,
    velX: 0,
    velY: 0,
    tiltX: 0.24,
  });

  // Ensure maximum grazing-angle sharpness and handle WebGL context loss/restoration gracefully
  useEffect(() => {
    const maxAniso = Math.min(8, gl.capabilities.getMaxAnisotropy?.() || 4);
    for (const tex of [
      textures.dayMap,
      textures.nightMap,
      textures.bumpMap,
      textures.roughnessMaskMap,
    ]) {
      if (tex.anisotropy !== maxAniso) {
        tex.anisotropy = maxAniso;
        tex.needsUpdate = true;
      }
    }

    const dom = gl.domElement;
    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    const onContextRestored = () => {
      for (const tex of [
        textures.dayMap,
        textures.nightMap,
        textures.bumpMap,
        textures.roughnessMaskMap,
      ]) {
        tex.needsUpdate = true;
      }
    };

    dom.addEventListener('webglcontextlost', onContextLost, false);
    dom.addEventListener('webglcontextrestored', onContextRestored, false);
    return () => {
      dom.removeEventListener('webglcontextlost', onContextLost, false);
      dom.removeEventListener('webglcontextrestored', onContextRestored, false);
    };
  }, [gl, textures]);

  const earthUniforms = useMemo(
    () => ({
      uDayMap: { value: textures.dayMap },
      uNightMap: { value: textures.nightMap },
      uBumpMap: { value: textures.bumpMap },
      uSpecMap: { value: textures.roughnessMaskMap },
      uSunDirection: { value: new THREE.Vector3(1.45, 0.55, 1.4).normalize() },
      uNightBlend: { value: isNight ? 1.0 : 0.0 },
      uBumpTexel: { value: new THREE.Vector2(1 / 2048, 1 / 1024) },
    }),
    [textures] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const atmosphereUniforms = useMemo(
    () => ({
      uSunDirection: { value: new THREE.Vector3(1.45, 0.55, 1.4).normalize() },
      uNightBlend: { value: isNight ? 1.0 : 0.0 },
    }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const earthGeo = useMemo(() => new THREE.SphereGeometry(1, 96, 64), []);
  const atmoGeo = useMemo(() => new THREE.SphereGeometry(1.072, 72, 48), []);

  useEffect(() => {
    return () => {
      earthGeo.dispose();
      atmoGeo.dispose();
    };
  }, [earthGeo, atmoGeo]);

  useEffect(() => {
    const dom = gl.domElement;
    const state = interactionRef.current;

    const onPointerDown = (e: PointerEvent) => {
      state.isDragging = true;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      state.velX = 0;
      state.velY = 0;
      dom.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!state.isDragging) return;
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.lastX = e.clientX;
      state.lastY = e.clientY;

      state.velX = dx * 0.0052;
      state.velY = dy * 0.0038;

      state.spinY += state.velX;
      state.tiltX = Math.max(-0.32, Math.min(0.52, state.tiltX + state.velY));
    };

    const onPointerUp = () => {
      if (!state.isDragging) return;
      state.isDragging = false;
      dom.style.cursor = 'grab';
    };

    dom.style.cursor = 'grab';
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const state = interactionRef.current;

    // Smoothly interpolate Day/Night shader state
    const targetNight = isNight ? 1.0 : 0.0;
    const currentNight = earthUniforms.uNightBlend.value;
    const nextNight = THREE.MathUtils.lerp(currentNight, targetNight, dt * 3.8);
    earthUniforms.uNightBlend.value = nextNight;
    atmosphereUniforms.uNightBlend.value = nextNight;

    // Slow, smooth, continuous 360-degree automatic rotation around the vertical axis
    if (!state.isDragging) {
      state.spinY += dt * 0.14 + state.velX;
      state.tiltX = Math.max(-0.32, Math.min(0.52, state.tiltX + state.velY));
      state.velX *= 0.93;
      state.velY *= 0.91;
      state.tiltX = THREE.MathUtils.lerp(state.tiltX, targetTiltX, dt * 1.4);
    }

    if (earthSpinRef.current) {
      earthSpinRef.current.rotation.y = state.spinY;
    }

    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.x = state.tiltX;
    }
  });

  return (
    <group ref={tiltGroupRef} rotation={[0.24, 0, -0.04]}>
      {/* Earth Core + Synchronized Surface-Hugging 3D Flight Route & Commercial Aircraft */}
      <group ref={earthSpinRef}>
        <mesh geometry={earthGeo}>
          <shaderMaterial
            vertexShader={EARTH_VERTEX_SHADER}
            fragmentShader={EARTH_FRAGMENT_SHADER}
            uniforms={earthUniforms}
            toneMapped={false}
          />
        </mesh>

        {/* Country-to-Korea Curved 3D Flight Route & Commercial Passenger Aircraft */}
        <FlightRouteAndAirplane
          departureCountryCode={departureCountryCode}
          isNight={isNight}
        />
      </group>

      {/* Feathered Rayleigh Atmospheric Scattering Halo (Zero Hard Outer Edge) */}
      <mesh geometry={atmoGeo}>
        <shaderMaterial
          vertexShader={ATMOSPHERE_VERTEX_SHADER}
          fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
          uniforms={atmosphereUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// EXPORTED HERO GLOBE COMPONENT (100% UNCLIPPED, FRAMELESS SATELLITE EARTH)
// ============================================================================

export interface GlobalStudentJourneySectionProps {
  variant?: 'hero' | 'section';
  departureCountryCode?: string;
}

export const GlobalStudentJourneySection: React.FC<GlobalStudentJourneySectionProps> = ({
  departureCountryCode = 'BD',
}) => {
  // Globe permanently retains its approved daytime appearance in both Day and Night website themes
  const isNight = false;
  const [textures, setTextures] = useState<EarthTextureBundle | null>(() =>
    getResolvedEarthTextures()
  );
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);

  const maxDpr = useMemo(() => {
    if (typeof window === 'undefined') return 2;
    const isMobile =
      window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile ? 1.5 : 2;
  }, []);

  useEffect(() => {
    try {
      const testCanvas = document.createElement('canvas');
      const gl =
        testCanvas.getContext('webgl2') ||
        testCanvas.getContext('webgl') ||
        testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglAvailable(false);
        return;
      }
      // Cleanly release probe context so we don't consume a WebGL context slot
      (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      setWebglAvailable(false);
      return;
    }

    let active = true;
    loadOrGenerateEarthTextures()
      .then((tex) => {
        if (active) setTextures(tex);
      })
      .catch(() => {
        setTimeout(() => {
          if (!active) return;
          loadOrGenerateEarthTextures()
            .then((tex) => {
              if (active) setTextures(tex);
            })
            .catch(() => {});
        }, 250);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="relative w-full flex items-center justify-center md:justify-end select-none"
      aria-label="Interactive 3D Earth showing student journey to South Korea"
    >
      {/* Unclipped, Frameless WebGL Viewport — Camera at z=3.35, fov=40 ensures the entire
          spherical silhouette, atmosphere halo, and aircraft sit well inside the canvas with
          zero rectangular/square/octagonal clipping on any edge. */}
      <div className="relative w-[330px] h-[330px] sm:w-[450px] sm:h-[450px] md:w-[470px] md:h-[470px] lg:w-[560px] lg:h-[560px] xl:w-[610px] xl:h-[610px]">
        {webglAvailable && textures ? (
          <Canvas
            camera={{ position: [0, 0, 3.35], fov: 40, near: 0.1, far: 25 }}
            dpr={[1, maxDpr]}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
            }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={isNight ? 0.65 : 1.05} />
            <directionalLight position={[4.5, 2.2, 4.2]} intensity={isNight ? 1.15 : 1.75} />
            <directionalLight position={[-3.0, -1.5, 2.5]} intensity={isNight ? 0.40 : 0.55} />
            <EarthScene
              isNight={isNight}
              textures={textures}
              departureCountryCode={departureCountryCode}
            />
          </Canvas>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className={`w-[74%] h-[74%] rounded-full transition-colors duration-700 ${
                isNight
                  ? 'bg-[radial-gradient(circle_at_35%_32%,#1E4E8C_0%,#0B2246_52%,#040D1F_100%)] shadow-[0_0_60px_rgba(24,92,186,0.28)]'
                  : 'bg-[radial-gradient(circle_at_35%_32%,#59B4FF_0%,#1D6AE5_55%,#0C3B87_100%)] shadow-[0_0_60px_rgba(75,163,255,0.32)]'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

