"use strict";

/* ============================================================
   MONTHLY RESOURCE DISTRIBUTION — centralized configuration.
   Nothing else in the code base hardcodes these numbers. Every NUMBER here can
   be overridden WITHOUT a redeploy by creating the Firestore doc
   rc_config/resources with the same key (see resource-distribution.js loadConfig).
   Resource ids are the game's EXISTING ones (RESOURCE_NAMES in js/config.js).
   ============================================================ */

const RESOURCE_TIERS = {
  COMMON:    ["food", "wood", "stone", "herbs", "leather"],
  UNCOMMON:  ["iron", "coal"],
  RARE:      ["ore"],                       // "Gold Ore"
  VERY_RARE: ["frost", "voidessence"],
};

// Economic value of ONE unit of each tier (config example values from the design doc).
const TIER_VALUE = { COMMON: 10, UNCOMMON: 20, RARE: 35, VERY_RARE: 50 };
// Base production per hour of a region whose resource has that tier (before quality / modifiers).
const TIER_BASE_PRODUCTION = { COMMON: 100, UNCOMMON: 60, RARE: 30, VERY_RARE: 20 };
// Max share of ALL regions that can carry a resource of that tier in one month (keeps valuable regions rare).
const TIER_MAX_SHARE = { COMMON: 1, UNCOMMON: 0.30, RARE: 0.12, VERY_RARE: 0.04 };
// Base pick weight of a tier (rarer = less likely before geography is applied).
const TIER_BASE_WEIGHT = { COMMON: 1, UNCOMMON: 0.55, RARE: 0.25, VERY_RARE: 0.08 };

const RESOURCE_VALUES = {};      // {resourceId: value per unit}
const RESOURCE_BASE_PRODUCTION = {};
const TIER_OF = {};              // {resourceId: "COMMON"...}
Object.keys(RESOURCE_TIERS).forEach((tier) => RESOURCE_TIERS[tier].forEach((r) => {
  TIER_OF[r] = tier; RESOURCE_VALUES[r] = TIER_VALUE[tier]; RESOURCE_BASE_PRODUCTION[r] = TIER_BASE_PRODUCTION[tier];
}));
const ALL_RESOURCES = Object.keys(TIER_OF);

// Region geography -> weight multiplier per resource (weighted RANDOMNESS, never deterministic).
// A resource missing from a geography gets `baseline`.
const RESOURCE_GEOGRAPHY_WEIGHTS = {
  baseline: 0.15,
  fertile:  { food: 5, herbs: 3, leather: 2 },
  forest:   { wood: 5, herbs: 2, leather: 2, food: 0.8 },
  mountain: { stone: 4, iron: 4, ore: 3, coal: 1.5, frost: 1.5 },
  mining:   { iron: 4, coal: 4, ore: 2.5, stone: 2 },
  plains:   { food: 2.5, leather: 3, wood: 1.5, stone: 1.5, herbs: 1.5, iron: 0.8 },
  arcane:   { frost: 4, voidessence: 4, herbs: 1.5, ore: 1, stone: 1 },
};
// Country "natural" resource (existing data) -> geography of the region it inspires.
const NATURAL_TO_GEO = { food: "fertile", herbs: "fertile", wood: "forest", stone: "mountain", iron: "mining", coal: "mining", ore: "mountain", leather: "plains", frost: "arcane", voidessence: "arcane" };
const GEOGRAPHIES = ["fertile", "forest", "mountain", "mining", "plains"];  // geographies picked at random for non-natural regions

const RESOURCE_DISTRIBUTION_CONFIG = {
  MONTHLY_DISTRIBUTION_ENABLED: true,
  RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE: 0.10,   // (max - min) / max country value must be <= this
  MAX_BALANCING_ITERATIONS: 5000,
  ALGORITHM_VERSION: 1,
  QUALITY_MIN: 0.85, QUALITY_MAX: 1.15,            // per-region resourceQuality roll
  VARIETY_REPEAT_PENALTY: 0.35,                    // weight multiplier when a region got the same resource last month
  MIN_SWAP_GEO_WEIGHT: 0.3,                        // balancing may only put a resource on a region whose geography gives it at least this weight
  // Production modifiers (the existing production architecture does not exist yet for regions, so they live here)
  OCCUPATION_MODIFIER: 0.70,
  HIGH_RESISTANCE_MODIFIER: 0.50, HIGH_RESISTANCE_FROM: 50,
  INFRASTRUCTURE_STEP: 0.05, DEVELOPMENT_STEP: 0.05,   // +5% per level above 1
  MIN_STABILITY_MODIFIER: 0.25,
  MAX_ACCRUAL_MS: 72 * 60 * 60 * 1000,             // production nobody collected for longer than this is not stored
  // Admin / debug tools (disabled in production unless explicitly enabled in rc_config/resources)
  ADMIN_TOOLS_ENABLED: false,
};

const CFG_NUMBER_LIMITS = {
  RESOURCE_DISTRIBUTION_BALANCE_TOLERANCE: [0.01, 0.5], MAX_BALANCING_ITERATIONS: [0, 50000],
  QUALITY_MIN: [0.5, 1], QUALITY_MAX: [1, 2], VARIETY_REPEAT_PENALTY: [0, 1], MIN_SWAP_GEO_WEIGHT: [0, 5],
  OCCUPATION_MODIFIER: [0, 1], HIGH_RESISTANCE_MODIFIER: [0, 1], MAX_ACCRUAL_MS: [0, 30 * 24 * 3600 * 1000],
};

module.exports = {
  RESOURCE_TIERS, TIER_VALUE, TIER_BASE_PRODUCTION, TIER_MAX_SHARE, TIER_BASE_WEIGHT,
  RESOURCE_VALUES, RESOURCE_BASE_PRODUCTION, TIER_OF, ALL_RESOURCES,
  RESOURCE_GEOGRAPHY_WEIGHTS, NATURAL_TO_GEO, GEOGRAPHIES,
  RESOURCE_DISTRIBUTION_CONFIG, CFG_NUMBER_LIMITS,
};
