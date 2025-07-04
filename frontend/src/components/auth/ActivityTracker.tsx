import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'

const ActivityTracker = () => {
  const { updateActivity, checkInactivityTimeout } = useAuthStore()

  useEffect(() => {
    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ]

    // Throttle activity updates to avoid excessive calls
    let throttleTimer: NodeJS.Timeout | null = null
    
    const handleActivity = () => {
      if (throttleTimer) return
      
      updateActivity()
      
      // Throttle to once per minute
      throttleTimer = setTimeout(() => {
        throttleTimer = null
      }, 60000) // 1 minute
    }

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Check for inactivity timeout every minute
    const timeoutChecker = setInterval(() => {
      checkInactivityTimeout()
    }, 60000) // Check every minute

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      clearInterval(timeoutChecker)
      if (throttleTimer) {
        clearTimeout(throttleTimer)
      }
    }
  }, [updateActivity, checkInactivityTimeout])

  return null // This component doesn't render anything
}

export default ActivityTracker