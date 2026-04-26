import { Injectable, InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";

export interface NativeEvent<T> {
  readonly event: string;
  readonly id: number;
  readonly payload: T;
}

export type TauriListen = <T>(
  eventName: string,
  handler: (event: NativeEvent<T>) => void
) => Promise<() => void>;

export const TAURI_LISTEN = new InjectionToken<TauriListen>("TAURI_LISTEN", {
  providedIn: "root",
  factory: () => async <T>(
    eventName: string,
    handler: (event: NativeEvent<T>) => void
  ): Promise<() => void> => {
    const { listen } = await import("@tauri-apps/api/event");
    return listen<T>(eventName, (event) => {
      handler({
        event: event.event,
        id: event.id,
        payload: event.payload
      });
    });
  }
});

@Injectable({
  providedIn: "root"
})
export class NativeEventsService {
  private readonly listenImpl = inject(TAURI_LISTEN);

  listen<T>(eventName: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      let unlisten: (() => void) | null = null;
      let closed = false;

      this.listenImpl<T>(eventName, (event) => {
        subscriber.next(event.payload);
      })
        .then((dispose) => {
          if (closed) {
            dispose();
            return;
          }

          unlisten = dispose;
        })
        .catch((error: unknown) => subscriber.error(error));

      return () => {
        closed = true;

        if (unlisten) {
          unlisten();
        }
      };
    });
  }

  engineStatusChanged<T>(): Observable<T> {
    return this.listen<T>("engine-status-changed");
  }

  analysisProgress<T>(): Observable<T> {
    return this.listen<T>("analysis-progress");
  }

  analysisComplete<T>(): Observable<T> {
    return this.listen<T>("analysis-complete");
  }

  analysisFailed<T>(): Observable<T> {
    return this.listen<T>("analysis-failed");
  }
}
