import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

let canScrollPrev = false;
let canScrollNext = true;
let listeners = {};
let api;

vi.mock('embla-carousel-react', () => {
  const ReactModule = require('react');
  return {
    default: vi.fn(() => {
      listeners = {};
      api = {
        scrollPrev: vi.fn(),
        scrollNext: vi.fn(),
        canScrollPrev: vi.fn(() => canScrollPrev),
        canScrollNext: vi.fn(() => canScrollNext),
        on: vi.fn((event, handler) => {
          listeners[event] = handler;
        }),
        off: vi.fn((event) => {
          delete listeners[event];
        }),
      };
      const ref = ReactModule.createRef();
      const callbackRef = (node) => {
        ref.current = node;
      };
      return [callbackRef, api];
    }),
  };
});

const {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} = await import('../carousel.jsx');

describe('Carousel', () => {
  beforeEach(() => {
    canScrollPrev = false;
    canScrollNext = true;
    listeners = {};
  });

  it('registers carousel api and updates button states', async () => {
    canScrollPrev = true;
    canScrollNext = true;
    const setApi = vi.fn();

    render(
      <Carousel setApi={setApi}>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );

    const currentApi = setApi.mock.calls.at(-1)?.[0];
    expect(setApi).toHaveBeenCalled();
    const prevButton = screen.getByRole('button', { name: /previous slide/i });
    const nextButton = screen.getByRole('button', { name: /next slide/i });

    await waitFor(() => {
      expect(prevButton).not.toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });

    canScrollPrev = false;
    canScrollNext = false;
    const selectHandler = currentApi?.on.mock.calls.find(([event]) => event === 'select')?.[1];
    expect(selectHandler).toBeTypeOf('function');

    act(() => {
      selectHandler?.(currentApi);
    });

    await waitFor(() => {
      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });

  it('responds to keyboard navigation events', () => {
    const setApi = vi.fn();
    render(
      <Carousel setApi={setApi}>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );

    const currentApi = setApi.mock.calls.at(-1)?.[0];
    const region = screen.getByRole('region');

    region.focus();
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(currentApi.scrollNext).toHaveBeenCalled();

    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(currentApi.scrollPrev).toHaveBeenCalled();
  });
});
