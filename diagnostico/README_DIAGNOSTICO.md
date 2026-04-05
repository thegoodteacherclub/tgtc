# Integración mínima - Ruta oculta `/diagnostico`

## Estructura añadida al repo web
- `diagnostico/index.html`
- `diagnostico/diagnostico.css`
- `diagnostico/js/config.js`
- `diagnostico/js/api.js`
- `diagnostico/js/questions.js`
- `diagnostico/js/scoring.js`
- `diagnostico/js/app.js`
- `diagnostico/apps-script/Config.gs`
- `diagnostico/apps-script/Sheets.gs`
- `diagnostico/apps-script/Scoring.gs`
- `diagnostico/apps-script/Code.gs`
- `diagnostico/apps-script/Setup.gs`
- `diagnostico/apps-script/README.md`
- `robots.txt`

## Pasos de integración
1. Despliega el backend de `diagnostico/apps-script/` como Web App y copia la URL `/exec`.
2. Edita `diagnostico/js/config.js` y reemplaza `APPS_SCRIPT_URL`.
3. Publica el repo en GitHub Pages como siempre.
4. Abre `https://TU_DOMINIO/diagnostico/` (ruta directa).

## Notas de privacidad/indexación
- La página incluye meta `noindex`.
- `robots.txt` marca `/diagnostico` como `Disallow`.
- No hay enlaces desde home, navbar, footer ni CTAs públicos.

## Flujo de prueba
1. Alta manual en hoja `accesos` con `email`, `codigo`, `estado=activo`.
2. Entrar en `/diagnostico/`.
3. Validar acceso con email + código.
4. Completar pasos A-H.
5. Revisar que:
   - se guarda en `respuestas`,
   - se crea fila en `resultados`,
   - se renderiza el informe final en pantalla.
6. Probar `Cerrar sesión` y volver a entrar.
