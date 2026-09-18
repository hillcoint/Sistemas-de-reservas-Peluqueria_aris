# Aris Beauty · Sistema de reservas

Aplicación web sencilla para gestionar la agenda de un centro de peluquería, belleza, estética y uñas.

## Funciones

- Agenda diaria con selector de fecha.
- Alta, edición y eliminación de reservas.
- Seis cabinas y cuatro profesionales.
- Catálogo de tratamientos con duración y precio.
- Compatibilidad de cabinas y equipamiento por tratamiento.
- Asignación automática de profesional y cabina disponibles.
- Control de solapamientos por cabina y profesional.
- Panel de ocupación por cabina y vista diaria por profesional.
- Política de cancelación visible en el formulario.
- Resumen diario preparado para compartir por WhatsApp.
- Estados de reserva: confirmada o pendiente.
- Datos guardados en `localStorage`, sin servidor ni base de datos.
- Diseño adaptable a móvil y ordenador.

## Desarrollo con React/Vite

```bash
npm install
npm run dev
```

El proyecto está estructurado para poder importarlo desde Lovable. Los cambios enviados a `main` se compilan y publican mediante GitHub Actions.

Para la primera publicación, configura **Settings → Pages → Source: GitHub Actions**.

> Los datos se guardan únicamente en el navegador y dispositivo desde el que se utiliza la aplicación.
