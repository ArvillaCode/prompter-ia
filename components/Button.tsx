import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** md (default): 44px de alto, target táctil estándar. sm: 36px, solo para zonas densas (tablas). */
  size?: 'sm' | 'md';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  ...props
}) => {
  // gap-2 en lugar de mr-2 en el icono: cuando el label va oculto en móvil
  // (hidden sm:inline) no queda margen fantasma junto al icono.
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    md: "min-h-11 px-4 py-2",
    sm: "min-h-9 px-3 py-1.5 text-sm",
  };

  const variants = {
    primary: "bg-upf-cyan hover:bg-upf-cyan/90 hover:scale-[1.02] active:scale-[0.98] text-upf-black font-semibold focus:ring-upf-cyan shadow-lg shadow-upf-cyan/30",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500 border border-slate-600",
    danger: "bg-transparent border border-upf-slate/50 text-upf-slate hover:border-upf-cyan/50 hover:text-upf-cyan",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white",
  };

  return (
    <button
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
};
