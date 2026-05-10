import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Paper, SimpleGrid, Text } from '@mantine/core';
import { CommandSection } from './CommandSection';
import { getCommandManager } from '../core/command';

interface KeyMapping {
  key: string;
  label: string;
  commandId: string;
  value: number;
}

const KEY_MAP: KeyMapping[] = [
  { key: 'w', label: 'W', commandId: 'base_velocity:lin_vel_x', value: 1.0 },
  { key: 's', label: 'S', commandId: 'base_velocity:lin_vel_x', value: -0.5 },
  { key: 'a', label: 'A', commandId: 'base_velocity:lin_vel_y', value: 0.5 },
  { key: 'd', label: 'D', commandId: 'base_velocity:lin_vel_y', value: -0.5 },
  { key: 'q', label: 'Q', commandId: 'base_velocity:ang_vel_z', value: 0.5 },
  { key: 'e', label: 'E', commandId: 'base_velocity:ang_vel_z', value: -0.5 },
];

const ALL_AXES = Array.from(new Set(KEY_MAP.map((m) => m.commandId)));

function isEditableElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  return (
    element.closest(
      'input, textarea, select, [contenteditable], [role="textbox"], [role="searchbox"], [role="combobox"]'
    ) !== null
  );
}

export function KeyboardCommandSection({ disabled = false }: { disabled?: boolean }) {
  const pressedRef = useRef<Set<string>>(new Set());
  const [, force] = useState(0);
  const rerender = useCallback(() => force((t) => t + 1), []);

  const applyAxis = useCallback((commandId: string) => {
    const cm = getCommandManager();
    const active = KEY_MAP.find(
      (m) => m.commandId === commandId && pressedRef.current.has(m.key)
    );
    cm.setValue(commandId, active ? active.value : 0);
  }, []);

  const press = useCallback((key: string) => {
    const m = KEY_MAP.find((entry) => entry.key === key);
    if (!m || pressedRef.current.has(key)) return;
    pressedRef.current.add(key);
    rerender();
    getCommandManager().setValue(m.commandId, m.value);
  }, [rerender]);

  const release = useCallback((key: string) => {
    const m = KEY_MAP.find((entry) => entry.key === key);
    if (!m || !pressedRef.current.has(key)) return;
    pressedRef.current.delete(key);
    rerender();
    applyAxis(m.commandId);
  }, [applyAxis, rerender]);

  useEffect(() => {
    const cm = getCommandManager();
    for (const id of ALL_AXES) cm.setValue(id, 0);
    const onCommandEvent = (event: { type: string }) => {
      if (event.type === 'reset') {
        for (const id of ALL_AXES) cm.setValue(id, 0);
      }
    };
    cm.addEventListener(onCommandEvent);
    return () => cm.removeEventListener(onCommandEvent);
  }, []);

  useEffect(() => {
    if (disabled) return;

    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target instanceof Element ? e.target : document.activeElement;
      if (isEditableElement(target)) return;
      const k = e.key.toLowerCase();
      if (!KEY_MAP.some((m) => m.key === k)) return;
      e.preventDefault();
      press(k);
    };

    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!KEY_MAP.some((m) => m.key === k)) return;
      release(k);
    };

    const onBlur = () => {
      const keys = Array.from(pressedRef.current);
      pressedRef.current.clear();
      rerender();
      const cm = getCommandManager();
      for (const id of ALL_AXES) cm.setValue(id, 0);
      void keys;
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      const cm = getCommandManager();
      for (const id of ALL_AXES) cm.setValue(id, 0);
      pressedRef.current.clear();
    };
  }, [disabled, press, release, rerender]);

  const renderKey = (k: string, label: string) => {
    const isPressed = pressedRef.current.has(k);
    return (
      <Paper
        withBorder
        onMouseDown={(e) => {
          e.preventDefault();
          if (!disabled) press(k);
        }}
        onMouseUp={() => release(k)}
        onMouseLeave={() => release(k)}
        onTouchStart={(e) => {
          e.preventDefault();
          if (!disabled) press(k);
        }}
        onTouchEnd={() => release(k)}
        style={{
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '0.95em',
          padding: '0.45em 0',
          userSelect: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          backgroundColor: isPressed ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-0)',
          color: isPressed ? 'white' : 'var(--mantine-color-dark-7)',
          borderColor: isPressed ? 'var(--mantine-color-blue-6)' : undefined,
          boxShadow: isPressed ? '0 0 0 2px var(--mantine-color-blue-2)' : undefined,
          transition: 'background-color 80ms, box-shadow 80ms, color 80ms',
        }}
      >
        {label}
      </Paper>
    );
  };

  return (
    <CommandSection label="Keyboard Control">
      <Box px="xs" pb="xs">
        <SimpleGrid cols={3} spacing="xs">
          <div />
          {renderKey('w', 'W')}
          <div />
          {renderKey('a', 'A')}
          {renderKey('s', 'S')}
          {renderKey('d', 'D')}
        </SimpleGrid>
        <Box pt="xs">
          <SimpleGrid cols={2} spacing="xs">
            {renderKey('q', 'Q ⟲')}
            {renderKey('e', 'E ⟳')}
          </SimpleGrid>
        </Box>
        <Text size="xs" c="dimmed" pt="0.5em" ta="center">
          WASD — движение · Q/E — поворот
        </Text>
      </Box>
    </CommandSection>
  );
}
