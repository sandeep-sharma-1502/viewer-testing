import classnames from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import { Icons } from '../Icons';
import { TooltipTrigger, TooltipContent, Tooltip } from '../Tooltip';
import { Separator } from '../Separator';

/**
 * SidePanel component properties.
 * Note that the component monitors changes to the various widths and border sizes and will resize dynamically
 * @property {boolean} isExpanded - boolean indicating if the side panel is expanded/open or collapsed
 * @property {number} expandedWidth - the width of this side panel when expanded not including any borders or margins
 * @property {number} collapsedWidth - the width of this side panel when collapsed not including any borders or margins
 * @property {number} expandedInsideBorderSize - the width of the space between the expanded side panel content and viewport grid
 * @property {number} collapsedInsideBorderSize - the width of the space between the collapsed side panel content and the viewport grid
 * @property {number} collapsedOutsideBorderSize - the width of the space between the collapsed side panel content and the edge of the browser window
 */
type SidePanelProps = {
  side: 'left' | 'right';
  className: string;
  activeTabIndex: number;
  onOpen: () => void;
  onClose: () => void;
  onActiveTabIndexChange: () => void;
  isExpanded: boolean;
  expandedWidth: number;
  collapsedWidth: number;
  expandedInsideBorderSize: number;
  collapsedInsideBorderSize: number;
  collapsedOutsideBorderSize: number;
  tabs: any;
};

type StyleMap = {
  open: {
    left: {
      marginLeft: string; // the space between the expanded/open left side panel and the browser window left edge
      marginRight: string; // the space between the expanded/open left side panel and the viewport grid
    };
    right: {
      marginLeft: string; // the space between the expanded/open right side panel and the viewport grid
      marginRight: string; // the space between the expanded/open right side panel and the browser window right edge
    };
  };
  closed: {
    left: {
      marginLeft: string; // the space between the collapsed/closed left panel and the browser window left edge
      marginRight: string; // the space between the collapsed/closed left panel and the viewport grid
      alignItems: 'flex-end'; // the flexbox layout align-items property
    };
    right: {
      marginLeft: string; // the space between the collapsed/closed right panel and the viewport grid
      marginRight: string; // the space between the collapsed/closed right panel and the browser window right edge
      alignItems: 'flex-start'; // the flexbox layout align-items property
    };
  };
};
const closeIconWidth = 30;
const gridHorizontalPadding = 10;
const tabSpacerWidth = 2;

const baseClasses = 'bg-background border-background justify-start box-content flex flex-col';

const openStateIconName = {
  left: 'SidePanelCloseLeft',
  right: 'SidePanelCloseRight',
};

const getTabWidth = (numTabs: number) => {
  if (numTabs < 3) {
    return 68;
  } else {
    return 40;
  }
};

const getGridWidth = (numTabs: number, gridAvailableWidth: number) => {
  const spacersWidth = (numTabs - 1) * tabSpacerWidth;
  const tabsWidth = getTabWidth(numTabs) * numTabs;

  if (gridAvailableWidth > tabsWidth + spacersWidth) {
    return tabsWidth + spacersWidth;
  }

  return gridAvailableWidth;
};

const getNumGridColumns = (numTabs: number, gridWidth: number) => {
  if (numTabs === 1) {
    return 1;
  }

  // Start by calculating the number of tabs assuming each tab was accompanied by a spacer.
  const tabWidth = getTabWidth(numTabs);
  const numTabsWithOneSpacerEach = Math.floor(gridWidth / (tabWidth + tabSpacerWidth));

  // But there is always one less spacer than tabs, so now check if an extra tab with one less spacer fits.
  if (
    (numTabsWithOneSpacerEach + 1) * tabWidth + numTabsWithOneSpacerEach * tabSpacerWidth <=
    gridWidth
  ) {
    return numTabsWithOneSpacerEach + 1;
  }

  return numTabsWithOneSpacerEach;
};

const getTabClassNames = (
  numColumns: number,
  numTabs: number,
  tabIndex: number,
  isActiveTab: boolean,
  isTabDisabled: boolean
) =>
  classnames('h-[28px] mb-[2px] cursor-pointer text-foreground bg-primary/10 hover:bg-primary/20', {
    'hover:text-primary': !isActiveTab && !isTabDisabled,
    'rounded-l': tabIndex % numColumns === 0,
    'rounded-r': (tabIndex + 1) % numColumns === 0 || tabIndex === numTabs - 1,
  });

const getTabStyle = (numTabs: number) => {
  return {
    width: `${getTabWidth(numTabs)}px`,
  };
};

const getTabIconClassNames = (numTabs: number, isActiveTab: boolean) => {
  return classnames('h-full w-full flex items-center justify-center', {
    'bg-primary/20': isActiveTab,
    rounded: isActiveTab,
  });
};
const createStyleMap = (
  expandedWidth: number,
  expandedInsideBorderSize: number,
  collapsedWidth: number,
  collapsedInsideBorderSize: number,
  collapsedOutsideBorderSize: number
): StyleMap => {
  const collapsedHideWidth = expandedWidth - collapsedWidth - collapsedOutsideBorderSize;

  return {
    open: {
      left: { marginLeft: '0px', marginRight: `${expandedInsideBorderSize}px` },
      right: { marginLeft: `${expandedInsideBorderSize}px`, marginRight: '0px' },
    },
    closed: {
      left: {
        marginLeft: `-${collapsedHideWidth}px`,
        marginRight: `${collapsedInsideBorderSize}px`,
        alignItems: `flex-end`,
      },
      right: {
        marginLeft: `${collapsedInsideBorderSize}px`,
        marginRight: `-${collapsedHideWidth}px`,
        alignItems: `flex-start`,
      },
    },
  };
};

const getToolTipContent = (label: string, disabled: boolean) => {
  return (
    <>
      <div>{label}</div>
      {disabled && (
        <div className="text-foreground">{'Not available based on current context'}</div>
      )}
    </>
  );
};

const createBaseStyle = (expandedWidth: number) => {
  return {
    maxWidth: `${expandedWidth}px`,
    width: `${expandedWidth}px`,
    // To align the top of the side panel with the top of the viewport grid, use position relative and offset the
    // top by the same top offset as the viewport grid. Also adjust the height so that there is no overflow.
    position: 'relative',
    top: '0.2%',
    height: '99.8%',
  };
};

const getStudyInstanceUID = () => {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('StudyInstanceUIDs') || searchParams.get('studyInstanceUIDs') || 'default';
  } catch {
    return 'default';
  }
};

const ReportEditor = () => {
  const studyUid = getStudyInstanceUID();
  const [text, setText] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(`report_${studyUid}`);
    if (saved) {
      setText(saved);
    } else {
      setText('');
    }
  }, [studyUid]);

  const handleSave = () => {
    localStorage.setItem(`report_${studyUid}`, text);
  };

  const handleClear = () => {
    setText('');
    localStorage.removeItem(`report_${studyUid}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('report-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selectedText = currentVal.substring(start, end);
    const replacement = before + selectedText + after;
    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    setText(newVal);
    localStorage.setItem(`report_${studyUid}`, newVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="flex flex-col flex-1 h-full bg-background p-4 text-foreground gap-3 select-text">
      <div className="flex items-center justify-between border-b border-muted pb-2">
        <h4 className="text-[14px] font-bold text-primary flex items-center gap-1.5">
          <Icons.ByName name="info" className="w-4 h-4" />
          Report Editor
        </h4>
        <div className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {studyUid !== 'default' ? 'Per-Study Note' : 'General Note'}
        </div>
      </div>
      
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 bg-muted/50 p-1.5 rounded-md border border-muted/50">
        <button 
          onClick={() => insertText('**', '**')} 
          className="p-1 hover:bg-muted rounded text-xs font-bold w-6 h-6 flex items-center justify-center transition-all"
          title="Bold"
        >
          B
        </button>
        <button 
          onClick={() => insertText('*', '*')} 
          className="p-1 hover:bg-muted rounded text-xs italic w-6 h-6 flex items-center justify-center transition-all"
          title="Italic"
        >
          I
        </button>
        <button 
          onClick={() => insertText('__', '__')} 
          className="p-1 hover:bg-muted rounded text-xs underline w-6 h-6 flex items-center justify-center transition-all"
          title="Underline"
        >
          U
        </button>
        <div className="w-[1px] h-4 bg-muted/80 mx-1"></div>
        <button 
          onClick={() => insertText('- ')} 
          className="p-1 hover:bg-muted rounded text-xs w-6 h-6 flex items-center justify-center transition-all"
          title="Bullet List"
        >
          •
        </button>
        <button 
          onClick={() => insertText('1. ')} 
          className="p-1 hover:bg-muted rounded text-xs w-6 h-6 flex items-center justify-center transition-all"
          title="Numbered List"
        >
          1.
        </button>
      </div>

      {/* Editor Textarea */}
      <div className="flex-1 min-h-[200px] relative flex flex-col">
        <textarea
          id="report-textarea"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            localStorage.setItem(`report_${studyUid}`, e.target.value);
          }}
          placeholder="Start typing your clinical findings, notes or reports here..."
          className="w-full flex-1 p-3 bg-muted/20 border border-muted rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-[13px] resize-none text-foreground placeholder:text-muted-foreground/60 leading-relaxed font-sans"
        />
      </div>

      {/* Stats and Action Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-muted/50 pt-2">
        <div>
          {wordCount} words | {charCount} chars
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-muted/80 rounded transition-all text-[11px]"
            title="Copy to clipboard"
          >
            Copy
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-all text-[11px]"
            title="Clear text"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-2.5 py-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded transition-all text-[11px]"
            title="Save changes"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const SidePanel = ({
  side,
  className,
  activeTabIndex: activeTabIndexProp,
  isExpanded,
  tabs,
  onOpen,
  onClose,
  onActiveTabIndexChange,
  expandedWidth = 280,
  collapsedWidth = 25,
  expandedInsideBorderSize = 4,
  collapsedInsideBorderSize = 8,
  collapsedOutsideBorderSize = 4,
}: SidePanelProps) => {
  const [panelOpen, setPanelOpen] = useState(isExpanded);
  const [activeTabIndex, setActiveTabIndex] = useState(activeTabIndexProp ?? 0);

  const [styleMap, setStyleMap] = useState(
    createStyleMap(
      expandedWidth,
      expandedInsideBorderSize,
      collapsedWidth,
      collapsedInsideBorderSize,
      collapsedOutsideBorderSize
    )
  );

  const [baseStyle, setBaseStyle] = useState(createBaseStyle(expandedWidth));

  const [gridAvailableWidth, setGridAvailableWidth] = useState(
    expandedWidth - closeIconWidth - gridHorizontalPadding
  );

  const [gridWidth, setGridWidth] = useState(getGridWidth(tabs.length, gridAvailableWidth));
  const openStatus = panelOpen ? 'open' : 'closed';
  const style = Object.assign({}, styleMap[openStatus][side], baseStyle);

  const updatePanelOpen = useCallback(
    (isOpen: boolean) => {
      setPanelOpen(isOpen);
      if (isOpen !== panelOpen) {
        // only fire events for changes
        if (isOpen && onOpen) {
          onOpen();
        } else if (onClose && !isOpen) {
          onClose();
        }
      }
    },
    [panelOpen, onOpen, onClose]
  );

  const updateActiveTabIndex = useCallback(
    (activeTabIndex: number, forceOpen: boolean = false) => {
      if (forceOpen) {
        updatePanelOpen(true);
      }

      setActiveTabIndex(activeTabIndex);

      if (onActiveTabIndexChange) {
        onActiveTabIndexChange({ activeTabIndex });
      }
    },
    [onActiveTabIndexChange, updatePanelOpen]
  );

  useEffect(() => {
    updatePanelOpen(isExpanded);
  }, [isExpanded, updatePanelOpen]);

  useEffect(() => {
    const handleOpenRightPanel = () => {
      if (side === 'right') {
        updatePanelOpen(true);
      }
    };
    window.addEventListener('ohif-open-right-panel', handleOpenRightPanel);
    return () => {
      window.removeEventListener('ohif-open-right-panel', handleOpenRightPanel);
    };
  }, [side, updatePanelOpen]);

  useEffect(() => {
    setStyleMap(
      createStyleMap(
        expandedWidth,
        expandedInsideBorderSize,
        collapsedWidth,
        collapsedInsideBorderSize,
        collapsedOutsideBorderSize
      )
    );
    setBaseStyle(createBaseStyle(expandedWidth));

    const gridAvailableWidth = expandedWidth - closeIconWidth - gridHorizontalPadding;
    setGridAvailableWidth(gridAvailableWidth);
    setGridWidth(getGridWidth(tabs.length, gridAvailableWidth));
  }, [
    collapsedInsideBorderSize,
    collapsedWidth,
    expandedWidth,
    expandedInsideBorderSize,
    tabs.length,
    collapsedOutsideBorderSize,
  ]);

  useEffect(() => {
    updateActiveTabIndex(activeTabIndexProp ?? 0);
  }, [activeTabIndexProp, updateActiveTabIndex]);

  const getCloseStateComponent = () => {
    const _childComponents = Array.isArray(tabs) ? tabs : [tabs];
    return (
      <>
        <div
          className={classnames(
            'bg-popover flex h-[28px] w-full cursor-pointer items-center rounded-md',
            side === 'left' ? 'justify-end pr-2' : 'justify-start pl-2'
          )}
          onClick={() => {
            updatePanelOpen(!panelOpen);
          }}
          data-cy={`side-panel-header-${side}`}
        >
          <Icons.NavigationPanelReveal
            className={classnames('text-primary', side === 'left' && 'rotate-180 transform')}
          />
        </div>
        {side !== 'right' ? (
          <div className={classnames('mt-3 flex flex-col space-y-3')}>
            {_childComponents.map((childComponent, index) => (
              <Tooltip key={index}>
                <TooltipTrigger>
                  <div
                    id={`${childComponent.name}-btn`}
                    data-cy={`${childComponent.name}-btn`}
                    className="text-primary hover:cursor-pointer"
                    onClick={() => {
                      return childComponent.disabled ? null : updateActiveTabIndex(index, true);
                    }}
                  >
                    {React.createElement(Icons[childComponent.iconName] || Icons.MissingIcon, {
                      className: classnames({
                        'text-primary': true,
                        'ohif-disabled': childComponent.disabled,
                      }),
                      style: {
                        width: '22px',
                        height: '22px',
                      },
                    })}
                  </div>
                </TooltipTrigger>
                <TooltipContent side={side === 'left' ? 'right' : 'left'}>
                  <div
                    className={classnames(
                      'flex items-center',
                      side === 'left' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {getToolTipContent(childComponent.label, childComponent.disabled)}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ) : (
          // isme kabhi bhi kuch show nhi karna hai jo jo show ho ta hai use remove mat karo comment kar do
          /*
          <div className={classnames('mt-3 flex flex-col space-y-3')}>
            {_childComponents.map((childComponent, index) => (
              <Tooltip key={index}>
                <TooltipTrigger>
                  <div
                    id={`${childComponent.name}-btn`}
                    data-cy={`${childComponent.name}-btn`}
                    className="text-primary hover:cursor-pointer"
                    onClick={() => {
                      return childComponent.disabled ? null : updateActiveTabIndex(index, true);
                    }}
                  >
                    {React.createElement(Icons[childComponent.iconName] || Icons.MissingIcon, {
                      className: classnames({
                        'text-primary': true,
                        'ohif-disabled': childComponent.disabled,
                      }),
                      style: {
                        width: '22px',
                        height: '22px',
                      },
                    })}
                  </div>
                </TooltipTrigger>
                <TooltipContent side={side === 'left' ? 'right' : 'left'}>
                  <div
                    className={classnames(
                      'flex items-center',
                      side === 'left' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {getToolTipContent(childComponent.label, childComponent.disabled)}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          */
          null
        )}
      </>
    );
  };

  const getCloseIcon = () => {
    if (side === 'right') {
      return null;
    }
    return (
      <div
        className={classnames(
          'absolute flex cursor-pointer items-center justify-center',
          side === 'left' ? 'right-0' : 'left-0'
        )}
        style={{ width: `${closeIconWidth}px` }}
        onClick={() => {
          updatePanelOpen(!panelOpen);
        }}
        data-cy={`side-panel-header-${side}`}
      >
        {React.createElement(Icons[openStateIconName[side]] || Icons.MissingIcon, {
          className: 'text-primary',
        })}
      </div>
    );
  };

  const getTabGridComponent = () => {
    const numCols = getNumGridColumns(tabs.length, gridWidth);

    return (
      <>
        {getCloseIcon()}
        {side !== 'right' ? (
          <div className={classnames('flex grow justify-center')}>
            <div className={classnames('bg-muted text-primary flex flex-wrap')}>
              {tabs.map((tab, tabIndex) => {
                const { disabled } = tab;
                return (
                  <React.Fragment key={tabIndex}>
                    {tabIndex % numCols !== 0 && (
                      <div
                        className={classnames('flex h-[28px] w-[2px] items-center', tabSpacerWidth)}
                      >
                        <div className="bg-muted h-[20px] w-full"></div>
                      </div>
                    )}
                    <Tooltip key={tabIndex}>
                      <TooltipTrigger>
                        <div
                          className={getTabClassNames(
                            numCols,
                            tabs.length,
                            tabIndex,
                            tabIndex === activeTabIndex,
                            disabled
                          )}
                          style={getTabStyle(tabs.length)}
                          onClick={() => {
                            return disabled ? null : updateActiveTabIndex(tabIndex);
                          }}
                          data-cy={`${tab.name}-btn`}
                        >
                          <div
                            className={getTabIconClassNames(tabs.length, tabIndex === activeTabIndex)}
                          >
                            {React.createElement(Icons[tab.iconName] || Icons.MissingIcon, {
                              className: classnames({
                                'text-primary': true,
                                'ohif-disabled': disabled,
                              }),
                              style: {
                                width: '22px',
                                height: '22px',
                              },
                            })}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {getToolTipContent(tab.label, disabled)}
                      </TooltipContent>
                    </Tooltip>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ) : (
          // isme kabhi bhi kuch show nhi karna hai jo jo show ho ta hai use remove mat karo comment kar do
          /*
          <div className={classnames('flex grow justify-center')}>
            <div className={classnames('bg-muted text-primary flex flex-wrap')}>
              {tabs.map((tab, tabIndex) => {
                const { disabled } = tab;
                return (
                  <React.Fragment key={tabIndex}>
                    {tabIndex % numCols !== 0 && (
                      <div
                        className={classnames('flex h-[28px] w-[2px] items-center', tabSpacerWidth)}
                      >
                        <div className="bg-muted h-[20px] w-full"></div>
                      </div>
                    )}
                    <Tooltip key={tabIndex}>
                      <TooltipTrigger>
                        <div
                          className={getTabClassNames(
                            numCols,
                            tabs.length,
                            tabIndex,
                            tabIndex === activeTabIndex,
                            disabled
                          )}
                          style={getTabStyle(tabs.length)}
                          onClick={() => {
                            return disabled ? null : updateActiveTabIndex(tabIndex);
                          }}
                          data-cy={`${tab.name}-btn`}
                        >
                          <div
                            className={getTabIconClassNames(tabs.length, tabIndex === activeTabIndex)}
                          >
                            {React.createElement(Icons[tab.iconName] || Icons.MissingIcon, {
                              className: classnames({
                                'text-primary': true,
                                'ohif-disabled': disabled,
                              }),
                              style: {
                                width: '22px',
                                height: '22px',
                              },
                            })}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {getToolTipContent(tab.label, disabled)}
                      </TooltipContent>
                    </Tooltip>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          */
          null
        )}
      </>
    );
  };

  const getOneTabComponent = () => {
    return (
      <div
        className={classnames(
          'text-primary flex grow select-none justify-center self-center text-[13px]',
          side !== 'right' && 'cursor-pointer'
        )}
        data-cy={`${tabs[0].name}-btn`}
        onClick={side !== 'right' ? () => updatePanelOpen(!panelOpen) : undefined}
      >
        {getCloseIcon()}
        {side !== 'right' ? (
          <span>{tabs[0].label}</span>
        ) : (
          // isme kabhi bhi kuch show nhi karna hai jo jo show ho ta hai use remove mat karo comment kar do
          // <span>{tabs[0].label}</span>
          null
        )}
      </div>
    );
  };

  const getOpenStateComponent = () => {
    return (
      <>
        <div className="bg-muted flex h-[40px] flex-shrink-0 select-none rounded-t p-2">
          {tabs.length === 1 ? getOneTabComponent() : getTabGridComponent()}
        </div>
        <Separator
          orientation="horizontal"
          className="bg-background"
          thickness="2px"
        />
      </>
    );
  };

  return (
    <div
      className={classnames(className, baseClasses)}
      style={style}
    >
      {panelOpen ? (
        <>
          {side !== 'right' && getOpenStateComponent()}
          {side === 'right' ? (
            <ReportEditor />
          ) : (
            tabs.map((tab, tabIndex) => {
              if (tabIndex === activeTabIndex) {
                return <tab.content key={tabIndex} />;
              }
              return null;
            })
          )}
        </>
      ) : (
        <React.Fragment>{getCloseStateComponent()}</React.Fragment>
      )}
    </div>
  );
};

export { SidePanel };
