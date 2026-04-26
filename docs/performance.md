# Performance

VeriFrame is CPU-first.

## Targets

- Image metadata and quality: sub-second for typical receipt images
- SQLite report listing: under 100 ms for normal local datasets
- Detection inference: depends heavily on CPU and image size

## Benchmark scripts

```powershell
python tools/benchmark/benchmark_storage.py
python tools/benchmark/benchmark_pipeline.py
python tools/benchmark/benchmark_inference.py
```

Keep image sizes sane. Faster R-CNN on a giant image is not “AI.” It is a space heater with callbacks.
