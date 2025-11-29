/**
 * Buyer Inspections Page
 * Request and view vehicle inspections
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Calendar, CheckCircle, Clock, AlertCircle, Download, Eye } from 'lucide-react'
import { formatCurrency } from '@/lib/payments'
import Loading from '@/components/ui/Loading'

export default function BuyerInspectionsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [inspections, setInspections] = useState([])
  const [escrowTransactions, setEscrowTransactions] = useState([])
  const [buyer, setBuyer] = useState(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedEscrow, setSelectedEscrow] = useState('')
  const [inspectionDate, setInspectionDate] = useState('')
  const [inspectionLocation, setInspectionLocation] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const INSPECTION_FEE = 15000 // ₦15,000

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
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

      // Get all inspections
      const { data: inspectionsData, error: inspError } = await supabase
        .from('inspections')
        .select(`
          *,
          escrow_transactions (
            id,
            car_id,
            cars (
              id,
              make,
              model,
              year,
              trim,
              car_images (image_url, is_primary)
            )
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (inspError) throw inspError

      setInspections(inspectionsData || [])

      // Get escrow transactions that can have inspections
      const { data: escrowData } = await supabase
        .from('escrow_transactions')
        .select(`
          *,
          cars (
            id,
            make,
            model,
            year,
            trim
          )
        `)
        .eq('buyer_id', user.id)
        .eq('wants_inspection', true)
        .in('escrow_status', ['funded', 'inspection_scheduled', 'inspection_completed'])

      setEscrowTransactions(escrowData || [])

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Failed to load inspections. Please try again.')
      setLoading(false)
    }
  }

  const handleRequestInspection = async () => {
    try {
      setSubmitting(true)

      // Create inspection request
      const { data, error } = await supabase
        .from('inspections')
        .insert({
          escrow_transaction_id: selectedEscrow,
          buyer_id: buyer.id,
          scheduled_date: inspectionDate,
          location: inspectionLocation,
          special_requests: specialRequests,
          inspection_status: 'pending',
          inspection_fee: INSPECTION_FEE
        })
        .select()
        .single()

      if (error) throw error

      // Update escrow transaction status
      await supabase
        .from('escrow_transactions')
        .update({ escrow_status: 'inspection_scheduled' })
        .eq('id', selectedEscrow)

      // Reload data
      await loadData()

      setShowRequestModal(false)
      setSelectedEscrow('')
      setInspectionDate('')
      setInspectionLocation('')
      setSpecialRequests('')
      setSubmitting(false)

      alert('Inspection request submitted! You will be contacted to confirm the appointment.')
    } catch (error) {
      console.error('Error requesting inspection:', error)
      alert('Failed to request inspection. Please try again.')
      setSubmitting(false)
    }
  }

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: {
        icon: Clock,
        color: 'blue',
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        label: 'Pending'
      },
      scheduled: {
        icon: Calendar,
        color: 'purple',
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        label: 'Scheduled'
      },
      in_progress: {
        icon: ClipboardCheck,
        color: 'indigo',
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        label: 'In Progress'
      },
      completed: {
        icon: CheckCircle,
        color: 'green',
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'Completed'
      },
      cancelled: {
        icon: AlertCircle,
        color: 'red',
        bg: 'bg-red-100',
        text: 'text-red-700',
        label: 'Cancelled'
      }
    }

    return statusMap[status] || statusMap.pending
  }

  if (loading) {
    return <Loading text="Loading inspections..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full mr-4">
                <ClipboardCheck className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Vehicle Inspections</h1>
                <p className="text-gray-600">Professional vehicle inspection service</p>
              </div>
            </div>

            {escrowTransactions.length > 0 && (
              <button
                onClick={() => setShowRequestModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 font-semibold"
              >
                Request Inspection
              </button>
            )}
          </div>

          {/* Info Banner */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200 mb-6">
            <h3 className="font-bold text-gray-900 mb-3">Why Get a Professional Inspection?</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="text-green-600 mr-2 mt-0.5" size={16} />
                <span>Comprehensive 100+ point vehicle assessment</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="text-green-600 mr-2 mt-0.5" size={16} />
                <span>Certified mechanics check engine, transmission, suspension, and more</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="text-green-600 mr-2 mt-0.5" size={16} />
                <span>Detailed report with photos and recommendations</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="text-green-600 mr-2 mt-0.5" size={16} />
                <span>Make informed decisions before approving your escrow purchase</span>
              </li>
            </ul>
            <p className="text-purple-700 font-semibold mt-4">Inspection Fee: {formatCurrency(INSPECTION_FEE)}</p>
          </div>
        </div>

        {/* Inspections List */}
        {inspections.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <ClipboardCheck className="mx-auto mb-4 text-gray-400" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Inspections Yet</h2>
            <p className="text-gray-600 mb-6">
              {escrowTransactions.length > 0
                ? 'Request an inspection for your escrow purchase to ensure vehicle quality.'
                : 'Inspections are available for escrow transactions. Start an escrow purchase to request an inspection.'}
            </p>
            {escrowTransactions.length > 0 && (
              <button
                onClick={() => setShowRequestModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 font-semibold"
              >
                Request Inspection
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {inspections.map((inspection) => {
              const statusInfo = getStatusInfo(inspection.inspection_status)
              const StatusIcon = statusInfo.icon
              const car = inspection.escrow_transactions?.cars
              const primaryImage = car?.car_images?.find(img => img.is_primary)?.image_url ||
                                  car?.car_images?.[0]?.image_url

              return (
                <div key={inspection.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
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
                        Requested: {new Date(inspection.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Car Info */}
                      <div className="md:col-span-2">
                        <div className="flex items-start space-x-4">
                          {primaryImage && (
                            <img
                              src={primaryImage}
                              alt={`${car.year} ${car.make} ${car.model}`}
                              className="w-32 h-24 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                              {car?.year} {car?.make} {car?.model}
                            </h3>
                            <p className="text-gray-600 mb-3">{car?.trim}</p>

                            <div className="space-y-1 text-sm">
                              <p className="text-gray-700">
                                <strong>Scheduled Date:</strong>{' '}
                                {inspection.scheduled_date
                                  ? new Date(inspection.scheduled_date).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })
                                  : 'To be confirmed'}
                              </p>
                              <p className="text-gray-700">
                                <strong>Location:</strong> {inspection.location || 'To be confirmed'}
                              </p>
                              {inspection.inspector_name && (
                                <p className="text-gray-700">
                                  <strong>Inspector:</strong> {inspection.inspector_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inspection Details */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3">Inspection Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Fee</span>
                            <span className="font-semibold">{formatCurrency(inspection.inspection_fee)}</span>
                          </div>
                          {inspection.inspection_status === 'completed' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Score</span>
                                <span className={`font-bold ${
                                  inspection.overall_score >= 80 ? 'text-green-600' :
                                  inspection.overall_score >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {inspection.overall_score}/100
                                </span>
                              </div>
                              <div className="pt-2 border-t">
                                <p className="text-xs text-gray-500 mb-1">Completed</p>
                                <p className="text-sm font-semibold">
                                  {new Date(inspection.completed_at).toLocaleDateString()}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Special Requests */}
                    {inspection.special_requests && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Special Requests:</strong> {inspection.special_requests}
                        </p>
                      </div>
                    )}

                    {/* Report Summary */}
                    {inspection.inspection_status === 'completed' && inspection.report_summary && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">Report Summary</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{inspection.report_summary}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {inspection.inspection_status === 'completed' && (
                      <div className="mt-4 flex space-x-3">
                        {inspection.report_file_url && (
                          <a
                            href={inspection.report_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-semibold"
                          >
                            <Download className="mr-2" size={16} />
                            Download Full Report
                          </a>
                        )}
                        <button
                          onClick={() => router.push(`/buyer/inspections/${inspection.id}`)}
                          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-semibold"
                        >
                          <Eye className="mr-2" size={16} />
                          View Details
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Request Inspection Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Request Vehicle Inspection</h2>

            <div className="space-y-6">
              {/* Select Escrow Transaction */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Vehicle
                </label>
                <select
                  value={selectedEscrow}
                  onChange={(e) => setSelectedEscrow(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">-- Select a vehicle --</option>
                  {escrowTransactions.map((escrow) => (
                    <option key={escrow.id} value={escrow.id}>
                      {escrow.cars.year} {escrow.cars.make} {escrow.cars.model} - {formatCurrency(escrow.car_price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Inspection Date
                </label>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Inspection Location
                </label>
                <input
                  type="text"
                  value={inspectionLocation}
                  onChange={(e) => setInspectionLocation(e.target.value)}
                  placeholder="e.g., Dealer's location, your preferred mechanic, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Special Requests (Optional)
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any specific areas you want the inspector to focus on?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Fee Notice */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>Inspection Fee:</strong> {formatCurrency(INSPECTION_FEE)} (paid separately after confirmation)
                </p>
              </div>
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => {
                  setShowRequestModal(false)
                  setSelectedEscrow('')
                  setInspectionDate('')
                  setInspectionLocation('')
                  setSpecialRequests('')
                }}
                disabled={submitting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestInspection}
                disabled={submitting || !selectedEscrow || !inspectionDate || !inspectionLocation}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 font-semibold disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
