# Documentación del Proyecto - Solar Projects Management

Sistema de gestión de reportes diarios para proyectos de instalación solar fotovoltaica.

---

## 📚 Documentación Disponible

### Para Desarrolladores Backend

1. **[API_BACKEND.md](./API_BACKEND.md)** - Especificación completa de la API
   - Todos los endpoints con request/response
   - Query parameters y filtros
   - Tipos enumerados
   - Códigos de error
   - Fórmulas de cálculo

2. **[BACKEND_SETUP.md](./BACKEND_SETUP.md)** - Guía técnica de implementación
   - Configuración de CORS (CRÍTICO)
   - Conversión camelCase/snake_case
   - Modelos de base de datos SQL
   - Lógica de cálculos (avance, TRIR/LTIR)
   - Generación de PDFs
   - Envío de emails
   - Almacenamiento de archivos
   - Variables de entorno
   - Estructura del proyecto
   - Testing

### Para Equipo Frontend

3. **[FRONTEND.md](./FRONTEND.md)** - Arquitectura del frontend
   - Stack tecnológico
   - Estructura del proyecto
   - Flujo de la aplicación
   - Hooks disponibles
   - Ponderaciones de cálculo

---

## 🎯 Inicio Rápido para Backend

### 1. Leer Documentación
```bash
1. Empezar por API_BACKEND.md (endpoints y contratos)
2. Continuar con BACKEND_SETUP.md (implementación técnica)
3. Revisar código del frontend en /lib/api para ver cómo consume la API
```

### 2. Puntos Críticos

⚠️ **OBLIGATORIO antes de comenzar:**
- Configurar **CORS** (sin esto, el frontend no funcionará)
- Respuestas en **camelCase** (no snake_case)
- Fechas en formato **ISO 8601**
- UUIDs como **strings**

### 3. Orden de Implementación Sugerido

**Fase 1 - Setup básico:**
1. Configurar proyecto FastAPI con CORS
2. Conectar base de datos (PostgreSQL)
3. Crear modelos básicos (Company, User, Project)
4. Implementar endpoints de onboarding

**Fase 2 - CRUD básico:**
5. Endpoints de Proyectos
6. Endpoints de Línea Base
7. Endpoints de Equipo
8. Endpoints de Maquinaria

**Fase 3 - Reportes:**
9. CRUD de reportes diarios
10. Upload de imágenes
11. Generación de PDFs
12. Envío de emails

**Fase 4 - Dashboard:**
13. Cálculo de avance del proyecto
14. Cálculo de TRIR/LTIR
15. Historial de personal
16. Estadísticas agregadas

---

## 📊 Fórmulas Críticas

### Avance del Proyecto
```
Ponderaciones:
- Hincado: 15%
- Trackers: 20%
- Módulos: 10%
- Cable BT/AC: 25%
- Cable BT/CC: 20%
- Cable MT: 5%
- Inversores: 5%

Avance Total = Σ(Avance_Actividad × Peso) / 100
```

### Indicadores de Seguridad
```
TRIR = (Incidentes + Accidentes) × 200,000 / Horas trabajadas
LTIR = Accidentes con lesión × 200,000 / Horas trabajadas
```

Ver detalles completos en `BACKEND_SETUP.md`.

---

## 🔗 Integración Frontend-Backend

### Configuración Frontend
El frontend está configurado para conectarse a:
```
http://localhost:8000/api/v1
```

Configurar en `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Probar Integración
1. Levantar backend: `uvicorn app.main:app --reload --port 8000`
2. Levantar frontend: `npm run dev` (puerto 3000)
3. Abrir `http://localhost:3000`
4. Completar wizard de onboarding
5. Frontend hará requests al backend automáticamente

---

## 🛠️ Stack Tecnológico

### Frontend (Ya implementado)
- Next.js 14 + React 18
- TypeScript
- Tailwind CSS
- Context API para estado
- Recharts para gráficos

### Backend (A implementar)
- Python 3.10+
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic (migraciones)
- ReportLab (PDFs)
- FastAPI-Mail (emails)

---

## 📧 Contacto y Soporte

Para preguntas sobre:
- **Endpoints esperados:** Ver `API_BACKEND.md`
- **Implementación técnica:** Ver `BACKEND_SETUP.md`
- **Flujo de la aplicación:** Ver `FRONTEND.md`
- **Código del frontend:** Revisar `/components` y `/lib/api`

---

## ✅ Checklist de Entrega

### Para Backend Team
- [x] Especificación de API completa
- [x] Guía de implementación técnica
- [x] Modelos de base de datos
- [x] Lógica de cálculos
- [x] Ejemplos de código
- [ ] Acceso al código del frontend
- [ ] Variables de entorno configuradas

### Para comenzar
1. Clonar repositorio
2. Revisar los 3 documentos en orden
3. Configurar ambiente de desarrollo
4. Implementar endpoints según prioridad
5. Testear integración con frontend

---

**Versión:** 1.0  
**Última actualización:** Septiembre de 2026

