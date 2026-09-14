type ActionIconProps = {
  className?: string;
};

export function RefreshActionIcon({
  className = "size-[18px]",
}: ActionIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`block ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 12a9 9 0 0 1 15.74-5.96"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M18.75 3.75v2.5h-2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M21 12a9 9 0 0 1-15.74 5.96"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M5.25 20.25v-2.5h2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ResetActionIcon({
  className = "size-[18px]",
}: ActionIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`block ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
