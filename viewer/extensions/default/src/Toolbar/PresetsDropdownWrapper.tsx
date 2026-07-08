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
} from '@ohif/ui-next';
import { useToolbar } from '@ohif/core';

export function PresetsDropdownWrapper({ buttonSection, id }) {
  const { onInteraction, toolbarButtons } = useToolbar({
    buttonSection,
  });

  if (!toolbarButtons?.length) {
    return null;
  }

  const items = toolbarButtons.map(button => button.componentProps);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
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
                <svg width="28px" height="28px" viewBox="0 0 28 28" version="1.1" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary">
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
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-sm">Window Level Presets</div>
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
            onClick={() => onInteraction?.({ id, itemId: item.id || item.title, commands: item.commands })}
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
