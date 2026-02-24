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
    
    // Determine the base URL by extracting from the loader script's src attribute
    let baseUrl = 'https://app.talktoemily.com';
    
    // Extract from the loader script that's currently running
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('/widget/emily-loader.js')) {
        const url = new URL(src);
        baseUrl = `${url.protocol}//${url.host}`;
        break;
      }
    }
    
    emilyScript.src = `${baseUrl}/widget/emily-chat.js`;
    emilyScript.async = false; // Load synchronously after Supabase
    document.head.appendChild(emilyScript);
  }

  // Load Supabase client library from CDN
  console.log('Emily Chat: Loading Supabase library from CDN...');
  const supabaseScript = document.createElement('script');
  supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  supabaseScript.async = false; // Load synchronously to ensure it's ready

  supabaseScript.onload = function() {
    console.log('Emily Chat: Supabase library loaded successfully');
    console.log('Emily Chat: window.supabase available?', typeof window.supabase !== 'undefined');
    loadWidget();
  };

  supabaseScript.onerror = function(error) {
    console.error('Emily Chat: Failed to load Supabase library', error);
    console.error('Emily Chat: CDN URL:', supabaseScript.src);
    // Load widget anyway without real-time support
    loadWidget();
  };

  document.head.appendChild(supabaseScript);
})();
