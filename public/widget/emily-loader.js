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
    emilyScript.async = false;
    document.head.appendChild(emilyScript);
  }

  // Try multiple CDN sources for Supabase
  console.log('Emily Chat: Loading Supabase library...');
  
  const cdnOptions = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
  ];
  
  let cdnIndex = 0;
  
  function tryLoadSupabase() {
    if (cdnIndex >= cdnOptions.length) {
      console.error('Emily Chat: Failed to load Supabase from all CDN sources');
      console.error('Emily Chat: Real-time updates will not work');
      loadWidget();
      return;
    }
    
    const supabaseScript = document.createElement('script');
    supabaseScript.src = cdnOptions[cdnIndex];
    supabaseScript.async = false;
    
    supabaseScript.onload = function() {
      console.log('Emily Chat: Supabase library loaded successfully from:', cdnOptions[cdnIndex]);
      console.log('Emily Chat: window.supabase available?', typeof window.supabase !== 'undefined');
      loadWidget();
    };
    
    supabaseScript.onerror = function() {
      console.warn('Emily Chat: Failed to load from:', cdnOptions[cdnIndex]);
      cdnIndex++;
      tryLoadSupabase();
    };
    
    document.head.appendChild(supabaseScript);
  }
  
  tryLoadSupabase();
})();
