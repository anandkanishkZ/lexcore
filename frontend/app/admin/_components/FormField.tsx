"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

/** The one place every text input, select, and textarea in the console
 * gets its styling from. Before this, ~20 form files each retyped the same
 * Tailwind class string by hand (a couple didn't even hoist a local
 * constant — every field repeated it inline) — and every `<label>` was a
 * plain sibling of its `<input>` with no `htmlFor`/`id` pairing, so a
 * screen reader had no programmatic way to associate them and clicking a
 * label didn't focus its field. Both fixed by construction here: every
 * field gets a real id (defaulting to its `name`, which react-hook-form's
 * `register()` already supplies) and a `<label htmlFor>` pointing at it. */
export const fieldClass =
    "w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white disabled:opacity-50 disabled:cursor-not-allowed";

function FieldShell({ label, error, hint, id, children }: { label: ReactNode; error?: string; hint?: string; id?: string; children: ReactNode }) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
                {label}
            </label>
            {children}
            {error ? (
                <span className="mt-1 block text-xs text-red-500">{error}</span>
            ) : hint ? (
                <span className="mt-1 block text-xs text-slate-400">{hint}</span>
            ) : null}
        </div>
    );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: ReactNode;
    error?: string;
    hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
    { label, error, hint, id, name, className = "", ...rest },
    ref
) {
    const fieldId = id ?? name;
    return (
        <FieldShell label={label} error={error} hint={hint} id={fieldId}>
            <input ref={ref} id={fieldId} name={name} className={`${fieldClass} ${className}`} {...rest} />
        </FieldShell>
    );
});

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: ReactNode;
    error?: string;
    hint?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
    { label, error, hint, id, name, className = "", ...rest },
    ref
) {
    const fieldId = id ?? name;
    return (
        <FieldShell label={label} error={error} hint={hint} id={fieldId}>
            <textarea ref={ref} id={fieldId} name={name} className={`${fieldClass} resize-none ${className}`} {...rest} />
        </FieldShell>
    );
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label: ReactNode;
    error?: string;
    hint?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
    { label, error, hint, id, name, className = "", children, ...rest },
    ref
) {
    const fieldId = id ?? name;
    return (
        <FieldShell label={label} error={error} hint={hint} id={fieldId}>
            <select ref={ref} id={fieldId} name={name} className={`${fieldClass} ${className}`} {...rest}>
                {children}
            </select>
        </FieldShell>
    );
});
