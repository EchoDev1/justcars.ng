/**
 * Dealer Escrow Transactions Page
 * View all escrow transactions for dealer's cars
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Shield, CheckCircle, Clock, AlertCircle, Car, DollarSign, User, Phone, Mail } from 'lucide-react'
import { formatCurrency } from '@/lib/payments'
import Loading from '@/components/ui/Loading'

export default function DealerEscrowTransactionsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [dealer, setDealer] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    setLoading(true)

    // Add timeout for API call
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/dealer/auth')
        return
      }

      // Get dealer data
      const { data: dealerData } = await supabase
        .from('dealers')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!dealerData) {
        router.push('/dealer/auth')
        return
      }

      setDealer(dealerData)

      // Get all escrow transactions for dealer's cars
      const { data: transactionsData, error } = await supabase
        .from('escrow_transactions')
        .select(`
          *,
          cars (
            id,
            make,
            model,
            year,
            trim,
            price,
            car_images (image_url, is_primary)
          ),
          buyers (
            id,
            full_name,
            phone,
            email,
            verification_status
          )
        `)
        .eq('dealer_id', user.id)
        .order('created_at', { ascending: false })

      clearTimeout(timeoutId)

      if (error) throw error

      setTransactions(transactionsData || [])
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Error loading transactions:', error)
      if (error.name === 'AbortError') {
        alert('Request timed out. Please try again.')
      } else {
        alert('Failed to load transactions. Please try again.')
      }
    } finally {
      // CRITICAL FIX: Always reset loading state
      setLoading(false)
    }
  }

  const getStatusInfo = (status) => {
    const statusMap = {
      initiated: {
        icon: Clock,
        color: 'blue',
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        label: 'Awaiting Payment',
        description: 'Buyer has initiated escrow but not yet funded'
      },
      funded: {
        icon: CheckCircle,
        color: 'green',
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'Payment Secured',
        description: 'Money is in escrow. Contact buyer to arrange viewing'
      },
      inspection_scheduled: {
        icon: Clock,
        color: 'purple',
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        label: 'Inspection Scheduled',
        description: 'Vehicle inspection is scheduled'
      },
      inspection_completed: {
        icon: CheckCircle,
        color: 'indigo',
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        label: 'Inspection Complete',
        description: 'Awaiting buyer approval'
      },
      approved: {
        icon: CheckCircle,
        color: 'emerald',
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        label: 'Buyer Approved',
        description: 'Payment will be released within 24 hours'
      },
      released: {
        icon: CheckCircle,
        color: 'green',
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'Payment Released',
        description: 'You have received payment'
      },
      rejected: {
        icon: AlertCircle,
        color: 'red',
        bg: 'bg-red-100',
        text: 'text-red-700',
        label: 'Buyer Rejected',
        description: 'Buyer declined purchase. Refund initiated'
      },
      refunded: {
        icon: CheckCircle,
        color: 'gray',
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        label: 'Refunded',
        description: 'Buyer has been refunded'
      },
      disputed: {
        icon: AlertCircle,
        color: 'orange',
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        label: 'Disputed',
        description: 'Transaction under admin review'
      },
      cancelled: {
        icon: AlertCircle,
        color: 'gray',
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        label: 'Cancelled',
        description: 'Transaction cancelled'
      }
    }

    return statusMap[status] || statusMap.initiated
  }

  const calculateEarnings = () => {
    const released = transactions.filter(t => t.escrow_status === 'released')
    return released.reduce((sum, t) => sum + parseFloat(t.car_price), 0)
  }

  const calculatePending = () => {
    const pending = transactions.filter(t => ['funded', 'inspection_scheduled', 'inspection_completed', 'approved'].includes(t.escrow_status))
    return pending.reduce((sum, t) => sum + parseFloat(t.car_price), 0)
  }

  const filteredTransactions = filterStatus === 'all'
    ? transactions
    : transactions.filter(t => t.escrow_status === filterStatus)

  if (loading) {
    return <Loading text="Loading transactions..." />
  }

  const primaryImage = (transaction) => {
    return transaction.cars?.car_images?.find(img => img.is_primary)?.image_url ||
           transaction.cars?.car_images?.[0]?.image_url
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mr-4">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Escrow Transactions</h1>
              <p className="text-gray-600">Manage your secure sales</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
              <p className="text-green-100 mb-1">Total Earnings</p>
              <p className="text-3xl font-bold">{formatCurrency(calculateEarnings())}</p>
              <p className="text-sm text-green-100 mt-2">From completed sales</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 text-white">
              <p className="text-blue-100 mb-1">Pending Payments</p>
              <p className="text-3xl font-bold">{formatCurrency(calculatePending())}</p>
              <p className="text-sm text-blue-100 mt-2">Awaiting buyer approval</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
              <p className="text-purple-100 mb-1">Active Transactions</p>
              <p className="text-3xl font-bold">{transactions.filter(t => ['funded', 'inspection_scheduled', 'inspection_completed'].includes(t.escrow_status)).length}</p>
              <p className="text-sm text-purple-100 mt-2">In progress</p>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 overflow-x-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                  filterStatus === 'all'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({transactions.length})
              </button>
              <button
                onClick={() => setFilterStatus('funded')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                  filterStatus === 'funded'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Active ({transactions.filter(t => t.escrow_status === 'funded').length})
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                  filterStatus === 'approved'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Approved ({transactions.filter(t => t.escrow_status === 'approved').length})
              </button>
              <button
                onClick={() => setFilterStatus('released')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                  filterStatus === 'released'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Completed ({transactions.filter(t => t.escrow_status === 'released').length})
              </button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Shield className="mx-auto mb-4 text-gray-400" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {filterStatus === 'all' ? 'No Escrow Transactions' : 'No Transactions in This Category'}
            </h2>
            <p className="text-gray-600">
              {filterStatus === 'all'
                ? 'When buyers use escrow to purchase your cars, transactions will appear here.'
                : 'Try selecting a different filter to view other transactions.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTransactions.map((transaction) => {
              const statusInfo = getStatusInfo(transaction.escrow_status)
              const StatusIcon = statusInfo.icon

              return (
                <div key={transaction.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full ${statusInfo.bg}`}>
                        <StatusIcon className={statusInfo.text} size={16} />
                        <span className={`ml-2 font-semibold text-sm ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    {/* Status Description */}
                    <p className="text-sm text-gray-600 mb-4">{statusInfo.description}</p>

                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Car Image and Info */}
                      <div className="md:col-span-1">
                        {primaryImage(transaction) && (
                          <img
                            src={primaryImage(transaction)}
                            alt={`${transaction.cars.year} ${transaction.cars.make} ${transaction.cars.model}`}
                            className="w-full h-40 object-cover rounded-lg mb-3"
                          />
                        )}
                        <h3 className="text-lg font-bold text-gray-900">
                          {transaction.cars.year} {transaction.cars.make} {transaction.cars.model}
                        </h3>
                        <p className="text-gray-600">{transaction.cars.trim}</p>
                      </div>

                      {/* Buyer Information */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <User className="mr-2 text-blue-500" size={16} />
                          Buyer Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-900 font-semibold">{transaction.buyers.full_name}</p>
                          <p className="text-gray-600 flex items-center">
                            <Phone className="mr-2" size={14} />
                            {transaction.buyers.phone}
                          </p>
                          <p className="text-gray-600 flex items-center">
                            <Mail className="mr-2" size={14} />
                            {transaction.buyers.email}
                          </p>
                          <div className="pt-2">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              transaction.buyers.verification_status === 'verified'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {transaction.buyers.verification_status === 'verified' ? '✓ Verified Buyer' : 'Pending Verification'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <DollarSign className="mr-2 text-green-600" size={16} />
                          Payment Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Car Price</span>
                            <span className="font-semibold">{formatCurrency(transaction.car_price)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Escrow Fee (1.5%)</span>
                            <span>{formatCurrency(transaction.escrow_fee)}</span>
                          </div>
                          <div className="border-t border-green-200 pt-2 flex justify-between">
                            <span className="font-bold text-gray-900">You'll Receive</span>
                            <span className="font-bold text-green-600 text-lg">{formatCurrency(transaction.car_price)}</span>
                          </div>

                          {transaction.escrow_status === 'approved' && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <p className="text-xs text-green-700">
                                <CheckCircle className="inline mr-1" size={12} />
                                Payment releasing soon
                              </p>
                            </div>
                          )}

                          {transaction.escrow_status === 'released' && transaction.released_at && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <p className="text-xs text-green-700">
                                <CheckCircle className="inline mr-1" size={12} />
                                Released on {new Date(transaction.released_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inspection Info */}
                    {transaction.wants_inspection && (
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-800">
                          <strong>Inspection Requested:</strong> The buyer wants a professional inspection before approval.
                        </p>
                      </div>
                    )}

                    {/* Rejection Info */}
                    {transaction.escrow_status === 'rejected' && transaction.rejection_reason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                          <strong>Rejection Reason:</strong> {transaction.rejection_reason}
                        </p>
                      </div>
                    )}

                    {/* Action Items */}
                    {transaction.escrow_status === 'funded' && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-semibold mb-2">Action Required:</p>
                        <p className="text-sm text-blue-700">
                          Contact the buyer to arrange a viewing. Their payment is secured in escrow.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
