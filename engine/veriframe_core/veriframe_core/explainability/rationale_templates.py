from __future__ import annotations

REGION_RATIONALE_TEMPLATE = (
    "Detected {label} with {confidence:.1%} calibrated confidence. "
    "The region is categorized as {category} and should be reviewed in the evidence overlay."
)

QUALITY_RATIONALE_TEMPLATE = (
    "Image quality warning: {warning}. This may reduce reliability and should be considered during review."
)

REVIEW_RECOMMENDATIONS = {
    "receipt_header": "Verify vendor, date, and receipt identity before accepting the result.",
    "line_item_block": "Review line items for readability and completeness.",
    "price_label": "Check amount, currency, and surrounding context manually.",
    "product_package": "Confirm package boundaries and label visibility.",
    "damage_zone": "Inspect crop and overlay to confirm visible damage or tampering.",
    "display_panel": "Verify displayed value and unit label manually.",
    "sensitive_region": "Review privacy-sensitive content handling before export.",
    "unknown": "Review this region manually because the semantic category is uncertain.",
}
