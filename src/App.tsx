import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { MoonStar, RotateCcw, SendHorizontal, Share2, SunMedium } from "lucide-react"
import * as THREE from "three"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
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
type OuterEdgeTreatment = "none" | "rounded" | "chamfer"
type DiagonalGapWidth = "subtle" | "medium" | "bold"
type DiagonalDirection = "leftRising" | "rightRising"
type DiagonalEdgeTreatment = "razor" | "softened"
type FacetedEdgeMode = "soft" | "hard"
type DiagonalCutAngle = "gentle" | "standard" | "steep"
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
  metalness: number
  envMapIntensity: number
  clearcoat: number
  clearcoatRoughness: number
  anisotropy?: number
  anisotropyRotation?: number
  bumpScale?: number
}

type StoredConfig = {
  language?: Language
  ringSize?: number
  bandWidth?: number
  style?: StyleId | "flat"
  finish?: FinishId
  name?: string
  groovedCount?: GrooveCount | number
  groovedDepth?: GrooveDepth | number
  groovedWidth?: GrooveWidth | number
  groovedWidthMm?: number
  groovedDepthMm?: number
  groovedEdgeSpaceMm?: number
  groovedOuterCrestMm?: number
  facetedCount?: FacetCount | number
  facetedSharpness?: FacetedSharpness
  facetedEdgeMode?: FacetedEdgeMode
  hammeredIntensity?: HammeredIntensity
  hammeredScale?: HammeredScale
  openGapWidth?: OpenGapWidth
  openEdgeTreatment?: OpenEdgeTreatment
  openOpeningMm?: number
  openRoundedEdgeRadiusMm?: number
  diagonalGapWidth?: DiagonalGapWidth
  diagonalDirection?: DiagonalDirection
  diagonalEdgeTreatment?: DiagonalEdgeTreatment
  diagonalOpeningMm?: number
  diagonalEdgeFinish?: DiagonalEdgeTreatment
  diagonalCutAngle?: DiagonalCutAngle | number
  woodSleeveWoodType?: WoodType
  woodSleeveThickness?: SleeveThickness
  woodInlayWoodType?: WoodType
  woodInlayEdgeSpaceMm?: number
  woodInlayWidth?: InlayWidth | number
  woodInlayWidthMm?: number
  woodInlayDepth?: InlayDepth
  woodInlayChamfer?: boolean
  outerEdgeTreatment?: OuterEdgeTreatment
  outerEdgeChamferMm?: number
}

type AppConfig = {
  language: Language
  ringSize: number
  bandWidth: number
  style: StyleId
  finish: FinishId
  name: string
  groovedWidthMm: number
  groovedDepthMm: number
  groovedCount: number
  groovedEdgeSpaceMm: number
  facetedCount: number
  facetedEdgeMode: FacetedEdgeMode
  openOpeningMm: number
  openGapEndRoundingMm: number
  diagonalOpeningMm: number
  diagonalDirection: DiagonalDirection
  diagonalEdgeFinish: DiagonalEdgeTreatment
  diagonalCutAngle: DiagonalCutAngle
  outerEdgeTreatment: OuterEdgeTreatment
  woodSleeveWoodType: WoodType
  woodInlayWoodType: WoodType
  woodInlayEdgeSpaceMm: number
  woodInlayChamfer: boolean
  outerEdgeChamferMm: number
}

type StyleSettings = {
  ringSize: number
  bandWidth: number
  groovedWidthMm: number
  groovedDepthMm: number
  groovedCount: number
  groovedEdgeSpaceMm: number
  facetedCount: number
  facetedEdgeMode: FacetedEdgeMode
  openOpeningMm: number
  openGapEndRoundingMm: number
  diagonalOpeningMm: number
  diagonalDirection: DiagonalDirection
  diagonalEdgeFinish: DiagonalEdgeTreatment
  diagonalCutAngle: DiagonalCutAngle
  outerEdgeTreatment: OuterEdgeTreatment
  woodSleeveWoodType: WoodType
  woodInlayWoodType: WoodType
  woodInlayEdgeSpaceMm: number
  woodInlayChamfer: boolean
  outerEdgeChamferMm: number
}

type SubmitState = "idle" | "sending" | "success" | "error"
type ThemeMode = "light" | "dark"
type ConfirmAction = "submit" | "reset" | null
type LayoutMode = "ultraWide" | "desktop" | "laptop" | "tablet" | "mobile" | "compactMobile"

const STORAGE_KEY = "ring-config"
const ACCESS_KEY = "ring-config-access"
const ACCESS_CODE = "4827"
const THEME_KEY = "ring-config-theme"
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mzdywkpb"
const MM_TO_SCENE = 0.045
const BAND_WIDTH_MIN_MM = 2.0
const BAND_WIDTH_MAX_MM = 10.0
const WALL_THICKNESS_MM = 2.0
const WOOD_SLEEVE_THICKNESS_MM = 0.5
const WOOD_INLAY_EDGE_MM = 1.0
const WOOD_INLAY_MIN_EDGE_SPACE_MM = 0.5
const WOOD_INLAY_MIN_VISIBLE_WIDTH_MM = 1.2
const WOOD_INLAY_RECESS_MM = 0.38
const WOOD_INLAY_SEAM_MM = 0.05
const WOOD_INLAY_CHANNEL_CHAMFER_MM = 0.2
const FACET_MIN_ARC_MM = 2.2
const MIN_GROOVE_METAL_GAP_MM = 0.4
const OUTER_EDGE_SIZE_OPTIONS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

const DEFAULT_CONFIG: AppConfig = {
  language: "en",
  ringSize: 18.1,
  bandWidth: 7,
  style: "simple",
  finish: "polished",
  name: "My Ring",
  groovedWidthMm: 1,
  groovedDepthMm: 0.45,
  groovedCount: 2,
  groovedEdgeSpaceMm: 1.5,
  facetedCount: 14,
  facetedEdgeMode: "hard",
  openOpeningMm: 5,
  openGapEndRoundingMm: 0.8,
  diagonalOpeningMm: 5,
  diagonalDirection: "rightRising",
  diagonalEdgeFinish: "softened",
  diagonalCutAngle: "standard",
  outerEdgeTreatment: "chamfer",
  woodSleeveWoodType: "walnut",
  woodInlayWoodType: "walnut",
  woodInlayEdgeSpaceMm: WOOD_INLAY_EDGE_MM,
  woodInlayChamfer: true,
  outerEdgeChamferMm: 0.6,
}

const STYLE_DEFAULTS: Record<StyleId, Partial<AppConfig>> = {
  simple: {
    outerEdgeChamferMm: DEFAULT_CONFIG.outerEdgeChamferMm,
  },
  domed: {
    finish: "polished",
    outerEdgeChamferMm: 0.6,
  },
  grooved: {
    groovedWidthMm: 1,
    groovedDepthMm: 0.45,
    groovedCount: 2,
    groovedEdgeSpaceMm: 2.0,
    outerEdgeChamferMm: 0.6,
  },
  faceted: {
    facetedCount: 20,
    facetedEdgeMode: "soft",
    outerEdgeChamferMm: 0.6,
  },
  hammered: {
    outerEdgeChamferMm: 0.6,
  },
  open: {
    openOpeningMm: 5,
    openGapEndRoundingMm: 0.0,
    outerEdgeChamferMm: 0.6,
  },
  diagonal: {
    diagonalOpeningMm: 5,
    diagonalDirection: "rightRising",
    diagonalEdgeFinish: "softened",
    diagonalCutAngle: "standard",
    outerEdgeChamferMm: 0.6,
  },
  woodSleeve: {
    woodSleeveWoodType: "walnut",
    outerEdgeChamferMm: 0.6,
  },
  woodInlay: {
    woodInlayWoodType: "walnut",
    woodInlayEdgeSpaceMm: WOOD_INLAY_EDGE_MM,
    woodInlayChamfer: true,
    outerEdgeChamferMm: 0.6,
  },
}

const DEFAULT_HERO_ROTATION: [number, number, number] = [-0.38, -0.58, -0.18]
const AUTO_ROTATE_SPEED = 0.34
const AUTO_ROTATE_RESUME_DELAY_MS = 1600
const HERO_FLOOR_Y = -1.08
const HERO_FLOOR_CLEARANCE = 0.003

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
  { id: "normal", en: "Normal", de: "Normal", colour: "#d8d6d1", roughness: 0.28, metalness: 1, envMapIntensity: 1.72, clearcoat: 0.35, clearcoatRoughness: 0.22 },
  { id: "matte", en: "Matte", de: "Matt", colour: "#cfd2d2", roughness: 0.76, metalness: 1, envMapIntensity: 1.02, clearcoat: 0.12, clearcoatRoughness: 0.6 },
  { id: "polished", en: "Polished", de: "Poliert", colour: "#f4f1ea", roughness: 0.065, metalness: 1, envMapIntensity: 2.45, clearcoat: 0.9, clearcoatRoughness: 0.06 },
  { id: "brushed", en: "Brushed", de: "Gebürstet", colour: "#d6d8d8", roughness: 0.38, metalness: 1, envMapIntensity: 1.58, clearcoat: 0.35, clearcoatRoughness: 0.32, anisotropy: 0.85, anisotropyRotation: Math.PI / 2, bumpScale: 0.008 },
  { id: "oxidised", en: "Oxidised", de: "Oxidiert", colour: "#566675", roughness: 0.52, metalness: 0.95, envMapIntensity: 1.18, clearcoat: 0.28, clearcoatRoughness: 0.38 },
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

const diagonalDirectionIds = new Set<DiagonalDirection>(["leftRising", "rightRising"])
const woodTypeIds = new Set<WoodType>(["walnut", "oak", "ebony", "maple"])

const styleIds = new Set(styles.map((item) => item.id))
const finishIds = new Set(finishes.map((item) => item.id))

function normaliseStyleValue<T>(value: unknown, validSet: Set<T>, fallback: T): T {
  return validSet.has(value as T) ? (value as T) : fallback
}

function mmToScene(mm: number) {
  return mm * MM_TO_SCENE
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function snapToNearestSize(value: number) {
  return sizes.reduce((closest, option) =>
    Math.abs(option.diameter - value) < Math.abs(closest.diameter - value) ? option : closest
  ).diameter
}

function getCircumferenceMm(diameterMm: number) {
  return Math.PI * diameterMm
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => window.clearTimeout(timeout)
  }, [value, delayMs])

  return debouncedValue
}

function getCentreRadiusMm(diameterMm: number) {
  return diameterMm / 2 + WALL_THICKNESS_MM / 2
}

function getMaxGrooveCount(bandWidthMm: number, grooveWidthMm: number, edgeSpaceMm: number) {
  const usableWidthMm = Math.max(0, bandWidthMm - 2 * edgeSpaceMm)
  return Math.max(1, Math.floor((usableWidthMm + MIN_GROOVE_METAL_GAP_MM) / (grooveWidthMm + MIN_GROOVE_METAL_GAP_MM)))
}

function getGrooveLayoutMm(bandWidthMm: number, grooveWidthMm: number, grooveCount: number, edgeSpaceMm: number) {
  const usableWidthMm = Math.max(0, bandWidthMm - 2 * edgeSpaceMm)
  let clampedCount = clamp(Math.round(grooveCount), 1, getMaxGrooveCount(bandWidthMm, grooveWidthMm, edgeSpaceMm))
  const centers: number[] = []
  const intervals: Array<{ startMm: number; endMm: number; centerMm: number }> = []

  while (
    clampedCount > 1 &&
    (usableWidthMm < clampedCount * grooveWidthMm ||
      (usableWidthMm - clampedCount * grooveWidthMm) / (clampedCount - 1) < MIN_GROOVE_METAL_GAP_MM)
  ) {
    clampedCount -= 1
  }

  if (clampedCount === 1) {
    centers.push(0)
    intervals.push({
      startMm: -grooveWidthMm / 2,
      endMm: grooveWidthMm / 2,
      centerMm: 0,
    })
  } else {
    const totalGrooveWidthMm = clampedCount * grooveWidthMm
    const innerGapMm = (usableWidthMm - totalGrooveWidthMm) / (clampedCount - 1)
    const firstGrooveStartMm = -bandWidthMm / 2 + edgeSpaceMm

    for (let index = 0; index < clampedCount; index += 1) {
      const startMm = firstGrooveStartMm + index * (grooveWidthMm + innerGapMm)
      const endMm = startMm + grooveWidthMm
      const centerMm = (startMm + endMm) / 2
      centers.push(centerMm)
      intervals.push({ startMm, endMm, centerMm })
    }
  }

  return {
    centers,
    intervals,
    grooveCount: clampedCount,
    usableWidthMm,
  }
}

function getDiagonalCutAngleDegrees(cutAngle: DiagonalCutAngle) {
  return cutAngle === "gentle" ? 20 : cutAngle === "steep" ? 50 : 35
}

function snapOuterEdgeSizeMm(value: number) {
  if (value < OUTER_EDGE_SIZE_OPTIONS[0] * 0.5) return 0

  return OUTER_EDGE_SIZE_OPTIONS.reduce((closest, option) =>
    Math.abs(option - value) < Math.abs(closest - value) ? option : closest
  )
}

function getOuterEdgeSizeScene(sizeMm: number, radialLimit: number, bandHalfWidth: number) {
  return clamp(mmToScene(sizeMm), 0, Math.min(radialLimit, bandHalfWidth * 0.45))
}

function pushUniquePoint(points: THREE.Vector2[], point: THREE.Vector2) {
  const previous = points[points.length - 1]
  if (previous && previous.equals(point)) return
  points.push(point)
}

function appendUniquePoints(points: THREE.Vector2[], nextPoints: THREE.Vector2[]) {
  nextPoints.forEach((point) => pushUniquePoint(points, point))
}

function getOuterEdgeProfile(
  outerRadius: number,
  bandHalfWidth: number,
  edgeSize: number,
  treatment: OuterEdgeTreatment
) {
  if (treatment === "none" || edgeSize <= 0.0001) {
    return {
      bottom: [new THREE.Vector2(outerRadius, -bandHalfWidth)],
      top: [new THREE.Vector2(outerRadius, bandHalfWidth)],
      sideStartY: -bandHalfWidth,
      sideEndY: bandHalfWidth,
    }
  }

  if (treatment === "rounded") {
    const segments = 4
    const bottomCenter = new THREE.Vector2(outerRadius - edgeSize, -bandHalfWidth + edgeSize)
    const topCenter = new THREE.Vector2(outerRadius - edgeSize, bandHalfWidth - edgeSize)
    const bottom: THREE.Vector2[] = []
    const top: THREE.Vector2[] = []

    for (let index = 0; index <= segments; index += 1) {
      const t = index / segments
      const bottomAngle = -Math.PI / 2 + t * (Math.PI / 2)
      const topAngle = t * (Math.PI / 2)

      bottom.push(
        new THREE.Vector2(
          bottomCenter.x + Math.cos(bottomAngle) * edgeSize,
          bottomCenter.y + Math.sin(bottomAngle) * edgeSize
        )
      )
      top.push(
        new THREE.Vector2(
          topCenter.x + Math.cos(topAngle) * edgeSize,
          topCenter.y + Math.sin(topAngle) * edgeSize
        )
      )
    }

    return {
      bottom,
      top,
      sideStartY: -bandHalfWidth + edgeSize,
      sideEndY: bandHalfWidth - edgeSize,
    }
  }

  return {
    bottom: [
      new THREE.Vector2(outerRadius - edgeSize, -bandHalfWidth),
      new THREE.Vector2(outerRadius, -bandHalfWidth + edgeSize),
    ],
    top: [
      new THREE.Vector2(outerRadius, bandHalfWidth - edgeSize),
      new THREE.Vector2(outerRadius - edgeSize, bandHalfWidth),
    ],
    sideStartY: -bandHalfWidth + edgeSize,
    sideEndY: bandHalfWidth - edgeSize,
  }
}

function getGrooveShoulderMm(grooveWidthMm: number) {
  return Math.min(0.22, grooveWidthMm * 0.25)
}

function getGrooveContourSection(
  grooveStartY: number,
  grooveEndY: number,
  outerRadius: number,
  grooveDepthScene: number,
  shoulderScene: number
) {
  const clampedEndY = Math.max(grooveStartY, grooveEndY)
  const grooveSpan = clampedEndY - grooveStartY
  const shoulder = Math.min(shoulderScene, grooveSpan * 0.49)
  const bottomStartY = Math.min(clampedEndY, grooveStartY + shoulder)
  const bottomEndY = Math.max(bottomStartY, clampedEndY - shoulder)

  return {
    bottomStartY,
    bottomEndY,
    points: [
      new THREE.Vector2(outerRadius, grooveStartY),
      new THREE.Vector2(outerRadius - grooveDepthScene * 0.35, grooveStartY + shoulder * 0.35),
      new THREE.Vector2(outerRadius - grooveDepthScene, bottomStartY),
      new THREE.Vector2(outerRadius - grooveDepthScene, bottomEndY),
      new THREE.Vector2(outerRadius - grooveDepthScene * 0.35, clampedEndY - shoulder * 0.35),
      new THREE.Vector2(outerRadius, clampedEndY),
    ],
  }
}

function getOpenEndRoundingAngle(
  point: THREE.Vector2,
  innerRadius: number,
  outerRadius: number,
  bandHalfWidth: number,
  styleSettings: StyleSettings
) {
  if (styleSettings.openGapEndRoundingMm <= 0) return 0

  const radialSpan = Math.max(outerRadius - innerRadius, 0.0001)
  const radialProgress = clamp((point.x - innerRadius) / radialSpan, 0, 1)
  const normalizedBandOffset = clamp(Math.abs(point.y) / Math.max(bandHalfWidth, 0.0001), 0, 1)
  const centreBias = Math.cos(normalizedBandOffset * Math.PI * 0.5)
  const edgeCarry = THREE.MathUtils.lerp(0.62, 1, Math.pow(centreBias, 0.9))
  const roundWeight = Math.pow(radialProgress, 1.28) * edgeCarry
  const maxAngle = styleSettings.openGapEndRoundingMm / getCentreRadiusMm(styleSettings.ringSize)

  return maxAngle * roundWeight
}

function refineClosedProfile(points: THREE.Vector2[], maxSegmentLength: number) {
  if (points.length < 2 || maxSegmentLength <= 0) return points

  const refined: THREE.Vector2[] = []

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]
    const end = points[(index + 1) % points.length]
    const distance = start.distanceTo(end)
    const segments = Math.max(1, Math.ceil(distance / maxSegmentLength))

    refined.push(start.clone())

    for (let segmentIndex = 1; segmentIndex < segments; segmentIndex += 1) {
      const t = segmentIndex / segments
      refined.push(start.clone().lerp(end, t))
    }
  }

  return refined
}

function getWoodInlayMaxEdgeSpaceMm(bandWidthMm: number) {
  return Math.max(WOOD_INLAY_MIN_EDGE_SPACE_MM, bandWidthMm / 2 - WOOD_INLAY_MIN_VISIBLE_WIDTH_MM / 2)
}

function getWoodInlayWidthMm(bandWidthMm: number, woodInlayEdgeSpaceMm: number) {
  return Math.max(0, bandWidthMm - woodInlayEdgeSpaceMm * 2)
}

function mmToBandYScene(valueMm: number, bandWidthMm: number, bandHalfWidthScene: number) {
  return valueMm * (bandHalfWidthScene / Math.max(bandWidthMm / 2, 0.0001))
}

function getWoodInlayMeasurements(
  styleSettings: StyleSettings,
  bandHalfWidthScene: number,
  outerRadius: number,
  wallThickness: number
) {
  const woodInlayWidthMm = getWoodInlayWidthMm(styleSettings.bandWidth, styleSettings.woodInlayEdgeSpaceMm)
  const inlayHalfWidth = mmToBandYScene(woodInlayWidthMm / 2, styleSettings.bandWidth, bandHalfWidthScene)
  const metalEdge = mmToBandYScene(styleSettings.woodInlayEdgeSpaceMm, styleSettings.bandWidth, bandHalfWidthScene)
  const recessDepth = clamp(mmToScene(WOOD_INLAY_RECESS_MM), mmToScene(0.3), Math.min(mmToScene(0.5), wallThickness * 0.32))
  const recessedRadius = outerRadius - recessDepth
  const channelChamfer = clamp(
    mmToScene(WOOD_INLAY_CHANNEL_CHAMFER_MM),
    0,
    Math.min(recessDepth * 0.72, metalEdge * 0.4, Math.max(0, inlayHalfWidth * 0.2))
  )
  const seamInset = clamp(mmToScene(WOOD_INLAY_SEAM_MM), 0, Math.min(recessDepth * 0.2, Math.max(0.0006, metalEdge * 0.08)))
  const insertChamfer = clamp(channelChamfer, 0, Math.min(recessDepth * 0.7, Math.abs(inlayHalfWidth) * 0.24))

  return {
    woodInlayWidthMm,
    inlayHalfWidth,
    metalEdge,
    recessDepth,
    recessedRadius,
    channelChamfer,
    seamInset,
    insertChamfer,
  }
}

function validateStyleSettings(config: AppConfig): AppConfig {
  const next = { ...config }
  const circumferenceMm = getCircumferenceMm(next.ringSize)
  next.bandWidth = clamp(next.bandWidth, BAND_WIDTH_MIN_MM, BAND_WIDTH_MAX_MM)

  next.groovedWidthMm = clamp(next.groovedWidthMm, 0.4, 2.0)
  next.groovedDepthMm = clamp(next.groovedDepthMm, 0.1, 0.5)
  next.groovedEdgeSpaceMm = clamp(next.groovedEdgeSpaceMm, 0.5, Math.max(0.5, next.bandWidth / 2 - next.groovedWidthMm / 2))
  const maxGrooveCount = getMaxGrooveCount(next.bandWidth, next.groovedWidthMm, next.groovedEdgeSpaceMm)
  next.groovedCount = clamp(Math.round(next.groovedCount), 1, maxGrooveCount)

  next.facetedCount = clamp(Math.round(next.facetedCount), 10, 20)
  const maxFacetCountByArc = Math.max(10, Math.floor(circumferenceMm / FACET_MIN_ARC_MM))
  next.facetedCount = Math.min(next.facetedCount, maxFacetCountByArc)

  next.openOpeningMm = clamp(next.openOpeningMm, 3, Math.min(8, circumferenceMm * 0.25))
  next.openGapEndRoundingMm = clamp(next.openGapEndRoundingMm, 0, 1.5)

  const diagonalAngleDegrees = getDiagonalCutAngleDegrees(next.diagonalCutAngle)
  const requiredGapMm = Math.tan((diagonalAngleDegrees * Math.PI) / 180) * next.bandWidth * 0.5
  next.diagonalOpeningMm = clamp(next.diagonalOpeningMm, Math.max(3, requiredGapMm), Math.min(8, circumferenceMm * 0.25))

  next.woodInlayEdgeSpaceMm = clamp(next.woodInlayEdgeSpaceMm, WOOD_INLAY_MIN_EDGE_SPACE_MM, getWoodInlayMaxEdgeSpaceMm(next.bandWidth))

  next.outerEdgeTreatment =
    next.outerEdgeTreatment === "rounded" || next.outerEdgeTreatment === "chamfer" || next.outerEdgeTreatment === "none"
      ? next.outerEdgeTreatment
      : DEFAULT_CONFIG.outerEdgeTreatment
  next.outerEdgeChamferMm = snapOuterEdgeSizeMm(next.outerEdgeChamferMm)
  return next
}

function getDefaultName(language: Language) {
  return language === "en" ? "My Ring" : "Mein Ring"
}

function formatValue(language: Language, value: number, digits = 1) {
  return value.toLocaleString(language === "de" ? "de-AT" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function normaliseConfig(data: StoredConfig): AppConfig {
  const language = data.language === "de" ? "de" : "en"
  const ringSize = snapToNearestSize(typeof data.ringSize === "number" ? data.ringSize : DEFAULT_CONFIG.ringSize)
  const bandWidth = typeof data.bandWidth === "number" ? data.bandWidth : DEFAULT_CONFIG.bandWidth
  const incomingStyle = data.style === "flat" ? "simple" : data.style
  const style = incomingStyle && styleIds.has(incomingStyle) ? incomingStyle : DEFAULT_CONFIG.style
  const finish = data.finish && finishIds.has(data.finish) ? data.finish : DEFAULT_CONFIG.finish
  const name = typeof data.name === "string" && data.name.trim() ? data.name : getDefaultName(language)

  const groovedCount =
    typeof data.groovedCount === "number"
      ? data.groovedCount
      : data.groovedCount === "single"
      ? 1
      : data.groovedCount === "double"
      ? 2
      : data.groovedCount === "triple"
      ? 3
      : DEFAULT_CONFIG.groovedCount
  const groovedDepthMm =
    typeof data.groovedDepthMm === "number"
      ? data.groovedDepthMm
      : data.groovedDepth === "subtle"
      ? 0.2
      : data.groovedDepth === "deep"
      ? 0.5
      : data.groovedDepth === "medium"
      ? 0.3
      : DEFAULT_CONFIG.groovedDepthMm
  const groovedWidthMm =
    typeof data.groovedWidthMm === "number"
      ? data.groovedWidthMm
      : data.groovedWidth === "fine"
      ? 0.4
      : data.groovedWidth === "wide"
      ? 1.2
      : data.groovedWidth === "medium"
      ? 0.8
      : DEFAULT_CONFIG.groovedWidthMm
  const groovedEdgeSpaceMm =
    typeof data.groovedEdgeSpaceMm === "number"
      ? data.groovedEdgeSpaceMm
      : typeof data.groovedOuterCrestMm === "number"
      ? data.groovedOuterCrestMm
      : DEFAULT_CONFIG.groovedEdgeSpaceMm
  const facetedCount =
    typeof data.facetedCount === "number"
      ? data.facetedCount
      : data.facetedCount === "subtle"
      ? 20
      : data.facetedCount === "bold"
      ? 10
      : data.facetedCount === "classic"
      ? 16
      : DEFAULT_CONFIG.facetedCount
  const facetedEdgeMode =
    data.facetedEdgeMode === "soft" || data.facetedEdgeMode === "hard"
      ? data.facetedEdgeMode
      : data.facetedSharpness === "soft"
      ? "soft"
      : data.facetedSharpness === "crisp"
      ? "hard"
      : DEFAULT_CONFIG.facetedEdgeMode
  const openOpeningMm =
    typeof data.openOpeningMm === "number"
      ? data.openOpeningMm
      : data.openGapWidth === "subtle"
      ? 3
      : data.openGapWidth === "bold"
      ? 8
      : data.openGapWidth === "medium"
      ? 5
      : DEFAULT_CONFIG.openOpeningMm
  const openGapEndRoundingMm =
    typeof data.openRoundedEdgeRadiusMm === "number"
      ? data.openRoundedEdgeRadiusMm
      : data.openEdgeTreatment === "razor"
      ? 0
      : data.openEdgeTreatment === "rounded"
      ? 1
      : data.openEdgeTreatment === "softened"
      ? 0.4
      : DEFAULT_CONFIG.openGapEndRoundingMm
  const diagonalOpeningMm =
    typeof data.diagonalOpeningMm === "number"
      ? data.diagonalOpeningMm
      : data.diagonalGapWidth === "subtle"
      ? 3
      : data.diagonalGapWidth === "bold"
      ? 8
      : data.diagonalGapWidth === "medium"
      ? 5
      : DEFAULT_CONFIG.diagonalOpeningMm
  const diagonalDirection = normaliseStyleValue(data.diagonalDirection, diagonalDirectionIds, DEFAULT_CONFIG.diagonalDirection)
  const diagonalEdgeFinish =
    data.diagonalEdgeFinish === "razor" || data.diagonalEdgeFinish === "softened"
      ? data.diagonalEdgeFinish
      : data.diagonalEdgeTreatment === "razor" || data.diagonalEdgeTreatment === "softened"
      ? data.diagonalEdgeTreatment
      : DEFAULT_CONFIG.diagonalEdgeFinish
  const diagonalCutAngle =
    data.diagonalCutAngle === "gentle" || data.diagonalCutAngle === "standard" || data.diagonalCutAngle === "steep"
      ? data.diagonalCutAngle
      : typeof data.diagonalCutAngle === "number"
      ? data.diagonalCutAngle <= 25
        ? "gentle"
        : data.diagonalCutAngle >= 45
        ? "steep"
        : "standard"
      : DEFAULT_CONFIG.diagonalCutAngle
  const woodSleeveWoodType = normaliseStyleValue(data.woodSleeveWoodType, woodTypeIds, DEFAULT_CONFIG.woodSleeveWoodType)
  const woodInlayWoodType = normaliseStyleValue(data.woodInlayWoodType, woodTypeIds, DEFAULT_CONFIG.woodInlayWoodType)
  const legacyWoodInlayWidthMm =
    typeof data.woodInlayWidthMm === "number"
      ? data.woodInlayWidthMm
      : data.woodInlayWidth === "narrow"
      ? 2
      : data.woodInlayWidth === "wide"
      ? 4
      : data.woodInlayWidth === "medium"
      ? 3
      : null
  const woodInlayEdgeSpaceMm =
    typeof data.woodInlayEdgeSpaceMm === "number"
      ? data.woodInlayEdgeSpaceMm
      : typeof legacyWoodInlayWidthMm === "number"
      ? (bandWidth - legacyWoodInlayWidthMm) / 2
      : DEFAULT_CONFIG.woodInlayEdgeSpaceMm
  const woodInlayChamfer = typeof data.woodInlayChamfer === "boolean" ? data.woodInlayChamfer : true
  const outerEdgeTreatment =
    data.outerEdgeTreatment === "rounded" || data.outerEdgeTreatment === "chamfer" || data.outerEdgeTreatment === "none"
      ? data.outerEdgeTreatment
      : typeof data.outerEdgeChamferMm === "number"
      ? data.outerEdgeChamferMm <= 0
        ? "none"
        : "chamfer"
      : DEFAULT_CONFIG.outerEdgeTreatment
  const outerEdgeChamferMm =
    typeof data.outerEdgeChamferMm === "number" ? data.outerEdgeChamferMm : DEFAULT_CONFIG.outerEdgeChamferMm

  return validateStyleSettings({
    language,
    ringSize,
    bandWidth,
    style,
    finish,
    name,
    groovedWidthMm,
    groovedDepthMm,
    groovedCount,
    groovedEdgeSpaceMm,
    facetedCount,
    facetedEdgeMode,
    openOpeningMm,
    openGapEndRoundingMm,
    diagonalOpeningMm,
    diagonalDirection,
    diagonalEdgeFinish,
    diagonalCutAngle,
    woodSleeveWoodType,
    woodInlayWoodType,
    woodInlayEdgeSpaceMm,
    woodInlayChamfer,
    outerEdgeTreatment,
    outerEdgeChamferMm,
  })
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
  wallThickness: number,
  styleSettings?: StyleSettings
) {
  const profile: THREE.Vector2[] = []
  const bevel = Math.min(0.045, wallThickness * 0.22, bandHalfWidth * 0.4)
  const outerEdgeTreatment = styleSettings?.outerEdgeTreatment ?? "chamfer"
  const outerEdgeSize = styleSettings
    ? getOuterEdgeSizeScene(
        outerEdgeTreatment === "none" ? 0 : styleSettings.outerEdgeChamferMm,
        wallThickness * 0.5,
        bandHalfWidth
      )
    : bevel * 0.7
  const outerEdge = getOuterEdgeProfile(outerRadius, bandHalfWidth, outerEdgeSize, outerEdgeTreatment)

  if (style === "woodInlay" && styleSettings) {
    const { inlayHalfWidth, recessDepth, recessedRadius, channelChamfer, seamInset } = getWoodInlayMeasurements(
      styleSettings,
      bandHalfWidth,
      outerRadius,
      wallThickness
    )

    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(innerRadius + bevel * 0.3, -bandHalfWidth)
    )
    appendUniquePoints(profile, outerEdge.bottom)
    pushUniquePoint(profile, new THREE.Vector2(outerRadius, -inlayHalfWidth - channelChamfer - seamInset * 0.2))
    profile.push(
      new THREE.Vector2(outerRadius - seamInset, -inlayHalfWidth - seamInset * 0.45),
      new THREE.Vector2(outerRadius - recessDepth * 0.24, -inlayHalfWidth - channelChamfer * 0.18),
      new THREE.Vector2(recessedRadius, -inlayHalfWidth),
      new THREE.Vector2(recessedRadius, inlayHalfWidth),
      new THREE.Vector2(outerRadius - recessDepth * 0.24, inlayHalfWidth + channelChamfer * 0.18),
      new THREE.Vector2(outerRadius - seamInset, inlayHalfWidth + seamInset * 0.45),
      new THREE.Vector2(outerRadius, inlayHalfWidth + channelChamfer + seamInset * 0.2)
    )
    appendUniquePoints(profile, outerEdge.top)
    profile.push(new THREE.Vector2(innerRadius + bevel * 0.3, bandHalfWidth), new THREE.Vector2(innerRadius, bandHalfWidth - bevel), new THREE.Vector2(innerRadius, -bandHalfWidth + bevel))
  } else if (style === "flat" || style === "woodSleeve") {
    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(innerRadius + bevel * 0.3, -bandHalfWidth)
    )
    appendUniquePoints(profile, outerEdge.bottom)
    if (outerEdge.sideEndY > outerEdge.sideStartY) {
      pushUniquePoint(profile, new THREE.Vector2(outerRadius, outerEdge.sideEndY))
    }
    appendUniquePoints(profile, outerEdge.top)
    profile.push(new THREE.Vector2(innerRadius + bevel * 0.3, bandHalfWidth), new THREE.Vector2(innerRadius, bandHalfWidth - bevel), new THREE.Vector2(innerRadius, -bandHalfWidth + bevel))
  } else if (style === "grooved" && styleSettings) {
    const grooveLayout = getGrooveLayoutMm(
      styleSettings.bandWidth,
      styleSettings.groovedWidthMm,
      styleSettings.groovedCount,
      styleSettings.groovedEdgeSpaceMm
    )
    const grooveDepthScene = Math.min(mmToScene(styleSettings.groovedDepthMm), wallThickness * 0.58)
    const bandSceneScale = bandHalfWidth / Math.max(styleSettings.bandWidth / 2, 0.0001)
    const toBandSceneY = (valueMm: number) => valueMm * bandSceneScale
    const grooveShoulderScene = Math.max(0.0012, getGrooveShoulderMm(styleSettings.groovedWidthMm) * bandSceneScale)

    const outerContour: THREE.Vector2[] = [...outerEdge.bottom]
    let cursorY = outerEdge.sideStartY

    for (const interval of grooveLayout.intervals) {
      const grooveStartY = clamp(toBandSceneY(interval.startMm), cursorY, outerEdge.sideEndY)
      const grooveEndY = clamp(toBandSceneY(interval.endMm), grooveStartY, outerEdge.sideEndY)
      const grooveSection = getGrooveContourSection(grooveStartY, grooveEndY, outerRadius, grooveDepthScene, grooveShoulderScene)

      appendUniquePoints(outerContour, grooveSection.points)
      cursorY = grooveEndY
    }

    if (cursorY < outerEdge.sideEndY) {
      pushUniquePoint(outerContour, new THREE.Vector2(outerRadius, outerEdge.sideEndY))
    }

    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(innerRadius + bevel * 0.3, -bandHalfWidth),
    )
    appendUniquePoints(profile, outerContour)
    appendUniquePoints(profile, outerEdge.top)
    profile.push(new THREE.Vector2(innerRadius + bevel * 0.3, bandHalfWidth), new THREE.Vector2(innerRadius, bandHalfWidth - bevel), new THREE.Vector2(innerRadius, -bandHalfWidth + bevel))
  } else if (style === "simple" || style === "open" || style === "diagonal") {
    const shoulder = wallThickness * 0.04
    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(innerRadius + bevel * 0.32, -bandHalfWidth),
      new THREE.Vector2(outerRadius - outerEdgeSize - shoulder, -bandHalfWidth)
    )
    appendUniquePoints(profile, outerEdge.bottom)
    if (outerEdge.sideEndY > outerEdge.sideStartY) {
      pushUniquePoint(profile, new THREE.Vector2(outerRadius, outerEdge.sideEndY))
    }
    appendUniquePoints(profile, outerEdge.top)
    profile.push(new THREE.Vector2(outerRadius - outerEdgeSize - shoulder, bandHalfWidth), new THREE.Vector2(innerRadius + bevel * 0.32, bandHalfWidth), new THREE.Vector2(innerRadius, bandHalfWidth - bevel), new THREE.Vector2(innerRadius, -bandHalfWidth + bevel))
  } else if (style === "domed" || style === "hammered") {
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
    const facetBaseRadius = outerRadius - facetInset
    const facetEdge = getOuterEdgeProfile(facetBaseRadius, bandHalfWidth, outerEdgeSize, outerEdgeTreatment)

    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(innerRadius + bevel * 0.78, -bandHalfWidth)
    )
    appendUniquePoints(profile, facetEdge.bottom)
    profile.push(
      new THREE.Vector2(outerRadius + facetPeak, -bandHalfWidth * 0.48),
      new THREE.Vector2(outerRadius + facetPeak * 1.08, 0),
      new THREE.Vector2(outerRadius + facetPeak, bandHalfWidth * 0.48)
    )
    appendUniquePoints(profile, facetEdge.top)
    profile.push(new THREE.Vector2(innerRadius + bevel * 0.78, bandHalfWidth), new THREE.Vector2(innerRadius, bandHalfWidth - bevel), new THREE.Vector2(innerRadius, -bandHalfWidth + bevel))
  }

  return profile
}

function applyFacetedOuterSurface(
  sourceGeometry: THREE.BufferGeometry,
  innerRadius: number,
  outerRadius: number,
  facetCount: number,
  edgeMode: FacetedEdgeMode
) {
  const geometry = edgeMode === "hard" ? sourceGeometry.toNonIndexed() : sourceGeometry.clone()
  const position = geometry.getAttribute("position") as THREE.BufferAttribute
  const segmentAngle = (Math.PI * 2) / facetCount
  const outerSurfaceThreshold = outerRadius - Math.max((outerRadius - innerRadius) * 0.22, 0.01)

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const radius = Math.hypot(x, z)

    // Keep the inner wall perfectly circular; only snap vertices on the outer shell/silhouette.
    if (radius < outerSurfaceThreshold) continue

    const angle = Math.atan2(z, x)
    const snappedAngle = Math.round(angle / segmentAngle) * segmentAngle
    position.setXYZ(index, Math.cos(snappedAngle) * radius, y, Math.sin(snappedAngle) * radius)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function createLatheGeometry(
  profile: THREE.Vector2[],
  _style: StyleId,
  _styleSettings: StyleSettings,
  _bandHalfWidth: number,
  reducedDetail = false
) {
  const segments = reducedDetail ? 128 : 384
  const geometry = new THREE.LatheGeometry(profile, segments)

  geometry.computeVertexNormals()
  return geometry
}

function createArcSectionGeometry(
  profile: THREE.Vector2[],
  style: "open",
  innerRadius: number,
  outerRadius: number,
  bandHalfWidth: number,
  styleSettings: StyleSettings,
  reducedDetail = false
) {
  const baseOutline = profile[profile.length - 1].equals(profile[0]) ? profile.slice(0, -1) : profile
  const arcSegments = reducedDetail ? 72 : 192
  const endCapSegments = styleSettings.openGapEndRoundingMm > 0.01 ? (reducedDetail ? 6 : 10) : 0
  const outline =
    endCapSegments > 0
      ? refineClosedProfile(baseOutline, Math.max(0.0024, bandHalfWidth / (reducedDetail ? 12 : 18)))
      : baseOutline
  const gapAngleRad = (style === "open" ? styleSettings.openOpeningMm : styleSettings.diagonalOpeningMm) / getCentreRadiusMm(styleSettings.ringSize)
  const baseStartAngle = Math.PI + gapAngleRad / 2
  const baseEndAngle = baseStartAngle + (Math.PI * 2 - gapAngleRad)
  const cols = arcSegments + 1 + endCapSegments * 2
  const bodyVertexCount = outline.length * cols
  const positions: number[] = []
  const indices: number[] = []
  const rowRoundingAngles = outline.map((point) => getOpenEndRoundingAngle(point, innerRadius, outerRadius, bandHalfWidth, styleSettings))
  const startLoop: THREE.Vector3[] = []
  const endLoop: THREE.Vector3[] = []

  for (let profileIndex = 0; profileIndex < outline.length; profileIndex += 1) {
    const point = outline[profileIndex]
    const rowRoundingAngle = rowRoundingAngles[profileIndex]

    for (let capIndex = 0; capIndex < endCapSegments; capIndex += 1) {
      const progress = capIndex / Math.max(endCapSegments, 1)
      const easing = Math.cos(progress * Math.PI * 0.5)
      const angle = baseStartAngle - rowRoundingAngle * easing
      const x = Math.cos(angle) * point.x
      const z = Math.sin(angle) * point.x

      if (capIndex === 0) {
        startLoop.push(new THREE.Vector3(x, point.y, z))
      }

      positions.push(x, point.y, z)
    }

    for (let segmentIndex = 0; segmentIndex <= arcSegments; segmentIndex += 1) {
      const t = segmentIndex / arcSegments
      const angle = THREE.MathUtils.lerp(baseStartAngle, baseEndAngle, t)
      const x = Math.cos(angle) * point.x
      const z = Math.sin(angle) * point.x

      if (endCapSegments === 0 && segmentIndex === 0) {
        startLoop.push(new THREE.Vector3(x, point.y, z))
      }

      if (endCapSegments === 0 && segmentIndex === arcSegments) {
        endLoop.push(new THREE.Vector3(x, point.y, z))
      }

      positions.push(x, point.y, z)
    }

    for (let capIndex = 0; capIndex < endCapSegments; capIndex += 1) {
      const progress = (capIndex + 1) / Math.max(endCapSegments, 1)
      const easing = Math.sin(progress * Math.PI * 0.5)
      const angle = baseEndAngle + rowRoundingAngle * easing
      const x = Math.cos(angle) * point.x
      const z = Math.sin(angle) * point.x

      positions.push(x, point.y, z)

      if (capIndex === endCapSegments - 1) {
        endLoop.push(new THREE.Vector3(x, point.y, z))
      }
    }
  }

  for (let profileIndex = 0; profileIndex < outline.length; profileIndex += 1) {
    const nextProfileIndex = (profileIndex + 1) % outline.length

    for (let segmentIndex = 0; segmentIndex < cols - 1; segmentIndex += 1) {
      const a = profileIndex * cols + segmentIndex
      const b = nextProfileIndex * cols + segmentIndex
      const c = nextProfileIndex * cols + segmentIndex + 1
      const d = profileIndex * cols + segmentIndex + 1
      indices.push(a, b, d)
      indices.push(b, c, d)
    }
  }

  const contourClockwise = THREE.ShapeUtils.isClockWise(outline)
  const capContour2D = contourClockwise ? outline.map((point) => point.clone()) : [...outline].reverse().map((point) => point.clone())
  const capStartLoop = contourClockwise ? startLoop : [...startLoop].reverse()
  const capEndLoop = contourClockwise ? endLoop : [...endLoop].reverse()
  const triangulated = THREE.ShapeUtils.triangulateShape(capContour2D, [])
  const startCapOffset = bodyVertexCount
  const endCapOffset = bodyVertexCount + outline.length

  for (let profileIndex = 0; profileIndex < capStartLoop.length; profileIndex += 1) {
    const startPoint = capStartLoop[profileIndex]
    positions.push(startPoint.x, startPoint.y, startPoint.z)
  }

  for (let profileIndex = 0; profileIndex < capEndLoop.length; profileIndex += 1) {
    const endPoint = capEndLoop[profileIndex]
    positions.push(endPoint.x, endPoint.y, endPoint.z)
  }

  triangulated.forEach(([a, b, c]) => {
    indices.push(startCapOffset + c, startCapOffset + b, startCapOffset + a)
    indices.push(endCapOffset + a, endCapOffset + b, endCapOffset + c)
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createDiagonalArcGeometry(
  profile: THREE.Vector2[],
  _innerRadius: number,
  _outerRadius: number,
  _bandHalfWidth: number,
  styleSettings: StyleSettings,
  reducedDetail = false
) {
  const outline = profile[profile.length - 1].equals(profile[0]) ? profile.slice(0, -1) : profile
  const arcSegments = reducedDetail ? 64 : 128
  const gapAngleRad = styleSettings.diagonalOpeningMm / getCentreRadiusMm(styleSettings.ringSize)
  const startAngle = Math.PI + gapAngleRad / 2
  const endAngle = startAngle + (Math.PI * 2 - gapAngleRad)
  const diagonalDirectionSign = styleSettings.diagonalDirection === "leftRising" ? -1 : 1
  const tiltRadians = THREE.MathUtils.degToRad(getDiagonalCutAngleDegrees(styleSettings.diagonalCutAngle)) * diagonalDirectionSign
  const tiltTangent = Math.tan(tiltRadians)
  const cols = arcSegments + 1
  const positions: number[] = []
  const indices: number[] = []
  const getAngularOffset = (point: THREE.Vector2) => (point.y * tiltTangent) / Math.max(point.x, 0.0001)

  for (let profileIndex = 0; profileIndex < outline.length; profileIndex += 1) {
    const point = outline[profileIndex]
    const angularOffset = getAngularOffset(point)
    const rowStartAngle = startAngle + angularOffset
    const rowEndAngle = endAngle + angularOffset

    for (let segmentIndex = 0; segmentIndex <= arcSegments; segmentIndex += 1) {
      const t = segmentIndex / arcSegments
      const angle = THREE.MathUtils.lerp(rowStartAngle, rowEndAngle, t)
      positions.push(Math.cos(angle) * point.x, point.y, Math.sin(angle) * point.x)
    }
  }

  for (let profileIndex = 0; profileIndex < outline.length; profileIndex += 1) {
    const nextProfileIndex = (profileIndex + 1) % outline.length

    for (let segmentIndex = 0; segmentIndex < arcSegments; segmentIndex += 1) {
      const a = profileIndex * cols + segmentIndex
      const b = nextProfileIndex * cols + segmentIndex
      const c = nextProfileIndex * cols + segmentIndex + 1
      const d = profileIndex * cols + segmentIndex + 1
      indices.push(a, b, d)
      indices.push(b, c, d)
    }
  }

  const contourClockwise = THREE.ShapeUtils.isClockWise(outline)
  const capContour2D = contourClockwise ? [...outline].reverse() : outline
  const triangulated = THREE.ShapeUtils.triangulateShape(capContour2D, [])
  const startBoundaryIndices = outline.map((_, profileIndex) => profileIndex * cols)
  const endBoundaryIndices = outline.map((_, profileIndex) => profileIndex * cols + arcSegments)
  const remapContourIndex = (index: number) => (contourClockwise ? outline.length - 1 - index : index)
  const startTangent = new THREE.Vector3(-Math.sin(startAngle), 0, Math.cos(startAngle)).normalize()
  const endTangent = new THREE.Vector3(-Math.sin(endAngle), 0, Math.cos(endAngle)).normalize()
  const startOutwardNormal = startTangent.clone().multiplyScalar(-1)
  const endOutwardNormal = endTangent.clone()
  const triangleNormal = new THREE.Vector3()
  const edgeAB = new THREE.Vector3()
  const edgeAC = new THREE.Vector3()
  const vertexA = new THREE.Vector3()
  const vertexB = new THREE.Vector3()
  const vertexC = new THREE.Vector3()
  const setVertexFromIndex = (target: THREE.Vector3, index: number) => {
    const positionIndex = index * 3
    target.set(positions[positionIndex], positions[positionIndex + 1], positions[positionIndex + 2])
  }
  const pushCapTriangle = (a: number, b: number, c: number, outwardNormal: THREE.Vector3) => {
    setVertexFromIndex(vertexA, a)
    setVertexFromIndex(vertexB, b)
    setVertexFromIndex(vertexC, c)
    edgeAB.subVectors(vertexB, vertexA)
    edgeAC.subVectors(vertexC, vertexA)
    triangleNormal.crossVectors(edgeAB, edgeAC)

    if (triangleNormal.dot(outwardNormal) >= 0) {
      indices.push(a, b, c)
      return
    }

    indices.push(a, c, b)
  }

  triangulated.forEach(([a, b, c]) => {
    pushCapTriangle(
      startBoundaryIndices[remapContourIndex(a)],
      startBoundaryIndices[remapContourIndex(b)],
      startBoundaryIndices[remapContourIndex(c)],
      startOutwardNormal
    )
    pushCapTriangle(
      endBoundaryIndices[remapContourIndex(a)],
      endBoundaryIndices[remapContourIndex(b)],
      endBoundaryIndices[remapContourIndex(c)],
      endOutwardNormal
    )
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
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

function createWoodSleeveGeometry(
  metalOuterRadius: number,
  outerRadius: number,
  bandHalfWidth: number,
  styleSettings: StyleSettings,
  reducedDetail = false
) {
  const yMin = -bandHalfWidth
  const yMax = bandHalfWidth
  const steps = reducedDetail ? 12 : 24
  const woodThickness = outerRadius - metalOuterRadius
  const domeHeight = woodThickness * 0.25
  const outerEdgeSize = getOuterEdgeSizeScene(
    styleSettings.outerEdgeTreatment === "none" ? 0 : styleSettings.outerEdgeChamferMm,
    woodThickness * 0.92,
    bandHalfWidth
  )
  const outerEdge = getOuterEdgeProfile(outerRadius, bandHalfWidth, outerEdgeSize, styleSettings.outerEdgeTreatment)
  const innerBevel = clamp(mmToScene(0.1), 0.0008, Math.min(woodThickness * 0.32, bandHalfWidth * 0.18))
  const profile: THREE.Vector2[] = [new THREE.Vector2(metalOuterRadius, yMin + innerBevel)]

  appendUniquePoints(profile, outerEdge.bottom)

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const y = yMin + t * (yMax - yMin)
    if (y <= outerEdge.sideStartY || y >= outerEdge.sideEndY) continue

    const crown = Math.sin(t * Math.PI)
    const x = outerRadius + crown * domeHeight

    pushUniquePoint(profile, new THREE.Vector2(x, y))
  }

  appendUniquePoints(profile, outerEdge.top)
  profile.push(new THREE.Vector2(metalOuterRadius, yMax - innerBevel), new THREE.Vector2(metalOuterRadius, yMin + innerBevel))

  return createLatheGeometry(profile, "woodSleeve", styleSettings, bandHalfWidth, reducedDetail)
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

function createInsetStripGeometry(
  surfaceRadius: number,
  innerRadius: number,
  yMin: number,
  yMax: number,
  chamfer: number,
  seamInset: number,
  style: StyleId,
  styleSettings: StyleSettings,
  reducedDetail = false
) {
  const insetDepth = Math.max(0.0008, surfaceRadius - innerRadius)
  const edgeChamfer = clamp(chamfer, 0, Math.min(insetDepth * 0.72, Math.abs(yMax - yMin) * 0.2))
  const visibleEdgeRadius = surfaceRadius - seamInset
  const profile =
    edgeChamfer > 0
      ? [
          new THREE.Vector2(innerRadius, yMin + edgeChamfer),
          new THREE.Vector2(innerRadius + edgeChamfer * 0.32, yMin),
          new THREE.Vector2(visibleEdgeRadius, yMin),
          new THREE.Vector2(surfaceRadius, yMin + edgeChamfer),
          new THREE.Vector2(surfaceRadius, yMax - edgeChamfer),
          new THREE.Vector2(visibleEdgeRadius, yMax),
          new THREE.Vector2(innerRadius + edgeChamfer * 0.32, yMax),
          new THREE.Vector2(innerRadius, yMax - edgeChamfer),
          new THREE.Vector2(innerRadius, yMin + edgeChamfer),
        ]
      : [
          new THREE.Vector2(innerRadius, yMin),
          new THREE.Vector2(visibleEdgeRadius, yMin),
          new THREE.Vector2(surfaceRadius, yMin),
          new THREE.Vector2(surfaceRadius, yMax),
          new THREE.Vector2(visibleEdgeRadius, yMax),
          new THREE.Vector2(innerRadius, yMax),
          new THREE.Vector2(innerRadius, yMin),
        ]

  return createLatheGeometry(profile, style, styleSettings, Math.max(Math.abs(yMin), Math.abs(yMax)), reducedDetail)
}

function createGrooveAccentGeometries(
  innerRadius: number,
  outerRadius: number,
  bandHalfWidth: number,
  styleSettings: StyleSettings,
  reducedDetail = false
) {
  void innerRadius

  const grooveLayout = getGrooveLayoutMm(
    styleSettings.bandWidth,
    styleSettings.groovedWidthMm,
    styleSettings.groovedCount,
    styleSettings.groovedEdgeSpaceMm
  )
  const wallThickness = mmToScene(WALL_THICKNESS_MM)
  const outerEdgeSize = getOuterEdgeSizeScene(
    styleSettings.outerEdgeTreatment === "none" ? 0 : styleSettings.outerEdgeChamferMm,
    wallThickness * 0.5,
    bandHalfWidth
  )
  const grooveDepthScene = Math.min(mmToScene(styleSettings.groovedDepthMm), wallThickness * 0.58)
  const bandSceneScale = bandHalfWidth / Math.max(styleSettings.bandWidth / 2, 0.0001)
  const toBandSceneY = (valueMm: number) => valueMm * bandSceneScale
  const grooveShoulderScene = Math.max(0.0012, getGrooveShoulderMm(styleSettings.groovedWidthMm) * bandSceneScale)
  const grooveBottomRadius = outerRadius - grooveDepthScene
  const accentLift = Math.max(0.0007, grooveDepthScene * 0.08)
  const accentHalfThickness = Math.min(Math.max(0.00045, grooveDepthScene * 0.08), 0.00135)
  const accentRadius = grooveBottomRadius + accentLift + accentHalfThickness

  return grooveLayout.intervals.flatMap((interval) => {
    const grooveStartY = clamp(toBandSceneY(interval.startMm), -bandHalfWidth + outerEdgeSize, bandHalfWidth - outerEdgeSize)
    const grooveEndY = clamp(toBandSceneY(interval.endMm), grooveStartY, bandHalfWidth - outerEdgeSize)
    const grooveSection = getGrooveContourSection(grooveStartY, grooveEndY, outerRadius, grooveDepthScene, grooveShoulderScene)

    if (grooveSection.bottomEndY - grooveSection.bottomStartY <= 0.0004) {
      return []
    }

    return [
      createOuterStripGeometry(
        accentRadius,
        grooveSection.bottomStartY,
        grooveSection.bottomEndY,
        accentHalfThickness,
        "grooved",
        styleSettings,
        reducedDetail
      ),
    ]
  })
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
    bg.addColorStop(0, "#2a241d")
    bg.addColorStop(0.52, "#1f1a15")
    bg.addColorStop(1, "#16120f")
  } else {
    bg.addColorStop(0, "#fffaf2")
    bg.addColorStop(0.48, "#f4eee4")
    bg.addColorStop(1, "#e8dccd")
  }
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvasSize, canvasSize)

  const glow = ctx.createRadialGradient(canvasSize * 0.5, canvasSize * 0.2, 0, canvasSize * 0.5, canvasSize * 0.28, canvasSize * 0.9)
  if (theme === "dark") {
    glow.addColorStop(0, "rgba(255,239,214,0.2)")
    glow.addColorStop(0.55, "rgba(214,182,144,0.1)")
    glow.addColorStop(1, "rgba(0,0,0,0)")
  } else {
    glow.addColorStop(0, "rgba(255,251,244,0.95)")
    glow.addColorStop(0.55, "rgba(248,239,224,0.42)")
    glow.addColorStop(1, "rgba(255,255,255,0)")
  }
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, canvasSize, canvasSize)

  ctx.filter = reducedDetail ? "blur(56px)" : "blur(78px)"

  const windows = [
    [46, -220, 118, canvasSize + 420, 0.62],
    [168, -180, 162, canvasSize + 360, 0.74],
    [356, -240, 112, canvasSize + 460, 0.54],
    [492, -210, 182, canvasSize + 420, 0.68],
    [714, -190, 126, canvasSize + 390, 0.5],
    [854, -220, 148, canvasSize + 430, 0.58],
  ] as const

  for (const [x, y, w, h, a] of windows) {
    ctx.fillStyle = theme === "dark" ? `rgba(255,246,232,${Math.max(0.12, a * 0.26)})` : `rgba(255,255,255,${a})`
    ctx.fillRect(x, y, w, h)
  }

  const warmColumns = [
    [120, -160, 68, canvasSize + 260, 0.16],
    [424, -110, 84, canvasSize + 240, 0.14],
    [772, -170, 72, canvasSize + 280, 0.15],
  ] as const

  for (const [x, y, w, h, a] of warmColumns) {
    ctx.fillStyle = theme === "dark" ? `rgba(214,165,95,${Math.max(0.08, a * 0.45)})` : `rgba(232,220,205,${a})`
    ctx.fillRect(x, y, w, h)
  }

  ctx.filter = "none"

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function fract(value: number) {
  return value - Math.floor(value)
}

function noise2D(x: number, y: number, seed: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123)
}

function layeredNoise2D(x: number, y: number, seed: number) {
  const a = noise2D(x, y, seed)
  const b = noise2D(x * 2.17 + 13.4, y * 2.31 + 9.2, seed + 11.7)
  const c = noise2D(x * 4.93 + 3.1, y * 5.27 + 17.5, seed + 23.9)
  return a * 0.58 + b * 0.27 + c * 0.15
}

function clampByte(value: number) {
  return Math.round(clamp(value, 0, 255))
}

function finaliseProceduralTexture(
  texture: THREE.CanvasTexture,
  repeatX: number,
  repeatY: number,
  colorSpace: THREE.ColorSpace
) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.colorSpace = colorSpace
  texture.needsUpdate = true
  return texture
}

function createFineMetalRoughnessTexture(reducedDetail = false, variant: "normal" | "polished" = "normal") {
  const size = reducedDetail ? 256 : 512
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const imageData = ctx.createImageData(size, size)
  const base = variant === "polished" ? 236 : 214
  const macroRange = variant === "polished" ? 10 : 24
  const microRange = variant === "polished" ? 6 : 12
  const sweepRange = variant === "polished" ? 2.5 : 5

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = x / size
      const ny = y / size
      const macro = layeredNoise2D(nx * 4.2, ny * 4.2, variant === "polished" ? 4.3 : 1.9)
      const micro = layeredNoise2D(nx * 22, ny * 18, variant === "polished" ? 9.7 : 6.1)
      const sweep = Math.sin(nx * Math.PI * 28 + ny * Math.PI * 5)
      const value = clampByte(base + (macro - 0.5) * macroRange + (micro - 0.5) * microRange + sweep * sweepRange)
      const index = (y * size + x) * 4
      imageData.data[index] = value
      imageData.data[index + 1] = value
      imageData.data[index + 2] = value
      imageData.data[index + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return finaliseProceduralTexture(
    new THREE.CanvasTexture(canvas),
    variant === "polished" ? 7 : 5,
    2,
    THREE.NoColorSpace
  )
}

function createMatteRoughnessTexture(reducedDetail = false) {
  const size = reducedDetail ? 256 : 512
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const imageData = ctx.createImageData(size, size)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = x / size
      const ny = y / size
      const macro = layeredNoise2D(nx * 3.2, ny * 3.2, 12.4)
      const micro = layeredNoise2D(nx * 18, ny * 18, 17.2)
      const cloud = Math.sin((nx + ny * 0.42) * Math.PI * 8)
      const value = clampByte(224 + (macro - 0.5) * 26 + (micro - 0.5) * 12 + cloud * 4)
      const index = (y * size + x) * 4
      imageData.data[index] = value
      imageData.data[index + 1] = value
      imageData.data[index + 2] = value
      imageData.data[index + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return finaliseProceduralTexture(new THREE.CanvasTexture(canvas), 4, 3, THREE.NoColorSpace)
}

function createBrushedRoughnessTexture(reducedDetail = false) {
  const width = reducedDetail ? 512 : 1024
  const height = reducedDetail ? 32 : 64
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const imageData = ctx.createImageData(width, height)

  for (let y = 0; y < height; y += 1) {
    const ny = y / height
    const rowBase = 176 + (layeredNoise2D(0.15, ny * 8, 21.4) - 0.5) * 18 + Math.sin(ny * Math.PI * 10) * 4

    for (let x = 0; x < width; x += 1) {
      const nx = x / width
      const streak = layeredNoise2D(nx * 38, ny * 2.8, 24.8)
      const micro = noise2D(x * 0.85, y * 1.15, 28.9)
      const shimmer = Math.sin(nx * Math.PI * 120 + ny * 5.5 + streak * 2.4)
      const scratch = noise2D(x * 0.16, y * 2.1, 31.4) > 0.985 ? -22 : 0
      const value = clampByte(rowBase + (streak - 0.5) * 22 + shimmer * 6 + (micro - 0.5) * 8 + scratch)
      const index = (y * width + x) * 4
      imageData.data[index] = value
      imageData.data[index + 1] = value
      imageData.data[index + 2] = value
      imageData.data[index + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return finaliseProceduralTexture(
    new THREE.CanvasTexture(canvas),
    reducedDetail ? 14 : 20,
    reducedDetail ? 2.5 : 3.4,
    THREE.NoColorSpace
  )
}

function createOxidisedRoughnessTexture(reducedDetail = false) {
  const size = reducedDetail ? 256 : 512
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const imageData = ctx.createImageData(size, size)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = x / size
      const ny = y / size
      const macro = layeredNoise2D(nx * 2.8, ny * 2.8, 41.2)
      const micro = layeredNoise2D(nx * 14, ny * 14, 45.4)
      const band = Math.sin((nx * 3.4 + ny * 1.7) * Math.PI * 3.5)
      const value = clampByte(188 + (macro - 0.5) * 38 + (micro - 0.5) * 16 + band * 6)
      const index = (y * size + x) * 4
      imageData.data[index] = value
      imageData.data[index + 1] = value
      imageData.data[index + 2] = value
      imageData.data[index + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return finaliseProceduralTexture(new THREE.CanvasTexture(canvas), 3, 2, THREE.NoColorSpace)
}

function createOxidisedColourTexture(reducedDetail = false) {
  const size = reducedDetail ? 256 : 512
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const imageData = ctx.createImageData(size, size)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = x / size
      const ny = y / size
      const cloud = layeredNoise2D(nx * 3.2, ny * 3.2, 51.1)
      const secondary = layeredNoise2D(nx * 9.5, ny * 9.5, 59.7)
      const coolShift = Math.sin((nx * 2.2 + ny * 1.1) * Math.PI * 2)
      const r = clampByte(82 + (cloud - 0.5) * 18 + (secondary - 0.5) * 6 - coolShift * 3)
      const g = clampByte(98 + (cloud - 0.5) * 14 + (secondary - 0.5) * 5)
      const b = clampByte(111 + (cloud - 0.5) * 24 + (secondary - 0.5) * 8 + coolShift * 4)
      const index = (y * size + x) * 4
      imageData.data[index] = r
      imageData.data[index + 1] = g
      imageData.data[index + 2] = b
      imageData.data[index + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return finaliseProceduralTexture(new THREE.CanvasTexture(canvas), 2.5, 1.8, THREE.SRGBColorSpace)
}

type FinishMaterialMaps = {
  brushedSurface: THREE.Texture | null
  matteRoughness: THREE.Texture | null
  normalRoughness: THREE.Texture | null
  oxidisedColour: THREE.Texture | null
  oxidisedRoughness: THREE.Texture | null
  polishedRoughness: THREE.Texture | null
}

type FinishMaterialSettings = {
  anisotropy: number
  anisotropyRotation: number
  bumpMap: THREE.Texture | null
  bumpScale: number
  clearcoat: number
  clearcoatRoughness: number
  color: string
  envMapIntensity: number
  map: THREE.Texture | null
  metalness: number
  roughness: number
  roughnessMap: THREE.Texture | null
}

function getFinishMaterialSettings(
  finishOption: FinishOption,
  finish: FinishId,
  style: StyleId,
  technicalView: boolean,
  maps: FinishMaterialMaps
): FinishMaterialSettings {
  if (technicalView) {
    return {
      color: finish === "oxidised" ? "#7a8590" : finish === "polished" ? "#ece8e1" : "#d8d7d4",
      metalness: finish === "oxidised" ? 0.95 : 1,
      roughness: finish === "matte" ? 0.38 : finish === "polished" ? 0.2 : finish === "oxidised" ? 0.36 : 0.28,
      envMapIntensity: finish === "polished" ? 1.55 : 1.38,
      clearcoat: finish === "polished" ? 0.24 : 0.14,
      clearcoatRoughness: finish === "polished" ? 0.12 : 0.22,
      anisotropy: 0,
      anisotropyRotation: Math.PI / 2,
      map: null,
      roughnessMap: null,
      bumpMap: null,
      bumpScale: 0,
    }
  }

  const hammeredRoughnessBoost = style === "hammered" ? 0.06 : 0
  const facetedEnvBoost = style === "faceted" ? 0.08 : 0
  const clearcoatTrim = style === "hammered" ? 0.06 : 0

  const base: FinishMaterialSettings = {
    color: finishOption.colour,
    metalness: finishOption.metalness,
    roughness: clamp(finishOption.roughness + hammeredRoughnessBoost, 0.04, 0.92),
    envMapIntensity: finishOption.envMapIntensity + facetedEnvBoost,
    clearcoat: Math.max(0, finishOption.clearcoat - clearcoatTrim),
    clearcoatRoughness: finishOption.clearcoatRoughness,
    anisotropy: finishOption.anisotropy ?? 0,
    anisotropyRotation: finishOption.anisotropyRotation ?? Math.PI / 2,
    map: null,
    roughnessMap: null,
    bumpMap: null,
    bumpScale: 0,
  }

  switch (finish) {
    case "normal":
      return {
        ...base,
        roughnessMap: maps.normalRoughness,
      }
    case "matte":
      return {
        ...base,
        roughnessMap: maps.matteRoughness,
      }
    case "polished":
      return {
        ...base,
        roughnessMap: maps.polishedRoughness,
      }
    case "brushed":
      return {
        ...base,
        roughnessMap: maps.brushedSurface,
        bumpMap: maps.brushedSurface,
        bumpScale: finishOption.bumpScale ?? 0.008,
      }
    case "oxidised":
      return {
        ...base,
        map: maps.oxidisedColour,
        roughnessMap: maps.oxidisedRoughness,
      }
    default:
      return base
  }
}

function Ring({
  size,
  width,
  style,
  finish,
  previewRotation = [0.7, 0.2, 0],
  styleSettings,
  reducedDetail = false,
  technicalView = false,
}: {
  size: number
  width: number
  style: StyleId
  finish: FinishId
  previewRotation?: [number, number, number]
  styleSettings: StyleSettings
  reducedDetail?: boolean
  technicalView?: boolean
}) {
  const selectedFinish = finishes.find((item) => item.id === finish) ?? finishes[0]
  const normalRoughnessTexture = useMemo(
    () => (!technicalView && finish === "normal" ? createFineMetalRoughnessTexture(reducedDetail, "normal") : null),
    [finish, technicalView, reducedDetail]
  )
  const matteRoughnessTexture = useMemo(
    () => (!technicalView && finish === "matte" ? createMatteRoughnessTexture(reducedDetail) : null),
    [finish, technicalView, reducedDetail]
  )
  const polishedRoughnessTexture = useMemo(
    () => (!technicalView && finish === "polished" ? createFineMetalRoughnessTexture(reducedDetail, "polished") : null),
    [finish, technicalView, reducedDetail]
  )
  const brushedSurfaceTexture = useMemo(
    () => (!technicalView && finish === "brushed" ? createBrushedRoughnessTexture(reducedDetail) : null),
    [finish, technicalView, reducedDetail]
  )
  const oxidisedRoughnessTexture = useMemo(
    () => (!technicalView && finish === "oxidised" ? createOxidisedRoughnessTexture(reducedDetail) : null),
    [finish, technicalView, reducedDetail]
  )
  const oxidisedColourTexture = useMemo(
    () => (!technicalView && finish === "oxidised" ? createOxidisedColourTexture(reducedDetail) : null),
    [finish, technicalView, reducedDetail]
  )

  const { geometry, grooveAccentGeometries, woodInlayGeometry, woodSleeveGeometry } = useMemo(() => {
    const innerRadius = size / 20
    const bandHalfWidth = mmToScene(width)
    const wallThickness = mmToScene(WALL_THICKNESS_MM)
    const metalThickness = style === "woodSleeve" ? mmToScene(0.5) : wallThickness
    const woodThickness = style === "woodSleeve" ? mmToScene(0.5) : 0
    const metalOuterRadius = innerRadius + metalThickness
    const outerRadius = style === "woodSleeve" ? metalOuterRadius + woodThickness : innerRadius + wallThickness
    const baseProfileStyle = style === "woodSleeve" ? "simple" : style === "faceted" || style === "open" || style === "diagonal" ? "simple" : style
    const profile = buildProfile(baseProfileStyle, innerRadius, metalOuterRadius, bandHalfWidth, metalThickness, styleSettings)
    const baseGeometry = createLatheGeometry(profile, baseProfileStyle, styleSettings, bandHalfWidth, reducedDetail)
    let geometry: THREE.BufferGeometry = baseGeometry

    if (style === "hammered") {
      geometry = createHammeredGeometry(
        baseGeometry,
        size < 17.5 ? "subtle" : size > 21 ? "pronounced" : "medium",
        size < 17.5 ? "fine" : size > 21 ? "medium" : "fine",
        innerRadius,
        outerRadius
      )
    }

    if (style === "faceted") {
      geometry = applyFacetedOuterSurface(
        baseGeometry,
        innerRadius,
        outerRadius,
        styleSettings.facetedCount,
        styleSettings.facetedEdgeMode
      )
    }

    if (style === "open") {
      geometry = createArcSectionGeometry(profile, "open", innerRadius, outerRadius, bandHalfWidth, styleSettings, reducedDetail)
    }

    if (style === "diagonal") {
      geometry = createDiagonalArcGeometry(profile, innerRadius, outerRadius, bandHalfWidth, styleSettings, reducedDetail)
    }

    const woodInlayGeometry =
      style === "woodInlay"
        ? (() => {
            const { inlayHalfWidth, recessedRadius, seamInset, insertChamfer } = getWoodInlayMeasurements(
              styleSettings,
              bandHalfWidth,
              outerRadius,
              wallThickness
            )

            return createInsetStripGeometry(
              outerRadius,
              recessedRadius,
              -inlayHalfWidth,
              inlayHalfWidth,
              styleSettings.woodInlayChamfer ? insertChamfer : 0,
              seamInset,
              style,
              styleSettings,
              reducedDetail
            )
          })()
        : null

    const woodSleeveGeometry =
      style === "woodSleeve"
        ? createWoodSleeveGeometry(
            metalOuterRadius,
            outerRadius,
            bandHalfWidth,
            styleSettings,
            reducedDetail
          )
        : null
    const grooveAccentGeometries =
      style === "grooved" && !technicalView
        ? createGrooveAccentGeometries(innerRadius, outerRadius, bandHalfWidth, styleSettings, reducedDetail)
        : []

    if (geometry !== baseGeometry) {
      baseGeometry.dispose()
    }

    return {
      geometry,
      grooveAccentGeometries,
      woodInlayGeometry,
      woodSleeveGeometry,
    }
  }, [size, width, style, styleSettings, reducedDetail, technicalView])

  useEffect(() => {
    return () => {
      geometry.dispose()
      grooveAccentGeometries.forEach((item) => item.dispose())
      woodInlayGeometry?.dispose()
      woodSleeveGeometry?.dispose()
      brushedSurfaceTexture?.dispose()
      matteRoughnessTexture?.dispose()
      normalRoughnessTexture?.dispose()
      oxidisedColourTexture?.dispose()
      oxidisedRoughnessTexture?.dispose()
      polishedRoughnessTexture?.dispose()
    }
  }, [
    brushedSurfaceTexture,
    geometry,
    grooveAccentGeometries,
    matteRoughnessTexture,
    normalRoughnessTexture,
    oxidisedColourTexture,
    oxidisedRoughnessTexture,
    polishedRoughnessTexture,
    woodInlayGeometry,
    woodSleeveGeometry,
  ])

  const isFacetedCrisp = style === "faceted" && styleSettings.facetedEdgeMode === "hard"
  const finishMaterial = useMemo(
    () =>
      getFinishMaterialSettings(selectedFinish, finish, style, technicalView, {
        brushedSurface: brushedSurfaceTexture,
        matteRoughness: matteRoughnessTexture,
        normalRoughness: normalRoughnessTexture,
        oxidisedColour: oxidisedColourTexture,
        oxidisedRoughness: oxidisedRoughnessTexture,
        polishedRoughness: polishedRoughnessTexture,
      }),
    [
      brushedSurfaceTexture,
      finish,
      matteRoughnessTexture,
      normalRoughnessTexture,
      oxidisedColourTexture,
      oxidisedRoughnessTexture,
      polishedRoughnessTexture,
      selectedFinish,
      style,
      technicalView,
    ]
  )

  return (
    <group rotation={previewRotation}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={finishMaterial.color}
          metalness={finishMaterial.metalness}
          roughness={finishMaterial.roughness}
          roughnessMap={finishMaterial.roughnessMap}
          envMapIntensity={finishMaterial.envMapIntensity}
          clearcoat={finishMaterial.clearcoat}
          clearcoatRoughness={finishMaterial.clearcoatRoughness}
          anisotropy={finishMaterial.anisotropy}
          anisotropyRotation={finishMaterial.anisotropyRotation}
          bumpMap={finishMaterial.bumpMap}
          bumpScale={finishMaterial.bumpScale}
          flatShading={isFacetedCrisp}
          map={finishMaterial.map}
        />
      </mesh>

      {style === "grooved" &&
        !technicalView &&
        grooveAccentGeometries.map((item, index) => (
          <mesh key={`groove-accent-${index}`} geometry={item}>
            <meshStandardMaterial color="#4b443b" metalness={0.6} roughness={0.45} envMapIntensity={0.3} />
          </mesh>
        ))}

      {style === "woodInlay" && woodInlayGeometry && (
        <mesh geometry={woodInlayGeometry}>
          <meshStandardMaterial color="#7a4a26" metalness={0} roughness={0.7} envMapIntensity={0.25} />
        </mesh>
      )}

      {style === "woodSleeve" && woodSleeveGeometry && (
        <mesh geometry={woodSleeveGeometry}>
          <meshStandardMaterial color={styleSettings.woodSleeveWoodType === "oak" ? "#b47f54" : styleSettings.woodSleeveWoodType === "ebony" ? "#231f20" : styleSettings.woodSleeveWoodType === "maple" ? "#d9b58f" : "#8a5a32"} metalness={0} roughness={0.6} envMapIntensity={0.38} />
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
    <mesh position={[0, 1.18, -3.25]} scale={[8.7, 6.3, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent opacity={theme === "dark" ? 0.52 : 0.72} depthWrite={false} toneMapped={false} />
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
  autoRotate,
  autoRotateResumeAt,
  isDragging,
}: {
  ringSize: number
  bandWidth: number
  style: StyleId
  finish: FinishId
  heroRotation: [number, number, number]
  styleSettings: StyleSettings
  reducedDetail: boolean
  autoRotate: boolean
  autoRotateResumeAt: number
  isDragging: boolean
}) {
  const placementGroupRef = useRef<THREE.Group>(null)
  const turntableRef = useRef<THREE.Group>(null)
  const posedGroupRef = useRef<THREE.Group>(null)

  const [groundOffset, setGroundOffset] = useState(0)

  const scale = reducedDetail ? 0.58 : 0.62

  useFrame((_, delta) => {
    if (!turntableRef.current || !autoRotate || isDragging || Date.now() < autoRotateResumeAt) return
    turntableRef.current.rotation.y += delta * AUTO_ROTATE_SPEED
  })

  useEffect(() => {
    const placementGroup = placementGroupRef.current
    const turntableGroup = turntableRef.current
    const posedGroup = posedGroupRef.current

    if (!placementGroup || !turntableGroup || !posedGroup) return

    const prevY = placementGroup.position.y
    const prevTurntableRotation = turntableGroup.rotation.y

    placementGroup.position.y = 0
    turntableGroup.rotation.y = 0

    placementGroup.updateWorldMatrix(true, true)
    posedGroup.updateWorldMatrix(true, true)

    const box = new THREE.Box3().setFromObject(posedGroup)

    placementGroup.position.y = prevY
    turntableGroup.rotation.y = prevTurntableRotation

    const targetY = HERO_FLOOR_Y + HERO_FLOOR_CLEARANCE
    const correction = targetY - box.min.y

    if (Number.isFinite(correction)) {
      setGroundOffset(correction)
    }
  }, [
    ringSize,
    bandWidth,
    style,
    finish,
    heroRotation,
    styleSettings,
    reducedDetail,
  ])

  return (
    <group ref={placementGroupRef} position={[0, groundOffset, 0]}>
      <group ref={turntableRef}>
        <group ref={posedGroupRef} rotation={heroRotation} scale={scale}>
          <Ring size={ringSize} width={bandWidth} style={style} finish={finish} previewRotation={[0, 0, 0]} styleSettings={styleSettings} reducedDetail={reducedDetail} />
        </group>
      </group>
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
        {formatValue(language, bandWidth)} mm
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
  const zoom = kind === "top" ? (reducedDetail ? 50 : 54) / (ringSize / 18) : (reducedDetail ? 42 : 46) / (ringSize / 18)

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
        <ambientLight intensity={1.4} />
        <hemisphereLight args={["#fff1dc", hemiGround, theme === "dark" ? 0.9 : 0.72]} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff4e3" />
        <directionalLight position={[-4, 1, 2]} intensity={1.8} color="#d8e1f2" />
        {kind === "top" ? (
          <gridHelper args={[4, 12, gridMain, gridSoft]} />
        ) : (
          <gridHelper args={[4, 12, gridMain, gridSoft]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.16]} />
        )}
        <Ring size={ringSize} width={bandWidth} style={style} finish={finish} previewRotation={[0, 0, 0]} styleSettings={styleSettings} reducedDetail={reducedDetail} technicalView />
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
  autoRotate,
  autoRotateResumeAt,
  isDragging,
}: {
  ringSize: number
  bandWidth: number
  style: StyleId
  finish: FinishId
  heroRotation: [number, number, number]
  styleSettings: StyleSettings
  theme: ThemeMode
  reducedDetail: boolean
  autoRotate: boolean
  autoRotateResumeAt: number
  isDragging: boolean
}) {
  const heroBackground = theme === "dark" ? "#181513" : "#f1ece6"
  const heroFog = heroBackground
  const floorColor = heroBackground
  const contactShadowColor = theme === "dark" ? "#100d0b" : "#b7a48f"

  return (
    <>
      <color attach="background" args={[heroBackground]} />
      <fog attach="fog" args={[heroFog, 2.8, 8]} />

      <Environment background={false} resolution={reducedDetail ? 1024 : 2048}>
        <Lightformer
          form="rect"
          intensity={theme === "dark" ? 3.8 : 4.6}
          color="#fff8ef"
          scale={[14, 9, 1]}
          position={[0, 1.1, 4.2]}
          rotation={[0, Math.PI, 0]}
        />
        <Lightformer
          form="rect"
          intensity={theme === "dark" ? 7.5 : 8.8}
          color="#ffffff"
          scale={[0.62, 5.8, 1]}
          position={[-1.65, 0.55, 2.45]}
          rotation={[0, Math.PI / 8, 0]}
        />
        <Lightformer
          form="rect"
          intensity={theme === "dark" ? 6.8 : 7.9}
          color="#fffdf7"
          scale={[0.72, 5.8, 1]}
          position={[1.75, 0.55, 2.45]}
          rotation={[0, -Math.PI / 8, 0]}
        />
        <Lightformer
          form="rect"
          intensity={theme === "dark" ? 4.8 : 5.8}
          color="#fff4e6"
          scale={[8, 2.2, 1]}
          position={[0, 2.55, 2.0]}
          rotation={[0.28, Math.PI, 0]}
        />
        <Lightformer
          form="rect"
          intensity={theme === "dark" ? 1.7 : 2.4}
          color="#d0a55f"
          scale={[0.75, 4.2, 1]}
          position={[2.4, 0.25, 1.65]}
          rotation={[0, -Math.PI / 4.8, 0]}
        />
        <Lightformer
          form="rect"
          intensity={theme === "dark" ? 1.05 : 0.7}
          color={theme === "dark" ? "#18120f" : "#3f3a34"}
          scale={[0.24, 4.9, 1]}
          position={[-0.72, 0.34, 1.55]}
          rotation={[0, Math.PI / 2.7, 0]}
        />
      </Environment>

      <ambientLight intensity={theme === "dark" ? 0.42 : 0.48} color="#fff6ea" />
      <hemisphereLight
        args={[
          "#fff9f1",
          theme === "dark" ? "#5b4a3c" : "#d8c4aa",
          theme === "dark" ? 0.95 : 1.05,
        ]}
      />

      <SoftWindowBackdrop theme={theme} reducedDetail={reducedDetail} />

      <GroundedHeroRing
        ringSize={ringSize}
        bandWidth={bandWidth}
        style={style}
        finish={finish}
        heroRotation={heroRotation}
        styleSettings={styleSettings}
        reducedDetail={reducedDetail}
        autoRotate={autoRotate}
        autoRotateResumeAt={autoRotateResumeAt}
        isDragging={isDragging}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HERO_FLOOR_Y, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <MeshReflectorMaterial
          blur={reducedDetail ? [220, 80] : [360, 110]}
          resolution={reducedDetail ? 512 : 2048}
          mirror={theme === "dark" ? 0.34 : 0.42}
          mixBlur={reducedDetail ? (theme === "dark" ? 1.02 : 1.16) : theme === "dark" ? 1.15 : 1.35}
          mixStrength={theme === "dark" ? 1.15 : 1.35}
          mixContrast={theme === "dark" ? 0.95 : 1.02}
          roughness={theme === "dark" ? 0.34 : 0.24}
          metalness={0}
          color={floorColor}
          depthScale={theme === "dark" ? 0.18 : 0.24}
          minDepthThreshold={0.18}
          maxDepthThreshold={theme === "dark" ? 1.2 : 1.45}
          reflectorOffset={0.015}
        />
      </mesh>

      <ContactShadows
        position={[0, HERO_FLOOR_Y + 0.006, 0]}
        opacity={theme === "dark" ? 0.16 : 0.18}
        scale={4.8}
        blur={5.2}
        far={1.8}
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

function PillChoiceGroup({
  name,
  value,
  options,
  onChange,
  ariaLabel,
}: {
  name: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
  ariaLabel: string
}) {
  return (
    <div className="pill-group" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const optionId = `${name}-${option.value}`

        return (
          <label key={option.value} className="pill-option" htmlFor={optionId}>
            <input
              id={optionId}
              className="pill-input"
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="pill-chip">{option.label}</span>
          </label>
        )
      })}
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

function AppLayout({
  children,
  theme,
  layoutMode,
}: {
  children: ReactNode
  theme: ThemeMode
  layoutMode: LayoutMode
}) {
  return (
    <div className={`app-shell theme-${theme} layout-${layoutMode}`}>
      <div className="app-layout">{children}</div>
    </div>
  )
}

function HeroSection({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className="hero-section preview-sticky" aria-label={label}>
      {children}
    </section>
  )
}

function ControlsPanel({ children }: { children: ReactNode }) {
  return <aside className="controls-panel">{children}</aside>
}

function TechnicalViews({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className="technical-views" aria-label={label}>
      {children}
    </section>
  )
}

function App() {
  const [initialConfig] = useState<AppConfig>(() => getInitialConfig())
  const visitedStylesRef = useRef<Set<StyleId>>(new Set([initialConfig.style]))
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
  const [groovedWidthMm, setGroovedWidthMm] = useState(initialConfig.groovedWidthMm)
  const [groovedDepthMm, setGroovedDepthMm] = useState(initialConfig.groovedDepthMm)
  const [groovedCount, setGroovedCount] = useState(initialConfig.groovedCount)
  const [groovedEdgeSpaceMm, setGroovedEdgeSpaceMm] = useState(initialConfig.groovedEdgeSpaceMm)
  const [facetedCount, setFacetedCount] = useState(initialConfig.facetedCount)
  const [facetedEdgeMode, setFacetedEdgeMode] = useState<FacetedEdgeMode>(initialConfig.facetedEdgeMode)
  const [openOpeningMm, setOpenOpeningMm] = useState(initialConfig.openOpeningMm)
  const [openGapEndRoundingMm, setOpenGapEndRoundingMm] = useState(initialConfig.openGapEndRoundingMm)
  const [diagonalOpeningMm, setDiagonalOpeningMm] = useState(initialConfig.diagonalOpeningMm)
  const [diagonalDirection, setDiagonalDirection] = useState<DiagonalDirection>(initialConfig.diagonalDirection)
  const [diagonalEdgeFinish, setDiagonalEdgeFinish] = useState<DiagonalEdgeTreatment>(initialConfig.diagonalEdgeFinish)
  const [diagonalCutAngle, setDiagonalCutAngle] = useState<DiagonalCutAngle>(initialConfig.diagonalCutAngle)
  const [woodSleeveWoodType, setWoodSleeveWoodType] = useState<WoodType>(initialConfig.woodSleeveWoodType)
  const [woodInlayWoodType, setWoodInlayWoodType] = useState<WoodType>(initialConfig.woodInlayWoodType)
  const [woodInlayEdgeSpaceMm, setWoodInlayEdgeSpaceMm] = useState(initialConfig.woodInlayEdgeSpaceMm)
  const [woodInlayChamfer, setWoodInlayChamfer] = useState(initialConfig.woodInlayChamfer)
  const [outerEdgeTreatment, setOuterEdgeTreatment] = useState<OuterEdgeTreatment>(initialConfig.outerEdgeTreatment)
  const [outerEdgeChamferMm, setOuterEdgeChamferMm] = useState(initialConfig.outerEdgeChamferMm)
  const [statusMessage, setStatusMessage] = useState("")
  const [submitState, setSubmitState] = useState<SubmitState>("idle")
  const [autoRotate, setAutoRotate] = useState(() => {
    if (typeof window === "undefined") return true
    return window.innerWidth >= 768
  })
  const [isOrbitDragging, setIsOrbitDragging] = useState(false)
  const [autoRotateResumeAt, setAutoRotateResumeAt] = useState(0)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof window === "undefined") return "desktop"
    const width = window.innerWidth
    if (width < 500) return "compactMobile"
    if (width < 768) return "mobile"
    if (width < 1024) return "tablet"
    if (width > 1400) return "ultraWide"
    if (width <= 1120) return "laptop"
    return "desktop"
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
    edgeSpacing: language === "en" ? "Space to edge" : "Abstand zur Kante",
    derivedInlayWidth: language === "en" ? "Derived inlay width" : "Abgeleitete Einlagenbreite",
    outerEdge: language === "en" ? "Outer edge" : "Außenkante",
    outerEdgeSize: language === "en" ? "Outer edge size" : "Außenkantengröße",
    rounded: language === "en" ? "Rounded" : "Rund",
    none: language === "en" ? "None" : "Keine",
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
    outerCrest: language === "en" ? "Outer crest" : "Außensteg",
    grooveHint:
      language === "en"
        ? "Maximum depends on band width, groove width, and edge spacing."
        : "Das Maximum hängt von Bandbreite, Rillenbreite und Kantenabstand ab.",
    facetCount: language === "en" ? "Facet count" : "Facettenanzahl",
    facetEdgeMode: language === "en" ? "Edge mode" : "Kantenmodus",
    facetSoft: language === "en" ? "Soft edges" : "Weiche Kanten",
    facetHard: language === "en" ? "Hard edges" : "Harte Kanten",
    openOpening: language === "en" ? "Opening size" : "Öffnungsgröße",
    openRoundedEdgeRadius: language === "en" ? "Rounded edge radius" : "Rundungsradius",
    diagonalOpening: language === "en" ? "Opening gap" : "Öffnungsspalt",
    diagonalDirection: language === "en" ? "Cut direction" : "Schnittrichtung",
    diagonalEdgeFinish: language === "en" ? "Edge finish" : "Kantenfinish",
    diagonalCutAngle: language === "en" ? "Cut angle" : "Schnittwinkel",
    woodType: language === "en" ? "Wood type" : "Holzart",
    sleeveHelper: language === "en" ? "Fixed 0.5 mm outer wood sleeve on a metal core." : "Feste 0,5 mm äußere Holzschicht auf einem Metallkern.",
    inlayWidth: language === "en" ? "Inlay width" : "Einlagenbreite",
    chamfer: language === "en" ? "Chamfer" : "Fase",
    chamferOn: language === "en" ? "Yes" : "Ja",
    chamferOff: language === "en" ? "No" : "Nein",
    hammeredHelper: language === "en" ? "Texture applied procedurally. Fine surface details scale with ring size." : "Textur wird prozedural angewendet. Feine Oberflächendetails skalieren mit der Ringgröße.",
    inlayHelper:
      language === "en"
        ? "Wood width is derived from the band width minus twice the edge spacing."
        : "Die Holzbreite ergibt sich aus der Bandbreite minus zweimal dem Kantenabstand.",
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

    const updateLayoutMode = () => {
      const width = window.innerWidth
      if (width < 500) {
        setLayoutMode("compactMobile")
        return
      }
      if (width < 768) {
        setLayoutMode("mobile")
        return
      }
      if (width < 1024) {
        setLayoutMode("tablet")
        return
      }
      if (width > 1400) {
        setLayoutMode("ultraWide")
        return
      }
      if (width <= 1120) {
        setLayoutMode("laptop")
        return
      }
      setLayoutMode("desktop")
    }

    updateLayoutMode()
    window.addEventListener("resize", updateLayoutMode)

    return () => window.removeEventListener("resize", updateLayoutMode)
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
  const circumference = getCircumferenceMm(ringSize)
  const isTabletLayout = layoutMode === "tablet"
  const isMobileLayout = layoutMode === "mobile" || layoutMode === "compactMobile"
  const renderDelayMs =
    layoutMode === "mobile" || layoutMode === "compactMobile"
      ? 220
      : layoutMode === "tablet"
      ? 120
      : 0
  const isLandscapeMobile =
    typeof window !== "undefined" &&
    isMobileLayout &&
    window.matchMedia("(orientation: landscape)").matches
  const reducedDetail = isTabletLayout || isMobileLayout
  const woodInlayWidthMm = getWoodInlayWidthMm(bandWidth, woodInlayEdgeSpaceMm)
  const renderRingSize = useDebouncedValue(ringSize, renderDelayMs)
  const renderBandWidth = useDebouncedValue(bandWidth, renderDelayMs)
  const renderGroovedWidthMm = useDebouncedValue(groovedWidthMm, renderDelayMs)
  const renderGroovedDepthMm = useDebouncedValue(groovedDepthMm, renderDelayMs)
  const renderGroovedCount = useDebouncedValue(groovedCount, renderDelayMs)
  const renderGroovedEdgeSpaceMm = useDebouncedValue(groovedEdgeSpaceMm, renderDelayMs)
  const renderFacetedCount = useDebouncedValue(facetedCount, renderDelayMs)
  const renderOpenOpeningMm = useDebouncedValue(openOpeningMm, renderDelayMs)
  const renderOpenGapEndRoundingMm = useDebouncedValue(openGapEndRoundingMm, renderDelayMs)
  const renderDiagonalOpeningMm = useDebouncedValue(diagonalOpeningMm, renderDelayMs)
  const renderWoodInlayEdgeSpaceMm = useDebouncedValue(woodInlayEdgeSpaceMm, renderDelayMs)
  const renderOuterEdgeChamferMm = useDebouncedValue(outerEdgeChamferMm, renderDelayMs)
  const heroCamera = layoutMode === "ultraWide"
    ? { position: [0, 0.03, 5.5] as [number, number, number], fov: 19 }
    : { position: [0, 0.03, 5.5] as [number, number, number], fov: 20 }

  const heroTarget: [number, number, number] = [0, -0.9, 0]
  const heroDpr: [number, number] = isMobileLayout ? [1, 1] : reducedDetail ? [1, 1.25] : [1, 1.75]

  useEffect(() => {
    const validated = validateStyleSettings({
      language,
      ringSize,
      bandWidth,
      style,
      finish,
      name,
      groovedWidthMm,
      groovedDepthMm,
      groovedCount,
      groovedEdgeSpaceMm,
      facetedCount,
      facetedEdgeMode,
      openOpeningMm,
      openGapEndRoundingMm,
      diagonalOpeningMm,
      diagonalDirection,
      diagonalEdgeFinish,
      diagonalCutAngle,
      woodSleeveWoodType,
      woodInlayWoodType,
      woodInlayEdgeSpaceMm,
      woodInlayChamfer,
      outerEdgeTreatment,
      outerEdgeChamferMm,
    })

    const hasChanges =
      validated.groovedWidthMm !== groovedWidthMm ||
      validated.groovedDepthMm !== groovedDepthMm ||
      validated.groovedCount !== groovedCount ||
      validated.groovedEdgeSpaceMm !== groovedEdgeSpaceMm ||
      validated.facetedCount !== facetedCount ||
      validated.openOpeningMm !== openOpeningMm ||
      validated.openGapEndRoundingMm !== openGapEndRoundingMm ||
      validated.diagonalOpeningMm !== diagonalOpeningMm ||
      validated.woodInlayEdgeSpaceMm !== woodInlayEdgeSpaceMm ||
      validated.outerEdgeTreatment !== outerEdgeTreatment ||
      validated.outerEdgeChamferMm !== outerEdgeChamferMm

    if (!hasChanges) return

    queueMicrotask(() => {
      if (validated.groovedWidthMm !== groovedWidthMm) setGroovedWidthMm(validated.groovedWidthMm)
      if (validated.groovedDepthMm !== groovedDepthMm) setGroovedDepthMm(validated.groovedDepthMm)
      if (validated.groovedCount !== groovedCount) setGroovedCount(validated.groovedCount)
      if (validated.groovedEdgeSpaceMm !== groovedEdgeSpaceMm) setGroovedEdgeSpaceMm(validated.groovedEdgeSpaceMm)
      if (validated.facetedCount !== facetedCount) setFacetedCount(validated.facetedCount)
      if (validated.openOpeningMm !== openOpeningMm) setOpenOpeningMm(validated.openOpeningMm)
      if (validated.openGapEndRoundingMm !== openGapEndRoundingMm) setOpenGapEndRoundingMm(validated.openGapEndRoundingMm)
      if (validated.diagonalOpeningMm !== diagonalOpeningMm) setDiagonalOpeningMm(validated.diagonalOpeningMm)
      if (validated.woodInlayEdgeSpaceMm !== woodInlayEdgeSpaceMm) setWoodInlayEdgeSpaceMm(validated.woodInlayEdgeSpaceMm)
      if (validated.outerEdgeTreatment !== outerEdgeTreatment) setOuterEdgeTreatment(validated.outerEdgeTreatment)
      if (validated.outerEdgeChamferMm !== outerEdgeChamferMm) setOuterEdgeChamferMm(validated.outerEdgeChamferMm)
    })
  }, [
    language,
    ringSize,
    bandWidth,
    style,
    finish,
    name,
    groovedWidthMm,
    groovedDepthMm,
    groovedCount,
    groovedEdgeSpaceMm,
    facetedCount,
    facetedEdgeMode,
    openOpeningMm,
    openGapEndRoundingMm,
    diagonalOpeningMm,
    diagonalDirection,
    diagonalEdgeFinish,
    diagonalCutAngle,
    woodSleeveWoodType,
    woodInlayWoodType,
    woodInlayEdgeSpaceMm,
    woodInlayChamfer,
    outerEdgeTreatment,
    outerEdgeChamferMm,
  ])

  const renderStyleSettings = useMemo<StyleSettings>(
    () => ({
      ringSize: renderRingSize,
      bandWidth: renderBandWidth,
      groovedWidthMm: renderGroovedWidthMm,
      groovedDepthMm: renderGroovedDepthMm,
      groovedCount: renderGroovedCount,
      groovedEdgeSpaceMm: renderGroovedEdgeSpaceMm,
      facetedCount: renderFacetedCount,
      facetedEdgeMode,
      openOpeningMm: renderOpenOpeningMm,
      openGapEndRoundingMm: renderOpenGapEndRoundingMm,
      diagonalOpeningMm: renderDiagonalOpeningMm,
      diagonalDirection,
      diagonalEdgeFinish,
      diagonalCutAngle,
      woodSleeveWoodType,
      woodInlayWoodType,
      woodInlayEdgeSpaceMm: renderWoodInlayEdgeSpaceMm,
      woodInlayChamfer,
      outerEdgeTreatment,
      outerEdgeChamferMm: renderOuterEdgeChamferMm,
    }),
    [
      renderRingSize,
      renderBandWidth,
      renderGroovedWidthMm,
      renderGroovedDepthMm,
      renderGroovedCount,
      renderGroovedEdgeSpaceMm,
      renderFacetedCount,
      facetedEdgeMode,
      renderOpenOpeningMm,
      renderOpenGapEndRoundingMm,
      renderDiagonalOpeningMm,
      diagonalDirection,
      diagonalEdgeFinish,
      diagonalCutAngle,
      woodSleeveWoodType,
      woodInlayWoodType,
      renderWoodInlayEdgeSpaceMm,
      woodInlayChamfer,
      outerEdgeTreatment,
      renderOuterEdgeChamferMm,
    ]
  )

  const maxGrooveCount = getMaxGrooveCount(bandWidth, groovedWidthMm, groovedEdgeSpaceMm)
  const facetedArcLengthMm = circumference / facetedCount
  const diagonalCutAngleDegrees = getDiagonalCutAngleDegrees(diagonalCutAngle)
  const woodInlayMaxEdgeSpaceMm = getWoodInlayMaxEdgeSpaceMm(bandWidth)

  function getOuterEdgeTreatmentLabel(treatment: OuterEdgeTreatment) {
    if (treatment === "rounded") return t.rounded
    if (treatment === "none") return t.none
    return t.chamfer
  }

  function getOuterEdgeSummaryLabel(treatment: OuterEdgeTreatment, sizeMm: number) {
    if (treatment === "none") return `${t.outerEdge}: ${t.none}`
    return `${t.outerEdge}: ${getOuterEdgeTreatmentLabel(treatment)} / ${formatValue(language, sizeMm)} mm`
  }

  function getWoodTypeLabel(woodType: WoodType) {
    if (woodType === "oak") return language === "en" ? "Oak" : "Eiche"
    if (woodType === "ebony") return language === "en" ? "Ebony" : "Ebenholz"
    if (woodType === "maple") return language === "en" ? "Maple" : "Ahorn"
    return language === "en" ? "Walnut" : "Walnuss"
  }

  const activeStyleValues = (() => {
    switch (style) {
      case "grooved":
        return { groovedWidthMm, groovedDepthMm, groovedCount, groovedEdgeSpaceMm, outerEdgeTreatment, outerEdgeChamferMm }
      case "faceted":
        return { facetedCount, facetedArcLengthMm: Number(facetedArcLengthMm.toFixed(1)), facetedEdgeMode, outerEdgeTreatment, outerEdgeChamferMm }
      case "open":
        return { openOpeningMm, openGapEndRoundingMm, outerEdgeTreatment, outerEdgeChamferMm }
      case "diagonal":
        return { diagonalOpeningMm, diagonalDirection, diagonalEdgeFinish, diagonalCutAngleDegrees, outerEdgeTreatment, outerEdgeChamferMm }
      case "woodSleeve":
        return { woodSleeveWoodType, woodSleeveThicknessMm: WOOD_SLEEVE_THICKNESS_MM, outerEdgeTreatment, outerEdgeChamferMm }
      case "woodInlay":
        return {
          woodInlayWoodType,
          woodInlayEdgeSpaceMm,
          woodInlayWidthMm,
          woodInlayChamfer,
          outerEdgeTreatment,
          outerEdgeChamferMm,
        }
      default:
        return { outerEdgeTreatment, outerEdgeChamferMm }
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

  const styleSummaryParts =
    style === "grooved"
      ? [
          `${formatValue(language, groovedWidthMm)} mm ${language === "en" ? "groove width" : "Rillenbreite"}`,
          `${formatValue(language, groovedDepthMm)} mm ${language === "en" ? "groove depth" : "Rillentiefe"}`,
          `${groovedCount} ${language === "en" ? "grooves" : "Rillen"}`,
          `${formatValue(language, groovedEdgeSpaceMm)} mm ${language === "en" ? "edge spacing" : "Kantenabstand"}`,
        ]
      : style === "faceted"
      ? [
          `${facetedCount} ${language === "en" ? "facets" : "Facetten"}`,
          `${formatValue(language, facetedArcLengthMm)} mm ${language === "en" ? "per facet" : "pro Facette"}`,
          facetedEdgeMode === "hard" ? t.facetHard : t.facetSoft,
        ]
      : style === "open"
      ? [
          `${formatValue(language, openOpeningMm)} mm ${language === "en" ? "opening" : "Öffnung"}`,
          `${formatValue(language, openGapEndRoundingMm)} mm ${language === "en" ? "gap end rounding" : "Rundung der Spaltenden"}`,
        ]
      : style === "diagonal"
      ? [
          `${formatValue(language, diagonalOpeningMm)} mm ${language === "en" ? "opening gap" : "Öffnungsspalt"}`,
          `${diagonalCutAngleDegrees}°`,
          diagonalDirection === "leftRising" ? (language === "en" ? "Left rising" : "Links steigend") : language === "en" ? "Right rising" : "Rechts steigend",
          diagonalEdgeFinish === "softened" ? (language === "en" ? "Softened edge" : "Abgemilderte Kante") : language === "en" ? "Razor edge" : "Scharfe Kante",
        ]
      : style === "woodSleeve"
      ? [
          getWoodTypeLabel(woodSleeveWoodType),
          `${formatValue(language, WOOD_SLEEVE_THICKNESS_MM)} mm ${language === "en" ? "outer wood sleeve" : "äußere Holzschicht"}`,
        ]
      : style === "woodInlay"
      ? [
          getWoodTypeLabel(woodInlayWoodType),
          `${formatValue(language, woodInlayEdgeSpaceMm)} mm ${language === "en" ? "space to edge" : "Abstand zur Kante"}`,
          `${formatValue(language, woodInlayWidthMm)} mm ${language === "en" ? "inlay width" : "Einlagenbreite"}`,
          woodInlayChamfer ? t.chamferOn : t.chamferOff,
        ]
      : []

  const configSummary = [
    name.trim() || getDefaultName(language),
    `Ø ${formatValue(language, ringSize)} mm`,
    `${formatValue(language, circumference)} mm ${language === "en" ? "circumference" : "Umfang"}`,
    `${formatValue(language, bandWidth)} mm ${language === "en" ? "band width" : "Breite"}`,
    language === "en" ? selectedStyle.en : selectedStyle.de,
    language === "en" ? selectedFinish.en : selectedFinish.de,
    ...styleSummaryParts.filter(Boolean),
  ].join(" · ")

  function switchStyle(nextStyle: StyleId) {
    setStyle(nextStyle)

    if (visitedStylesRef.current.has(nextStyle)) return

    visitedStylesRef.current.add(nextStyle)

    const preset = STYLE_DEFAULTS[nextStyle]

    if (typeof preset.bandWidth === "number") setBandWidth(preset.bandWidth)
    if (preset.finish) setFinish(preset.finish)
    if (typeof preset.groovedWidthMm === "number") setGroovedWidthMm(preset.groovedWidthMm)
    if (typeof preset.groovedDepthMm === "number") setGroovedDepthMm(preset.groovedDepthMm)
    if (typeof preset.groovedCount === "number") setGroovedCount(preset.groovedCount)
    if (typeof preset.groovedEdgeSpaceMm === "number") setGroovedEdgeSpaceMm(preset.groovedEdgeSpaceMm)
    if (typeof preset.facetedCount === "number") setFacetedCount(preset.facetedCount)
    if (preset.facetedEdgeMode) setFacetedEdgeMode(preset.facetedEdgeMode)
    if (typeof preset.openOpeningMm === "number") setOpenOpeningMm(preset.openOpeningMm)
    if (typeof preset.openGapEndRoundingMm === "number") setOpenGapEndRoundingMm(preset.openGapEndRoundingMm)
    if (typeof preset.diagonalOpeningMm === "number") setDiagonalOpeningMm(preset.diagonalOpeningMm)
    if (preset.diagonalDirection) setDiagonalDirection(preset.diagonalDirection)
    if (preset.diagonalEdgeFinish) setDiagonalEdgeFinish(preset.diagonalEdgeFinish)
    if (preset.diagonalCutAngle) setDiagonalCutAngle(preset.diagonalCutAngle)
    if (preset.woodSleeveWoodType) setWoodSleeveWoodType(preset.woodSleeveWoodType)
    if (preset.woodInlayWoodType) setWoodInlayWoodType(preset.woodInlayWoodType)
    if (typeof preset.woodInlayEdgeSpaceMm === "number") setWoodInlayEdgeSpaceMm(preset.woodInlayEdgeSpaceMm)
    if ("woodInlayChamfer" in preset && typeof preset.woodInlayChamfer === "boolean") setWoodInlayChamfer(preset.woodInlayChamfer)
    if (preset.outerEdgeTreatment) setOuterEdgeTreatment(preset.outerEdgeTreatment)
    if (typeof preset.outerEdgeChamferMm === "number") setOuterEdgeChamferMm(preset.outerEdgeChamferMm)
  }

  function resetConfig() {
    visitedStylesRef.current = new Set([DEFAULT_CONFIG.style])
    setRingSize(DEFAULT_CONFIG.ringSize)
    setBandWidth(DEFAULT_CONFIG.bandWidth)
    setStyle(DEFAULT_CONFIG.style)
    setFinish(DEFAULT_CONFIG.finish)
    setGroovedWidthMm(DEFAULT_CONFIG.groovedWidthMm)
    setGroovedDepthMm(DEFAULT_CONFIG.groovedDepthMm)
    setGroovedCount(DEFAULT_CONFIG.groovedCount)
    setGroovedEdgeSpaceMm(DEFAULT_CONFIG.groovedEdgeSpaceMm)
    setFacetedCount(DEFAULT_CONFIG.facetedCount)
    setFacetedEdgeMode(DEFAULT_CONFIG.facetedEdgeMode)
    setOpenOpeningMm(DEFAULT_CONFIG.openOpeningMm)
    setOpenGapEndRoundingMm(DEFAULT_CONFIG.openGapEndRoundingMm)
    setDiagonalOpeningMm(DEFAULT_CONFIG.diagonalOpeningMm)
    setDiagonalDirection(DEFAULT_CONFIG.diagonalDirection)
    setDiagonalEdgeFinish(DEFAULT_CONFIG.diagonalEdgeFinish)
    setDiagonalCutAngle(DEFAULT_CONFIG.diagonalCutAngle)
    setWoodSleeveWoodType(DEFAULT_CONFIG.woodSleeveWoodType)
    setWoodInlayWoodType(DEFAULT_CONFIG.woodInlayWoodType)
    setWoodInlayEdgeSpaceMm(DEFAULT_CONFIG.woodInlayEdgeSpaceMm)
    setWoodInlayChamfer(DEFAULT_CONFIG.woodInlayChamfer)
    setOuterEdgeTreatment(DEFAULT_CONFIG.outerEdgeTreatment)
    setOuterEdgeChamferMm(DEFAULT_CONFIG.outerEdgeChamferMm)
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
    <AppLayout theme={theme} layoutMode={isLandscapeMobile ? "laptop" : layoutMode}>
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
        className="topbar-toggle language-toggle topbar-language-toggle"
        onClick={() => setLanguage(language === "en" ? "de" : "en")}
        aria-label={language === "en" ? "Switch language to German" : "Sprache auf Englisch wechseln"}
      >
        {language === "en" ? "DE" : "EN"}
      </button>

      <ControlsPanel>
        <div className="sidebar-header">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ flex: "1 1 auto" }}>
              <p className="eyebrow">{language === "en" ? "Custom stainless steel ring" : "Individueller Edelstahlring"}</p>
              <h1>{t.title}</h1>
            </div>
            <button
              type="button"
              className="language-toggle mobile-language-toggle"
              onClick={() => setLanguage(language === "en" ? "de" : "en")}
              aria-label={language === "en" ? "Switch language to German" : "Sprache auf Englisch wechseln"}
            >
              {language === "en" ? "DE" : "EN"}
            </button>
          </div>
          <p className="subtitle">{t.subtitle}</p>
        </div>

        <div className="controls-scroll">
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

            <Field label={`${t.diameter}: ${formatValue(language, ringSize)} mm`} htmlFor={diameterRangeId}>
              <input
                id={diameterRangeId}
                className="range-input"
                type="range"
                min={String(sizes[0].diameter)}
                max={String(sizes[sizes.length - 1].diameter)}
                step="0.1"
                value={ringSize}
                onChange={(event) => setRingSize(snapToNearestSize(Number(event.target.value)))}
              />
            </Field>

            <Field label={`${t.width}: ${formatValue(language, bandWidth)} mm`} htmlFor={widthRangeId}>
              <input
                id={widthRangeId}
                className="range-input"
                type="range"
                min={String(BAND_WIDTH_MIN_MM)}
                max={String(BAND_WIDTH_MAX_MM)}
                step="1"
                value={bandWidth}
                onChange={(event) => setBandWidth(Number(event.target.value))}
              />
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
                    <input id={optionId} className="option-input" type="radio" name={styleGroupName} value={item.id} checked={style === item.id} onChange={() => switchStyle(item.id)} />
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

        {(style === "simple" || style === "grooved" || style === "faceted" || style === "hammered" || style === "open" || style === "diagonal" || style === "woodSleeve" || style === "woodInlay") && (
          <PanelSection title={t.styleOptionsSection}>
            <div className="option-group">
              {(style === "simple" || style === "grooved" || style === "faceted" || style === "open" || style === "diagonal" || style === "woodSleeve" || style === "woodInlay") && (
                <>
                  <Field
                    label={getOuterEdgeSummaryLabel(outerEdgeTreatment, outerEdgeChamferMm)}
                    htmlFor={`${styleOptionsGroupId}-outer-edge-treatment-rounded`}
                  >
                    <PillChoiceGroup
                      name={`${styleOptionsGroupId}-outer-edge-treatment`}
                      value={outerEdgeTreatment}
                      ariaLabel={t.outerEdge}
                      onChange={(value) => setOuterEdgeTreatment(value as OuterEdgeTreatment)}
                      options={[
                        { label: t.rounded, value: "rounded" },
                        { label: t.chamfer, value: "chamfer" },
                        { label: t.none, value: "none" },
                      ]}
                    />
                  </Field>

                  {outerEdgeTreatment !== "none" && (
                    <Field
                      label={`${language === "en" ? "Outer edge size" : "Außenkantengröße"}: ${formatValue(language, outerEdgeChamferMm)} mm`}
                      htmlFor={`${styleOptionsGroupId}-outer-edge-size`}
                    >
                      <input
                        id={`${styleOptionsGroupId}-outer-edge-size`}
                        className="range-input"
                        type="range"
                        min="0.3"
                        max="1.0"
                        step="0.1"
                        value={outerEdgeChamferMm}
                        onChange={(event) => setOuterEdgeChamferMm(Number(event.target.value))}
                      />
                    </Field>
                  )}
                </>
              )}

              {false && (style === "simple" || style === "grooved" || style === "faceted" || style === "open" || style === "diagonal" || style === "woodSleeve" || style === "woodInlay") && (
                <Field
                  label={`${language === "en" ? "Outer edge chamfer" : "Außenschrägung"}: ${outerEdgeChamferMm === 0 ? (language === "en" ? "none" : "keine") : `${formatValue(language, outerEdgeChamferMm)} mm`}`}
                  htmlFor={`${styleOptionsGroupId}-outer-edge-chamfer`}
                >
                  <select
                    id={`${styleOptionsGroupId}-outer-edge-chamfer`}
                    className="field-input"
                    value={String(outerEdgeChamferMm)}
                    onChange={(event) => setOuterEdgeChamferMm(Number(event.target.value))}
                  >
                    <option value="0">{language === "en" ? "None" : "Keine"}</option>
                    <option value="0.3">0.3 mm</option>
                    <option value="0.6">0.6 mm</option>
                    <option value="1">1.0 mm</option>
                  </select>
                </Field>
              )}

              {style === "grooved" && (
                <>
                  <Field label={`${t.grooveWidth}: ${formatValue(language, groovedWidthMm)} mm`} htmlFor={`${styleOptionsGroupId}-grooved-width`}>
                    <input
                      id={`${styleOptionsGroupId}-grooved-width`}
                      className="range-input"
                      type="range"
                      min="0.4"
                      max="2.0"
                      step="0.1"
                      value={groovedWidthMm}
                      onChange={(event) => setGroovedWidthMm(Number(event.target.value))}
                    />
                  </Field>
                  <Field label={`${t.grooveDepth}: ${formatValue(language, groovedDepthMm)} mm`} htmlFor={`${styleOptionsGroupId}-grooved-depth`}>
                    <input
                      id={`${styleOptionsGroupId}-grooved-depth`}
                      className="range-input"
                      type="range"
                      min="0.1"
                      max="0.5"
                      step="0.1"
                      value={groovedDepthMm}
                      onChange={(event) => setGroovedDepthMm(Number(event.target.value))}
                    />
                  </Field>
                  <Field label={`${language === "en" ? "Space from groove to edge" : "Abstand von der Rille zur Kante"}: ${formatValue(language, groovedEdgeSpaceMm)} mm`} htmlFor={`${styleOptionsGroupId}-grooved-edge-space`}>
                    <input
                      id={`${styleOptionsGroupId}-grooved-edge-space`}
                      className="range-input"
                      type="range"
                      min="0.5"
                      max={Math.max(0.5, bandWidth / 2)}
                      step="0.1"
                      value={groovedEdgeSpaceMm}
                      onChange={(event) => setGroovedEdgeSpaceMm(Number(event.target.value))}
                    />
                  </Field>
                  <Field label={`${t.grooveCount}: ${groovedCount} / max ${maxGrooveCount}`} htmlFor={`${styleOptionsGroupId}-grooved-count`}>
                    <input
                      id={`${styleOptionsGroupId}-grooved-count`}
                      className="range-input"
                      type="range"
                      min="1"
                      max={maxGrooveCount}
                      step="1"
                      value={groovedCount}
                      onChange={(event) => setGroovedCount(Number(event.target.value))}
                    />
                  </Field>
                  <p className="field-hint">{t.grooveHint}</p>
                </>
              )}

              {style === "faceted" && (
                <>
                  <Field label={`${t.facetCount}: ${facetedCount} ${language === "en" ? "facets" : "Facetten"} · ${formatValue(language, facetedArcLengthMm)} mm ${language === "en" ? "per facet" : "pro Facette"}`} htmlFor={`${styleOptionsGroupId}-faceted-count`}>
                    <input
                      id={`${styleOptionsGroupId}-faceted-count`}
                      className="range-input"
                      type="range"
                      min="10"
                      max={Math.max(10, Math.min(20, Math.floor(circumference / FACET_MIN_ARC_MM)))}
                      step="1"
                      value={facetedCount}
                      onChange={(event) => setFacetedCount(Number(event.target.value))}
                    />
                  </Field>
                  <Field label={t.facetEdgeMode} htmlFor={`${styleOptionsGroupId}-faceted-edge-mode`}>
                    <select
                      id={`${styleOptionsGroupId}-faceted-edge-mode`}
                      className="field-input"
                      value={facetedEdgeMode}
                      onChange={(event) => setFacetedEdgeMode(event.target.value as FacetedEdgeMode)}
                    >
                      <option value="soft">{t.facetSoft}</option>
                      <option value="hard">{t.facetHard}</option>
                    </select>
                  </Field>
                </>
              )}

              {style === "hammered" && <p className="field-hint">{t.hammeredHelper}</p>}

              {style === "open" && (
                <>
                  <Field label={`${t.openOpening}: ${formatValue(language, openOpeningMm)} mm`} htmlFor={`${styleOptionsGroupId}-open-opening`}>
                    <input
                      id={`${styleOptionsGroupId}-open-opening`}
                      className="range-input"
                      type="range"
                      min="3"
                      max={Math.min(8, circumference * 0.25)}
                      step="0.1"
                      value={openOpeningMm}
                      onChange={(event) => setOpenOpeningMm(Number(event.target.value))}
                    />
                  </Field>
                  <Field label={`${t.openRoundedEdgeRadius}: ${formatValue(language, openGapEndRoundingMm)} mm`} htmlFor={`${styleOptionsGroupId}-open-rounded-edge`}>
                    <input
                      id={`${styleOptionsGroupId}-open-rounded-edge`}
                      className="range-input"
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.1"
                      value={openGapEndRoundingMm}
                      onChange={(event) => setOpenGapEndRoundingMm(Number(event.target.value))}
                    />
                  </Field>
                </>
              )}

              {style === "diagonal" && (
                <>
                  <Field label={`${t.diagonalOpening}: ${formatValue(language, diagonalOpeningMm)} mm`} htmlFor={`${styleOptionsGroupId}-diagonal-opening`}>
                    <input
                      id={`${styleOptionsGroupId}-diagonal-opening`}
                      className="range-input"
                      type="range"
                      min="3"
                      max={Math.min(8, circumference * 0.25)}
                      step="0.1"
                      value={diagonalOpeningMm}
                      onChange={(event) => setDiagonalOpeningMm(Number(event.target.value))}
                    />
                  </Field>
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
                  <Field label={t.diagonalEdgeFinish} htmlFor={`${styleOptionsGroupId}-diagonal-edge-finish`}>
                    <select
                      id={`${styleOptionsGroupId}-diagonal-edge-finish`}
                      className="field-input"
                      value={diagonalEdgeFinish}
                      onChange={(event) => setDiagonalEdgeFinish(event.target.value as DiagonalEdgeTreatment)}
                    >
                      <option value="razor">{language === "en" ? "Razor" : "Scharf"}</option>
                      <option value="softened">{language === "en" ? "Softened · 0.4 mm bevel" : "Abgemildert · 0,4 mm Fase"}</option>
                    </select>
                  </Field>
                  <Field label={`${t.diagonalCutAngle}: ${getDiagonalCutAngleDegrees(diagonalCutAngle)}°`} htmlFor={`${styleOptionsGroupId}-diagonal-cut-angle`}>
                    <select
                      id={`${styleOptionsGroupId}-diagonal-cut-angle`}
                      className="field-input"
                      value={diagonalCutAngle}
                      onChange={(event) => setDiagonalCutAngle(event.target.value as DiagonalCutAngle)}
                    >
                      <option value="gentle">{language === "en" ? "Gentle · 20°" : "Sanft · 20°"}</option>
                      <option value="standard">{language === "en" ? "Standard · 35°" : "Standard · 35°"}</option>
                      <option value="steep">{language === "en" ? "Steep · 50°" : "Steil · 50°"}</option>
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
                  <p className="field-hint">{t.sleeveHelper}</p>
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
                  <Field label={`${t.edgeSpacing}: ${formatValue(language, woodInlayEdgeSpaceMm)} mm`} htmlFor={`${styleOptionsGroupId}-wood-inlay-edge-space`}>
                    <input
                      id={`${styleOptionsGroupId}-wood-inlay-edge-space`}
                      className="range-input"
                      type="range"
                      min={String(WOOD_INLAY_MIN_EDGE_SPACE_MM)}
                      max={woodInlayMaxEdgeSpaceMm}
                      step="0.1"
                      value={Math.min(woodInlayEdgeSpaceMm, woodInlayMaxEdgeSpaceMm)}
                      onChange={(event) => setWoodInlayEdgeSpaceMm(Number(event.target.value))}
                    />
                  </Field>
                  <p className="field-hint">{`${t.derivedInlayWidth}: ${formatValue(language, woodInlayWidthMm)} mm`}</p>
                  <Field label={t.chamfer} htmlFor={`${styleOptionsGroupId}-wood-inlay-chamfer`}>
                    <select
                      id={`${styleOptionsGroupId}-wood-inlay-chamfer`}
                      className="field-input"
                      value={woodInlayChamfer ? "yes" : "no"}
                      onChange={(event) => setWoodInlayChamfer(event.target.value === "yes")}
                    >
                      <option value="yes">{t.chamferOn}</option>
                      <option value="no">{t.chamferOff}</option>
                    </select>
                  </Field>
                  <p className="field-hint">{t.inlayHelper}</p>
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
            <div className="summary-row"><dt>{t.diameter}</dt><dd>{formatValue(language, ringSize)} mm</dd></div>
            <div className="summary-row"><dt>{t.circumference}</dt><dd>{formatValue(language, circumference)} mm</dd></div>
            <div className="summary-row"><dt>{t.width}</dt><dd>{formatValue(language, bandWidth)} mm</dd></div>
            <div className="summary-row"><dt>{t.style}</dt><dd>{language === "en" ? selectedStyle.en : selectedStyle.de}</dd></div>
            <div className="summary-row"><dt>{t.finish}</dt><dd>{language === "en" ? selectedFinish.en : selectedFinish.de}</dd></div>
          </dl>
        </section>
        </div>
      </ControlsPanel>

      <main className="app-main">
        <HeroSection label={t.preview}>
          <section className="main-view-card" aria-label={t.preview}>
            <div className="hero-aspect">
              <Canvas
                camera={heroCamera}
                shadows
                dpr={heroDpr}
                frameloop={autoRotate ? "always" : "demand"}
                gl={{
                  antialias: true,
                  alpha: true,
                  powerPreference: "high-performance",
                }}
                onCreated={({ gl }) => {
                  gl.toneMapping = THREE.ACESFilmicToneMapping
                  gl.toneMappingExposure = theme === "dark" ? 1.1 : 1.16
                  gl.outputColorSpace = THREE.SRGBColorSpace
                }}
              >
                <StudioScene ringSize={renderRingSize} bandWidth={renderBandWidth} style={style} finish={finish} heroRotation={heroRotation} styleSettings={renderStyleSettings} theme={theme} reducedDetail={reducedDetail} autoRotate={autoRotate} autoRotateResumeAt={autoRotateResumeAt} isDragging={isOrbitDragging} />
                <OrbitControls
                  key="orbit-controls"
                  enableDamping
                  dampingFactor={0.06}
                  enablePan={false}
                  autoRotate={false}
                  onStart={() => setIsOrbitDragging(true)}
                  onEnd={() => {
                    setIsOrbitDragging(false)
                    setAutoRotateResumeAt(Date.now() + AUTO_ROTATE_RESUME_DELAY_MS)
                  }}
                  target={heroTarget}
                  minDistance={isMobileLayout ? 4.6 : 5.0}
                  maxDistance={isMobileLayout ? 7.2 : 8.0}
                  minPolarAngle={Math.PI / 3.2}
                  maxPolarAngle={Math.PI / 1.95}
                />
              </Canvas>
              <div className="hero-button-stack">
                <button
                  type="button"
                  className={`hero-control-button hero-rotate-button${autoRotate ? "" : " is-inactive"}`}
                  onClick={() => setAutoRotate((current) => !current)}
                  aria-label={language === "en" ? "Toggle rotation" : "Rotation umschalten"}
                >
                  <RotateCcw aria-hidden="true" className="hero-rotate-icon ui-icon" strokeWidth={1.9} />
                </button>
                <button
                  type="button"
                  className="hero-control-button hero-theme-button"
                  onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
                  aria-label={language === "en" ? "Toggle dark mode" : "Dunkelmodus umschalten"}
                >
                  {theme === "light" ? <MoonStar aria-hidden="true" className="topbar-icon ui-icon" strokeWidth={1.9} /> : <SunMedium aria-hidden="true" className="topbar-icon ui-icon" strokeWidth={1.9} />}
                </button>
              </div>
            </div>
          </section>
        </HeroSection>

        <TechnicalViews label={t.technicalTitle}>
          <section className="ortho-grid">
            <OrthoView title={t.topView} kind="top" cameraPosition={[0, 3, 0]} cameraUp={[0, 0, -1]} ringSize={renderRingSize} bandWidth={renderBandWidth} style={style} finish={finish} language={language} styleSettings={renderStyleSettings} theme={theme} reducedDetail={reducedDetail} />
            <OrthoView title={t.frontView} kind="front" cameraPosition={[0, 0, 3]} cameraUp={[0, 1, 0]} ringSize={renderRingSize} bandWidth={renderBandWidth} style={style} finish={finish} language={language} styleSettings={renderStyleSettings} theme={theme} reducedDetail={reducedDetail} className="ortho-card-front" />
          </section>
        </TechnicalViews>
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
    </AppLayout>
  )
}

export default App
