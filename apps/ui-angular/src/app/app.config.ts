import { ApplicationConfig } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideHttpClient, withFetch } from "@angular/common/http";
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling
} from "@angular/router";

import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        scrollPositionRestoration: "top"
      })
    ),
    provideHttpClient(withFetch()),
    provideAnimations()
  ]
};
