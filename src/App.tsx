import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { MoonStar, RotateCcw, SendHorizontal, Share2, SunMedium } from "lucide-react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { Canvas, useThree } from "@react-three/fiber"
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
} from "@react-three/drei"

type Language = "en" | "de"
type OrthoKind = "top" | "front"
type StyleId =
  | "simple"
  | "domed"
  | "grooved"
  | "faceted"
  | "hammered"
  | "open"
  | "diagonal"
  | "woodSleeve"
  | "woodInlay"

type FinishId = "normal" | "matte" | "polished" | "brushed" | "oxidised"

type GrooveCount = "single" | "double" | "triple"
type GrooveDepth = "subtle" | "medium" | "deep"
type GrooveWidth = "fine" | "medium" | "wide"
type FacetCount = "subtle" | "classic" | "bold"
type FacetedSharpness = "soft" | "crisp"
type HammeredIntensity = "subtle" | "medium" | "pronounced"
type HammeredScale = "fine" | "medium" | "coarse"
type OpenGapWidth = "subtle" | "medium" | "bold"
type OpenEdgeTreatment = "razor" | "softened" | "rounded"
type DiagonalGapWidth = "subtle" | "medium" | "bold"
type DiagonalDirection = "leftRising" | "rightRising"
type DiagonalEdgeTreatment = "razor" | "softened"
type WoodType = "walnut" | "oak" | "ebony" | "maple"
type SleeveThickness = "slim" | "medium" | "bold"
type InlayWidth = "narrow" | "medium" | "wide"
type InlayDepth = "shallow" | "medium" | "deep"

type StyleOption = {
  id: StyleId
  en: string
  de: string
  descEn: string
  descDe: string
}

type FinishOption = {
  id: FinishId
  en: string
  de: string
  colour: string
  roughness: number
  metalness?: number
  envMapIntensity?: number
  clearcoat?: number
  anisotropy?: number
  sheen?: number
}

type StoredConfig = {
  language?: Language
  ringSize?: number
  bandWidth?: number
  style?: StyleId | "flat"
  finish?: FinishId
  name?: string
  groovedCount?: GrooveCount
  groovedDepth?: GrooveDepth
  groovedWidth?: GrooveWidth
  facetedCount?: FacetCount
  facetedSharpness?: FacetedSharpness
  hammeredIntensity?: HammeredIntensity
  hammeredScale?: HammeredScale
  openGapWidth?: OpenGapWidth
  openEdgeTreatment?: OpenEdgeTreatment
  diagonalGapWidth?: DiagonalGapWidth
  diagonalDirection?: DiagonalDirection
  diagonalEdgeTreatment?: DiagonalEdgeTreatment
  woodSleeveWoodType?: WoodType
  woodSleeveThickness?: SleeveThickness
  woodInlayWoodType?: WoodType
  woodInlayWidth?: InlayWidth
  woodInlayDepth?: InlayDepth
}

type AppConfig = {
  language: Language
  ringSize: number
  bandWidth: number
  style: StyleId
  finish: FinishId
  name: string
  groovedCount: GrooveCount
  groovedDepth: GrooveDepth
  groovedWidth: GrooveWidth
  facetedCount: FacetCount
  facetedSharpness: FacetedSharpness
  hammeredIntensity: HammeredIntensity
  hammeredScale: HammeredScale
  openGapWidth: OpenGapWidth
  openEdgeTreatment: OpenEdgeTreatment
  diagonalGapWidth: DiagonalGapWidth
  diagonalDirection: DiagonalDirection
  diagonalEdgeTreatment: DiagonalEdgeTreatment
  woodSleeveWoodType: WoodType
  woodSleeveThickness: SleeveThickness
  woodInlayWoodType: WoodType
  woodInlayWidth: InlayWidth
  woodInlayDepth: InlayDepth
}

type StyleSettings = {
  groovedCount: GrooveCount
  groovedDepth: GrooveDepth
  groovedWidth: GrooveWidth
  facetedCount: FacetCount
  facetedSharpness: FacetedSharpness
  hammeredIntensity: HammeredIntensity
  hammeredScale: HammeredScale
  openGapWidth: OpenGapWidth
  openEdgeTreatment: OpenEdgeTreatment
  diagonalGapWidth: DiagonalGapWidth
  diagonalDirection: DiagonalDirection
  diagonalEdgeTreatment: DiagonalEdgeTreatment
  woodSleeveWoodType: WoodType
  woodSleeveThickness: SleeveThickness
  woodInlayWoodType: WoodType
  woodInlayWidth: InlayWidth
  woodInlayDepth: InlayDepth
}

type SubmitState = "idle" | "sending" | "success" | "error"
type ThemeMode = "light" | "dark"
type ConfirmAction = "submit" | "reset" | null

const STORAGE_KEY = "ring-config"
const ACCESS_KEY = "ring-config-access"
const ACCESS_CODE = "4827"
const THEME_KEY = "ring-config-theme"
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mzdywkpb"

const DEFAULT_CONFIG: AppConfig = {
  language: "en",
  ringSize: 18.1,
  bandWidth: 6,
  style: "simple",
  finish: "normal",
  name: "My Ring",
  groovedCount: "triple",
  groovedDepth: "medium",
  groovedWidth: "medium",
  facetedCount: "classic",
  facetedSharpness: "crisp",
  hammeredIntensity: "medium",
  hammeredScale: "fine",
  openGapWidth: "medium",
  openEdgeTreatment: "softened",
  diagonalGapWidth: "medium",
  diagonalDirection: "rightRising",
  diagonalEdgeTreatment: "softened",
  woodSleeveWoodType: "walnut",
  woodSleeveThickness: "medium",
  woodInlayWoodType: "walnut",
  woodInlayWidth: "medium",
  woodInlayDepth: "medium",
}

const DEFAULT_HERO_ROTATION: [number, number, number] = [-0.48, -0.42, -0.32]
const HERO_FLOOR_Y = -0.82
const HERO_FLOOR_CLEARANCE = 0.012

const styles: StyleOption[] = [
  { id: "simple", en: "Simple", de: "Simpel", descEn: "Clean flat-sided metal band", descDe: "Glattes, schnörkelloses Metallband" },
  { id: "domed", en: "Domed", de: "Gewölbt", descEn: "Soft jewellery-like outer curve", descDe: "Sanft gewölbte Außenseite" },
  { id: "grooved", en: "Grooved", de: "Gerillt", descEn: "Subtle recessed ring grooves", descDe: "Feine, eingelassene Ringrillen" },
  { id: "faceted", en: "Faceted", de: "Facettiert", descEn: "Angular machined facets", descDe: "Kantige, maschinelle Facetten" },
  { id: "hammered", en: "Fine Hammered", de: "Feingehämmert", descEn: "Subtle hand-hammered texture", descDe: "Feine handgehämmerte Struktur" },
  { id: "open", en: "Open", de: "Offen", descEn: "Open band with clean gap", descDe: "Offenes Band mit sauberem Spalt" },
  { id: "diagonal", en: "Diagonal", de: "Diagonal", descEn: "Angled open ring ends", descDe: "Diagonal geschnittene Ringenden" },
  { id: "woodSleeve", en: "Wood Sleeve", de: "Holzmantel", descEn: "Wood outer sleeve with metal liner", descDe: "Hölzerner Außenmantel mit Metallkern" },
  { id: "woodInlay", en: "Wood Inlay", de: "Holzeinlage", descEn: "Centered wood inlay channel", descDe: "Zentrierte Holzeinlage" },
]

const finishes: FinishOption[] = [
  { id: "normal", en: "Normal", de: "Normal", colour: "#d7d8da", roughness: 0.24, metalness: 0.88, envMapIntensity: 1.25, clearcoat: 0.62, sheen: 0.08 },
  { id: "matte", en: "Matte", de: "Matt", colour: "#cfd1d2", roughness: 0.58, metalness: 0.72, envMapIntensity: 0.92, clearcoat: 0.32, sheen: 0.05 },
  { id: "polished", en: "Polished", de: "Poliert", colour: "#fbfbf7", roughness: 0.14, metalness: 1, envMapIntensity: 1.55, clearcoat: 1, sheen: 0 },
  { id: "brushed", en: "Brushed", de: "Gebürstet", colour: "#d5d7d9", roughness: 0.17, envMapIntensity: 1.95, clearcoat: 0.88, anisotropy: 0.72, sheen: 0.12 },
  { id: "oxidised", en: "Oxidised", de: "Oxidiert", colour: "#617283", roughness: 0.3, metalness: 0.92, envMapIntensity: 1.28, clearcoat: 0.55, sheen: 0.05 },
]

const sizes = [
  { label: "Ø 16.5 mm / 52 / US 6", diameter: 16.5 },
  { label: "Ø 17.3 mm / 54 / US 7", diameter: 17.3 },
  { label: "Ø 18.1 mm / 57 / US 8", diameter: 18.1 },
  { label: "Ø 18.9 mm / 59 / US 9", diameter: 18.9 },
  { label: "Ø 19.8 mm / 62 / US 10", diameter: 19.8 },
  { label: "Ø 20.6 mm / 65 / US 11", diameter: 20.6 },
  { label: "Ø 21.4 mm / 67 / US 12", diameter: 21.4 },
]

const grooveCountIds = new Set<GrooveCount>(["single", "double", "triple"])
const grooveDepthIds = new Set<GrooveDepth>(["subtle", "medium", "deep"])
const grooveWidthIds = new Set<GrooveWidth>(["fine", "medium", "wide"])
const facetCountIds = new Set<FacetCount>(["subtle", "classic", "bold"])
const facetedSharpnessIds = new Set<FacetedSharpness>(["soft", "crisp"])
const hammeredIntensityIds = new Set<HammeredIntensity>(["subtle", "medium", "pronounced"])
const hammeredScaleIds = new Set<HammeredScale>(["fine", "medium", "coarse"])
const openGapWidthIds = new Set<OpenGapWidth>(["subtle", "medium", "bold"])
const openEdgeTreatmentIds = new Set<OpenEdgeTreatment>(["razor", "softened", "rounded"])
const diagonalGapWidthIds = new Set<DiagonalGapWidth>(["subtle", "medium", "bold"])
const diagonalDirectionIds = new Set<DiagonalDirection>(["leftRising", "rightRising"])
const diagonalEdgeTreatmentIds = new Set<DiagonalEdgeTreatment>(["razor", "softened"])
const woodTypeIds = new Set<WoodType>(["walnut", "oak", "ebony", "maple"])
const sleeveThicknessIds = new Set<SleeveThickness>(["slim", "medium", "bold"])
const inlayWidthIds = new Set<InlayWidth>(["narrow", "medium", "wide"])
const inlayDepthIds = new Set<InlayDepth>(["shallow", "medium", "deep"])

const styleIds = new Set(styles.map((item) => item.id))
const finishIds = new Set(finishes.map((item) => item.id))

function normaliseStyleValue<T>(value: unknown, validSet: Set<T>, fallback: T): T {
  return validSet.has(value as T) ? (value as T) : fallback
}

function getDefaultName(language: Language) {
  return language === "en" ? "My Ring" : "Mein Ring"
}

function normaliseConfig(data: StoredConfig): AppConfig {
  const language = data.language === "de" ? "de" : "en"
  const ringSize = typeof data.ringSize === "number" ? data.ringSize : DEFAULT_CONFIG.ringSize
  const bandWidth = typeof data.bandWidth === "number" ? data.bandWidth : DEFAULT_CONFIG.bandWidth
  const incomingStyle = data.style === "flat" ? "simple" : data.style
  const style = incomingStyle && styleIds.has(incomingStyle) ? incomingStyle : DEFAULT_CONFIG.style
  const finish = data.finish && finishIds.has(data.finish) ? data.finish : DEFAULT_CONFIG.finish
  const name = typeof data.name === "string" && data.name.trim() ? data.name : getDefaultName(language)

  const groovedCount = normaliseStyleValue(data.groovedCount, grooveCountIds, DEFAULT_CONFIG.groovedCount)
  const groovedDepth = normaliseStyleValue(data.groovedDepth, grooveDepthIds, DEFAULT_CONFIG.groovedDepth)
  const groovedWidth = normaliseStyleValue(data.groovedWidth, grooveWidthIds, DEFAULT_CONFIG.groovedWidth)
  const facetedCount = normaliseStyleValue(data.facetedCount, facetCountIds, DEFAULT_CONFIG.facetedCount)
  const facetedSharpness = normaliseStyleValue(data.facetedSharpness, facetedSharpnessIds, DEFAULT_CONFIG.facetedSharpness)
  const hammeredIntensity = normaliseStyleValue(data.hammeredIntensity, hammeredIntensityIds, DEFAULT_CONFIG.hammeredIntensity)
  const hammeredScale = normaliseStyleValue(data.hammeredScale, hammeredScaleIds, DEFAULT_CONFIG.hammeredScale)
  const openGapWidth = normaliseStyleValue(data.openGapWidth, openGapWidthIds, DEFAULT_CONFIG.openGapWidth)
  const openEdgeTreatment = normaliseStyleValue(data.openEdgeTreatment, openEdgeTreatmentIds, DEFAULT_CONFIG.openEdgeTreatment)
  const diagonalGapWidth = normaliseStyleValue(data.diagonalGapWidth, diagonalGapWidthIds, DEFAULT_CONFIG.diagonalGapWidth)
  const diagonalDirection = normaliseStyleValue(data.diagonalDirection, diagonalDirectionIds, DEFAULT_CONFIG.diagonalDirection)
  const diagonalEdgeTreatment = normaliseStyleValue(data.diagonalEdgeTreatment, diagonalEdgeTreatmentIds, DEFAULT_CONFIG.diagonalEdgeTreatment)
  const woodSleeveWoodType = normaliseStyleValue(data.woodSleeveWoodType, woodTypeIds, DEFAULT_CONFIG.woodSleeveWoodType)
  const woodSleeveThickness = normaliseStyleValue(data.woodSleeveThickness, sleeveThicknessIds, DEFAULT_CONFIG.woodSleeveThickness)
  const woodInlayWoodType = normaliseStyleValue(data.woodInlayWoodType, woodTypeIds, DEFAULT_CONFIG.woodInlayWoodType)
  const woodInlayWidth = normaliseStyleValue(data.woodInlayWidth, inlayWidthIds, DEFAULT_CONFIG.woodInlayWidth)
  const woodInlayDepth = normaliseStyleValue(data.woodInlayDepth, inlayDepthIds, DEFAULT_CONFIG.woodInlayDepth)

  return {
    language,
    ringSize,
    bandWidth,
    style,
    finish,
    name,
    groovedCount,
    groovedDepth,
    groovedWidth,
    facetedCount,
    facetedSharpness,
    hammeredIntensity,
    hammeredScale,
    openGapWidth,
    openEdgeTreatment,
    diagonalGapWidth,
    diagonalDirection,
    diagonalEdgeTreatment,
    woodSleeveWoodType,
    woodSleeveThickness,
    woodInlayWoodType,
    woodInlayWidth,
    woodInlayDepth,
  }
}

function getInitialConfig(): AppConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG

  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (!saved) return DEFAULT_CONFIG

  try {
    return normaliseConfig(JSON.parse(saved) as StoredConfig)
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return DEFAULT_CONFIG
  }
}

function buildProfile(
  style: StyleId | "flat",
  innerRadius: number,
  outerRadius: number,
  bandHalfWidth: number,
  wallThickness: number
) {
  const profile: THREE.Vector2[] = []
  const bevel = Math.min(0.045, wallThickness * 0.22, bandHalfWidth * 0.4)

  if (style === "flat" || style === "grooved" || style === "woodSleeve" || style === "woodInlay") {
    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(innerRadius + bevel * 0.3, -bandHalfWidth),
      new THREE.Vector2(outerRadius - bevel * 1.2, -bandHalfWidth),
      new THREE.Vector2(outerRadius - bevel * 0.28, -bandHalfWidth + bevel * 0.22),
      new THREE.Vector2(outerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(outerRadius, bandHalfWidth - bevel),
      new THREE.Vector2(outerRadius - bevel * 0.28, bandHalfWidth - bevel * 0.22),
      new THREE.Vector2(outerRadius - bevel * 1.2, bandHalfWidth),
      new THREE.Vector2(innerRadius + bevel * 0.3, bandHalfWidth),
      new THREE.Vector2(innerRadius, bandHalfWidth - bevel),
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel)
    )
  } else if (style === "simple" || style === "diagonal") {
    const shoulder = wallThickness * 0.04
    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(innerRadius + bevel * 0.32, -bandHalfWidth),
      new THREE.Vector2(outerRadius - bevel * 1.35 - shoulder, -bandHalfWidth),
      new THREE.Vector2(outerRadius - bevel * 0.24, -bandHalfWidth + bevel * 0.28),
      new THREE.Vector2(outerRadius, -bandHalfWidth + bevel * 0.92),
      new THREE.Vector2(outerRadius, bandHalfWidth - bevel * 0.92),
      new THREE.Vector2(outerRadius - bevel * 0.24, bandHalfWidth - bevel * 0.28),
      new THREE.Vector2(outerRadius - bevel * 1.35 - shoulder, bandHalfWidth),
      new THREE.Vector2(innerRadius + bevel * 0.32, bandHalfWidth),
      new THREE.Vector2(innerRadius, bandHalfWidth - bevel),
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel)
    )
  } else if (style === "domed" || style === "hammered" || style === "open") {
    const steps = 22
    profile.push(new THREE.Vector2(innerRadius, -bandHalfWidth + bevel))
    profile.push(new THREE.Vector2(innerRadius + bevel * 0.5, -bandHalfWidth))

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps
      const y = -bandHalfWidth + t * bandHalfWidth * 2
      const crown = Math.sin(t * Math.PI)
      const x = outerRadius + crown * wallThickness * 0.22
      profile.push(new THREE.Vector2(x, y))
    }

    profile.push(
      new THREE.Vector2(innerRadius + bevel * 0.5, bandHalfWidth),
      new THREE.Vector2(innerRadius, bandHalfWidth - bevel),
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel)
    )
  } else if (style === "faceted") {
    const facetInset = wallThickness * 0.16
    const facetPeak = wallThickness * 0.14
    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(innerRadius + bevel * 0.78, -bandHalfWidth),
      new THREE.Vector2(outerRadius - facetInset, -bandHalfWidth),
      new THREE.Vector2(outerRadius + facetPeak, -bandHalfWidth * 0.48),
      new THREE.Vector2(outerRadius + facetPeak * 1.08, 0),
      new THREE.Vector2(outerRadius + facetPeak, bandHalfWidth * 0.48),
      new THREE.Vector2(outerRadius - facetInset, bandHalfWidth),
      new THREE.Vector2(innerRadius + bevel * 0.78, bandHalfWidth),
      new THREE.Vector2(innerRadius, bandHalfWidth - bevel),
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel)
    )
  }

  return profile
}

function createEndCapGeometry(
  profile: THREE.Vector2[],
  angle: number,
  invert: boolean,
  slope: number,
  bandHalfWidth: number
) {
  const sourcePoints = profile[profile.length - 1].equals(profile[0]) ? profile.slice(0, -1) : profile
  const points = invert ? [...sourcePoints].reverse() : sourcePoints
  const shape = new THREE.Shape(points.map((point) => new THREE.Vector2(point.x, point.y)))
  const capGeometry = new THREE.ShapeGeometry(shape)
  const position = capGeometry.getAttribute("position") as THREE.BufferAttribute
  const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
  const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle))

  for (let i = 0; i < position.count; i += 1) {
    const radius = position.getX(i)
    const y = position.getY(i)
    const slopeOffset = slope === 0 ? 0 : (y / bandHalfWidth) * slope

    position.setXYZ(
      i,
      radial.x * radius + tangent.x * slopeOffset,
      y,
      radial.z * radius + tangent.z * slopeOffset
    )
  }

  capGeometry.deleteAttribute("normal")
  position.needsUpdate = true
  capGeometry.computeVertexNormals()
  return capGeometry
}

function createLatheGeometry(
  profile: THREE.Vector2[],
  style: StyleId,
  styleSettings: StyleSettings,
  bandHalfWidth: number,
  reducedDetail = false
) {
  const facetedSegments =
    styleSettings.facetedCount === "subtle"
      ? reducedDetail
        ? 24
        : 32
      : styleSettings.facetedCount === "bold"
      ? reducedDetail
        ? 10
        : 14
      : reducedDetail
      ? 16
      : 20
  const segments = reducedDetail
    ? style === "faceted"
      ? facetedSegments
      : style === "open" || style === "diagonal"
      ? 128
      : 192
    : style === "faceted"
    ? facetedSegments
    : style === "open" || style === "diagonal"
    ? 224
    : 384
  let phiLength = Math.PI * 2
  let phiStart = Math.PI * 1.16
  let capSlope = 0

  if (style === "open") {
    phiLength =
      styleSettings.openGapWidth === "subtle"
        ? Math.PI * 1.9
        : styleSettings.openGapWidth === "bold"
        ? Math.PI * 1.45
        : Math.PI * 1.68
    phiStart =
      styleSettings.openEdgeTreatment === "rounded"
        ? Math.PI * 1.12
        : styleSettings.openEdgeTreatment === "softened"
        ? Math.PI * 1.14
        : Math.PI * 1.16
  }

  if (style === "diagonal") {
    phiLength =
      styleSettings.diagonalGapWidth === "subtle"
        ? Math.PI * 1.9
        : styleSettings.diagonalGapWidth === "bold"
        ? Math.PI * 1.45
        : Math.PI * 1.68
    phiStart = Math.PI * 1.16
    capSlope = styleSettings.diagonalEdgeTreatment === "razor" ? 0.09 : 0.06
  }

  const geometry = new THREE.LatheGeometry(profile, segments, phiStart, phiLength)

  if (style === "open" || style === "diagonal") {
    const diagonalSlopeSign = styleSettings.diagonalDirection === "leftRising" ? -1 : 1
    const startSlope = style === "diagonal" ? diagonalSlopeSign * capSlope : 0
    const endSlope = style === "diagonal" ? -diagonalSlopeSign * capSlope : 0
    const capA = createEndCapGeometry(profile, phiStart, false, startSlope, bandHalfWidth)
    const capB = createEndCapGeometry(profile, phiStart + phiLength, true, endSlope, bandHalfWidth)
    geometry.deleteAttribute("uv")
    capA.deleteAttribute("uv")
    capB.deleteAttribute("uv")

    const merged = mergeGeometries([geometry, capA, capB], false)
    capA.dispose()
    capB.dispose()

    if (merged) {
      geometry.dispose()
      merged.computeVertexNormals()
      return merged
    }

    geometry.computeVertexNormals()
    return geometry
  }

  geometry.computeVertexNormals()
  return geometry
}

function getNoiseValue(x: number, y: number, z: number) {
  const seed = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453
  return seed - Math.floor(seed)
}

function createHammeredGeometry(
  base: THREE.BufferGeometry,
  intensity: HammeredIntensity,
  scale: HammeredScale,
  innerRadius: number,
  outerRadius: number
) {
  const geometry = base.clone()
  const position = geometry.attributes.position as THREE.BufferAttribute
  const strength = intensity === "subtle" ? 0.002 : intensity === "pronounced" ? 0.008 : 0.004
  const variation = scale === "fine" ? 0.4 : scale === "coarse" ? 1.2 : 0.8
  const threshold = innerRadius + (outerRadius - innerRadius) * 0.35

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const radius = Math.hypot(x, z)
    if (radius < threshold) continue

    const noise = getNoiseValue(x * variation, y * variation, z * variation) * 2 - 1
    const normal = new THREE.Vector3(x, 0, z).normalize()
    position.setXYZ(i, x + normal.x * noise * strength, y, z + normal.z * noise * strength)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function createOuterStripGeometry(
  outerRadius: number,
  yMin: number,
  yMax: number,
  thickness: number,
  style: StyleId,
  styleSettings: StyleSettings,
  reducedDetail = false
) {
  const profile = [
    new THREE.Vector2(outerRadius - thickness, yMin),
    new THREE.Vector2(outerRadius + thickness, yMin),
    new THREE.Vector2(outerRadius + thickness, yMax),
    new THREE.Vector2(outerRadius - thickness, yMax),
    new THREE.Vector2(outerRadius - thickness, yMin),
  ]

  return createLatheGeometry(profile, style, styleSettings, Math.max(Math.abs(yMin), Math.abs(yMax)), reducedDetail)
}

function createSoftWindowTexture(theme: ThemeMode, reducedDetail = false) {
  const canvas = document.createElement("canvas")
  const canvasSize = reducedDetail ? 768 : 1024
  canvas.width = canvasSize
  canvas.height = canvasSize
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const bg = ctx.createLinearGradient(0, 0, 0, canvasSize)
  if (theme === "dark") {
    bg.addColorStop(0, "#221e1a")
    bg.addColorStop(0.55, "#191613")
    bg.addColorStop(1, "#14110f")
  } else {
    bg.addColorStop(0, "#f3f0eb")
    bg.addColorStop(0.55, "#f7f4ee")
    bg.addColorStop(1, "#eee8df")
  }
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvasSize, canvasSize)

  ctx.filter = "blur(48px)"

  const windows = [
    [40, -80, 145, 720, 0.58],
    [210, -120, 170, 760, 0.45],
    [430, -60, 135, 680, 0.38],
    [625, -100, 180, 760, 0.48],
    [850, -40, 125, 650, 0.4],
  ] as const

  for (const [x, y, w, h, a] of windows) {
    ctx.fillStyle = theme === "dark" ? `rgba(255,246,234,${Math.max(0.1, a * 0.28)})` : `rgba(255,255,255,${a})`
    ctx.fillRect(x, y, w, h)
  }

  ctx.filter = "none"

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function Ring({
  size,
  width,
  style,
  finish,
  previewRotation = [0.7, 0.2, 0],
  styleSettings,
  reducedDetail = false,
}: {
  size: number
  width: number
  style: StyleId
  finish: FinishId
  previewRotation?: [number, number, number]
  styleSettings: StyleSettings
  reducedDetail?: boolean
}) {
  const selectedFinish = finishes.find((item) => item.id === finish) ?? finishes[0]

  const { geometry, grooveGeometries, woodInlayGeometry, woodSleeveGeometry } = useMemo(() => {
    const innerRadius = size / 20
    const bandHalfWidth = width * 0.045

    // FIXED wall thickness (constant, independent of width)
    const wallThickness = 0.22

    const outerRadius = innerRadius + wallThickness
    const profile = buildProfile(style, innerRadius, outerRadius, bandHalfWidth, wallThickness)
    const baseGeometry = createLatheGeometry(profile, style, styleSettings, bandHalfWidth, reducedDetail)
    let geometry = baseGeometry

    if (style === "hammered") {
      geometry = createHammeredGeometry(
        baseGeometry,
        styleSettings.hammeredIntensity,
        styleSettings.hammeredScale,
        innerRadius,
        outerRadius
      )
    }

    if (style === "faceted" && styleSettings.facetedSharpness === "crisp") {
      geometry = baseGeometry.index ? baseGeometry.toNonIndexed() : baseGeometry.clone()
      geometry.computeVertexNormals()
    }

    const grooveOffsets =
      styleSettings.groovedCount === "single"
        ? [0]
        : styleSettings.groovedCount === "double"
        ? [-0.45, 0.45]
        : [-0.68, 0, 0.68]

    const grooveWidth = styleSettings.groovedWidth === "fine" ? 0.0035 : styleSettings.groovedWidth === "wide" ? 0.0065 : 0.005
    const grooveHeight =
      styleSettings.groovedDepth === "subtle"
        ? bandHalfWidth * 0.18
        : styleSettings.groovedDepth === "deep"
        ? bandHalfWidth * 0.35
        : bandHalfWidth * 0.26

    const grooveGeometries =
      style === "grooved"
        ? grooveOffsets.map((offset) =>
            createOuterStripGeometry(
              outerRadius + 0.002,
              bandHalfWidth * offset - grooveHeight,
              bandHalfWidth * offset + grooveHeight,
              grooveWidth,
              style,
              styleSettings,
              reducedDetail
            )
          )
        : []

    const woodInlayWidth =
      styleSettings.woodInlayWidth === "narrow"
        ? bandHalfWidth * 0.22
        : styleSettings.woodInlayWidth === "wide"
        ? bandHalfWidth * 0.34
        : bandHalfWidth * 0.28
    const woodInlayDepth =
      styleSettings.woodInlayDepth === "shallow"
        ? 0.004
        : styleSettings.woodInlayDepth === "deep"
        ? 0.01
        : 0.006

    const woodInlayGeometry =
      style === "woodInlay"
        ? createOuterStripGeometry(
            outerRadius + woodInlayDepth,
            -woodInlayWidth,
            woodInlayWidth,
            0.007,
            style,
            styleSettings,
            reducedDetail
          )
        : null

    const sleeveThickness =
      styleSettings.woodSleeveThickness === "slim"
        ? 0.008
        : styleSettings.woodSleeveThickness === "bold"
        ? 0.018
        : 0.012
    const woodSleeveGeometry =
      style === "woodSleeve"
        ? createOuterStripGeometry(
            outerRadius + 0.004,
            -bandHalfWidth + 0.01,
            bandHalfWidth - 0.01,
            sleeveThickness,
            style,
            styleSettings,
            reducedDetail
          )
        : null

    if (geometry !== baseGeometry) {
      baseGeometry.dispose()
    }

    return {
      geometry,
      grooveGeometries,
      woodInlayGeometry,
      woodSleeveGeometry,
    }
  }, [size, width, style, styleSettings, reducedDetail])

  useEffect(() => {
    return () => {
      geometry.dispose()
      grooveGeometries.forEach((item) => item.dispose())
      woodInlayGeometry?.dispose()
      woodSleeveGeometry?.dispose()
    }
  }, [geometry, grooveGeometries, woodInlayGeometry, woodSleeveGeometry])

  const isWoodSleeve = style === "woodSleeve"
  const isBrushed = finish === "brushed"
  const isPolished = finish === "polished"
  const isFacetedCrisp = style === "faceted" && styleSettings.facetedSharpness === "crisp"

  const mainColour = selectedFinish.colour
  const mainMetalness = selectedFinish.metalness ?? 0.88
  const mainRoughness = style === "hammered" ? Math.max(selectedFinish.roughness, 0.42) : selectedFinish.roughness
  const mainEnv = selectedFinish.envMapIntensity ?? 1.1

  return (
    <group rotation={previewRotation}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={mainColour}
          metalness={mainMetalness}
          roughness={mainRoughness}
          envMapIntensity={mainEnv}
          clearcoat={isWoodSleeve ? 0.22 : selectedFinish.clearcoat ?? 0.58}
          clearcoatRoughness={isPolished ? 0.04 : isBrushed ? 0.22 : 0.16}
          anisotropy={isBrushed ? selectedFinish.anisotropy ?? 0 : 0}
          anisotropyRotation={Math.PI / 2}
          sheen={selectedFinish.sheen ?? 0}
          sheenRoughness={0.52}
          flatShading={isFacetedCrisp}
        />
      </mesh>

      {style === "grooved" &&
        grooveGeometries.map((item, index) => (
          <mesh key={index} geometry={item}>
            <meshStandardMaterial color="#111317" metalness={0.4} roughness={0.55} envMapIntensity={0.8} />
          </mesh>
        ))}

      {style === "woodInlay" && woodInlayGeometry && (
        <mesh geometry={woodInlayGeometry}>
          <meshStandardMaterial color="#7a4a26" metalness={0.04} roughness={0.58} envMapIntensity={0.75} />
        </mesh>
      )}

      {style === "woodSleeve" && woodSleeveGeometry && (
        <mesh geometry={woodSleeveGeometry}>
          <meshStandardMaterial color={styleSettings.woodSleeveWoodType === "oak" ? "#b47f54" : styleSettings.woodSleeveWoodType === "ebony" ? "#231f20" : styleSettings.woodSleeveWoodType === "maple" ? "#d9b58f" : "#8a5a32"} metalness={0.02} roughness={0.54} envMapIntensity={0.62} />
        </mesh>
      )}
    </group>
  )
}

function FixedCamera({ position, up }: { position: [number, number, number]; up: [number, number, number] }) {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(...position)
    camera.up.set(...up)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, position, up])

  return null
}

function SoftWindowBackdrop({ theme, reducedDetail }: { theme: ThemeMode; reducedDetail: boolean }) {
  const texture = useMemo(() => createSoftWindowTexture(theme, reducedDetail), [theme, reducedDetail])

  useEffect(() => {
    return () => texture?.dispose()
  }, [texture])

  if (!texture) return null

  return (
    <mesh position={[0, 1.25, -3.6]} scale={[7.8, 5.8, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent opacity={theme === "dark" ? 0.62 : 0.92} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function GroundedHeroRing({
  ringSize,
  bandWidth,
  style,
  finish,
  heroRotation,
  styleSettings,
  reducedDetail,
}: {
  ringSize: number
  bandWidth: number
  style: StyleId
  finish: FinishId
  heroRotation: [number, number, number]
  styleSettings: StyleSettings
  reducedDetail: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [groundOffset, setGroundOffset] = useState(0)

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    group.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(group)

    const targetBottom = HERO_FLOOR_Y + HERO_FLOOR_CLEARANCE
    const correction = targetBottom - box.min.y

    if (Number.isFinite(correction) && Math.abs(correction) > 0.001) {
      setGroundOffset((current) => current + correction)
    }
  }, [ringSize, bandWidth, style, finish, heroRotation, styleSettings, groundOffset])

  return (
    <group ref={groupRef} position={[0.02, -0.06 + groundOffset, 0]} rotation={heroRotation} scale={0.52}>
      <Ring size={ringSize} width={bandWidth} style={style} finish={finish} previewRotation={[0, 0, 0]} styleSettings={styleSettings} reducedDetail={reducedDetail} />
    </group>
  )
}

function DimensionOverlay({
  kind,
  ringSize,
  bandWidth,
  language,
}: {
  kind: OrthoKind
  ringSize: number
  bandWidth: number
  language: Language
}) {
  if (kind === "top") {
    return (
      <div className="dimension-overlay" aria-hidden="true">
        <div className="top-diameter-line" />
        <div className="top-tick-left" />
        <div className="top-tick-right" />
        <div className="top-extension-left" />
        <div className="top-extension-right" />
        <div className="dimension-label top-diameter-label">Ø {ringSize.toFixed(1)} mm</div>
      </div>
    )
  }

  return (
    <div className="dimension-overlay" aria-hidden="true">
      <div className="front-width-line" />
      <div className="front-tick-top" />
      <div className="front-tick-bottom" />
      <div className="front-extension-top" />
      <div className="front-extension-bottom" />
      <div className="dimension-label front-width-label">
        {language === "en" ? "Width" : "Breite"}
        <br />
        {bandWidth.toFixed(0)} mm
      </div>
    </div>
  )
}

function OrthoView({
  title,
  kind,
  cameraPosition,
  cameraUp,
  ringSize,
  bandWidth,
  style,
  finish,
  language,
  styleSettings,
  theme,
  reducedDetail,
  className,
}: {
  title: string
  kind: OrthoKind
  cameraPosition: [number, number, number]
  cameraUp: [number, number, number]
  ringSize: number
  bandWidth: number
  style: StyleId
  finish: FinishId
  language: Language
  styleSettings: StyleSettings
  theme: ThemeMode
  reducedDetail: boolean
  className?: string
}) {
  const orthoBackground = theme === "dark" ? "#141210" : "#f4f1ec"
  const gridMain = theme === "dark" ? "#3d3732" : "#d8d0c6"
  const gridSoft = theme === "dark" ? "#221e1b" : "#e8e2da"
  const hemiGround = theme === "dark" ? "#090807" : "#271d16"
  const zoom = kind === "top" ? 56 / (ringSize / 18) : 60 / (ringSize / 18)

  return (
    <section className={`ortho-card ${className ?? ""}`.trim()} aria-label={title}>
      <div className="view-label">{title}</div>
      <DimensionOverlay kind={kind} ringSize={ringSize} bandWidth={bandWidth} language={language} />

      <Canvas
        frameloop="demand"
        orthographic
        camera={{
          zoom,
          position: cameraPosition,
          near: 0.1,
          far: 100,
        }}
        dpr={reducedDetail ? [1, 1.25] : [1, 1.5]}
        shadows
      >
        <FixedCamera position={cameraPosition} up={cameraUp} />
        <color attach="background" args={[orthoBackground]} />
        <ambientLight intensity={theme === "dark" ? 0.92 : 0.8} />
        <hemisphereLight args={["#fff1dc", hemiGround, theme === "dark" ? 0.82 : 0.65]} />
        <directionalLight position={[3, 5, 4]} intensity={1.5} color="#fff4e3" />
        <directionalLight position={[-4, 1, 2]} intensity={1.1} color="#d8e1f2" />
        {kind === "top" ? (
          <gridHelper args={[4, 12, gridMain, gridSoft]} />
        ) : (
          <gridHelper args={[4, 12, gridMain, gridSoft]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.16]} />
        )}
        <Ring size={ringSize} width={bandWidth} style={style} finish={finish} previewRotation={[0, 0, 0]} styleSettings={styleSettings} reducedDetail={reducedDetail} />
      </Canvas>
    </section>
  )
}

function StudioScene({
  ringSize,
  bandWidth,
  style,
  finish,
  heroRotation,
  styleSettings,
  theme,
  reducedDetail,
}: {
  ringSize: number
  bandWidth: number
  style: StyleId
  finish: FinishId
  heroRotation: [number, number, number]
  styleSettings: StyleSettings
  theme: ThemeMode
  reducedDetail: boolean
}) {
  const heroBackground = theme === "dark" ? "#161311" : "#f4f1ec"
  const heroFog = theme === "dark" ? "#161311" : "#f4f1ec"
  const floorColor = theme === "dark" ? "#1d1916" : "#eee9e2"
  const contactShadowColor = theme === "dark" ? "#0b0908" : "#9f9890"

  return (
    <>
      <color attach="background" args={[heroBackground]} />
      <fog attach="fog" args={[heroFog, 6, 12]} />

      <Environment background={false} resolution={reducedDetail ? 512 : 2048}>
        <Lightformer form="rect" intensity={8} color="#ffffff" scale={[14, 9, 1]} position={[0, 0.8, 4.2]} rotation={[0, Math.PI, 0]} />
        <Lightformer form="rect" intensity={6} color="#f7f4ee" scale={[8, 3.5, 1]} position={[0, 1.65, 3.2]} rotation={[0.12, Math.PI, 0]} />
        <Lightformer form="rect" intensity={9} color="#ffffff" scale={[0.75, 7, 1]} position={[-1.05, 0.55, 2.4]} rotation={[0, Math.PI / 10, 0]} />
        <Lightformer form="rect" intensity={8} color="#ffffff" scale={[0.8, 7, 1]} position={[1.05, 0.55, 2.4]} rotation={[0, -Math.PI / 10, 0]} />
        <Lightformer form="rect" intensity={7} color="#ffffff" scale={[10, 4, 1]} position={[0, 2.15, 2.7]} rotation={[0.28, Math.PI, 0]} />
      </Environment>

      <ambientLight intensity={theme === "dark" ? 0.5 : 0.4} color="#ffffff" />
      <hemisphereLight args={["#ffffff", theme === "dark" ? "#2a241f" : "#e6dfd6", theme === "dark" ? 0.92 : 0.75]} />

      <SoftWindowBackdrop theme={theme} reducedDetail={reducedDetail} />

      <GroundedHeroRing
        ringSize={ringSize}
        bandWidth={bandWidth}
        style={style}
        finish={finish}
        heroRotation={heroRotation}
        styleSettings={styleSettings}
        reducedDetail={reducedDetail}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HERO_FLOOR_Y, 0]} receiveShadow>
        <planeGeometry args={[22, 22]} />
        <MeshReflectorMaterial
          blur={[360, 110]}
          resolution={reducedDetail ? 1024 : 2048}
          mirror={theme === "dark" ? 0.42 : 0.68}
          mixBlur={1.2}
          mixStrength={theme === "dark" ? 1.35 : 1.95}
          mixContrast={theme === "dark" ? 0.96 : 1.2}
          roughness={theme === "dark" ? 0.22 : 0.16}
          metalness={0}
          color={floorColor}
          depthScale={theme === "dark" ? 0.18 : 0.24}
          minDepthThreshold={0.4}
          maxDepthThreshold={theme === "dark" ? 1.45 : 1.7}
          reflectorOffset={0.01}
        />
      </mesh>

      <ContactShadows
        position={[0, HERO_FLOOR_Y + 0.01, 0]}
        opacity={0.22}
        scale={5.8}
        blur={4.4}
        far={2.4}
        color={contactShadowColor}
        resolution={reducedDetail ? 512 : 1024}
      />
    </>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="control">
      <label className="control-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  )
}

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel-section">
      <p className="panel-section-label">{title}</p>
      <div className="panel-section-body">{children}</div>
    </section>
  )
}

function App() {
  const [initialConfig] = useState<AppConfig>(() => getInitialConfig())
  const [accessGranted, setAccessGranted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(ACCESS_KEY) === "granted"
  })
  const [accessInput, setAccessInput] = useState("")
  const [accessError, setAccessError] = useState("")
  const [language, setLanguage] = useState<Language>(initialConfig.language)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light"

    const savedTheme = window.localStorage.getItem(THEME_KEY)
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  })
  const [ringSize, setRingSize] = useState(initialConfig.ringSize)
  const [bandWidth, setBandWidth] = useState(initialConfig.bandWidth)
  const [style, setStyle] = useState<StyleId>(initialConfig.style)
  const [finish, setFinish] = useState<FinishId>(initialConfig.finish)
  const [name, setName] = useState(initialConfig.name)
  const [groovedCount, setGroovedCount] = useState<GrooveCount>(initialConfig.groovedCount)
  const [groovedDepth, setGroovedDepth] = useState<GrooveDepth>(initialConfig.groovedDepth)
  const [groovedWidth, setGroovedWidth] = useState<GrooveWidth>(initialConfig.groovedWidth)
  const [facetedCount, setFacetedCount] = useState<FacetCount>(initialConfig.facetedCount)
  const [facetedSharpness, setFacetedSharpness] = useState<FacetedSharpness>(initialConfig.facetedSharpness)
  const [hammeredIntensity, setHammeredIntensity] = useState<HammeredIntensity>(initialConfig.hammeredIntensity)
  const [hammeredScale, setHammeredScale] = useState<HammeredScale>(initialConfig.hammeredScale)
  const [openGapWidth, setOpenGapWidth] = useState<OpenGapWidth>(initialConfig.openGapWidth)
  const [openEdgeTreatment, setOpenEdgeTreatment] = useState<OpenEdgeTreatment>(initialConfig.openEdgeTreatment)
  const [diagonalGapWidth, setDiagonalGapWidth] = useState<DiagonalGapWidth>(initialConfig.diagonalGapWidth)
  const [diagonalDirection, setDiagonalDirection] = useState<DiagonalDirection>(initialConfig.diagonalDirection)
  const [diagonalEdgeTreatment, setDiagonalEdgeTreatment] = useState<DiagonalEdgeTreatment>(initialConfig.diagonalEdgeTreatment)
  const [woodSleeveWoodType, setWoodSleeveWoodType] = useState<WoodType>(initialConfig.woodSleeveWoodType)
  const [woodSleeveThickness, setWoodSleeveThickness] = useState<SleeveThickness>(initialConfig.woodSleeveThickness)
  const [woodInlayWoodType, setWoodInlayWoodType] = useState<WoodType>(initialConfig.woodInlayWoodType)
  const [woodInlayWidth, setWoodInlayWidth] = useState<InlayWidth>(initialConfig.woodInlayWidth)
  const [woodInlayDepth, setWoodInlayDepth] = useState<InlayDepth>(initialConfig.woodInlayDepth)
  const [statusMessage, setStatusMessage] = useState("")
  const [submitState, setSubmitState] = useState<SubmitState>("idle")
  const [autoRotate, setAutoRotate] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth <= 768
  })

  const heroRotation: [number, number, number] = DEFAULT_HERO_ROTATION

  const languageButtonId = useId()
  const nameId = useId()
  const sizeSelectId = useId()
  const diameterRangeId = useId()
  const widthRangeId = useId()
  const styleGroupName = useId()
  const finishGroupName = useId()
  const styleOptionsGroupId = useId()

  const t = {
    title: language === "en" ? "Ring Configurator" : "Ring Konfigurator",
    subtitle: language === "en" ? "Configure size, width, style and finish." : "Konfiguriere Größe, Breite, Stil und Oberfläche.",
    language: language === "en" ? "Language" : "Sprache",
    name: language === "en" ? "Name" : "Name",
    size: language === "en" ? "Size" : "Größe",
    diameter: language === "en" ? "Diameter" : "Durchmesser",
    width: language === "en" ? "Band Width" : "Breite",
    style: language === "en" ? "Style" : "Stil",
    finish: language === "en" ? "Surface Finish" : "Oberfläche",
    identitySection: language === "en" ? "Identity" : "Identität",
    sizeSection: language === "en" ? "Size" : "Größe",
    designSection: language === "en" ? "Design" : "Design",
    surfaceSection: language === "en" ? "Surface" : "Oberfläche",
    actionSection: language === "en" ? "Actions" : "Aktionen",
    reset: language === "en" ? "Reset" : "Zurücksetzen",
    submit: language === "en" ? "Submit Configuration" : "Konfiguration senden",
    share: language === "en" ? "Share" : "Teilen",
    summary: language === "en" ? "Summary" : "Zusammenfassung",
    styleOptionsSection: language === "en" ? "Style options" : "Stiloptionen",
    grooveCount: language === "en" ? "Groove count" : "Anzahl der Rillen",
    grooveDepth: language === "en" ? "Groove depth" : "Rillentiefe",
    grooveWidth: language === "en" ? "Groove width" : "Rillenbreite",
    facetCount: language === "en" ? "Facet count" : "Facettenanzahl",
    facetSharpness: language === "en" ? "Facet sharpness" : "Facettenschärfe",
    hammeredIntensity: language === "en" ? "Hammered intensity" : "Hämmerungsintensität",
    hammeredScale: language === "en" ? "Hammered scale" : "Hämmerungsskala",
    openGapWidth: language === "en" ? "Open gap width" : "Auslassweite",
    openEdgeTreatment: language === "en" ? "Edge treatment" : "Kantenbearbeitung",
    diagonalDirection: language === "en" ? "Diagonal direction" : "Diagonale Richtung",
    diagonalEdgeTreatment: language === "en" ? "Edge treatment" : "Kantenbearbeitung",
    woodType: language === "en" ? "Wood type" : "Holzart",
    sleeveThickness: language === "en" ? "Sleeve thickness" : "Manteldicke",
    inlayWidth: language === "en" ? "Inlay width" : "Einsatzbreite",
    inlayDepth: language === "en" ? "Inlay depth" : "Einsatztiefe",
    topView: language === "en" ? "Top orthographic" : "Orthografisch oben",
    frontView: language === "en" ? "Front orthographic" : "Orthografisch vorne",
    technicalTitle: language === "en" ? "Technical views" : "Technische Ansichten",
    technicalCopy: language === "en" ? "Reference proportions and dimensions alongside the hero render." : "Referenzansichten für Proportionen und Maße unterhalb des Hero-Renderings.",
    circumference: language === "en" ? "Circumference" : "Umfang",
    preview: language === "en" ? "Main 3D preview" : "3D-Hauptansicht",
  }

  useEffect(() => {
    document.documentElement.lang = language
    document.title = t.title
  }, [language, t.title])

  useEffect(() => {
    document.body.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(max-width: 768px)")
    const updateLayoutMode = () => setIsMobileLayout(mediaQuery.matches)

    updateLayoutMode()
    mediaQuery.addEventListener("change", updateLayoutMode)

    return () => mediaQuery.removeEventListener("change", updateLayoutMode)
  }, [])

  useEffect(() => {
    if (!confirmAction) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmAction(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [confirmAction])

  const selectedStyle = styles.find((item) => item.id === style) ?? styles[0]
  const selectedFinish = finishes.find((item) => item.id === finish) ?? finishes[0]
  const circumference = Math.PI * ringSize
  const reducedDetail = isMobileLayout
  const heroCamera = isMobileLayout ? { position: [0, 0.1, 4.4] as [number, number, number], fov: 27 } : { position: [0, 0.28, 7.45] as [number, number, number], fov: 27 }
  const heroTarget: [number, number, number] = isMobileLayout ? [0.02, -0.02, 0] : [0.02, -0.12, 0]
  const heroDpr: [number, number] = isMobileLayout ? [1, 1.25] : [1, 1.75]

  const styleSettings: StyleSettings = {
    groovedCount,
    groovedDepth,
    groovedWidth,
    facetedCount,
    facetedSharpness,
    hammeredIntensity,
    hammeredScale,
    openGapWidth,
    openEdgeTreatment,
    diagonalGapWidth,
    diagonalDirection,
    diagonalEdgeTreatment,
    woodSleeveWoodType,
    woodSleeveThickness,
    woodInlayWoodType,
    woodInlayWidth,
    woodInlayDepth,
  }

  const activeStyleValues = (() => {
    switch (style) {
      case "grooved":
        return { groovedCount, groovedDepth, groovedWidth }
      case "faceted":
        return { facetedCount, facetedSharpness }
      case "hammered":
        return { hammeredIntensity, hammeredScale }
      case "open":
        return { openGapWidth, openEdgeTreatment }
      case "diagonal":
        return { diagonalGapWidth, diagonalDirection, diagonalEdgeTreatment }
      case "woodSleeve":
        return { woodSleeveWoodType, woodSleeveThickness }
      case "woodInlay":
        return { woodInlayWoodType, woodInlayWidth, woodInlayDepth }
      default:
        return {}
    }
  })()

  const config = {
    name,
    language,
    diameterMm: ringSize,
    circumferenceMm: Number(circumference.toFixed(1)),
    bandWidthMm: bandWidth,
    style,
    finish,
    ...activeStyleValues,
    generatedAt: new Date().toISOString(),
  }

  const configSummary = [
    name.trim() || getDefaultName(language),
    `${ringSize.toFixed(1)} mm Ø`,
    `${circumference.toFixed(1)} mm ${language === "en" ? "circumference" : "Umfang"}`,
    `${bandWidth.toFixed(0)} mm ${language === "en" ? "band width" : "Breite"}`,
    language === "en" ? selectedStyle.en : selectedStyle.de,
    language === "en" ? selectedFinish.en : selectedFinish.de,
  ].join(" · ")

  function resetConfig() {
    setRingSize(DEFAULT_CONFIG.ringSize)
    setBandWidth(DEFAULT_CONFIG.bandWidth)
    setStyle(DEFAULT_CONFIG.style)
    setFinish(DEFAULT_CONFIG.finish)
    setGroovedCount(DEFAULT_CONFIG.groovedCount)
    setGroovedDepth(DEFAULT_CONFIG.groovedDepth)
    setGroovedWidth(DEFAULT_CONFIG.groovedWidth)
    setFacetedCount(DEFAULT_CONFIG.facetedCount)
    setFacetedSharpness(DEFAULT_CONFIG.facetedSharpness)
    setHammeredIntensity(DEFAULT_CONFIG.hammeredIntensity)
    setHammeredScale(DEFAULT_CONFIG.hammeredScale)
    setOpenGapWidth(DEFAULT_CONFIG.openGapWidth)
    setOpenEdgeTreatment(DEFAULT_CONFIG.openEdgeTreatment)
    setDiagonalGapWidth(DEFAULT_CONFIG.diagonalGapWidth)
    setDiagonalDirection(DEFAULT_CONFIG.diagonalDirection)
    setDiagonalEdgeTreatment(DEFAULT_CONFIG.diagonalEdgeTreatment)
    setWoodSleeveWoodType(DEFAULT_CONFIG.woodSleeveWoodType)
    setWoodSleeveThickness(DEFAULT_CONFIG.woodSleeveThickness)
    setWoodInlayWoodType(DEFAULT_CONFIG.woodInlayWoodType)
    setWoodInlayWidth(DEFAULT_CONFIG.woodInlayWidth)
    setWoodInlayDepth(DEFAULT_CONFIG.woodInlayDepth)
    setName(getDefaultName(language))
    setStatusMessage(language === "en" ? "Configuration reset." : "Konfiguration zurückgesetzt.")
  }

  async function submitConfig() {
    setSubmitState("sending")
    setStatusMessage(language === "en" ? "Sending configuration..." : "Konfiguration wird gesendet...")

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...config,
          summary: configSummary,
        }),
      })

      if (!response.ok) {
        throw new Error(`Formspree responded with ${response.status}`)
      }

      setSubmitState("success")
      setStatusMessage(language === "en" ? "Configuration submitted." : "Konfiguration gesendet.")
    } catch {
      setSubmitState("error")
      setStatusMessage(language === "en" ? "Submission failed. Please try again." : "Senden fehlgeschlagen. Bitte erneut versuchen.")
    }
  }

  async function shareConfig() {
    const shareData = {
      title: name.trim() || getDefaultName(language),
      text: configSummary,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        setStatusMessage(language === "en" ? "Configuration shared." : "Konfiguration geteilt.")
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }

    try {
      await navigator.clipboard.writeText(configSummary)
      setStatusMessage(language === "en" ? "Summary copied to clipboard." : "Zusammenfassung in die Zwischenablage kopiert.")
    } catch {
      setStatusMessage(language === "en" ? "Sharing failed. Please try again." : "Teilen fehlgeschlagen. Bitte erneut versuchen.")
    }
  }

  async function confirmAndRunAction() {
    if (confirmAction === "submit") {
      setConfirmAction(null)
      await submitConfig()
      return
    }

    if (confirmAction === "reset") {
      setConfirmAction(null)
      resetConfig()
    }
  }

  function submitAccessCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (accessInput === ACCESS_CODE) {
      window.localStorage.setItem(ACCESS_KEY, "granted")
      setAccessGranted(true)
      setAccessError("")
      return
    }

    setAccessError("Incorrect access code.")
  }

  if (!accessGranted) {
    return (
      <div className="access-shell">
        <form className="access-card" onSubmit={submitAccessCode}>
          <p className="eyebrow">Private preview</p>
          <h1>Enter access code</h1>
          <p className="access-copy">Use the shared code to open the configurator.</p>
          <input
            className="field-input access-input"
            type="password"
            value={accessInput}
            onChange={(event) => {
              setAccessInput(event.target.value)
              if (accessError) setAccessError("")
            }}
            aria-label="Access code"
            autoComplete="current-password"
          />
          <button type="submit" className="action-button action-button-primary access-button">Enter</button>
          <div className="access-error" aria-live="polite">{accessError}</div>
        </form>
      </div>
    )
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <button
        type="button"
        className="topbar-toggle theme-toggle"
        onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        aria-label={language === "en" ? "Toggle dark mode" : "Dunkelmodus umschalten"}
      >
        {theme === "light" ? <MoonStar aria-hidden="true" className="topbar-icon ui-icon" strokeWidth={1.9} /> : <SunMedium aria-hidden="true" className="topbar-icon ui-icon" strokeWidth={1.9} />}
      </button>
      <button
        id={languageButtonId}
        type="button"
        className="topbar-toggle language-toggle"
        onClick={() => setLanguage(language === "en" ? "de" : "en")}
        aria-label={language === "en" ? "Switch language to German" : "Sprache auf Englisch wechseln"}
      >
        {language === "en" ? "DE" : "EN"}
      </button>

      <aside className="app-sidebar">
        <div className="sidebar-header">
          <p className="eyebrow">{language === "en" ? "Custom stainless steel ring" : "Individueller Edelstahlring"}</p>
          <h1>{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
        </div>

        <div className="status-message" aria-live="polite">
          {statusMessage}
        </div>

        <PanelSection title={t.identitySection}>

          <Field label={t.name} htmlFor={nameId}>
            <input id={nameId} className="field-input" value={name} onChange={(event) => setName(event.target.value)} aria-label={t.name} />
          </Field>
        </PanelSection>

        <PanelSection title={t.sizeSection}>
          <Field label={t.size} htmlFor={sizeSelectId}>
            <select id={sizeSelectId} className="field-input" value={ringSize} onChange={(event) => setRingSize(Number(event.target.value))}>
              {sizes.map((sizeOption) => (
                <option key={sizeOption.diameter} value={sizeOption.diameter}>
                  {sizeOption.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`${t.diameter}: ${ringSize.toFixed(1)} mm`} htmlFor={diameterRangeId}>
            <input id={diameterRangeId} className="range-input" type="range" min="14" max="24" step="0.1" value={ringSize} onChange={(event) => setRingSize(Number(event.target.value))} />
          </Field>

          <Field label={`${t.width}: ${bandWidth.toFixed(0)} mm`} htmlFor={widthRangeId}>
            <input id={widthRangeId} className="range-input" type="range" min="1" max="10" step="1" value={bandWidth} onChange={(event) => setBandWidth(Number(event.target.value))} />
          </Field>
        </PanelSection>

        <PanelSection title={t.designSection}>
          <fieldset className="option-group">
            <legend className="sr-only">{t.style}</legend>
            <div className="option-grid option-grid-styles">
              {styles.map((item) => {
                const optionId = `${styleGroupName}-${item.id}`

                return (
                  <label key={item.id} className="option-label" htmlFor={optionId}>
                    <input id={optionId} className="option-input" type="radio" name={styleGroupName} value={item.id} checked={style === item.id} onChange={() => setStyle(item.id)} />
                    <span className="option-card option-card-style">
                      <span className={`style-preview style-preview-${item.id}`} aria-hidden="true" />
                      <strong>{language === "en" ? item.en : item.de}</strong>
                      <span>{language === "en" ? item.descEn : item.descDe}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </PanelSection>

        {(style === "grooved" || style === "faceted" || style === "hammered" || style === "open" || style === "diagonal" || style === "woodSleeve" || style === "woodInlay") && (
          <PanelSection title={t.styleOptionsSection}>
            <div className="option-group">
              {style === "grooved" && (
                <>
                  <Field label={t.grooveCount} htmlFor={`${styleOptionsGroupId}-grooved-count`}>
                    <select
                      id={`${styleOptionsGroupId}-grooved-count`}
                      className="field-input"
                      value={groovedCount}
                      onChange={(event) => setGroovedCount(event.target.value as GrooveCount)}
                    >
                      <option value="single">{language === "en" ? "Single" : "Einzeln"}</option>
                      <option value="double">{language === "en" ? "Double" : "Doppelt"}</option>
                      <option value="triple">{language === "en" ? "Triple" : "Dreifach"}</option>
                    </select>
                  </Field>
                  <Field label={t.grooveDepth} htmlFor={`${styleOptionsGroupId}-grooved-depth`}>
                    <select
                      id={`${styleOptionsGroupId}-grooved-depth`}
                      className="field-input"
                      value={groovedDepth}
                      onChange={(event) => setGroovedDepth(event.target.value as GrooveDepth)}
                    >
                      <option value="subtle">{language === "en" ? "Subtle" : "Fein"}</option>
                      <option value="medium">{language === "en" ? "Medium" : "Mittel"}</option>
                      <option value="deep">{language === "en" ? "Deep" : "Tief"}</option>
                    </select>
                  </Field>
                  <Field label={t.grooveWidth} htmlFor={`${styleOptionsGroupId}-grooved-width`}>
                    <select
                      id={`${styleOptionsGroupId}-grooved-width`}
                      className="field-input"
                      value={groovedWidth}
                      onChange={(event) => setGroovedWidth(event.target.value as GrooveWidth)}
                    >
                      <option value="fine">{language === "en" ? "Fine" : "Fein"}</option>
                      <option value="medium">{language === "en" ? "Medium" : "Mittel"}</option>
                      <option value="wide">{language === "en" ? "Wide" : "Breit"}</option>
                    </select>
                  </Field>
                </>
              )}

              {style === "faceted" && (
                <>
                  <Field label={t.facetCount} htmlFor={`${styleOptionsGroupId}-faceted-count`}>
                    <select
                      id={`${styleOptionsGroupId}-faceted-count`}
                      className="field-input"
                      value={facetedCount}
                      onChange={(event) => setFacetedCount(event.target.value as FacetCount)}
                    >
                      <option value="subtle">{language === "en" ? "Subtle" : "Fein"}</option>
                      <option value="classic">{language === "en" ? "Classic" : "Klassisch"}</option>
                      <option value="bold">{language === "en" ? "Bold" : "Markant"}</option>
                    </select>
                  </Field>
                  <Field label={t.facetSharpness} htmlFor={`${styleOptionsGroupId}-faceted-sharpness`}>
                    <select
                      id={`${styleOptionsGroupId}-faceted-sharpness`}
                      className="field-input"
                      value={facetedSharpness}
                      onChange={(event) => setFacetedSharpness(event.target.value as FacetedSharpness)}
                    >
                      <option value="soft">{language === "en" ? "Soft" : "Sanft"}</option>
                      <option value="crisp">{language === "en" ? "Crisp" : "Klar"}</option>
                    </select>
                  </Field>
                </>
              )}

              {style === "hammered" && (
                <>
                  <Field label={t.hammeredIntensity} htmlFor={`${styleOptionsGroupId}-hammered-intensity`}>
                    <select
                      id={`${styleOptionsGroupId}-hammered-intensity`}
                      className="field-input"
                      value={hammeredIntensity}
                      onChange={(event) => setHammeredIntensity(event.target.value as HammeredIntensity)}
                    >
                      <option value="subtle">{language === "en" ? "Subtle" : "Fein"}</option>
                      <option value="medium">{language === "en" ? "Medium" : "Mittel"}</option>
                      <option value="pronounced">{language === "en" ? "Pronounced" : "Ausgeprägt"}</option>
                    </select>
                  </Field>
                  <Field label={t.hammeredScale} htmlFor={`${styleOptionsGroupId}-hammered-scale`}>
                    <select
                      id={`${styleOptionsGroupId}-hammered-scale`}
                      className="field-input"
                      value={hammeredScale}
                      onChange={(event) => setHammeredScale(event.target.value as HammeredScale)}
                    >
                      <option value="fine">{language === "en" ? "Fine" : "Fein"}</option>
                      <option value="medium">{language === "en" ? "Medium" : "Mittel"}</option>
                      <option value="coarse">{language === "en" ? "Coarse" : "Grob"}</option>
                    </select>
                  </Field>
                </>
              )}

              {style === "open" && (
                <>
                  <Field label={t.openGapWidth} htmlFor={`${styleOptionsGroupId}-open-gap-width`}>
                    <select
                      id={`${styleOptionsGroupId}-open-gap-width`}
                      className="field-input"
                      value={openGapWidth}
                      onChange={(event) => setOpenGapWidth(event.target.value as OpenGapWidth)}
                    >
                      <option value="subtle">{language === "en" ? "Subtle" : "Fein"}</option>
                      <option value="medium">{language === "en" ? "Medium" : "Mittel"}</option>
                      <option value="bold">{language === "en" ? "Bold" : "Markant"}</option>
                    </select>
                  </Field>
                  <Field label={t.openEdgeTreatment} htmlFor={`${styleOptionsGroupId}-open-edge-treatment`}>
                    <select
                      id={`${styleOptionsGroupId}-open-edge-treatment`}
                      className="field-input"
                      value={openEdgeTreatment}
                      onChange={(event) => setOpenEdgeTreatment(event.target.value as OpenEdgeTreatment)}
                    >
                      <option value="razor">{language === "en" ? "Razor" : "Scharf"}</option>
                      <option value="softened">{language === "en" ? "Softened" : "Abgemildert"}</option>
                      <option value="rounded">{language === "en" ? "Rounded" : "Abgerundet"}</option>
                    </select>
                  </Field>
                </>
              )}

              {style === "diagonal" && (
                <>
                  <Field label={t.diagonalDirection} htmlFor={`${styleOptionsGroupId}-diagonal-direction`}>
                    <select
                      id={`${styleOptionsGroupId}-diagonal-direction`}
                      className="field-input"
                      value={diagonalDirection}
                      onChange={(event) => setDiagonalDirection(event.target.value as DiagonalDirection)}
                    >
                      <option value="leftRising">{language === "en" ? "Left rising" : "Links steigend"}</option>
                      <option value="rightRising">{language === "en" ? "Right rising" : "Rechts steigend"}</option>
                    </select>
                  </Field>
                  <Field label={t.diagonalEdgeTreatment} htmlFor={`${styleOptionsGroupId}-diagonal-edge-treatment`}>
                    <select
                      id={`${styleOptionsGroupId}-diagonal-edge-treatment`}
                      className="field-input"
                      value={diagonalEdgeTreatment}
                      onChange={(event) => setDiagonalEdgeTreatment(event.target.value as DiagonalEdgeTreatment)}
                    >
                      <option value="razor">{language === "en" ? "Razor" : "Scharf"}</option>
                      <option value="softened">{language === "en" ? "Softened" : "Abgemildert"}</option>
                    </select>
                  </Field>
                </>
              )}

              {style === "woodSleeve" && (
                <>
                  <Field label={t.woodType} htmlFor={`${styleOptionsGroupId}-wood-sleeve-type`}>
                    <select
                      id={`${styleOptionsGroupId}-wood-sleeve-type`}
                      className="field-input"
                      value={woodSleeveWoodType}
                      onChange={(event) => setWoodSleeveWoodType(event.target.value as WoodType)}
                    >
                      <option value="walnut">{language === "en" ? "Walnut" : "Walnuss"}</option>
                      <option value="oak">{language === "en" ? "Oak" : "Eiche"}</option>
                      <option value="ebony">{language === "en" ? "Ebony" : "Ebenholz"}</option>
                      <option value="maple">{language === "en" ? "Maple" : "Ahorn"}</option>
                    </select>
                  </Field>
                  <Field label={t.sleeveThickness} htmlFor={`${styleOptionsGroupId}-wood-sleeve-thickness`}>
                    <select
                      id={`${styleOptionsGroupId}-wood-sleeve-thickness`}
                      className="field-input"
                      value={woodSleeveThickness}
                      onChange={(event) => setWoodSleeveThickness(event.target.value as SleeveThickness)}
                    >
                      <option value="slim">{language === "en" ? "Slim" : "Schmal"}</option>
                      <option value="medium">{language === "en" ? "Medium" : "Mittel"}</option>
                      <option value="bold">{language === "en" ? "Bold" : "Markant"}</option>
                    </select>
                  </Field>
                </>
              )}

              {style === "woodInlay" && (
                <>
                  <Field label={t.woodType} htmlFor={`${styleOptionsGroupId}-wood-inlay-type`}>
                    <select
                      id={`${styleOptionsGroupId}-wood-inlay-type`}
                      className="field-input"
                      value={woodInlayWoodType}
                      onChange={(event) => setWoodInlayWoodType(event.target.value as WoodType)}
                    >
                      <option value="walnut">{language === "en" ? "Walnut" : "Walnuss"}</option>
                      <option value="oak">{language === "en" ? "Oak" : "Eiche"}</option>
                      <option value="ebony">{language === "en" ? "Ebony" : "Ebenholz"}</option>
                      <option value="maple">{language === "en" ? "Maple" : "Ahorn"}</option>
                    </select>
                  </Field>
                  <Field label={t.inlayWidth} htmlFor={`${styleOptionsGroupId}-wood-inlay-width`}>
                    <select
                      id={`${styleOptionsGroupId}-wood-inlay-width`}
                      className="field-input"
                      value={woodInlayWidth}
                      onChange={(event) => setWoodInlayWidth(event.target.value as InlayWidth)}
                    >
                      <option value="narrow">{language === "en" ? "Narrow" : "Schmal"}</option>
                      <option value="medium">{language === "en" ? "Medium" : "Mittel"}</option>
                      <option value="wide">{language === "en" ? "Wide" : "Breit"}</option>
                    </select>
                  </Field>
                  <Field label={t.inlayDepth} htmlFor={`${styleOptionsGroupId}-wood-inlay-depth`}>
                    <select
                      id={`${styleOptionsGroupId}-wood-inlay-depth`}
                      className="field-input"
                      value={woodInlayDepth}
                      onChange={(event) => setWoodInlayDepth(event.target.value as InlayDepth)}
                    >
                      <option value="shallow">{language === "en" ? "Shallow" : "Flach"}</option>
                      <option value="medium">{language === "en" ? "Medium" : "Mittel"}</option>
                      <option value="deep">{language === "en" ? "Deep" : "Tief"}</option>
                    </select>
                  </Field>
                </>
              )}
            </div>
          </PanelSection>
        )}

        <PanelSection title={t.surfaceSection}>
          <fieldset className="option-group">
            <legend className="sr-only">{t.finish}</legend>
            <div className="option-grid option-grid-finishes">
              {finishes.map((item) => {
                const optionId = `${finishGroupName}-${item.id}`

                return (
                  <label key={item.id} className="option-label" htmlFor={optionId}>
                    <input id={optionId} className="option-input" type="radio" name={finishGroupName} value={item.id} checked={finish === item.id} onChange={() => setFinish(item.id)} />
                    <span className="option-card option-card-finish">
                      <span className={`swatch swatch-${item.id}`} aria-hidden="true" />
                      <span className="finish-label-text">{language === "en" ? item.en : item.de}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </PanelSection>

        <PanelSection title={t.actionSection}>
          <div className="action-row action-row-primary">
            <button type="button" className="action-button action-button-emphasis" onClick={() => setConfirmAction("submit")} disabled={submitState === "sending"}>
              <span className="action-button-content">
                <SendHorizontal aria-hidden="true" className="button-icon ui-icon" strokeWidth={1.9} />
                <span>{t.submit}</span>
              </span>
            </button>
            <button type="button" className="action-button action-button-reset" onClick={() => setConfirmAction("reset")}>{t.reset}</button>
            <button type="button" className="action-button action-button-icon" onClick={() => void shareConfig()} aria-label={language === "en" ? "Share configuration" : "Konfiguration teilen"}>
              <Share2 aria-hidden="true" className="share-icon ui-icon" strokeWidth={1.9} />
            </button>
          </div>
        </PanelSection>

        <section className="summary-card" aria-label={t.summary}>
          <strong>{t.summary}</strong>
          <dl className="summary-list">
            <div className="summary-row"><dt>{language === "en" ? "Ring" : "Ring"}</dt><dd>{name}</dd></div>
            <div className="summary-row"><dt>{t.diameter}</dt><dd>{ringSize.toFixed(1)} mm</dd></div>
            <div className="summary-row"><dt>{t.circumference}</dt><dd>{circumference.toFixed(1)} mm</dd></div>
            <div className="summary-row"><dt>{t.width}</dt><dd>{bandWidth.toFixed(0)} mm</dd></div>
            <div className="summary-row"><dt>{t.style}</dt><dd>{language === "en" ? selectedStyle.en : selectedStyle.de}</dd></div>
            <div className="summary-row"><dt>{t.finish}</dt><dd>{language === "en" ? selectedFinish.en : selectedFinish.de}</dd></div>
          </dl>
        </section>
      </aside>

      <main className="app-main">
        <div className="preview-stack">
          <section className="main-view-card" aria-label={t.preview}>
            <div className="hero-aspect">
              <Canvas camera={heroCamera} shadows dpr={heroDpr} frameloop={autoRotate ? "always" : "demand"}>
                <StudioScene ringSize={ringSize} bandWidth={bandWidth} style={style} finish={finish} heroRotation={heroRotation} styleSettings={styleSettings} theme={theme} reducedDetail={reducedDetail} />
                <OrbitControls
                  key="orbit-controls"
                  enableDamping={false}
                  dampingFactor={0}
                  enablePan={false}
                  autoRotate={autoRotate}
                  autoRotateSpeed={0.7}
                  target={heroTarget}
                  minDistance={isMobileLayout ? 3.8 : 4.2}
                  maxDistance={isMobileLayout ? 6.2 : 7.5}
                  minPolarAngle={Math.PI / 3.2}
                  maxPolarAngle={Math.PI / 1.95}
                />
              </Canvas>
              <button
                type="button"
                className={`hero-rotate-button${autoRotate ? "" : " is-inactive"}`}
                onClick={() => setAutoRotate((current) => !current)}
                aria-label={language === "en" ? "Toggle rotation" : "Rotation umschalten"}
              >
                <RotateCcw aria-hidden="true" className="hero-rotate-icon ui-icon" strokeWidth={1.9} />
              </button>
            </div>
          </section>

          <section className="technical-section" aria-label={t.technicalTitle}>
            <div className="technical-header">
              <p className="technical-eyebrow">{t.technicalTitle}</p>
              <p className="technical-copy">{t.technicalCopy}</p>
            </div>

            <section className="ortho-grid">
              <OrthoView title={t.topView} kind="top" cameraPosition={[0, 3, 0]} cameraUp={[0, 0, -1]} ringSize={ringSize} bandWidth={bandWidth} style={style} finish={finish} language={language} styleSettings={styleSettings} theme={theme} reducedDetail={reducedDetail} />
              <OrthoView title={t.frontView} kind="front" cameraPosition={[0, 0, 3]} cameraUp={[0, 1, 0]} ringSize={ringSize} bandWidth={bandWidth} style={style} finish={finish} language={language} styleSettings={styleSettings} theme={theme} reducedDetail={reducedDetail} className="ortho-card-front" />
            </section>
          </section>
        </div>
      </main>

      {confirmAction && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmAction(null)
            }
          }}
        >
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
            <h2 id="confirm-dialog-title" className="modal-title">
              {confirmAction === "submit"
                ? language === "en"
                  ? "Submit configuration?"
                  : "Konfiguration senden?"
                : language === "en"
                ? "Reset configuration?"
                : "Konfiguration zurücksetzen?"}
            </h2>
            <p className="modal-body">
              {confirmAction === "submit"
                ? language === "en"
                  ? "This will send your current ring configuration to the maker."
                  : "Deine aktuelle Ringkonfiguration wird an den Hersteller gesendet."
                : language === "en"
                ? "This will discard your current settings and restore the default ring."
                : "Deine aktuellen Einstellungen werden verworfen und der Standardring wird wiederhergestellt."}
            </p>
            <div className="modal-actions">
              <button type="button" className="action-button action-button-secondary" onClick={() => setConfirmAction(null)}>
                {language === "en" ? "Cancel" : "Abbrechen"}
              </button>
              <button
                type="button"
                className={`action-button ${confirmAction === "submit" ? "action-button-emphasis" : "action-button-reset"}`}
                onClick={() => void confirmAndRunAction()}
              >
                {confirmAction === "submit"
                  ? language === "en"
                    ? "Submit"
                    : "Senden"
                  : language === "en"
                  ? "Reset"
                  : "Zurücksetzen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
