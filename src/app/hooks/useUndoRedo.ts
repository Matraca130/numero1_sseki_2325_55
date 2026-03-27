import { useState, useRef, useCallback } from 'react';

export function useUndoRedo<T>(initialState: T, maxHistory = 50) {
  const [state, setState] = useState<T>(initialState);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const [pastLength, setPastLength] = useState(0);
  const [futureLength, setFutureLength] = useState(0);

  const set = useCallback(
    (newState: T) => {
      setState((current) => {
        pastRef.current = [...pastRef.current, current];
        if (pastRef.current.length > maxHistory) {
          pastRef.current = pastRef.current.slice(-maxHistory);
        }
        futureRef.current = [];
        return newState;
      });
      setPastLength(pastRef.current.length);
      setFutureLength(0);
    },
    [maxHistory],
  );

  const undo = useCallback(() => {
    setState((current) => {
      if (pastRef.current.length === 0) return current;
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [...futureRef.current, current];
      return previous;
    });
    setPastLength(pastRef.current.length);
    setFutureLength(futureRef.current.length);
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      if (futureRef.current.length === 0) return current;
      const next = futureRef.current[futureRef.current.length - 1];
      futureRef.current = futureRef.current.slice(0, -1);
      pastRef.current = [...pastRef.current, current];
      return next;
    });
    setPastLength(pastRef.current.length);
    setFutureLength(futureRef.current.length);
  }, []);

  const reset = useCallback((newState: T) => {
    pastRef.current = [];
    futureRef.current = [];
    setState(newState);
    setPastLength(0);
    setFutureLength(0);
  }, []);

  const canUndo = pastLength > 0;
  const canRedo = futureLength > 0;

  return { state, set, undo, redo, canUndo, canRedo, reset };
}
