// src/features/product-recipe/components/ProductRecipeEditor.jsx
// Recipe editor for a single product — embedded inside ProductFormModal's
// edit view (recipe is a nested sub-resource, never a standalone page,
// matching the backend's own architecture decision documented in
// productRecipe.routes.js).
//
// PUT is always a FULL REPLACE — every save resubmits the complete
// desired items[] array, never a delta. There is no PATCH for recipes.

import { useEffect, useState }          from 'react'
import { useForm, useFieldArray }       from 'react-hook-form'
import { zodResolver }                  from '@hookform/resolvers/zod'
import { z }                            from 'zod'
import { Loader2, Plus, ChefHat }       from 'lucide-react'

import RecipeItemRow              from './RecipeItemRow'
import DeleteRecipeConfirmDialog  from './DeleteRecipeConfirmDialog'
import { useProductRecipe, useUpsertProductRecipe } from '../hooks/useProductRecipe'
import { useRawMaterials }        from '@/features/raw-material/hooks/useRawMaterials'
import useToast                   from '@/hooks/useToast'
import { cn }                     from '@/lib/utils'

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

// ── Zod schema ───────────────────────────────────────────────
// Mirrors validateUpsertRecipe exactly:
//   items non-empty, rawMaterialId valid ObjectId, quantityUsed > 0,
//   no duplicate rawMaterialId within items[].

const itemSchema = z.object({
  rawMaterialId: z.string().regex(OBJECT_ID_RE, 'Select a material'),
  quantityUsed:  z.number({ invalid_type_error: 'Enter a quantity' }).gt(0, 'Must be greater than 0'),
})

const recipeSchema = z.object({
  items: z.array(itemSchema).min(1, 'Add at least one item'),
}).refine(
  (d) => {
    const ids = d.items.map((i) => i.rawMaterialId).filter(Boolean)
    return ids.length === new Set(ids).size
  },
  { message: 'Each material can only appear once in a recipe', path: ['items'] }
)

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount ?? 0)

/**
 * @param {{ productId: string, productName?: string }} props
 */
const ProductRecipeEditor = ({ productId, productName }) => {
  const toast = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)

  // GET — null (not an error) means "no recipe created yet"
  const { data: recipe, isLoading: recipeLoading } = useProductRecipe(productId)

  // Populate the material selector from the existing Raw Material module.
  const { data: rawMaterialData, isLoading: materialsLoading } = useRawMaterials({
    isActive: 'true',
    limit:    100,
  })
  const rawMaterials = rawMaterialData?.data ?? []

  const upsertMutation = useUpsertProductRecipe()
  const isPending       = upsertMutation.isPending

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(recipeSchema),
    defaultValues: { items: [{ rawMaterialId: '', quantityUsed: '' }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  // Re-seed the form whenever the recipe query resolves — covers both
  // the initial load and the refetch that follows a successful save/delete.
  useEffect(() => {
    if (recipeLoading) return
    if (recipe?.items?.length) {
      reset({
        items: recipe.items.map((i) => ({
          rawMaterialId:
            typeof i.rawMaterialId === 'object'
              ? (i.rawMaterialId._id ?? i.rawMaterialId.toString())
              : i.rawMaterialId,
          quantityUsed: i.quantityUsed,
        })),
      })
    } else {
      reset({ items: [{ rawMaterialId: '', quantityUsed: '' }] })
    }
  }, [recipe, recipeLoading, reset])

  const watchedItems = watch('items') ?? []

  // Materials already chosen by rows OTHER than `index` — used to
  // exclude them from that row's own dropdown (duplicate prevention).
  const selectedIdsFor = (index) =>
    new Set(
      watchedItems
        .filter((_, i) => i !== index)
        .map((item) => item.rawMaterialId)
        .filter(Boolean)
    )

  // Live total HPP preview — mirrors the backend's exact formula
  // (SUM of quantityUsed × costPerUnit), computed client-side from
  // already-fetched raw material data, same approach already used for
  // margin display in ProductTable.jsx/ProductFormModal.jsx.
  const totalHPP = watchedItems.reduce((sum, item) => {
    const material = rawMaterials.find((m) => m._id === item.rawMaterialId)
    if (!material) return sum
    const qty = typeof item.quantityUsed === 'number' ? item.quantityUsed : Number(item.quantityUsed) || 0
    return sum + qty * material.costPerUnit
  }, 0)

  const onSubmit = (data) => {
    // FULL REPLACE — always submit the complete desired items array.
    const items = data.items.map((i) => ({
      rawMaterialId: i.rawMaterialId,
      quantityUsed:  i.quantityUsed,
    }))

    upsertMutation.mutate(
      { productId, items },
      {
        onSuccess: () => toast.success('Recipe saved', 'Cost (HPP) has been recalculated'),
        onError:   (err) => toast.error('Failed to save recipe', err?.response?.data?.message ?? 'Please check your inputs'),
      }
    )
  }

  // ── Loading state ──────────────────────────────────────────
  if (recipeLoading || materialsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ── Empty state — no raw materials exist in this tenant yet ──
  // A recipe cannot be built without at least one raw material to pick from.
  if (rawMaterials.length === 0) {
    return (
      <div className="rounded-md bg-muted/30 px-3 py-4 text-center">
        <p className="text-sm text-foreground font-medium">No raw materials yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add at least one raw material before building a recipe for this product.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3.5">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <ChefHat className="w-3.5 h-3.5 text-muted-foreground" />
          Recipe
        </p>
        {recipe && (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={isPending}
            className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
          >
            Remove recipe
          </button>
        )}
      </div>

      {/* Recipe item rows — empty state when all rows removed */}
      <div className="space-y-2">
        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            No items yet — add one below.
          </p>
        ) : (
          fields.map((field, index) => (
            <RecipeItemRow
              key={field.id}
              index={index}
              register={register}
              error={errors.items?.[index]}
              rawMaterials={rawMaterials}
              selectedIds={selectedIdsFor(index)}
              currentRawMaterialId={watchedItems[index]?.rawMaterialId}
              currentQuantity={watchedItems[index]?.quantityUsed}
              disabled={isPending}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
            />
          ))
        )}
      </div>

      {/* Array-level validation errors (empty array, duplicate material) */}
      {typeof errors.items?.message === 'string' && (
        <p className="text-xs text-destructive">{errors.items.message}</p>
      )}
      {typeof errors.items?.root?.message === 'string' && (
        <p className="text-xs text-destructive">{errors.items.root.message}</p>
      )}

      {/* Add item */}
      <button
        type="button"
        onClick={() => append({ rawMaterialId: '', quantityUsed: '' })}
        disabled={isPending || fields.length >= rawMaterials.length}
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg',
          'bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Plus className="w-3.5 h-3.5" />
        Add Item
      </button>

      {/* Live total HPP preview */}
      <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2.5">
        <span className="text-xs font-medium text-muted-foreground">Total Cost (HPP)</span>
        <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(totalHPP)}</span>
      </div>

      {/* Save recipe — intentionally type="button" + handleSubmit(), since
          this editor lives inside ProductFormModal's own <form> and must
          never trigger a nested form submission. */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isPending}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md',
            'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
            'disabled:opacity-60 disabled:cursor-not-allowed'
          )}
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isPending ? 'Saving Recipe…' : 'Save Recipe'}
        </button>
      </div>

      <DeleteRecipeConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        productId={productId}
        productName={productName}
      />
    </div>
  )
}

export default ProductRecipeEditor