"use client";

import { useState } from "react";
import { 
  Select,
  Flex,
  TextField,
  Text
} from "@radix-ui/themes";

interface DateRangeSelectorProps {
  onChange: (range: { start: Date | null; end: Date | null }) => void;
}

export function DateRangeSelector({ onChange }: DateRangeSelectorProps) {
  const [preset, setPreset] = useState("last30days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const handlePresetChange = (value: string) => {
    setPreset(value);
    
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = new Date();

    switch (value) {
      case "last7days":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "last30days":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "last90days":
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case "lastYear":
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case "allTime":
        start = null;
        end = null;
        break;
      case "custom":
        // Don't update range for custom, wait for user input
        return;
    }

    onChange({ start, end });
  };

  const handleCustomDateChange = () => {
    if (preset === "custom" && customStart && customEnd) {
      onChange({
        start: new Date(customStart),
        end: new Date(customEnd)
      });
    }
  };

  return (
    <Flex gap="3" align="center">
      <Text size="2" weight="medium">Date Range:</Text>
      <Select.Root value={preset} onValueChange={handlePresetChange}>
        <Select.Trigger />
        <Select.Content>
          <Select.Item value="last7days">Last 7 Days</Select.Item>
          <Select.Item value="last30days">Last 30 Days</Select.Item>
          <Select.Item value="last90days">Last 90 Days</Select.Item>
          <Select.Item value="thisYear">This Year</Select.Item>
          <Select.Item value="lastYear">Last Year</Select.Item>
          <Select.Item value="allTime">All Time</Select.Item>
          <Select.Item value="custom">Custom Range</Select.Item>
        </Select.Content>
      </Select.Root>

      {preset === "custom" && (
        <>
          <TextField.Root
            type="date"
            value={customStart}
            onChange={(e) => {
              setCustomStart(e.target.value);
              handleCustomDateChange();
            }}
            placeholder="Start date"
          />
          <Text size="2">to</Text>
          <TextField.Root
            type="date"
            value={customEnd}
            onChange={(e) => {
              setCustomEnd(e.target.value);
              handleCustomDateChange();
            }}
            placeholder="End date"
          />
        </>
      )}
    </Flex>
  );
}