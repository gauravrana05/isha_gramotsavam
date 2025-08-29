import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';

// Define the zod schema for validation
export const sportFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Sport name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  mainPlayersCount: z.number().int().min(1, 'Must have at least 1 main player').max(50, 'Too many players'),
  maxSubstitutes: z.number().int().min(0, 'Cannot have negative substitutes').max(20, 'Too many substitutes'),
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
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<SportFormValues>({
    defaultValues: defaultValues || {
      name: '',
      description: '',
      mainPlayersCount: 11,
      maxSubstitutes: 5,
      isActive: true,
      genderCategories: ['men', 'women'],
    },
  });

  const genderCategoriesWatch = watch('genderCategories');

  // Reset form when defaultValues change (for edit mode)
  React.useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  // Form submission with validation
  const onFormSubmit = (data: SportFormValues) => {
    // Ensure genderCategories is not empty
    if (!data.genderCategories || data.genderCategories.length === 0) {
      return;
    }

    // Validate with zod schema
    try {
      const validatedData = sportFormSchema.parse(data);
      onSubmit(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" id="sport-form-element">
      <div>
        <Label htmlFor="name">Sport Name *</Label>
        <Input 
          id="name" 
          {...register('name', { 
            required: 'Sport name is required',
            maxLength: { value: 100, message: 'Name too long' }
          })} 
          disabled={isLoading} 
          placeholder="Enter sport name"
          maxLength={100}
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          {...register('description')} 
          disabled={isLoading} 
          placeholder="Enter sport description (optional)"
          maxLength={500}
        />
        {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
      </div>
      <div>
        <Label htmlFor="mainPlayersCount">Main Players Count *</Label>
        <Input
          id="mainPlayersCount"
          type="number"
          min="1"
          max="50"
          {...register('mainPlayersCount', { 
            valueAsNumber: true,
            required: 'Main players count is required',
            validate: (value) => {
              if (!value || value < 1) return 'Must have at least 1 main player';
              if (value > 50) return 'Too many players (max 50)';
              return true;
            }
          })}
          disabled={isLoading}
          placeholder="Number of main players"
        />
        {errors.mainPlayersCount && (
          <p className="text-red-500 text-sm">{errors.mainPlayersCount.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="maxSubstitutes">Maximum Substitutes</Label>
        <Input
          id="maxSubstitutes"
          type="number"
          min="0"
          max="20"
          {...register('maxSubstitutes', { 
            valueAsNumber: true,
            validate: (value) => {
              if (value < 0) return 'Cannot have negative substitutes';
              if (value > 20) return 'Too many substitutes (max 20)';
              return true;
            }
          })}
          disabled={isLoading}
          placeholder="Number of substitute players"
        />
        {errors.maxSubstitutes && (
          <p className="text-red-500 text-sm">{errors.maxSubstitutes.message}</p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="isActive" 
          checked={watch('isActive')}
          onCheckedChange={(checked) => setValue('isActive', checked as boolean)}
          disabled={isLoading} 
        />
        <Label htmlFor="isActive">Active Sport</Label>
        {errors.isActive && <p className="text-red-500 text-sm">{errors.isActive.message}</p>}
      </div>
      <div>
        <Label>Gender Categories *</Label>
        <div className="flex flex-wrap gap-4 mt-2">
          {['men', 'women', 'mixed'].map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`gender-${category}`}
                checked={genderCategoriesWatch?.includes(category as 'men' | 'women' | 'mixed')}
                onCheckedChange={(checked) => {
                  const currentCategories = new Set(genderCategoriesWatch || []);
                  if (checked) {
                    currentCategories.add(category as 'men' | 'women' | 'mixed');
                  } else {
                    currentCategories.delete(category as 'men' | 'women' | 'mixed');
                  }
                  const newCategories = Array.from(currentCategories);
                  setValue('genderCategories', newCategories, { shouldValidate: true });
                }}
                disabled={isLoading}
              />
              <Label htmlFor={`gender-${category}`}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Label>
            </div>
          ))}
        </div>
        {(!genderCategoriesWatch || genderCategoriesWatch.length === 0) && (
          <p className="text-red-500 text-sm mt-1">At least one gender category is required</p>
        )}
        {errors.genderCategories && (
          <p className="text-red-500 text-sm">{errors.genderCategories.message}</p>
        )}
      </div>
      {/* Hidden submit button to allow form submission from modal footer */}
      <button type="submit" className="hidden" id="sport-form-submit-button" />
    </form>
  );
}
