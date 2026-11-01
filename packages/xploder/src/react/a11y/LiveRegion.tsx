import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

export interface LiveRegionHandle {
  say(message: string): void;
}

const VISUALLY_HIDDEN_STYLE: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  margin: '-1px',
  padding: 0,
  border: 0,
};

export const LiveRegion = forwardRef<LiveRegionHandle>(function LiveRegion(_props, ref) {
  const [text, setText] = useState('');
  const currentRef = useRef('');
  const frameRef = useRef<number | null>(null);

  const say = useCallback((message: string) => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (message !== currentRef.current) {
      currentRef.current = message;
      setText(message);
      return;
    }

    currentRef.current = '';
    setText('');
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      currentRef.current = message;
      setText(message);
    });
  }, []);

  useImperativeHandle(ref, () => ({ say }), [say]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return (
    <div data-xploder-live="" aria-live="polite" aria-atomic="true" style={VISUALLY_HIDDEN_STYLE}>
      {text}
    </div>
  );
});
