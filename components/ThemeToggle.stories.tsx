import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from './ThemeProvider';

const meta = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
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
          <Story />
        </ThemeProvider>
      );
    },
  ],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InHeader: Story = {
  render: () => (
    <div className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">RTM</span>
      <ThemeToggle />
    </div>
  ),
};

