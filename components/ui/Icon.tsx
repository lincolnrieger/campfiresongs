// Hand-drawn line icons. Paths are deliberately a little wobbly, like they
// were sketched in a camp logbook.

const PATHS = {
  billy: (
    <>
      <path d="M6.2 9.4c.1 4.3-.2 8.4.4 11.6 3.6 1 7.4 1 11 .1.6-3.4.4-7.5.2-11.7" />
      <path d="M5.4 9.3c4.4-.9 8.9-.8 13.3.1" />
      <path d="M6.3 9.6C6 6 8.4 3.2 12 3.1c3.7 0 6 2.9 5.8 6.4" />
      <path d="M9.2 13.2c1.7.4 3.8.5 5.7 0" opacity=".55" />
    </>
  ),
  tent: (
    <>
      <path d="M2.6 20.4 11.8 4.1l9.6 16.2" />
      <path d="M1.8 20.5c6.6.3 13.5.2 20.4-.1" />
      <path d="M11.8 4.2c-.3 5.6-.1 11 .2 16.1" />
      <path d="M12.1 13.4c-1.6 2.3-3 4.7-4.1 7" />
    </>
  ),
  star: <path d="m12 3.2 2.3 5.6 5.9.5-4.6 3.8 1.5 5.9L12 15.8 6.9 19l1.5-5.9-4.6-3.8 6-.5z" />,
  starFilled: <path d="m12 3.2 2.3 5.6 5.9.5-4.6 3.8 1.5 5.9L12 15.8 6.9 19l1.5-5.9-4.6-3.8 6-.5z" fill="currentColor" />,
  search: (
    <>
      <path d="M10.4 4.1c3.7-.2 6.4 2.6 6.3 6.1-.1 3.4-2.9 6.2-6.4 6.1-3.5 0-6.3-2.9-6.1-6.4.1-3.2 2.8-5.7 6.2-5.8z" />
      <path d="m15.1 15.3 5.2 5.1" />
    </>
  ),
  arrow: (
    <>
      <path d="M3.8 12.2c5.2-.3 10.6-.2 15.9.1" />
      <path d="M14.2 6.6c1.9 1.9 3.8 3.7 5.6 5.6-1.9 1.8-3.7 3.7-5.4 5.6" />
    </>
  ),
  note: (
    <>
      <path d="M9 17.6V5.4c3.6-.9 7.2-1.6 10.6-2.2v12.2" />
      <path d="M8.9 17.5c.2 1.6-1.3 2.9-3 2.8-1.5 0-2.4-1-2.2-2.2.2-1.4 1.8-2.4 3.3-2.2 1 .1 1.8.7 1.9 1.6z" />
      <path d="M19.5 15.3c.1 1.5-1.3 2.7-2.9 2.7-1.4 0-2.4-.9-2.2-2.1.2-1.3 1.7-2.3 3.2-2.1 1 .1 1.8.7 1.9 1.5z" />
    </>
  ),
  flag: (
    <>
      <path d="M5.2 21.1c-.3-5.9-.2-12 .1-17.6" />
      <path d="M5.4 4.1c3.9-1.6 6.8 1.6 13.4-.2-.9 2.6-.9 5-.2 7.5-5.7 1.8-9-1.5-13 .2" />
    </>
  ),
  moon: <path d="M15.6 3.6c-4.6.6-7.7 4.6-7.2 9.1.6 4.4 4.7 7.6 9.3 6.9 1.3-.2 2.4-.6 3.4-1.3-4 .1-7.4-2.8-7.8-6.7-.3-3.1 1-6.1 2.3-8z" />,
  plus: (
    <>
      <path d="M12.2 4.4c-.3 5.1-.2 10.1.1 15.1" />
      <path d="M4.6 12.1c4.9.2 9.9.1 14.8-.2" />
    </>
  ),
  minus: <path d="M4.6 12.1c4.9.2 9.9.1 14.8-.2" />,
  close: (
    <>
      <path d="M5.6 5.4c4.3 4.4 8.6 8.8 12.8 13.2" />
      <path d="M18.3 5.6c-4.4 4.2-8.7 8.5-12.8 12.9" />
    </>
  ),
  tick: <path d="M4.4 12.6c1.7 1.6 3.3 3.3 4.9 5.1 3.2-4.3 6.6-8.4 10.4-12.3" />,
  person: (
    <>
      <path d="M12.1 3.9c2.1 0 3.6 1.7 3.5 3.8 0 2.1-1.7 3.7-3.7 3.6-2 0-3.4-1.8-3.3-3.8.1-2 1.6-3.6 3.5-3.6z" />
      <path d="M4.6 20.5c.6-4.6 3.8-7.2 7.6-7.1 3.8.1 6.8 2.8 7.2 7.2" />
    </>
  ),
  constellation: (
    <>
      <path d="M3.5 17.2 8.4 9.6l4.9 3.3 3.4-7.3 3.9 4.6" opacity=".55" />
      <circle cx="3.5" cy="17.2" r="1.1" fill="currentColor" />
      <circle cx="8.4" cy="9.6" r="1.3" fill="currentColor" />
      <circle cx="13.3" cy="12.9" r="1" fill="currentColor" />
      <circle cx="16.7" cy="5.6" r="1.5" fill="currentColor" />
      <circle cx="20.6" cy="10.2" r="1" fill="currentColor" />
    </>
  ),
  pencil: (
    <>
      <path d="M4.3 19.8c.3-1.6.6-3.2 1-4.7l10.6-10.5c1.2 1.1 2.4 2.3 3.5 3.5L8.9 18.7c-1.5.4-3 .8-4.6 1.1z" />
      <path d="M13.7 6.8c1.2 1.1 2.4 2.3 3.5 3.5" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, label, className }: { name: IconName; size?: number; label?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
