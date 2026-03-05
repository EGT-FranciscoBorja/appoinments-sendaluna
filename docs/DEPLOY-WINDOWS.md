# Deploy en Windows (error resvg.wasm?module)

Si al hacer `npm run deploy` aparece:

```text
Missing file or directory: ...\something-resvg.wasm?module
```

es un problema conocido de **OpenNext + Wrangler en Windows** con módulos WASM (Next.js incluye resvg para generación de imágenes/OG).

## Opciones

### 1. Desplegar desde WSL (recomendado)

OpenNext indica que en Windows puede haber fallos; en WSL suele funcionar bien.

1. Instala [WSL](https://docs.microsoft.com/en-us/windows/wsl/install) si no lo tienes.
2. En WSL, clona o accede al repo, instala dependencias y despliega:

   ```bash
   cd /mnt/c/Users/TuUsuario/Documents/apoinments
   npm ci
   npm run deploy
   ```

### 2. Limpiar y volver a desplegar

Prueba primero un deploy limpio (borra `.wrangler` y `.open-next` y vuelve a construir):

```bash
npm run deploy:clean
```

### 3. Actualizar Wrangler

A veces una versión más nueva de Wrangler mejora el manejo de WASM:

```bash
npm install wrangler@latest -D
npm run deploy
```

### 4. CI/CD

Si usas GitHub Actions u otro CI en Linux, el deploy desde ahí no suele tener este error.
