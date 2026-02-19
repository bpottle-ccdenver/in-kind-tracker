import { describe, expect, it } from 'vitest';

import { reducer } from '../use-toast.jsx';

describe('useToast reducer', () => {
  it('adds a new toast to the beginning of state when dispatched', () => {
    const initialState = {
      toasts: [
        { id: 'existing', title: 'Existing toast', open: true },
      ],
    };

    const result = reducer(initialState, {
      type: 'ADD_TOAST',
      toast: { id: 'new', title: 'New toast', open: true },
    });

    expect(result.toasts).toHaveLength(2);
    expect(result.toasts[0]).toMatchObject({ id: 'new', title: 'New toast' });
    expect(result.toasts[1]).toMatchObject({ id: 'existing' });
  });

  it('updates an existing toast when an update action is dispatched', () => {
    const initialState = {
      toasts: [
        { id: '1', title: 'Original title', open: true },
        { id: '2', title: 'Second toast', open: true },
      ],
    };

    const result = reducer(initialState, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated title', open: false },
    });

    expect(result.toasts[0]).toMatchObject({ id: '1', title: 'Updated title', open: false });
    expect(result.toasts[1]).toMatchObject({ id: '2', title: 'Second toast', open: true });
  });

  it('removes toasts when requested either individually or entirely', () => {
    const initialState = {
      toasts: [
        { id: '1', title: 'First', open: true },
        { id: '2', title: 'Second', open: true },
      ],
    };

    const removedSingle = reducer(initialState, {
      type: 'REMOVE_TOAST',
      toastId: '1',
    });

    expect(removedSingle.toasts).toEqual([{ id: '2', title: 'Second', open: true }]);

    const removedAll = reducer(initialState, {
      type: 'REMOVE_TOAST',
      toastId: undefined,
    });

    expect(removedAll.toasts).toEqual([]);
  });
});
