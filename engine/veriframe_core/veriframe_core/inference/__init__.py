"""
Inference package for VeriFrame.

Keep this package initializer intentionally lightweight.

Do not eagerly import classification/detection/segmentation runners here. Those
runners import model output parsers, and output parsers import thresholding from
this package. Eager imports here create a circular import during test collection,
because apparently Python packages enjoy summoning their own tail and biting it.
"""

__all__ = [
    "base",
    "classification",
    "detection",
    "segmentation",
    "batch_runner",
    "thresholding",
    "nms",
]
