(function() {
  'use strict';

  let widgetLoaded = false;

  function loadWidget() {
    if (widgetLoaded) {
      console.log('Emily Chat: Widget already loaded, skipping');
      return;
    }
    widgetLoaded = true;
    
    const emilyScript = document.createElement('script');
    emilyScript.src = window.location.hostname === 'localhost' || window.location.protocol === 'file:'
      ? 'http://localhost:3000/widget/emily-chat.js'
      : 'https://talktoemily.com/widget/emily-chat.js';
    emilyScript.async = true;
    document.head.appendChild(emilyScript);
  }

  // Load Supabase client library from CDN
  const supabaseScript = document.createElement('script');
  supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  supabaseScript.async = true;

  supabaseScript.onload = function() {
    console.log('Emily Chat: Supabase library loaded');
    loadWidget();
  };

  supabaseScript.onerror = function() {
    console.error('Emily Chat: Failed to load Supabase library');
    // Load widget anyway without real-time support
    loadWidget();
  };

  document.head.appendChild(supabaseScript);
})();
