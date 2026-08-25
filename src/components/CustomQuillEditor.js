import React, { useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, RADIUS } from '../theme';
import { moderateScale, scaleHeight } from '../utils/responsive';

const EDITOR_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background: white; }
    #editor { height: 100%; min-height: 200px; }
    .ql-toolbar { border-top: none; border-left: none; border-right: none; }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
  <script>
    var quill = new Quill('#editor', {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ background: ['#fff59d', '#ffcc80', '#a5d6a7', '#90caf9', '#f8bbd0', false] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['clean'],
        ]
      }
    });

    quill.on('text-change', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'change',
        html: quill.root.innerHTML
      }));
    });
  </script>
</body>
</html>
`;

const CustomQuillEditor = forwardRef(({ value = '', onChange, error }, ref) => {
  const webViewRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useImperativeHandle(ref, () => ({
    getContent: () => {
      return new Promise((resolve) => {
        webViewRef.current?.injectJavaScript(`
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'getContent',
            html: quill.root.innerHTML
          }));
          true;
        `);
        resolve(value);
      });
    },
  }));

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'change') {
        const html = data.html === '<p><br></p>' || data.html === '<p></p>' ? '' : data.html;
        onChange(html);
      }
    } catch (e) {
      console.warn('Error parsing WebView message:', e);
    }
  };

  const onLoadEnd = () => {
    setIsLoaded(true);
    if (value) {
      const escaped = value.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
      webViewRef.current?.injectJavaScript(`
        quill.root.innerHTML = \`${escaped}\`;
        true;
      `);
    }
  };

  return (
    <View style={[styles.container, error && styles.containerError]}>
      <WebView
        ref={webViewRef}
        source={{ html: EDITOR_HTML }}
        style={styles.webview}
        onMessage={onMessage}
        onLoadEnd={onLoadEnd}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled
        originWhitelist={['*']}
        startInLoadingState
        scalesPageToFit={false}
        // Android workaround if needed: androidLayerType="software"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.textPrimary,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    minHeight: scaleHeight(200),
  },
  containerError: {
    borderColor: COLORS.error,
  },
  webview: {
    flex: 1,
    minHeight: scaleHeight(200),
  },
});

export default CustomQuillEditor;