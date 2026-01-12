# Planning Poker - Backend

Backend de Node.js con Express y Socket.IO para la aplicación de Planning Poker.

## Instalación

```bash
npm install
```

## Desarrollo Local

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:3001`

## Producción con PM2

### 1. Instalar PM2 (si no lo tienes)

```bash
npm install -g pm2
```

### 2. Iniciar el servidor con PM2

```bash
pm2 start server.js --name "planning-poker-backend"
```

### 3. Comandos útiles de PM2

```bash
# Ver estado de los procesos
pm2 status

# Ver logs en tiempo real
pm2 logs planning-poker-backend

# Reiniciar el servidor
pm2 restart planning-poker-backend

# Detener el servidor
pm2 stop planning-poker-backend

# Eliminar del PM2
pm2 delete planning-poker-backend

# Guardar configuración para auto-inicio
pm2 save
pm2 startup
```

## Variables de Entorno

- `PORT`: Puerto del servidor (por defecto: 3001)

## Estructura

- `server.js`: Servidor principal con Express y Socket.IO
- `uploads/`: Carpeta para imágenes subidas
- `users.htpasswd`: Archivo de autenticación (no subir a git)

## Autenticación

El servidor usa autenticación básica con `.htpasswd`. Usuario por defecto:
- **Usuario**: `admin`
- **Contraseña**: `password`

Para cambiar la contraseña, genera un nuevo hash con bcrypt y actualiza `users.htpasswd`.
