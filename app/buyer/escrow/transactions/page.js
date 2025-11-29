/**
 * Buyer Escrow Transactions Page
 * View and manage all escrow transactions
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Shield, CheckCircle, XCircle, Clock, AlertCircle, Car, DollarSign, Eye, ThumbsUp, ThumbsDown } from 'lucide-react'
import { formatCurrency } from '@/lib/payments'
import Loading from '@/components/ui/Loading'

export default function BuyerEscrowTransactionsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [buyer, setBuyer] = useState(null)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalAction, setApprovalAction] = useState('') // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/buyer/auth')
        return
      }

      // Get buyer data
      const { data: buyerData } = await supabase
        .from('buyers')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!buyerData) {
        router.push('/buyer/auth')
        return
      }

      setBuyer(buyerData)

      // Get all escrow transactions
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
          dealers (
            id,
            name,
            phone,
            email
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTransactions(transactionsData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error loading transactions:', error)
      alert('Failed to load transactions. Please try again.')
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
        label: 'Initiated'
      },
      funded: {
        icon: CheckCircle,
        color: 'green',
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'Funded'
      },
      inspection_scheduled: {
        icon: Clock,
        color: 'purple',
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        label: 'Inspection Scheduled'
      },
      inspection_completed: {
        icon: CheckCircle,
        color: 'indigo',
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        label: 'Inspection Done'
      },
      approved: {
        icon: ThumbsUp,
        color: 'green',
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'Approved'
      },
      released: {
        icon: CheckCircle,
        color: 'emerald',
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        label: 'Payment Released'
      },
      rejected: {
        icon: ThumbsDown,
        color: 'red',
        bg: 'bg-red-100',
        text: 'text-red-700',
        label: 'Rejected'
      },
      refunded: {
        icon: CheckCircle,
        color: 'gray',
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        label: 'Refunded'
      },
      disputed: {
        icon: AlertCircle,
        color: 'orange',
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        label: 'Disputed'
      },
      cancelled: {
        icon: XCircle,
        color: 'gray',
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        label: 'Cancelled'
      }
    }

    return statusMap[status] || statusMap.initiated
  }

  const handleApproveReject = (transaction, action) => {
    setSelectedTransaction(transaction)
    setApprovalAction(action)
    setShowApprovalModal(true)
    setRejectionReason('')
  }

  const submitApprovalDecision = async () => {
    try {
      setSubmitting(true)

      const newStatus = approvalAction === 'approve' ? 'approved' : 'rejected'

      const updateData = {
        escrow_status: newStatus,
        approved_at: approvalAction === 'approve' ? new Date().toISOString() : null,
        rejected_at: approvalAction === 'reject' ? new Date().toISOString() : null,
        rejection_reason: approvalAction === 'reject' ? rejectionReason : null
      }

      const { error } = await supabase
        .from('escrow_transactions')
        .update(updateData)
        .eq('id', selectedTransaction.id)

      if (error) throw error

      // Reload transactions
      await loadTransactions()

      setShowApprovalModal(false)
      setSelectedTransaction(null)
      setSubmitting(false)

      alert(approvalAction === 'approve'
        ? 'Transaction approved! The seller will receive payment within 24 hours.'
        : 'Transaction rejected. Refund will be processed within 3-5 business days.')
    } catch (error) {
      console.error('Error submitting decision:', error)
      alert('Failed to submit decision. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loading text="Loading transactions..." />
  }

  const primaryImage = (transaction) => {
    return transaction.cars?.car_images?.find(img => img.is_primary)?.image_url ||
           transaction.cars?.car_images?.[0]?.image_url
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mr-4">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Escrow Transactions</h1>
              <p className="text-gray-600">Manage your secure vehicle purchases</p>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Shield className="mx-auto mb-4 text-gray-400" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Escrow Transactions</h2>
            <p className="text-gray-600 mb-6">
              You haven't started any escrow transactions yet. Browse cars and use "Buy with Escrow" to get started.
            </p>
            <button
              onClick={() => router.push('/cars')}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 font-semibold"
            >
              Browse Cars
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {transactions.map((transaction) => {
              const statusInfo = getStatusInfo(transaction.escrow_status)
              const StatusIcon = statusInfo.icon
              const canApproveReject = ['funded', 'inspection_completed'].includes(transaction.escrow_status)

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

                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Car Image and Info */}
                      <div className="md:col-span-2">
                        <div className="flex items-start space-x-4">
                          {primaryImage(transaction) && (
                            <img
                              src={primaryImage(transaction)}
                              alt={`${transaction.cars.year} ${transaction.cars.make} ${transaction.cars.model}`}
                              className="w-32 h-24 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                              {transaction.cars.year} {transaction.cars.make} {transaction.cars.model}
                            </h3>
                            <p className="text-gray-600 mb-2">{transaction.cars.trim}</p>

                            <div className="space-y-1 text-sm">
                              <p className="text-gray-600">
                                <strong>Seller:</strong> {transaction.dealers.name}
                              </p>
                              <p className="text-gray-600">
                                <strong>Contact:</strong> {transaction.dealers.phone}
                              </p>
                              {transaction.wants_inspection && (
                                <p className="text-purple-600 font-semibold">
                                  ✓ Inspection Requested
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3">Payment Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Car Price</span>
                            <span className="font-semibold">{formatCurrency(transaction.car_price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Escrow Fee</span>
                            <span className="font-semibold">{formatCurrency(transaction.escrow_fee)}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="font-bold text-green-600">{formatCurrency(transaction.total_amount)}</span>
                          </div>
                        </div>

                        {transaction.payment_method && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-gray-500">Payment Method</p>
                            <p className="text-sm font-semibold capitalize">
                              {transaction.payment_method.replace('_', ' ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {canApproveReject && (
                      <div className="mt-6 pt-6 border-t">
                        <p className="text-sm text-gray-600 mb-4">
                          Have you inspected the vehicle? Make your decision:
                        </p>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => handleApproveReject(transaction, 'approve')}
                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 font-semibold"
                          >
                            <ThumbsUp size={20} />
                            <span>Approve Purchase</span>
                          </button>
                          <button
                            onClick={() => handleApproveReject(transaction, 'reject')}
                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-white border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 font-semibold"
                          >
                            <ThumbsDown size={20} />
                            <span>Reject & Refund</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Status Messages */}
                    {transaction.escrow_status === 'initiated' && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Next Step:</strong> Complete payment to activate escrow protection.
                        </p>
                      </div>
                    )}

                    {transaction.escrow_status === 'approved' && (
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>Approved!</strong> Payment will be released to the seller within 24 hours.
                        </p>
                      </div>
                    )}

                    {transaction.escrow_status === 'rejected' && transaction.rejection_reason && (
                      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                          <strong>Rejection Reason:</strong> {transaction.rejection_reason}
                        </p>
                        <p className="text-sm text-red-800 mt-2">
                          Your refund will be processed within 3-5 business days.
                        </p>
                      </div>
                    )}

                    {transaction.escrow_status === 'released' && (
                      <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-sm text-emerald-800">
                          <strong>Transaction Complete!</strong> Payment has been released to the seller. Enjoy your new car!
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

      {/* Approval/Rejection Modal */}
      {showApprovalModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {approvalAction === 'approve' ? 'Approve Purchase' : 'Reject & Request Refund'}
            </h2>

            {approvalAction === 'approve' ? (
              <div>
                <p className="text-gray-600 mb-6">
                  By approving this purchase, you confirm that:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 mb-6">
                  <li>You have inspected the vehicle</li>
                  <li>The car matches the description</li>
                  <li>You are satisfied with the condition</li>
                  <li>You authorize payment release to the seller</li>
                </ul>
                <p className="text-sm text-gray-600 mb-6">
                  The seller will receive {formatCurrency(selectedTransaction.car_price)} within 24 hours.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  Please provide a reason for rejecting this purchase:
                </p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Car condition doesn't match description, found mechanical issues, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
                  rows={4}
                  required
                />
                <p className="text-sm text-gray-600 mb-6">
                  Your refund of {formatCurrency(selectedTransaction.total_amount)} will be processed within 3-5 business days.
                </p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowApprovalModal(false)
                  setSelectedTransaction(null)
                }}
                disabled={submitting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitApprovalDecision}
                disabled={submitting || (approvalAction === 'reject' && !rejectionReason.trim())}
                className={`flex-1 px-6 py-3 text-white rounded-lg font-semibold disabled:opacity-50 ${
                  approvalAction === 'approve'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                }`}
              >
                {submitting ? 'Processing...' : approvalAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
