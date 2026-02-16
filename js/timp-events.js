(function($) {
    'use strict';

    console.log('TIMP: Inicializando plugin...');

    let currentWeekOffset = 0;

    // Función para cargar eventos
    function loadEvents(weekOffset) {
        const $container = $('.timp-events-container');
        const $list = $('.timp-events-list');
        const $loading = $('.timp-events-loading');
        const $error = $('.timp-events-error');

        console.log('TIMP: Cargando eventos, offset:', weekOffset);
        console.log('TIMP: Container encontrado:', $container.length);

        if ($container.length === 0) {
            console.error('TIMP: No se encontró el container .timp-events-container');
            return;
        }

        $loading.show();
        $error.hide();
        $list.html('');

        $.ajax({
            url: timpEvents.ajaxurl,
            type: 'POST',
            data: {
                action: 'timp_get_events',
                nonce: timpEvents.nonce,
                week_offset: weekOffset
            },
            success: function (response) {
                console.log('TIMP Response:', response);
                $loading.hide();

                if (response.success) {
                    const data = response.data;
                    console.log('TIMP Data:', data);
                    console.log('TIMP Events count:', data.events ? data.events.length : 0);

                    // Actualizar título de la semana
                    updateWeekTitle(weekOffset, data.start_date, data.end_date);

                    // Renderizar eventos
                    if (data.events && data.events.length > 0) {
                        console.log('TIMP: Renderizando', data.events.length, 'eventos');
                        renderEvents(data.events, weekOffset);
                    } else {
                        console.log('TIMP: No hay eventos para mostrar');
                        // Mostrar mensaje diferente según si es semana pasada o futura
                        const noEventsMessage = weekOffset < 0
                            ? '<div class="no-events"><p>📅 No hay sesiones disponibles para semanas pasadas.</p></div>'
                            : '<div class="no-events"><p>📅 No hay sesiones programadas para esta semana.</p></div>';
                        $list.html(noEventsMessage);
                    }
                } else {
                    console.error('TIMP Error:', response.data);
                    showError(response.data.message || 'Error al cargar las sesiones');
                }
            },
            error: function (xhr, status, error) {
                console.error('TIMP Ajax Error:', status, error);
                $loading.hide();
                showError('Error de conexión. Por favor, intenta de nuevo.');
            }
        });
    }
    
    // Actualizar título de la semana
    function updateWeekTitle(offset, startDate, endDate) {
        let weekText = '';
        if (offset === 0) {
            weekText = 'Esta semana';
        } else if (offset === 1) {
            weekText = 'Próxima semana';
        } else if (offset === -1) {
            weekText = 'Semana pasada';
        } else if (offset > 0) {
            weekText = `En ${offset} semanas`;
        } else {
            weekText = `Hace ${Math.abs(offset)} semanas`;
        }
        
        $('#timp-current-week').text(weekText);
        
        // Formatear fechas
        const start = formatDate(startDate);
        const end = formatDate(endDate);
        $('#timp-date-range').text(`${start} - ${end}`);
    }
    
    // Formatear fecha
    function formatDate(dateString) {
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
            'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const date = new Date(dateString + 'T00:00:00');
        const day = date.getDate();
        const month = months[date.getMonth()];
        return `${day} ${month}`;
    }
    
    // Renderizar sesiones/eventos
    function renderEvents(events, weekOffset) {
        const $list = $('.timp-events-list');
        let html = '';

        // Agrupar sesiones por día
        const eventsByDay = {};
        
        events.forEach(event => {
            // La API de TIMP devuelve 'starts_at' en formato ISO
            const startsAt = event.starts_at;
            if (startsAt) {
                const eventDate = startsAt.split('T')[0]; // Extraer solo la fecha YYYY-MM-DD
                
                if (!eventsByDay[eventDate]) {
                    eventsByDay[eventDate] = [];
                }
                eventsByDay[eventDate].push(event);
            }
        });
        
        // Renderizar por día
        const sortedDates = Object.keys(eventsByDay).sort();

        if (sortedDates.length === 0) {
            // Mostrar mensaje diferente según si es semana pasada o futura
            const noEventsMessage = weekOffset < 0
                ? '<div class="no-events"><p>📅 No hay sesiones disponibles para semanas pasadas.</p></div>'
                : '<div class="no-events"><p>📅 No hay sesiones programadas para esta semana.</p></div>';
            $list.html(noEventsMessage);
            return;
        }
        
        sortedDates.forEach(date => {
            const dayName = getDayName(date);
            const formattedDate = formatDateFull(date);
            
            html += `<div class="timp-day-group">
                        <h3 class="timp-day-header">
                            <span class="timp-day-name">${dayName}</span>
                            <span class="timp-day-date">${formattedDate}</span>
                        </h3>
                        <div class="timp-day-events">`;
            
            // Ordenar eventos del día por hora
            eventsByDay[date].sort((a, b) => {
                return new Date(a.starts_at) - new Date(b.starts_at);
            });
            
            eventsByDay[date].forEach(event => {
                html += renderEvent(event);
            });
            
            html += `</div></div>`;
        });
        
        $list.html(html);
    }
    
    // Renderizar una sesión individual
    function renderEvent(event) {
        // Extraer datos de la sesión según la estructura de la API TIMP
        const title = event.name || 'Sesión sin título';
        const startsAt = new Date(event.starts_at);
        const endsAt = new Date(event.ends_at);
        const time = formatTime(startsAt);
        const endTime = formatTime(endsAt);
        const duration = Math.round((endsAt - startsAt) / 60000); // Duración en minutos
        
        // Información del instructor/profesional
        const professional = event.professional || {};
        const instructor = professional.name || '';
        
        // Información de la actividad
        const activity = event.activity || {};
        const activityName = activity.name || '';
        const description = activity.description || '';
        
        // Información de ubicación/sala
        const room = event.room || {};
        const location = room.name || '';
        
        // Información de capacidad y disponibilidad
        const capacity = event.capacity || 0;
        const bookings = event.bookings_count || 0;
        const available = capacity - bookings;
        
        // Estado de la sesión
        const isFull = available <= 0;
        const status = event.status || 'active';
        const isCancelled = status === 'cancelled';
        
        let html = `<div class="timp-event-card ${isCancelled ? 'cancelled' : ''} ${isFull ? 'full' : ''}">
                        <div class="timp-event-time">
                            <span class="time-start">${time}</span>
                            <span class="time-separator">-</span>
                            <span class="time-end">${endTime}</span>
                        </div>
                        <div class="timp-event-content">
                            <div class="timp-event-header">
                                <h4 class="timp-event-title">${title}</h4>`;
        
        if (isCancelled) {
            html += `<span class="timp-badge timp-badge-cancelled">Cancelada</span>`;
        } else if (isFull) {
            html += `<span class="timp-badge timp-badge-full">Completa</span>`;
        } else if (available <= 3) {
            html += `<span class="timp-badge timp-badge-warning">Pocas plazas</span>`;
        }
        
        html += `</div>`;
        
        if (activityName && activityName !== title) {
            html += `<p class="timp-event-activity">📋 ${activityName}</p>`;
        }
        
        if (instructor) {
            html += `<p class="timp-event-instructor">👤 ${instructor}</p>`;
        }
        
        if (location) {
            html += `<p class="timp-event-location">📍 ${location}</p>`;
        }

        if (description) {
            html += `<div class="timp-event-description-wrapper">
                        <a href="#" class="timp-toggle-description">▼ Más información</a>
                        <div class="timp-event-description" style="display: none;">
                            <p>${description}</p>
                        </div>
                    </div>`;
        }

        html += `<div class="timp-event-meta">`;
        
        if (duration) {
            html += `<span class="timp-meta-item">⏱️ ${duration} min</span>`;
        }
        
        if (capacity > 0 && !isCancelled) {
            const availableClass = isFull ? 'no-spaces' : (available <= 3 ? 'low-spaces' : '');
            html += `<span class="timp-meta-item timp-capacity ${availableClass}">
                        👥 ${available}/${capacity} plazas</span>`;
        }
        
        html += `</div></div></div>`;
        
        return html;
    }

    // Obtener nombre del día
    function getDayName(dateString) {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const date = new Date(dateString + 'T00:00:00');
        return days[date.getDay()];
    }

    // Formatear fecha completa
    function formatDateFull(dateString) {
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const date = new Date(dateString + 'T00:00:00');
        const day = date.getDate();
        const month = months[date.getMonth()];
        return `${day} de ${month}`;
    }

    // Formatear hora
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Mostrar error
    function showError(message) {
        const $error = $('.timp-events-error');
        $error.find('.error-message').text(message);
        $error.show();
    }

    // Función de inicialización
    function init() {
        console.log('TIMP: Ejecutando init()');

        // Verificar que el container existe
        if ($('.timp-events-container').length === 0) {
            console.error('TIMP: Container no encontrado');
            return;
        }

        console.log('TIMP: Container encontrado, cargando eventos...');

        // Event listeners para navegación
        $('#timp-prev-week').on('click', function () {
            currentWeekOffset--;
            loadEvents(currentWeekOffset);
        });

        $('#timp-next-week').on('click', function () {
            currentWeekOffset++;
            loadEvents(currentWeekOffset);
        });

        // Event delegation para los enlaces de "más información"
        $('.timp-events-list').on('click', '.timp-toggle-description', function (e) {
            e.preventDefault();
            const $link = $(this);
            const $description = $link.siblings('.timp-event-description');

            // Verificar el estado actual antes del toggle
            const isVisible = $description.is(':visible');

            // Toggle de la descripción con callback para cambiar el texto
            $description.slideToggle(300, function() {
                // Cambiar el texto después de la animación
                if (isVisible) {
                    // Estaba visible, ahora está oculto
                    $link.text('▼ Más información');
                } else {
                    // Estaba oculto, ahora está visible
                    $link.text('▲ Ocultar información');
                }
            });
        });

        // Cargar eventos de la semana actual
        loadEvents(currentWeekOffset);
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        console.log('TIMP: DOM aún cargando, esperando...');
        document.addEventListener('DOMContentLoaded', init);
    } else {
        console.log('TIMP: DOM ya listo, ejecutando init inmediatamente');
        init();
    }

})(jQuery);