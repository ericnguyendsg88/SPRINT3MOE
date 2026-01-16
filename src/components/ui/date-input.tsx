import * as React from "react";
import { format, isValid, setMonth, setYear, getYear, getMonth } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateInputProps {
  value: string; // ISO date string (YYYY-MM-DD) or empty
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  id?: string;
}

/**
 * Format a date as DD/MM/YY for display
 */
function formatDisplayDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

/**
 * Parse a DD/MM/YY or DD/MM/YYYY string to a Date object
 */
function parseDisplayDate(dateStr: string): Date | null {
  // Try parsing DD/MM/YY or DD/MM/YYYY format
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    
    // Handle 2-digit year
    if (year < 100) {
      year = year >= 50 ? 1900 + year : 2000 + year;
    }
    
    const date = new Date(year, month, day);
    if (isValid(date) && date.getDate() === day && date.getMonth() === month) {
      return date;
    }
  }
  return null;
}

/**
 * Convert ISO date string to Date object
 */
function isoToDate(isoString: string): Date | undefined {
  if (!isoString) return undefined;
  const date = new Date(isoString);
  return isValid(date) ? date : undefined;
}

/**
 * Convert Date object to ISO date string (YYYY-MM-DD)
 */
function dateToIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function DateInput({
  value,
  onChange,
  placeholder = "DD/MM/YY",
  disabled = false,
  minDate,
  maxDate,
  className,
  id,
}: DateInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [inputFocused, setInputFocused] = React.useState(false);
  const selectedDate = isoToDate(value);
  
  // Calendar display month (for navigation)
  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    selectedDate || new Date()
  );

  // Sync input value with selected date when not focused
  React.useEffect(() => {
    if (!inputFocused && selectedDate) {
      setInputValue(formatDisplayDate(selectedDate));
    } else if (!inputFocused && !selectedDate) {
      setInputValue("");
    }
  }, [selectedDate, inputFocused]);

  // Update display month when selected date changes
  React.useEffect(() => {
    if (selectedDate) {
      setDisplayMonth(selectedDate);
    }
  }, [selectedDate]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(dateToIso(date));
      setInputValue(formatDisplayDate(date));
    } else {
      onChange("");
      setInputValue("");
    }
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Try to parse as user types
    const parsed = parseDisplayDate(val);
    if (parsed) {
      onChange(dateToIso(parsed));
      setDisplayMonth(parsed);
    }
  };

  const handleInputBlur = () => {
    setInputFocused(false);
    const parsed = parseDisplayDate(inputValue);
    if (parsed) {
      onChange(dateToIso(parsed));
    } else if (inputValue && !parsed) {
      // Reset to current value if invalid
      if (selectedDate) {
        setInputValue(formatDisplayDate(selectedDate));
      } else {
        setInputValue("");
      }
    }
  };

  const handleMonthChange = (monthStr: string) => {
    const newMonth = parseInt(monthStr, 10);
    const newDate = setMonth(displayMonth, newMonth);
    setDisplayMonth(newDate);
  };

  const handleYearChange = (yearStr: string) => {
    const newYear = parseInt(yearStr, 10);
    const newDate = setYear(displayMonth, newYear);
    setDisplayMonth(newDate);
  };

  // Generate year options (100 years back, 10 years forward)
  const currentYear = new Date().getFullYear();
  const years = React.useMemo(() => {
    const yearList: number[] = [];
    for (let y = currentYear - 100; y <= currentYear + 10; y++) {
      yearList.push(y);
    }
    return yearList;
  }, [currentYear]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? formatDisplayDate(selectedDate) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[100]" align="start">
        <div className="p-4 space-y-4">
          {/* Month and Year selectors - Moved to top for better visibility */}
          <div className="flex gap-2">
            <Select
              value={getMonth(displayMonth).toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="flex-1 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={month} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={getYear(displayMonth).toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[110px] h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Calendar */}
          <Calendar
            mode="single"
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
            className="pointer-events-auto"
          />
          
          {/* Quick actions */}
          <div className="flex gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                const today = new Date();
                handleSelect(today);
              }}
            >
              Today
            </Button>
            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => handleSelect(undefined)}
              >
                Clear
              </Button>
            )}
          </div>
          
          {/* Manual date input - Moved to bottom as alternative */}
          <div className="space-y-1.5 border-t pt-3">
            <label className="text-xs font-medium text-muted-foreground">Or type date manually</label>
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setInputFocused(true)}
              onBlur={handleInputBlur}
              placeholder="DD/MM/YY"
              className="h-9"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
