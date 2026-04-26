from __future__ import annotations

from veriframe_core.contracts.analysis import ImageMetadata
from veriframe_core.importing.image_loader import load_image
from veriframe_core.importing.metadata_extractor import extract_image_metadata
from veriframe_core.pipeline.pipeline_context import PipelineContext
from veriframe_core.pipeline.stages.base_stage import PipelineStage


class ImportStage(PipelineStage):
    name = "import"

    def execute(self, context: PipelineContext) -> PipelineContext:
        context.assert_not_cancelled()
        self.update(context, 8, "Validating and importing image.")

        metadata = extract_image_metadata(
            context.image_path,
            include_exif=context.request.options.includeExif,
        )
        loaded = load_image(context.image_path)

        context.import_metadata = metadata
        context.loaded_image = loaded
        context.image = ImageMetadata(
            imageId=f"img_{metadata.sha256[:16]}",
            fileName=metadata.filename,
            sha256=metadata.sha256,
            mimeType=metadata.mimeType,
            width=metadata.width,
            height=metadata.height,
            sizeBytes=metadata.sizeBytes,
            exifPresent=metadata.exifPresent,
        )
        context.stage_outputs[self.name] = metadata.model_dump()
        return context
