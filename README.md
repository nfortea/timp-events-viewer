TIMP Events Viewer - Plugin para WordPress
Plugin oficial para mostrar sesiones/eventos de TIMP con navegación por semanas. Integración directa con la API de TIMP v1.
📋 Estructura de Archivos
Crea la siguiente estructura de carpetas en /wp-content/plugins/:
timp-events-viewer/
├── timp-events-viewer.php  (archivo principal PHP)
├── css/
│   └── timp-events.css
├── js/
│   └── timp-events.js
└── README.md
🚀 Instalación
Opción 1: Instalación Manual

Crea una carpeta llamada timp-events-viewer en /wp-content/plugins/
Copia el archivo PHP principal en la raíz de la carpeta
Crea las carpetas css y js
Coloca los archivos CSS y JavaScript en sus respectivas carpetas
Ve a Plugins en el panel de WordPress
Activa el plugin "TIMP Events Viewer"

Opción 2: Instalación por ZIP

Crea un archivo ZIP con la estructura de carpetas mencionada
Ve a Plugins > Añadir nuevo > Subir plugin
Selecciona el archivo ZIP y haz clic en "Instalar ahora"
Activa el plugin

⚙️ Configuración
Paso 1: Obtener credenciales de TIMP

Crear cuenta de desarrollador:

Ve a https://developers.timp.pro
Regístrate con tu email y contraseña
Crea una organización

Obtener API Access Key:

En tu panel de desarrollador, copia tu API Access Key
Esta clave identificará tu aplicación en cada llamada a la API

Autorizar tu centro:

El gestor del centro debe autorizar tu aplicación
Esto se hace desde el panel de administración del centro en TIMP
Una vez autorizado, obtendrás acceso a los datos del centro

✨ **Detección automática de centros**:

El plugin detecta automáticamente los centros autorizados usando la API
Ya no necesitas buscar manualmente el UUID del centro
Simplemente selecciona tu centro de la lista desplegable

Paso 2: Configurar el Plugin

1. Ve a **Ajustes > TIMP Events** en el panel de WordPress
2. Introduce tu **API Access Key**
3. Haz clic en **Guardar cambios**
4. Los centros autorizados se detectarán automáticamente
5. Selecciona tu centro de la lista desplegable
6. Guarda los cambios nuevamente

📝 Uso
Shortcode Básico
Para mostrar las sesiones en cualquier página o entrada:
[timp_events]
Shortcode con Parámetros
[timp_events limit="100"]
Parámetros disponibles:

limit: Número máximo de sesiones a mostrar (por defecto: 100)

🎨 Características

✅ Navegación por semanas - Botones para avanzar y retroceder
✅ Vista de semana actual - Muestra "Esta semana" por defecto
✅ Agrupación por día - Organiza sesiones automáticamente
✅ Diseño responsive - Funciona en móvil, tablet y desktop
✅ Información completa - Muestra instructor, sala, duración, plazas
✅ Indicadores visuales - Badges para sesiones completas o canceladas
✅ Carga dinámica - AJAX sin recargar la página
✅ Gestión de errores - Mensajes claros de error

📊 Información Mostrada
Para cada sesión se muestra:

🕐 Hora de inicio y fin
📋 Nombre de la sesión/actividad
👤 Instructor/Monitor
📍 Sala/Ubicación
⏱️ Duración en minutos
👥 Plazas disponibles/totales
🚫 Estado (Activa, Completa, Cancelada)

🔧 API de TIMP - Detalles Técnicos
El plugin utiliza la API REST de TIMP v1:
Endpoints Utilizados

1. **Obtener centros autorizados**
   ```
   GET https://api.timp.pro/api/timp/v1/branch_buildings
   ```

2. **Obtener actividades de un centro**
   ```
   GET https://api.timp.pro/api/timp/v1/branch_buildings/{center_uuid}/activities
   ```

3. **Obtener sesiones de una actividad**
   ```
   GET https://api.timp.pro/api/timp/v1/activities/{activity_uuid}/admissions?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
   ```

Headers Requeridos
```
Api-Access-Key: {tu_api_key}
Accept: application/timp.timp-v1
```

Estructura de Respuesta - Centros
```json
[
  {
    "uuid": "3c00337c-b3aa-4030-b160-b79cf841e5d7",
    "name": "Danann Pilates",
    "address": "Calle Rey Francisco, 22, 28008 Madrid",
    "latitude": 40.4267782,
    "longitude": -3.717292,
    "country": "España"
  }
]
```

Estructura de Respuesta - Actividades
```json
[
  {
    "uuid": "9721651b-18e2-43b1-b0c8-f1acc57c0fad",
    "name": "PILATES POSTURAL",
    "description": "",
    "available_until_date": "2026-03-30",
    "capacity_per_admission": 8
  }
]
```

Estructura de Respuesta - Admissions (Sesiones)
```json
{
  "collection": [
    {
      "starting_at": "2026-02-16T19:00:00.000+01:00",
      "ending_at": "2026-02-16T20:00:00.000+01:00",
      "activity_uuid": "9721651b-18e2-43b1-b0c8-f1acc57c0fad",
      "professional_name": "REBECA PEREZ ROLDAN",
      "capacity": 8,
      "bookings_count": 6
    }
  ],
  "page_data": {
    "current_page": 1,
    "total_pages": 1,
    "total_count": 8
  }
}
🎨 Personalización
Modificar Estilos
Edita el archivo css/timp-events.css para personalizar:
css/* Cambiar color principal */
.timp-nav-btn {
    background-color: #tu-color;
}

/* Cambiar tamaño de fuente de títulos */
.timp-event-title {
    font-size: 20px;
}
Añadir Campos Personalizados
Si necesitas mostrar información adicional, edita la función renderEvent() en js/timp-events.js:
javascript// Añadir un nuevo campo
if (event.tu_campo) {
    html += `<p class="timp-custom-field">🔸 ${event.tu_campo}</p>`;
}
🔍 Solución de Problemas
Las sesiones no se cargan
Problema: No aparecen eventos en la página
Soluciones:

Verifica que la API Access Key sea correcta
Asegúrate de que el centro haya autorizado tu aplicación
Comprueba que el ID del Centro sea correcto
Revisa la consola del navegador (F12) para ver errores JavaScript
Comprueba los logs de WordPress en wp-content/debug.log

Error: "API Access Key inválida"
Problema: Mensaje de error de autenticación
Soluciones:

Copia de nuevo la API Key desde developers.timp.pro
Asegúrate de no tener espacios al inicio o final
Verifica que la organización esté activa

Error: "Centro no autorizado"
Problema: El centro no ha dado permiso
Soluciones:

El gestor del centro debe ir a su panel de TIMP
Buscar la sección de "Integraciones" o "API"
Autorizar tu aplicación desde allí

Los estilos no se aplican
Problema: La página se ve sin formato
Soluciones:

Verifica que timp-events.css esté en la carpeta css/
Limpia la caché del navegador (Ctrl + F5)
Si usas un plugin de caché (WP Super Cache, W3 Total Cache), límpialo
Verifica que no haya errores JavaScript que impidan cargar CSS

Error de conexión
Problema: No se puede conectar con la API
Soluciones:

Verifica que tu servidor permite conexiones HTTPS salientes
Comprueba el firewall de tu servidor
Contacta con tu proveedor de hosting si el problema persiste

📱 Compatibilidad
WordPress

WordPress 5.0 o superior
PHP 7.2 o superior
jQuery (incluido por defecto en WordPress)

Navegadores

Chrome (últimas 2 versiones)
Firefox (últimas 2 versiones)
Safari (últimas 2 versiones)
Edge (últimas 2 versiones)

Dispositivos

Desktop (1200px+)
Tablet (768px - 1199px)
Mobile (320px - 767px)

🔐 Seguridad

✅ Validación de nonce en todas las peticiones AJAX
✅ Sanitización de datos de entrada
✅ Escape de datos de salida
✅ Autenticación mediante API Key
✅ Permisos verificados en panel de administración

📄 Licencia
GPL v2 or later
🤝 Soporte
Soporte de TIMP
Para problemas con la API de TIMP:

Web: https://timp.pro
Documentación: https://docs.timp.pro
Desarrolladores: https://developers.timp.pro
Centro de Ayuda: https://help.timp.pro

Soporte del Plugin
Para problemas específicos del plugin de WordPress, contacta con el desarrollador del plugin.
🔄 Actualizaciones Futuras
Posibles mejoras para futuras versiones:

 Caché de sesiones para mejorar rendimiento
 Filtros por actividad/instructor/sala
 Búsqueda de sesiones
 Vista de calendario mensual
 Exportación a Google Calendar/iCal
 Reserva directa desde el plugin (requiere API v2)
 Widget para la barra lateral
 Múltiples centros en la misma página
 Modo lista vs modo calendario
 Notificaciones de cambios en sesiones

📝 Notas Importantes

Solo lectura: La API actual de TIMP es solo de lectura, no permite crear o modificar sesiones
Límite de peticiones: Evita hacer demasiadas peticiones seguidas a la API
Autorización necesaria: El centro debe autorizar explícitamente tu aplicación
Datos en tiempo real: Los datos se obtienen directamente de TIMP en cada carga

🧪 Testing
Para probar el plugin:

Instala en un entorno de pruebas primero
Configura con credenciales de prueba si están disponibles
Verifica que las sesiones se muestran correctamente
Prueba la navegación entre semanas
Verifica la visualización en diferentes dispositivos
Comprueba el comportamiento con 0 sesiones
Verifica los mensajes de error

👨‍💻 Para Desarrolladores
Hooks Disponibles
El plugin no incluye hooks personalizados actualmente, pero puedes usar los filtros estándar de WordPress:
php// Modificar la salida del shortcode
add_filter('timp_events_shortcode_output', function($output) {
    // Tu código aquí
    return $output;
});
Extender Funcionalidad
Para añadir funcionalidades:

Crea un plugin hijo que dependa de este
Usa las acciones y filtros de WordPress
No modifiques directamente los archivos del plugin

🎓 Recursos Adicionales

Documentación oficial de WordPress
REST API de TIMP
Developers TIMP
Centro de ayuda TIMP
