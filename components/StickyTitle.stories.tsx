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
  argTypes: {
    title: {
      control: 'text',
      description: 'The title to display in the header when the section scrolls out of view',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    children: {
      control: false,
      description: 'The content to wrap. When it scrolls out of view, the title appears in the header.',
      table: {
        type: { summary: 'ReactNode' },
      },
    },
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
            <Header />
            <div className="min-h-screen">
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
    title: 'Analog Four MKII',
    children: (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-4 text-4xl font-bold">Analog Four MKII</h1>
        <p className="mb-8 text-lg text-neutral-600 dark:text-neutral-400">
          Scroll down to see the title appear in the header when this section scrolls out of view.
        </p>
        <div className="space-y-4">
          {Array.from({ length: 20 }, (_, i) => (
            <p key={i} className="text-neutral-700 dark:text-neutral-300">
              This is paragraph {i + 1}. Keep scrolling to see the sticky title behavior.
              The title will appear in the header when the heading scrolls out of view.
            </p>
          ))}
        </div>
      </div>
    ),
  },
};

export const WithLongContent: Story = {
  args: {
    title: 'Documentation Section',
    children: (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Documentation Section</h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            This is a longer section with more content to demonstrate the sticky title behavior.
          </p>
        </header>
        <div className="space-y-6">
          <section>
            <h2 className="mb-4 text-2xl font-semibold">Section 1</h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300">
              Content for section 1. Scroll down to see the title change in the header.
            </p>
          </section>
          <section>
            <h2 className="mb-4 text-2xl font-semibold">Section 2</h2>
            <p className="mb-4 text-neutral-700 dark:text-neutral-300">
              Content for section 2. The sticky title will remain visible in the header.
            </p>
          </section>
          {Array.from({ length: 15 }, (_, i) => (
            <section key={i}>
              <h2 className="mb-4 text-2xl font-semibold">Section {i + 3}</h2>
              <p className="mb-4 text-neutral-700 dark:text-neutral-300">
                More content to demonstrate scrolling behavior.
              </p>
            </section>
          ))}
        </div>
      </div>
    ),
  },
};

