type ClassDictionary = Readonly<Record<string, boolean | null | undefined>>;
export type ClassValue =
  | string
  | false
  | null
  | undefined
  | ClassDictionary
  | readonly ClassValue[];

export function classNames(...values: readonly ClassValue[]): string {
  const classes: string[] = [];

  const append = (value: ClassValue): void => {
    if (!value) {
      return;
    }

    if (typeof value === "string") {
      classes.push(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }

    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) {
        classes.push(key);
      }
    }
  };

  values.forEach(append);

  return classes.join(" ");
}
