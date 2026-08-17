# API Backend - Especificación para FastAPI

## Configuración Base

- **Base URL:** `/api/v1`
- **Autenticación:** Bearer Token (JWT) - *a implementar*
- **Content-Type:** `application/json`

---

## Endpoints

### Empresa

#### `GET /company`
Obtiene datos de la empresa actual.

**Response:**
```json
{
  "id": "uuid",
  "name": "Solar Energy SA",
  "logo": "https://...",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### `POST /company`
Crea la empresa (onboarding).

**Body:**
```json
{
  "name": "Solar Energy SA",
  "logo": "base64 o URL (opcional)"
}
```

#### `PUT /company`
Actualiza datos de la empresa.

#### `POST /company/logo`
Sube logo de la empresa (multipart/form-data).

---

### Proyectos

#### `GET /projects`
Lista todos los proyectos.

**Query params:** `?status=active`

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Instalación Solar Fase 1",
    "companyId": "uuid",
    "team": ["Juan Pérez", "María García"],
    "recipients": ["cliente@email.com"],
    "hasBaseline": true,
    "progress": 45,
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

#### `GET /projects/{id}`
Obtiene un proyecto.

#### `POST /projects`
Crea proyecto.

**Body:**
```json
{
  "name": "Instalación Solar Fase 2",
  "team": ["Usuario 1"],
  "recipients": ["destinatario@email.com"]
}
```

#### `PUT /projects/{id}`
Actualiza proyecto.

#### `DELETE /projects/{id}`
Elimina proyecto.

#### `POST /projects/{id}/team`
Agrega miembros al equipo.

**Body:** `{ "members": ["Nuevo Usuario"] }`

#### `DELETE /projects/{id}/team/{member}`
Elimina miembro del equipo.

#### `POST /projects/{id}/recipients`
Agrega destinatarios de email.

**Body:** `{ "emails": ["nuevo@email.com"] }`

#### `DELETE /projects/{id}/recipients/{email}`
Elimina destinatario.

---

### Línea Base

#### `GET /baselines/{projectId}`
Obtiene la línea base de un proyecto.

**Response (404 si no existe):**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "trackers": {
    "modelo": "Tracker XYZ-2000",
    "cantidad": 500,
    "componentes": [
      { "item": "Hincas", "unidad": "unidades", "cantidad": 2000 },
      { "item": "Soportes", "unidad": "unidades", "cantidad": 1000 },
      { "item": "Rodamientos", "unidad": "unidades", "cantidad": 500 },
      { "item": "Tubos", "unidad": "unidades", "cantidad": 1500 },
      { "item": "Purlins", "unidad": "unidades", "cantidad": 6000 },
      { "item": "Motor", "unidad": "unidades", "cantidad": 500 },
      { "item": "Amortiguador", "unidad": "unidades", "cantidad": 500 },
      { "item": "TCU", "unidad": "unidades", "cantidad": 500 }
    ]
  },
  "modulos": 150000,
  "potenciaModulos": 550,
  "potenciaTotal": 82.5,
  "cts": 15,
  "inversores": 30,
  "cableBTAC": 25000,
  "cableBTCC": 30000,
  "cableMT": 5000,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### `POST /baselines/{projectId}`
Crea o actualiza (upsert) la línea base.

---

### Reportes Diarios

#### `GET /reports`
Lista reportes con filtros.

**Query params:**
- `projectId` - Filtrar por proyecto
- `activityCategory` - Filtrar por categoría de actividad
- `startDate` - Fecha inicio (YYYY-MM-DD)
- `endDate` - Fecha fin (YYYY-MM-DD)
- `status` - enviado | borrador | archivado
- `page`, `pageSize` - Paginación

**Response:**
```json
[
  {
    "id": "uuid",
    "projectId": "uuid",
    "projectName": "Instalación Solar Fase 1",
    "date": "2024-01-15",
    "isHoliday": false,
    "entryTime": "07:00",
    "exitTime": "17:00",
    "indirectStaff": 5,
    "directStaff": 45,
    "weather": "sunny",
    "hasSuspendedHours": true,
    "suspendedHours": 2,
    "suspendedReason": "Lluvia intensa",
    "hasAccident": false,
    "activities": [
      {
        "id": "uuid",
        "category": "trackers",
        "subActivity": "Montaje",
        "component": "Soportes",
        "description": "Montaje de soportes de trackers",
        "quantity": 50,
        "unit": "unidades",
        "location": "Sector A",
        "workers": 8,
        "observations": "Sin novedades"
      }
    ],
    "tomorrowTasks": ["Continuar montaje sector B"],
    "images": ["https://..."],
    "status": "enviado",
    "createdAt": "2024-01-15T18:00:00Z",
    "createdBy": "uuid"
  }
]
```

#### `GET /reports/{id}`
Obtiene un reporte.

#### `POST /reports`
Crea reporte.

**Body (sin imágenes):**
```json
{
  "projectId": "uuid",
  "date": "2024-01-15",
  "isHoliday": false,
  "entryTime": "07:00",
  "exitTime": "17:00",
  "indirectStaff": 5,
  "directStaff": 45,
  "weather": "sunny",
  "hasSuspendedHours": false,
  "hasAccident": false,
  "activities": [...],
  "tomorrowTasks": [...],
  "status": "enviado"
}
```

**Body con imágenes:** multipart/form-data con campo `data` (JSON) e `images[]`.

#### `PUT /reports/{id}`
Actualiza reporte.

#### `DELETE /reports/{id}`
Elimina reporte.

#### `POST /reports/{id}/send`
Marca reporte como enviado.

#### `GET /reports/{id}/pdf`
Genera PDF del reporte.

**Response:**
```json
{ "url": "https://..." }
```

O retorna el PDF directamente como blob.

#### `POST /reports/{id}/email`
Envía reporte por email.

**Body:**
```json
{
  "recipients": ["opcional@email.com"]
}
```
Si no se envían recipients, usa los configurados en el proyecto.

#### `POST /reports/{id}/images`
Sube imágenes a un reporte (multipart/form-data).

---

### Maquinaria

#### `GET /machinery`
Lista maquinaria.

**Query params:**
- `projectId` - Filtrar por proyecto (usar "none" para sin asignar)
- `status` - activa | baja | all

**Response:**
```json
[
  {
    "id": "uuid",
    "tipo": "Excavadora",
    "marca": "Caterpillar",
    "modelo": "320D",
    "patente": "ABC-123",
    "capacidad": "20 ton",
    "propiedad": "propio",
    "observaciones": "En buen estado",
    "proyectoId": "uuid",
    "proyectoName": "Instalación Solar Fase 1",
    "estado": "activa",
    "companyId": "uuid",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### `POST /machinery`
Crea maquinaria.

**Body:**
```json
{
  "tipo": "Excavadora",
  "marca": "Caterpillar",
  "modelo": "320D",
  "patente": "ABC-123",
  "capacidad": "20 ton",
  "propiedad": "propio",
  "observaciones": "",
  "proyectoId": "uuid o null"
}
```

#### `PUT /machinery/{id}`
Actualiza maquinaria.

#### `DELETE /machinery/{id}`
Elimina maquinaria.

#### `POST /machinery/{id}/assign`
Asigna a proyecto.

**Body:** `{ "projectId": "uuid o null" }`

#### `POST /machinery/{id}/deactivate`
Da de baja.

#### `POST /machinery/{id}/reactivate`
Reactiva.

---

### Equipo

#### `GET /team`
Lista miembros del equipo.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Juan Pérez",
    "email": "juan@empresa.com",
    "role": "manager",
    "joinDate": "2024-01-15T10:30:00Z"
  }
]
```

#### `POST /team/invite`
Invita miembro (envía email).

**Body:**
```json
{
  "email": "nuevo@empresa.com",
  "role": "worker"
}
```

**Roles:** `admin` | `manager` | `worker`

#### `PUT /team/{id}`
Actualiza miembro.

#### `DELETE /team/{id}`
Elimina miembro.

#### `POST /team/{id}/resend-invitation`
Reenvía invitación.

---

### Dashboard

#### `GET /dashboard/summary`
Resumen general.

**Response:**
```json
{
  "totalDirectStaff": 150,
  "totalIndirectStaff": 25,
  "projectsInProgress": 3,
  "activeMachinery": 12
}
```

#### `GET /dashboard/projects/progress`
Avance de todos los proyectos.

#### `GET /dashboard/projects/{id}/progress`
Avance de un proyecto.

**Response:**
```json
{
  "projectId": "uuid",
  "projectName": "Instalación Solar",
  "overallProgress": 45,
  "activities": [
    { "name": "Hincado", "progress": 85, "completed": 1700, "total": 2000 },
    { "name": "Trackers", "progress": 60, "completed": 300, "total": 500 },
    ...
  ]
}
```

#### `GET /dashboard/personnel`
Historial de personal (todos los proyectos).

**Query params:** `startDate`, `endDate`

**Response:**
```json
[
  {
    "projectId": "uuid",
    "projectName": "...",
    "history": [
      { "date": "15 Ene", "directos": 45, "indirectos": 5 },
      { "date": "16 Ene", "directos": 48, "indirectos": 5 }
    ]
  }
]
```

#### `GET /dashboard/suspended-hours`
Horas suspendidas.

**Response:**
```json
[
  {
    "projectId": "uuid",
    "projectName": "...",
    "history": [
      { "date": "15 Ene", "hours": 2 },
      { "date": "16 Ene", "hours": 0 }
    ]
  }
]
```

#### `GET /dashboard/incidents`
Incidentes y accidentes.

**Response:**
```json
[
  {
    "projectId": "uuid",
    "projectName": "...",
    "history": [
      { "date": "15 Ene", "incidentes": 0, "accidentes": 0 }
    ],
    "horasHombre": 15000,
    "trir": 0.5,
    "ltir": 0.2
  }
]
```

#### `GET /dashboard/machinery`
Maquinaria por proyecto.

#### `GET /dashboard/work-progress`
Avance detallado para página "Avances de Obra".

**Query params:** `startDate`, `endDate`, `activity`

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Instalación Solar",
    "overallProgress": 45,
    "stages": [
      {
        "name": "Hincas",
        "subStages": [
          { "name": "Replanteo", "progress": 100, "completed": 2000, "total": 2000, "unit": "unidades" },
          { "name": "Hincado", "progress": 85, "completed": 1700, "total": 2000, "unit": "unidades" }
        ]
      }
    ]
  }
]
```

#### `GET /dashboard/projects/{id}/full`
Datos completos de un proyecto (optimizado).

---

## Tipos Enumerados

### Weather
`sunny` | `cloudy` | `rainy` | `stormy` | `snow` | `hail`

### ReportStatus
`enviado` | `borrador` | `archivado`

### MachineStatus
`activa` | `baja`

### MachineOwnership
`propio` | `subcontrato`

### UserRole
`admin` | `manager` | `worker`

### ActivityCategory
`hincas` | `trackers` | `modulos` | `calidad` | `obraElectrica` | `ensayos` | `inversores` | `cts` | `preComisionamiento` | `otras`

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido/expirado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no existe |
| 422 | Validation Error - Errores de validación |
| 500 | Internal Server Error |

**Formato de error:**
```json
{
  "message": "Descripción del error",
  "code": "ERROR_CODE",
  "details": {
    "field": ["error específico"]
  }
}
```

---

## Cálculos Importantes

### Avance del Proyecto
El frontend espera que el backend calcule el avance ponderado usando:

```python
WEIGHTS = {
    "Hincado": 15,
    "Trackers": 20,
    "Módulos": 10,
    "Cable BT/AC": 25,
    "Cable BT/CC": 20,
    "Cable MT": 5,
    "Inversores": 5
}

overall_progress = sum(activity.progress * WEIGHTS[activity.name] for activity in activities) / 100
```

### TRIR y LTIR
```python
SAFETY_FACTOR = 200000

trir = ((incidentes + accidentes) * SAFETY_FACTOR) / horas_trabajadas
ltir = (accidentes_con_lesion * SAFETY_FACTOR) / horas_trabajadas
```

### Horas Trabajadas
```python
horas_trabajadas = sum(
    (personal_directo + personal_indirecto) * (hora_salida - hora_entrada - horas_suspendidas)
    for reporte in reportes
)
```

