(function($) {
    'use strict';

    let currentWeekOffset = 0;
    let currentEvents = {};
    let selectedDate = null;

    // Abreviaturas de días: L, M, X, J, V, S, D
    const dayAbbreviations = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

    // Función para cargar eventos
    function loadEvents(weekOffset) {
        const $container = $('.timp-events-container');
        const $list = $('.timp-events-list');
        const $loading = $('.timp-events-loading');
        const $error = $('.timp-events-error');
        const $daySelector = $('.timp-day-selector');

        if ($container.length === 0) return;

        $loading.show();
        $error.hide();
        $list.html('');
        $daySelector.html('');

        $.ajax({
            url: timpEvents.ajaxurl,
            type: 'POST',
            data: {
                action: 'timp_get_events',
                nonce: timpEvents.nonce,
                week_offset: weekOffset
            },
            success: function (response) {
                $loading.hide();

                if (response.success) {
                    const data = response.data;

                    // Actualizar título de la semana
                    updateWeekTitle(weekOffset, data.start_date, data.end_date);

                    // Agrupar eventos por día
                    currentEvents = {};
                    if (data.events && data.events.length > 0) {
                        data.events.forEach(function(event) {
                            const startsAt = event.starts_at;
                            if (startsAt) {
                                const eventDate = startsAt.split('T')[0];
                                if (!currentEvents[eventDate]) {
                                    currentEvents[eventDate] = [];
                                }
                                currentEvents[eventDate].push(event);
                            }
                        });
                    }

                    // Generar botones de días de la semana (L-S)
                    buildDaySelector(data.start_date, data.end_date, weekOffset);
                } else {
                    showError(response.data.message || 'Error al cargar las sesiones');
                }
            },
            error: function () {
                $loading.hide();
                showError('Error de conexión. Por favor, intenta de nuevo.');
            }
        });
    }

    // Formatear fecha local como YYYY-MM-DD sin problemas de timezone
    function toLocalDateStr(date) {
        var y = date.getFullYear();
        var m = (date.getMonth() + 1).toString().padStart(2, '0');
        var d = date.getDate().toString().padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    // Construir selector de días
    function buildDaySelector(startDate, endDate, weekOffset) {
        const $daySelector = $('.timp-day-selector');
        let html = '';

        // Calcular los días de la semana (Lunes a Sábado)
        const start = new Date(startDate + 'T00:00:00');
        const todayStr = toLocalDateStr(new Date());

        let defaultDate = null;

        // Generar botones L-S (6 días: lunes a sábado)
        for (let i = 0; i < 6; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            const dateStr = toLocalDateStr(day);
            const dayNum = day.getDate();
            const abbr = dayAbbreviations[day.getDay()];
            const hasEvents = currentEvents[dateStr] && currentEvents[dateStr].length > 0;

            // Determinar el día por defecto: hoy si es la semana actual, si no el primer día con eventos
            if (weekOffset === 0 && dateStr === todayStr) {
                defaultDate = dateStr;
            }
            if (!defaultDate && hasEvents) {
                defaultDate = dateStr;
            }

            const disabledClass = !hasEvents ? 'timp-day-btn-empty' : '';

            html += '<button class="timp-day-btn ' + disabledClass + '" data-date="' + dateStr + '">' +
                        abbr + dayNum +
                    '</button>';
        }

        $daySelector.html(html);

        // Seleccionar día por defecto
        if (defaultDate) {
            selectDay(defaultDate);
        } else {
            // No hay eventos en ningún día
            const $list = $('.timp-events-list');
            const noEventsMessage = weekOffset < 0
                ? '<div class="no-events"><p>📅 No hay sesiones disponibles para semanas pasadas.</p></div>'
                : '<div class="no-events"><p>📅 No hay sesiones programadas para esta semana.</p></div>';
            $list.html(noEventsMessage);
        }
    }

    // Seleccionar un día y mostrar sus eventos
    function selectDay(dateStr) {
        selectedDate = dateStr;

        // Actualizar estado visual de los botones
        $('.timp-day-btn').removeClass('timp-day-btn-active');
        $('.timp-day-btn[data-date="' + dateStr + '"]').addClass('timp-day-btn-active');

        // Renderizar eventos del día seleccionado
        const $list = $('.timp-events-list');
        const events = currentEvents[dateStr];

        if (events && events.length > 0) {
            // Ordenar por hora
            events.sort(function(a, b) {
                return new Date(a.starts_at) - new Date(b.starts_at);
            });

            const dayName = getDayName(dateStr);
            const formattedDate = formatDateFull(dateStr);

            let html = '<div class="timp-day-group">' +
                            '<h3 class="timp-day-header">' +
                                '<span class="timp-day-name">' + dayName + '</span>' +
                                '<span class="timp-day-date">' + formattedDate + '</span>' +
                            '</h3>' +
                            '<div class="timp-day-events">';

            events.forEach(function(event) {
                html += renderEvent(event);
            });

            html += '</div></div>';
            $list.html(html);
        } else {
            $list.html('<div class="no-events"><p>📅 No hay sesiones para este día.</p></div>');
        }
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
            weekText = 'En ' + offset + ' semanas';
        } else {
            weekText = 'Hace ' + Math.abs(offset) + ' semanas';
        }

        $('#timp-current-week').text(weekText);

        const start = formatDate(startDate);
        const end = formatDate(endDate);
        $('#timp-date-range').text(start + ' - ' + end);
    }

    // Formatear fecha corta
    function formatDate(dateString) {
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
            'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const date = new Date(dateString + 'T00:00:00');
        return date.getDate() + ' ' + months[date.getMonth()];
    }

    // Renderizar una sesión individual
    function renderEvent(event) {
        const title = event.name || 'Sesión sin título';
        const startsAt = new Date(event.starts_at);
        const endsAt = new Date(event.ends_at);
        const time = formatTime(startsAt);
        const endTime = formatTime(endsAt);
        const duration = Math.round((endsAt - startsAt) / 60000);

        const professional = event.professional || {};
        const instructor = professional.name || '';

        const activity = event.activity || {};
        const activityName = activity.name || '';
        const description = activity.description || '';

        const room = event.room || {};
        const location = room.name || '';

        const capacity = event.capacity || 0;
        const bookings = event.bookings_count || 0;
        const available = capacity - bookings;

        const isFull = available <= 0;
        const status = event.status || 'active';
        const isCancelled = status === 'cancelled';

        let html = '<div class="timp-event-card ' + (isCancelled ? 'cancelled' : '') + ' ' + (isFull ? 'full' : '') + '">' +
                        '<div class="timp-event-time">' +
                            '<span class="time-start">' + time + '</span>' +
                            '<span class="time-separator">-</span>' +
                            '<span class="time-end">' + endTime + '</span>' +
                        '</div>' +
                        '<div class="timp-event-content">' +
                            '<div class="timp-event-header">' +
                                '<h4 class="timp-event-title">' + title + '</h4>';

        if (isCancelled) {
            html += '<span class="timp-badge timp-badge-cancelled">Cancelada</span>';
        } else if (isFull) {
            html += '<span class="timp-badge timp-badge-full">Completa</span>';
        }

        html += '</div>';

        if (activityName && activityName !== title) {
            html += '<p class="timp-event-activity">📋 ' + activityName + '</p>';
        }

        if (instructor) {
            html += '<p class="timp-event-instructor">👤 ' + instructor + '</p>';
        }

        if (location) {
            html += '<p class="timp-event-location">📍 ' + location + '</p>';
        }

        if (description) {
            html += '<div class="timp-event-description-wrapper">' +
                        '<a href="#" class="timp-toggle-description">▼ Más información</a>' +
                        '<div class="timp-event-description" style="display: none;">' +
                            '<p>' + description + '</p>' +
                        '</div>' +
                    '</div>';
        }

        html += '<div class="timp-event-meta">';

        if (duration) {
            html += '<span class="timp-meta-item">⏱️ ' + duration + ' min</span>';
        }

        if (capacity > 0 && !isCancelled) {
            var availableClass = isFull ? 'no-spaces' : (available <= 3 ? 'low-spaces' : '');
            html += '<span class="timp-meta-item timp-capacity ' + availableClass + '">' +
                        '👥 ' + available + '/' + capacity + ' plazas</span>';
        }

        // Botón Reservar (solo si hay URL configurada y la sesión no está completa ni cancelada)
        if (timpEvents.bookingUrl && !isFull && !isCancelled) {
            html += '<a href="' + timpEvents.bookingUrl + '" target="_blank" rel="noopener" class="timp-booking-btn">Reservar</a>';
        }

        html += '</div></div></div>';

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
        return date.getDate() + ' de ' + months[date.getMonth()];
    }

    // Formatear hora
    function formatTime(date) {
        return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    }

    // Mostrar error
    function showError(message) {
        const $error = $('.timp-events-error');
        $error.find('.error-message').text(message);
        $error.show();
    }

    // Función de inicialización
    function init() {
        if ($('.timp-events-container').length === 0) return;

        // Navegación de semanas
        $('#timp-prev-week').on('click', function () {
            currentWeekOffset--;
            loadEvents(currentWeekOffset);
        });

        $('#timp-next-week').on('click', function () {
            currentWeekOffset++;
            loadEvents(currentWeekOffset);
        });

        // Click en botones de día
        $('.timp-events-container').on('click', '.timp-day-btn:not(.timp-day-btn-empty)', function () {
            selectDay($(this).data('date'));
        });

        // Toggle de descripción
        $('.timp-events-list').on('click', '.timp-toggle-description', function (e) {
            e.preventDefault();
            var $link = $(this);
            var $description = $link.siblings('.timp-event-description');
            var isVisible = $description.is(':visible');

            $description.slideToggle(300, function() {
                if (isVisible) {
                    $link.text('▼ Más información');
                } else {
                    $link.text('▲ Ocultar información');
                }
            });
        });

        // Cargar eventos de la semana actual
        loadEvents(currentWeekOffset);
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(jQuery);
