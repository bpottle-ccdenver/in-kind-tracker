import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('input-otp', () => {
  const ReactModule = require('react');

  const OTPInputContext = ReactModule.createContext({ slots: [] });
  const OTPInput = ReactModule.forwardRef(({ containerClassName, className, children, ...props }, ref) => (
    <div data-testid="otp-root" className={containerClassName}>
      <div data-testid="otp-input" ref={ref} className={className} {...props}>
        {children}
      </div>
    </div>
  ));
  OTPInput.displayName = 'OTPInput';

  return { OTPInput, OTPInputContext };
});

const { OTPInputContext } = await import('input-otp');
const {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} = await import('../input-otp.jsx');

describe('InputOTP', () => {
  it('applies default and custom classes to the container and input', () => {
    const { getByTestId } = render(
      <InputOTP className="custom-input" containerClassName="custom-container" />,
    );

    const root = getByTestId('otp-root');
    const input = getByTestId('otp-input');

    expect(root).toHaveClass('flex', 'items-center');
    expect(root).toHaveClass('custom-container');
    expect(input).toHaveClass('disabled:cursor-not-allowed');
    expect(input).toHaveClass('custom-input');
  });

  it('renders slots with characters and caret states from context', () => {
    const { container } = render(
      <OTPInputContext.Provider
        value={{
          slots: [
            { char: '1', hasFakeCaret: false, isActive: false },
            { char: '', hasFakeCaret: true, isActive: true },
          ],
        }}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </OTPInputContext.Provider>,
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    const slotElements = Array.from(container.querySelectorAll('div')).filter((element) =>
      element.className.includes('relative flex h-9 w-9'),
    );
    expect(slotElements).toHaveLength(2);
    expect(slotElements[1]).toHaveClass('ring-1');
    expect(container.querySelector('.animate-caret-blink')).toBeInTheDocument();
  });

  it('renders a separator with the minus icon', () => {
    const { container } = render(<InputOTPSeparator />);

    const separator = container.querySelector('[role="separator"]');
    expect(separator).toBeInTheDocument();
    expect(separator?.querySelector('svg')).toBeInTheDocument();
  });
});
