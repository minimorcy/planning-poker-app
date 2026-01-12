# Planning Poker - Frontend

Frontend de React + TypeScript con Socket.IO para la aplicación de Planning Poker.

## Instalación

```bash
npm install
```

## Desarrollo Local

```bash
npm run dev
```

La aplicación se abrirá en `http://localhost:5173`

## Build para Producción

### 1. Compilar la aplicación

```bash
npm run build
```

Esto generará la carpeta `dist/` con los archivos optimizados.

### 2. Subir al servidor

Sube el contenido de la carpeta `dist/` a tu servidor web (Apache/Nginx).

**Ejemplo con SCP:**
```bash
scp -r dist/* usuario@servidor:/ruta/a/tu/dominio/
```

**Ejemplo con FTP:**
- Conecta a tu servidor por FTP
- Sube todo el contenido de `dist/` a la carpeta pública de tu dominio

### 3. Configurar el servidor web

Asegúrate de que Apache/Nginx esté configurado para:
- Servir los archivos estáticos de `dist/`
- Redirigir `/api/*` al backend (puerto 3001)
- Redirigir `/socket.io/*` al backend (puerto 3001)
- Redirigir `/uploads/*` al backend (puerto 3001)

Ver [deployment_guide.md](../deployment_guide.md) para configuración completa.

## Vista Previa del Build

Para probar el build localmente antes de subir:

```bash
npm run preview
```

## Estructura

- `src/App.tsx`: Componente principal con toda la lógica
- `src/App.css`: Estilos de la aplicación
- `dist/`: Carpeta generada con el build (no subir a git)

## Configuración

La aplicación detecta automáticamente si está en desarrollo o producción:
- **Local**: Usa `http://localhost:3001` para el backend
- **Producción**: Usa el mismo dominio (sin puerto) y espera que el servidor web haga proxy
