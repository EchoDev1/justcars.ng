/**
 * Flutterwave Payment Gateway Integration
 * Handles all Flutterwave payment operations for JustCars.ng
 */

// Flutterwave keys (should be in environment variables)
const FLW_PUBLIC_KEY = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-xxx'
const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-xxx'
const FLW_API_URL = 'https://api.flutterwave.com/v3'

/**
 * Initialize a Flutterwave payment
 * @param {Object} options - Payment options
 * @param {number} options.amount - Amount in Naira
 * @param {string} options.email - Customer email
 * @param {string} options.name - Customer name
 * @param {string} options.phone - Customer phone
 * @param {string} options.reference - Unique transaction reference
 * @param {Object} options.metadata - Additional metadata
 * @returns {Promise<Object>} Payment link
 */
export async function initializePayment({
  amount,
  email,
  name,
  phone,
  reference,
  metadata = {},
  redirectUrl
}) {
  try {
    const response = await fetch(`${FLW_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount,
        currency: 'NGN',
        redirect_url: redirectUrl || `${window.location.origin}/payment/callback`,
        payment_options: 'card,banktransfer,ussd,account',
        customer: {
          email,
          name,
          phonenumber: phone
        },
        customizations: {
          title: 'JustCars.ng',
          description: 'Payment for JustCars.ng services',
          logo: `${window.location.origin}/logo.png`
        },
        meta: metadata
      })
    })

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error(data.message || 'Payment initialization failed')
    }

    return {
      success: true,
      payment_link: data.data.link,
      reference: reference
    }
  } catch (error) {
    console.error('Flutterwave initialization error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Verify a Flutterwave transaction
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} Verification response
 */
export async function verifyTransaction(transactionId) {
  try {
    const response = await fetch(
      `${FLW_API_URL}/transactions/${transactionId}/verify`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error(data.message || 'Transaction verification failed')
    }

    return {
      success: true,
      data: {
        amount: data.data.amount,
        status: data.data.status,
        reference: data.data.tx_ref,
        charged_amount: data.data.charged_amount,
        customer: data.data.customer,
        created_at: data.data.created_at,
        metadata: data.data.meta
      }
    }
  } catch (error) {
    console.error('Flutterwave verification error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Open Flutterwave inline payment modal
 * @param {Object} options - Payment options
 * @param {Function} onSuccess - Success callback
 * @param {Function} onClose - Close callback
 */
export function openFlutterwaveModal({
  amount,
  email,
  name,
  phone,
  reference,
  metadata = {},
  onSuccess,
  onClose
}) {
  if (typeof window === 'undefined') {
    console.error('Flutterwave can only be initialized in browser')
    return
  }

  // Load Flutterwave inline script if not already loaded
  if (!window.FlutterwaveCheckout) {
    const script = document.createElement('script')
    script.src = 'https://checkout.flutterwave.com/v3.js'
    script.onload = () => initializeModal()
    document.body.appendChild(script)
  } else {
    initializeModal()
  }

  function initializeModal() {
    window.FlutterwaveCheckout({
      public_key: FLW_PUBLIC_KEY,
      tx_ref: reference,
      amount,
      currency: 'NGN',
      payment_options: 'card,mobilemoney,ussd,banktransfer',
      customer: {
        email,
        name,
        phone_number: phone
      },
      customizations: {
        title: 'JustCars.ng',
        description: 'Payment for JustCars.ng services',
        logo: `${window.location.origin}/logo.png`
      },
      meta: metadata,
      callback: (response) => {
        if (onSuccess) onSuccess(response)
      },
      onclose: () => {
        if (onClose) onClose()
      }
    })
  }
}

/**
 * Generate a unique payment reference
 * @param {string} prefix - Reference prefix
 * @returns {string} Unique reference
 */
export function generateReference(prefix = 'FLW') {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000000)
  return `${prefix}_${timestamp}_${random}`
}

/**
 * Create a virtual account for a customer
 * @param {Object} options - Virtual account options
 * @param {string} options.email - Customer email
 * @param {string} options.bvn - Bank Verification Number
 * @param {string} options.firstName - First name
 * @param {string} options.lastName - Last name
 * @param {string} options.phone - Phone number
 * @returns {Promise<Object>} Virtual account details
 */
export async function createVirtualAccount({
  email,
  bvn,
  firstName,
  lastName,
  phone
}) {
  try {
    const response = await fetch(`${FLW_API_URL}/virtual-account-numbers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        is_permanent: true,
        bvn,
        tx_ref: generateReference('VA'),
        firstname: firstName,
        lastname: lastName,
        phonenumber: phone,
        narration: `JustCars.ng - ${firstName} ${lastName}`
      })
    })

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error(data.message || 'Virtual account creation failed')
    }

    return {
      success: true,
      account_number: data.data.account_number,
      account_reference: data.data.account_reference,
      bank_name: data.data.bank_name,
      account_status: data.data.account_status
    }
  } catch (error) {
    console.error('Flutterwave virtual account error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get all virtual accounts
 * @returns {Promise<Array>} List of virtual accounts
 */
export async function getVirtualAccounts() {
  try {
    const response = await fetch(`${FLW_API_URL}/virtual-account-numbers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to fetch virtual accounts')
    }

    return {
      success: true,
      accounts: data.data
    }
  } catch (error) {
    console.error('Flutterwave get virtual accounts error:', error)
    return {
      success: false,
      error: error.message,
      accounts: []
    }
  }
}

/**
 * Initiate a transfer (for escrow release)
 * @param {Object} options - Transfer options
 * @param {number} options.amount - Amount in Naira
 * @param {string} options.accountNumber - Recipient account number
 * @param {string} options.accountBank - Recipient bank code
 * @param {string} options.narration - Transfer description
 * @param {string} options.reference - Unique reference
 * @returns {Promise<Object>} Transfer response
 */
export async function initiateTransfer({
  amount,
  accountNumber,
  accountBank,
  narration,
  reference
}) {
  try {
    const response = await fetch(`${FLW_API_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        account_bank: accountBank,
        account_number: accountNumber,
        amount,
        narration,
        currency: 'NGN',
        reference,
        callback_url: `${window.location.origin}/api/transfer-callback`,
        debit_currency: 'NGN'
      })
    })

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error(data.message || 'Transfer failed')
    }

    return {
      success: true,
      transfer_id: data.data.id,
      reference: data.data.reference,
      status: data.data.status
    }
  } catch (error) {
    console.error('Flutterwave transfer error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get Nigerian banks
 * @returns {Promise<Array>} List of banks
 */
export async function getBanks() {
  try {
    const response = await fetch(`${FLW_API_URL}/banks/NG`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to fetch banks')
    }

    return {
      success: true,
      banks: data.data.map(bank => ({
        id: bank.id,
        code: bank.code,
        name: bank.name
      }))
    }
  } catch (error) {
    console.error('Flutterwave banks fetch error:', error)
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
 * @param {string} accountBank - Bank code
 * @returns {Promise<Object>} Account details
 */
export async function verifyAccountNumber(accountNumber, accountBank) {
  try {
    const response = await fetch(`${FLW_API_URL}/accounts/resolve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        account_number: accountNumber,
        account_bank: accountBank
      })
    })

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error(data.message || 'Account verification failed')
    }

    return {
      success: true,
      account_name: data.data.account_name,
      account_number: data.data.account_number
    }
  } catch (error) {
    console.error('Flutterwave account verification error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get balance
 * @returns {Promise<Object>} Balance information
 */
export async function getBalance() {
  try {
    const response = await fetch(`${FLW_API_URL}/balances`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to fetch balance')
    }

    return {
      success: true,
      balances: data.data
    }
  } catch (error) {
    console.error('Flutterwave balance fetch error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export default {
  initializePayment,
  verifyTransaction,
  openFlutterwaveModal,
  generateReference,
  createVirtualAccount,
  getVirtualAccounts,
  initiateTransfer,
  getBanks,
  verifyAccountNumber,
  getBalance
}
