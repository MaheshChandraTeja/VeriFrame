from __future__ import annotations

RegionCategory = str


CATEGORY_KEYWORDS: tuple[tuple[str, str], ...] = (
    ("receipt", "receipt_header"),
    ("line_item", "line_item_block"),
    ("price", "price_label"),
    ("package", "product_package"),
    ("damage", "damage_zone"),
    ("tear", "damage_zone"),
    ("crush", "damage_zone"),
    ("tamper", "damage_zone"),
    ("display", "display_panel"),
    ("panel", "display_panel"),
    ("sensitive", "sensitive_region"),
)


def classify_region_category(label: str) -> RegionCategory:
    normalized = label.lower().replace("-", "_").strip()

    for keyword, category in CATEGORY_KEYWORDS:
        if keyword in normalized:
            return category

    return "unknown"
