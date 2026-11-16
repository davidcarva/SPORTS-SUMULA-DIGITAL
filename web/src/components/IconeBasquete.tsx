import type { SVGProps } from "react";

/** Bola de basquete no mesmo traço dos ícones lucide. */
export function IconeBasquete(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2v20" />
      <path d="M5.2 4.7a10 10 0 0 1 0 14.6" />
      <path d="M18.8 4.7a10 10 0 0 0 0 14.6" />
    </svg>
  );
}
