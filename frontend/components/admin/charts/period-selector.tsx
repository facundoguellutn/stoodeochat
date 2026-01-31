"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PeriodSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">Ultimos 7 dias</SelectItem>
        <SelectItem value="30d">Ultimos 30 dias</SelectItem>
        <SelectItem value="90d">Ultimos 90 dias</SelectItem>
        <SelectItem value="365d">Ultimo año</SelectItem>
      </SelectContent>
    </Select>
  );
}
