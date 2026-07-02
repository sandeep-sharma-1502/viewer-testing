import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Button, Header, Icons, useModal, AboutModal, UserPreferencesModal } from '@ohif/ui-next';
import { useSystem } from '@ohif/core';
import { Toolbar } from '../Toolbar/Toolbar';
import HeaderPatientInfo from './HeaderPatientInfo';
import { PatientInfoVisibility } from './HeaderPatientInfo/HeaderPatientInfo';
import { preserveQueryParameters } from '@ohif/app';
import { Types } from '@ohif/core';

function ViewerHeader({ appConfig }: withAppTypes<{ appConfig: AppTypes.Config }>) {
  const { servicesManager, extensionManager, commandsManager } = useSystem();
  const { customizationService } = servicesManager.services;

  const navigate = useNavigate();
  const location = useLocation();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScroll, setHasScroll] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [maxWidth, setMaxWidth] = useState<number | null>(null);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    // Dynamically calculate actual available width symmetrically to prevent overlap on either side
    const logoEl = document.querySelector('[data-cy="return-to-work-list"]');
    const rightEl = document.querySelector('.absolute.right-0') || document.querySelector('[data-cy="patient-header"]')?.parentElement;
    if (logoEl && rightEl) {
      const logoRect = logoEl.getBoundingClientRect();
      const rightRect = rightEl.getBoundingClientRect();
      const screenCenter = window.innerWidth / 2;
      const leftDistance = screenCenter - logoRect.right;
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

    const timeout = setTimeout(checkScroll, 100);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      if (observer) {
        observer.disconnect();
      }
      clearTimeout(timeout);
    };
  }, [scrollRef]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -150 : 150;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const onClickReturnButton = () => {
    const { pathname } = location;
    const dataSourceIdx = pathname.indexOf('/', 1);

    const dataSourceName = pathname.substring(dataSourceIdx + 1);
    const existingDataSource = extensionManager.getDataSources(dataSourceName);

    const searchQuery = new URLSearchParams();
    if (dataSourceIdx !== -1 && existingDataSource) {
      searchQuery.append('datasources', pathname.substring(dataSourceIdx + 1));
    }

    const nextLocation = {
      pathname: '/',
      search: preserveQueryParameters(searchQuery, location.search),
    };

    navigate(nextLocation);
  };

  const { t } = useTranslation();
  const { show } = useModal();

  const menuOptions = [
    {
      title: t('Header:About'),
      icon: 'info',
      onClick: () =>
        show({
          content: AboutModal,
          title: t('AboutModal:About OHIF Viewer'),
          containerClassName: 'flex max-w-3xl p-6 flex-col',
        }),
    },
    {
      title: UserPreferencesModal.menuTitle ?? t('Header:Preferences'),
      icon: 'settings',
      onClick: () =>
        show({
          content: UserPreferencesModal,
          title: UserPreferencesModal.title ?? t('UserPreferencesModal:User preferences'),
          containerClassName:
            UserPreferencesModal?.containerClassName ?? 'flex max-w-4xl p-6 flex-col',
        }),
    },
  ];

  if (appConfig.oidc) {
    menuOptions.push({
      title: t('Header:Logout'),
      icon: 'power-off',
      onClick: async () => {
        navigate(`/logout?redirect_uri=${encodeURIComponent(window.location.href)}`);
      },
    });
  }

  return (
    <Header
      menuOptions={menuOptions}
      isReturnEnabled={!!appConfig.showStudyList}
      onClickReturnButton={onClickReturnButton}
      WhiteLabeling={appConfig.whiteLabeling}
      Secondary={<Toolbar buttonSection="secondary" />}
      PatientInfo={
        appConfig.showPatientInfo !== PatientInfoVisibility.DISABLED && (
          <HeaderPatientInfo
            servicesManager={servicesManager}
            appConfig={appConfig}
          />
        )
      }
      UndoRedo={
        <div className="text-primary flex cursor-pointer items-center">
          <Button
            variant="ghost"
            className="hover:bg-muted"
            data-cy="undo-btn"
            onClick={() => {
              commandsManager.run('undo');
            }}
          >
            <Icons.Undo className="" />
          </Button>
          <Button
            variant="ghost"
            className="hover:bg-muted"
            data-cy="redo-btn"
            onClick={() => {
              commandsManager.run('redo');
            }}
          >
            <Icons.Redo className="" />
          </Button>
        </div>
      }
    >
      <div
        className="relative flex items-center w-full group mx-auto px-10 h-full"
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
          className="flex items-center gap-[4px] overflow-x-auto no-scrollbar py-1 scroll-smooth w-full justify-start md:justify-center"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <Toolbar buttonSection="primary" />
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
