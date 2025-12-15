# Social Proof & Reviews System - Integration Guide

## Overview
The Social Proof & Reviews system is fully implemented with database tables, API endpoints, and UI components. This guide shows you how to integrate it into your pages.

---

## Database Setup

### 1. Run the Migration
Execute the SQL migration in your Supabase dashboard:

```bash
database/migrations/create_reviews_system.sql
```

This creates:
- `reviews` table (dealer and car reviews)
- `review_photos` table (delivery photos, condition photos)
- `review_votes` table (helpful/not helpful voting)
- All indexes and Row Level Security policies
- Automatic triggers for updating counts

---

## Features Implemented

### Buyer Reviews
- ⭐ 1-5 star rating system
- Verified buyer badges
- Review titles and detailed text
- Photo reviews (delivery pics, condition, etc.)
- Purchase date and price tracking

### Dealer Reviews
- Reviews for dealer service quality
- Response mechanism for dealers
- Moderation and approval workflow

### Car Reviews
- Reviews for specific cars after purchase
- Photo reviews showing actual condition
- Verified purchase tracking

### Social Proof
- Average rating display with distribution
- "Most Helpful" review sorting
- Helpful/Not Helpful voting
- Verified buyer badges
- Dealer responses to reviews

---

## Component Usage

### ReviewsSection Component
Location: `components/ui/ReviewsSection.js`

#### For Dealer Reviews
```jsx
import ReviewsSection from '@/components/ui/ReviewsSection'

export default function DealerPage({ dealerId }) {
  return (
    <div>
      <h1>Dealer Profile</h1>

      {/* Add Reviews Section */}
      <ReviewsSection
        dealerId={dealerId}
        reviewType="dealer"
      />
    </div>
  )
}
```

#### For Car Reviews
```jsx
import ReviewsSection from '@/components/ui/ReviewsSection'

export default function CarDetailPage({ carId, dealerId }) {
  return (
    <div>
      <h1>Car Details</h1>

      {/* Add Reviews Section */}
      <ReviewsSection
        carId={carId}
        dealerId={dealerId}
        reviewType="car"
      />
    </div>
  )
}
```

---

## API Endpoints

### GET /api/reviews
Fetch reviews with filters and statistics

**Query Parameters:**
- `dealerId` - Filter by dealer ID
- `carId` - Filter by car ID
- `type` - Review type ('dealer' or 'car')
- `sortBy` - Sort order ('recent', 'helpful', 'rating_high', 'rating_low')
- `limit` - Number of reviews to fetch (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "reviews": [
    {
      "id": "uuid",
      "review_type": "dealer",
      "rating": 5,
      "title": "Excellent Service!",
      "review_text": "Very professional dealer...",
      "buyer_name": "John Doe",
      "is_verified_buyer": true,
      "helpful_count": 12,
      "created_at": "2025-01-15T10:30:00Z",
      "review_photos": [
        {
          "photo_url": "https://...",
          "photo_type": "delivery"
        }
      ]
    }
  ],
  "statistics": {
    "totalReviews": 45,
    "averageRating": 4.6,
    "ratingDistribution": {
      "5": 30,
      "4": 10,
      "3": 3,
      "2": 1,
      "1": 1
    }
  },
  "hasMore": true
}
```

### POST /api/reviews
Create a new review (requires authentication)

**Request Body:**
```json
{
  "review_type": "car",
  "dealer_id": "dealer-uuid",
  "car_id": "car-uuid",
  "rating": 5,
  "title": "Amazing Car!",
  "review_text": "The car is in excellent condition...",
  "photos": [
    {
      "url": "https://...",
      "thumbnailUrl": "https://...",
      "caption": "Car on delivery day",
      "type": "delivery"
    }
  ],
  "purchase_date": "2025-01-10",
  "purchase_price": 5500000
}
```

**Response:**
```json
{
  "review": { ... },
  "message": "Review submitted successfully! It will appear after moderation."
}
```

### PATCH /api/reviews
Vote on review helpfulness (requires authentication)

**Request Body:**
```json
{
  "review_id": "review-uuid",
  "vote_type": "helpful"  // or "not_helpful"
}
```

---

## Integration Examples

### 1. Car Detail Page Integration

Create: `app/cars/[id]/page.js`

```jsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ReviewsSection from '@/components/ui/ReviewsSection'

export default function CarDetailPage() {
  const params = useParams()
  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCar()
  }, [params.id])

  const fetchCar = async () => {
    try {
      const response = await fetch(`/api/cars/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setCar(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!car) return <div>Car not found</div>

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Car Details Section */}
      <div className="bg-white rounded-xl p-6 mb-8">
        <h1 className="text-3xl font-bold mb-4">
          {car.year} {car.make} {car.model}
        </h1>
        <p className="text-2xl text-blue-600 font-bold mb-4">
          ₦{car.price?.toLocaleString()}
        </p>
        {/* Add more car details... */}
      </div>

      {/* Reviews Section */}
      <div className="bg-gray-50 rounded-xl p-6">
        <ReviewsSection
          carId={car.id}
          dealerId={car.dealer_id}
          reviewType="car"
        />
      </div>
    </div>
  )
}
```

### 2. Dealer Profile Integration

Update: `app/dealer/profile/page.js`

```jsx
'use client'

import { useState, useEffect } from 'react'
import ReviewsSection from '@/components/ui/ReviewsSection'

export default function DealerProfilePage() {
  const [dealer, setDealer] = useState(null)

  useEffect(() => {
    fetchDealerProfile()
  }, [])

  const fetchDealerProfile = async () => {
    const response = await fetch('/api/dealer/me')
    if (response.ok) {
      const data = await response.json()
      setDealer(data.dealer)
    }
  }

  if (!dealer) return <div>Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Dealer Info */}
      <div className="bg-white rounded-xl p-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">{dealer.business_name}</h1>
        <p className="text-gray-600">{dealer.business_address}</p>
      </div>

      {/* Reviews Section */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
        <ReviewsSection
          dealerId={dealer.id}
          reviewType="dealer"
        />
      </div>
    </div>
  )
}
```

### 3. Public Dealer Page

Create: `app/dealers/[id]/page.js`

```jsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ReviewsSection from '@/components/ui/ReviewsSection'
import { Star, MapPin, Phone, Mail } from 'lucide-react'

export default function PublicDealerPage() {
  const params = useParams()
  const [dealer, setDealer] = useState(null)
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDealerData()
  }, [params.id])

  const fetchDealerData = async () => {
    try {
      // Fetch dealer info
      const dealerResponse = await fetch(`/api/dealers/${params.id}`)
      if (dealerResponse.ok) {
        const dealerData = await dealerResponse.json()
        setDealer(dealerData)
      }

      // Fetch dealer's cars
      const carsResponse = await fetch(`/api/cars?dealerId=${params.id}`)
      if (carsResponse.ok) {
        const carsData = await carsResponse.json()
        setCars(carsData.cars || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!dealer) return <div>Dealer not found</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dealer Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">{dealer.business_name}</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              {dealer.business_address}
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} />
              {dealer.phone}
            </div>
            <div className="flex items-center gap-2">
              <Mail size={16} />
              {dealer.email}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Active Listings */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Active Listings ({cars.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cars.map(car => (
              <div key={car.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Car card content */}
              </div>
            ))}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-6">Dealer Reviews</h2>
          <ReviewsSection
            dealerId={dealer.id}
            reviewType="dealer"
          />
        </div>
      </div>
    </div>
  )
}
```

---

## Admin Moderation Interface

### Moderate Reviews
Add to `app/admin/reviews/page.js`:

```jsx
'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Flag } from 'lucide-react'

export default function AdminReviewsPage() {
  const [pendingReviews, setPendingReviews] = useState([])

  useEffect(() => {
    fetchPendingReviews()
  }, [])

  const fetchPendingReviews = async () => {
    const response = await fetch('/api/admin/reviews?status=pending')
    if (response.ok) {
      const data = await response.json()
      setPendingReviews(data.reviews)
    }
  }

  const handleApprove = async (reviewId) => {
    await fetch('/api/admin/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewId,
        action: 'approve'
      })
    })
    fetchPendingReviews()
  }

  const handleReject = async (reviewId) => {
    await fetch('/api/admin/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewId,
        action: 'reject'
      })
    })
    fetchPendingReviews()
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Review Moderation</h1>

      <div className="space-y-4">
        {pendingReviews.map(review => (
          <div key={review.id} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">{review.title}</h3>
                <p className="text-sm text-gray-600">
                  By {review.buyer_name} • {review.rating} stars
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(review.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Approve
                </button>
                <button
                  onClick={() => handleReject(review.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <XCircle size={16} />
                  Reject
                </button>
              </div>
            </div>
            <p className="text-gray-700">{review.review_text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Photo Upload Integration

### Using AdvancedImageUploader for Review Photos

```jsx
import AdvancedImageUploader from '@/components/admin/AdvancedImageUploader'

export default function WriteReviewForm() {
  const [photos, setPhotos] = useState([])

  const handlePhotoUpload = (uploadedPhotos) => {
    setPhotos(uploadedPhotos.map(photo => ({
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      caption: '',
      type: 'delivery'
    })))
  }

  return (
    <form>
      {/* Rating, Title, Text fields... */}

      {/* Photo Upload */}
      <div className="mb-4">
        <label className="block font-semibold mb-2">
          Photos (optional)
        </label>
        <AdvancedImageUploader
          maxImages={10}
          onUploadComplete={handlePhotoUpload}
          folder="review-photos"
        />
      </div>
    </form>
  )
}
```

---

## Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Test creating a dealer review
- [ ] Test creating a car review
- [ ] Upload review photos
- [ ] Vote reviews as helpful/not helpful
- [ ] Test admin moderation
- [ ] Verify verified buyer badges appear
- [ ] Test dealer response functionality
- [ ] Check rating statistics display correctly
- [ ] Test sorting (Recent, Helpful, Rating)

---

## Database Statistics Queries

### Get dealer rating summary
```sql
SELECT
  d.business_name,
  COUNT(r.id) as review_count,
  AVG(r.rating) as avg_rating,
  COUNT(CASE WHEN r.is_verified_buyer THEN 1 END) as verified_reviews
FROM dealers d
LEFT JOIN reviews r ON r.dealer_id = d.id AND r.is_approved = true
GROUP BY d.id, d.business_name
ORDER BY avg_rating DESC;
```

### Get most helpful reviews
```sql
SELECT
  r.title,
  r.rating,
  r.helpful_count,
  r.buyer_name,
  d.business_name
FROM reviews r
JOIN dealers d ON r.dealer_id = d.id
WHERE r.is_approved = true
ORDER BY r.helpful_count DESC
LIMIT 10;
```

---

## Next Steps

1. **Run the migration** in Supabase SQL Editor
2. **Integrate ReviewsSection** into your car and dealer pages
3. **Create review submission forms** for buyers
4. **Set up admin moderation** interface
5. **Test thoroughly** with sample data
6. **Enable email notifications** for new reviews (optional)

---

## Support

For issues or questions about the reviews system:
- Check the SQL migration file for table structure
- Review API endpoint documentation above
- Examine ReviewsSection component code
- Test with Postman/Thunder Client for API debugging

---

**Status:** ✅ Fully Implemented
**Components:** ReviewsSection.js
**API Routes:** /api/reviews (GET, POST, PATCH)
**Database:** create_reviews_system.sql
