return allReports.filter(r => (type === 'all' || r.type === type) && (status === 'all' || r.status === status));
}

function svgMarker(type) {
  const item = DAMAGE_TYPES[type] || DEFAULT_DAMAGE_TYPES.bache;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52"><circle cx="26" cy="22" r="18" fill="${item.color}" stroke="white" stroke-width="4"/><path d="M26 50 15 35h22L26 50Z" fill="${item.color}" stroke="white" stroke-width="3"/><text x="26" y="30" font-size="22" text-anchor="middle">${item.emoji}</text></svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new google.maps.Size(44, 44) };
}

function renderMap() {
  if (!map) return;
  markers.forEach(m => m.setMap(null));
  markers = [];
  filteredReports().forEach(report => {
    const item = DAMAGE_TYPES[report.type] || DEFAULT_DAMAGE_TYPES.bache;
    const marker = new google.maps.Marker({ position: { lat: Number(report.lat), lng: Number(report.lng) }, map, icon: svgMarker(report.type), title: `${item.label} - ${STATUS[report.status]}` });
    const info = new google.maps.InfoWindow({ content: reportPopupHtml(report, item) });
    marker.addListener('click', () => info.open({ anchor: marker, map }));
    markers.push(marker);
  });
}

async function submitReport(e) {
  e.preventDefault();
  if (!$('lat').value || !$('lng').value) return Swal.fire('Falta ubicación', 'Seleccioná un punto en el mapa o elegí una dirección de Google Maps.', 'warning');
  const addressValue = $('address').value.trim() || $('addressReference').value.trim();
  if (!addressValue) return Swal.fire('Falta dirección', 'Elegí una dirección desde el buscador de Google Maps o agregá una referencia manual.', 'warning');

  const files = Array.from($('images')?.files || []);
  const validation = validateImages(files);
  if (!validation.ok) return Swal.fire('Imágenes inválidas', validation.message, 'warning');

  const imageUrl = $('imageUrl')?.value.trim() || '';
  if (imageUrl && !isLikelyImageUrl(imageUrl)) {
    return Swal.fire('URL de imagen no válida', 'Ingresá una URL directa a una imagen JPG, PNG, WEBP, GIF o SVG.', 'warning');
  }

  const videoUrl = $('videoUrl').value.trim();
  if (videoUrl && !isAllowedVideoUrl(videoUrl)) {
    return Swal.fire('URL de video no válida', 'Solo se permiten enlaces de YouTube, TikTok, Instagram o Facebook.', 'warning');
  }

  const submitBtn = $('reportForm').querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submi