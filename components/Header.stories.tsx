import type { Meta, StoryObj } from '@storybook/react';
import { Header } from './Header';
import { HeaderProvider, useHeader } from './HeaderContext';
import { ThemeProvider } from './ThemeProvider';

// Wrapper component to demonstrate title functionality
function HeaderWithControls() {
  const { setTitle } = useHeader();
  
  return (
    <div>
      <div className="mb-4 flex gap-2 p-4">
        <button
          onClick={() => setTitle('Analog Four MKII')}
          className="rounded bg-neutral-200 px-4 py-2 text-sm hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          Set Title: Analog Four MKII
        </button>
        <button
          onClick={() => setTitle('Analog Rytm MKII')}
          className="rounded bg-neutral-200 px-4 py-2 text-sm hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          Set Title: Analog Rytm MKII
        </button>
        <button
          onClick={() => setTitle('')}
          className="rounded bg-neutral-200 px-4 py-2 text-sm hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          Clear Title
        </button>
      </div>
      <Header />
    </div>
  );
}

const meta = {
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story, context) => {
      // Sync ThemeProvider with Storybook's global theme
      const theme = context.globals?.theme || 'light';
      
      return (
        <ThemeProvider 
          attribute="class" 
          defaultTheme={theme} 
          forcedTheme={theme}
          enableSystem={false}
        >
          <HeaderProvider>
            <Story />
          </HeaderProvider>
        </ThemeProvider>
      );
    },
  ],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTitleControls: Story = {
  render: (args, context) => {
    // Sync ThemeProvider with Storybook's global theme
    const theme = context.globals?.theme || 'light';
    
    return (
      <ThemeProvider 
        attribute="class" 
        defaultTheme={theme}
        forcedTheme={theme}
        enableSystem={false}
      >
        <HeaderProvider>
          <HeaderWithControls />
        </HeaderProvider>
      </ThemeProvider>
    );
  },
};

