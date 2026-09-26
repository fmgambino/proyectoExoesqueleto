.from('app_settings').select('value').eq('key', 'evidence_slider').maybeSingle();
    if (!error && data?.value) sliderSettings = { ...sliderSettings, ...data.value };
  } catch (err) { console.warn('Usando configuración local del slider.', err.message); }
  fillSliderSettingsForm();
}

function fillSliderSettingsForm() {
  if ($('sliderEffect')) $('sliderEffect').value = sliderSettings.effect || 'slide';
  if ($('sliderInterval')) $('sliderInterval').value = Number(sliderSettings.interval) || 4000;
  if ($('sliderAutoplay')) $('sliderAutoplay').checked = sliderSettings.autoplay !== false;
}

async function saveSliderSettings(e) {
  e?.preventDefault();
  sliderSettings = { effect: $('sliderEffect').value, interval: Number($('sliderInterval').value) || 4000, autoplay: $('sliderAutoplay').checked };
  localStorage.setItem('satHDP_sliderSettings', JSON.stringify(sliderSettings));
  try {
    await supabaseClient.from('app_settings').upsert({ key: 'evidence_slider', value: sliderSettings }, { onConflict: 'key' });
  } catch (err) { console.warn('No se pudo guardar en Supabase app_settings.', err.message); }
  renderEvidenceStrip();
  Swal.fire('Slider actualizado', 'La configuración del slider fue guardada.', 'success');
}

async function adminLogin() {
  const { error } = await supabaseClient.auth.signInWithPassword({ email: $('adminEmail').value, password: $('adminPassword').value });
  if (error) return Swal.fire('Acceso denegado', error.message, 'error');
  await checkSession();
}

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  const logged = !!data.session;
  $('loginBox').classList.toggle('hidden', logged);
  $('adminBox').classList.toggle('hidden', !logged);
  if