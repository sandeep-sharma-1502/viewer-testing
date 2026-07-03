import React, { useRef, useState, useEffect } from 'react';

import { Button, Header, Icons } from '@ohif/ui-next';
import { useSystem } from '@ohif/core';
import { Toolbar } from '../Toolbar/Toolbar';
import { Types } from '@ohif/core';

function ViewerHeader({ appConfig }: withAppTypes<{ appConfig: AppTypes.Config }>) {
  const { commandsManager } = useSystem();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScroll, setHasScroll] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [maxWidth, setMaxWidth] = useState<number | null>(null);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    // Dynamically calculate actual available width symmetrically to prevent overlap on either side
    const rightEl = document.querySelector('.absolute.right-0') || document.querySelector('[data-cy="patient-header"]')?.parentElement;
    if (rightEl) {
      const rightRect = rightEl.getBoundingClientRect();
      const screenCenter = window.innerWidth / 2;
      const leftDistance = screenCenter;
      const rightDistance = rightRect.left - screenCenter;
      const maxHalfWidth = Math.min(leftDistance, rightDistance) - 12; // 24px safety margin per side
      const newMax = Math.max(200, maxHalfWidth * 2);
      setMaxWidth(prev => {
        if (prev === null || Math.abs(prev - newMax) > 5) {
          return newMax;
        }
        return prev;
      });
    }

    // Scrolling is needed if content is wider than client container width
    const canScroll = el.scrollWidth > el.clientWidth + 5;
    setHasScroll(canScroll);
    setShowLeftArrow(el.scrollLeft > 5);
    setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();

    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    // Setup MutationObserver to watch for changes in the right-side controls container
    // such as patient info expanding or collapsing.
    let observer: MutationObserver | null = null;
    const rightEl = document.querySelector('.absolute.right-0') || document.querySelector('[data-cy="patient-header"]')?.parentElement;
    if (rightEl) {
      observer = new MutationObserver(() => {
        checkScroll();
      });
      observer.observe(rightEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    // Setup MutationObserver to watch for changes in the toolbar container itself
    const toolbarObserver = new MutationObserver(() => {
      checkScroll();
    });
    toolbarObserver.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const timeout = setTimeout(checkScroll, 100);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      if (observer) {
        observer.disconnect();
      }
      toolbarObserver.disconnect();
      clearTimeout(timeout);
    };
  }, [scrollRef]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -150 : 150;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };





  return (
    <Header
      Secondary={<Toolbar buttonSection="secondary" />}
    >
      <div
        className="relative flex items-center justify-center w-full group mx-auto px-10 h-full"
        style={maxWidth ? { maxWidth: `${maxWidth}px` } : undefined}
      >
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          .no-scrollbar {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
        `}</style>
        {hasScroll && (
          <button
            onClick={() => handleScroll('left')}
            disabled={!showLeftArrow}
            className={`absolute left-1.5 z-[50] flex items-center justify-center w-7 h-11 border border-[#38bdf8]/40 hover:bg-[#38bdf8]/10 rounded-md text-[#38bdf8] transition-all shadow-md ${!showLeftArrow ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'opacity-100'}`}
          >
            <div className="flex items-center justify-center w-5 h-5 rounded-full border border-[#38bdf8]/50">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#38bdf8]">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </div>
          </button>
        )}
        <div
          ref={scrollRef}
          className={`flex items-center gap-[4px] overflow-x-auto no-scrollbar py-1 scroll-smooth justify-start ${hasScroll ? 'w-full' : 'w-auto'}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <Toolbar buttonSection="primary" />
        </div>
        <div className="text-primary flex cursor-pointer items-center h-7 gap-[2px] flex-shrink-0">
          <Button
            variant="ghost"
            className="hover:bg-muted h-7 px-1.5"
            data-cy="undo-btn"
            onClick={() => {
              commandsManager.run('undo');
            }}
          >
            <Icons.Undo className="" />
          </Button>
          <Button
            variant="ghost"
            className="hover:bg-muted h-7 px-1.5"
            data-cy="redo-btn"
            onClick={() => {
              commandsManager.run('redo');
            }}
          >
            <Icons.Redo className="" />
          </Button>
        </div>
        {hasScroll && (
          <button
            onClick={() => handleScroll('right')}
            disabled={!showRightArrow}
            className={`absolute right-1.5 z-[50] flex items-center justify-center w-7 h-11 border border-[#38bdf8]/40 hover:bg-[#38bdf8]/10 rounded-md text-[#38bdf8] transition-all shadow-md ${!showRightArrow ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'opacity-100'}`}
          >
            <div className="flex items-center justify-center w-5 h-5 rounded-full border border-[#38bdf8]/50">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#38bdf8]">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        )}
      </div>
    </Header>
  );
}

export default ViewerHeader;
