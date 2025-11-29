/**
 * Dealer Badge Component
 * Displays dealer verification badges (Verified, Premium, Luxury)
 */

'use client'

import { Shield, Award, Crown, CheckCircle, Star, Sparkles } from 'lucide-react'

export default function DealerBadge({ badgeType, size = 'md', showIcon = true, showText = true }) {
  if (!badgeType || badgeType === 'none') return null

  const badgeConfig = {
    verified: {
      icon: Shield,
      text: 'Verified Dealer',
      shortText: 'Verified',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-500/10 to-blue-600/10',
      borderColor: 'border-blue-500/50',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-600',
      shadowColor: 'shadow-blue-500/30',
      glowColor: 'shadow-blue-500/50'
    },
    premium: {
      icon: Award,
      text: 'Premium Dealer',
      shortText: 'Premium',
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-500/10 to-purple-600/10',
      borderColor: 'border-purple-500/50',
      iconColor: 'text-purple-500',
      textColor: 'text-purple-600',
      shadowColor: 'shadow-purple-500/30',
      glowColor: 'shadow-purple-500/50'
    },
    luxury: {
      icon: Crown,
      text: 'Luxury Dealer',
      shortText: 'Luxury',
      color: 'gold',
      gradient: 'from-yellow-500 to-orange-500',
      bgGradient: 'from-yellow-500/10 to-orange-500/10',
      borderColor: 'border-yellow-500/50',
      iconColor: 'text-yellow-500',
      textColor: 'text-yellow-600',
      shadowColor: 'shadow-yellow-500/30',
      glowColor: 'shadow-yellow-500/50'
    }
  }

  const config = badgeConfig[badgeType]
  if (!config) return null

  const IconComponent = config.icon

  // Size variants
  const sizeClasses = {
    xs: {
      container: 'px-2 py-1 rounded-md text-xs',
      icon: 12,
      gap: 'gap-1'
    },
    sm: {
      container: 'px-2.5 py-1.5 rounded-lg text-xs',
      icon: 14,
      gap: 'gap-1.5'
    },
    md: {
      container: 'px-3 py-2 rounded-lg text-sm',
      icon: 16,
      gap: 'gap-2'
    },
    lg: {
      container: 'px-4 py-2.5 rounded-xl text-base',
      icon: 20,
      gap: 'gap-2'
    }
  }

  const sizeConfig = sizeClasses[size] || sizeClasses.md

  return (
    <div className={`inline-flex items-center ${sizeConfig.gap} ${sizeConfig.container} bg-gradient-to-r ${config.bgGradient} backdrop-blur-sm border ${config.borderColor} font-semibold ${config.textColor} shadow-md ${config.shadowColor} hover:${config.glowColor} transition-all duration-300 group relative overflow-hidden`}>
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />

      {/* Content */}
      <div className="relative flex items-center gap-inherit">
        {showIcon && (
          <IconComponent
            size={sizeConfig.icon}
            className={`${config.iconColor} drop-shadow-sm`}
          />
        )}
        {showText && (
          <span className="font-bold drop-shadow-sm whitespace-nowrap">
            {size === 'xs' || size === 'sm' ? config.shortText : config.text}
          </span>
        )}

        {/* Sparkle effect for luxury */}
        {badgeType === 'luxury' && (
          <Sparkles size={sizeConfig.icon} className="text-yellow-300 animate-pulse" />
        )}

        {/* Check mark for verified */}
        {badgeType === 'verified' && size !== 'xs' && (
          <CheckCircle size={sizeConfig.icon} className="text-blue-400" />
        )}

        {/* Star for premium */}
        {badgeType === 'premium' && size !== 'xs' && (
          <Star size={sizeConfig.icon} className="text-purple-400" />
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-200%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }

        .group:hover .animate-shimmer {
          animation: shimmer 0.7s ease-in-out;
        }
      `}</style>
    </div>
  )
}

/**
 * Compact Dealer Badge Icon (for minimal display)
 */
export function DealerBadgeIcon({ badgeType, size = 18 }) {
  if (!badgeType || badgeType === 'none') return null

  const iconConfig = {
    verified: {
      icon: Shield,
      color: 'text-blue-500',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/40'
    },
    premium: {
      icon: Award,
      color: 'text-purple-500',
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/40'
    },
    luxury: {
      icon: Crown,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/40'
    }
  }

  const config = iconConfig[badgeType]
  if (!config) return null

  const IconComponent = config.icon

  return (
    <div className={`inline-flex items-center justify-center p-1.5 rounded-full ${config.bg} ${config.border} border backdrop-blur-sm shadow-sm hover:scale-110 transition-transform duration-200`}>
      <IconComponent size={size} className={`${config.color} drop-shadow-sm`} />
    </div>
  )
}

/**
 * Dealer Badge with tooltip
 */
export function DealerBadgeWithTooltip({ badgeType, dealerName }) {
  if (!badgeType || badgeType === 'none') return null

  const tooltips = {
    verified: 'Verified dealer with confirmed business registration',
    premium: 'Premium dealer with enhanced visibility and priority support',
    luxury: 'Luxury specialist dealer for high-end vehicles (₦150M+)'
  }

  return (
    <div className="relative group">
      <DealerBadge badgeType={badgeType} size="sm" />

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
        <div className="font-semibold mb-1">{dealerName}</div>
        <div className="text-gray-300">{tooltips[badgeType]}</div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  )
}
