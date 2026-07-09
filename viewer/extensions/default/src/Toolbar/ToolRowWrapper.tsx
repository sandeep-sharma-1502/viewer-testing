import React from 'react';
import { useToolbar, ButtonLocation } from '@ohif/core';

interface ToolRowWrapperProps {
  buttonSection: string;
  className?: string;
  show?: boolean;
}

function ToolRowWrapper({ buttonSection, className = '', show = true }: ToolRowWrapperProps) {
  const { onInteraction, toolbarButtons } = useToolbar({
    buttonSection,
  });

  // No need for debugger statement
  if (!toolbarButtons?.length) {
    return null;
  }

  return (
    <div className={`space-x-1 flex flex-row items-center ${className}`}>
      {(() => {
        const elements: React.ReactNode[] = [];
        let i = 0;
        while (i < toolbarButtons.length) {
          const button = toolbarButtons[i];
          const nextButton = toolbarButtons[i + 1];

          if (button && nextButton && button.id + 'Presets' === nextButton.id) {
            elements.push(
              <div
                key={`${button.id}Group`}
                className="flex flex-row items-center border border-input/10 rounded-lg p-[1px] space-x-[1px]"
              >
                <button.Component
                  {...button.componentProps}
                  onInteraction={onInteraction}
                  location={button.componentProps.location || buttonSection}
                />
                <div className="bg-primary h-5 w-px self-center opacity-100"></div>
                <nextButton.Component
                  {...nextButton.componentProps}
                  onInteraction={onInteraction}
                  location={nextButton.componentProps.location || buttonSection}
                />
              </div>
            );
            i += 2;
          } else {
            elements.push(
              <div
                key={button.id || i}
                className="flex-shrink-0"
              >
                <button.Component
                  {...button.componentProps}
                  onInteraction={onInteraction}
                  location={button.componentProps.location || buttonSection}
                />
              </div>
            );
            i += 1;
          }
        }
        return elements;
      })()}
    </div>
  );
}

export default ToolRowWrapper;
