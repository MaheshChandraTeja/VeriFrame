# VeriFrame Core

Python engine for VeriFrame. This module provides the local API, CLI, configuration, logging, runtime registries, and Pydantic contracts.

It intentionally does not implement image import, model loading, or full inference yet. Those arrive in Modules 5 and 6. This module gives them somewhere sane to live, which is already more architectural discipline than many production apps receive in their entire tragic lifespan.
