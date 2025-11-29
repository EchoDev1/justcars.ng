/**
 * Paystack Payment Gateway Integration
 * Handles all Paystack payment operations for JustCars.ng
 */

// Paystack public key (should be in environment variables)
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxx'
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_xxx'
const PAYSTACK_API_URL = 'https://api.paystack.co'

/**
 * Initialize a Paystack payment
 * @param {Object} options - Payment options
 * @param {string} options.email - Customer email
 * @param {number} options.amount - Amount in kobo (multiply Naira by 100)
 * @param {string} options.reference - Unique payment reference
 * @param {Object} options.metadata - Additional metadata
 * @returns {Promise<Object>} Paystack initialization response
 */
export async function initializePayment({
  email,
  amount,
  reference,
  metadata = {},
  callbackUrl
}) {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Convert to kobo
        reference,
        metadata,
        callback_url: callbackUrl || `${window.location.origin}/payment/callback`
      })
    })

    const data = await response.json()

    if (!data.status) {
      throw new Error(data.message || 'Payment initialization failed')
    }

    return {
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference
    }
  } catch (error) {
    console.error('Paystack initialization error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Verify a Paystack payment
 * @param {string} reference - Payment reference
 * @returns {Promise<Object>} Verification response
 */
export async function verifyPayment(reference) {
  try {
    const response = await fetch(
      `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const data = await response.json()

    if (!data.status) {
      throw new Error(data.message || 'Payment verification failed')
    }

    return {
      success: true,
      data: {
        amount: data.data.amount / 100, // Convert from kobo to Naira
        status: data.data.status,
        reference: data.data.reference,
        paid_at: data.data.paid_at,
        customer: data.data.customer,
        metadata: data.data.metadata
      }
    }
  } catch (error) {
    console.error('Paystack verification error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Open Paystack inline payment popup
 * @param {Object} options - Payment options
 * @param {Function} onSuccess - Success callback
 * @param {Function} onClose - Close callback
 */
export function openPaystackPopup({
  email,
  amount,
  reference,
  metadata = {},
  onSuccess,
  onClose
}) {
  if (typeof window === 'undefined') {
    console.error('Paystack can only be initialized in browser')
    return
  }

  // Load Paystack inline script if not already loaded
  if (!window.PaystackPop) {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.onload = () => initializePopup()
    document.body.appendChild(script)
  } else {
    initializePopup()
  }

  function initializePopup() {
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount: Math.round(amount * 100), // Convert to kobo
      ref: reference,
      metadata,
      onClose: () => {
        if (onClose) onClose()
      },
      callback: (response) => {
        if (onSuccess) onSuccess(response)
      }
    })

    handler.openIframe()
  }
}

/**
 * Generate a unique payment reference
 * @param {string} prefix - Reference prefix (e.g., 'BADGE', 'ESCROW', 'VERIFY')
 * @returns {string} Unique reference
 */
export function generateReference(prefix = 'PAY') {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000000)
  return `${prefix}_${timestamp}_${random}`
}

/**
 * Create a dedicated virtual account for a customer
 * @param {Object} options - Virtual account options
 * @param {string} options.email - Customer email
 * @param {string} options.firstName - First name
 * @param {string} options.lastName - Last name
 * @param {string} options.phone - Phone number
 * @returns {Promise<Object>} Virtual account details
 */
export async function createDedicatedVirtualAccount({
  email,
  firstName,
  lastName,
  phone
}) {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/dedicated_account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        preferred_bank: 'wema-bank' // or 'titan-paystack'
      })
    })

    const data = await response.json()

    if (!data.status) {
      throw new Error(data.message || 'Virtual account creation failed')
    }

    return {
      success: true,
      account_number: data.data.account_number,
      account_name: data.data.account_name,
      bank_name: data.data.bank.name,
      bank_code: data.data.bank.code
    }
  } catch (error) {
    console.error('Paystack virtual account error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Make a transfer to a recipient (for escrow release)
 * @param {Object} options - Transfer options
 * @param {number} options.amount - Amount in Naira
 * @param {string} options.recipient - Recipient code
 * @param {string} options.reference - Unique reference
 * @param {string} options.reason - Transfer reason
 * @returns {Promise<Object>} Transfer response
 */
export async function initiateTransfer({
  amount,
  recipient,
  reference,
  reason
}) {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/transfer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(amount * 100), // Convert to kobo
        recipient,
        reference,
        reason
      })
    })

    const data = await response.json()

    if (!data.status) {
      throw new Error(data.message || 'Transfer failed')
    }

    return {
      success: true,
      transfer_code: data.data.transfer_code,
      reference: data.data.reference,
      status: data.data.status
    }
  } catch (error) {
    console.error('Paystack transfer error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Create a transfer recipient
 * @param {Object} options - Recipient options
 * @param {string} options.name - Recipient name
 * @param {string} options.accountNumber - Bank account number
 * @param {string} options.bankCode - Bank code
 * @returns {Promise<Object>} Recipient code
 */
export async function createTransferRecipient({
  name,
  accountNumber,
  bankCode
}) {
  try {
    const response = await fetch(`${PAYSTACK_API_URL}/transferrecipient`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'nuban',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN'
      })
    })

    const data = await response.json()

    if (!data.status) {
      throw new Error(data.message || 'Recipient creation failed')
    }

    return {
      success: true,
      recipient_code: data.data.recipient_code,
      details: {
        account_number: data.data.details.account_number,
        account_name: data.data.details.account_name,
        bank_name: data.data.details.bank_name
      }
    }
  } catch (error) {
    console.error('Paystack recipient creation error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get list of Nigerian banks
 * @returns {Promise<Array>} List of banks
 */
export async function getBanks() {
  try {
    const response = await fetch(
      `${PAYSTACK_API_URL}/bank?country=nigeria`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const data = await response.json()

    if (!data.status) {
      throw new Error(data.message || 'Failed to fetch banks')
    }

    return {
      success: true,
      banks: data.data.map(bank => ({
        name: bank.name,
        code: bank.code,
        slug: bank.slug
      }))
    }
  } catch (error) {
    console.error('Paystack banks fetch error:', error)
    return {
      success: false,
      error: error.message,
      banks: []
    }
  }
}

/**
 * Verify bank account number
 * @param {string} accountNumber - Account number
 * @param {string} bankCode - Bank code
 * @returns {Promise<Object>} Account details
 */
export async function verifyAccountNumber(accountNumber, bankCode) {
  try {
    const response = await fetch(
      `${PAYSTACK_API_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const data = await response.json()

    if (!data.status) {
      throw new Error(data.message || 'Account verification failed')
    }

    return {
      success: true,
      account_name: data.data.account_name,
      account_number: data.data.account_number
    }
  } catch (error) {
    console.error('Paystack account verification error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export default {
  initializePayment,
  verifyPayment,
  openPaystackPopup,
  generateReference,
  createDedicatedVirtualAccount,
  initiateTransfer,
  createTransferRecipient,
  getBanks,
  verifyAccountNumber
}
