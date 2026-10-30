import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SelectGroup<T extends string = string> {
  label: string;
  options: readonly SelectOption<T>[];
}

type Entry<T extends string> = SelectOption<T> | SelectGroup<T>;

interface SelectProps<T extends string>
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange' | 'type' | 'children'> {
  value: string;
  options: readonly Entry<T>[];
  onChange: (value: T) => void;
  /** Shown while the value matches no option. */
  placeholder?: string;
  /** Adds a filter box above the list, for long lists such as every booth. */
  searchable?: boolean;
  size?: 'md' | 'sm';
  'data-field'?: string;
}

interface Section<T extends string> {
  label?: string;
  options: SelectOption<T>[];
}

const isGroup = <T extends string>(entry: Entry<T>): entry is SelectGroup<T> => 'options' in entry;
const isPrintable = (event: KeyboardEvent) =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

const GAP = 6;
const EDGE = 16;
const MAX_HEIGHT = 320;
const MIN_WIDTH = 224;

/**
 * A dropdown drawn by the app instead of the browser, following the ARIA "select-only combobox" pattern:
 * arrows, Home/End, Enter, Escape and type-ahead work as they do on a native select. The list is
 * portalled to <body> so scrolling panels and the map's bottom sheet never clip it.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Select',
  searchable = false,
  size = 'md',
  className,
  ...triggerProps
}: SelectProps<T>) {
  const uid = useId();
  const listId = `${uid}-list`;
  const optionId = (index: number) => `${uid}-opt-${index}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: '', at: 0 });

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [listLabel, setListLabel] = useState<string>();
  const [placement, setPlacement] = useState<{ style: CSSProperties; isUp: boolean }>({ style: {}, isUp: false });

  const selected = useMemo(
    () => options.flatMap((entry) => (isGroup(entry) ? entry.options : [entry])).find((o) => o.value === value),
    [options, value],
  );

  // Sections and the flat list share indexes, so keyboard moves can cross group headings.
  const { sections, flat } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const keep = (option: SelectOption<T>) => !needle || option.label.toLowerCase().includes(needle);
    const result: Section<T>[] = [];
    for (const entry of options) {
      if (isGroup(entry)) {
        const kept = entry.options.filter(keep);
        if (kept.length > 0) result.push({ label: entry.label, options: kept });
      } else if (keep(entry)) {
        const last = result.at(-1);
        if (last && last.label === undefined) last.options.push(entry);
        else result.push({ options: [entry] });
      }
    }
    return { sections: result, flat: result.flatMap((section) => section.options) };
  }, [options, query]);

  const open = () => {
    setQuery('');
    setActive(Math.max(0, flat.findIndex((o) => o.value === value)));
    const trigger = triggerRef.current;
    const labelledBy = trigger?.getAttribute('aria-labelledby');
    setListLabel((labelledBy ? document.getElementById(labelledBy) : trigger?.labels?.[0])?.textContent ?? undefined);
    setIsOpen(true);
  };

  const close = (returnFocus = true) => {
    setIsOpen(false);
    setQuery('');
    if (returnFocus) triggerRef.current?.focus();
  };

  const choose = (option: SelectOption<T> | undefined) => {
    if (!option) return;
    if (option.value !== value) onChange(option.value);
    close();
  };

  const typeAhead = (key: string) => {
    const now = Date.now();
    const text = now - typed.current.at < 600 ? typed.current.text + key.toLowerCase() : key.toLowerCase();
    typed.current = { text, at: now };
    const index = flat.findIndex((o) => o.label.toLowerCase().startsWith(text));
    if (index >= 0) setActive(index);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        open();
      } else if (!searchable && isPrintable(event)) {
        open();
        typeAhead(event.key);
      }
      return;
    }
    const last = flat.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((i) => Math.min(i + 1, last));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case 'PageDown':
        event.preventDefault();
        setActive((i) => Math.min(i + 8, last));
        break;
      case 'PageUp':
        event.preventDefault();
        setActive((i) => Math.max(i - 8, 0));
        break;
      case 'Enter':
        event.preventDefault();
        choose(flat[active]);
        break;
      case 'Escape':
        // Keep a surrounding drawer or sheet from closing too.
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        // In the filter box these keys edit the text instead.
        if (searchable) break;
        if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          setActive(event.key === 'Home' ? 0 : last);
        } else if (event.key === ' ' && Date.now() - typed.current.at > 600) {
          event.preventDefault();
          choose(flat[active]);
        } else if (isPrintable(event)) {
          typeAhead(event.key);
        }
    }
  };

  // Place the list under the trigger, or above it when there is more room there (the map's start picker).
  useLayoutEffect(() => {
    if (!isOpen) return;
    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - EDGE - GAP;
      const above = rect.top - EDGE - GAP;
      const isUp = below < 200 && above > below;
      const width = Math.min(Math.max(rect.width, MIN_WIDTH), window.innerWidth - EDGE * 2);
      const left = Math.min(Math.max(rect.left, EDGE), window.innerWidth - EDGE - width);
      setPlacement({
        isUp,
        style: {
          left,
          width,
          maxHeight: Math.min(MAX_HEIGHT, isUp ? above : below),
          ...(isUp ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
        },
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (searchable) searchRef.current?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popupRef.current?.contains(target)) close(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, searchable]);

  useEffect(() => {
    if (isOpen) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, active, query]);

  const activeId = isOpen && flat[active] ? optionId(active) : undefined;
  let index = -1;
  const renderOption = (option: SelectOption<T>) => {
    index += 1;
    const i = index;
    const isSelected = option.value === value;
    return (
      <li
        key={option.value}
        id={optionId(i)}
        role="option"
        aria-selected={isSelected}
        className={`select-pop__option${i === active ? ' is-active' : ''}`}
        onMouseDown={(event) => event.preventDefault()}
        onPointerMove={() => setActive(i)}
        onClick={() => choose(option)}
      >
        <span>{option.label}</span>
        {isSelected && <Icon name="check" size={16} strokeWidth={2.5} />}
      </li>
    );
  };

  return (
    <>
      <button
        {...triggerProps}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-activedescendant={searchable ? undefined : activeId}
        className={`select select--${size}${isOpen ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleKeyDown}
      >
        <span className={`select__value${selected ? '' : ' is-placeholder'}`}>{selected?.label ?? placeholder}</span>
        <span className="select__chevron">
          <Icon name="chevronDown" size={18} />
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            className={`select-pop${placement.isUp ? ' select-pop--up' : ''}`}
            style={placement.style}
          >
            {searchable && (
              <div className="select-pop__search">
                <Icon name="search" size={16} />
                <input
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-label={listLabel ? `Search ${listLabel.toLowerCase()}` : 'Search options'}
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={activeId}
                  placeholder="Search…"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                  onKeyDown={handleKeyDown}
                />
              </div>
            )}
            <ul id={listId} role="listbox" aria-label={listLabel} className="select-pop__list">
              {sections.map((section, s) =>
                section.label ? (
                  <li key={section.label} role="presentation">
                    <div id={`${uid}-group-${s}`} className="select-pop__group" aria-hidden="true">
                      {section.label}
                    </div>
                    <ul role="group" aria-labelledby={`${uid}-group-${s}`}>
                      {section.options.map(renderOption)}
                    </ul>
                  </li>
                ) : (
                  <Fragment key={`loose-${s}`}>{section.options.map(renderOption)}</Fragment>
                ),
              )}
              {flat.length === 0 && (
                <li role="presentation" className="select-pop__empty">
                  No matches for “{query.trim()}”
                </li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
