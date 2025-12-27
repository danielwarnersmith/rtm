import type { Meta, StoryObj } from '@storybook/react';
import { StickyTitle } from './StickyTitle';
import { HeaderProvider } from './HeaderContext';
import { Header } from './Header';
import { ThemeProvider } from './ThemeProvider';

const meta = {
  title: 'Components/StickyTitle',
  component: StickyTitle,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals?.theme || 'light';
      
      return (
        <ThemeProvider 
          attribute="class" 
          defaultTheme={theme}
          forcedTheme={theme}
          enableSystem={false}
        >
          <HeaderProvider>
            <Header />
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
              <Story />
            </div>
          </HeaderProvider>
        </ThemeProvider>
      );
    },
  ],
} satisfies Meta<typeof StickyTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Section Title',
    children: (
      <div className="prose dark:prose-invert max-w-none">
        <h1>Section Title</h1>
        <p>
          Scroll down to see the title appear in the header when this section scrolls out of view.
          The StickyTitle component uses IntersectionObserver to detect when its children leave the viewport.
        </p>
        <p>
          This is useful for showing section titles in a sticky header as users scroll through long content.
        </p>
        <div className="h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
          <p className="text-neutral-500 dark:text-neutral-400">
            Scroll down to see the title in the header
          </p>
        </div>
      </div>
    ),
  },
};

export const WithLongContent: Story = {
  args: {
    title: 'Analog Four MKII',
    children: (
      <div className="prose dark:prose-invert max-w-none">
        <h1>Analog Four MKII</h1>
        <p>
          This section demonstrates how the StickyTitle component works with longer content.
          As you scroll, the title will appear in the header when this section title scrolls out of view.
        </p>
        <h2>Features</h2>
        <ul>
          <li>Four analog voices</li>
          <li>Powerful sequencer</li>
          <li>Real-time control</li>
        </ul>
        <div className="h-[200vh] bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 flex items-start justify-center pt-20">
          <p className="text-neutral-500 dark:text-neutral-400">
            Scroll to see the title appear in the header
          </p>
        </div>
      </div>
    ),
  },
};

