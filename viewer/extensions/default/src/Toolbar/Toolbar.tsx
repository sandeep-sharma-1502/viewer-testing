import React from 'react';
import { useToolbar } from '@ohif/core';

/**
 * Props for the Toolbar component that renders a collection of toolbar buttons and/or button sections.
 *
 * @interface ToolbarProps
 */
interface ToolbarProps {
  /**
   * The section of buttons to display in the toolbar.
   * Common values include 'primary', 'secondary', 'tertiary', etc.
   * Defaults to 'primary' if not specified.
   *
   * @default 'primary'
   */
  buttonSection?: string;

  /**
   * The unique identifier of the viewport this toolbar is associated with.
   */
  viewportId?: string;

  /**
   * The numeric position or location of the toolbar.
   * Used for ordering and layout purposes in the UI.
   */
  location?: number;
}

export function Toolbar({ buttonSection = 'primary', viewportId, location }: ToolbarProps) {
  const {
    toolbarButtons,
    onInteraction,
    isItemOpen,
    isItemLocked,
    openItem,
    closeItem,
    toggleLock,
  } = useToolbar({
    buttonSection,
  });

  if (!toolbarButtons.length) {
    return null;
  }

  return (
    <>
      {(() => {
        const elements: React.ReactNode[] = [];
        let i = 0;
        while (i < toolbarButtons.length) {
          const toolDef = toolbarButtons[i];
          const nextToolDef = toolbarButtons[i + 1];

          if (toolDef && nextToolDef && toolDef.id + 'Presets' === nextToolDef.id) {
            const enhancedProps = {
              ...toolDef.componentProps,
              isOpen: isItemOpen(toolDef.id, viewportId),
              isLocked: isItemLocked(toolDef.id, viewportId),
              onOpen: () => openItem(toolDef.id, viewportId),
              onClose: () => closeItem(toolDef.id, viewportId),
              onToggleLock: () => toggleLock(toolDef.id, viewportId),
              viewportId,
            };

            const nextEnhancedProps = {
              ...nextToolDef.componentProps,
              isOpen: isItemOpen(nextToolDef.id, viewportId),
              isLocked: isItemLocked(nextToolDef.id, viewportId),
              onOpen: () => openItem(nextToolDef.id, viewportId),
              onClose: () => closeItem(nextToolDef.id, viewportId),
              onToggleLock: () => toggleLock(nextToolDef.id, viewportId),
              viewportId,
            };

            elements.push(
              <div
                key={`${toolDef.id}Group`}
                className="flex flex-row items-center border border-input/10 rounded-lg p-[1px] space-x-[1px]"
              >
                <toolDef.Component
                  id={toolDef.id}
                  location={location}
                  onInteraction={args => {
                    onInteraction({
                      ...args,
                      itemId: toolDef.id,
                      viewportId,
                    });
                  }}
                  {...enhancedProps}
                />
                <div className="bg-primary h-5 w-px self-center opacity-100"></div>
                <nextToolDef.Component
                  id={nextToolDef.id}
                  location={location}
                  onInteraction={args => {
                    onInteraction({
                      ...args,
                      itemId: nextToolDef.id,
                      viewportId,
                    });
                  }}
                  {...nextEnhancedProps}
                />
              </div>
            );
            i += 2;
          } else {
            if (!toolDef) {
              i++;
              continue;
            }
            const enhancedProps = {
              ...toolDef.componentProps,
              isOpen: isItemOpen(toolDef.id, viewportId),
              isLocked: isItemLocked(toolDef.id, viewportId),
              onOpen: () => openItem(toolDef.id, viewportId),
              onClose: () => closeItem(toolDef.id, viewportId),
              onToggleLock: () => toggleLock(toolDef.id, viewportId),
              viewportId,
            };

            elements.push(
              <div
                key={toolDef.id}
                className="contents"
              >
                <toolDef.Component
                  id={toolDef.id}
                  location={location}
                  onInteraction={args => {
                    onInteraction({
                      ...args,
                      itemId: toolDef.id,
                      viewportId,
                    });
                  }}
                  {...enhancedProps}
                />
              </div>
            );
            i++;
          }
        }
        return elements;
      })()}
    </>
  );
}

export default Toolbar;
