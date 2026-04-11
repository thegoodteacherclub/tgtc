# The Good Teacher Club | Generador de actividad de actualidad (GitHub Pages)

Versión MVP en **HTML + CSS + JavaScript** para publicar directamente en GitHub Pages.

## Qué hace

- Formulario didáctico completo por bloques.
- Validación clara de campos (incluye regla: texto o URL).
- Análisis de enlace con vista previa editable.
- Generación de actividad con JSON estructurado.
- Pantalla de resultados con pestañas:
  - Actividad lista
  - Visión general
  - Secuencia
  - Materiales
  - Evaluación
  - Dimensiones metodológicas
- Copiar resultado completo / secuencia / dimensiones.
- Exportar resultado a `.docx`.
- Imprimir o exportar a PDF desde el navegador.
- Regenerar manteniendo los mismos datos.
- Persistencia del formulario en `localStorage`.

## Importante sobre GitHub Pages

GitHub Pages no ejecuta backend. Por eso esta versión:

- mantiene frontend estático en GitHub Pages;
- usa un backend mínimo en Cloudflare Worker para llamar a OpenAI;
- guarda la `OPENAI_API_KEY` como secreto del Worker (no en el frontend).

## Publicar en GitHub Pages

1. Sube estos archivos al repositorio (`index.html`, `styles.css`, `app.js`, `README.md`).
2. En GitHub entra a `Settings > Pages`.
3. En `Build and deployment` selecciona:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main` (root)
4. Guarda y espera el despliegue.
5. Tu web quedará accesible en la URL de Pages.

## Uso

1. Abre la web publicada.
2. Edita `app.js` y coloca tu URL de Worker en:
   - `const API_PROXY_URL = "PEGA_AQUI_TU_URL_DE_WORKER";`
3. Completa el formulario.
4. Si añades URL, usa `Analizar enlace` y revisa la vista previa.
5. Pulsa `Generar actividad`.

## Configurar Cloudflare Worker (seguro)

1. Instala Wrangler:

```bash
npm install -g wrangler
```

2. Entra en la carpeta del worker:

```bash
cd worker
```

3. Inicia sesión en Cloudflare:

```bash
wrangler login
```

4. Ajusta el origen permitido en `worker/wrangler.toml`:
   - `FRONTEND_ORIGIN = "https://TU_USUARIO.github.io"`

5. Crea el secreto con tu API key:

```bash
wrangler secret put OPENAI_API_KEY
```

6. Despliega:

```bash
wrangler deploy
```

7. Copia la URL desplegada (por ejemplo `https://tgtc-activity-proxy.xxx.workers.dev`) y pégala en `app.js`:
   - `const API_PROXY_URL = "https://...workers.dev"`

## Seguridad

- No subas nunca tu `OPENAI_API_KEY` al frontend.
- Si alguna vez estuvo en `app.js`, revócala y crea una nueva.

## Recomendación profesional

Si más adelante quieres máxima seguridad, conviene mover la llamada a OpenAI a backend (Vercel/Cloudflare/Render). Para esta fase, esta versión te permite trabajar en GitHub Pages como pediste.
