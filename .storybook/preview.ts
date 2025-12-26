import type { Preview } from '@storybook/nextjs-vite';
import React, { useEffect } from 'react';
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      // Auto-detect color and date controls
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      // Sort controls alphabetically for better organization
      sort: 'alpha',
      // Show expanded controls with descriptions
      expanded: true,
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      // Use context to get theme from globals
      // Context provides: args, argTypes, globals, hooks, parameters, viewMode
      const theme = context.globals?.theme || context.parameters?.theme || 'light';
      
      // React component wrapper to handle theme changes reactively
      const ThemedWrapper = () => {
        useEffect(() => {
          // Apply dark class to html element based on theme from context
          if (typeof document !== 'undefined') {
            const html = document.documentElement;
            if (theme === 'dark') {
              html.classList.add('dark');
            } else {
              html.classList.remove('dark');
            }
          }
        }, [theme]);
        
        return React.createElement(Story);
      };
      
      return React.createElement(ThemedWrapper);
    },
  ],
};

export default preview;