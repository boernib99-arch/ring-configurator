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
  woodInlayWidth?: InlayWidth | number
  woodInlayWidthMm?: number
  woodInlayDepth?: InlayDepth
  woodInlayChamfer?: boolean
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
  woodSleeveWoodType: WoodType
  woodInlayWoodType: WoodType
  woodInlayWidthMm: number
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
  woodSleeveWoodType: WoodType
  woodInlayWoodType: WoodType
  woodInlayWidthMm: number
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
const WALL_THICKNESS_MM = 2.0
const WOOD_SLEEVE_THICKNESS_MM = 0.5
const WOOD_INLAY_EDGE_MM = 1.0
const METAL_LIP_MM = 0.5
const FACET_MIN_ARC_MM = 2.2
const MIN_GROOVE_METAL_GAP_MM = 0.4

const DEFAULT_CONFIG: AppConfig = {
  language: "en",
  ringSize: 18.1,
  bandWidth: 7,
  style: "simple",
  finish: "polished",
  name: "My Ring",
  groovedWidthMm: 1,
  groovedDepthMm: 0.5,
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
  woodSleeveWoodType: "walnut",
  woodInlayWoodType: "walnut",
  woodInlayWidthMm: 5,
  woodInlayChamfer: true,
  outerEdgeChamferMm: 0.6,
}

const DEFAULT_HERO_ROTATION: [number, number, number] = [-0.38, -0.58, -0.18]
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
  { id: "normal", en: "Normal", de: "Normal", colour: "#e8e3d8", roughness: 0.16, metalness: 1, envMapIntensity: 2.2, clearcoat: 1, sheen: 0.06 },
  { id: "matte", en: "Matte", de: "Matt", colour: "#cfd1d2", roughness: 0.58, metalness: 0.72, envMapIntensity: 0.92, clearcoat: 0.32, sheen: 0.05 },
  { id: "polished", en: "Polished", de: "Poliert", colour: "#fffaf0", roughness: 0.07, metalness: 1, envMapIntensity: 2.8, clearcoat: 1, sheen: 0 },
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

function validateStyleSettings(config: AppConfig): AppConfig {
  const next = { ...config }
  const circumferenceMm = getCircumferenceMm(next.ringSize)

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

  const maxInlayWidthMm = next.bandWidth - WOOD_INLAY_EDGE_MM * 2
  if (maxInlayWidthMm >= 2) {
    next.woodInlayWidthMm = clamp(next.woodInlayWidthMm, 2, maxInlayWidthMm)
  } else {
    next.woodInlayWidthMm = Math.max(0.6, next.bandWidth * 0.45)
  }

  next.outerEdgeChamferMm = next.outerEdgeChamferMm >= 0.45 ? 0.6 : next.outerEdgeChamferMm >= 0.15 ? 0.3 : 0

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
  const woodInlayWidthMm =
    typeof data.woodInlayWidthMm === "number"
      ? data.woodInlayWidthMm
      : data.woodInlayWidth === "narrow"
      ? 2
      : data.woodInlayWidth === "wide"
      ? 4
      : data.woodInlayWidth === "medium"
      ? 3
      : DEFAULT_CONFIG.woodInlayWidthMm
  const woodInlayChamfer = typeof data.woodInlayChamfer === "boolean" ? data.woodInlayChamfer : true

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
    woodInlayWidthMm,
    woodInlayChamfer,
    outerEdgeChamferMm: DEFAULT_CONFIG.outerEdgeChamferMm,
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
  const outerChamfer = styleSettings ? clamp(mmToScene(styleSettings.outerEdgeChamferMm), 0, Math.min(wallThickness * 0.5, bandHalfWidth * 0.45)) : bevel * 0.7

  if (style === "flat" || style === "woodSleeve" || style === "woodInlay") {
    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(innerRadius + bevel * 0.3, -bandHalfWidth),
      new THREE.Vector2(outerRadius - outerChamfer * 1.2, -bandHalfWidth),
      new THREE.Vector2(outerRadius - outerChamfer * 0.28, -bandHalfWidth + outerChamfer * 0.22),
      new THREE.Vector2(outerRadius, -bandHalfWidth + outerChamfer),
      new THREE.Vector2(outerRadius, bandHalfWidth - outerChamfer),
      new THREE.Vector2(outerRadius - outerChamfer * 0.28, bandHalfWidth - outerChamfer * 0.22),
      new THREE.Vector2(outerRadius - outerChamfer * 1.2, bandHalfWidth),
      new THREE.Vector2(innerRadius + bevel * 0.3, bandHalfWidth),
      new THREE.Vector2(innerRadius, bandHalfWidth - bevel),
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel)
    )
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
    const grooveShoulderMm = Math.min(0.12, styleSettings.groovedWidthMm * 0.2)
    const grooveShoulderScene = Math.max(0.0008, grooveShoulderMm * bandSceneScale)

    const outerContour: THREE.Vector2[] = [new THREE.Vector2(outerRadius, -bandHalfWidth + outerChamfer)]
    let cursorY = -bandHalfWidth + outerChamfer

    for (const interval of grooveLayout.intervals) {
      const grooveStartY = clamp(toBandSceneY(interval.startMm), cursorY, bandHalfWidth - outerChamfer)
      const grooveEndY = clamp(toBandSceneY(interval.endMm), grooveStartY, bandHalfWidth - outerChamfer)
      const grooveLeadInEndY = Math.min(grooveEndY, grooveStartY + grooveShoulderScene)
      const grooveLeadOutStartY = Math.max(grooveLeadInEndY, grooveEndY - grooveShoulderScene)

      if (grooveStartY > cursorY) {
        outerContour.push(new THREE.Vector2(outerRadius, grooveStartY))
      }

      outerContour.push(new THREE.Vector2(outerRadius - grooveDepthScene, grooveLeadInEndY))

      if (grooveLeadOutStartY > grooveLeadInEndY) {
        outerContour.push(new THREE.Vector2(outerRadius - grooveDepthScene, grooveLeadOutStartY))
      }

      outerContour.push(new THREE.Vector2(outerRadius, grooveEndY))
      cursorY = grooveEndY
    }

    if (cursorY < bandHalfWidth - outerChamfer) {
      outerContour.push(new THREE.Vector2(outerRadius, bandHalfWidth - outerChamfer))
    }

    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(innerRadius + bevel * 0.3, -bandHalfWidth),
      new THREE.Vector2(outerRadius - outerChamfer * 1.2, -bandHalfWidth),
      new THREE.Vector2(outerRadius - outerChamfer * 0.28, -bandHalfWidth + outerChamfer * 0.22),
      ...outerContour,
      new THREE.Vector2(outerRadius - outerChamfer * 0.28, bandHalfWidth - outerChamfer * 0.22),
      new THREE.Vector2(outerRadius - outerChamfer * 1.2, bandHalfWidth),
      new THREE.Vector2(innerRadius + bevel * 0.3, bandHalfWidth),
      new THREE.Vector2(innerRadius, bandHalfWidth - bevel),
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel)
    )
  } else if (style === "simple" || style === "open" || style === "diagonal") {
    const shoulder = wallThickness * 0.04
    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel),
      new THREE.Vector2(innerRadius + bevel * 0.32, -bandHalfWidth),
      new THREE.Vector2(outerRadius - outerChamfer * 1.35 - shoulder, -bandHalfWidth),
      new THREE.Vector2(outerRadius - outerChamfer * 0.24, -bandHalfWidth + outerChamfer * 0.28),
      new THREE.Vector2(outerRadius, -bandHalfWidth + outerChamfer * 0.92),
      new THREE.Vector2(outerRadius, bandHalfWidth - outerChamfer * 0.92),
      new THREE.Vector2(outerRadius - outerChamfer * 0.24, bandHalfWidth - outerChamfer * 0.28),
      new THREE.Vector2(outerRadius - outerChamfer * 1.35 - shoulder, bandHalfWidth),
      new THREE.Vector2(innerRadius + bevel * 0.32, bandHalfWidth),
      new THREE.Vector2(innerRadius, bandHalfWidth - bevel),
      new THREE.Vector2(innerRadius, -bandHalfWidth + bevel)
    )
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
  const segments = reducedDetail ? 192 : 384
  const geometry = new THREE.LatheGeometry(profile, segments)

  geometry.computeVertexNormals()
  return geometry
}

function createArcSectionGeometry(
  profile: THREE.Vector2[],
  style: "open",
  _innerRadius: number,
  _outerRadius: number,
  _bandHalfWidth: number,
  styleSettings: StyleSettings,
  reducedDetail = false
) {
  const outline = profile[profile.length - 1].equals(profile[0]) ? profile.slice(0, -1) : profile
  const arcSegments = reducedDetail ? 112 : 192
  const gapAngleRad = (style === "open" ? styleSettings.openOpeningMm : styleSettings.diagonalOpeningMm) / getCentreRadiusMm(styleSettings.ringSize)
  const baseStartAngle = Math.PI + gapAngleRad / 2
  const baseEndAngle = baseStartAngle + (Math.PI * 2 - gapAngleRad)
  const cols = arcSegments + 1
  const bodyVertexCount = outline.length * cols
  const positions: number[] = []
  const indices: number[] = []
  const buildBoundaryLoop = (angle: number, tangentDirection: 1 | -1) => {
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))

    return outline.map((point) => {
      void tangentDirection
      return new THREE.Vector3(radial.x * point.x, point.y, radial.z * point.x)
    })
  }

  const startLoop = buildBoundaryLoop(baseStartAngle, 1)
  const endLoop = buildBoundaryLoop(baseEndAngle, -1)

  for (let profileIndex = 0; profileIndex < outline.length; profileIndex += 1) {
    const point = outline[profileIndex]

    for (let segmentIndex = 0; segmentIndex <= arcSegments; segmentIndex += 1) {
      if (segmentIndex === 0) {
        const loopPoint = startLoop[profileIndex]
        positions.push(loopPoint.x, loopPoint.y, loopPoint.z)
        continue
      }

      if (segmentIndex === arcSegments) {
        const loopPoint = endLoop[profileIndex]
        positions.push(loopPoint.x, loopPoint.y, loopPoint.z)
        continue
      }

      const t = segmentIndex / arcSegments
      const angle = THREE.MathUtils.lerp(baseStartAngle, baseEndAngle, t)
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
  innerRadius: number,
  outerRadius: number,
  bandHalfWidth: number,
  styleSettings: StyleSettings,
  reducedDetail = false
) {
  const outline = profile[profile.length - 1].equals(profile[0]) ? profile.slice(0, -1) : profile
  const arcSegments = reducedDetail ? 80 : 128
  const gapAngleRad = styleSettings.diagonalOpeningMm / getCentreRadiusMm(styleSettings.ringSize)
  const startAngle = Math.PI + gapAngleRad / 2
  const endAngle = startAngle + (Math.PI * 2 - gapAngleRad)
  const diagonalDirectionSign = styleSettings.diagonalDirection === "leftRising" ? -1 : 1
  const tiltRadians = THREE.MathUtils.degToRad(getDiagonalCutAngleDegrees(styleSettings.diagonalCutAngle)) * diagonalDirectionSign
  const cols = arcSegments + 1
  const positions: number[] = []
  const indices: number[] = []

  for (let profileIndex = 0; profileIndex < outline.length; profileIndex += 1) {
    const point = outline[profileIndex]

    for (let segmentIndex = 0; segmentIndex <= arcSegments; segmentIndex += 1) {
      const t = segmentIndex / arcSegments
      const angle = THREE.MathUtils.lerp(startAngle, endAngle, t)
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

  const bodyGeometry = new THREE.BufferGeometry()
  bodyGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  bodyGeometry.setIndex(indices)
  bodyGeometry.computeVertexNormals()
  bodyGeometry.computeBoundingBox()
  bodyGeometry.computeBoundingSphere()

  const createEndFaceGeometry = (angle: number, tangentDirection: 1 | -1) => {
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
    const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle))
    const normal = tangent.clone().multiplyScalar(tangentDirection)
    const centerRadius = (innerRadius + outerRadius) / 2
    const capWidth = outerRadius - innerRadius + 0.004
    const capHeight = bandHalfWidth * 2 + 0.004
    const capGeometry = new THREE.PlaneGeometry(capWidth, capHeight, 1, 1)
    const localTilt = new THREE.Matrix4().makeRotationX(tiltRadians * tangentDirection)
    const basis = new THREE.Matrix4().makeBasis(radial, new THREE.Vector3(0, 1, 0), normal)
    const position = radial.clone().multiplyScalar(centerRadius).add(normal.clone().multiplyScalar(0.0018))

    capGeometry.applyMatrix4(localTilt)
    capGeometry.applyMatrix4(basis)
    capGeometry.translate(position.x, position.y, position.z)
    capGeometry.computeVertexNormals()
    capGeometry.computeBoundingBox()
    capGeometry.computeBoundingSphere()
    return capGeometry
  }

  return {
    bodyGeometry,
    capGeometries: [createEndFaceGeometry(startAngle, -1), createEndFaceGeometry(endAngle, 1)],
  }
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

function createChamferedStripGeometry(
  outerRadius: number,
  yMin: number,
  yMax: number,
  thickness: number,
  chamferMm: number,
  style: StyleId,
  styleSettings: StyleSettings,
  reducedDetail = false
) {
  const chamfer = clamp(mmToScene(chamferMm), 0, Math.min(thickness * 0.45, Math.abs(yMax - yMin) * 0.2))
  const profile = [
    new THREE.Vector2(outerRadius - thickness, yMin + chamfer),
    new THREE.Vector2(outerRadius - thickness + chamfer * 0.4, yMin),
    new THREE.Vector2(outerRadius + thickness - chamfer * 0.28, yMin),
    new THREE.Vector2(outerRadius + thickness, yMin + chamfer),
    new THREE.Vector2(outerRadius + thickness, yMax - chamfer),
    new THREE.Vector2(outerRadius + thickness - chamfer * 0.28, yMax),
    new THREE.Vector2(outerRadius - thickness + chamfer * 0.4, yMax),
    new THREE.Vector2(outerRadius - thickness, yMax - chamfer),
    new THREE.Vector2(outerRadius - thickness, yMin + chamfer),
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

function createBrushedTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 768
  canvas.height = 48
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const base = ctx.createLinearGradient(0, 0, canvas.width, 0)
  base.addColorStop(0, "#e3e5e7")
  base.addColorStop(0.5, "#b7bbbe")
  base.addColorStop(1, "#dfe2e4")
  ctx.fillStyle = base
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let index = 0; index < canvas.width; index += 1) {
    const shade = 200 + ((index * 17) % 23) - 11
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.09)`
    ctx.fillRect(index, 0, 1, canvas.height)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(14, 1)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function createSubtleMetalRoughnessTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const imageData = ctx.createImageData(canvas.width, canvas.height)

  for (let index = 0; index < imageData.data.length; index += 4) {
    const value = 205 + Math.floor(Math.random() * 18)
    imageData.data[index] = value
    imageData.data[index + 1] = value
    imageData.data[index + 2] = value
    imageData.data[index + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 1)
  texture.colorSpace = THREE.NoColorSpace
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
  const brushedTexture = useMemo(() => (finish === "brushed" && !technicalView ? createBrushedTexture() : null), [finish, technicalView])
  const subtleMetalRoughnessTexture = useMemo(
    () => (!technicalView && (finish === "polished" || finish === "normal") ? createSubtleMetalRoughnessTexture() : null),
    [finish, technicalView]
  )

  const { geometry, capGeometries, woodInlayGeometry, woodSleeveGeometry } = useMemo(() => {
    const innerRadius = size / 20
    const bandHalfWidth = mmToScene(width)
    const wallThickness = mmToScene(WALL_THICKNESS_MM)

    const outerRadius = innerRadius + wallThickness
    const baseProfileStyle = style === "faceted" || style === "open" || style === "diagonal" ? "simple" : style
    const profile = buildProfile(baseProfileStyle, innerRadius, outerRadius, bandHalfWidth, wallThickness, styleSettings)
    const baseGeometry = createLatheGeometry(profile, baseProfileStyle, styleSettings, bandHalfWidth, reducedDetail)
    let geometry: THREE.BufferGeometry = baseGeometry
    let capGeometries: THREE.BufferGeometry[] = []

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
      const diagonalGeometry = createDiagonalArcGeometry(profile, innerRadius, outerRadius, bandHalfWidth, styleSettings, reducedDetail)
      geometry = diagonalGeometry.bodyGeometry
      capGeometries = diagonalGeometry.capGeometries
    }

    const woodInlayHalfWidth = mmToScene(styleSettings.woodInlayWidthMm) / 2
    const woodInlayInset = mmToScene(0.32)

    const woodInlayGeometry =
      style === "woodInlay"
        ? (styleSettings.woodInlayChamfer
            ? createChamferedStripGeometry(
                outerRadius + woodInlayInset,
                -woodInlayHalfWidth,
                woodInlayHalfWidth,
                mmToScene(0.26),
                0.18,
                style,
                styleSettings,
                reducedDetail
              )
            : createOuterStripGeometry(
                outerRadius + woodInlayInset,
                -woodInlayHalfWidth,
                woodInlayHalfWidth,
                mmToScene(0.26),
                style,
                styleSettings,
                reducedDetail
              ))
        : null

    const sleeveThickness = mmToScene(WOOD_SLEEVE_THICKNESS_MM)
    const metalLip = mmToScene(METAL_LIP_MM)
    const woodSleeveGeometry =
      style === "woodSleeve"
        ? createOuterStripGeometry(
            outerRadius + sleeveThickness * 0.45,
            -bandHalfWidth + metalLip,
            bandHalfWidth - metalLip,
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
      capGeometries,
      woodInlayGeometry,
      woodSleeveGeometry,
    }
  }, [size, width, style, styleSettings, reducedDetail])

  useEffect(() => {
    return () => {
      geometry.dispose()
      capGeometries.forEach((item) => item.dispose())
      woodInlayGeometry?.dispose()
      woodSleeveGeometry?.dispose()
      brushedTexture?.dispose()
      subtleMetalRoughnessTexture?.dispose()
    }
  }, [geometry, capGeometries, woodInlayGeometry, woodSleeveGeometry, brushedTexture, subtleMetalRoughnessTexture])

  const isBrushed = finish === "brushed"
  const isFacetedCrisp = style === "faceted" && styleSettings.facetedEdgeMode === "hard"

  const mainColour = technicalView ? "#d8d8d8" : selectedFinish.colour
  const mainMetalness = selectedFinish.metalness ?? 0.88
  const mainRoughness = technicalView
    ? 0.32
    : finish === "polished"
      ? 0.12
      : finish === "brushed"
        ? 0.28
        : style === "hammered"
          ? Math.max(selectedFinish.roughness, 0.46)
          : finish === "normal"
            ? 0.18
            : selectedFinish.roughness
  const mainEnv = technicalView
    ? 1.7
    : finish === "polished"
      ? 2.15
      : finish === "brushed"
        ? 1.35
        : selectedFinish.envMapIntensity ?? 1.1
  const clearcoat = technicalView ? 0.38 : finish === "polished" ? 0.85 : selectedFinish.clearcoat ?? 0.58
  const clearcoatRoughness = technicalView ? 0.12 : finish === "polished" ? 0.08 : isBrushed ? 0.24 : 0.14

  return (
    <group rotation={previewRotation}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={mainColour}
          metalness={mainMetalness}
          roughness={mainRoughness}
          roughnessMap={subtleMetalRoughnessTexture}
          envMapIntensity={mainEnv}
          clearcoat={clearcoat}
          clearcoatRoughness={clearcoatRoughness}
          anisotropy={isBrushed ? selectedFinish.anisotropy ?? 0 : 0}
          anisotropyRotation={Math.PI / 2}
          sheen={selectedFinish.sheen ?? 0}
          sheenRoughness={0.46}
          flatShading={isFacetedCrisp}
          map={finish === "brushed" && !technicalView ? brushedTexture : null}
        />
      </mesh>

      {style === "diagonal" &&
        capGeometries.map((item, index) => (
          <mesh key={`diagonal-cap-${index}`} geometry={item} castShadow receiveShadow>
            <meshPhysicalMaterial
              color={mainColour}
              metalness={mainMetalness}
              roughness={mainRoughness}
              roughnessMap={subtleMetalRoughnessTexture}
              envMapIntensity={mainEnv}
              clearcoat={clearcoat}
              clearcoatRoughness={clearcoatRoughness}
              anisotropy={isBrushed ? selectedFinish.anisotropy ?? 0 : 0}
              anisotropyRotation={Math.PI / 2}
              sheen={selectedFinish.sheen ?? 0}
              sheenRoughness={0.46}
              map={finish === "brushed" && !technicalView ? brushedTexture : null}
            />
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
}: {
  ringSize: number
  bandWidth: number
  style: StyleId
  finish: FinishId
  heroRotation: [number, number, number]
  styleSettings: StyleSettings
  reducedDetail: boolean
  autoRotate: boolean
}) {
  const placementGroupRef = useRef<THREE.Group>(null)
  const measuredGroupRef = useRef<THREE.Group>(null)
  const spinGroupRef = useRef<THREE.Group>(null)

  const [groundOffset, setGroundOffset] = useState(0)

  const scale = reducedDetail ? 0.58 : 0.62

  useFrame((_, delta) => {
    if (!spinGroupRef.current || !autoRotate) return
    spinGroupRef.current.rotation.y += delta * 0.22
  })

  useEffect(() => {
    const placementGroup = placementGroupRef.current
    const measuredGroup = measuredGroupRef.current
    const spinGroup = spinGroupRef.current

    if (!placementGroup || !measuredGroup) return

    const prevY = placementGroup.position.y
    const prevSpin = spinGroup?.rotation.y ?? 0

    placementGroup.position.y = 0
    if (spinGroup) spinGroup.rotation.y = 0

    placementGroup.updateWorldMatrix(true, true)
    measuredGroup.updateWorldMatrix(true, true)

    const box = new THREE.Box3().setFromObject(measuredGroup)

    placementGroup.position.y = prevY
    if (spinGroup) spinGroup.rotation.y = prevSpin

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
      <group ref={measuredGroupRef} rotation={heroRotation} scale={scale}>
        <group ref={spinGroupRef}>
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
}) {
  const heroBackground = theme === "dark" ? "#16110d" : "#f4ece1"
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
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HERO_FLOOR_Y, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <MeshReflectorMaterial
          blur={reducedDetail ? [420, 140] : [360, 110]}
          resolution={reducedDetail ? 1024 : 2048}
          mirror={theme === "dark" ? 0.34 : 0.42}
          mixBlur={theme === "dark" ? 1.15 : 1.35}
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
  const [woodInlayWidthMm, setWoodInlayWidthMm] = useState(initialConfig.woodInlayWidthMm)
  const [woodInlayChamfer, setWoodInlayChamfer] = useState(initialConfig.woodInlayChamfer)
  const [outerEdgeChamferMm, setOuterEdgeChamferMm] = useState(initialConfig.outerEdgeChamferMm)
  const [statusMessage, setStatusMessage] = useState("")
  const [submitState, setSubmitState] = useState<SubmitState>("idle")
  const [autoRotate, setAutoRotate] = useState(true)
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
    inlayHelper: language === "en" ? "Metal edge: fixed 1.0 mm each side." : "Metallrand: fest 1,0 mm pro Seite.",
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
  const isLandscapeMobile =
    typeof window !== "undefined" &&
    isMobileLayout &&
    window.matchMedia("(orientation: landscape)").matches
  const reducedDetail = isTabletLayout || isMobileLayout
  const heroCamera = layoutMode === "ultraWide"
    ? { position: [0, 0.03, 5.5] as [number, number, number], fov: 19 }
    : { position: [0, 0.03, 5.5] as [number, number, number], fov: 20 }

  const heroTarget: [number, number, number] = [0, -1, 0]
  const heroDpr: [number, number] = reducedDetail ? [1, 1.25] : [1, 1.75]

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
      woodInlayWidthMm,
      woodInlayChamfer,
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
      validated.woodInlayWidthMm !== woodInlayWidthMm ||
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
      if (validated.woodInlayWidthMm !== woodInlayWidthMm) setWoodInlayWidthMm(validated.woodInlayWidthMm)
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
    woodInlayWidthMm,
    woodInlayChamfer,
    outerEdgeChamferMm,
  ])

  const styleSettings = useMemo<StyleSettings>(
    () => ({
      ringSize,
      bandWidth,
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
      woodInlayWidthMm,
      woodInlayChamfer,
      outerEdgeChamferMm,
    }),
    [
      ringSize,
      bandWidth,
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
      woodInlayWidthMm,
      woodInlayChamfer,
      outerEdgeChamferMm,
    ]
  )

  const maxGrooveCount = getMaxGrooveCount(bandWidth, groovedWidthMm, groovedEdgeSpaceMm)
  const facetedArcLengthMm = circumference / facetedCount
  const diagonalCutAngleDegrees = getDiagonalCutAngleDegrees(diagonalCutAngle)
  const woodInlayMaxWidthMm = Math.max(2, bandWidth - WOOD_INLAY_EDGE_MM * 2)

  function getWoodTypeLabel(woodType: WoodType) {
    if (woodType === "oak") return language === "en" ? "Oak" : "Eiche"
    if (woodType === "ebony") return language === "en" ? "Ebony" : "Ebenholz"
    if (woodType === "maple") return language === "en" ? "Maple" : "Ahorn"
    return language === "en" ? "Walnut" : "Walnuss"
  }

  const activeStyleValues = (() => {
    switch (style) {
      case "grooved":
        return { groovedWidthMm, groovedDepthMm, groovedCount, groovedEdgeSpaceMm, outerEdgeChamferMm }
      case "faceted":
        return { facetedCount, facetedArcLengthMm: Number(facetedArcLengthMm.toFixed(1)), facetedEdgeMode, outerEdgeChamferMm }
      case "open":
        return { openOpeningMm, openGapEndRoundingMm, outerEdgeChamferMm }
      case "diagonal":
        return { diagonalOpeningMm, diagonalDirection, diagonalEdgeFinish, diagonalCutAngleDegrees, outerEdgeChamferMm }
      case "woodSleeve":
        return { woodSleeveWoodType, woodSleeveThicknessMm: WOOD_SLEEVE_THICKNESS_MM, outerEdgeChamferMm }
      case "woodInlay":
        return { woodInlayWoodType, woodInlayWidthMm, woodInlayMetalEdgeMm: WOOD_INLAY_EDGE_MM, woodInlayChamfer, outerEdgeChamferMm }
      default:
        return { outerEdgeChamferMm }
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
          `${formatValue(language, woodInlayWidthMm)} mm ${language === "en" ? "inlay width" : "Einlagenbreite"}`,
          `${formatValue(language, WOOD_INLAY_EDGE_MM)} mm ${language === "en" ? "metal edge" : "Metallrand"}`,
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

  function resetConfig() {
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
    setWoodInlayWidthMm(DEFAULT_CONFIG.woodInlayWidthMm)
    setWoodInlayChamfer(DEFAULT_CONFIG.woodInlayChamfer)
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
        className="topbar-toggle language-toggle"
        onClick={() => setLanguage(language === "en" ? "de" : "en")}
        aria-label={language === "en" ? "Switch language to German" : "Sprache auf Englisch wechseln"}
      >
        {language === "en" ? "DE" : "EN"}
      </button>

      <ControlsPanel>
        <div className="sidebar-header">
          <p className="eyebrow">{language === "en" ? "Custom stainless steel ring" : "Individueller Edelstahlring"}</p>
          <h1>{t.title}</h1>
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
              <input id={widthRangeId} className="range-input" type="range" min="1" max="10" step="0.1" value={bandWidth} onChange={(event) => setBandWidth(Number(event.target.value))} />
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

        {(style === "simple" || style === "grooved" || style === "faceted" || style === "hammered" || style === "open" || style === "diagonal" || style === "woodSleeve" || style === "woodInlay") && (
          <PanelSection title={t.styleOptionsSection}>
            <div className="option-group">
              {(style === "simple" || style === "grooved" || style === "faceted" || style === "open" || style === "diagonal" || style === "woodSleeve" || style === "woodInlay") && (
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
                  <Field label={`${t.inlayWidth}: ${formatValue(language, woodInlayWidthMm)} mm`} htmlFor={`${styleOptionsGroupId}-wood-inlay-width`}>
                    <input
                      id={`${styleOptionsGroupId}-wood-inlay-width`}
                      className="range-input"
                      type="range"
                      min="2"
                      max={woodInlayMaxWidthMm}
                      step="0.1"
                      value={Math.min(woodInlayWidthMm, woodInlayMaxWidthMm)}
                      onChange={(event) => setWoodInlayWidthMm(Number(event.target.value))}
                    />
                  </Field>
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
                frameloop="always"
                gl={{
                  antialias: true,
                  alpha: false,
                  powerPreference: "high-performance",
                }}
                onCreated={({ gl }) => {
                  gl.toneMapping = THREE.ACESFilmicToneMapping
                  gl.toneMappingExposure = theme === "dark" ? 1.1 : 1.16
                  gl.outputColorSpace = THREE.SRGBColorSpace
                }}
              >
                <StudioScene ringSize={ringSize} bandWidth={bandWidth} style={style} finish={finish} heroRotation={heroRotation} styleSettings={styleSettings} theme={theme} reducedDetail={reducedDetail} autoRotate={autoRotate} />
                <OrbitControls
                  key="orbit-controls"
                  enableDamping
                  dampingFactor={0.06}
                  enablePan={false}
                  autoRotate={false}
                  onStart={() => setAutoRotate(false)}
                  target={heroTarget}
                  minDistance={isMobileLayout ? 4.6 : 5.0}
                  maxDistance={isMobileLayout ? 7.2 : 8.0}
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
        </HeroSection>

        <TechnicalViews label={t.technicalTitle}>
          <div className="technical-header">
            <p className="technical-eyebrow">{t.technicalTitle}</p>
            <p className="technical-copy">{t.technicalCopy}</p>
          </div>

          <section className="ortho-grid">
            <OrthoView title={t.topView} kind="top" cameraPosition={[0, 3, 0]} cameraUp={[0, 0, -1]} ringSize={ringSize} bandWidth={bandWidth} style={style} finish={finish} language={language} styleSettings={styleSettings} theme={theme} reducedDetail={reducedDetail} />
            <OrthoView title={t.frontView} kind="front" cameraPosition={[0, 0, 3]} cameraUp={[0, 1, 0]} ringSize={ringSize} bandWidth={bandWidth} style={style} finish={finish} language={language} styleSettings={styleSettings} theme={theme} reducedDetail={reducedDetail} className="ortho-card-front" />
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
