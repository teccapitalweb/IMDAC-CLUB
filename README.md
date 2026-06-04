# IMDAC · Panel de Administración

Panel de gestión del Club IMDAC. Escribe en las **mismas colecciones Firestore** que lee el Club, así que todo lo que cargues aquí aparece en el sitio del miembro.

## Archivos
- `index.html` — estructura + estilos
- `app.js` — lógica (auth admin, CRUD, modales)
- `assets/logo-imdac.png` — logo

## Conectar (IMPORTANTE)
1. Usa **la misma** `firebaseConfig` que pusiste en el Club (mismo proyecto Firebase). Reemplázala en `app.js`.
2. Crea la colección `admins` en Firestore y agrega un documento con el **UID** de cada administrador (el ID del doc = UID del usuario). Sin esto, nadie entra al panel.
3. Mientras `apiKey` diga "REEMPLAZAR", corre en **modo demo**:
   - Login demo: `admin@imdac.mx` / `IMDACAdmin2026`
   - El CRUD funciona en memoria (no persiste) para que pruebes el flujo.

## Colecciones que gestiona
`cursos`, `webinars`, `noticias`, `material`, `foro_temas` (moderación), `miembros` (lectura + borrar), `notificaciones`, `config/app` (mantenimiento + contacto).

### Estructura de `cursos`
titulo, categoria, nivel, dripDias, img, desc, **listaClases** [{titulo, duracion, videoUrl}], clases (auto = nº de clases).

## Deploy
Repo aparte del Club. Sube index.html + app.js + assets/ a la raíz del repo de GitHub Pages del admin.

> Recomendación: el repo del admin como **privado** o con URL no pública. La seguridad real la dan las reglas de Firestore + la colección `admins`.
