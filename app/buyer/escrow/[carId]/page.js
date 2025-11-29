/**
 * Buyer Escrow Initiation Page
 * Step 1: Initiate escrow transaction
 * Step 2: Choose payment method and fund escrow
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Shield, Car, User, DollarSign, CreditCard, Building, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { calculateEscrowFee, formatCurrency, openPaymentModal } from '@/lib/payments'
import Loading from '@/components/ui/Loading'

export default function EscrowInitiationPage({ params }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1) // 1: Review, 2: Payment Method, 3: Funding, 4: Success
  const [car, setCar] = useState(null)
  const [dealer, setDealer] = useState(null)
  const [buyer, setBuyer] = useState(null)
  const [escrowTransaction, setEscrowTransaction] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('') // 'online' or 'bank_transfer'
  const [wantsInspection, setWantsInspection] = useState(false)
  const [virtualAccount, setVirtualAccount] = useState(null)

  const carPrice = car?.price || 0
  const escrowFee = calculateEscrowFee(carPrice)
  const totalAmount = carPrice + escrowFee

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push(`/buyer/auth?carId=${params.carId}&action=escrow`)
        return
      }

      // Get buyer data
      const { data: buyerData } = await supabase
        .from('buyers')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!buyerData || buyerData.verification_status !== 'verified') {
        alert('You must be a verified buyer to use escrow services.')
        router.push('/buyer/verify')
        return
      }

      setBuyer(buyerData)

      // Get car data
      const { data: carData, error: carError } = await supabase
        .from('cars')
        .select(`
          *,
          dealers (
            id,
            name,
            email,
            phone,
            badge_type
          ),
          car_images (image_url, is_primary)
        `)
        .eq('id', params.carId)
        .single()

      if (carError || !carData) {
        alert('Car not found.')
        router.push('/cars')
        return
      }

      if (carData.status !== 'available') {
        alert('This car is no longer available.')
        router.push('/cars')
        return
      }

      setCar(carData)
      setDealer(carData.dealers)

      // Check for existing escrow transaction
      const { data: existingEscrow } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('car_id', params.carId)
        .eq('buyer_id', user.id)
        .in('escrow_status', ['initiated', 'funded', 'inspection_scheduled', 'inspection_completed'])
        .single()

      if (existingEscrow) {
        setEscrowTransaction(existingEscrow)

        // Determine current step based on escrow status
        if (existingEscrow.escrow_status === 'initiated') {
          setStep(2) // Go to payment method selection
        } else if (existingEscrow.escrow_status === 'funded') {
          setStep(4) // Already funded, show success
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Failed to load escrow data. Please try again.')
      setLoading(false)
    }
  }

  const handleInitiateEscrow = async () => {
    try {
      setSubmitting(true)

      const { data, error } = await supabase
        .from('escrow_transactions')
        .insert({
          buyer_id: buyer.id,
          dealer_id: dealer.id,
          car_id: car.id,
          car_price: carPrice,
          escrow_fee: escrowFee,
          total_amount: totalAmount,
          escrow_status: 'initiated',
          wants_inspection: wantsInspection,
          payment_method: null // Will be set in next step
        })
        .select()
        .single()

      if (error) throw error

      setEscrowTransaction(data)
      setStep(2) // Move to payment method selection

      setSubmitting(false)
    } catch (error) {
      console.error('Error initiating escrow:', error)
      alert('Failed to initiate escrow. Please try again.')
      setSubmitting(false)
    }
  }

  const handleSelectPaymentMethod = async (method) => {
    try {
      setSubmitting(true)
      setPaymentMethod(method)

      // Update escrow transaction with payment method
      const { error } = await supabase
        .from('escrow_transactions')
        .update({ payment_method: method })
        .eq('id', escrowTransaction.id)

      if (error) throw error

      if (method === 'online') {
        // Proceed to online payment
        handleOnlinePayment()
      } else if (method === 'bank_transfer') {
        // Generate virtual account
        await handleGenerateVirtualAccount()
      }

      setSubmitting(false)
    } catch (error) {
      console.error('Error selecting payment method:', error)
      alert('Failed to select payment method. Please try again.')
      setSubmitting(false)
    }
  }

  const handleOnlinePayment = () => {
    openPaymentModal({
      email: buyer.email,
      amount: totalAmount,
      reference: `ESCROW_${escrowTransaction.id}`,
      metadata: {
        transaction_type: 'escrow',
        escrow_id: escrowTransaction.id,
        car_id: car.id,
        buyer_id: buyer.id
      },
      onSuccess: async (response) => {
        // Update escrow transaction status
        await supabase
          .from('escrow_transactions')
          .update({
            escrow_status: 'funded',
            payment_reference: response.reference,
            funded_at: new Date().toISOString()
          })
          .eq('id', escrowTransaction.id)

        // Log payment transaction
        await supabase
          .from('payment_transactions')
          .insert({
            reference: response.reference,
            transaction_type: 'escrow',
            amount: totalAmount,
            user_id: buyer.id,
            status: 'completed',
            payment_gateway: response.gateway || 'paystack',
            metadata: {
              escrow_id: escrowTransaction.id,
              car_id: car.id
            }
          })

        setStep(4) // Move to success step
      },
      onClose: () => {
        console.log('Payment modal closed')
      }
    })
  }

  const handleGenerateVirtualAccount = async () => {
    try {
      // In production, this would call Paystack/Flutterwave API to create virtual account
      // For now, we'll simulate it
      const mockVirtualAccount = {
        account_number: '9876543210',
        bank_name: 'Wema Bank',
        account_name: `JustCars Escrow - ${escrowTransaction.id.substring(0, 8)}`
      }

      setVirtualAccount(mockVirtualAccount)

      // Update escrow with virtual account details
      await supabase
        .from('escrow_transactions')
        .update({
          virtual_account_number: mockVirtualAccount.account_number,
          virtual_account_bank: mockVirtualAccount.bank_name,
          virtual_account_name: mockVirtualAccount.account_name
        })
        .eq('id', escrowTransaction.id)

      setStep(3) // Move to bank transfer instructions
    } catch (error) {
      console.error('Error generating virtual account:', error)
      alert('Failed to generate virtual account. Please try again.')
    }
  }

  if (loading) {
    return <Loading text="Loading escrow details..." />
  }

  if (!car || !dealer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <p className="text-gray-600">Car not found</p>
        </div>
      </div>
    )
  }

  const primaryImage = car.car_images?.find(img => img.is_primary)?.image_url || car.car_images?.[0]?.image_url

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Buy with Escrow Protection</h1>
          <p className="text-gray-600">Secure payment process with fraud protection</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[
              { num: 1, label: 'Review' },
              { num: 2, label: 'Payment Method' },
              { num: 3, label: 'Fund Escrow' },
              { num: 4, label: 'Complete' }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= s.num ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  {step > s.num ? <CheckCircle size={20} /> : s.num}
                </div>
                <span className={`ml-2 text-sm ${step >= s.num ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                  {s.label}
                </span>
                {idx < 3 && <div className={`w-12 h-0.5 mx-2 ${step > s.num ? 'bg-green-500' : 'bg-gray-300'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Review Transaction */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Transaction Details</h2>

            {/* Car Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Car className="mr-2 text-blue-500" size={20} />
                Vehicle Details
              </h3>
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                {primaryImage && (
                  <img
                    src={primaryImage}
                    alt={`${car.year} ${car.make} ${car.model}`}
                    className="w-32 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900">
                    {car.year} {car.make} {car.model}
                  </h4>
                  <p className="text-gray-600">{car.trim}</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {formatCurrency(car.price)}
                  </p>
                </div>
              </div>
            </div>

            {/* Dealer Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="mr-2 text-purple-500" size={20} />
                Seller Information
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900">{dealer.name}</p>
                <p className="text-gray-600">{dealer.phone}</p>
                <p className="text-gray-600">{dealer.email}</p>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="mr-2 text-green-500" size={20} />
                Cost Breakdown
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Car Price</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(carPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Escrow Fee (1.5%)</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(escrowFee)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Inspection Option */}
            <div className="mb-8">
              <label className="flex items-start space-x-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                <input
                  type="checkbox"
                  checked={wantsInspection}
                  onChange={(e) => setWantsInspection(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-gray-900">Request Vehicle Inspection</p>
                  <p className="text-sm text-gray-600">
                    We'll arrange a professional inspection before you approve the purchase.
                    Inspection fee applies (paid separately).
                  </p>
                </div>
              </label>
            </div>

            {/* How Escrow Works */}
            <div className="mb-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h3 className="font-bold text-gray-900 mb-4">How Escrow Protection Works</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="font-bold text-green-600 mr-2">1.</span>
                  <span>You fund the escrow account - money is held securely</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-green-600 mr-2">2.</span>
                  <span>Seller is notified that payment is secured</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-green-600 mr-2">3.</span>
                  <span>You inspect the vehicle (optional but recommended)</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-green-600 mr-2">4.</span>
                  <span>You approve the car - money is released to seller</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-green-600 mr-2">5.</span>
                  <span>If car doesn't match description, you can reject and get refunded</span>
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleInitiateEscrow}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 font-semibold disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Continue to Payment'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Payment Method */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Payment Method</h2>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Online Payment */}
              <button
                onClick={() => handleSelectPaymentMethod('online')}
                disabled={submitting}
                className="p-6 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <CreditCard className="text-green-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Pay Online</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Pay instantly with card, bank transfer, or USSD
                </p>
                <div className="flex items-center text-green-600 font-semibold">
                  <span>Instant confirmation</span>
                  <CheckCircle className="ml-2" size={16} />
                </div>
              </button>

              {/* Bank Transfer */}
              <button
                onClick={() => handleSelectPaymentMethod('bank_transfer')}
                disabled={submitting}
                className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <Building className="text-blue-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Bank Transfer</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Transfer to dedicated virtual account
                </p>
                <div className="flex items-center text-blue-600 font-semibold">
                  <span>Confirmed within 24 hours</span>
                  <Clock className="ml-2" size={16} />
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: Bank Transfer Instructions */}
        {step === 3 && virtualAccount && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Bank Transfer Instructions</h2>

            <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
              <p className="text-sm text-gray-600 mb-4">Transfer the exact amount to this dedicated account:</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500">Account Number</label>
                  <p className="text-2xl font-bold text-gray-900">{virtualAccount.account_number}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Bank Name</label>
                  <p className="text-lg font-semibold text-gray-900">{virtualAccount.bank_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Account Name</label>
                  <p className="text-lg font-semibold text-gray-900">{virtualAccount.account_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Amount to Transfer</label>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </div>

            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Important:</strong> Your escrow will be confirmed within 24 hours of payment.
                You'll receive an email notification when the funds are verified.
              </p>
            </div>

            <button
              onClick={() => router.push('/buyer/escrow/transactions')}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 font-semibold"
            >
              Go to My Transactions
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-green-100 rounded-full mb-6">
              <CheckCircle className="text-green-600" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Escrow Funded Successfully!</h2>
            <p className="text-gray-600 mb-8">
              Your payment has been secured. The seller has been notified and will arrange for you to view the car.
            </p>

            <div className="mb-8 p-6 bg-gray-50 rounded-lg text-left">
              <h3 className="font-bold text-gray-900 mb-4">Next Steps:</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="font-bold text-green-600 mr-2">1.</span>
                  <span>The seller will contact you to schedule a viewing</span>
                </li>
                {wantsInspection && (
                  <li className="flex items-start">
                    <span className="font-bold text-green-600 mr-2">2.</span>
                    <span>We'll arrange a professional vehicle inspection</span>
                  </li>
                )}
                <li className="flex items-start">
                  <span className="font-bold text-green-600 mr-2">{wantsInspection ? '3' : '2'}.</span>
                  <span>Inspect the vehicle thoroughly</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-green-600 mr-2">{wantsInspection ? '4' : '3'}.</span>
                  <span>Approve or reject the car from your escrow dashboard</span>
                </li>
              </ol>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/buyer/escrow/transactions')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 font-semibold"
              >
                View Transaction
              </button>
              <button
                onClick={() => router.push('/cars')}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Browse More Cars
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
