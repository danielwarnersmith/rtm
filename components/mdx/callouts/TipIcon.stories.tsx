import type { Meta, StoryObj } from '@storybook/react';

// Tip icon SVG extracted from Tip component
function TipIcon({ size = 'default', className = '' }: { size?: 'small' | 'default' | 'large'; className?: string }) {
  const sizeClasses = {
    small: 'w-6 h-6',
    default: 'w-8 h-8 sm:w-10 sm:h-10',
    large: 'w-16 h-16',
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      className={`${sizeClasses[size]} ${className}`}
      aria-label="Tip"
    >
      <path
        fill="hsl(var(--foreground))"
        fillRule="evenodd"
        d="M75 5c11.046 0 20 8.954 20 20v50c0 11.046-8.954 20-20 20H25C13.954 95 5 86.046 5 75V25C5 13.954 13.954 5 25 5h50ZM63.29 16.11a3.128 3.128 0 0 0-4.163 2.216l-5.6 24.155c-.349 1.506-2.498 1.493-2.829-.017l-5.252-23.995a3.227 3.227 0 0 0-4.306-2.324 3.148 3.148 0 0 0-2.018 3.108l1.331 24.993a3 3 0 0 1-1.68 2.856l-6.692 3.265a9 9 0 0 0-4.848 10.001l4.282 19.68a5 5 0 0 0 4.859 3.938l17.846.094a9.5 9.5 0 0 0 8.174-4.575l16.301-26.89a3.005 3.005 0 0 0-4.732-3.643l-9.361 9.713c-1.015 1.053-2.788.246-2.66-1.21l3.348-38.17a3.128 3.128 0 0 0-2-3.195Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const meta = {
  title: 'Icons/Tip Icon',
  component: TipIcon,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'default', 'large'],
      description: 'Icon size',
      table: {
        type: { summary: "'small' | 'default' | 'large'" },
        defaultValue: { summary: 'default' },
      },
    },
  },
} satisfies Meta<typeof TipIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'default',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <TipIcon size="small" />
        <span className="text-xs text-neutral-600 dark:text-neutral-400">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <TipIcon size="default" />
        <span className="text-xs text-neutral-600 dark:text-neutral-400">Default</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <TipIcon size="large" />
        <span className="text-xs text-neutral-600 dark:text-neutral-400">Large</span>
      </div>
    </div>
  ),
};

export const InCallout: Story = {
  render: () => {
    const TipIconInline = () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        fill="none"
        className="mt-0.5 w-10 h-10 sm:w-8 sm:h-8"
        aria-label="Tip"
      >
        <path
          fill="hsl(var(--foreground))"
          fillRule="evenodd"
          d="M75 5c11.046 0 20 8.954 20 20v50c0 11.046-8.954 20-20 20H25C13.954 95 5 86.046 5 75V25C5 13.954 13.954 5 25 5h50ZM63.29 16.11a3.128 3.128 0 0 0-4.163 2.216l-5.6 24.155c-.349 1.506-2.498 1.493-2.829-.017l-5.252-23.995a3.227 3.227 0 0 0-4.306-2.324 3.148 3.148 0 0 0-2.018 3.108l1.331 24.993a3 3 0 0 1-1.68 2.856l-6.692 3.265a9 9 0 0 0-4.848 10.001l4.282 19.68a5 5 0 0 0 4.859 3.938l17.846.094a9.5 9.5 0 0 0 8.174-4.575l16.301-26.89a3.005 3.005 0 0 0-4.732-3.643l-9.361 9.713c-1.015 1.053-2.788.246-2.66-1.21l3.348-38.17a3.128 3.128 0 0 0-2-3.195Z"
          clipRule="evenodd"
        />
      </svg>
    );

    return (
      <div className="my-6 -mx-4 flex flex-col gap-2 sm:flex-row sm:gap-4 rounded-lg border border-neutral-950 py-4 px-4 dark:border-neutral-50 sm:mx-0 sm:rounded-lg">
        <div className="flex-shrink-0">
          <TipIconInline />
        </div>
        <div className="font-normal text-neutral-950 dark:text-neutral-50">
          <p className="my-0">This is how the tip icon appears in a Tip callout component.</p>
        </div>
      </div>
    );
  },
};

