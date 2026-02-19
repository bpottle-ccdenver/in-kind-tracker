import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Avatar, AvatarImage, AvatarFallback } from '../avatar.jsx';

describe('Avatar', () => {
  it('renders with default styling and supports custom classes', () => {
    render(
      <Avatar data-testid="avatar-root" className="extra-class">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );

    const root = screen.getByTestId('avatar-root');
    expect(root).toHaveClass('relative');
    expect(root).toHaveClass('flex');
    expect(root).toHaveClass('extra-class');
  });

  it('renders fallback content when provided', () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="avatar-fallback">JD</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
  });

  it('renders the avatar image with passed props', async () => {
    const OriginalImage = globalThis.Image;

    class ImageMock {
      listeners = new Map();

      addEventListener(type, handler) {
        this.listeners.set(type, handler);
        if (type === 'load') {
          Promise.resolve().then(() => handler(new Event('load')));
        }
      }

      removeEventListener(type) {
        this.listeners.delete(type);
      }

      set src(_) {}
    }

    vi.stubGlobal('Image', ImageMock);

    render(
      <Avatar>
        <AvatarImage src="/avatar.png" alt="Profile" />
        <AvatarFallback>PR</AvatarFallback>
      </Avatar>,
    );

    const image = await screen.findByRole('img', { name: 'Profile' });
    expect(image).toHaveAttribute('src', '/avatar.png');
    expect(image).toHaveClass('aspect-square');

    vi.stubGlobal('Image', OriginalImage);
  });
});
