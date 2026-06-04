# IMDAC · Club de Miembros

Sitio del miembro (visualización) — Instituto Mexicano de Arquitectura y Construcción.
Stack: HTML/CSS/JS vanilla + Firebase Auth + Firestore. Deploy en GitHub Pages.

## Archivos
- `index.html` — estructura + estilos
- `app.js` — lógica (auth, router, secciones, herramientas, drip, jsPDF)
- `assets/logo-imdac.png` — logo

## Configurar antes de subir
1. En `app.js` reemplaza `firebaseConfig` con las credenciales reales del proyecto Firebase de IMDAC.
2. En `app.js`, objeto `IMDAC`: pon el cupón real, el WhatsApp de soporte y el enlace del canal.
3. Mientras `apiKey` contenga "REEMPLAZAR", el sitio corre en **modo demo** (login simulado + datos de ejemplo). Útil para revisar diseño sin Firebase.

## Colecciones Firestore esperadas
- `cursos` (titulo, categoria, nivel, clases, dripDias, desc, img)
- `webinars` (titulo, fecha, fechaISO, grabacion, img)
- `noticias` (titulo, fuente, resumen, fecha, img, url)
- `material` (titulo, desc, url)
- `foro_temas` (titulo, texto, autor, tag, fecha, vistas, likes)
- `progreso` (uid, cursoId, porcentaje)
- `miembros` (nombre, email, telefono, ciudad, profesion, bio)
- `admins/{uid}` — si existe, el usuario ve todos los cursos (salta drip)

## Drip (liberación por goteo)
`dripDias` por curso se compara con la antigüedad del usuario (creationTime). 0 = abierto.

## Deploy
Sube los 3 archivos + carpeta `assets/` al repo de GitHub Pages del miembro.
