/**
 * Admin Inspections Dashboard
 * Manage all vehicle inspections
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Calendar, CheckCircle, Clock, AlertCircle, Upload, User, Car } from 'lucide-react'
import { formatCurrency } from '@/lib/payments'
import Loading from '@/components/ui/Loading'

export default function AdminInspectionsPage() {
  const router = useRouter()
  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [inspections, setInspections] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedInspection, setSelectedInspection] = useState(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateAction, setUpdateAction] = useState('') // 'assign', 'schedule', 'complete'
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [inspectorName, setInspectorName] = useState('')
  const [inspectorPhone, setInspectorPhone] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [overallScore, setOverallScore] = useState('')
  const [reportSummary, setReportSummary] = useState('')
  const [uploadingReport, setUploadingReport] = useState(false)
  const [uploadedReportUrl, setUploadedReportUrl] = useState('')

  // Memoize loadInspections function to prevent recreation
  const loadInspections = useCallback(async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/admin/auth')
        return
      }

      // Get all inspections
      const { data: inspectionsData, error } = await supabase
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
              price
            )
          ),
          buyers (
            id,
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setInspections(inspectionsData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error loading inspections:', error)
      alert('Failed to load inspections. Please try again.')
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    loadInspections()
  }, [loadInspections])

  // Memoize getStatusInfo function
  const getStatusInfo = useCallback((status) => {
    const statusMap = {
      pending: { color: 'blue', label: 'Pending Assignment', icon: Clock },
      scheduled: { color: 'purple', label: 'Scheduled', icon: Calendar },
      in_progress: { color: 'indigo', label: 'In Progress', icon: ClipboardCheck },
      completed: { color: 'green', label: 'Completed', icon: CheckCircle },
      cancelled: { color: 'red', label: 'Cancelled', icon: AlertCircle }
    }
    return statusMap[status] || statusMap.pending
  }, [])

  // Memoize calculated stats to prevent recalculation on every render
  const stats = useMemo(() => {
    const pending = inspections.filter(i => i.inspection_status === 'pending').length
    const scheduled = inspections.filter(i => i.inspection_status === 'scheduled').length
    const completed = inspections.filter(i => i.inspection_status === 'completed').length
    const totalRevenue = inspections.filter(i => i.inspection_status === 'completed').reduce((sum, i) => sum + parseFloat(i.inspection_fee || 0), 0)

    return { pending, scheduled, completed, totalRevenue }
  }, [inspections])

  // Memoize handleUpdateInspection function
  const handleUpdateInspection = useCallback((inspection, action) => {
    setSelectedInspection(inspection)
    setUpdateAction(action)
    setShowUpdateModal(true)

    // Pre-fill form if updating
    if (action === 'assign') {
      setInspectorName(inspection.inspector_name || '')
      setInspectorPhone(inspection.inspector_phone || '')
      setScheduledDate(inspection.scheduled_date ? inspection.scheduled_date.split('T')[0] : '')
    } else if (action === 'complete') {
      setOverallScore(inspection.overall_score?.toString() || '')
      setReportSummary(inspection.report_summary || '')
      setUploadedReportUrl(inspection.report_file_url || '')
    }
  }, [])

  // Memoize handleReportUpload function
  const handleReportUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingReport(true)

      const fileExt = file.name.split('.').pop()
      const fileName = `${selectedInspection.id}_report_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { data, error } = await supabase.storage
        .from('inspection-reports')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('inspection-reports')
        .getPublicUrl(filePath)

      setUploadedReportUrl(publicUrl)
      setUploadingReport(false)
    } catch (error) {
      console.error('Error uploading report:', error)
      alert('Failed to upload report. Please try again.')
      setUploadingReport(false)
    }
  }, [selectedInspection, supabase])

  // Memoize resetForm function
  const resetForm = useCallback(() => {
    setInspectorName('')
    setInspectorPhone('')
    setScheduledDate('')
    setOverallScore('')
    setReportSummary('')
    setUploadedReportUrl('')
  }, [])

  // Memoize submitUpdate function
  const submitUpdate = useCallback(async () => {
    try {
      setSubmitting(true)

      let updateData = {}

      if (updateAction === 'assign') {
        updateData = {
          inspector_name: inspectorName,
          inspector_phone: inspectorPhone,
          scheduled_date: scheduledDate,
          inspection_status: 'scheduled'
        }
      } else if (updateAction === 'start') {
        updateData = {
          inspection_status: 'in_progress',
          started_at: new Date().toISOString()
        }
      } else if (updateAction === 'complete') {
        updateData = {
          inspection_status: 'completed',
          overall_score: parseInt(overallScore),
          report_summary: reportSummary,
          report_file_url: uploadedReportUrl,
          completed_at: new Date().toISOString()
        }

        // Also update escrow transaction status
        await supabase
          .from('escrow_transactions')
          .update({ escrow_status: 'inspection_completed' })
          .eq('id', selectedInspection.escrow_transaction_id)
      } else if (updateAction === 'cancel') {
        updateData = {
          inspection_status: 'cancelled',
          cancelled_at: new Date().toISOString()
        }
      }

      const { error } = await supabase
        .from('inspections')
        .update(updateData)
        .eq('id', selectedInspection.id)

      if (error) throw error

      await loadInspections()

      setShowUpdateModal(false)
      setSelectedInspection(null)
      resetForm()
      setSubmitting(false)

      alert('Inspection updated successfully!')
    } catch (error) {
      console.error('Error updating inspection:', error)
      alert('Failed to update inspection. Please try again.')
      setSubmitting(false)
    }
  }, [supabase, selectedInspection, updateAction, inspectorName, inspectorPhone, scheduledDate, overallScore, reportSummary, uploadedReportUrl, loadInspections, resetForm])

  // Memoize filtered inspections to prevent recalculation
  const filteredInspections = useMemo(() => filterStatus === 'all'
    ? inspections
    : inspections.filter(i => i.inspection_status === filterStatus),
  [filterStatus, inspections])

  if (loading) {
    return <Loading text="Loading inspections..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full mr-4">
              <ClipboardCheck className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inspection Management</h1>
              <p className="text-gray-600">Manage all vehicle inspections</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Pending</p>
                <Clock className="text-blue-500" size={20} />
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting assignment</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Scheduled</p>
                <Calendar className="text-purple-500" size={20} />
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.scheduled}</p>
              <p className="text-xs text-gray-500 mt-1">Appointments set</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Completed</p>
                <CheckCircle className="text-green-500" size={20} />
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-gray-500 mt-1">Reports submitted</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Revenue</p>
                <CheckCircle className="text-green-500" size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-xs text-gray-500 mt-1">From inspections</p>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 overflow-x-auto">
              {['all', 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                    filterStatus === status
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  ({status === 'all' ? inspections.length : inspections.filter(i => i.inspection_status === status).length})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inspections List */}
        {filteredInspections.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <ClipboardCheck className="mx-auto mb-4 text-gray-400" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Inspections Found</h2>
            <p className="text-gray-600">No inspections match the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredInspections.map((inspection) => {
              const statusInfo = getStatusInfo(inspection.inspection_status)
              const StatusIcon = statusInfo.icon
              const car = inspection.escrow_transactions?.cars

              return (
                <div key={inspection.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full bg-${statusInfo.color}-100`}>
                        <StatusIcon className={`text-${statusInfo.color}-700`} size={16} />
                        <span className={`ml-2 font-semibold text-sm text-${statusInfo.color}-700`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Requested: {new Date(inspection.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                      {/* Car Info */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Vehicle</h4>
                        <p className="font-bold text-gray-900">
                          {car?.year} {car?.make} {car?.model}
                        </p>
                        <p className="text-sm text-gray-600">{car?.trim}</p>
                        <p className="text-sm font-semibold text-green-600 mt-1">
                          {formatCurrency(car?.price)}
                        </p>
                      </div>

                      {/* Buyer Info */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Buyer</h4>
                        <p className="font-semibold text-gray-900">{inspection.buyers.full_name}</p>
                        <p className="text-sm text-gray-600">{inspection.buyers.phone}</p>
                        <p className="text-sm text-gray-600">{inspection.buyers.email}</p>
                      </div>

                      {/* Inspection Details */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Inspection</h4>
                        {inspection.inspector_name ? (
                          <>
                            <p className="text-sm text-gray-900">
                              <strong>Inspector:</strong> {inspection.inspector_name}
                            </p>
                            <p className="text-sm text-gray-600">{inspection.inspector_phone}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">Not assigned</p>
                        )}
                        {inspection.scheduled_date && (
                          <p className="text-sm text-gray-900 mt-1">
                            <strong>Date:</strong> {new Date(inspection.scheduled_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Location & Fee */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Details</h4>
                        <p className="text-sm text-gray-900">
                          <strong>Location:</strong>
                        </p>
                        <p className="text-sm text-gray-600">{inspection.location}</p>
                        <p className="text-sm font-semibold text-purple-600 mt-2">
                          Fee: {formatCurrency(inspection.inspection_fee)}
                        </p>
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

                    {/* Completed Info */}
                    {inspection.inspection_status === 'completed' && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-green-800">
                              Overall Score: {inspection.overall_score}/100
                            </p>
                            {inspection.report_summary && (
                              <p className="text-sm text-green-700 mt-1">{inspection.report_summary}</p>
                            )}
                          </div>
                          {inspection.report_file_url && (
                            <a
                              href={inspection.report_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
                            >
                              View Report
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex space-x-3">
                      {inspection.inspection_status === 'pending' && (
                        <button
                          onClick={() => handleUpdateInspection(inspection, 'assign')}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-semibold"
                        >
                          Assign Inspector
                        </button>
                      )}
                      {inspection.inspection_status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handleUpdateInspection(inspection, 'start')}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-semibold"
                          >
                            Start Inspection
                          </button>
                          <button
                            onClick={() => handleUpdateInspection(inspection, 'assign')}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-semibold"
                          >
                            Edit Schedule
                          </button>
                        </>
                      )}
                      {inspection.inspection_status === 'in_progress' && (
                        <button
                          onClick={() => handleUpdateInspection(inspection, 'complete')}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-semibold"
                        >
                          Complete & Upload Report
                        </button>
                      )}
                      {!['completed', 'cancelled'].includes(inspection.inspection_status) && (
                        <button
                          onClick={() => handleUpdateInspection(inspection, 'cancel')}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Update Modal */}
      {showUpdateModal && selectedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {updateAction === 'assign' ? 'Assign Inspector & Schedule' :
               updateAction === 'start' ? 'Start Inspection' :
               updateAction === 'complete' ? 'Complete Inspection' :
               'Cancel Inspection'}
            </h2>

            {updateAction === 'assign' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Inspector Name
                  </label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Inspector Phone
                  </label>
                  <input
                    type="tel"
                    value={inspectorPhone}
                    onChange={(e) => setInspectorPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>
            )}

            {updateAction === 'complete' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Overall Score (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={overallScore}
                    onChange={(e) => setOverallScore(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Report Summary
                  </label>
                  <textarea
                    value={reportSummary}
                    onChange={(e) => setReportSummary(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    rows={4}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload Full Report (PDF)
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleReportUpload}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  {uploadingReport && <p className="text-sm text-gray-600 mt-2">Uploading...</p>}
                  {uploadedReportUrl && (
                    <p className="text-sm text-green-600 mt-2">✓ Report uploaded successfully</p>
                  )}
                </div>
              </div>
            )}

            {updateAction === 'start' && (
              <p className="text-gray-700">
                Mark this inspection as in progress? The inspector can begin the vehicle assessment.
              </p>
            )}

            {updateAction === 'cancel' && (
              <p className="text-gray-700">
                Are you sure you want to cancel this inspection? This action cannot be undone.
              </p>
            )}

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => {
                  setShowUpdateModal(false)
                  setSelectedInspection(null)
                  resetForm()
                }}
                disabled={submitting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitUpdate}
                disabled={submitting ||
                  (updateAction === 'assign' && (!inspectorName || !inspectorPhone || !scheduledDate)) ||
                  (updateAction === 'complete' && (!overallScore || !reportSummary))}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 font-semibold disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
