# Model Training

Module 9 exports reviewed analysis runs into local training datasets.

```txt
review-datasets/<runId>/
  images/
  annotations/
  manifest.json
```

Detection training scaffold:

```powershell
python -m veriframe_core.training.train_detection <annotations_dir>
```

Segmentation training scaffold:

```powershell
python -m veriframe_core.training.train_segmentation <annotations_dir>
```

Register checkpoints by updating `models/configs/*.json` with a local `checkpointPath`.
