"""Material vocabulary and prior database for semantic segmentation."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# Material class indices (extensible)
MATERIAL_CLASSES = {
    "unknown": 0,
    "hardwood_floor": 1,
    "carpet": 2,
    "painted_wall": 3,
    "painted_ceiling": 4,
    "concrete": 5,
    "brick": 6,
    "stone": 7,
    "ceramic_tile": 8,
    "marble": 9,
    "glass_window": 10,
    "mirror": 11,
    "metal_fixture": 12,
    "brushed_steel": 13,
    "stainless_steel": 14,
    "chrome": 15,
    "fabric": 16,
    "leather": 17,
    "plastic": 18,
    "wood_furniture": 19,
    "paper": 20,
    "cardboard": 21,
    # Food and tableware
    "ceramic_plate": 22,
    "pastry_crust": 23,
    "bread": 24,
    "cream": 25,
    "chocolate": 26,
    "fruit_jam": 27,
    "powdered_sugar": 28,
    "glaze": 29,
    "metal_utensil": 30,
    "tablecloth": 31,
}

# Inverse mapping
CLASS_NAMES = {v: k for k, v in MATERIAL_CLASSES.items()}

# Natural-language prompts for each material (for VLM/SAM queries)
MATERIAL_PROMPTS = {
    "hardwood_floor": "hardwood floor",
    "carpet": "carpet",
    "painted_wall": "painted wall",
    "painted_ceiling": "painted ceiling",
    "concrete": "concrete",
    "brick": "brick",
    "stone": "stone",
    "ceramic_tile": "ceramic tile",
    "marble": "marble",
    "glass_window": "glass window",
    "mirror": "mirror",
    "metal_fixture": "metal fixture",
    "brushed_steel": "brushed steel",
    "stainless_steel": "stainless steel",
    "chrome": "chrome surface",
    "fabric": "fabric",
    "leather": "leather",
    "plastic": "plastic",
    "wood_furniture": "wood furniture",
    "paper": "paper",
    "cardboard": "cardboard",
    # Food and tableware
    "ceramic_plate": "ceramic plate",
    "pastry_crust": "pastry crust, baked dough",
    "bread": "bread",
    "cream": "whipped cream, custard, cream filling",
    "chocolate": "chocolate, chocolate sauce",
    "fruit_jam": "fruit jam, berry compote, fruit filling",
    "powdered_sugar": "powdered sugar, icing sugar",
    "glaze": "glazed surface, sugar glaze, shiny food coating",
    "metal_utensil": "metal spoon, metal fork, metal spatula, serving utensil",
    "tablecloth": "tablecloth, napkin, linen",
}

# Reflective materials (for ghost detection)
REFLECTIVE_CLASSES = {
    "glass_window", "mirror", "chrome", "stainless_steel",
}


@dataclass
class MaterialPrior:
    """Known physical properties for a material class."""

    albedo_range: tuple[float, float]  # linear luminance [min, max]
    roughness_range: tuple[float, float]
    metalness: float  # 0 or 1 for most materials
    is_reflective: bool = False


# Material prior database — constrains the material solve
MATERIAL_PRIORS: dict[str, MaterialPrior] = {
    "hardwood_floor": MaterialPrior(
        albedo_range=(0.10, 0.30), roughness_range=(0.3, 0.6), metalness=0.0,
    ),
    "carpet": MaterialPrior(
        albedo_range=(0.05, 0.40), roughness_range=(0.8, 1.0), metalness=0.0,
    ),
    "painted_wall": MaterialPrior(
        albedo_range=(0.50, 0.90), roughness_range=(0.4, 0.8), metalness=0.0,
    ),
    "painted_ceiling": MaterialPrior(
        albedo_range=(0.70, 0.95), roughness_range=(0.3, 0.7), metalness=0.0,
    ),
    "concrete": MaterialPrior(
        albedo_range=(0.20, 0.45), roughness_range=(0.7, 0.95), metalness=0.0,
    ),
    "brick": MaterialPrior(
        albedo_range=(0.15, 0.35), roughness_range=(0.7, 0.95), metalness=0.0,
    ),
    "stone": MaterialPrior(
        albedo_range=(0.15, 0.50), roughness_range=(0.5, 0.9), metalness=0.0,
    ),
    "ceramic_tile": MaterialPrior(
        albedo_range=(0.30, 0.80), roughness_range=(0.1, 0.4), metalness=0.0,
    ),
    "marble": MaterialPrior(
        albedo_range=(0.40, 0.85), roughness_range=(0.05, 0.25), metalness=0.0,
    ),
    "glass_window": MaterialPrior(
        albedo_range=(0.01, 0.05), roughness_range=(0.0, 0.1), metalness=0.0,
        is_reflective=True,
    ),
    "mirror": MaterialPrior(
        albedo_range=(0.80, 0.98), roughness_range=(0.0, 0.05), metalness=1.0,
        is_reflective=True,
    ),
    "metal_fixture": MaterialPrior(
        albedo_range=(0.30, 0.70), roughness_range=(0.2, 0.5), metalness=1.0,
    ),
    "brushed_steel": MaterialPrior(
        albedo_range=(0.40, 0.65), roughness_range=(0.2, 0.45), metalness=1.0,
    ),
    "stainless_steel": MaterialPrior(
        albedo_range=(0.45, 0.70), roughness_range=(0.1, 0.3), metalness=1.0,
        is_reflective=True,
    ),
    "chrome": MaterialPrior(
        albedo_range=(0.55, 0.85), roughness_range=(0.0, 0.1), metalness=1.0,
        is_reflective=True,
    ),
    "fabric": MaterialPrior(
        albedo_range=(0.05, 0.50), roughness_range=(0.7, 1.0), metalness=0.0,
    ),
    "leather": MaterialPrior(
        albedo_range=(0.05, 0.30), roughness_range=(0.4, 0.7), metalness=0.0,
    ),
    "plastic": MaterialPrior(
        albedo_range=(0.10, 0.60), roughness_range=(0.2, 0.6), metalness=0.0,
    ),
    "wood_furniture": MaterialPrior(
        albedo_range=(0.08, 0.35), roughness_range=(0.3, 0.7), metalness=0.0,
    ),
    "paper": MaterialPrior(
        albedo_range=(0.60, 0.90), roughness_range=(0.6, 0.9), metalness=0.0,
    ),
    "cardboard": MaterialPrior(
        albedo_range=(0.25, 0.50), roughness_range=(0.7, 0.95), metalness=0.0,
    ),
    # Food and tableware
    "ceramic_plate": MaterialPrior(
        albedo_range=(0.50, 0.90), roughness_range=(0.1, 0.35), metalness=0.0,
    ),
    "pastry_crust": MaterialPrior(
        albedo_range=(0.15, 0.45), roughness_range=(0.7, 0.95), metalness=0.0,
    ),
    "bread": MaterialPrior(
        albedo_range=(0.20, 0.50), roughness_range=(0.8, 1.0), metalness=0.0,
    ),
    "cream": MaterialPrior(
        albedo_range=(0.70, 0.95), roughness_range=(0.4, 0.7), metalness=0.0,
    ),
    "chocolate": MaterialPrior(
        albedo_range=(0.03, 0.15), roughness_range=(0.3, 0.6), metalness=0.0,
    ),
    "fruit_jam": MaterialPrior(
        albedo_range=(0.05, 0.25), roughness_range=(0.2, 0.5), metalness=0.0,
    ),
    "powdered_sugar": MaterialPrior(
        albedo_range=(0.80, 0.98), roughness_range=(0.8, 1.0), metalness=0.0,
    ),
    "glaze": MaterialPrior(
        albedo_range=(0.30, 0.70), roughness_range=(0.05, 0.25), metalness=0.0,
    ),
    "metal_utensil": MaterialPrior(
        albedo_range=(0.40, 0.70), roughness_range=(0.15, 0.4), metalness=1.0,
    ),
    "tablecloth": MaterialPrior(
        albedo_range=(0.50, 0.90), roughness_range=(0.7, 1.0), metalness=0.0,
    ),
}


def get_prior(class_name: str) -> MaterialPrior | None:
    """Get material prior for a class name."""
    return MATERIAL_PRIORS.get(class_name)


def is_reflective(class_name: str) -> bool:
    """Check if a material class is reflective (for ghost detection)."""
    return class_name in REFLECTIVE_CLASSES
