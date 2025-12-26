import type { Meta, StoryObj } from '@storybook/react';

// Warning icon SVG extracted from Warning component
function WarningIcon({ size = 'default', className = '' }: { size?: 'small' | 'default' | 'large'; className?: string }) {
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
      aria-label="Warning"
    >
      <path
        className="fill-amber-700 dark:fill-amber-400"
        d="M50 66.69a5 5 0 1 1 0 10.002 5 5 0 0 1 0-10.001Zm0-31.5a5.407 5.407 0 0 1 5.378 5.968L53.496 59.21a3.884 3.884 0 0 1-3.862 3.482 3.782 3.782 0 0 1-3.77-3.49l-1.4-18.028A5.553 5.553 0 0 1 50 35.191Z"
      />
      <path
        className="fill-amber-700 dark:fill-amber-400"
        fillRule="evenodd"
        d="M44.839 14.75c2.324-3.92 7.998-3.92 10.322 0L94.59 81.244c1.818 3.066-.392 6.946-3.956 6.946H9.366c-3.565 0-5.774-3.88-3.956-6.947L44.84 14.75Zm5.59 9.666a.5.5 0 0 0-.859 0l-32.032 54.02a.5.5 0 0 0 .43.755h64.063a.5.5 0 0 0 .43-.755L50.43 24.416Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const meta = {
  title: 'Icons/Warning Icon',
  component: WarningIcon,
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
} satisfies Meta<typeof WarningIcon>;

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
        <WarningIcon size="small" />
        <span className="text-xs text-neutral-600 dark:text-neutral-400">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <WarningIcon size="default" />
        <span className="text-xs text-neutral-600 dark:text-neutral-400">Default</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <WarningIcon size="large" />
        <span className="text-xs text-neutral-600 dark:text-neutral-400">Large</span>
      </div>
    </div>
  ),
};

export const InCallout: Story = {
  render: () => {
    const WarningIconInline = () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        fill="none"
        className="mt-0.5 w-10 h-10 sm:w-8 sm:h-8"
        aria-label="Warning"
      >
        <path
          className="fill-amber-700 dark:fill-amber-400"
          d="M50 66.69a5 5 0 1 1 0 10.002 5 5 0 0 1 0-10.001Zm0-31.5a5.407 5.407 0 0 1 5.378 5.968L53.496 59.21a3.884 3.884 0 0 1-3.862 3.482 3.782 3.782 0 0 1-3.77-3.49l-1.4-18.028A5.553 5.553 0 0 1 50 35.191Z"
        />
        <path
          className="fill-amber-700 dark:fill-amber-400"
          fillRule="evenodd"
          d="M44.839 14.75c2.324-3.92 7.998-3.92 10.322 0L94.59 81.244c1.818 3.066-.392 6.946-3.956 6.946H9.366c-3.565 0-5.774-3.88-3.956-6.947L44.84 14.75Zm5.59 9.666a.5.5 0 0 0-.859 0l-32.032 54.02a.5.5 0 0 0 .43.755h64.063a.5.5 0 0 0 .43-.755L50.43 24.416Z"
          clipRule="evenodd"
        />
      </svg>
    );

    return (
      <div className="my-6 -mx-4 flex flex-col gap-1.5 sm:flex-row sm:gap-4 rounded-lg border border-amber-700 pt-2 pb-4 sm:pt-4 px-4 dark:border-amber-400 sm:mx-0 sm:rounded-lg">
        <div className="flex-shrink-0">
          <WarningIconInline />
        </div>
        <div className="font-normal text-amber-700 dark:text-amber-400">
          <p className="my-0">This is how the warning icon appears in a Warning callout component.</p>
        </div>
      </div>
    );
  },
};

export const ColorVariations: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Light Mode</h3>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-white p-4">
            <WarningIcon size="default" />
            <span className="text-xs text-neutral-600">Amber 700</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Dark Mode</h3>
        <div className="flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex flex-col items-center gap-2">
            <WarningIcon size="default" />
            <span className="text-xs text-neutral-400">Amber 400</span>
          </div>
        </div>
      </div>
    </div>
  ),
};

