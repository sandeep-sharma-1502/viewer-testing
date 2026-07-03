import React, { ReactNode } from 'react';
import {
  Icons,
  ToolButton,
} from '../';
import { IconPresentationProvider } from '@ohif/ui-next';

import NavBar from '../NavBar';

// Todo: we should move this component to composition and remove props base

interface HeaderProps {
  children?: ReactNode;
  isSticky?: boolean;
  Secondary?: ReactNode;
  UndoRedo?: ReactNode;
}

function Header({
  children,
  isSticky = false,
  UndoRedo,
  Secondary,
  ...props
}: HeaderProps): ReactNode {

  return (
    <IconPresentationProvider
      size="large"
      IconContainer={ToolButton}
    >
      <NavBar
        isSticky={isSticky}
        {...props}
      >
        <div className="relative h-[60px] items-center">
          <div className="absolute top-1/2 left-4 h-8 -translate-y-1/2">{Secondary}</div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
            <div className="flex items-center justify-center space-x-2">{children}</div>
          </div>
          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 select-none items-center">
            {UndoRedo}
          </div>
        </div>
      </NavBar>
    </IconPresentationProvider>
  );
}

export default Header;
