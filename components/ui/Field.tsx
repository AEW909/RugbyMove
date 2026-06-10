import { forwardRef } from 'react'
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

const CONTROL_CLASSES =
  'mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30'

export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ className, ...rest }, ref) {
  return (
    <label
      ref={ref}
      className={cn('block text-sm font-semibold text-white/80', className)}
      {...rest}
    />
  )
})

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(CONTROL_CLASSES, className)} {...rest} />
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea ref={ref} className={cn(CONTROL_CLASSES, className)} {...rest} />
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(CONTROL_CLASSES, '[&>option]:bg-zinc-900', className)}
      {...rest}
    />
  )
})

type FormFieldProps = {
  /** Must match the id of the single control rendered inside. */
  htmlFor: string
  label: ReactNode
  /** Appends a muted "(optional)" hint to the label. */
  optional?: boolean
  /** Help text rendered under the control and linked via aria-describedby on it. */
  description?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Label + control + optional description with consistent spacing.
 * The control inside should set id={htmlFor}; when description is used,
 * also set aria-describedby={`${htmlFor}-description`}.
 *
 *   <FormField htmlFor="name" label="Name">
 *     <Input id="name" name="name" required maxLength={120} />
 *   </FormField>
 */
export function FormField({
  htmlFor,
  label,
  optional,
  description,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="font-normal text-white/30"> (optional)</span>}
      </Label>
      {children}
      {description && (
        <p id={`${htmlFor}-description`} className="mt-1 text-xs text-white/40">
          {description}
        </p>
      )}
    </div>
  )
}
