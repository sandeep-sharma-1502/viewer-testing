import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Icons,
} from '@ohif/ui-next';
import { useToolbar, useSystem } from '@ohif/core';

export function PresetsDropdownWrapper({ buttonSection, id, icon, label, tooltip }) {
  const { commandsManager, servicesManager } = useSystem();
  const { onInteraction, toolbarButtons } = useToolbar({
    buttonSection,
  });

  const prePreviewPresetRef = React.useRef<{
    windowWidth: number;
    windowCenter: number;
    viewportId: string;
  } | null>(null);

  const prePreviewColormapRef = React.useRef<{
    colormap: any;
    viewportId: string;
  } | null>(null);

  if (!toolbarButtons?.length) {
    return null;
  }

  const items = toolbarButtons.map(button => button.componentProps);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          {icon ? (
            <DropdownMenuTrigger asChild>
              <span
                data-cy={id}
                data-tool={id}
                className="flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="whitespace-nowrap rounded text-base leading-tight transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 font-normal !rounded-lg inline-flex items-center justify-center w-10 h-10 bg-transparent text-foreground/80 hover:bg-background hover:text-highlight"
                  aria-label={label || id}
                  name={id}
                >
                  <Icons.ByName name={icon} className="h-7 w-7 text-white" />
                </Button>
                {label && (
                  <span className="text-[10px] text-foreground/80 font-medium select-none pointer-events-none text-center leading-none max-w-[80px] truncate">
                    {label}
                  </span>
                )}
              </span>
            </DropdownMenuTrigger>
          ) : (
            <DropdownMenuTrigger asChild>
              <span
                data-cy={id}
                data-tool={id}
                className="flex items-center justify-center cursor-pointer"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground/80 hover:bg-background hover:text-highlight bg-transparent border-primary inline-flex h-10 w-6 items-center justify-center !rounded-lg"
                >
                  <svg width="28px" height="28px" viewBox="0 0 28 28" version="1.1" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white">
                    <g id="tool-dropdown" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                      <rect x="0" y="0" width="28" height="28"></rect>
                      <path
                        d="M9 12L14 17L19 12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  </svg>
                </Button>
              </span>
            </DropdownMenuTrigger>
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-sm">{tooltip || 'Window Level Presets'}</div>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        side="bottom"
        align="start"
        className="min-w-[200px]"
      >
        {items.map(item => (
          <DropdownMenuItem
            key={item.id || item.title}
            onClick={() => {
              prePreviewPresetRef.current = null;
              prePreviewColormapRef.current = null;
              onInteraction?.({ id, itemId: item.id || item.title, commands: item.commands });
            }}
            onMouseEnter={() => {
              const { cornerstoneViewportService, viewportGridService } = servicesManager.services;
              const activeViewportId = viewportGridService.getActiveViewportId();
              if (activeViewportId) {
                const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);
                const properties = viewport?.getProperties?.();
                if (properties?.voiRange && !prePreviewPresetRef.current) {
                  prePreviewPresetRef.current = {
                    windowWidth: properties.voiRange.upper - properties.voiRange.lower,
                    windowCenter: (properties.voiRange.upper + properties.voiRange.lower) / 2,
                    viewportId: activeViewportId,
                  };
                }
                if (properties?.colormap && !prePreviewColormapRef.current) {
                  prePreviewColormapRef.current = {
                    colormap: properties.colormap,
                    viewportId: activeViewportId,
                  };
                }
              }
              if (item.commands) {
                const commandsArray = Array.isArray(item.commands) ? item.commands : [item.commands];
                commandsArray.forEach(cmd => {
                  commandsManager.run(cmd);
                });
              }
            }}
            onMouseLeave={() => {
              if (prePreviewPresetRef.current) {
                commandsManager.run({
                  commandName: 'setViewportWindowLevel',
                  commandOptions: {
                    viewportId: prePreviewPresetRef.current.viewportId,
                    windowWidth: prePreviewPresetRef.current.windowWidth,
                    windowCenter: prePreviewPresetRef.current.windowCenter,
                  },
                });
                prePreviewPresetRef.current = null;
              }
              if (prePreviewColormapRef.current) {
                commandsManager.run({
                  commandName: 'setViewportColormap',
                  commandOptions: {
                    viewportId: prePreviewColormapRef.current.viewportId,
                    colormap: prePreviewColormapRef.current.colormap,
                  },
                });
                prePreviewColormapRef.current = null;
              }
            }}
            className="flex items-center justify-between cursor-pointer py-1.5 px-3 hover:bg-muted text-foreground"
          >
            <span className="text-sm font-semibold">{item.title}</span>
            <span className="text-xs text-[#38bdf8]/80 font-medium ml-6">{item.subtitle}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default PresetsDropdownWrapper;
