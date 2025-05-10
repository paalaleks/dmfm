'use client';

import { useCallback } from 'react';

export function useChatScroll(containerRef: React.RefObject<HTMLDivElement>) {
  const scrollToBottom = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

  return { containerRef, scrollToBottom };
}
