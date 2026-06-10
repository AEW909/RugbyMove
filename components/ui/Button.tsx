import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20 hover:opacity-90',
  secondary:
    'border border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
  danger:
    'border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20',
  ghost: 'text-white/60 hover:bg-white/10 hover:text-white',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

/**
 * Class builder shared by Button and link-shaped buttons.
 * Use directly on <Link> when navigation should look like a button:
 *
 *   <Link href="/playbooks" className={buttonVariants('secondary')}>Playbooks</Link>
 */
export function buttonVariants(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400',
    'disabled:pointer-events-none disabled:opacity-40',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  )
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

/**
 * Server-component-safe button. For forms posting to server actions,
 * prefer SubmitButton, which adds a pending state automatically.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', type = 'button', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonVariants(variant, size, className)}
      {...rest}
    />
  )
})

export default Button
