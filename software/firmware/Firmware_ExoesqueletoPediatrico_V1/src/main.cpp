al);
  window.Swal.fire = (...args) => {
    const dialog = document.getElementById('adminDialog');
    const adminOpen = dialog && dialog.open;
    let options;
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      options = { ...args[0] };
    } else {
      options = { title: args[0], html: args[1], icon: args[2] };
    }
    if (adminOpen && !options.target) {
      const previousDidOpen = options.didOpen;
      options.target = dialog;
      options.heightAuto = false;
      options.scrollbarPadding = false;
      options.customClass = {
        ...(options.customClass || {}),
        container: `${options.customClass?.container || ''} admin-swal-container`.trim(),
        popup: `${options.customClass?.popup || ''} admin-swal-popup`.trim()
      };
      options.didOpen = (popup) => {
        popup?.focus?.();
        if (typeof previousDidOpen === 'function') previousDidOpen(popup);
      };
    }
    return originalFire(options);
  };
}

function initSupabase() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG || {};
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function showMapError(title, message) {
  const mapEl = $('map');
  if (mapEl) mapEl.innerHTML = `<div class="map-error"><strong>${title}</strong><p>${message}</p></div>`;
  Swal.fire(title, message, 'error');
}

function loadGoogleMaps() {
  const key = window.APP_CONFIG?.GOOGLE_MAPS_API_KEY;
  if (!key || key.includes('TU_GOOGLE')) {
    showMapError('Falta configurar Google Maps', 'Abrí config.js y cargá GOOGLE_MAPS_API_KEY con una clave válida.');
    return Promise.reject(new Error('Missing Google Maps API key'));
  }
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    window.__satHDPGoogleReady = () => resolve();
    const oldScript = document.getElementById('googleMapsScript');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'googleMapsScript';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async&callback=__satHDPGoogleReady`;
    script.onerror = () => {
      const msg = 'No se pudo cargar Google Maps. Revisá que Maps JavaScript API y Places API estén habilitadas y que el referer autorizado incluya https://fmgambino.github.io/* y https://fmgambino.github.io/satHDP/*.';
      showMapError('Google Maps no cargó', msg);
      reject(new Error(msg));
    };
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

async function initMap() {
  await loadGoogleMaps();
  const { Map } = await google.maps.importLibrary('maps');
  map = new Map($('map'), {
    center: window.APP_CONFIG.MAP_CENTER,
    zoom: window.APP_CONFIG.MAP_ZOOM,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    styles: document.documentElement.dataset.theme === 'dark' ? darkMapStyle : []
  });
  geocoder = new google.maps.Geocoder();
  map.addListener('click', (e) => setSelectedLocation(e.latLng.lat(), e.latLng.lng()));
  initLocationFilters();
  await initGoogleAutocomplete();
  zoomToDeviceLocation(false);
  await loadDamageTypes();
  await loadReports();
  initRealtime();
}

async function initGoogleAutocomplete() {
  try {
    const places = await google.maps.importLibrary('places');
    if (places.PlaceAutocompleteElement) {
      createPlaceAutocompleteElement('searchHost', 'Buscar dirección, barrio, plaza...', false);
      createPlace