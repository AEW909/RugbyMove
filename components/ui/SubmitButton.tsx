'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import type { ButtonProps } from '@/components/ui/Button'
import { buttonVariants } from '@/components/ui/Button'

type SubmitButtonProps = Omit<ButtonProps, 'type'> & {
  /** Replaces children while the parent form's server action is pending. */
  pendingLabel?: string
}

/**
 * Submit button for forms posting to server actions. While the action is
 * pending it disables itself, sets aria-busy, and shows a spinner — so every
 * form gets a loading state without page-level wiring.
 *
 *   <form action={updateOrg}>
 *     ...
 *     <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
 *   </form>
 */
export default function SubmitButton({
  variant = 'primary',
  size = 'md',
  pendingLabel,
  className,
  children,
  disabled,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={buttonVariants(variant, size, className)}
      {...rest}
    >
      {pending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
      {pending ? pendingLabel ?? children : children}
    </button>
  )
}
