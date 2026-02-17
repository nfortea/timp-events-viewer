<?php

/**
 * Plugin Name: TIMP Events Viewer
 * Plugin URI: https://github.com/nfortea/timp-events-viewer/
 * Description: Muestra eventos de TIMP con navegación por semanas
 * Version: 1.2.0
 * Author: Nacho Fortea
 * Author URI: https://planeasoluciones.com
 * License: GPL v2 or later
 * Text Domain: timp-events
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

class TIMP_Events_Plugin
{

    private $api_url = 'https://api.timp.pro/api';
    private $api_base = 'https://api.timp.pro';

    public function __construct()
    {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_init', array($this, 'handle_test_connection'));
        add_action('admin_init', array($this, 'handle_fetch_centers'));
        add_shortcode('timp_events', array($this, 'render_events_shortcode'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_timp_get_events', array($this, 'ajax_get_events'));
        add_action('wp_ajax_nopriv_timp_get_events', array($this, 'ajax_get_events'));
    }

    // Menú de administración
    public function add_admin_menu()
    {
        add_options_page(
            'TIMP Events Settings',
            'TIMP Events',
            'manage_options',
            'timp-events',
            array($this, 'settings_page')
        );
    }

    // Registrar ajustes
    public function register_settings()
    {
        register_setting('timp_events_settings', 'timp_api_key');
        register_setting('timp_events_settings', 'timp_center_uuid');
    }

    // Manejar obtención de centros
    public function handle_fetch_centers()
    {
        if (!isset($_POST['timp_fetch_centers']) || !wp_verify_nonce($_POST['_wpnonce'], 'timp_fetch_centers_nonce')) {
            return;
        }

        $api_key = get_option('timp_api_key');

        if (empty($api_key)) {
            add_settings_error(
                'timp_events_settings',
                'timp_fetch_error',
                'Por favor, configura primero el API Access Key',
                'error'
            );
            return;
        }

        $centers = $this->get_authorized_centers();

        if (isset($centers['error'])) {
            add_settings_error('timp_events_settings', 'timp_fetch_error', $centers['error'], 'error');
        } else {
            $count = is_array($centers) ? count($centers) : 0;
            $center_names = array_map(function ($c) {
                return $c['name'];
            }, $centers);
            add_settings_error(
                'timp_events_settings',
                'timp_fetch_success',
                '¡Centros obtenidos! (' . $count . '): ' . implode(', ', $center_names),
                'success'
            );
        }
    }

    // Manejar prueba de conexión
    public function handle_test_connection()
    {
        if (!isset($_POST['timp_test_connection']) || !wp_verify_nonce($_POST['_wpnonce'], 'timp_test_connection_nonce')) {
            return;
        }

        $api_key = get_option('timp_api_key');
        $center_uuid = get_option('timp_center_uuid');

        if (empty($api_key)) {
            add_settings_error(
                'timp_events_settings',
                'timp_test_error',
                'Por favor, configura primero el API Access Key',
                'error'
            );
            return;
        }

        if (empty($center_uuid)) {
            add_settings_error(
                'timp_events_settings',
                'timp_test_error',
                'Por favor, selecciona o introduce el UUID del Centro',
                'error'
            );
            return;
        }

        // Probar conexión con fechas de esta semana
        $start_date = date('Y-m-d', strtotime('monday this week'));
        $end_date = date('Y-m-d', strtotime('sunday this week'));

        $result = $this->get_all_sessions($center_uuid, $start_date, $end_date);

        if (isset($result['error'])) {
            $error_msg = '<strong>Error de conexión:</strong><br>' . esc_html($result['error']);
            if (isset($result['details'])) {
                $error_msg .= '<br><br><strong>Detalles:</strong><br>' . esc_html($result['details']);
            }
            add_settings_error('timp_events_settings', 'timp_test_error', $error_msg, 'error');
        } else {
            $count = is_array($result) ? count($result) : 0;
            add_settings_error(
                'timp_events_settings',
                'timp_test_success',
                '¡Conexión exitosa! Se encontraron ' . $count . ' sesiones para esta semana.',
                'success'
            );
        }
    }

    // Página de configuración
    public function settings_page()
    {
        // Obtener centros autorizados si hay API key
        $api_key = get_option('timp_api_key');
        $centers = array();
        if (!empty($api_key)) {
            $centers_result = $this->get_authorized_centers();
            if (!isset($centers_result['error'])) {
                $centers = $centers_result;
            }
        }
?>
        <div class="wrap">
            <h1>TIMP Events - Configuración</h1>

            <form method="post" action="options.php">
                <?php
                settings_fields('timp_events_settings');
                do_settings_sections('timp_events_settings');
                ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="timp_api_key">API Access Key</label>
                        </th>
                        <td>
                            <input type="text"
                                id="timp_api_key"
                                name="timp_api_key"
                                value="<?php echo esc_attr(get_option('timp_api_key')); ?>"
                                class="regular-text">
                            <p class="description">Introduce tu API Access Key desde <a href="https://developers.timp.pro" target="_blank">developers.timp.pro</a></p>
                        </td>
                    </tr>
                    <?php if (!empty($centers) && is_array($centers)): ?>
                    <tr>
                        <th scope="row">
                            <label for="timp_center_uuid">Centro</label>
                        </th>
                        <td>
                            <select id="timp_center_uuid" name="timp_center_uuid" class="regular-text">
                                <option value="">-- Selecciona un centro --</option>
                                <?php foreach ($centers as $center): ?>
                                    <option value="<?php echo esc_attr($center['uuid']); ?>"
                                        <?php selected(get_option('timp_center_uuid'), $center['uuid']); ?>>
                                        <?php echo esc_html($center['name']); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">✅ Centros autorizados detectados automáticamente</p>
                        </td>
                    </tr>
                    <?php else: ?>
                    <tr>
                        <th scope="row">
                            <label for="timp_center_uuid">UUID del Centro</label>
                        </th>
                        <td>
                            <input type="text"
                                id="timp_center_uuid"
                                name="timp_center_uuid"
                                value="<?php echo esc_attr(get_option('timp_center_uuid')); ?>"
                                class="regular-text">
                            <p class="description">UUID del centro (se detectará automáticamente al guardar el API Key)</p>
                        </td>
                    </tr>
                    <?php endif; ?>
                </table>
                <?php submit_button(); ?>
            </form>

            <?php if (!empty($api_key) && empty($centers)): ?>
            <div class="card" style="margin-top: 20px; border-left: 4px solid #ffc107;">
                <h2>🔄 Detectar Centros</h2>
                <p>Después de guardar tu API Access Key, usa este botón para detectar los centros autorizados:</p>
                <form method="post" action="">
                    <?php wp_nonce_field('timp_fetch_centers_nonce'); ?>
                    <input type="submit" name="timp_fetch_centers" class="button button-secondary" value="Obtener Centros Autorizados">
                </form>
            </div>
            <?php endif; ?>

            <div class="card" style="margin-top: 20px;">
                <h2>🧪 Probar Conexión</h2>
                <p>Usa este botón para verificar que tu API Access Key y Centro están configurados correctamente:</p>
                <form method="post" action="">
                    <?php wp_nonce_field('timp_test_connection_nonce'); ?>
                    <input type="submit" name="timp_test_connection" class="button button-secondary" value="Probar Conexión a la API">
                </form>
            </div>

            <div class="card">
                <h2>📋 Instrucciones de Configuración</h2>
                <ol>
                    <li><strong>Crear cuenta de desarrollador:</strong> Regístrate en <a href="https://developers.timp.pro" target="_blank">developers.timp.pro</a></li>
                    <li><strong>Obtener API Access Key:</strong> Una vez registrado, copia tu API Access Key desde el panel de desarrolladores</li>
                    <li><strong>Autorizar el centro (CRÍTICO):</strong>
                        <ul style="margin-top: 10px;">
                            <li>En la pestaña "Centro" del panel de desarrolladores encontrarás un enlace de autorización</li>
                            <li>El administrador del centro debe abrir ese enlace mientras está logueado en TIMP</li>
                            <li>El sistema mostrará una opción de autorización que debe aprobar</li>
                            <li><strong>Sin esta autorización, no podrás acceder a los datos del centro</strong></li>
                        </ul>
                    </li>
                    <li><strong>Configurar el plugin:</strong>
                        <ul style="margin-top: 10px;">
                            <li>Introduce tu API Access Key arriba</li>
                            <li>Guarda los cambios</li>
                            <li>Los centros autorizados se detectarán automáticamente</li>
                            <li>Selecciona el centro de la lista desplegable</li>
                        </ul>
                    </li>
                    <li><strong>Probar conexión:</strong> Usa el botón "Probar Conexión" abajo para verificar</li>
                    <li><strong>Usar shortcode:</strong> Inserta <code>[timp_events]</code> en cualquier página</li>
                </ol>
                <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 12px; margin-top: 15px;">
                    <strong>✨ Nuevo:</strong> El plugin ahora detecta automáticamente los centros autorizados. No necesitas buscar manualmente el UUID del centro.
                </div>
            </div>

            <div class="card">
                <h2>🔧 Uso del Shortcode</h2>
                <p>Usa el siguiente shortcode en cualquier página o entrada:</p>
                <code>[timp_events]</code>
                <p>Con parámetros opcionales:</p>
                <code>[timp_events limit="50"]</code>
            </div>
        </div>
    <?php
    }

    // Encolar scripts y estilos
    public function enqueue_scripts()
    {
        global $post;

        // Verificar si hay shortcode en el contenido del post o si estamos en modo de edición
        $has_shortcode = false;

        if (is_singular() && !empty($post)) {
            // Verificar en el contenido normal
            $has_shortcode = has_shortcode($post->post_content, 'timp_events');

            // Verificar en meta fields de Divi/otros builders
            if (!$has_shortcode) {
                $meta = get_post_meta($post->ID);
                foreach ($meta as $key => $value) {
                    if (is_array($value)) {
                        foreach ($value as $v) {
                            if (is_string($v) && strpos($v, '[timp_events') !== false) {
                                $has_shortcode = true;
                                break 2;
                            }
                        }
                    }
                }
            }
        }

        // También cargar si hay el parámetro de página (para debugging)
        if (isset($_GET['timp_debug'])) {
            $has_shortcode = true;
        }

        if ($has_shortcode || is_page()) { // Cargar en todas las páginas por ahora para debugging
            wp_enqueue_style('timp-events-style', plugin_dir_url(__FILE__) . 'css/timp-events.css', array(), '1.0.3');
            wp_enqueue_script('timp-events-script', plugin_dir_url(__FILE__) . 'js/timp-events.js', array('jquery'), '1.0.3', true);

            wp_localize_script('timp-events-script', 'timpEvents', array(
                'ajaxurl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('timp_events_nonce')
            ));
        }
    }

    // Obtener centros autorizados
    private function get_authorized_centers()
    {
        $api_key = get_option('timp_api_key');

        if (empty($api_key)) {
            return array('error' => 'API Access Key no configurada');
        }

        $url = $this->api_url . '/timp/v1/branch_buildings';

        $response = wp_remote_get($url, array(
            'headers' => array(
                'Api-Access-Key' => $api_key,
                'Accept' => 'application/timp.timp-v1'
            ),
            'timeout' => 15
        ));

        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }

        $status_code = wp_remote_retrieve_response_code($response);

        if ($status_code !== 200) {
            return array(
                'error' => 'Error al obtener centros: ' . $status_code,
                'details' => 'Verifica tu API Access Key'
            );
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    // Obtener actividades de un centro
    private function get_center_activities($center_uuid)
    {
        $api_key = get_option('timp_api_key');

        if (empty($api_key)) {
            return array('error' => 'API Access Key no configurada');
        }

        $url = $this->api_url . '/timp/v1/branch_buildings/' . $center_uuid . '/activities';

        $response = wp_remote_get($url, array(
            'headers' => array(
                'Api-Access-Key' => $api_key,
                'Accept' => 'application/timp.timp-v1'
            ),
            'timeout' => 15
        ));

        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }

        $status_code = wp_remote_retrieve_response_code($response);

        if ($status_code !== 200) {
            return array('error' => 'Error al obtener actividades: ' . $status_code);
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    // Obtener admissions (sesiones) de una actividad
    private function get_activity_admissions($activity_uuid, $date_from, $date_to)
    {
        $api_key = get_option('timp_api_key');

        if (empty($api_key)) {
            return array('error' => 'API Access Key no configurada');
        }

        $url = $this->api_url . '/timp/v1/activities/' . $activity_uuid . '/admissions';
        $url = add_query_arg(array(
            'date_from' => $date_from,
            'date_to' => $date_to
        ), $url);

        $response = wp_remote_get($url, array(
            'headers' => array(
                'Api-Access-Key' => $api_key,
                'Accept' => 'application/timp.timp-v1'
            ),
            'timeout' => 15
        ));

        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }

        $status_code = wp_remote_retrieve_response_code($response);

        if ($status_code !== 200) {
            return array('error' => 'Error al obtener sesiones: ' . $status_code);
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        // Devolver la colección de admissions
        if (isset($data['collection'])) {
            return $data['collection'];
        }

        return array();
    }

    // Obtener todas las sesiones del centro (combinando todas las actividades)
    private function get_all_sessions($center_uuid, $start_date, $end_date)
    {
        // Obtener actividades del centro
        $activities = $this->get_center_activities($center_uuid);

        if (isset($activities['error'])) {
            return $activities;
        }

        if (empty($activities) || !is_array($activities)) {
            return array();
        }

        $all_sessions = array();

        // Obtener la hora actual en el mismo formato que la API (timezone Europa)
        $current_time = new DateTime('now', new DateTimeZone('Europe/Madrid'));

        // Para cada actividad, obtener sus admissions
        foreach ($activities as $activity) {
            $admissions = $this->get_activity_admissions($activity['uuid'], $start_date, $end_date);

            if (!isset($admissions['error']) && is_array($admissions)) {
                // Agregar información de la actividad a cada admission
                foreach ($admissions as $admission) {
                    // Filtrar sesiones que ya han comenzado
                    $session_start = new DateTime($admission['starting_at']);

                    // Solo incluir sesiones que aún no han comenzado
                    if ($session_start > $current_time) {
                        $session = array(
                            'id' => $admission['activity_uuid'] . '_' . $admission['starting_at'],
                            'name' => $activity['name'],
                            'description' => isset($activity['description']) ? $activity['description'] : '',
                            'starts_at' => $admission['starting_at'],
                            'ends_at' => $admission['ending_at'],
                            'professional' => array('name' => $admission['professional_name']),
                            'activity' => array(
                                'name' => $activity['name'],
                                'description' => isset($activity['description']) ? $activity['description'] : ''
                            ),
                            'capacity' => $admission['capacity'],
                            'bookings_count' => $admission['bookings_count'],
                            'status' => 'active'
                        );

                        $all_sessions[] = $session;
                    }
                }
            }
        }

        return $all_sessions;
    }

    // AJAX para obtener eventos
    public function ajax_get_events()
    {
        check_ajax_referer('timp_events_nonce', 'nonce');

        $week_offset = isset($_POST['week_offset']) ? intval($_POST['week_offset']) : 0;
        $center_uuid = get_option('timp_center_uuid');

        if (empty($center_uuid)) {
            error_log('TIMP: Centro UUID no configurado');
            wp_send_json_error(array(
                'message' => 'UUID del Centro no configurado'
            ));
            return;
        }

        // Calcular fechas de la semana
        $start_date = date('Y-m-d', strtotime("monday this week +{$week_offset} weeks"));
        $end_date = date('Y-m-d', strtotime("sunday this week +{$week_offset} weeks"));

        error_log('TIMP: Obteniendo sesiones para centro ' . $center_uuid . ' desde ' . $start_date . ' hasta ' . $end_date);

        $sessions = $this->get_all_sessions($center_uuid, $start_date, $end_date);

        error_log('TIMP: Sesiones obtenidas: ' . count($sessions));

        if (isset($sessions['error'])) {
            $error_response = array(
                'message' => $sessions['error']
            );

            // Agregar detalles adicionales si existen
            if (isset($sessions['details'])) {
                $error_response['details'] = $sessions['details'];
            }

            error_log('TIMP Error: ' . $sessions['error']);
            wp_send_json_error($error_response);
            return;
        }

        wp_send_json_success(array(
            'events' => $sessions,
            'start_date' => $start_date,
            'end_date' => $end_date,
            'debug' => array(
                'center_uuid' => $center_uuid,
                'events_count' => count($sessions)
            )
        ));
    }

    // Renderizar shortcode
    public function render_events_shortcode($atts)
    {
        $atts = shortcode_atts(array(
            'limit' => 100
        ), $atts);

        ob_start();
    ?>
        <div class="timp-events-container" data-limit="<?php echo esc_attr($atts['limit']); ?>">
            <div class="timp-events-header">
                <button class="et_pb_button et_pb_bg_layout_light" id="timp-prev-week">&larr; Semana Anterior</button>
                <!-- <button class="timp-nav-btn" id="timp-prev-week">&larr; Semana Anterior</button> -->
                <h2 class="timp-week-title">
                    <span id="timp-current-week">Esta semana</span>
                    <br>
                    <span id="timp-date-range" class="timp-date-range"></span>
                </h2>
                <button class="et_pb_button et_pb_bg_layout_light" id="timp-next-week">Semana Siguiente &rarr;</button>
                <!-- <button class="timp-nav-btn" id="timp-next-week">Semana Siguiente &rarr;</button> -->
            </div>

            <div class="timp-day-selector"></div>

            <div class="timp-events-loading" style="display: none;">
                <div class="timp-spinner"></div>
                <p>Cargando eventos...</p>
            </div>

            <div class="timp-events-error" style="display: none;">
                <p class="error-message"></p>
            </div>

            <div class="timp-events-list"></div>
        </div>
<?php
        return ob_get_clean();
    }
}

// Inicializar el plugin
new TIMP_Events_Plugin();

// Activación del plugin
register_activation_hook(__FILE__, 'timp_events_activate');
function timp_events_activate()
{
    // Crear directorio para assets si no existe
    $upload_dir = wp_upload_dir();
    $timp_dir = $upload_dir['basedir'] . '/timp-events';
    if (!file_exists($timp_dir)) {
        wp_mkdir_p($timp_dir);
    }
}

// Desactivación del plugin
register_deactivation_hook(__FILE__, 'timp_events_deactivate');
function timp_events_deactivate()
{
    // Limpiar transients si es necesario
    delete_transient('timp_events_cache');
}
