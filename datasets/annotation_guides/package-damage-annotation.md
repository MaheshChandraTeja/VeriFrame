# Package and Damage Annotation Guide

Use this guide when annotating shipping, delivery, and package evidence.

## Goals

Mark regions useful for evidence review:

- full package
- shipping label
- barcode/QR label
- visible tear
- crush zone
- puncture
- water damage
- missing seal
- tamper evidence
- unreadable label

## Box Rules

For damage zones, draw the smallest box that fully contains the visible damage. Do not annotate guessed damage behind occlusions.

For shipping labels, annotate the whole label region. Sensitive text redaction is handled later; do not manually crop identifying text out of the annotation.

## Label Recommendations

```txt
product_package
shipping_label
damage_zone
tear
crush
puncture
water_damage
tamper_evidence
unreadable_region
```

## Severity Metadata

Optional metadata can include:

```json
{
  "severity": "low | medium | high",
  "visible": true,
  "needs_review": true
}
```
