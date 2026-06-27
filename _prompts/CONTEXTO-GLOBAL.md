# MecánicaPro — Contexto Global
# Pegar al inicio de CUALQUIER conversación nueva

## Proyecto
Sistema de gestión para talleres automotrices chilenos.
Cliente: Integral Automotriz SPA, Valparaíso, Chile.
SaaS futuro para otros talleres chilenos.

## URLs
- Producción: https://garage16valve-cell.github.io/mecanicapro/
- Repo: https://github.com/garage16valve-cell/mecanicapro
- Local: C:\Users\camil\Downloads\Gestion de taller\
- WhatsApp taller: +569 5165 5331
- Agendamiento: https://integral-automotriz-spa.reservio.com/booking

## Arquitectura
HTML estático en GitHub Pages. Sin backend.
Migración futura a Railway/Render + Flow/WebPay.

## Estructura de archivos
index.html              → archivo principal
css/styles.css          → estilos globales
js/main.js              → navegación y funciones globales
js/main-selectores.js   → selectores inteligentes
js/taller-lista.js      → listado de OTs
js/taller-formulario.js → formulario nueva/editar OT
js/taller-detalle.js    → vista detalle OT
js/taller-servicios.js  → servicios dentro de OT
js/taller-repuestos.js  → repuestos dentro de OT
js/taller-pago.js       → cobro y pago de OT
js/admin-kpis.js        → KPIs y dashboard admin
js/admin-config.js      →