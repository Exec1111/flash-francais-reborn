import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { CircularProgress, Box } from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';

/**
 * Éditeur HTML basé sur TinyMCE optimisé pour les performances :
 * 1. Utilise initialValue au lieu de value pour éviter les conflits
 * 2. Gestion simplifiée du curseur sans interférence
 * 3. Debouncing réduit pour une meilleure réactivité
 */
const debug = (...args) => console.debug('[TinyHtmlEditor]', ...args);

// Custom hook for debouncing with reduced delay
const useDebounce = (callback, delay) => {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
};

const extractStyles = (html) => {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const linkRegex = /<link[^>]*rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let styles = '';
  let links = [];
  let match;
  while ((match = styleRegex.exec(html))) {
    styles += match[1] + '\n';
  }
  while ((match = linkRegex.exec(html))) {
    links.push(match[1]);
  }
  const cleanedHtml = html.replace(styleRegex, '').replace(linkRegex, '');
  return { styles, links, cleanedHtml };
};


const TinyHtmlEditor = forwardRef(({ initialHtml = '', onChange, disabled = false }, ref) => {
  const editorRef = useRef(null);
  const apiKey = process.env.REACT_APP_TINY_MCE_API_KEY || process.env.TINY_MCE_API_KEY || '';
  const { styles: initialStyles, links: initialLinks, cleanedHtml } = extractStyles(initialHtml);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const savedStylesRef = useRef(initialStyles);
  const savedLinksRef = useRef(initialLinks);
  const lastInitialHtmlRef = useRef(initialHtml);
  const isSettingContentRef = useRef(false);
  const staticInitialValueRef = useRef(cleanedHtml); // Static value that never changes
  const lastOnChangeHtmlRef = useRef(''); // Track last HTML sent via onChange
  const isUserTypingRef = useRef(false); // Track if user is actively typing

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    updateContent: (newHtml) => {
      if (editorRef.current && isInitialized) {
        const { styles, links, cleanedHtml } = extractStyles(newHtml);
        
        // Update styles
        if (styles && styles.length) {
          savedStylesRef.current = styles;
        }
        savedLinksRef.current = links;
        
        // Update content directly without triggering onChange
        isSettingContentRef.current = true;
        editorRef.current.setContent(cleanedHtml);
        setTimeout(() => {
          isSettingContentRef.current = false;
        }, 50);
        
        // Inject styles
        if (styles && styles.length) {
          const head = editorRef.current.getDoc().head;
          const old = head.querySelector('style[data-inline]');
          if (old) head.removeChild(old);
          const tag = editorRef.current.getDoc().createElement('style');
          tag.setAttribute('data-inline', 'true');
          tag.innerHTML = styles;
          head.appendChild(tag);
        }
        
        debug('TinyHtmlEditor: Content updated via imperative API');
      }
    },
    getContent: () => {
      if (editorRef.current && isInitialized) {
        return editorRef.current.getContent();
      }
      return '';
    },
    focus: () => {
      if (editorRef.current && isInitialized) {
        editorRef.current.focus();
      }
    }
  }), [isInitialized]);

  // Cache for reconstructed HTML parts to avoid repeated work
  const styleTagCache = useRef('');
  const linkTagsCache = useRef('');

  // Update caches when styles or links change
  useEffect(() => {
    if (savedStylesRef.current && savedStylesRef.current.trim()) {
      styleTagCache.current = `<style>\n${savedStylesRef.current}\n</style>\n`;
    } else {
      styleTagCache.current = '';
    }

    if (savedLinksRef.current && savedLinksRef.current.length > 0) {
      linkTagsCache.current = savedLinksRef.current.map(href =>
        `<link rel="stylesheet" href="${href}">`
      ).join('\n') + '\n';
    } else {
      linkTagsCache.current = '';
    }
  }, [initialStyles, initialLinks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Simple cleanup - no complex navigation management needed
      debug('Component unmounting, cleaning up editor');
    };
  }, []);

  // Debounced callback for expensive operations - reduced delay for better responsiveness
  const debouncedOnChange = useDebounce((callback) => {
    callback();
  }, 100); // Reduced to 100ms for better responsiveness

  // DISABLED: Completely ignore initialHtml changes to prevent cursor issues
  // AI updates will need to be handled differently if needed
  useEffect(() => {
    if (initialHtml !== lastInitialHtmlRef.current) {
      debug('TinyHtmlEditor: initialHtml changed but IGNORED to preserve cursor stability');
      lastInitialHtmlRef.current = initialHtml;
      
      // Only update styles if needed, never content
      const { styles } = extractStyles(initialHtml);
      if (styles && styles.length && isInitialized && editorRef.current) {
        savedStylesRef.current = styles;
        const head = editorRef.current.getDoc().head;
        const old = head.querySelector('style[data-inline]');
        if (old) head.removeChild(old);
        const tag = editorRef.current.getDoc().createElement('style');
        tag.setAttribute('data-inline', 'true');
        tag.innerHTML = styles;
        head.appendChild(tag);
      }
    }
  }, [initialHtml, isInitialized]);

  const contentCss = [process.env.PUBLIC_URL + '/tinymce-content.css'];
  if (savedLinksRef.current && savedLinksRef.current.length) {
    contentCss.push(...savedLinksRef.current);
  }
  const inlineStyles = savedStylesRef.current || '';
  // Style par défaut : texte noir pour éviter le texte blanc sur fond clair
  const defaultContentStyle = `${inlineStyles}\nbody { color: #000; }`;

  return (
    <Box sx={{ width: '100%' }}>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}


      <Editor
        apiKey={apiKey}
        tinymceScriptSrc={`https://cdn.tiny.cloud/1/${apiKey || 'no-api-key'}/tinymce/6/tinymce.min.js` }
        initialValue={staticInitialValueRef.current}
        disabled={disabled}
        onInit={(evt, editor) => {
          setLoading(false);
          editorRef.current = editor;
          setIsInitialized(true);
          // Injection immédiate lors de l'init selon les styles sauvegardés
          if (savedStylesRef.current && savedStylesRef.current.length) {
            const head = editor.getDoc().head;
            const old = head.querySelector('style[data-inline]');
            if (old) head.removeChild(old);
            const tag = editor.getDoc().createElement('style');
            tag.setAttribute('data-inline', 'true');
            tag.innerHTML = savedStylesRef.current;
            head.appendChild(tag);
            debug('onInit: injected saved styles', savedStylesRef.current.length);
          }
        }}
        onEditorChange={(html, editor) => {
           // Skip onChange if we're currently setting content programmatically
           if (isSettingContentRef.current) {
             debug('onChange: SKIPPED - programmatic setContent in progress');
             return;
           }

           // Debounced onChange to prevent excessive updates during typing
           const reconstructAndNotify = () => {
             // Reconstruct complete HTML with styles for saving using cached tags
             let completeHtml = html;

             // Add cached style and link tags
             completeHtml = linkTagsCache.current + styleTagCache.current + html;

             debug('onChange: reconstructed HTML with cached styles', {
               originalLength: html.length,
               completeLength: completeHtml.length,
               hasStyles: Boolean(styleTagCache.current),
               hasLinks: Boolean(linkTagsCache.current)
             });

             // Track what we're sending to prevent cycles
             lastOnChangeHtmlRef.current = html;
             
             onChange?.(completeHtml);
           };

           debouncedOnChange(reconstructAndNotify);
         }}
        init={{
          language: 'fr_FR',
          
          content_css: contentCss,
          content_style: defaultContentStyle,
          skin: 'oxide', // thème clair pour éviter texte blanc
          menubar: false,
          plugins: 'lists link table',
          toolbar:
            'undo redo | bold italic underline | alignleft aligncenter alignright | bullist numlist outdent indent | removeformat',
          // Important pour accepter tout le HTML
          valid_elements: '*[*]',
          valid_children: '+body[style]',
          // Hauteur automatique mais max à 600px
          min_height: 300,
          height: 500,
          branding: false,
          setup: (editor) => {
            let applyStylesTimeout = null;

            const applyStyles = () => {
              // Throttle the applyStyles function to avoid excessive calls
              if (applyStylesTimeout) return;

              applyStylesTimeout = setTimeout(() => {
                const currentHtml = editor.getContent({ format: 'html' });
                const { styles: extractedStyles } = extractStyles(currentHtml);
                const stylesToUse = extractedStyles || savedStylesRef.current;
                debug('applyStyles: EXECUTING. extracted', extractedStyles.length, 'fallback', savedStylesRef.current.length);
                if (!stylesToUse) {
                  applyStylesTimeout = null;
                  return;
                }
                const head = editor.getDoc().head;
                const old = head.querySelector('style[data-inline]');
                if (old) head.removeChild(old);
                const tag = editor.getDoc().createElement('style');
                tag.setAttribute('data-inline', 'true');
                tag.innerHTML = stylesToUse;
                head.appendChild(tag);
                applyStylesTimeout = null;
              }, 200); // Increased throttle to reduce interference
            };

            // Add event listeners - simplified approach
            editor.on('Init SetContent', applyStyles);
            
            // Simple NodeChange listener for style management
            let lastStyleCheck = 0;
            editor.on('NodeChange', (e) => {
              const now = Date.now();
              // Only check styles every 1000ms to reduce interference
              if (now - lastStyleCheck > 1000) {
                if (e.element && e.element.tagName === 'STYLE') {
                  lastStyleCheck = now;
                  setTimeout(() => {
                    applyStyles();
                  }, 100);
                }
              }
            });
          }
        }}
      />
    </Box>
  );
});

TinyHtmlEditor.propTypes = {
  initialHtml: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

TinyHtmlEditor.displayName = 'TinyHtmlEditor';

export default TinyHtmlEditor;
