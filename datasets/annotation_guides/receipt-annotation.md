# Receipt and Product Label Annotation Guide

Use this guide when annotating receipts, labels, and purchase evidence for VeriFrame.

## Goals

Annotate regions that help the visual audit pipeline explain what it found:

- receipt header
- vendor name
- date/time block
- line item block
- subtotal/tax/discount block
- total price block
- barcode or QR code
- product label
- damaged or unreadable text area

## Box Rules

Draw tight boxes around the visible content. Do not include large blank margins unless the region shape requires context.

For a receipt total, include the label and amount together when they visually form one unit. If the amount is visually separate, annotate the amount as `price_label`.

## Label Recommendations

```txt
receipt_header
line_item_block
price_label
barcode
qr_code
product_label
unreadable_region
```

## Quality Notes

Set metadata flags for glare, blur, cropped edges, folded receipts, handwritten corrections, or thermal print fading.
