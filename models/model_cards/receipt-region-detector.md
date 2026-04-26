# Receipt Region Detector

Receipt Region Detector is a VeriFrame model profile for receipt and product-label evidence review.

## Intended Use

Detect receipt headers, line item blocks, price labels, barcodes, QR codes, and unreadable regions.

## Training Data Summary

This profile defines the TorchVision model and label contract. Fine-tuned local checkpoints should be trained with the Module 5 annotation schema.

## Limitations

- Not useful as an evidence model without a tuned checkpoint.
- Thermal print fading, glare, and folded receipts require careful annotation coverage.
- Human review is required for audit-sensitive outputs.

## Labels

receipt_header, line_item_block, price_label, barcode, qr_code, unreadable_region
