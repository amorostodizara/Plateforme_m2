import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export interface OptionSelect {
  value: string
  label: string
}

interface SelectRechercheProps {
  options: OptionSelect[]
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  placeholderRecherche?: string
  required?: boolean
  disabled?: boolean
  clearable?: boolean
  className?: string
}

export function SelectRecherche({
  options,
  value,
  onChange,
  label,
  placeholder = 'Choisir…',
  placeholderRecherche = 'Rechercher...',
  required = false,
  disabled = false,
  clearable = true,
  className = '',
}: SelectRechercheProps) {
  const [recherche, setRecherche] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const conteneurRef = useRef<HTMLDivElement>(null)

  const optionsFiltrees = useMemo(() => {
    const terme = recherche.toLowerCase().trim()

    return options.filter((option) =>
      option.label.toLowerCase().includes(terme),
    )
  }, [options, recherche])

  const optionSelectionnee = options.find((option) => option.value === value)

  // Fermeture au clic extérieur
  useEffect(() => {
    function fermerAuClicExterieur(event: PointerEvent) {
      if (
        conteneurRef.current &&
        !conteneurRef.current.contains(event.target as Node)
      ) {
        setOuvert(false)
        setRecherche('')
      }
    }

    document.addEventListener('pointerdown', fermerAuClicExterieur)

    return () => {
      document.removeEventListener('pointerdown', fermerAuClicExterieur)
    }
  }, [])

  function selectionner(valeur: string) {
    onChange(valeur)
    setOuvert(false)
    setRecherche('')
  }

  return (
    <div ref={conteneurRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        aria-expanded={ouvert}
        aria-haspopup="listbox"
        onClick={() => {
          setOuvert((ancien) => !ancien)
          setRecherche('')
        }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={`truncate ${
            optionSelectionnee ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {optionSelectionnee?.label ?? placeholder}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${
            ouvert ? 'rotate-180' : ''
          }`}
        />
      </button>

      {ouvert && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder={placeholderRecherche}
                autoFocus
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-1">
            {clearable && (
              <button
                type="button"
                onClick={() => selectionner('')}
                className="w-full rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                {placeholder}
              </button>
            )}

            {optionsFiltrees.length > 0 ? (
              optionsFiltrees.map((option) => {
                const selectionnee = value === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selectionnee}
                    onClick={() => selectionner(option.value)}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
                      selectionnee
                        ? 'bg-orange-50 text-primary'
                        : 'text-foreground'
                    }`}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>

                    {selectionnee && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                )
              })
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Aucun résultat trouvé.
              </p>
            )}
          </div>

          <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            {optionsFiltrees.length} résultat(s)
          </div>
        </div>
      )}
    </div>
  )
}
