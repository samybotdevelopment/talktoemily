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
    
    // Determine the base URL dynamically
    let baseUrl = 'https://talktoemily.com';
    if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
      baseUrl = 'http://localhost:3000';
    } else {
      // Try to extract from the loader script that's currently running
      const scripts = document.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src && src.includes('/widget/emily-loader.js')) {
          const url = new URL(src);
          baseUrl = `${url.protocol}//${url.host}`;
          break;
        }
      }
    }
    
    emilyScript.src = `${baseUrl}/widget/emily-chat.js`;
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
