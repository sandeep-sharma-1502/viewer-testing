import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@ohif/ui-next';
import { Icons } from '@ohif/ui-next';
import { actionIcon, viewPreset } from './types';

function PanelStudyBrowserHeader({
  viewPresets,
  updateViewPresetValue,
  actionIcons,
  updateActionIconValue,
  showAllStudies = false,
  setShowAllStudies = () => {},
}: {
  viewPresets: viewPreset[];
  updateViewPresetValue: (viewPreset: viewPreset) => void;
  actionIcons: actionIcon[];
  updateActionIconValue: (actionIcon: actionIcon) => void;
  showAllStudies?: boolean;
  setShowAllStudies?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  // Button order: Settings button then List view mode (thumbnails vs. list)
  return (
    <>
      <div className="bg-muted flex h-[40px] select-none rounded-t p-2">
        <div className={'flex h-[24px] w-full select-none justify-center self-center text-[14px]'}>
          <div className="flex w-full items-center gap-[10px]">
            <div className="flex items-center justify-center">
              <div className="text-primary flex items-center space-x-1">
                {actionIcons.map((icon: actionIcon, index) =>
                  React.createElement(Icons[icon.iconName] || Icons.MissingIcon, {
                    key: index,
                    onClick: () => updateActionIconValue(icon),
                    className: `cursor-pointer`,
                  })
                )}
              </div>
            </div>
            
            {/* Center Switch Toggle Button */}
            <div className="mx-auto flex items-center justify-center gap-2">
              <span className="text-[11px] text-primary font-semibold select-none">
                All Studies
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showAllStudies}
                onClick={() => setShowAllStudies(prev => !prev)}
                className={`relative inline-flex h-[18px] w-[34px] shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none hover:border-slate-400 ${
                  showAllStudies
                    ? 'bg-primary border-primary'
                    : 'bg-slate-900 border-slate-500'
                }`}
              >
                <span
                  className={`pointer-events-none absolute top-[2px] left-[2px] h-[12px] w-[12px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showAllStudies ? 'translate-x-[16px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="ml-auto flex h-full items-center justify-center">
              <ToggleGroup
                type="single"
                value={viewPresets.filter(preset => preset.selected)[0].id}
                onValueChange={value => {
                  const selectedViewPreset = viewPresets.find(preset => preset.id === value);
                  updateViewPresetValue(selectedViewPreset);
                }}
              >
                {viewPresets.filter(preset => preset.id !== 'list').map((viewPreset: viewPreset, index) => (
                  <ToggleGroupItem
                    key={index}
                    aria-label={viewPreset.id}
                    value={viewPreset.id}
                    className="text-primary"
                  >
                    {React.createElement(Icons[viewPreset.iconName] || Icons.MissingIcon)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export { PanelStudyBrowserHeader };
