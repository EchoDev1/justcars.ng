/**
 * Dealer Badge Purchase & Management Page
 * Allows dealers to purchase and manage their verification badges
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DealerBadge from '@/components/ui/DealerBadge'
import {
  Shield,
  Award,
  Crown,
  CheckCircle,
  Star,
  TrendingUp,
  Users,
  Zap,
  Calendar,
  CreditCard,
  AlertCircle,
  Info,
  Sparkles
} from 'lucide-react'
import { openPaymentModal, generateReference, formatNaira, BADGE_PRICING } from '@/lib/payments'

export default function DealerBadgesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [dealer, setDealer] = useState(null)
  const [currentBadge, setCurrentBadge] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchDealerData()
  }, [])

  const fetchDealerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/dealer/auth')
        return
      }

      // Fetch dealer data
      const { data: dealerData, error: dealerError } = await supabase
        .from('dealers')
        .select('*')
        .eq('id', user.id)
        .single()

      if (dealerError) throw dealerError

      setDealer(dealerData)

      // Fetch current active badge
      const { data: badgeData } = await supabase
        .from('dealer_badges')
        .select('*')
        .eq('dealer_id', user.id)
        .eq('badge_status', 'active')
        .single()

      setCurrentBadge(badgeData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dealer data:', error)
      setError('Failed to load dealer information')
      setLoading(false)
    }
  }

  const handlePurchaseBadge = async (badgeType) => {
    if (badgeType === 'verified') {
      setError('Verified badge is free and issued by admin. Please contact support.')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const pricing = BADGE_PRICING[badgeType]
      const reference = generateReference('BADGE')

      // Calculate subscription end date (30 days from now)
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      openPaymentModal({
        email: dealer.email,
        amount: pricing.price,
        reference,
        metadata: {
          dealer_id: dealer.id,
          transaction_type: 'badge_subscription',
          badge_type: badgeType,
          dealer_name: dealer.name
        },
        onSuccess: async (response) => {
          try {
            // Record payment transaction
            await supabase
              .from('payment_transactions')
              .insert({
                transaction_type: 'badge_subscription',
                payer_id: dealer.id,
                payer_type: 'dealer',
                amount: pricing.price,
                currency: 'NGN',
                payment_gateway: 'paystack',
                payment_reference: reference,
                gateway_reference: response.reference,
                status: 'successful',
                related_entity_type: 'dealer_badge',
                related_entity_id: dealer.id
              })

            // Deactivate any existing active badges
            if (currentBadge) {
              await supabase
                .from('dealer_badges')
                .update({ badge_status: 'expired' })
                .eq('id', currentBadge.id)
            }

            // Create new badge subscription
            await supabase
              .from('dealer_badges')
              .insert({
                dealer_id: dealer.id,
                badge_type: badgeType,
                badge_status: 'active',
                monthly_price: pricing.price,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                auto_renew: true,
                last_payment_date: new Date().toISOString(),
                last_payment_amount: pricing.price,
                last_payment_reference: reference,
                issued_by_admin: false
              })

            // Record terms acceptance
            await supabase
              .from('terms_acceptances')
              .insert({
                user_id: dealer.id,
                user_type: 'dealer',
                terms_version: 'v1.0',
                acceptance_type: 'general'
              })
              .onConflict('user_id,terms_version,acceptance_type')

            setSuccess(`${pricing.name} activated successfully! Your badge is now live.`)
            setProcessing(false)

            // Reload dealer data
            setTimeout(() => {
              fetchDealerData()
            }, 2000)
          } catch (error) {
            console.error('Error activating badge:', error)
            setError('Payment successful but failed to activate badge. Please contact support.')
            setProcessing(false)
          }
        },
        onClose: () => {
          setProcessing(false)
        }
      })
    } catch (error) {
      console.error('Payment error:', error)
      setError('Failed to initiate payment. Please try again.')
      setProcessing(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!currentBadge) return

    if (!confirm('Are you sure you want to cancel your badge subscription?')) {
      return
    }

    try {
      await supabase
        .from('dealer_badges')
        .update({
          auto_renew: false
        })
        .eq('id', currentBadge.id)

      setSuccess('Auto-renewal disabled. Your badge will expire on ' + new Date(currentBadge.end_date).toLocaleDateString())
      fetchDealerData()
    } catch (error) {
      console.error('Error canceling subscription:', error)
      setError('Failed to cancel subscription')
    }
  }

  const badgeTiers = [
    {
      type: 'verified',
      icon: Shield,
      name: 'Verified Dealer',
      price: 0,
      priceText: 'FREE',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      features: [
        'Verified badge on listings',
        'Basic dealer profile',
        'Standard listing visibility',
        'Customer chat access',
        'Email support'
      ],
      cta: 'Contact Admin'
    },
    {
      type: 'premium',
      icon: Award,
      name: 'Premium Dealer',
      price: BADGE_PRICING.premium.price,
      priceText: `${formatNaira(BADGE_PRICING.premium.price)}/month`,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      popular: true,
      features: [
        'Premium dealer badge',
        'Enhanced profile page',
        '2x listing visibility',
        'Priority in search results',
        'Featured dealer section',
        'Priority customer support',
        'Monthly analytics report',
        'Verified + Premium badges'
      ],
      cta: 'Upgrade to Premium'
    },
    {
      type: 'luxury',
      icon: Crown,
      name: 'Luxury Dealer',
      price: BADGE_PRICING.luxury.price,
      priceText: `${formatNaira(BADGE_PRICING.luxury.price)}/month`,
      color: 'gold',
      gradient: 'from-yellow-500 to-orange-500',
      features: [
        'Luxury dealer badge with crown',
        'Exclusive luxury profile',
        '5x listing visibility',
        'Top search placement',
        'Luxury collection showcase',
        'Dedicated account manager',
        'Advanced analytics dashboard',
        'Featured in luxury portal',
        'Priority escrow processing',
        'Exclusive marketing support'
      ],
      cta: 'Upgrade to Luxury'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold text-white mb-4">
            Dealer Verification Badges
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Boost your credibility and visibility with verified dealer badges
          </p>

          {/* Current Badge Status */}
          {currentBadge && (
            <div className="inline-block bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-center gap-4 mb-3">
                <span className="text-white text-lg">Your Current Badge:</span>
                <DealerBadge badgeType={currentBadge.badge_type} size="lg" />
              </div>
              <div className="text-sm text-blue-100">
                Valid until: {new Date(currentBadge.end_date).toLocaleDateString()}
              </div>
              <div className="text-xs text-blue-200 mt-1">
                Auto-renewal: {currentBadge.auto_renew ? '✓ Enabled' : '✗ Disabled'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 flex items-center gap-3 text-red-300">
            <AlertCircle size={24} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 flex items-center gap-3 text-green-300">
            <CheckCircle size={24} />
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {badgeTiers.map((tier) => {
            const IconComponent = tier.icon
            const isCurrentBadge = currentBadge?.badge_type === tier.type

            return (
              <div
                key={tier.type}
                className={`relative bg-white/5 backdrop-blur-md rounded-3xl p-8 border ${
                  tier.popular
                    ? 'border-purple-500 shadow-2xl shadow-purple-500/30 scale-105'
                    : 'border-white/10'
                } transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
              >
                {/* Popular Badge */}
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-1.5 rounded-full text-sm font-bold shadow-lg">
                      <Star className="inline mr-1" size={14} />
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Current Badge Indicator */}
                {isCurrentBadge && (
                  <div className="absolute -top-4 right-4">
                    <div className="bg-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <CheckCircle size={14} />
                      ACTIVE
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${tier.gradient} mb-6`}>
                  <IconComponent size={40} className="text-white" />
                </div>

                {/* Name */}
                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>

                {/* Price */}
                <div className="mb-6">
                  <div className="text-4xl font-extrabold bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent">
                    {tier.priceText}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-300">
                      <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => {
                    if (tier.type === 'verified') {
                      alert('Please contact admin@justcars.ng for free verification')
                    } else {
                      handlePurchaseBadge(tier.type)
                    }
                  }}
                  disabled={processing || isCurrentBadge}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                    isCurrentBadge
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : tier.type === 'verified'
                      ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                      : `bg-gradient-to-r ${tier.gradient} text-white shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95`
                  }`}
                >
                  {isCurrentBadge ? 'Current Plan' : processing ? 'Processing...' : tier.cta}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white/5 backdrop-blur-md py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Why Get Verified?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex p-4 rounded-2xl bg-blue-500/20 mb-4">
                <TrendingUp size={40} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Increased Visibility</h3>
              <p className="text-gray-300">
                Premium and Luxury badges get priority placement in search results and featured sections
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex p-4 rounded-2xl bg-purple-500/20 mb-4">
                <Users size={40} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Build Trust</h3>
              <p className="text-gray-300">
                Verified badges show buyers you're a legitimate, trusted dealer
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex p-4 rounded-2xl bg-yellow-500/20 mb-4">
                <Zap size={40} className="text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Faster Sales</h3>
              <p className="text-gray-300">
                Premium features help you close deals faster with serious, verified buyers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Info size={20} className="text-blue-400" />
              How do I get the free Verified badge?
            </h3>
            <p className="text-gray-300">
              Contact our admin team at admin@justcars.ng with your business registration documents. Verification typically takes 24-48 hours.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Info size={20} className="text-blue-400" />
              Can I cancel my subscription?
            </h3>
            <p className="text-gray-300">
              Yes, you can disable auto-renewal at any time. Your badge will remain active until the end of your current billing period.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Info size={20} className="text-blue-400" />
              What happens if I don't renew?
            </h3>
            <p className="text-gray-300">
              Your badge will expire and your listings will revert to standard visibility. You can re-purchase anytime to restore your premium status.
            </p>
          </div>
        </div>
      </div>

      {/* Current Subscription Management */}
      {currentBadge && currentBadge.badge_type !== 'verified' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Calendar size={28} />
              Manage Your Subscription
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">Current Plan</div>
                <DealerBadge badgeType={currentBadge.badge_type} size="md" />
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Next Billing Date</div>
                <div className="text-white font-semibold">
                  {new Date(currentBadge.end_date).toLocaleDateString()}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Monthly Price</div>
                <div className="text-white font-semibold">
                  {formatNaira(currentBadge.monthly_price)}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Auto-Renewal</div>
                <div className="text-white font-semibold">
                  {currentBadge.auto_renew ? '✓ Enabled' : '✗ Disabled'}
                </div>
              </div>
            </div>

            {currentBadge.auto_renew && (
              <button
                onClick={handleCancelSubscription}
                className="px-6 py-3 bg-red-500/20 border border-red-500 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-300"
              >
                Disable Auto-Renewal
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
