# Frontend - Gestión de Proyectos Solares

Sistema de gestión de reportes diarios para proyectos de instalación solar fotovoltaica.

## Stack Tecnológico

- **Framework:** Next.js 14 (App Router)
- **UI:** React 18 + Tailwind CSS
- **Estado:** React Context + Hooks personalizados
- **Gráficos:** Recharts
- **Formularios:** React Hook Form + Zod

## Estructura del Proyecto

```
drfront/
├── app/                    # Páginas de Next.js
│   ├── layout.tsx          # Layout principal con AppProvider
│   └── page.tsx            # Página principal con navegación
├── components/
│   ├── dashboard/          # Tablero, Avances, Reportes
│   ├── forms/              # Formularios (reporte diario, actividades)
│   ├── machinery/          # Gestión de maquinaria
│   ├── onboarding/         # Wizard de configuración inicial
│   ├── setup/              # Configuración (empresa, proyectos, equipo)
│   ├── layout/             # Header, Sidebar
│   └── ui/                 # Componentes base (Button, Card, Input...)
├── lib/
│   ├── api/                # Cliente HTTP y servicios de API
│   ├── constants/          # Actividades, ponderaciones, etiquetas
│   ├── contexts/           # AppContext (estado global)
│   ├── hooks/              # Hooks personalizados
│   ├── types/              # Tipos TypeScript
│   └── utils/              # Utilidades y cálculos
```

## Configuración

### Variables de Entorno

Crear `.env.local` en la raíz:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Instalación

```bash
npm install
npm run dev
```

## Flujo de la Aplicación

### 1. Onboarding (Primera vez)
- Crear empresa
- Crear primer proyecto
- Invitar miembros del equipo

### 2. Configuración de Proyecto
- Definir **Línea Base** (trackers, módulos, cables, inversores, CTs)
- La línea base determina los totales para calcular avances

### 3. Reportes Diarios
- Seleccionar proyecto y fecha
- Registrar personal (directo/indirecto)
- Registrar clima y horas suspendidas
- Agregar actividades realizadas
- Adjuntar imágenes
- Enviar o guardar como borrador

### 4. Visualización
- **Tablero de Control:** Resumen general, gráficos de personal, avance, maquinaria
- **Avances de Obra:** Progreso por actividad en % o unidades
- **Historial de Reportes:** Listado con filtros, descarga PDF, compartir

## Arquitectura de Estado

```
AppContext
├── company          # Datos de la empresa
├── projects         # Lista de proyectos
├── team             # Miembros del equipo
├── machinery        # Maquinaria registrada
├── baselines        # Líneas base por proyecto (cache)
├── dashboardSummary # Resumen del dashboard
├── selectedProjectId # Proyecto seleccionado para filtros
└── isOnboardingComplete # Estado del onboarding
```

## Hooks Disponibles

| Hook | Uso |
|------|-----|
| `useApp()` | Acceso completo al contexto |
| `useProjects()` | CRUD de proyectos |
| `useCompany()` | Datos de empresa |
| `useTeam()` | Gestión de equipo |
| `useMachinery()` | Gestión de maquinaria |
| `useReports()` | Reportes diarios |
| `useDashboard()` | Datos del dashboard |
| `useBaseline()` | Línea base de proyecto |

## Cálculos de Avance

El avance del proyecto se calcula ponderando las actividades principales:

| Actividad | Peso |
|-----------|------|
| Hincado | 15% |
| Trackers | 20% |
| Módulos | 10% |
| Cable BT/AC | 25% |
| Cable BT/CC | 20% |
| Cable MT | 5% |
| Inversores | 5% |

Ver `lib/constants/weights.ts` para las sub-ponderaciones de cada actividad.

## Indicadores de Seguridad

- **TRIR** = (Incidentes + Accidentes) × 200,000 / Horas trabajadas
- **LTIR** = Accidentes con lesión × 200,000 / Horas trabajadas

