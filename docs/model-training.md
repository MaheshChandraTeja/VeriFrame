# Model Training

<p align="center">
  <strong>Training, evaluating, registering, and improving local TorchVision models for VeriFrame.</strong>
</p>

<p align="center">
  <img alt="PyTorch" src="https://img.shields.io/badge/PyTorch-Training-EE4C2C?style=for-the-badge&logo=pytorch">
  <img alt="TorchVision" src="https://img.shields.io/badge/TorchVision-Models-F97316?style=for-the-badge">
  <img alt="Local Dataset" src="https://img.shields.io/badge/Dataset-Local--Only-0ea5e9?style=for-the-badge">
  <img alt="Human Review" src="https://img.shields.io/badge/Human%20Review-Corrections-8b5cf6?style=for-the-badge">
  <img alt="CPU Safe" src="https://img.shields.io/badge/CPU--First-Supported-22c55e?style=for-the-badge">
</p>

---

## 1. Overview

VeriFrame uses TorchVision-compatible model profiles for local visual evidence analysis.

The model system is designed to support:

- receipt region detection
- package/product region detection
- package damage/tamper detection
- device/display panel detection
- segmentation where useful
- classification where useful
- human-reviewed dataset export
- local fine-tuning
- checkpoint registration
- evaluation and benchmark reporting

The goal is not to build a flashy demo that finds one box on one image and then collapses into soup. The goal is a repeatable local training loop:

```txt
Analyze image
   │
   ▼
Review/correct model output
   │
   ▼
Export local dataset
   │
   ▼
Train/fine-tune model
   │
   ▼
Evaluate model
   │
   ▼
Register checkpoint
   │
   ▼
Use model in VeriFrame
```

No cloud training service is required by default. No dataset upload is assumed. No secret server hiding behind the curtain. Just local data, local checkpoints, local evaluation, and enough structure to keep the goblins from touching production code.

---

## 2. Training Philosophy

VeriFrame’s training design follows five principles.

### 2.1 Human-reviewed data beats blind model output

Model predictions are useful starting points, not final truth.

Training data should come from reviewed and corrected outputs:

- corrected bounding boxes
- corrected labels
- rejected false positives
- validated findings
- ignored/uncertain regions
- reviewed image quality warnings

### 2.2 Small domain models are valuable

VeriFrame does not need one giant model to pretend it understands all visual reality.

It can use separate domain profiles:

- one for receipt regions
- one for display panels
- one for package labels
- one for package damage
- one for general object scaffolding

Small focused models are easier to review, evaluate, and improve.

### 2.3 CPU-first is mandatory

Training may be slower on CPU, but inference and tooling must not assume CUDA.

A user with no GPU should still be able to:

- run smoke tests
- export datasets
- evaluate small fixtures
- load CPU-safe models
- run local analysis

GPU acceleration is useful. GPU dependency is not.

### 2.4 Reproducibility matters

Every training run should record:

- dataset path
- dataset hash/manifest
- split configuration
- label set
- model profile
- base architecture
- hyperparameters
- checkpoint path
- metrics
- timestamp
- software version

Without this, “model improved” is just a vibe wearing a lab coat.

### 2.5 No silent remote behavior

Training tools must not upload images, annotations, metrics, checkpoints, or logs to remote services unless an explicit future feature clearly asks the user.

The default training loop is local.

---

## 3. Model Profile System

Model profiles live in:

```txt
models/configs/
```

Model cards live in:

```txt
models/model_cards/
```

Python registry code lives in:

```txt
engine/veriframe_core/veriframe_core/models/
```

### 3.1 Supported model profiles

| Profile ID | Task | Purpose |
|---|---|---|
| `receipt_region_detector` | detection | receipt headers, line item blocks, price labels, barcode/QR regions |
| `product_package_detector` | detection | product packages, labels, shipping labels, barcodes |
| `damage_detector` | detection | tears, crushes, punctures, water damage, tamper evidence |
| `display_panel_detector` | detection | display panels, readings, unit labels, warning icons |
| `general_object_detector` | detection | general fallback/scaffold object detection |

### 3.2 Profile contract

A model config should include:

```json
{
  "modelId": "receipt_region_detector",
  "name": "Receipt Region Detector",
  "version": "0.1.0",
  "task": "detection",
  "labels": [
    "receipt_header",
    "line_item_block",
    "price_label",
    "barcode",
    "qr_code",
    "unreadable_region"
  ],
  "architecture": "fasterrcnn_resnet50_fpn",
  "checkpointPath": null,
  "checkpointRequired": false,
  "inputSize": 800,
  "confidenceThreshold": 0.5,
  "preprocessing": {
    "resize": 800,
    "normalize": true
  },
  "outputParser": "torchvision_detection",
  "description": "Receipt block detector profile for local visual audit workflows."
}
```

### 3.3 Model card requirements

Each trained model should have a model card.

A model card should document:

- model name
- profile ID
- version
- task
- labels
- base architecture
- training data summary
- annotation rules
- preprocessing
- metrics
- known limitations
- intended use
- not intended use
- license
- checkpoint hash
- training date
- author/maintainer

---

## 4. Dataset Structure

The recommended local dataset format:

```txt
datasets/
  visual-audit/
    manifest.json
    labels.json
    train/
      images/
      annotations/
    val/
      images/
      annotations/
    test/
      images/
      annotations/
```

A dataset exported from human review may look like:

```txt
exports/
  review-dataset-2026-04-26-2230/
    manifest.json
    README.md
    images/
      img_a16e5aad5e44d999.jpg
    annotations/
      img_a16e5aad5e44d999.json
```

---

## 5. Annotation Schema

Schema location:

```txt
datasets/schemas/visual-audit-annotation.schema.json
```

Annotation schema should support:

- image ID
- image filename
- image hash
- width/height
- source run ID
- labels
- boxes
- masks where applicable
- review status
- source model ID
- reviewer
- timestamps
- notes

Example:

```json
{
  "schemaVersion": "1.0.0",
  "image": {
    "imageId": "img_a16e5aad5e44d999",
    "fileName": "sample-receipt.jpg",
    "sha256": "a16e5aad5e44d999758f6447a76a4f4f79c00dcd17005bd5e3410d21d9462216",
    "width": 800,
    "height": 480
  },
  "source": {
    "runId": "run_7335d2ed9d3f4f8fb02d79311fbc02f1",
    "workflow": "receipt_verification"
  },
  "regions": [
    {
      "regionId": "reg_0316da5b154741c3b433dd5776071eb9",
      "label": "price_label",
      "bbox": {
        "x": 448.0,
        "y": 345.6,
        "width": 288.0,
        "height": 67.2
      },
      "reviewStatus": "corrected",
      "sourceModelId": "receipt_region_detector"
    }
  ]
}
```

---

## 6. Annotation Guidelines

Annotation guides live in:

```txt
datasets/annotation_guides/
```

Current guides:

- `receipt-annotation.md`
- `package-damage-annotation.md`

### 6.1 Receipt annotation labels

| Label | Meaning |
|---|---|
| `receipt_header` | merchant, date, store details, receipt identity |
| `line_item_block` | purchased items and quantities |
| `price_label` | subtotal, total, taxes, discount, final price |
| `barcode` | linear barcode |
| `qr_code` | QR code |
| `unreadable_region` | damaged or unreadable section |

### 6.2 Package/product labels

| Label | Meaning |
|---|---|
| `product_package` | visible product or package body |
| `shipping_label` | shipping label or address label |
| `product_label` | product branding/ingredients/specification area |
| `barcode` | barcode |
| `qr_code` | QR code |

### 6.3 Damage/tamper labels

| Label | Meaning |
|---|---|
| `damage_zone` | general visible damage |
| `tear` | torn material |
| `crush` | crushed/deformed region |
| `puncture` | puncture/hole |
| `water_damage` | water/moisture marks |
| `tamper_evidence` | signs of tampering, opened seal, broken tape |

---

## 7. Review-to-Dataset Export

The review system is the preferred source of training data.

Code locations:

```txt
engine/veriframe_core/veriframe_core/review/dataset_exporter.py
engine/veriframe_core/veriframe_core/review/annotation_writer.py
tools/annotate/convert_review_to_dataset.py
```

### Export flow

```txt
Analysis run
   │
   ▼
Review corrections
   │
   ▼
Finding decisions
   │
   ▼
Dataset exporter
   │
   ├── copied/local referenced images
   ├── annotation JSON files
   ├── manifest.json
   └── README.md
```

### Expected export contents

```txt
review-dataset/
  manifest.json
  README.md
  images/
    img_<hash>.jpg
  annotations/
    img_<hash>.json
```

### Manifest should include

```json
{
  "schemaVersion": "1.0.0",
  "createdAt": "2026-04-26T22:30:00Z",
  "source": "veriframe-review-export",
  "runIds": ["run_..."],
  "imageCount": 1,
  "annotationCount": 1,
  "labels": ["receipt_header", "line_item_block", "price_label"],
  "reviewSummary": {
    "correctionCount": 3,
    "findingReviewCount": 8
  }
}
```

---

## 8. Training Code Structure

Training modules live in:

```txt
engine/veriframe_core/veriframe_core/training/
```

| Module | Purpose |
|---|---|
| `train_detection.py` | detection model fine-tuning entry |
| `train_segmentation.py` | segmentation model fine-tuning entry |
| `evaluate.py` | model evaluation entry |
| `metrics.py` | precision, recall, IoU, confusion matrix, mAP placeholder |
| `checkpoint_manager.py` | save/register checkpoints |

Dataset modules live in:

```txt
engine/veriframe_core/veriframe_core/datasets/
```

| Module | Purpose |
|---|---|
| `visual_audit_dataset.py` | TorchVision-compatible dataset class |
| `annotation_schema.py` | Pydantic annotation models |
| `registry.py` | local dataset registry |

---

## 9. Training Detection Models

Detection training should use TorchVision detection architectures.

Recommended starting architectures:

- `fasterrcnn_resnet50_fpn`
- `fasterrcnn_mobilenet_v3_large_fpn`
- `retinanet_resnet50_fpn`
- `ssdlite320_mobilenet_v3_large`

### 9.1 CPU-friendly starting point

For local development and small datasets:

```txt
fasterrcnn_mobilenet_v3_large_fpn
```

Why:

- lighter than ResNet50 FPN
- works reasonably for detection scaffolding
- more tolerable on CPU
- good for smoke tests and proof-of-training flows

### 9.2 Production-quality starting point

For stronger detection:

```txt
fasterrcnn_resnet50_fpn
```

Why:

- widely used baseline
- good transfer learning behavior
- better detection quality
- heavier CPU cost

As usual, the better model demands more compute because silicon enjoys charging rent.

---

## 10. Detection Training Command

Planned command shape:

```powershell
python -m veriframe_core.training.train_detection `
  --dataset "datasets/visual-audit" `
  --profile receipt_region_detector `
  --output-dir "models/checkpoints/receipt_region_detector" `
  --epochs 20 `
  --batch-size 2 `
  --learning-rate 0.0005 `
  --device cpu
```

### Arguments

| Argument | Meaning |
|---|---|
| `--dataset` | dataset root containing manifest/images/annotations |
| `--profile` | model profile ID |
| `--output-dir` | checkpoint output directory |
| `--epochs` | training epochs |
| `--batch-size` | batch size |
| `--learning-rate` | optimizer learning rate |
| `--device` | `auto`, `cpu`, `cuda`, or `mps` |
| `--resume` | optional checkpoint resume path |
| `--seed` | deterministic seed |

---

## 11. Detection Training Pseudocode

```python
def train_detection(config: TrainConfig) -> TrainResult:
    seed_everything(config.seed)

    dataset_train = VisualAuditDataset(
        root=config.dataset_root,
        split="train",
        labels=config.labels,
        transforms=build_detection_transforms(train=True),
    )

    dataset_val = VisualAuditDataset(
        root=config.dataset_root,
        split="val",
        labels=config.labels,
        transforms=build_detection_transforms(train=False),
    )

    model = build_detection_model(
        architecture=config.architecture,
        num_classes=len(config.labels) + 1,
    )

    device = select_device(config.device)
    model.to(device)

    optimizer = torch.optim.SGD(
        model.parameters(),
        lr=config.learning_rate,
        momentum=0.9,
        weight_decay=0.0005,
    )

    for epoch in range(config.epochs):
        train_one_epoch(model, optimizer, dataset_train, device)
        metrics = evaluate_detection(model, dataset_val, device)
        save_checkpoint_if_best(model, metrics)

    return TrainResult(
        checkpoint_path=best_checkpoint,
        metrics=best_metrics,
    )
```

---

## 12. Segmentation Training

Segmentation is useful when boxes are not enough.

Possible use cases:

- damaged region shape
- torn packaging edge
- glare/overexposed receipt area
- display panel screen area
- unreadable region boundaries

Recommended architectures:

- `maskrcnn_resnet50_fpn`
- lightweight custom U-Net
- DeepLabV3-style segmentation for region masks

### Planned command

```powershell
python -m veriframe_core.training.train_segmentation `
  --dataset "datasets/visual-audit" `
  --profile damage_detector `
  --output-dir "models/checkpoints/damage_segmenter" `
  --epochs 20 `
  --batch-size 1 `
  --device cpu
```

Segmentation on CPU may be slow. That is not a bug; that is reality trying to invoice you.

---

## 13. Classification Training

Classification is optional but useful for:

- image type detection
- receipt vs package vs display classification
- quality category prediction
- glare risk classification
- document type classification

Recommended architectures:

- `mobilenet_v3_small`
- `mobilenet_v3_large`
- `efficientnet_b0`
- `resnet18`

A classifier can help route images to specialized detectors.

Example:

```txt
image → classifier → receipt workflow → receipt detector
image → classifier → package workflow → package detector
image → classifier → display workflow → display detector
```

---

## 14. Data Splitting

Recommended split:

```txt
train: 70%
val:   15%
test:  15%
```

For very small datasets:

```txt
train: 80%
val:   20%
test:  optional/manual holdout
```

Rules:

- split by image, not by region
- avoid duplicate or near-duplicate images across splits
- keep receipts from the same source/session in the same split where possible
- preserve label distribution
- keep test data untouched until final evaluation

Dataset leakage is how metrics become fan fiction.

---

## 15. Metrics

Metrics live in:

```txt
engine/veriframe_core/veriframe_core/training/metrics.py
```

### Detection metrics

| Metric | Meaning |
|---|---|
| precision | how many predicted boxes were correct |
| recall | how many true boxes were found |
| IoU | box overlap quality |
| mAP | mean average precision |
| false positive rate | how many extra boxes are produced |
| per-label support | examples per class |

### Review-oriented metrics

VeriFrame should also track practical review metrics:

- false positives per image
- missing regions per image
- corrected box percentage
- corrected label percentage
- average confidence of accepted regions
- average confidence of rejected regions
- quality-warning impact

These are often more useful than one shiny score in a README pretending the world is tidy.

---

## 16. Evaluation Command

Planned command shape:

```powershell
python -m veriframe_core.training.evaluate `
  --dataset "datasets/visual-audit" `
  --profile receipt_region_detector `
  --checkpoint "models/checkpoints/receipt_region_detector/best.pt" `
  --split test `
  --device cpu `
  --output "models/evaluations/receipt_region_detector_eval.json"
```

### Evaluation output

```json
{
  "profile": "receipt_region_detector",
  "checkpoint": "best.pt",
  "split": "test",
  "imageCount": 120,
  "labels": {
    "receipt_header": {
      "precision": 0.91,
      "recall": 0.88,
      "support": 120
    },
    "line_item_block": {
      "precision": 0.86,
      "recall": 0.81,
      "support": 116
    },
    "price_label": {
      "precision": 0.88,
      "recall": 0.84,
      "support": 118
    }
  },
  "overall": {
    "precision": 0.88,
    "recall": 0.84,
    "map": 0.76
  }
}
```

---

## 17. Checkpoint Management

Checkpoint manager location:

```txt
engine/veriframe_core/veriframe_core/training/checkpoint_manager.py
```

A checkpoint directory should include:

```txt
models/checkpoints/receipt_region_detector/
  best.pt
  last.pt
  training-config.json
  metrics.json
  labels.json
  model-card.md
  checkpoint.sha256
```

### Checkpoint metadata

```json
{
  "modelId": "receipt_region_detector",
  "version": "0.2.0",
  "architecture": "fasterrcnn_mobilenet_v3_large_fpn",
  "labels": [
    "receipt_header",
    "line_item_block",
    "price_label",
    "barcode",
    "qr_code",
    "unreadable_region"
  ],
  "checkpointPath": "models/checkpoints/receipt_region_detector/best.pt",
  "checkpointSha256": "...",
  "metricsPath": "models/checkpoints/receipt_region_detector/metrics.json",
  "createdAt": "2026-04-26T22:30:00Z"
}
```

---

## 18. Registering a Trained Model

After training, update the corresponding profile config.

Example:

```json
{
  "modelId": "receipt_region_detector",
  "name": "Receipt Region Detector",
  "version": "0.2.0",
  "task": "detection",
  "checkpointPath": "models/checkpoints/receipt_region_detector/best.pt",
  "checkpointRequired": true,
  "checkpointSha256": "...",
  "loadable": true
}
```

Then verify through the API:

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/models
```

Load model:

```powershell
$body = @{
  modelId = "receipt_region_detector"
  warmup = $false
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/models/load" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $body
```

---

## 19. Model Cards

Model cards should be stored in:

```txt
models/model_cards/
```

Template:

```md
# Receipt Region Detector v0.2.0

## Purpose

Detect structured receipt regions for local visual audit workflows.

## Labels

- receipt_header
- line_item_block
- price_label
- barcode
- qr_code
- unreadable_region

## Architecture

fasterrcnn_mobilenet_v3_large_fpn

## Training Data

Local reviewed VeriFrame annotations exported from human review sessions.

## Metrics

| Metric | Value |
|---|---:|
| Precision | 0.88 |
| Recall | 0.84 |
| mAP | 0.76 |

## Limitations

- low-resolution receipts reduce reliability
- severe glare may hide price labels
- handwritten receipts are underrepresented
- non-English receipt layouts may need additional review

## Intended Use

Local evidence review assistance.

## Not Intended Use

Legal authentication, autonomous financial decisions, or replacing human review.

## License

Project-specific / internal / documented per checkpoint.
```

---

## 20. Preprocessing Rules

Preprocessing modules live in:

```txt
engine/veriframe_core/veriframe_core/preprocessing/
```

Important modules:

- `normalization.py`
- `transforms.py`
- `cropping.py`
- `quality.py`

### Detection preprocessing

Recommended:

- load with Pillow/OpenCV safely
- normalize EXIF orientation
- convert to RGB
- resize with aspect ratio preserved where appropriate
- convert to Torch tensor
- avoid destructive crop before detection
- preserve original image dimensions for box mapping

### Box coordinate policy

Stored boxes should use original image coordinates:

```json
{
  "x": 448.0,
  "y": 345.6,
  "width": 288.0,
  "height": 67.2
}
```

If training transforms resize images, convert boxes consistently.

Coordinate bugs are tiny math demons. Test them.

---

## 21. Augmentation

Augmentation should reflect realistic input variation.

Recommended for receipts:

- brightness shifts
- contrast shifts
- slight rotation
- perspective tilt
- blur
- compression artifacts
- crop margins
- glare simulation, carefully
- grayscale conversion, selectively

Avoid unrealistic augmentations:

- extreme rotations for receipts
- heavy color distortions
- random flips that break text direction
- distortions that make labels meaningless

Recommended for packages:

- lighting variation
- angle variation
- mild occlusion
- compression
- crop
- blur
- background variation

Recommended for display panels:

- glare
- brightness shifts
- mild perspective
- motion blur
- low-light simulation

---

## 22. CPU, CUDA, and MPS

Device selection should use:

```txt
auto
cpu
cuda
mps
```

Behavior:

| Preference | Behavior |
|---|---|
| `auto` | choose CUDA/MPS if available, otherwise CPU |
| `cpu` | force CPU |
| `cuda` | require CUDA or fail clearly |
| `mps` | require Apple MPS or fail clearly |

Training scripts should print selected device:

```txt
Selected device: cpu
Reason: CUDA unavailable, using CPU fallback.
```

Do not bury device decisions in logs where only archaeology can find them.

---

## 23. Benchmarking

Benchmark scripts live in:

```txt
tools/benchmark/
```

Useful commands:

```powershell
python tools/benchmark/benchmark_inference.py
python tools/benchmark/benchmark_pipeline.py --iterations 20
python tools/benchmark/benchmark_storage.py --iterations 5000
```

Benchmarks should track:

- inference latency
- pipeline latency
- storage read/write latency
- cold start
- warm start
- memory footprint
- model loading time

---

## 24. Training Quality Gates

Before registering a new checkpoint:

- dataset validates against schema
- labels match profile config
- train/val split exists
- no duplicate leakage across splits
- checkpoint hash recorded
- metrics generated
- model card written
- smoke inference passes
- output parser produces contract-valid regions
- audit receipt records model reference
- UI can load model profile
- reports can display model info

A checkpoint that cannot pass a smoke test does not get to wear the “model” hat. It is just a file with ambition.

---

## 25. Common Failure Modes

| Failure | Likely cause | Fix |
|---|---|---|
| No regions produced | model not loaded or checkpoint missing | load model, verify checkpoint |
| Heuristic regions appear | fallback path used | train/register checkpoint |
| Model load fails | incompatible checkpoint architecture | check profile + checkpoint metadata |
| Box coordinates wrong | resize transform not reversed | test coordinate mapping |
| Labels shifted | background class mishandled | verify label index mapping |
| CPU too slow | heavy architecture | use lightweight model/profile |
| mAP looks too good | dataset leakage | audit splits |
| Review export empty | no saved corrections | save review before export |
| Dataset schema fails | annotation writer drift | update schema/tests |
| Report lacks model info | modelInfo not appended | fix runner metadata |

---

## 26. Recommended Roadmap

### Phase 1: Dataset correctness

- validate exported annotations
- add visual annotation preview tool
- add dataset manifest hashes
- add split generator
- add duplicate image detection

### Phase 2: Training smoke path

- train tiny detector on fixture dataset
- save checkpoint
- register checkpoint
- load checkpoint through `/models/load`
- run inference through `/analysis`
- assert regions appear without heuristic fallback

### Phase 3: Real domain data

- collect reviewed receipt/package/display samples
- improve annotation guides
- train profile-specific detectors
- evaluate per label
- build model cards

### Phase 4: Hardening

- checkpoint hash validation
- model registry versioning
- safe checkpoint loading rules
- ONNX export where useful
- automated training reports
- reproducible training configs

---

## 27. Commands Summary

### Export review dataset

```powershell
python tools/annotate/convert_review_to_dataset.py `
  --run-id run_... `
  --output datasets/exports/review-dataset
```

### Train detection model

```powershell
python -m veriframe_core.training.train_detection `
  --dataset datasets/visual-audit `
  --profile receipt_region_detector `
  --output-dir models/checkpoints/receipt_region_detector `
  --epochs 20 `
  --batch-size 2 `
  --device cpu
```

### Evaluate model

```powershell
python -m veriframe_core.training.evaluate `
  --dataset datasets/visual-audit `
  --profile receipt_region_detector `
  --checkpoint models/checkpoints/receipt_region_detector/best.pt `
  --split test `
  --device cpu
```

### Load model

```powershell
$body = @{
  modelId = "receipt_region_detector"
  warmup = $false
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/models/load" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $body
```

---

## 28. Authors

**Mahesh Chandra Teja Garnepudi**  
GitHub: `@MaheshChandraTeja`

**Sagarika Srivastava**  
GitHub: `@SagarikaSrivastava`

**Organization**  
Kairais Tech  
`https://www.kairais.com`

---

## 29. Closing Note

VeriFrame’s training loop is meant to be practical:

```txt
review → correct → export → train → evaluate → register → improve
```

That loop is the difference between a model demo and an actual system.

The point is not to pretend every prediction is right. The point is to make wrong predictions useful, reviewable, correctable, and eventually less wrong.

That is how useful local AI gets better without immediately phoning home like a needy toaster.
