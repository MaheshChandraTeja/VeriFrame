# Testing VeriFrame

## Engine tests

```powershell
pnpm test:engine
```

## Angular tests

```powershell
pnpm --filter @veriframe/ui-angular test
```

## Tauri check

```powershell
pnpm --filter @veriframe/desktop-tauri check
```

## Full gate

```powershell
pnpm test:engine
pnpm --filter @veriframe/ui-angular test
pnpm --filter @veriframe/desktop-tauri check
```
