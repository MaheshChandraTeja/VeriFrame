# General Object Detector

General Object Detector is a VeriFrame model profile based on a TorchVision Faster R-CNN architecture.

## Intended Use

Detect broad visual regions that can be routed into later domain-specific models.

## Training Data Summary

This profile ships as a local architecture/config scaffold. Production use should attach a local fine-tuned checkpoint.

## Limitations

- No bundled domain checkpoint.
- Base architecture alone is not evidence-grade.
- CPU execution can be slow on large images.

## Labels

object, document, package, display_panel, label
