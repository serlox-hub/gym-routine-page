# AltServer-Linux en Raspberry Pi — Solicitud de Plan
 
Quiero instalar y configurar **AltServer-Linux** en una **Raspberry Pi** (siempre encendida, conectada por cable a mi router doméstico) para hacer sideloading automático de una app iOS en mi iPhone.
 
## Objetivo
 
Que la app re-firme automáticamente cada 7 días sin intervención manual, aprovechando que el iPhone se conecta a la misma red WiFi doméstica.
 
## Contexto técnico
 
- Raspberry Pi con Linux (confirmar modelo/OS durante el plan)
- iPhone en la misma red local (RPi por cable, iPhone por WiFi)
- Apple ID gratuito (free developer account)
- El `.ipa` de la app ya está disponible
- Repo de referencia: `github.com/NyaMisty/AltServer-Linux`
 
## Alcance del plan
 
1. Requisitos previos y dependencias en la RPi
2. Instalación de AltServer-Linux
3. Configuración del Apple ID
4. Instalación del `.ipa` en el iPhone
5. Configurar AltServer como servicio systemd (arranque automático)
6. Verificar que la re-firma automática funciona correctamente
7. Troubleshooting común
 