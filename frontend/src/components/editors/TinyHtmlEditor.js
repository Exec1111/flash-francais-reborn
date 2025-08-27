import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { CircularProgress, Box } from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';

/**
 * Éditeur HTML basé sur TinyMCE qui applique :
 * 1. Le thème sombre global (public/tinymce-content.css).
 * 2. Les styles <style> inline extraits du HTML d'origine (injectés via data‐URI).
 *
 * API identique à HtmlEditor (initialHtml, onChange).
 */
const debug = (...args) => console.debug('[TinyHtmlEditor]', ...args);

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


const TinyHtmlEditor = ({ initialHtml = '', onChange }) => {
  const editorRef = useRef(null);
  const apiKey = process.env.REACT_APP_TINY_MCE_API_KEY || process.env.TINY_MCE_API_KEY || '';
  const { styles: initialStyles, links: initialLinks, cleanedHtml } = extractStyles(initialHtml);
  const [data, setData] = useState(cleanedHtml);
  const [loading, setLoading] = useState(true);
  const savedStylesRef = useRef(initialStyles);
  const savedLinksRef = useRef(initialLinks);

  useEffect(() => {
    const { styles, links, cleanedHtml } = extractStyles(initialHtml);
    debug('useEffect initialHtml change. styles length', styles.length);
    if (styles && styles.length) {
      savedStylesRef.current = styles;
    }
    savedLinksRef.current = links;
    setData(cleanedHtml);

    // Inject styles immediately when switching resource
    if (editorRef.current) {
      debug('Injecting styles after initialHtml change', styles.length, 'chars');
      if (!styles) debug('No styles to inject');
      if (styles && styles.length) {
        const head = editorRef.current.getDoc().head;
        const old = head.querySelector('style[data-inline]');
        if (old) head.removeChild(old);
        const tag = editorRef.current.getDoc().createElement('style');
        tag.setAttribute('data-inline', 'true');
        tag.innerHTML = styles;
        head.appendChild(tag);
      }
    }
  }, [initialHtml]);

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
        value={data}
        onInit={(evt, editor) => {
          setLoading(false);
          editorRef.current = editor;
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
        onEditorChange={(html) => {
          setData(html);
          
          // Reconstruct complete HTML with styles for saving
          let completeHtml = html;
          
          // Add styles back if they exist
          if (savedStylesRef.current && savedStylesRef.current.trim()) {
            completeHtml = `<style>\n${savedStylesRef.current}\n</style>\n${html}`;
          }
          
          // Add link tags back if they exist
          if (savedLinksRef.current && savedLinksRef.current.length > 0) {
            const linkTags = savedLinksRef.current.map(href => 
              `<link rel="stylesheet" href="${href}">`
            ).join('\n');
            completeHtml = `${linkTags}\n${completeHtml}`;
          }
          
          debug('onChange: sending complete HTML with styles', {
            originalLength: html.length,
            completeLength: completeHtml.length,
            hasStyles: Boolean(savedStylesRef.current),
            stylesLength: savedStylesRef.current ? savedStylesRef.current.length : 0
          });
          
          onChange?.(completeHtml);
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
            const applyStyles = () => {
              const currentHtml = editor.getContent({ format: 'html' });
              const { styles: extractedStyles } = extractStyles(currentHtml);
              const stylesToUse = extractedStyles || savedStylesRef.current;
              debug('applyStyles triggered. extracted', extractedStyles.length, 'fallback', savedStylesRef.current.length);
              if (!stylesToUse) return;
              const head = editor.getDoc().head;
              const old = head.querySelector('style[data-inline]');
              if (old) head.removeChild(old);
              const tag = editor.getDoc().createElement('style');
              tag.setAttribute('data-inline', 'true');
              tag.innerHTML = stylesToUse;
              head.appendChild(tag);
            };
            editor.on('Init SetContent', applyStyles);
            editor.on('NodeChange', applyStyles);
          }
        }}
      />
    </Box>
  );
};

TinyHtmlEditor.propTypes = {
  initialHtml: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

export default TinyHtmlEditor;
