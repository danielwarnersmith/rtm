import type { Meta, StoryObj } from '@storybook/react';
import { Tip } from './Tip';
import { Warning } from './Warning';

const meta = {
  title: 'Icons/Callout Icons',
  component: () => null,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const IconComparison: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4 text-xl font-semibold">Tip Icon</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <Tip>
              <p>The tip icon uses the theme&apos;s foreground color and appears in Tip callouts.</p>
            </Tip>
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            <p><strong>Color:</strong> Uses <code>hsl(var(--foreground))</code> - adapts to light/dark theme</p>
            <p><strong>Size:</strong> w-10 h-10 on mobile, w-8 h-8 on desktop</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Warning Icon</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <Warning>
              <p>The warning icon uses amber colors and appears in Warning callouts.</p>
            </Warning>
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            <p><strong>Color:</strong> Amber 700 in light mode, Amber 400 in dark mode</p>
            <p><strong>Size:</strong> w-10 h-10 on mobile, w-8 h-8 on desktop</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Side by Side</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Tip>
              <p>This is a tip callout with the tip icon.</p>
            </Tip>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Warning>
              <p>This is a warning callout with the warning icon.</p>
            </Warning>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const SVGFiles: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold">SVG Files in Public Directory</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h4 className="mb-2 text-sm font-medium">Tip Icon</h4>
            <img 
              src="/icons/tip.svg" 
              alt="Tip icon SVG" 
              className="h-16 w-16"
            />
            <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
              Path: <code>/icons/tip.svg</code>
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h4 className="mb-2 text-sm font-medium">Warning Icon</h4>
            <img 
              src="/icons/warning.svg" 
              alt="Warning icon SVG" 
              className="h-16 w-16"
            />
            <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
              Path: <code>/icons/warning.svg</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

