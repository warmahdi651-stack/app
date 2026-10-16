import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { toPersianDigits } from '../lib/fa';
import { useShell } from '../state/ShellProvider';
import { fonts, radius, typeScale } from '../theme';
import type { AppProps } from '../registry';

type Op = '+' | '−' | '×' | '÷' | null;

const KEYS: { key: string; label: string; kind: 'number' | 'op' | 'util' | 'equals' }[] = [
  { key: '%', label: '%', kind: 'util' },
  { key: 'CE', label: 'CE', kind: 'util' },
  { key: 'C', label: 'C', kind: 'util' },
  { key: 'back', label: '⌫', kind: 'util' },

  { key: 'inv', label: '¹⁄x', kind: 'util' },
  { key: 'sqr', label: 'x²', kind: 'util' },
  { key: 'sqrt', label: '√x', kind: 'util' },
  { key: '÷', label: '÷', kind: 'op' },

  { key: '7', label: '7', kind: 'number' },
  { key: '8', label: '8', kind: 'number' },
  { key: '9', label: '9', kind: 'number' },
  { key: '×', label: '×', kind: 'op' },

  { key: '4', label: '4', kind: 'number' },
  { key: '5', label: '5', kind: 'number' },
  { key: '6', label: '6', kind: 'number' },
  { key: '−', label: '−', kind: 'op' },

  { key: '1', label: '1', kind: 'number' },
  { key: '2', label: '2', kind: 'number' },
  { key: '3', label: '3', kind: 'number' },
  { key: '+', label: '+', kind: 'op' },

  { key: '±', label: '±', kind: 'util' },
  { key: '0', label: '0', kind: 'number' },
  { key: '.', label: '.', kind: 'number' },
  { key: '=', label: '=', kind: 'equals' },
];

export function CalculatorApp(_props: AppProps) {
  const { palette } = useShell();
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [fresh, setFresh] = useState(true);
  const [history, setHistory] = useState<string | null>(null);

  const current = Number(display.replace(/,/g, '')) || 0;

  const apply = (a: number, b: number, operator: Op): number => {
    switch (operator) {
      case '+':
        return a + b;
      case '−':
        return a - b;
      case '×':
        return a * b;
      case '÷':
        return b === 0 ? NaN : a / b;
      default:
        return b;
    }
  };

  const format = (value: number): string => {
    if (!Number.isFinite(value)) return 'Error';
    const rounded = Math.round(value * 1e10) / 1e10;
    return String(rounded).replace(/(\d)(?=(\d{3})+\b)/g, '$1,');
  };

  const press = (key: string) => {
    if (/^\d$/.test(key)) {
      setDisplay((d) => (fresh ? key : d === '0' ? key : d + key));
      setFresh(false);
      return;
    }
    switch (key) {
      case '.':
        if (fresh) {
          setDisplay('0.');
          setFresh(false);
        } else if (!display.includes('.')) {
          setDisplay((d) => d + '.');
        }
        break;
      case 'C':
        setDisplay('0');
        setAcc(null);
        setOp(null);
        setFresh(true);
        setHistory(null);
        break;
      case 'CE':
        setDisplay('0');
        setFresh(true);
        break;
      case 'back':
        setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : '0'));
        break;
      case '±':
        setDisplay((d) => (d.startsWith('-') ? d.slice(1) : d === '0' ? d : '-' + d));
        break;
      case '%':
        setDisplay((d) => format(current / 100));
        setFresh(true);
        break;
      case 'inv':
        setDisplay((d) => format(current === 0 ? NaN : 1 / current));
        setFresh(true);
        break;
      case 'sqr':
        setDisplay((d) => format(current * current));
        setFresh(true);
        break;
      case 'sqrt':
        setDisplay((d) => format(current < 0 ? NaN : Math.sqrt(current)));
        setFresh(true);
        break;
      case '+':
      case '−':
      case '×':
      case '÷': {
        if (acc !== null && op && !fresh) {
          const result = apply(acc, current, op);
          setAcc(result);
          setDisplay(format(result));
        } else {
          setAcc(current);
        }
        setOp(key as Op);
        setFresh(true);
        break;
      }
      case '=': {
        if (acc !== null && op) {
          const result = apply(acc, current, op);
          setHistory(`${format(acc)} ${op} ${format(current)} =`);
          setDisplay(format(result));
          setAcc(null);
          setOp(null);
        }
        setFresh(true);
        break;
      }
      default:
        break;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.surface }]}>
      <View style={styles.displayArea}>
        {history ? (
          <Text style={[styles.history, { color: palette.textMuted }]}>{history}</Text>
        ) : null}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.display, { color: palette.text }]}
        >
          {String(display)}
        </Text>
      </View>

      <View style={styles.keypad}>
        {KEYS.map((item) => {
          const isActive = item.key === op;
          const background =
            item.kind === 'number'
              ? palette.surfaceAlt
              : item.kind === 'equals'
                ? palette.accent
                : isActive
                  ? palette.accent
                  : palette.surface;
          const color =
            item.kind === 'number'
              ? palette.text
              : item.kind === 'equals' || isActive
                ? palette.textOnAccent
                : palette.accent;
          return (
            <Pressable
              key={item.key}
              onPress={() => press(item.key)}
              style={({ pressed }) => [
                styles.key,
                {
                  backgroundColor: background,
                  borderColor: item.kind === 'number' ? palette.border : 'transparent',
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.keyLabel, { color }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  displayArea: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'flex-end',
    gap: 4,
  },
  history: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    writingDirection: 'ltr',
  },
  display: {
    fontFamily: fonts.medium,
    fontSize: 30,
    writingDirection: 'ltr',
  },
  keypad: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
    gap: 4,
  },
  key: {
    width: '23.5%',
    flexGrow: 1,
    aspectRatio: 1.9,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    fontFamily: fonts.medium,
    fontSize: typeScale.title,
    writingDirection: 'ltr',
  },
});
