import { InputHTMLAttributes, useState } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number;
  onValueChange: (value: number) => void;
}

export default function NumberInput({ value, onValueChange, ...props }: NumberInputProps) {
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const { onFocus, onBlur, ...inputProps } = props;

  return <input {...inputProps} type="number" value={editingValue ?? String(value)} onFocus={(event) => {
    setEditingValue(event.currentTarget.value);
    onFocus?.(event);
  }} onBlur={(event) => {
    setEditingValue(null);
    onBlur?.(event);
  }} onChange={(event) => {
    const next = event.target.value;
    setEditingValue(next);
    if (next !== '') onValueChange(Number(next));
  }} />;
}
