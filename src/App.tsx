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
  groovedOuterCrestMm: number
  facetedCount: number
  facetedEdgeMode: FacetedEdgeMode
  openOpeningMm: number
  openRoundedEdgeRadiusMm: number
  diagonalOpeningMm: number
  diagonalDirection: DiagonalDirection
  diagonalEdgeFinish: DiagonalEdgeTreatment
  diagonalCutAngle: DiagonalCutAngle
  woodSleeveWoodType: WoodType
  woodInlayWoodType: WoodType
  woodInlayWidthMm: number
  woodInlayChamfer: boolean
}

type StyleSettings = {
  ringSize: number
  bandWidth: number
  groovedWidthMm: number
  groovedDepthMm: number
  groovedCount: number
  groovedOuterCrestMm: number
  facetedCount: number
  facetedEdgeMode: FacetedEdgeMode
  openOpeningMm: number
  openRoundedEdgeRadiusMm: number
  diagonalOpeningMm: number
  diagonalDirection: DiagonalDirection
  diagonalEdgeFinish: DiagonalEdgeTreatment
  diagonalCutAngle: DiagonalCutAngle
  woodSleeveWoodType: WoodType
  woodInlayWoodType: WoodType
  woodInlayWidthMm: number
  woodInlayChamfer: boolean
}

type SubmitState = "idle" | "sending" | "success" | "error"
type ThemeMode = "light" | "dark"
type ConfirmAction = "submit" | "reset" | null

const STORAGE_KEY = "ring-config"
const ACCESS_KEY = "ring-config-access"
const ACCESS_CODE = "4827"
const THEME_KEY = "ring-config-theme"
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mzdywkpb"
const MM_TO_SCENE = 0.045
const WALL_THICKNESS_MM = 4.4
const WOOD_SLEEVE_THICKNESS_MM = 0.5
const WOOD_INLAY_EDGE_MM = 1.0
const METAL_LIP_MM = 0.5
const SOFTENED_DIAGONAL_BEVEL_MM = 0.4
const FACET_MIN_ARC_MM = 2.2

const DEFAULT_CONFIG: AppConfig = {
  language: "en",
  ringSize: 18.1,
  bandWidth: 6,
  style: "simple",
  finish: "normal",
  name: "My Ring",
  groovedWidthMm: 0.8,
  groovedDepthMm: 0.3,
  groovedCount: 3,
  groovedOuterCrestMm: 1,
  facetedCount: 14,
  facetedEdgeMode: "hard",
  openOpeningMm: 5,
  openRoundedEdgeRadiusMm: 0.8,
  diagonalOpeningMm: 5,
  diagonalDirection: "rightRising",
  diagonalEdgeFinish: "softened",
  diagonalCutAngle: "standard",
  woodSleeveWoodType: "walnut",
  woodInlayWoodType: "walnut",
  woodInlayWidthMm: 3,
  woodInlayChamfer: true,
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

function getCircumferenceMm(diameterMm: number) {
  return Math.PI * diameterMm
}

function getCentreRadiusMm(diameterMm: number) {
  return diameterMm / 2 + WALL_THICKNESS_MM / 2
}

function getMiddleCrestMm(grooveWidthMm: number) {
  return clamp(grooveWidthMm * 0.75, 0.4, 1.2)
}

function getMaxGrooveCount(bandWidthMm: number, grooveWidthMm: number, outerCrestMm: number) {
  const safeOuterCrestMm = Math.max(outerCrestMm, grooveWidthMm * 0.8)
  const availableWidthMm = Math.max(0, bandWidthMm - 2 * safeOuterCrestMm)
  const middleCrestMm = getMiddleCrestMm(grooveWidthMm)
  let maxCount = 0

  for (let count = 1; count <= 12; count += 1) {
    const totalWidthNeededMm = count * grooveWidthMm + (count - 1) * middleCrestMm
    if (totalWidthNeededMm <= availableWidthMm + 1e-6) {
      maxCount = count
    }
  }

  return Math.max(1, maxCount)
}

function getGrooveLayoutMm(bandWidthMm: number, grooveWidthMm: number, grooveCount: number, outerCrestMm: number) {
  const middleCrestMm = getMiddleCrestMm(grooveWidthMm)
  const totalWidthNeededMm = grooveCount * grooveWidthMm + (grooveCount - 1) * middleCrestMm
  const layoutStartMm = -totalWidthNeededMm / 2
  const centers: number[] = []

  for (let index = 0; index < grooveCount; index += 1) {
    const grooveStartMm = layoutStartMm + index * (grooveWidthMm + middleCrestMm)
    centers.push(grooveStartMm + grooveWidthMm / 2)
  }

  return {
    centers,
    middleCrestMm,
    totalWidthNeededMm,
    availableWidthMm: Math.max(0, bandWidthMm - 2 * outerCrestMm),
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
  next.groovedOuterCrestMm = clamp(next.groovedOuterCrestMm, 0.4, 5.0)
  next.groovedOuterCrestMm = Math.max(next.groovedOuterCrestMm, next.groovedWidthMm * 0.8)
  const maxGrooveCount = getMaxGrooveCount(next.bandWidth, next.groovedWidthMm, next.groovedOuterCrestMm)
  next.groovedCount = clamp(Math.round(next.groovedCount), 1, maxGrooveCount)
  if (next.groovedCount > 1) {
    const availableOuterMm = Math.max(0.4, (next.bandWidth - (next.groovedCount * next.groovedWidthMm + (next.groovedCount - 1) * getMiddleCrestMm(next.groovedWidthMm))) / 2)
    next.groovedOuterCrestMm = clamp(next.groovedOuterCrestMm, Math.min(5, availableOuterMm), 5)
  }

  next.facetedCount = clamp(Math.round(next.facetedCount), 10, 20)
  const maxFacetCountByArc = Math.max(10, Math.floor(circumferenceMm / FACET_MIN_ARC_MM))
  next.facetedCount = Math.min(next.facetedCount, maxFacetCountByArc)

  next.openOpeningMm = clamp(next.openOpeningMm, 3, Math.min(8, circumferenceMm * 0.25))
  next.openRoundedEdgeRadiusMm = clamp(next.openRoundedEdgeRadiusMm, 0, 1.5)

  const diagonalAngleDegrees = getDiagonalCutAngleDegrees(next.diagonalCutAngle)
  const requiredGapMm = Math.tan((diagonalAngleDegrees * Math.PI) / 180) * next.bandWidth * 0.5
  next.diagonalOpeningMm = clamp(next.diagonalOpeningMm, Math.max(3, requiredGapMm), Math.min(8, circumferenceMm * 0.25))

  const maxInlayWidthMm = next.bandWidth - WOOD_INLAY_EDGE_MM * 2
  if (maxInlayWidthMm >= 2) {
    next.woodInlayWidthMm = clamp(next.woodInlayWidthMm, 2, maxInlayWidthMm)
  } else {
    next.woodInlayWidthMm = Math.max(0.6, next.bandWidth * 0.45)
  }

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
  const ringSize = typeof data.ringSize === "number" ? data.ringSize : DEFAULT_CONFIG.ringSize
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
  const groovedOuterCrestMm = typeof data.groovedOuterCrestMm === "number" ? data.groovedOuterCrestMm : DEFAULT_CONFIG.groovedOuterCrestMm
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
  const openRoundedEdgeRadiusMm =
    typeof data.openRoundedEdgeRadiusMm === "number"
      ? data.openRoundedEdgeRadiusMm
      : data.openEdgeTreatment === "razor"
      ? 0
      : data.openEdgeTreatment === "rounded"
      ? 1
      : data.openEdgeTreatment === "softened"
      ? 0.4
      : DEFAULT_CONFIG.openRoundedEdgeRadiusMm
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
    groovedOuterCrestMm,
    facetedCount,
    facetedEdgeMode,
    openOpeningMm,
    openRoundedEdgeRadiusMm,
    diagonalOpeningMm,
    diagonalDirection,
    diagonalEdgeFinish,
    diagonalCutAngle,
    woodSleeveWoodType,
    woodInlayWoodType,
    woodInlayWidthMm,
    woodInlayChamfer,
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
  } else if (style === "simple") {
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
  } else if (style === "diagonal") {
    const diagonalBevel = styleSettings?.diagonalEdgeFinish === "softened" ? clamp(mmToScene(SOFTENED_DIAGONAL_BEVEL_MM), 0.012, Math.min(wallThickness * 0.34, bandHalfWidth * 0.38)) : Math.min(0.012, bevel * 0.45)
    const shoulder = wallThickness * 0.035
    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + diagonalBevel),
      new THREE.Vector2(innerRadius + diagonalBevel * 0.32, -bandHalfWidth),
      new THREE.Vector2(outerRadius - diagonalBevel * 1.2 - shoulder, -bandHalfWidth),
      new THREE.Vector2(outerRadius - diagonalBevel * 0.26, -bandHalfWidth + diagonalBevel * 0.24),
      new THREE.Vector2(outerRadius, -bandHalfWidth + diagonalBevel * 0.88),
      new THREE.Vector2(outerRadius, bandHalfWidth - diagonalBevel * 0.88),
      new THREE.Vector2(outerRadius - diagonalBevel * 0.26, bandHalfWidth - diagonalBevel * 0.24),
      new THREE.Vector2(outerRadius - diagonalBevel * 1.2 - shoulder, bandHalfWidth),
      new THREE.Vector2(innerRadius + diagonalBevel * 0.32, bandHalfWidth),
      new THREE.Vector2(innerRadius, bandHalfWidth - diagonalBevel),
      new THREE.Vector2(innerRadius, -bandHalfWidth + diagonalBevel)
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
  } else if (style === "open") {
    const roundedEdge = clamp(mmToScene(styleSettings?.openRoundedEdgeRadiusMm ?? DEFAULT_CONFIG.openRoundedEdgeRadiusMm), 0.003, Math.min(wallThickness * 0.38, bandHalfWidth * 0.48))
    const outerShoulder = roundedEdge * 0.22
    profile.push(
      new THREE.Vector2(innerRadius, -bandHalfWidth + roundedEdge),
      new THREE.Vector2(innerRadius + roundedEdge * 0.55, -bandHalfWidth),
      new THREE.Vector2(outerRadius - roundedEdge * 0.95 - outerShoulder, -bandHalfWidth),
      new THREE.Vector2(outerRadius - roundedEdge * 0.34, -bandHalfWidth + roundedEdge * 0.3),
      new THREE.Vector2(outerRadius, -bandHalfWidth + roundedEdge * 0.98),
      new THREE.Vector2(outerRadius + wallThickness * 0.18, 0),
      new THREE.Vector2(outerRadius, bandHalfWidth - roundedEdge * 0.98),
      new THREE.Vector2(outerRadius - roundedEdge * 0.34, bandHalfWidth - roundedEdge * 0.3),
      new THREE.Vector2(outerRadius - roundedEdge * 0.95 - outerShoulder, bandHalfWidth),
      new THREE.Vector2(innerRadius + roundedEdge * 0.55, bandHalfWidth),
      new THREE.Vector2(innerRadius, bandHalfWidth - roundedEdge),
      new THREE.Vector2(innerRadius, -bandHalfWidth + roundedEdge)
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

function createFacetedRingGeometry(
  innerRadius: number,
  outerRadius: number,
  bandHalfWidth: number,
  facetCount: number,
  edgeMode: FacetedEdgeMode
) {
  const shape = new THREE.Shape()
  const outerPoints = Array.from({ length: facetCount }, (_, index) => {
    const angle = (index / facetCount) * Math.PI * 2
    return new THREE.Vector2(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius)
  })

  shape.moveTo(outerPoints[0].x, outerPoints[0].y)
  outerPoints.slice(1).forEach((point) => shape.lineTo(point.x, point.y))
  shape.closePath()

  const innerCurve = new THREE.Path()
  innerCurve.absellipse(0, 0, innerRadius, innerRadius, 0, Math.PI * 2, true, 0)
  shape.holes.push(innerCurve)

  const bevelEnabled = edgeMode === "soft"
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: bandHalfWidth * 2,
    steps: 1,
    bevelEnabled,
    bevelSegments: bevelEnabled ? 2 : 0,
    bevelSize: bevelEnabled ? Math.min(mmToScene(0.18), bandHalfWidth * 0.12) : 0,
    bevelThickness: bevelEnabled ? Math.min(mmToScene(0.12), bandHalfWidth * 0.09) : 0,
  })

  geometry.translate(0, 0, -bandHalfWidth)
  geometry.rotateX(Math.PI / 2)
  geometry.computeVertexNormals()
  return geometry
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
  if (style === "faceted") {
    return createFacetedRingGeometry(
      styleSettings.ringSize / 20,
      styleSettings.ringSize / 20 + mmToScene(WALL_THICKNESS_MM),
      mmToScene(styleSettings.bandWidth),
      styleSettings.facetedCount,
      styleSettings.facetedEdgeMode
    )
  }

  const segments = reducedDetail
    ? style === "open" || style === "diagonal"
      ? 128
      : 192
    : style === "open" || style === "diagonal"
    ? 224
    : 384
  let phiLength = Math.PI * 2
  let phiStart = Math.PI * 1.16
  let capSlope = 0

  if (style === "open") {
    const gapAngleRad = styleSettings.openOpeningMm / getCentreRadiusMm(styleSettings.ringSize)
    phiLength = Math.PI * 2 - gapAngleRad
    phiStart = Math.PI + gapAngleRad / 2
  }

  if (style === "diagonal") {
    const gapAngleRad = styleSettings.diagonalOpeningMm / getCentreRadiusMm(styleSettings.ringSize)
    phiLength = Math.PI * 2 - gapAngleRad
    phiStart = Math.PI + gapAngleRad / 2
    capSlope = Math.tan((getDiagonalCutAngleDegrees(styleSettings.diagonalCutAngle) * Math.PI) / 180) * bandHalfWidth
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
    const bandHalfWidth = mmToScene(width)
    const wallThickness = mmToScene(WALL_THICKNESS_MM)

    const outerRadius = innerRadius + wallThickness
    const profile = buildProfile(style, innerRadius, outerRadius, bandHalfWidth, wallThickness, styleSettings)
    const baseGeometry = createLatheGeometry(profile, style, styleSettings, bandHalfWidth, reducedDetail)
    let geometry = baseGeometry

    if (style === "hammered") {
      geometry = createHammeredGeometry(
        baseGeometry,
        size < 17.5 ? "subtle" : size > 21 ? "pronounced" : "medium",
        size < 17.5 ? "fine" : size > 21 ? "medium" : "fine",
        innerRadius,
        outerRadius
      )
    }

    if (style === "faceted" && styleSettings.facetedEdgeMode === "hard") {
      geometry = baseGeometry.index ? baseGeometry.toNonIndexed() : baseGeometry.clone()
      geometry.computeVertexNormals()
    }

    const grooveLayout = getGrooveLayoutMm(
      styleSettings.bandWidth,
      styleSettings.groovedWidthMm,
      styleSettings.groovedCount,
      styleSettings.groovedOuterCrestMm
    )
    const grooveHalfWidth = mmToScene(styleSettings.groovedWidthMm) / 2
    const grooveDepthScene = mmToScene(styleSettings.groovedDepthMm)

    const grooveGeometries =
      style === "grooved"
        ? grooveLayout.centers.map((centerMm) =>
            createOuterStripGeometry(
              outerRadius - grooveDepthScene * 0.2,
              mmToScene(centerMm) - grooveHalfWidth,
              mmToScene(centerMm) + grooveHalfWidth,
              grooveDepthScene * 0.65,
              style,
              styleSettings,
              reducedDetail
            )
          )
        : []

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
  const isFacetedCrisp = style === "faceted" && styleSettings.facetedEdgeMode === "hard"

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

  const baseY = reducedDetail ? 0.01 : -0.06

  return (
    <group ref={groupRef} position={[0.02, baseY + groundOffset, 0]} rotation={heroRotation} scale={0.52}>
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
  const [groovedWidthMm, setGroovedWidthMm] = useState(initialConfig.groovedWidthMm)
  const [groovedDepthMm, setGroovedDepthMm] = useState(initialConfig.groovedDepthMm)
  const [groovedCount, setGroovedCount] = useState(initialConfig.groovedCount)
  const [groovedOuterCrestMm, setGroovedOuterCrestMm] = useState(initialConfig.groovedOuterCrestMm)
  const [facetedCount, setFacetedCount] = useState(initialConfig.facetedCount)
  const [facetedEdgeMode, setFacetedEdgeMode] = useState<FacetedEdgeMode>(initialConfig.facetedEdgeMode)
  const [openOpeningMm, setOpenOpeningMm] = useState(initialConfig.openOpeningMm)
  const [openRoundedEdgeRadiusMm, setOpenRoundedEdgeRadiusMm] = useState(initialConfig.openRoundedEdgeRadiusMm)
  const [diagonalOpeningMm, setDiagonalOpeningMm] = useState(initialConfig.diagonalOpeningMm)
  const [diagonalDirection, setDiagonalDirection] = useState<DiagonalDirection>(initialConfig.diagonalDirection)
  const [diagonalEdgeFinish, setDiagonalEdgeFinish] = useState<DiagonalEdgeTreatment>(initialConfig.diagonalEdgeFinish)
  const [diagonalCutAngle, setDiagonalCutAngle] = useState<DiagonalCutAngle>(initialConfig.diagonalCutAngle)
  const [woodSleeveWoodType, setWoodSleeveWoodType] = useState<WoodType>(initialConfig.woodSleeveWoodType)
  const [woodInlayWoodType, setWoodInlayWoodType] = useState<WoodType>(initialConfig.woodInlayWoodType)
  const [woodInlayWidthMm, setWoodInlayWidthMm] = useState(initialConfig.woodInlayWidthMm)
  const [woodInlayChamfer, setWoodInlayChamfer] = useState(initialConfig.woodInlayChamfer)
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
    outerCrest: language === "en" ? "Outer crest" : "Außensteg",
    grooveHint: language === "en" ? "Maximum depends on band width and groove width." : "Das Maximum hängt von Bandbreite und Rillenbreite ab.",
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
  const circumference = getCircumferenceMm(ringSize)
  const reducedDetail = isMobileLayout
  const heroCamera = isMobileLayout ? { position: [0, 0.12, 3.95] as [number, number, number], fov: 24 } : { position: [0, 0.28, 7.45] as [number, number, number], fov: 27 }
  const heroTarget: [number, number, number] = isMobileLayout ? [0.02, 0.04, 0] : [0.02, -0.12, 0]
  const heroDpr: [number, number] = isMobileLayout ? [1, 1.25] : [1, 1.75]

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
      groovedOuterCrestMm,
      facetedCount,
      facetedEdgeMode,
      openOpeningMm,
      openRoundedEdgeRadiusMm,
      diagonalOpeningMm,
      diagonalDirection,
      diagonalEdgeFinish,
      diagonalCutAngle,
      woodSleeveWoodType,
      woodInlayWoodType,
      woodInlayWidthMm,
      woodInlayChamfer,
    })

    const hasChanges =
      validated.groovedWidthMm !== groovedWidthMm ||
      validated.groovedDepthMm !== groovedDepthMm ||
      validated.groovedCount !== groovedCount ||
      validated.groovedOuterCrestMm !== groovedOuterCrestMm ||
      validated.facetedCount !== facetedCount ||
      validated.openOpeningMm !== openOpeningMm ||
      validated.openRoundedEdgeRadiusMm !== openRoundedEdgeRadiusMm ||
      validated.diagonalOpeningMm !== diagonalOpeningMm ||
      validated.woodInlayWidthMm !== woodInlayWidthMm

    if (!hasChanges) return

    queueMicrotask(() => {
      if (validated.groovedWidthMm !== groovedWidthMm) setGroovedWidthMm(validated.groovedWidthMm)
      if (validated.groovedDepthMm !== groovedDepthMm) setGroovedDepthMm(validated.groovedDepthMm)
      if (validated.groovedCount !== groovedCount) setGroovedCount(validated.groovedCount)
      if (validated.groovedOuterCrestMm !== groovedOuterCrestMm) setGroovedOuterCrestMm(validated.groovedOuterCrestMm)
      if (validated.facetedCount !== facetedCount) setFacetedCount(validated.facetedCount)
      if (validated.openOpeningMm !== openOpeningMm) setOpenOpeningMm(validated.openOpeningMm)
      if (validated.openRoundedEdgeRadiusMm !== openRoundedEdgeRadiusMm) setOpenRoundedEdgeRadiusMm(validated.openRoundedEdgeRadiusMm)
      if (validated.diagonalOpeningMm !== diagonalOpeningMm) setDiagonalOpeningMm(validated.diagonalOpeningMm)
      if (validated.woodInlayWidthMm !== woodInlayWidthMm) setWoodInlayWidthMm(validated.woodInlayWidthMm)
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
    groovedOuterCrestMm,
    facetedCount,
    facetedEdgeMode,
    openOpeningMm,
    openRoundedEdgeRadiusMm,
    diagonalOpeningMm,
    diagonalDirection,
    diagonalEdgeFinish,
    diagonalCutAngle,
    woodSleeveWoodType,
    woodInlayWoodType,
    woodInlayWidthMm,
    woodInlayChamfer,
  ])

  const styleSettings: StyleSettings = {
    ringSize,
    bandWidth,
    groovedWidthMm,
    groovedDepthMm,
    groovedCount,
    groovedOuterCrestMm,
    facetedCount,
    facetedEdgeMode,
    openOpeningMm,
    openRoundedEdgeRadiusMm,
    diagonalOpeningMm,
    diagonalDirection,
    diagonalEdgeFinish,
    diagonalCutAngle,
    woodSleeveWoodType,
    woodInlayWoodType,
    woodInlayWidthMm,
    woodInlayChamfer,
  }

  const maxGrooveCount = getMaxGrooveCount(bandWidth, groovedWidthMm, groovedOuterCrestMm)
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
        return { groovedWidthMm, groovedDepthMm, groovedCount, groovedOuterCrestMm }
      case "faceted":
        return { facetedCount, facetedArcLengthMm: Number(facetedArcLengthMm.toFixed(1)), facetedEdgeMode }
      case "open":
        return { openOpeningMm, openRoundedEdgeRadiusMm }
      case "diagonal":
        return { diagonalOpeningMm, diagonalDirection, diagonalEdgeFinish, diagonalCutAngleDegrees }
      case "woodSleeve":
        return { woodSleeveWoodType, woodSleeveThicknessMm: WOOD_SLEEVE_THICKNESS_MM }
      case "woodInlay":
        return { woodInlayWoodType, woodInlayWidthMm, woodInlayMetalEdgeMm: WOOD_INLAY_EDGE_MM, woodInlayChamfer }
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

  const styleSummaryParts =
    style === "grooved"
      ? [
          `${formatValue(language, groovedWidthMm)} mm ${language === "en" ? "groove width" : "Rillenbreite"}`,
          `${formatValue(language, groovedDepthMm)} mm ${language === "en" ? "groove depth" : "Rillentiefe"}`,
          `${groovedCount} ${language === "en" ? "grooves" : "Rillen"}`,
          groovedCount > 1 ? `${formatValue(language, groovedOuterCrestMm)} mm ${language === "en" ? "outer crest" : "Außensteg"}` : null,
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
          `${formatValue(language, openRoundedEdgeRadiusMm)} mm ${language === "en" ? "edge radius" : "Rundungsradius"}`,
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
    setGroovedOuterCrestMm(DEFAULT_CONFIG.groovedOuterCrestMm)
    setFacetedCount(DEFAULT_CONFIG.facetedCount)
    setFacetedEdgeMode(DEFAULT_CONFIG.facetedEdgeMode)
    setOpenOpeningMm(DEFAULT_CONFIG.openOpeningMm)
    setOpenRoundedEdgeRadiusMm(DEFAULT_CONFIG.openRoundedEdgeRadiusMm)
    setDiagonalOpeningMm(DEFAULT_CONFIG.diagonalOpeningMm)
    setDiagonalDirection(DEFAULT_CONFIG.diagonalDirection)
    setDiagonalEdgeFinish(DEFAULT_CONFIG.diagonalEdgeFinish)
    setDiagonalCutAngle(DEFAULT_CONFIG.diagonalCutAngle)
    setWoodSleeveWoodType(DEFAULT_CONFIG.woodSleeveWoodType)
    setWoodInlayWoodType(DEFAULT_CONFIG.woodInlayWoodType)
    setWoodInlayWidthMm(DEFAULT_CONFIG.woodInlayWidthMm)
    setWoodInlayChamfer(DEFAULT_CONFIG.woodInlayChamfer)
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
              <input id={diameterRangeId} className="range-input" type="range" min="14" max="24" step="0.1" value={ringSize} onChange={(event) => setRingSize(Number(event.target.value))} />
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

        {(style === "grooved" || style === "faceted" || style === "hammered" || style === "open" || style === "diagonal" || style === "woodSleeve" || style === "woodInlay") && (
          <PanelSection title={t.styleOptionsSection}>
            <div className="option-group">
              {style === "grooved" && (
                <>
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
                  {groovedCount > 1 && (
                    <Field label={`${t.outerCrest}: ${formatValue(language, groovedOuterCrestMm)} mm`} htmlFor={`${styleOptionsGroupId}-grooved-crest`}>
                      <input
                        id={`${styleOptionsGroupId}-grooved-crest`}
                        className="range-input"
                        type="range"
                        min="0.4"
                        max="5.0"
                        step="0.1"
                        value={groovedOuterCrestMm}
                        onChange={(event) => setGroovedOuterCrestMm(Number(event.target.value))}
                      />
                    </Field>
                  )}
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
                  <Field label={`${t.openRoundedEdgeRadius}: ${formatValue(language, openRoundedEdgeRadiusMm)} mm`} htmlFor={`${styleOptionsGroupId}-open-rounded-edge`}>
                    <input
                      id={`${styleOptionsGroupId}-open-rounded-edge`}
                      className="range-input"
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.1"
                      value={openRoundedEdgeRadiusMm}
                      onChange={(event) => setOpenRoundedEdgeRadiusMm(Number(event.target.value))}
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
      </aside>

      <main className="app-main">
        <div className="preview-sticky">
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
