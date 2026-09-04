# Configuración Manual de Clerk

Este documento describe los pasos de configuración manual necesarios en el Dashboard de Clerk para que la aplicación funcione correctamente con Organizations.

## 1. Configurar URLs de Redirección

### ✅ Configuración Implementada en el Código

La redirección después de sign-in/sign-up está configurada directamente en el código en `app/layout.tsx`:

```typescript
<ClerkProvider
  signInFallbackRedirectUrl="/"
  signUpFallbackRedirectUrl="/"
  afterSignInUrl="/"
  afterSignUpUrl="/"
  ...
>
```

Esto asegura que **SIEMPRE** redirija a tu aplicación (`/`) después de cualquier autenticación, ya sea:
- Login directo en `/sign-in`
- Aceptar invitación desde email
- Crear cuenta desde invitación

### Paths (Rutas) - Opcional
**NO es necesario** configurar nada en el Dashboard de Clerk para desarrollo. El código ya maneja todas las redirecciones.

Para producción (opcional), puedes ir a **Configure → Paths** en el Dashboard y configurar:
- **Sign-in path**: `/sign-in`
- **Sign-up path**: `/sign-in`

Pero **NO** es obligatorio para que funcione.

## 2. Habilitar Organizations

### Paso 1: Activar Organizations
1. Ve a tu **Clerk Dashboard**: https://dashboard.clerk.com
2. Selecciona tu aplicación
3. Ve a **Configure** → **Organizations**
4. Activa el toggle **Enable Organizations**

### Paso 2: Configurar Settings
- **Organization name**: Requerido
- **Allow members to leave**: Desactivado (para que solo admins gestionen membresías)
- **Allow members to delete**: Desactivado

## 3. Configurar Roles de Organización

> **IMPORTANTE**: `org:admin`/`org:member` son roles de **identidad de Clerk**
> (quién puede invitar gente y administrar la organización), no los roles de
> negocio de la aplicación. Los permisos reales — qué puede ver y hacer cada
> persona dentro del sistema (Tecnología, Gerente General, Gerente de
> Proyecto, Jefe de Obra, Compras) — se administran aparte, desde
> **Configuración → Equipo** dentro de la app, y viven en la base de datos
> del backend (`src/core/permissions.py`). Un `org:admin` de Clerk no tiene
> automáticamente acceso a todo el sistema: el único efecto especial de
> `org:admin` es que, si la empresa todavía no tiene ningún usuario con rol
> "Tecnología", el primer `org:admin` que inicia sesión es promovido a
> Tecnología para poder empezar a asignar roles al resto del equipo.

En **Configure** → **Organizations** → **Roles**, asegúrate de tener estos roles:

### Roles Predeterminados
- `org:admin` - Administrador
  - Puede invitar miembros
  - Puede gestionar la organización
  - Puede crear proyectos
  
- `org:member` - Miembro
  - Solo puede ver y trabajar en proyectos asignados
  - No puede invitar a otros usuarios

## 4. JWT Template (Opcional)

> **NOTA**: El backend ya está configurado para leer el `org_id` del objeto compacto `o` que Clerk incluye por defecto en el JWT. Solo necesitas crear un JWT template personalizado si quieres tener claims adicionales o un formato diferente.

Si deseas crear un template personalizado:

1. Ve a **Configure** → **JWT Templates**
2. Haz clic en **+ New template**
3. Configura:
   - **Name**: `default`
   - **Claims**:
   ```json
   {
     "org_id": "{{org.id}}",
     "org_role": "{{org.role}}",
     "org_slug": "{{org.slug}}"
   }
   ```
4. Guarda el template

## 5. Crear la Primera Organización

### Desde el Dashboard de Clerk:
1. Ve a **Organizations** en el menú lateral
2. Haz clic en **+ Create organization**
3. Completa:
   - **Name**: Nombre de la empresa cliente (ej: "Grupo Zenit")
   - **Slug**: Se genera automáticamente (ej: "grupo-zenit")
4. Guarda la organización

## 6. Invitar al Primer Usuario (Admin)

### Opción A: Desde el Dashboard de Clerk
1. Ve a la organización creada
2. Haz clic en **Members**
3. Haz clic en **+ Invite member**
4. Completa:
   - **Email**: correo del primer usuario
   - **Role**: `org:admin`
5. El usuario recibirá un email con un link para crear su cuenta

### Opción B: Desde la Aplicación (una vez configurada)
1. El primer admin puede usar la página **Configuración → Equipo**
2. Hacer clic en **Invitar Miembro**
3. Ingresar email y seleccionar rol
4. La invitación se envía automáticamente

## 7. Variables de Entorno

Asegúrate de tener estas variables en tu archivo `.env.local`:

```bash
# Frontend (.env.local)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Backend (.env)
CLERK_SECRET_KEY=sk_test_...
```

## 8. Flujo de Onboarding para Nuevos Usuarios

### Usuario Admin (Primero de la Organización)
1. Recibe invitación por email
2. Crea su contraseña
3. Es redirigido a `/` (home de la app)
4. Se le pide crear el primer proyecto
5. Una vez creado, puede acceder al dashboard

### Usuarios Miembros (Invitados después)
1. Reciben invitación por email
2. Crean su contraseña
3. Son redirigidos a `/` (home de la app)
4. Ven un mensaje: "El administrador aún no ha creado proyectos"
5. Esperan a que el admin cree al menos un proyecto
6. Una vez que existe un proyecto, pueden acceder al dashboard

## 9. Verificación de Configuración

Para verificar que todo está configurado correctamente:

1. **Cierra sesión** en tu aplicación
2. **Limpia las cookies** del navegador
3. Inicia sesión nuevamente
4. Abre la consola del navegador y ejecuta:
   ```javascript
   // Deberías ver el token con org_id
   console.log(await window.Clerk.session.getToken())
   ```
5. Copia el token y pégalo en https://jwt.io
6. Verifica que el payload incluya:
   - `sub`: ID del usuario
   - `o.id` o `org_id`: ID de la organización
   - `o.rol` o `org_role`: Rol del usuario

## 10. Solución de Problemas

### Error: "403 Forbidden"
- Verifica que el usuario esté en una organización
- Verifica que el JWT incluya el `org_id` o el objeto `o`
- Reinicia el backend después de cambios en Clerk

### Error: "No se encontró ID de organización"
- Asegúrate de que Organizations esté habilitado
- Verifica que el usuario sea miembro de al menos una organización
- El `OrganizationProvider` debe establecer la organización activa

### Usuario no redirigido después de sign-up
- Verifica las URLs en **Configure → Paths**
- Asegúrate de que `fallbackRedirectUrl` esté configurado en el componente `<SignIn>`
- Verifica que el middleware en `proxy.ts` no esté bloqueando la redirección

### Modal de crear proyecto aparece para usuarios no-admin
- Verifica que el rol del usuario sea correcto en Clerk
- El código ahora verifica `membership?.role === "org:admin"` antes de mostrar el modal
- Los usuarios no-admin verán un mensaje de espera

## 11. Mantenimiento

### Agregar un Nuevo Cliente
1. Crear organización en Clerk Dashboard
2. Invitar al primer usuario como `org:admin`
3. El admin crea el primer proyecto al ingresar
4. El admin puede invitar a más usuarios desde **Configuración → Equipo**

### Cambiar Rol de un Usuario
1. Ve a **Organizations** en Clerk Dashboard
2. Selecciona la organización
3. Haz clic en **Members**
4. Encuentra al usuario y cambia su rol

### Eliminar un Usuario
1. Ve a **Organizations** en Clerk Dashboard
2. Selecciona la organización
3. Haz clic en **Members**
4. Encuentra al usuario y haz clic en **Remove**

---

## ✅ Checklist de Configuración

- [ ] Organizations habilitado
- [ ] Roles `org:admin` y `org:member` configurados
- [ ] URLs de redirección configuradas (`/` como after sign-in/sign-up)
- [ ] Variables de entorno configuradas
- [ ] Primera organización creada
- [ ] Primer usuario admin invitado
- [ ] Usuario admin puede crear proyectos
- [ ] Usuarios miembros ven mensaje de espera si no hay proyectos
- [ ] Invitaciones funcionan desde la app
