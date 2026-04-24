# Audiolibres — Guía de despliegue en Vercel

Esta carpeta contiene todo lo necesario para publicar tu sitio en Vercel gratis.

## Estructura

- `index.html` — Landing page pública (inicio)
- `app.html` — Aplicación del reproductor (accesible en `/app`)
- `vercel.json` — Configuración de Vercel (clean URLs activadas)

El flujo es: usuario llega a tu dominio → ve la landing → pulsa "Empezar" → va al reproductor.

## Método 1 — Vercel CLI (el más rápido: 2 minutos)

**Requisito:** tener Node.js instalado. Si no lo tienes, descárgalo de https://nodejs.org (versión LTS).

1. Abre Terminal (Mac) o PowerShell (Windows)
2. Instala la CLI de Vercel (solo la primera vez):
   ```
   npm install -g vercel
   ```
3. Entra en esta carpeta:
   ```
   cd ruta/a/audiolibros-vercel
   ```
4. Ejecuta:
   ```
   vercel
   ```
5. Sigue las preguntas:
   - "Set up and deploy?" → **Y**
   - "Which scope?" → tu cuenta personal
   - "Link to existing project?" → **N**
   - "What's your project's name?" → `audiolibros` (o lo que quieras)
   - "In which directory is your code located?" → **./** (pulsa Enter)
   - "Want to modify settings?" → **N**

En ~30 segundos te dará una URL tipo `https://audiolibros-xxx.vercel.app`. ¡Listo!

Para futuros cambios, solo vuelve a ejecutar `vercel --prod` en esta carpeta.

---

## Método 2 — GitHub + Vercel (sin terminal)

1. Crea una cuenta en https://github.com (si no tienes)
2. Crea un repositorio nuevo:
   - Click en "+" arriba a la derecha → "New repository"
   - Nombre: `audiolibros`
   - Public
   - Click "Create repository"
3. En la página del repo, click "uploading an existing file"
4. Arrastra los archivos `index.html` y `vercel.json` de esta carpeta
5. Click "Commit changes"
6. Ahora ve a https://vercel.com/new
7. "Import Git Repository" → elige tu repo `audiolibros`
8. Click "Deploy" (no necesitas cambiar ningún ajuste)

En ~1 minuto tienes tu URL pública.

---

## Método 3 — Alternativa súper rápida: Netlify Drop

Si prefieres el camino de menos fricción (sin Node, sin GitHub, sin cuentas previas):

1. Ve a https://app.netlify.com/drop
2. Arrastra la carpeta `audiolibros-vercel` entera sobre la zona de drop
3. Listo — URL inmediata tipo `https://random-name.netlify.app`

Netlify y Vercel son muy parecidos en calidad. Netlify solo gana en lo "drag-and-drop".

---

## Dominio propio (opcional)

Una vez desplegado en Vercel:

1. Dashboard de Vercel → tu proyecto → "Settings" → "Domains"
2. Añade el dominio que hayas comprado (ej. `misaudiolibros.com`)
3. Vercel te dará los registros DNS a configurar en tu registrar (Namecheap, GoDaddy, Google Domains, etc.)
4. En ~10 minutos la app vive en tu dominio

Vercel incluye HTTPS/SSL gratis y automático.

---

## Problemas frecuentes

**"Autoplay sigue sin funcionar"**: ya no debería pasar en Vercel porque el origen deja de ser `null`. Si aún así ves algo raro, prueba un click manual en el reproductor la primera vez.

**"Quiero editar y redesplegar"**: edita el `index.html`, guarda, y:
- Método 1: ejecuta `vercel --prod`
- Método 2: sube el archivo actualizado al repo (Vercel redespliega solo)

**"Quiero borrar el deploy"**: desde el dashboard de Vercel, Settings → Delete Project.
