import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, RADIUS } from '../theme';
import { moderateScale } from '../utils/responsive';

const CustomQuillViewer = ({
  content = '',
  collapsed = false,
  collapsedHeight = 80,
  onTruncationChange,
}) => {
  const webViewRef = useRef(null);
  const [height, setHeight] = useState(collapsed ? collapsedHeight : 0);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    // When collapsed state changes, update height
    if (collapsed) {
      setHeight(collapsedHeight);
    } else if (contentHeight > 0) {
      setHeight(contentHeight);
    } else {
      // If not measured yet, set a default (will be updated on measurement)
      setHeight(collapsedHeight);
    }
  }, [collapsed, contentHeight, collapsedHeight]);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, system-ui, sans-serif; 
            padding: 8px; 
            margin: 0; 
            color: #1a1a1a;
            font-size: 14px;
            line-height: 1.5;
            word-wrap: break-word;
            overflow-wrap: break-word;
            max-width: 100%;
            width: 100%;
          }
          p { 
            margin: 0 0 8px; 
            word-wrap: break-word;
            overflow-wrap: break-word;
            white-space: normal;
            max-width: 100%;
          }
          span { 
            background-color: transparent;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          div, section {
            max-width: 100%;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `;

  const onLoadEnd = () => {
    // Send message to get content height
    webViewRef.current?.injectJavaScript(`
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'height',
        height: document.body.scrollHeight
      }));
      true;
    `);
  };

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'height') {
        const measuredHeight = data.height || 50;
        setContentHeight(measuredHeight);
        // Determine if content exceeds collapsed height
        const truncated = measuredHeight > collapsedHeight;
        onTruncationChange?.(truncated);
        // Update height if not collapsed
        if (!collapsed) {
          setHeight(measuredHeight);
        } else {
          setHeight(collapsedHeight);
        }
      }
    } catch (e) {
      console.warn('Error parsing WebView message:', e);
    }
  };

  // If content is empty, return null or placeholder
  if (!content) return null;

  return (
    <View style={[styles.container, { height: height || collapsedHeight }]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        scalesPageToFit={false}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        originWhitelist={['*']}
        contentMode="mobile"
        onLoadEnd={onLoadEnd}
        onMessage={onMessage}
        injectedJavaScript={`
          document.body.style.width = '100%';
          document.body.style.maxWidth = '100%';
          true;
        `}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    width: '100%',
  },
});

export default CustomQuillViewer;