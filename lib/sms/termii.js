/**
 * SMS Notifications with Termii API
 * Send SMS notifications for important events
 * https://developers.termii.com
 */

const TERMII_API_KEY = process.env.TERMII_API_KEY
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'JustCars'
const TERMII_API_URL = 'https://api.ng.termii.com/api/sms/send'

/**
 * Send SMS via Termii
 */
async function sendSMS({ to, message }) {
  if (!TERMII_API_KEY) {
    console.warn('Termii API key not configured. SMS not sent.')
    return { success: false, error: 'API key not configured' }
  }

  // Format phone number (remove +234 or 0, then add 234)
  let formattedPhone = to.replace(/[\s\-\(\)]/g, '') // Remove spaces, dashes, parentheses
  if (formattedPhone.startsWith('+234')) {
    formattedPhone = formattedPhone.substring(1)
  } else if (formattedPhone.startsWith('0')) {
    formattedPhone = '234' + formattedPhone.substring(1)
  } else if (!formattedPhone.startsWith('234')) {
    formattedPhone = '234' + formattedPhone
  }

  try {
    const response = await fetch(TERMII_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: formattedPhone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: TERMII_API_KEY
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Termii API error:', data)
      return { success: false, error: data.message || 'Failed to send SMS' }
    }

    console.log('SMS sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending SMS:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send new inquiry notification to dealer
 */
export async function sendNewInquirySMS({ dealerPhone, dealerName, carName, buyerName }) {
  const message = `New inquiry from ${buyerName} for ${carName}. Login to JustCars.ng to respond. - JustCars`

  return sendSMS({
    to: dealerPhone,
    message: message.substring(0, 160) // SMS limit
  })
}

/**
 * Send price drop alert to user
 */
export async function sendPriceDropSMS({ userPhone, userName, carName, oldPrice, newPrice }) {
  const savings = oldPrice - newPrice
  const message = `Price Drop! ${carName} now ₦${newPrice.toLocaleString()} (Save ₦${savings.toLocaleString()}). View at JustCars.ng`

  return sendSMS({
    to: userPhone,
    message: message.substring(0, 160)
  })
}

/**
 * Send new car match notification
 */
export async function sendNewCarMatchSMS({ userPhone, userName, carName, price }) {
  const message = `New car match: ${carName} - ₦${price.toLocaleString()}. View now at JustCars.ng - Your saved search alert`

  return sendSMS({
    to: userPhone,
    message: message.substring(0, 160)
  })
}

/**
 * Send escrow payment notification
 */
export async function sendEscrowPaymentSMS({ phone, name, amount, status }) {
  let message

  if (status === 'pending') {
    message = `Escrow payment of ₦${amount.toLocaleString()} received. Awaiting seller confirmation. - JustCars`
  } else if (status === 'completed') {
    message = `Escrow payment of ₦${amount.toLocaleString()} released. Transaction complete. - JustCars`
  } else if (status === 'cancelled') {
    message = `Escrow payment of ₦${amount.toLocaleString()} cancelled. Refund initiated. - JustCars`
  }

  return sendSMS({
    to: phone,
    message: message.substring(0, 160)
  })
}

/**
 * Send dealer approval notification
 */
export async function sendDealerApprovalSMS({ dealerPhone, dealerName }) {
  const message = `Congratulations ${dealerName}! Your dealer account has been approved. Login to JustCars.ng to start listing cars.`

  return sendSMS({
    to: dealerPhone,
    message: message.substring(0, 160)
  })
}

/**
 * Send verification code
 */
export async function sendVerificationCodeSMS({ phone, code }) {
  const message = `Your JustCars verification code is: ${code}. Valid for 10 minutes. Do not share this code.`

  return sendSMS({
    to: phone,
    message
  })
}

/**
 * Send OTP (One-Time Password)
 */
export async function sendOTPSMS({ phone, otp }) {
  const message = `Your JustCars OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`

  return sendSMS({
    to: phone,
    message
  })
}

/**
 * Send appointment confirmation
 */
export async function sendAppointmentSMS({ phone, dealerName, carName, date, time }) {
  const message = `Appointment confirmed with ${dealerName} for ${carName} on ${date} at ${time}. - JustCars`

  return sendSMS({
    to: phone,
    message: message.substring(0, 160)
  })
}

/**
 * Send bulk SMS (max 100 recipients)
 */
export async function sendBulkSMS({ recipients, message }) {
  if (!TERMII_API_KEY) {
    console.warn('Termii API key not configured. SMS not sent.')
    return { success: false, error: 'API key not configured' }
  }

  if (recipients.length > 100) {
    return { success: false, error: 'Maximum 100 recipients allowed per batch' }
  }

  const results = []
  for (const phone of recipients) {
    const result = await sendSMS({ to: phone, message })
    results.push({ phone, ...result })

    // Rate limiting - wait 100ms between messages
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return {
    success: true,
    results,
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  }
}

export default {
  sendNewInquirySMS,
  sendPriceDropSMS,
  sendNewCarMatchSMS,
  sendEscrowPaymentSMS,
  sendDealerApprovalSMS,
  sendVerificationCodeSMS,
  sendOTPSMS,
  sendAppointmentSMS,
  sendBulkSMS
}
