import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import  Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';

// Define the schema for the Sport form
export const sportFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Sport name is required'),
  description: z.string().optional(),
  mainPlayersCount: z.number().int().min(1, 'Must have at least 1 main player').max(50, 'Too many players'),
  maxSubstitutes: z.number().int().min(0).max(20, 'Too many substitutes').default(0),
  isActive: z.boolean().default(true),
  genderCategories: z.array(z.enum(['men', 'women', 'mixed'])).min(1, 'At least one gender category required'),
});

export type SportFormValues = z.infer<typeof sportFormSchema>;

interface SportFormProps {
  onSubmit: (data: SportFormValues) => void;
  defaultValues?: SportFormValues;
  isLoading: boolean;
}

export function SportForm({ onSubmit, defaultValues, isLoading }: SportFormProps) {
  const t = useTranslations('AdminSports');
  const commonT = useTranslations('Common');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SportFormValues>({
    resolver: zodResolver(sportFormSchema),
    defaultValues: defaultValues,
  });

  const genderCategoriesWatch = watch('genderCategories');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="name">{t('formName')}</Label>
        <Input id="name" {...register('name')} disabled={isLoading} />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="description">{t('formDescription')}</Label>
        <Textarea id="description" {...register('description')} disabled={isLoading} />
        {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
      </div>
      <div>
        <Label htmlFor="mainPlayersCount">{t('formMainPlayersCount')}</Label>
        <Input
          id="mainPlayersCount"
          type="number"
          {...register('mainPlayersCount', { valueAsNumber: true })}
          disabled={isLoading}
        />
        {errors.mainPlayersCount && (
          <p className="text-red-500 text-sm">{errors.mainPlayersCount.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="maxSubstitutes">{t('formMaxSubstitutes')}</Label>
        <Input
          id="maxSubstitutes"
          type="number"
          {...register('maxSubstitutes', { valueAsNumber: true })}
          disabled={isLoading}
        />
        {errors.maxSubstitutes && (
          <p className="text-red-500 text-sm">{errors.maxSubstitutes.message}</p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="isActive" {...register('isActive')} disabled={isLoading} />
        <Label htmlFor="isActive">{t('formIsActive')}</Label>
        {errors.isActive && <p className="text-red-500 text-sm">{errors.isActive.message}</p>}
      </div>
      <div>
        <Label>{t('formGenderCategories')}</Label>
        <div className="flex flex-wrap gap-4 mt-2">
          {['men', 'women', 'mixed'].map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`gender-${category}`}
                checked={genderCategoriesWatch?.includes(category as 'men' | 'women' | 'mixed')}
                onCheckedChange={(checked) => {
                  const currentCategories = new Set(genderCategoriesWatch);
                  if (checked) {
                    currentCategories.add(category as 'men' | 'women' | 'mixed');
                  } else {
                    currentCategories.delete(category as 'men' | 'women' | 'mixed');
                  }
                  setValue('genderCategories', Array.from(currentCategories));
                }}
                disabled={isLoading}
              />
              <Label htmlFor={`gender-${category}`}>{commonT(category)}</Label>
            </div>
          ))}
        </div>
        {errors.genderCategories && (
          <p className="text-red-500 text-sm">{errors.genderCategories.message}</p>
        )}
      </div>
      {/* Hidden submit button to allow form submission from modal footer */}
      <button type="submit" className="hidden" id="sport-form-submit-button" />
    </form>
  );
}
