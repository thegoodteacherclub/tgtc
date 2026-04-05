# Apps Script - Diagnóstico TGTC

## Archivos
- `Config.gs`: configuración principal.
- `Sheets.gs`: helpers de lectura/escritura.
- `Scoring.gs`: motor de interpretación cualitativa.
- `Code.gs`: API `doPost` + flujo de sesión.
- `Admin.gs`: menú en Google Sheets + utilidades de administración.

## Estructura de Google Sheets

### Hoja `accesos`
Columnas exactas:
`email | codigo | nombre | estado | cohorte | fecha_inicio | fecha_fin | un_solo_uso | usado | notas`

Valores recomendados:
- `estado`: `activo`, `inactivo` o `bloqueado`
- `un_solo_uso`: `TRUE/FALSE`
- `usado`: `TRUE/FALSE`
- `fecha_inicio` y `fecha_fin`: formato fecha u ISO

### Hoja `sesiones`
Columnas exactas:
`token | email | creado | expira | activo | ip_opcional | user_agent_opcional`

### Hoja `respuestas`
Columnas exactas:
`email | session_token | bloque | pregunta_id | respuesta | timestamp`

### Hoja `resultados`
Columnas exactas:
`email | session_token | resultado_json | resumen_texto | fortalezas | prioridades | creado`

## Despliegue
0. (Una sola vez) Ejecuta `setupDiagnosticoSheetsOnce()` para crear las hojas y cabeceras.
1. Crea un proyecto nuevo en Google Apps Script.
2. Copia estos 5 archivos `.gs`.
3. En `Config.gs`, reemplaza `SPREADSHEET_ID`.
4. Deploy > New deployment > Web app.
5. Ejecutar como: `Me`.
6. Acceso: `Anyone`.
7. Copia la URL `/exec`.

## Menú en Google Sheets
Cuando abras el Spreadsheet, verás el menú **Diagnóstico TGTC** con:
- `Preparar estructura (una sola vez)`: ejecuta `setupDiagnosticoSheetsOnce()`.
- `Generar códigos faltantes`: crea código en `accesos` para filas con email y sin código.

## Endpoints por `action`
- `validarAcceso(email, codigo)` -> crea sesión y devuelve token.
- `validarSesion(token)` -> valida token activo.
- `guardarRespuesta(token, bloque, respuestas)` -> guarda por bloque.
- `enviarDiagnosticoFinal(token, respuestas)` -> calcula y guarda resultado.
- `obtenerResultado(token)` -> recupera resultado final.
- `logoutSesion(token)` -> inactiva sesión.
