import { useEffect } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { twMerge } from 'tailwind-merge';
import Label from './Label';
import { CalenderIcon } from '../../icons';
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
  enableTime?: boolean;
  dateFormat?: string;
  className?: string;
  iconClassName?: string;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  enableTime = false,
  dateFormat = "Y-m-d",
  className,
  iconClassName,
}: PropsType) {
  useEffect(() => {
    const flatPickr = flatpickr(`#${id}`, {
      mode: mode || "single",
      static: false,
      monthSelectorType: "static",
      dateFormat: enableTime ? "Y-m-d H:i" : dateFormat,
      defaultDate,
      onChange,
      enableTime,
      time_24hr: true,
    });

    return () => {
      if (!Array.isArray(flatPickr)) {
        flatPickr.destroy();
      }
    };
  }, [mode, onChange, id, defaultDate, dateFormat, enableTime]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          className={twMerge(
            "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-cyan-400 focus:ring-cyan-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-cyan-500",
            className
          )}
        />

        <span className="pointer-events-none absolute right-3.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-cyan-500 leading-none dark:text-cyan-400">
          <CalenderIcon
            className={twMerge("block size-[18px] overflow-visible", iconClassName)}
          />
        </span>
      </div>
    </div>
  );
}
