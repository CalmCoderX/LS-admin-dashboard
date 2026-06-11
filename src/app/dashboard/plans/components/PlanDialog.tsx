'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Info, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';
import { superAdminApi } from '@/lib/api';
import {
  PlanAdmin,
  PlanCreateRequest,
  PlanUpdateRequest,
  TierAdmin,
  StripePriceOption,
  StripeProductVerificationResponse,
} from '@/types/api';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import Modal from '@/components/ui/Modal';

interface PlanDialogProps {
  plan?: PlanAdmin | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  tiers: TierAdmin[];
}

interface FormData {
  name: string;
  description: string;
  name_brl: string;
  description_brl: string;
  amount: string;
  interval: string;
  stripe_product_id: string;
  stripe_product_id_brl: string;
  stripe_price_id: string;
  stripe_price_id_brl: string;
  tier_id: string;
  is_active: boolean;
  is_featured: boolean;
}

export function PlanDialog({ plan, isOpen, onClose, onSuccess, mode, tiers }: PlanDialogProps) {
  const isEditing = mode === 'edit' && plan;
  const [priceOptions, setPriceOptions] = useState<StripePriceOption[]>([]);
  const [priceOptionsBrl, setPriceOptionsBrl] = useState<StripePriceOption[]>([]);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productImagesBrl, setProductImagesBrl] = useState<string[]>([]);
  const [verifiedProductId, setVerifiedProductId] = useState<string | null>(null);
  const [verifiedProductIdBrl, setVerifiedProductIdBrl] = useState<string | null>(null);
  const [verificationState, setVerificationState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [verificationStateBrl, setVerificationStateBrl] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationMessageBrl, setVerificationMessageBrl] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, clearErrors } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      name_brl: '',
      description_brl: '',
      amount: '0.00',
      interval: 'month',
      stripe_product_id: '',
      stripe_product_id_brl: '',
      stripe_price_id: '',
      stripe_price_id_brl: '',
      tier_id: '',
      is_active: true,
      is_featured: false,
    }
  });
  const stripeProductId = watch('stripe_product_id');
  const stripeProductIdBrl = watch('stripe_product_id_brl');
  const selectedPriceId = watch('stripe_price_id');
  const selectedPriceIdBrl = watch('stripe_price_id_brl');
  const usdPriceOptions = priceOptions.filter((p) => (p.currency || '').toLowerCase() === 'usd');
  const brlPriceOptions = priceOptionsBrl.filter((p) => (p.currency || '').toLowerCase() === 'brl');
  const selectedBrlPrice = brlPriceOptions.find((p) => p.id === selectedPriceIdBrl);
  const brlInterval = selectedBrlPrice
    ? `${selectedBrlPrice.interval_count} ${selectedBrlPrice.interval}${selectedBrlPrice.interval_count > 1 ? 's' : ''}`
    : '—';

  // Derive the BRL amount from the selected BRL price option (or from the loaded plan when editing)
  const amountBrl: number | null = (() => {
    if (selectedPriceIdBrl) {
      const opt = priceOptionsBrl.find((p) => p.id === selectedPriceIdBrl);
      if (opt) return Number(opt.amount);
    }
    if (isEditing && plan?.amount_brl != null) return Number(plan.amount_brl);
    return null;
  })();

  // Load plan data when editing
  useEffect(() => {
    if (isEditing && plan) {
      setValue('name', plan.name);
      setValue('description', plan.description || '');
      setValue('name_brl', plan.name_brl || '');
      setValue('description_brl', plan.description_brl || '');
      setValue('amount', plan.amount.toString());
      setValue('interval', plan.interval);
      setValue('stripe_product_id', plan.stripe_product_id);
      setValue('stripe_product_id_brl', plan.stripe_product_id_brl || '');
      setValue('stripe_price_id', plan.stripe_price_id);
      setValue('stripe_price_id_brl', plan.stripe_price_id_brl || '');
      setValue('tier_id', plan.tier_id.toString());
      setValue('is_active', plan.is_active);
      setValue('is_featured', plan.is_featured);
      setPriceOptions([{
        id: plan.stripe_price_id,
        amount: plan.amount,
        currency: 'usd',
        interval: plan.interval,
        interval_count: plan.interval_count,
        nickname: 'Current plan price',
      }, ...(plan.stripe_price_id_brl && plan.amount_brl != null ? [{
        id: plan.stripe_price_id_brl,
        amount: Number(plan.amount_brl),
        currency: 'brl',
        interval: plan.interval_brl || plan.interval,
        interval_count: plan.interval_count_brl || plan.interval_count,
        nickname: 'Current BRL price',
      }] : [])]);
      setProductImages([]);
      setProductImagesBrl([]);
      setVerifiedProductId(plan.stripe_product_id);
      setVerifiedProductIdBrl(plan.stripe_product_id_brl || null);
      setVerificationState('valid');
      setVerificationStateBrl(plan.stripe_product_id_brl ? 'valid' : 'idle');
      setVerificationMessage('Using current plan Stripe data. Click Verify Product to refresh from Stripe.');
      setVerificationMessageBrl(plan.stripe_product_id_brl ? 'Using current Brazil Stripe product.' : null);
    } else if (mode === 'create') {
      reset({
        name: '',
        description: '',
        name_brl: '',
        description_brl: '',
        amount: '0.00',
        interval: 'month',
        stripe_product_id: '',
        stripe_product_id_brl: '',
        stripe_price_id: '',
        stripe_price_id_brl: '',
        tier_id: '',
        is_active: true,
        is_featured: false,
      });
      setPriceOptions([]);
      setProductImages([]);
      setProductImagesBrl([]);
      setVerifiedProductId(null);
      setVerifiedProductIdBrl(null);
      setVerificationState('idle');
      setVerificationStateBrl('idle');
      setVerificationMessage(null);
      setVerificationMessageBrl(null);
    }
  }, [plan, isEditing, mode, setValue, reset]);

  useEffect(() => {
    const normalizedProductId = stripeProductId?.trim() || '';
    if (!normalizedProductId) {
      if (mode !== 'create') {
        return;
      }
      setVerifiedProductId(null);
      setVerificationState('idle');
      setVerificationMessage(null);
      setPriceOptions([]);
      setProductImages([]);
      setValue('name', '');
      setValue('description', '');
      setValue('stripe_price_id', '');
      setValue('amount', '0.00');
      setValue('interval', 'month');
      clearErrors('stripe_price_id');
      return;
    }

    if (verifiedProductId && normalizedProductId !== verifiedProductId) {
      setVerificationState('idle');
      setVerificationMessage(null);
      setPriceOptions([]);
      setProductImages([]);
      setValue('name', '');
      setValue('description', '');
      setValue('stripe_price_id', '');
      setValue('stripe_price_id_brl', '');
      setValue('amount', '0.00');
      setValue('interval', 'month');
      clearErrors('stripe_price_id');
    }
  }, [stripeProductId, verifiedProductId, setValue, clearErrors]);

  useEffect(() => {
    const normalizedProductId = stripeProductIdBrl?.trim() || '';
    if (!normalizedProductId) {
      setVerifiedProductIdBrl(null);
      setVerificationStateBrl('idle');
      setVerificationMessageBrl(null);
      setPriceOptionsBrl([]);
      setProductImagesBrl([]);
      setValue('name_brl', '');
      setValue('description_brl', '');
      setValue('stripe_price_id_brl', '');
      return;
    }

    if (verifiedProductIdBrl && normalizedProductId !== verifiedProductIdBrl) {
      setVerificationStateBrl('idle');
      setVerificationMessageBrl(null);
      setPriceOptionsBrl([]);
      setProductImagesBrl([]);
      setValue('name_brl', '');
      setValue('description_brl', '');
      setValue('stripe_price_id_brl', '');
    }
  }, [stripeProductIdBrl, verifiedProductIdBrl, setValue]);

  const createMutation = useMutation({
    mutationFn: (data: PlanCreateRequest) => superAdminApi.createPlan(data),
    onSuccess: () => {
      toast.success('Plan created successfully');
      onSuccess();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create plan'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PlanUpdateRequest) => superAdminApi.updatePlan(plan!.id, data),
    onSuccess: () => {
      toast.success('Plan updated successfully');
      onSuccess();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update plan'));
    },
  });

  const verifyStripeProductMutation = useMutation({
    mutationFn: (productId: string) =>
      superAdminApi.verifyStripeProduct(productId, isEditing ? plan.id : undefined, 'world'),
    onSuccess: (verificationData: StripeProductVerificationResponse) => {
      if (!verificationData.prices.length) {
        setVerificationState('invalid');
        setVerificationMessage('No recurring prices found for this product.');
        setPriceOptions([]);
        setProductImages(verificationData.image_urls || []);
        setValue('name', verificationData.name || '');
        setValue('description', verificationData.description || '');
        setValue('stripe_price_id', '');
        setValue('amount', '0.00');
        setValue('interval', 'month');
        clearErrors('stripe_price_id');
        toast.error('Product verified, but no recurring prices are available.');
        return;
      }

      const verifiedUsdPrices = verificationData.prices.filter(
        (price) => (price.currency || '').toLowerCase() === 'usd'
      );
      const verifiedBrlPrices = verificationData.prices.filter(
        (price) => (price.currency || '').toLowerCase() === 'brl'
      );
      if (!verifiedUsdPrices.length) {
        setVerificationState('invalid');
        setVerificationMessage('No recurring USD prices found for this product.');
        setPriceOptions(verificationData.prices);
        setProductImages(verificationData.image_urls || []);
        setValue('stripe_price_id', '');
        setValue('amount', '0.00');
        clearErrors('stripe_price_id');
        toast.error('Product verified, but no USD recurring prices are available.');
        return;
      }
      const selectedPrice =
        verifiedUsdPrices.find((price) => price.id === selectedPriceId) || verifiedUsdPrices[0];

      setPriceOptions(verificationData.prices);
      setProductImages(verificationData.image_urls || []);
      setVerifiedProductId(verificationData.stripe_product_id);
      setVerificationState('valid');
      setVerificationMessage('Stripe product is valid. Fields were auto-filled.');

      setValue('stripe_product_id', verificationData.stripe_product_id);
      setValue('name', verificationData.name || '');
      setValue('description', verificationData.description || '');
      setValue('stripe_price_id', selectedPrice?.id || '', { shouldDirty: true });
      setValue(
        'stripe_price_id_brl',
        isEditing
          ? (plan?.stripe_price_id_brl || '')
          : (verifiedBrlPrices[0]?.id || '')
      );
      setValue('amount', selectedPrice ? selectedPrice.amount.toString() : '0.00');
      setValue(
        'interval',
        selectedPrice
          ? `${selectedPrice.interval_count} ${selectedPrice.interval}${selectedPrice.interval_count > 1 ? 's' : ''}`
          : 'month'
      );
      clearErrors('stripe_price_id');

      toast.success('Stripe product verified');
    },
    onError: (error) => {
      setVerificationState('invalid');
      setVerificationMessage(getErrorMessage(error, 'Invalid Stripe product ID'));
      setVerifiedProductId(null);
      setPriceOptions([]);
      setProductImages([]);
      setValue('name', '');
      setValue('description', '');
      setValue('stripe_price_id', '');
      setValue('amount', '0.00');
      setValue('interval', 'month');
      clearErrors('stripe_price_id');
      toast.error(getErrorMessage(error, 'Invalid Stripe product ID'));
    },
  });

  const verifyStripeProductBrlMutation = useMutation({
    mutationFn: (productId: string) =>
      superAdminApi.verifyStripeProduct(productId, isEditing ? plan?.id : undefined, 'br'),
    onSuccess: (verificationData: StripeProductVerificationResponse) => {
      const verifiedBrlPrices = verificationData.prices.filter(
        (price) => (price.currency || '').toLowerCase() === 'brl'
      );
      if (!verifiedBrlPrices.length) {
        setVerificationStateBrl('invalid');
        setVerificationMessageBrl('No recurring BRL prices found for this product.');
        setPriceOptionsBrl([]);
        return;
      }

      setPriceOptionsBrl(verificationData.prices);
      setProductImagesBrl(verificationData.image_urls || []);
      setVerifiedProductIdBrl(verificationData.stripe_product_id);
      setVerificationStateBrl('valid');
      setVerificationMessageBrl('Brazil Stripe product is valid. Fields were auto-filled.');
      setValue('stripe_product_id_brl', verificationData.stripe_product_id);
      setValue('name_brl', verificationData.name || '');
      setValue('description_brl', verificationData.description || '');
      setValue('stripe_price_id_brl', verifiedBrlPrices[0]?.id || '');
      toast.success('Brazil Stripe product verified');
    },
    onError: (error) => {
      setVerificationStateBrl('invalid');
      setVerificationMessageBrl(getErrorMessage(error, 'Invalid Brazil Stripe product ID'));
      setVerifiedProductIdBrl(null);
      setPriceOptionsBrl([]);
      setProductImagesBrl([]);
      toast.error(getErrorMessage(error, 'Invalid Brazil Stripe product ID'));
    },
  });

  useEffect(() => {
    if (!isOpen || !isEditing || !plan?.stripe_product_id) {
      return;
    }
    verifyStripeProductMutation.mutate(plan.stripe_product_id);
  }, [isOpen, isEditing, plan?.id, plan?.stripe_product_id]);

  const handleVerifyStripeProduct = () => {
    const productId = stripeProductId?.trim();
    if (!productId) {
      setVerificationState('invalid');
      setVerificationMessage('Enter a Stripe Product ID before verification.');
      toast.error('Stripe Product ID is required');
      return;
    }
    verifyStripeProductMutation.mutate(productId);
  };

  const handleVerifyStripeProductBrl = () => {
    const productId = stripeProductIdBrl?.trim();
    if (!productId) {
      setVerificationStateBrl('invalid');
      setVerificationMessageBrl('Enter a Brazil Stripe Product ID before verification.');
      toast.error('Brazil Stripe Product ID is required');
      return;
    }
    verifyStripeProductBrlMutation.mutate(productId);
  };

  const handlePriceChange = (priceId: string) => {
    setValue('stripe_price_id', priceId, { shouldDirty: true });
    clearErrors('stripe_price_id');
    const selected = usdPriceOptions.find(price => price.id === priceId);
    if (!selected) return;
    setValue('amount', selected.amount.toString());
    setValue('interval', `${selected.interval_count} ${selected.interval}${selected.interval_count > 1 ? 's' : ''}`);
  };

  const onSubmit = (data: FormData) => {
    const normalizedProductId = data.stripe_product_id.trim();
    if (!verifiedProductId || normalizedProductId !== verifiedProductId) {
      toast.error('Verify the Stripe product before saving.');
      return;
    }

    if (!data.stripe_price_id) {
      toast.error('Select a Stripe price ID.');
      return;
    }

    if (data.stripe_product_id_brl?.trim()) {
      const normalizedBrlProductId = data.stripe_product_id_brl.trim();
      if (!verifiedProductIdBrl || normalizedBrlProductId !== verifiedProductIdBrl) {
        toast.error('Verify the Brazil Stripe product before saving.');
        return;
      }
      if (!data.stripe_price_id_brl) {
        toast.error('Select a Brazil (BRL) Stripe price ID.');
        return;
      }
    }

    if (isEditing) {
      // For editing, send all editable fields including price
      const payload: PlanUpdateRequest = {
        name: data.name,
        description: data.description || undefined,
        name_brl: data.name_brl || null,
        description_brl: data.description_brl || null,
        amount: parseFloat(data.amount),
        stripe_product_id: data.stripe_product_id,
        stripe_product_id_brl: data.stripe_product_id_brl || null,
        stripe_price_id: data.stripe_price_id,
        stripe_price_id_brl: data.stripe_price_id_brl || null,
        interval_brl: selectedBrlPrice?.interval || null,
        interval_count_brl: selectedBrlPrice?.interval_count ?? null,
        tier_id: parseInt(data.tier_id),
        is_active: data.is_active,
        is_featured: data.is_featured,
      };
      updateMutation.mutate(payload);
    } else {
      // For creating, send all fields
      const payload: PlanCreateRequest = {
        name: data.name,
        description: data.description || undefined,
        name_brl: data.name_brl || null,
        description_brl: data.description_brl || null,
        amount: parseFloat(data.amount),
        interval: 'month',
        interval_count: 1,
        interval_brl: selectedBrlPrice?.interval || null,
        interval_count_brl: selectedBrlPrice?.interval_count ?? null,
        stripe_product_id: data.stripe_product_id,
        stripe_product_id_brl: data.stripe_product_id_brl || undefined,
        stripe_price_id: data.stripe_price_id,
        stripe_price_id_brl: data.stripe_price_id_brl || undefined,
        tier_id: parseInt(data.tier_id),
        is_active: data.is_active,
        is_featured: data.is_featured,
      };
      createMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={isEditing ? 'Edit Plan' : 'Create New Plan'}>
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Tier *</label>
                <select
                  {...register('tier_id', { required: 'Tier is required' })}
                  className="input-field"
                >
                  <option value="">Select a tier</option>
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.id.toString()}>
                      {tier.name} ({tier.slug})
                    </option>
                  ))}
                </select>
                {errors.tier_id && (
                  <p className="text-sm text-red-600">{errors.tier_id.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={watch('is_active')}
                  onChange={(e) => setValue('is_active', e.target.checked)}
                  className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                />
                <label className="text-sm font-medium text-text-primary">Active</label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={watch('is_featured')}
                  onChange={(e) => setValue('is_featured', e.target.checked)}
                  className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                />
                <label className="text-sm font-medium text-text-primary">Featured Plan</label>
              </div>
            </div>

          {/* Stripe Integration */}
          <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary">Stripe Integration</h3>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Enter a Stripe Product ID and click Verify Product. Then select the USD price (required) and optionally a Brazil (BRL) price for organizations billed in Brazil.
                  </p>
                </div>
              </div>

              <div className="space-y-4 border border-bg-light-6 dark:border-gray-600 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-text-primary">English (EN)</h4>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">Plan Name *</label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    placeholder="Auto-filled from Stripe world product"
                    className="input-field"
                    readOnly
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">Description (EN)</label>
                  <textarea
                    {...register('description')}
                    placeholder="Auto-filled from Stripe world product"
                    rows={3}
                    className="input-field resize-none"
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Stripe Product ID (EN) *</label>
                    <input
                      {...register('stripe_product_id', { required: 'Stripe Product ID is required' })}
                      placeholder="prod_XXXXXXXXXX"
                      className="input-field"
                    />
                    {errors.stripe_product_id && (
                      <p className="text-sm text-red-600">{errors.stripe_product_id.message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyStripeProduct}
                    className="btn-secondary flex items-center gap-2 h-10"
                    disabled={verifyStripeProductMutation.isPending}
                  >
                    {verifyStripeProductMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {verifyStripeProductMutation.isPending ? 'Verifying...' : 'Verify EN Product'}
                  </button>
                </div>
                {verificationMessage && (
                  <p className={`text-sm ${verificationState === 'invalid' ? 'text-status-error' : 'text-text-secondary'}`}>
                    {verificationMessage}
                  </p>
                )}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">Stripe Price ID (USD) *</label>
                  <select
                    {...register('stripe_price_id', { required: 'Stripe Price ID is required' })}
                    className="input-field"
                    onChange={(e) => handlePriceChange(e.target.value)}
                    value={watch('stripe_price_id')}
                    disabled={usdPriceOptions.length === 0}
                  >
                    <option value="">{usdPriceOptions.length ? 'Select USD price ID' : 'Verify EN product first'}</option>
                    {usdPriceOptions.map((price) => (
                      <option key={price.id} value={price.id}>
                        {price.id.replace('price_', '')} {price.nickname ? `— ${price.nickname}` : `— USD ${price.amount}`}
                      </option>
                    ))}
                  </select>
                  {errors.stripe_price_id && (
                    <p className="text-sm text-red-600">{errors.stripe_price_id.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Auto-filled Amount (USD)</label>
                    <input
                      type="text"
                      {...register('amount', { required: 'Price is required' })}
                      className="input-field"
                      readOnly
                    />
                    {errors.amount && (
                      <p className="text-sm text-red-600">{errors.amount.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Pricing Interval (USD)</label>
                    <input
                      type="text"
                      {...register('interval')}
                      className="input-field"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border border-bg-light-6 dark:border-gray-600 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-text-primary">Portuguese (PT-BR)</h4>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">Plan Name (PT-BR)</label>
                  <input
                    {...register('name_brl')}
                    placeholder="Auto-filled from Stripe Brazil product"
                    className="input-field"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">Description (PT-BR)</label>
                  <textarea
                    {...register('description_brl')}
                    placeholder="Auto-filled from Stripe Brazil product"
                    rows={3}
                    className="input-field resize-none"
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Stripe Product ID (PT-BR)</label>
                    <input
                      {...register('stripe_product_id_brl')}
                      placeholder="prod_XXXXXXXXXX"
                      className="input-field"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyStripeProductBrl}
                    className="btn-secondary flex items-center gap-2 h-10"
                    disabled={verifyStripeProductBrlMutation.isPending}
                  >
                    {verifyStripeProductBrlMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {verifyStripeProductBrlMutation.isPending ? 'Verifying...' : 'Verify PT-BR Product'}
                  </button>
                </div>
                {verificationMessageBrl && (
                  <p className={`text-sm ${verificationStateBrl === 'invalid' ? 'text-status-error' : 'text-text-secondary'}`}>
                    {verificationMessageBrl}
                  </p>
                )}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">
                    Stripe Price ID (BRL)
                    <span className="ml-1 text-xs font-normal text-text-secondary">(optional)</span>
                  </label>
                  <select
                    {...register('stripe_price_id_brl')}
                    className="input-field"
                    value={watch('stripe_price_id_brl')}
                    onChange={(e) => setValue('stripe_price_id_brl', e.target.value, { shouldDirty: true })}
                    disabled={brlPriceOptions.length === 0}
                  >
                    <option value="">{brlPriceOptions.length ? 'None — same price as USD' : 'No BRL prices found'}</option>
                    {brlPriceOptions.map((price) => (
                      <option key={price.id} value={price.id}>
                        {price.id.replace('price_', '')} {price.nickname ? `— ${price.nickname}` : `— BRL ${price.amount}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Auto-filled Amount (BRL)</label>
                    <input
                      type="text"
                      value={amountBrl != null ? `R$ ${amountBrl.toFixed(2)}` : '—'}
                      className="input-field text-text-secondary"
                      readOnly
                    />
                    <p className="text-xs text-text-secondary">
                      Automatically pulled from selected BRL price.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Pricing Interval (BRL)</label>
                    <input
                      type="text"
                      value={brlInterval}
                      className="input-field text-text-secondary"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Product Images</h3>
            {productImages.length === 0 && productImagesBrl.length === 0 ? (
              <div className="rounded-lg border border-dashed border-bg-light-6 p-4 text-sm text-text-secondary flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                No images provided by Stripe for this product.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[...productImages, ...productImagesBrl].map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="block group">
                    <img
                      src={url}
                      alt="Stripe product"
                      className="w-full h-24 object-cover rounded-md border border-bg-light-6 group-hover:opacity-90 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            )}
            </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
